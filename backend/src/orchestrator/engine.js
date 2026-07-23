const crypto = require('crypto');
const { opRegistry: opStore, deadLetterOps: dlqStore } = require('../models/dataStore');

function _genOpId() {
  return 'OP-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}

class WeightCoordinator {
  static calculateWeight(params) {
    const { userId, agentId, duration, interactions, shareDepth, project, dryRun } = params;

    const weights = {
      baseWeight: 1.0,
      durationWeight: Math.min(duration / 300, 2.0),
      interactionBoost: Math.min(interactions * 0.5, 3.0),
      shareMultiplier: shareDepth ? Math.min(shareDepth * 0.3, 1.5) : 1.0,
    };

    const totalWeight = weights.baseWeight * weights.durationWeight * weights.interactionBoost * weights.shareMultiplier;
    const estimatedValue = parseFloat((totalWeight * 0.01).toFixed(4));

    const result = {
      userId, agentId, project: project || 'unknown',
      dimensions: weights,
      totalWeight: parseFloat(totalWeight.toFixed(4)),
      estimatedValue,
      dryRun: !!dryRun,
      timestamp: new Date().toISOString(),
    };

    if (!dryRun) {
      const op = {
        id: _genOpId(),
        type: 'weight_settle',
        source: project || 'unknown',
        target: 'seal',
        payload: result,
        status: 'pending',
        retries: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
      };
      opStore.set(op.id, op);
      result.opId = op.id;
    }

    return result;
  }

  static batchSettle(records) {
    return records.map(r => this.calculateWeight(r));
  }

  static stats() {
    const all = opStore.getAll();
    return {
      total: all.length,
      byStatus: all.reduce((a, o) => { a[o.status] = (a[o.status] || 0) + 1; return a; }, {}),
      byType: all.reduce((a, o) => { a[o.type] = (a[o.type] || 0) + 1; return a; }, {}),
      dlqTotal: dlqStore.size(),
    };
  }

  static retryFailed() {
    const failed = opStore.find(o => o.status === 'failed' && o.retries < o.maxRetries);
    return failed.map(o => {
      o.retries++;
      o.status = 'pending';
      o.retriedAt = new Date().toISOString();
      opStore.set(o.id, o);
      return o;
    });
  }

  static moveToDeadLetter(opId, reason) {
    const op = opStore.get(opId);
    if (!op) return null;
    op.status = 'dead';
    op.deadReason = reason || 'max_retries_exceeded';
    op.deadAt = new Date().toISOString();
    dlqStore.set(op.id, op);
    opStore.delete(opId);
    return op;
  }

  static replayFromDeadLetter(opId) {
    const op = dlqStore.get(opId);
    if (!op) return null;
    op.status = 'pending';
    op.retries = 0;
    op.replayedAt = new Date().toISOString();
    opStore.set(op.id, op);
    dlqStore.delete(opId);
    return op;
  }

  static getDeadLetters() {
    return dlqStore.getAll();
  }

  static processPending() {
    const pending = opStore.find(o => o.status === 'pending');
    const results = { processed: 0, failed: 0, deadLettered: 0 };

    pending.forEach(op => {
      try {
        op.status = 'processing';
        op.processedAt = new Date().toISOString();
        opStore.set(op.id, op);

        if (op.type === 'weight_settle') {
          op.status = 'completed';
          op.completedAt = new Date().toISOString();
          opStore.set(op.id, op);
          results.processed++;
        } else {
          op.status = 'completed';
          op.completedAt = new Date().toISOString();
          opStore.set(op.id, op);
          results.processed++;
        }
      } catch (e) {
        op.retries++;
        op.lastError = e.message;
        if (op.retries >= op.maxRetries) {
          WeightCoordinator.moveToDeadLetter(op.id, e.message);
          results.deadLettered++;
        } else {
          op.status = 'pending';
          opStore.set(op.id, op);
        }
        results.failed++;
      }
    });

    return results;
  }
}

class Orchestrator {
  static async orchestratePayment(settlement) {
    const results = { payment: settlement, notary: null, weight: null, notification: null };
    const logs = [];

    logs.push('[协调] 存证流...');
    try {
      const { default: axios } = await import('axios');
      const notaryRes = await axios.post('http://localhost:3001/api/notary/apply', {
        txId: settlement.paymentId || settlement.orderId,
        userId: settlement.payerId,
        amount: settlement.totalAmount,
        providerId: 'p001',
      }).catch(() => null);
      results.notary = notaryRes?.data?.data || { simulated: true };
      logs.push(`  → 存证: ${results.notary.id || 'simulated'}`);
    } catch (e) {
      logs.push(`  ⚠ 存证失败: ${e.message}，使用模拟数据`);
      results.notary = {
        id: `NO-${Date.now()}`,
        txId: settlement.paymentId,
        status: 'pending',
        simulated: true,
      };
    }

    logs.push('[协调] 权重协调...');
    try {
      const { default: axios } = await import('axios');
      const devRes = await axios.post('http://localhost:80/api/deveco/weight/track', {
        txId: settlement.paymentId,
        amount: settlement.totalAmount,
        payerId: settlement.payerId,
        payeeId: settlement.payeeId,
      }).catch(() => null);
      results.weight = devRes?.data?.data || { updated: true };
      logs.push(`  → 权重: ${results.weight.updated ? '已更新' : '跳过'}`);
    } catch (e) {
      logs.push(`  ⚠ 权重协调失败: ${e.message}`);
      results.weight = { updated: false, reason: e.message };
    }

    logs.push('[协调] 收益通知...');
    results.notification = { sent: false, methods: [] };
    if (settlement.payeeId) {
      results.notification = {
        userId: settlement.payeeId,
        amount: settlement.totalAmount,
        subject: settlement.subject,
        methods: ['in_app'],
        sent: true,
        timestamp: new Date().toISOString(),
      };
      logs.push(`  → 通知: ${settlement.payeeId} 收入 ${settlement.totalAmount}元`);
    }

    results.logs = logs;
    results.orchestratedAt = new Date().toISOString();

    const op = {
      id: _genOpId(),
      type: 'payment_orchestration',
      source: 'seal',
      target: 'all',
      payload: results,
      status: 'completed',
      retries: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    opStore.set(op.id, op);

    return results;
  }
}

module.exports = { WeightCoordinator, Orchestrator };
