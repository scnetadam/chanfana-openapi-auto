const crypto = require('crypto');
const { wallets, taxRecords, settleOrders, settleNotaryRecords, collectorQueue, collectorDeadLetter, splitRules: splitRulesStore, opRegistry } = require('../models/dataStore');

const RESERVE_TTL = 30 * 60 * 1000;

function _genId() {
  return 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function _hash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj) + crypto.randomBytes(4).toString('hex')).digest('hex');
}

class L1BalanceProbe {
  static async checkAndReserve(params) {
    const { userId, amount, channel, orderId, strategy } = params;
    const wallet = wallets.get(userId);
    if (!wallet) return { canReserve: false, reason: 'wallet_not_found', availableBalance: 0 };

    const available = (wallet.balance || 0) - (wallet.reservedAmount || 0);
    const channelProfile = ChannelCapability.getProfile(channel);

    const probeResult = {
      available,
      requested: amount,
      channel,
      probeMethod: channelProfile.balanceProbe,
      canReserve: available >= amount,
      reason: available >= amount ? null : 'insufficient_balance',
      estimatedHold: Math.min(amount * 1.1, available),
    };

    if (channel === 'alipay') {
      probeResult.probeNote = '支付宝无个人API余额探查，依赖0.01预冻结试探+OAUTH授权+芝麻脱敏';
      probeResult.l1Strategy = 'pessimistic_lock_and_preauth';
      if (strategy === 'preauth_probe') {
        probeResult.probeAction = '0.01_pre_freeze_test';
        probeResult.probeAmount = 0.01;
      }
    } else if (channel === 'wechat') {
      probeResult.probeNote = '微信额度预审接口';
      probeResult.l1Strategy = 'deduct_agreement_and_quota_check';
    } else if (channel === 'ecny') {
      probeResult.probeNote = '数字人民币钱包余额查询';
      probeResult.l1Strategy = 'umbrella_lock';
    }

    return probeResult;
  }

  static async executePreauth(params) {
    const { userId, amount, orderId, channel } = params;
    const lockResult = wallets.withLock(userId, (wallet) => {
      const available = (wallet.balance || 0) - (wallet.reservedAmount || 0);
      if (available < amount) return false;
      wallet.reservedAmount = (wallet.reservedAmount || 0) + amount;
      wallet.transactions.push({
        id: `tx_preauth_${Date.now()}`,
        userId,
        type: 'preauth_reserve',
        amount: -amount,
        subject: `L1预授权冻结: ${orderId}`,
        refId: orderId,
        channel,
        createdAt: new Date().toISOString(),
      });
      return wallet;
    });

    if (!lockResult.success) {
      return { reserved: false, reason: lockResult.error === 'operation_rejected' ? '余额不足' : 'preauth_failed' };
    }

    return {
      reserved: true,
      orderId,
      amount,
      channel,
      strategy: 'pessimistic_lock_and_preauth',
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + RESERVE_TTL).toISOString(),
    };
  }

  static async releasePreauth(userId, orderId, reason) {
    const lockResult = wallets.withLock(userId, (wallet) => {
      const preauthTx = wallet.transactions.find(t => t.refId === orderId && t.type === 'preauth_reserve');
      if (!preauthTx) return false;
      wallet.reservedAmount = Math.max(0, (wallet.reservedAmount || 0) - Math.abs(preauthTx.amount));
      preauthTx.type = 'preauth_released';
      preauthTx.releaseReason = reason || 'timeout';
      preauthTx.releasedAt = new Date().toISOString();
      return wallet;
    });
    return { released: lockResult.success, orderId, reason };
  }
}

class ChannelCapability {
  static getProfile(channel) {
    switch (channel) {
      case 'alipay':
        return {
          id: 'alipay', name: '支付宝', modes: ['page', 'qrcode', 'app'],
          balanceProbe: '0.01预冻结试探+OAUTH芝麻脱敏',
          reserveMethod: '资金授权冻结接口',
          executeMethod: '代扣协议周期扣/免密口+额度预审',
          costPerTx: 0.01, supportsSplit: true, supportsUmbrella: false,
          kycRequired: true, riskLevel: 'medium',
          l1Features: { hasPersonalBalanceApi: false, preauthSupported: true, deductAgreement: true },
        };
      case 'wechat':
        return {
          id: 'wechat', name: '微信支付', modes: ['jsapi'],
          balanceProbe: '额度预审接口', reserveMethod: '预扣锁定',
          executeMethod: 'JSAPI支付', costPerTx: 0.01,
          supportsSplit: true, supportsUmbrella: false, kycRequired: true, riskLevel: 'medium',
          l1Features: { hasPersonalBalanceApi: false, preauthSupported: true, deductAgreement: true },
        };
      case 'ecny':
        return {
          id: 'ecny', name: '数字人民币', modes: ['qrcode', 'page'],
          balanceProbe: '钱包余额查询', reserveMethod: '伞列锁定',
          executeMethod: '二维码/页面支付', costPerTx: 0,
          supportsSplit: true, supportsUmbrella: true, kycRequired: true, riskLevel: 'low',
          l1Features: { hasPersonalBalanceApi: true, preauthSupported: true, deductAgreement: false },
        };
      default:
        return {
          id: channel, name: channel, modes: [], balanceProbe: 'none',
          reserveMethod: 'none', executeMethod: 'simulated', costPerTx: 0,
          supportsSplit: false, supportsUmbrella: false, kycRequired: false, riskLevel: 'unknown',
          l1Features: { hasPersonalBalanceApi: false, preauthSupported: false, deductAgreement: false },
        };
    }
  }

  static recommend(params) {
    const { amount, needSplit, needUmbrella, userKycLevel, preferLowCost } = params;
    const channels = ['alipay', 'wechat', 'ecny'].map(c => ChannelCapability.getProfile(c));
    const scored = channels.map(ch => {
      let score = 50;
      if (preferLowCost && ch.costPerTx === 0) score += 30;
      else if (preferLowCost && ch.costPerTx <= 0.01) score += 15;
      if (needSplit && ch.supportsSplit) score += 10;
      if (needUmbrella && ch.supportsUmbrella) score += 20;
      if (userKycLevel === 'full' && ch.kycRequired) score += 5;
      if (ch.riskLevel === 'low') score += 10;
      if (amount > 0 && amount < ch.costPerTx * 100) score -= 20;
      return { ...ch, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}

class WalletGuard {
  static optimisticCheck(userId, expectedVersion) {
    const wallet = wallets.get(userId);
    if (!wallet) return { success: false, error: 'wallet_not_found' };
    const currentV = wallet._v || 0;
    if (currentV !== expectedVersion) {
      return { success: false, error: 'version_conflict', currentVersion: currentV, expectedVersion };
    }
    return { success: true, currentVersion: currentV, balance: wallet.balance, reserved: wallet.reservedAmount || 0, available: (wallet.balance || 0) - (wallet.reservedAmount || 0) };
  }

  static pessimisticDebit(userId, amount, orderId, channel) {
    return wallets.withLock(userId, (wallet) => {
      const available = (wallet.balance || 0) - (wallet.reservedAmount || 0);
      if (available < amount) return false;
      wallet.balance = (wallet.balance || 0) - amount;
      wallet.transactions.push({
        id: `tx_debit_${Date.now()}`,
        userId, type: 'payment_confirmed', amount: -amount,
        subject: `结算扣款: ${orderId}`, refId: orderId, channel,
        confirmedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      });
      return wallet;
    });
  }

  static credit(userId, amount, orderId, type) {
    return wallets.withLock(userId, (wallet) => {
      wallet.balance = (wallet.balance || 0) + amount;
      wallet.transactions.push({
        id: `tx_credit_${Date.now()}_${type}`,
        userId, type: type || 'split_receipt', amount,
        subject: `结算收入: ${orderId}`, refId: orderId,
        createdAt: new Date().toISOString(),
      });
      return wallet;
    });
  }

  static reconcile(userId) {
    const wallet = wallets.get(userId);
    if (!wallet) return { success: false, error: 'wallet_not_found' };
    const txSum = (wallet.transactions || []).reduce((sum, t) => sum + (t.type.includes('credit') || t.type === 'split_receipt' || t.type === 'receipt' ? t.amount : -Math.abs(t.amount)), 0);
    const reservedSum = (wallet.transactions || []).filter(t => t.type === 'preauth_reserve').reduce((s, t) => s + Math.abs(t.amount), 0);
    const balanceMatch = Math.abs(wallet.balance - txSum) < 0.01;
    const reservedMatch = Math.abs((wallet.reservedAmount || 0) - reservedSum) < 0.01;
    return {
      success: true, userId,
      bookBalance: wallet.balance, calculatedBalance: txSum,
      bookReserved: wallet.reservedAmount || 0, calculatedReserved: reservedSum,
      balanceMatch, reservedMatch,
      alert: !balanceMatch || !reservedMatch,
      transactionCount: (wallet.transactions || []).length,
    };
  }

  static async handleConcurrentConflict(userId, retryFn, maxRetries) {
    const retries = maxRetries || 3;
    for (let i = 0; i < retries; i++) {
      const result = retryFn();
      if (result.success) return result;
      if (result.error === 'version_conflict' || result.error === 'operation_rejected') {
        await new Promise(r => setTimeout(r, 100 * (i + 1)));
        continue;
      }
      return result;
    }
    return { success: false, error: 'concurrent_conflict_max_retries', retries };
  }
}

class TaxStateMachine {
  static STATES = ['pending', 'withheld', 'declared', 'remitted', 'verified', 'incentivized', 'penalized', 'void'];
  static TRANSITIONS = {
    pending: ['withheld', 'void'],
    withheld: ['declared', 'void'],
    declared: ['remitted', 'verified', 'void'],
    remitted: ['verified', 'void'],
    verified: ['incentivized', 'penalized', 'void'],
    incentivized: ['void'],
    penalized: ['void'],
    void: [],
  };

  static createRecord(params) {
    const { userId, amount, track, taxWithheld, netAmount, orderId } = params;
    const record = {
      id: 'TX-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex'),
      userId, amount: parseFloat(amount), track: track || 'B',
      taxWithheld: parseFloat(taxWithheld) || 0, netAmount: parseFloat(netAmount) || parseFloat(amount),
      orderId: orderId || null, state: 'pending',
      stateHistory: [{ state: 'pending', at: new Date().toISOString(), by: 'system' }],
      complianceWeight: 0, externalVerified: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    taxRecords.set(record.id, record);
    return record;
  }

  static transition(recordId, newState, params) {
    const record = taxRecords.get(recordId);
    if (!record) return { success: false, error: 'record_not_found' };
    const allowed = TaxStateMachine.TRANSITIONS[record.state] || [];
    if (!allowed.includes(newState)) {
      return { success: false, error: `transition_not_allowed: ${record.state} -> ${newState}`, currentState: record.state, allowed };
    }
    record.state = newState;
    record.stateHistory.push({ state: newState, at: new Date().toISOString(), by: (params || {}).by || 'system', note: (params || {}).note || '' });
    record.updatedAt = new Date().toISOString();
    if (newState === 'incentivized') record.complianceWeight = Math.min(1.0, (record.complianceWeight || 0) + 0.3);
    if (newState === 'penalized') record.complianceWeight = Math.max(0, (record.complianceWeight || 0) - 0.5);
    taxRecords.set(record.id, record);
    return { success: true, data: record };
  }

  static getUserComplianceWeight(userId) {
    const userRecords = taxRecords.find(r => r.userId === userId);
    if (userRecords.length === 0) return { userId, complianceWeight: 0, level: 'none', recordCount: 0 };
    let weight = 0, verifiedCount = 0, penalizedCount = 0, monthTotal = 0;
    userRecords.forEach(r => {
      weight += (r.complianceWeight || 0);
      if (r.state === 'verified' || r.state === 'incentivized') verifiedCount++;
      if (r.state === 'penalized') penalizedCount++;
      monthTotal += r.amount || 0;
    });
    const avgWeight = weight / userRecords.length;
    let level = 'none';
    if (avgWeight >= 0.7 && verifiedCount >= 3 && penalizedCount === 0) level = 'full';
    else if (avgWeight >= 0.3 && penalizedCount === 0) level = 'basic';
    return { userId, complianceWeight: parseFloat(avgWeight.toFixed(4)), level, recordCount: userRecords.length, verifiedCount, penalizedCount, monthTotal: parseFloat(monthTotal.toFixed(2)) };
  }

  static verifyFromExternal(userId, params) {
    const { source, ref, declarationId } = params;
    const userRecords = taxRecords.find(r => r.userId === userId && r.state !== 'void');
    let updated = 0;
    userRecords.forEach(r => {
      r.externalVerified = true;
      r.externalSource = source || 'unknown';
      r.externalRef = ref || null;
      r.externalDeclarationId = declarationId || null;
      r.complianceWeight = Math.min(1.0, (r.complianceWeight || 0) + 0.2);
      r.updatedAt = new Date().toISOString();
      taxRecords.set(r.id, r);
      updated++;
    });
    return { userId, source, ref, declarationId, recordsUpdated: updated, verified: true };
  }
}

class TaxEngine {
  static THRESHOLDS = { singleSmall: 800, singleLarge: 800, monthSmall: 10000, monthLarge: 10000, dailyFreq: 5 };

  static calculate(params) {
    const { amount, track = 'B', monthlyAccumulated = 0, dailyCount = 0 } = params;
    let netAmount = amount, taxWithheld = 0, needInvoice = false;
    const riskTags = [];
    let detail = '';
    if (track === 'A') {
      detail = 'A轨工资薪金: 全额 ' + amount.toFixed(2) + ' 元拨付，雇主代扣代缴个税';
    } else if (track === 'B') {
      const accumulated = monthlyAccumulated + amount;
      if (dailyCount >= TaxEngine.THRESHOLDS.dailyFreq) riskTags.push('高频交易警戒: 单日≥' + TaxEngine.THRESHOLDS.dailyFreq + '笔');
      if (amount > TaxEngine.THRESHOLDS.singleLarge) {
        taxWithheld = parseFloat((amount * 0.2).toFixed(2));
        netAmount = parseFloat((amount - taxWithheld).toFixed(2));
        needInvoice = true;
        detail = 'B轨单笔大额: 预扣20%=' + taxWithheld.toFixed(2) + '元，实付' + netAmount.toFixed(2) + '元';
      } else if (accumulated > TaxEngine.THRESHOLDS.monthLarge) {
        const taxable = Math.max(0, amount - 800);
        taxWithheld = parseFloat((taxable * 0.2).toFixed(2));
        netAmount = parseFloat((amount - taxWithheld).toFixed(2));
        needInvoice = true;
        riskTags.push('月累超限: 建议引导C轨');
        detail = 'B轨月累大额: 应税' + taxable.toFixed(2) + '元×0.2=' + taxWithheld.toFixed(2) + '元，实付' + netAmount.toFixed(2) + '元';
      } else {
        detail = 'B轨小额: 暂不扣缴，月底汇总';
      }
    } else if (track === 'C') {
      detail = 'C轨经营所得: 全额 ' + amount.toFixed(2) + ' 元拨付，龟钮留Hash证据链';
    }
    return { netAmount, taxWithheld, needInvoice, riskTags, track, detail };
  }
}

class AiThresholdEngine {
  static THRESHOLD_YUAN = 10;
  static COST_PER_TX = 0.01;

  static calculateThreshold(params) {
    const { channelCost, taxCost, splitWeight, userComplianceLevel } = params;
    const baseThreshold = this.THRESHOLD_YUAN;
    let multiplier = 1.0;
    if (channelCost > 0) multiplier += channelCost * 10;
    if (taxCost > 0) multiplier += taxCost * 5;
    if (splitWeight > 1) multiplier += (splitWeight - 1) * 0.5;
    if (userComplianceLevel === 'full') multiplier *= 0.8;
    else if (userComplianceLevel === 'basic') multiplier *= 1.0;
    else if (userComplianceLevel === 'none') multiplier *= 1.5;
    return parseFloat((baseThreshold * multiplier).toFixed(2));
  }

  static evaluateGuiniuPoint(params) {
    const { currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel } = params;
    const threshold = this.calculateThreshold({ channelCost, taxCost, splitWeight, userComplianceLevel });
    const totalValue = currentPoints * pointValue;
    const canTrigger = totalValue >= threshold;
    const netAfterCost = Math.max(0, totalValue - channelCost - taxCost);
    return {
      currentPoints, pointValue, totalValue: parseFloat(totalValue.toFixed(4)),
      threshold, canTrigger, netAfterCost: parseFloat(netAfterCost.toFixed(4)),
      costBreakdown: { channelCost, taxCost },
      remainingToThreshold: canTrigger ? 0 : parseFloat(((threshold - totalValue) / pointValue).toFixed(2)),
      complianceLevel: userComplianceLevel,
      recommendation: canTrigger ? '触发分账结算' : `还需累计 ${parseFloat(((threshold - totalValue) / pointValue).toFixed(2))} 龟钮点`,
    };
  }

  static processMicroPayment(params) {
    const { amount, userId, channel, kolTrack } = params;
    const channelProfile = ChannelCapability.getProfile(channel);
    const cost = channelProfile.costPerTx;
    const isBelowCost = amount < cost * 100;
    if (!isBelowCost) return { action: 'direct_settle', reason: '金额超成本线', amount, channel };
    return {
      action: 'accumulate_guiniu_point',
      reason: `金额${amount}元低于通道成本线${cost * 100}元，累计龟钮点`,
      amount, channel,
      pointsAdded: parseFloat((amount / 0.01).toFixed(2)),
      costSaving: true,
    };
  }
}

class CollectorAgent {
  static _circuitBreaker = { state: 'closed', failureCount: 0, threshold: 5, resetAt: null };

  static _getQueue() { return collectorQueue.getAll().filter(i => i.status === 'queued' || i.status === 'processing'); }
  static _getDlq() { return collectorDeadLetter.getAll(); }

  static submit(flowEvent) {
    const compliance = CollectorAgent._checkCompliance(flowEvent);
    if (!compliance.passed) return { accepted: false, reason: 'compliance_blocked', blockedStreams: compliance.failedStreams };
    const item = {
      id: 'COL-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
      ...flowEvent, status: 'queued', queuedAt: new Date().toISOString(), retries: 0, maxRetries: 3,
    };
    collectorQueue.set(item.id, item);
    return { accepted: true, collectionId: item.id, queueDepth: CollectorAgent._getQueue().length };
  }

  static _checkCompliance(flowEvent) {
    const required = ['orderFlow', 'fundFlow', 'taxFlow'];
    const results = {};
    let passed = true;
    const failedStreams = [];
    required.forEach(stream => {
      const present = flowEvent[stream] && flowEvent[stream].status !== 'failed';
      results[stream] = present;
      if (!present) { passed = false; failedStreams.push(stream); }
    });
    results.notaryFlow = !!flowEvent.notaryFlow;
    if (!results.notaryFlow) failedStreams.push('notaryFlow');
    return { passed, results, failedStreams };
  }

  static process() {
    if (CollectorAgent._circuitBreaker.state === 'open') {
      if (CollectorAgent._circuitBreaker.resetAt && Date.now() > CollectorAgent._circuitBreaker.resetAt) {
        CollectorAgent._circuitBreaker.state = 'closed';
        CollectorAgent._circuitBreaker.failureCount = 0;
      } else {
        return { processed: 0, reason: 'circuit_breaker_open' };
      }
    }
    const batch = CollectorAgent._getQueue().filter(i => i.status === 'queued');
    let processed = 0, failed = 0;
    batch.forEach(item => {
      try {
        item.status = 'processing';
        item.processedAt = new Date().toISOString();
        item.status = 'completed';
        item.completedAt = new Date().toISOString();
        collectorQueue.set(item.id, item);
        processed++;
      } catch (e) {
        item.retries++;
        item.lastError = e.message;
        if (item.retries >= item.maxRetries) {
          item.status = 'dead';
          item.deadAt = new Date().toISOString();
          collectorDeadLetter.set(item.id, item);
          collectorQueue.delete(item.id);
        } else {
          item.status = 'queued';
          collectorQueue.set(item.id, item);
        }
        failed++;
        CollectorAgent._circuitBreaker.failureCount++;
      }
    });
    if (CollectorAgent._circuitBreaker.failureCount >= CollectorAgent._circuitBreaker.threshold) {
      CollectorAgent._circuitBreaker.state = 'open';
      CollectorAgent._circuitBreaker.resetAt = Date.now() + 60000;
    }
    return { processed, failed, queueDepth: CollectorAgent._getQueue().length, dlqDepth: CollectorAgent._getDlq().length };
  }

  static stats() {
    return { queue: CollectorAgent._getQueue().length, deadLetter: CollectorAgent._getDlq().length, circuitBreaker: { ...CollectorAgent._circuitBreaker } };
  }

  static getDeadLetters() { return CollectorAgent._getDlq(); }

  static replayDeadLetter(id) {
    const item = collectorDeadLetter.get(id);
    if (!item) return { success: false, error: 'not_found' };
    item.status = 'queued';
    item.retries = 0;
    item.replayedAt = new Date().toISOString();
    collectorQueue.set(item.id, item);
    collectorDeadLetter.delete(item.id);
    return { success: true, id };
  }
}

class DualConsentGate {
  static requireFirstConsent(evidenceId, consentData) {
    if (!consentData || !consentData.granted) {
      return { passed: false, error: 'first_consent_required', message: '龟钮奖励权益点归集需用户首次同意' };
    }
    const record = settleNotaryRecords.get(evidenceId);
    if (!record) return { passed: false, error: 'evidence_not_found' };
    if (!record.confirmations) record.confirmations = {};
    record.confirmations.firstConsent = {
      granted: true,
      grantedAt: new Date().toISOString(),
      method: consentData.method || 'api',
      authMethod: consentData.authMethod || 'passkey',
      userAgent: consentData.userAgent || null,
      ip: consentData.ip || null,
    };
    record.updatedAt = new Date().toISOString();
    settleNotaryRecords.set(evidenceId, record);
    return { passed: true, evidenceId, consentType: 'firstConsent' };
  }

  static requireSecondConsent(evidenceId, consentData) {
    if (!consentData || !consentData.granted) {
      return { passed: false, error: 'second_consent_required', message: '真钱L1兑付+存证HASH确认需用户二次同意' };
    }
    const record = settleNotaryRecords.get(evidenceId);
    if (!record) return { passed: false, error: 'evidence_not_found' };
    if (!record.confirmations || !record.confirmations.firstConsent) {
      return { passed: false, error: 'first_consent_missing', message: '必须先完成首次同意' };
    }
    if (!record.confirmations) record.confirmations = {};
    record.confirmations.secondConsent = {
      granted: true,
      grantedAt: new Date().toISOString(),
      method: consentData.method || 'api',
      authMethod: consentData.authMethod || 'face_recognition',
      userAgent: consentData.userAgent || null,
      ip: consentData.ip || null,
      notaryCommit: true,
      taxDirectClear: true,
    };
    record.status = 'sealed';
    record.sealedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    settleNotaryRecords.set(evidenceId, record);
    return { passed: true, evidenceId, consentType: 'secondConsent', status: 'sealed' };
  }
}

class FourFlowCollector {
  static collect(params) {
    const { orderFlow, fundFlow, taxFlow, notaryFlow } = params;
    const streams = {
      orderFlow: orderFlow || { status: 'missing' },
      fundFlow: fundFlow || { status: 'missing' },
      taxFlow: taxFlow || { status: 'missing' },
      notaryFlow: notaryFlow || { status: 'missing' },
    };
    const compliance = CollectorAgent._checkCompliance(streams);
    if (!compliance.passed) {
      const criticalMissing = compliance.failedStreams.filter(s => s !== 'notaryFlow');
      if (criticalMissing.length > 0) {
        return { collected: false, reason: 'critical_stream_missing', missing: criticalMissing, blockedBeforeHash: true };
      }
    }
    const collectionResult = CollectorAgent.submit(streams);
    if (collectionResult.accepted) {
      CollectorAgent.process();
    }
    return {
      collected: true,
      collectionId: collectionResult.collectionId,
      streams,
      compliance,
      hashBeforeNotary: !compliance.results.notaryFlow,
      timestamp: new Date().toISOString(),
    };
  }
}

class NotaryEngine {
  static createEvidence(params) {
    const { orderId, amount, channel, payerId, payeeId, subject, splits, taxResult, hash, notaryProvider } = params;
    const evidenceId = 'EV-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
    const timestamp = new Date().toISOString();
    const fundFlowSnapshot = {
      totalAmount: amount,
      splits: (splits || []).map(s => ({ partyId: s.partyId, amount: s.amount, memo: s.memo })),
      taxWithheld: taxResult?.taxWithheld || 0,
      netAmount: taxResult?.netAmount || amount,
      taxTrack: taxResult?.track || null,
      taxRiskTags: taxResult?.riskTags || [],
    };
    const evidenceBody = { orderId, amount, channel, payerId, payeeId, subject, hash };
    const digest = crypto.createHash('sha256')
      .update(evidenceId + JSON.stringify(evidenceBody) + JSON.stringify(fundFlowSnapshot) + timestamp)
      .digest('hex');
    const record = {
      evidenceId, evidenceBody, fundFlowSnapshot,
      taxSnapshot: taxResult ? { track: taxResult.track, netAmount: taxResult.netAmount, taxWithheld: taxResult.taxWithheld, needInvoice: taxResult.needInvoice, riskTags: taxResult.riskTags, detail: taxResult.detail } : null,
      digest, notaryProvider: notaryProvider || 'self',
      status: 'created', timestamp, createdAt: timestamp,
      confirmations: { firstConsent: null, secondConsent: null },
    };
    settleNotaryRecords.set(evidenceId, record);
    return record;
  }

  static getEvidence(evidenceId) { return settleNotaryRecords.get(evidenceId); }
  static findByOrder(orderId) { return settleNotaryRecords.getAll().filter(r => r.evidenceBody && r.evidenceBody.orderId === orderId); }
  static stats() {
    const all = settleNotaryRecords.getAll();
    return { total: all.length, byStatus: all.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}) };
  }
  static verify(evidenceId) {
    const record = settleNotaryRecords.get(evidenceId);
    if (!record) return { valid: false, error: 'not_found' };
    const reDigest = crypto.createHash('sha256')
      .update(evidenceId + JSON.stringify(record.evidenceBody) + JSON.stringify(record.fundFlowSnapshot) + record.timestamp)
      .digest('hex');
    return { valid: reDigest === record.digest, originalDigest: record.digest, computedDigest: reDigest };
  }
  static updateStatus(evidenceId, status, extra) {
    const r = settleNotaryRecords.get(evidenceId);
    if (!r) return null;
    r.status = status;
    Object.assign(r, extra || {});
    r.updatedAt = new Date().toISOString();
    settleNotaryRecords.set(evidenceId, r);
    return r;
  }
}

class SplitContract {
  constructor(rule) {
    this.ruleId = rule.ruleId || _genId();
    this.name = rule.name;
    this.totalWeight = rule.totalWeight || 100;
    this.splits = rule.splits || [];
    this.conditions = rule.conditions || {};
    this.enabled = rule.enabled !== false;
    this.createdAt = new Date().toISOString();
  }
  calculate(totalAmount) {
    return this.splits.map(s => ({
      partyId: s.partyId,
      amount: parseFloat((totalAmount * s.weight / this.totalWeight).toFixed(2)),
      weight: s.weight, wallet: s.wallet, memo: s.memo || '',
    }));
  }
}

class RedisSimulator {
  static _store = new Map();
  static _expiry = new Map();

  static set(key, value, ttlMs) {
    this._store.set(key, value);
    if (ttlMs) this._expiry.set(key, Date.now() + ttlMs);
    return 'OK';
  }

  static get(key) {
    if (this._expiry.has(key) && Date.now() > this._expiry.get(key)) {
      this._store.delete(key);
      this._expiry.delete(key);
      return null;
    }
    return this._store.get(key) || null;
  }

  static incr(key) {
    const val = parseInt(this._store.get(key) || '0') + 1;
    this._store.set(key, String(val));
    return val;
  }

  static incrby(key, amount) {
    const val = parseFloat(this._store.get(key) || '0') + amount;
    this._store.set(key, String(val));
    return val;
  }

  static decr(key) {
    const val = parseInt(this._store.get(key) || '0') - 1;
    this._store.set(key, String(val));
    return val;
  }

  static del(key) {
    this._store.delete(key);
    this._expiry.delete(key);
    return 1;
  }

  static exists(key) {
    if (this._expiry.has(key) && Date.now() > this._expiry.get(key)) {
      this._store.delete(key);
      this._expiry.delete(key);
      return false;
    }
    return this._store.has(key);
  }

  static keys(pattern) {
    const prefix = pattern.replace('*', '');
    return Array.from(this._store.keys()).filter(k => k.startsWith(prefix));
  }

  static setnx(key, value) {
    if (this._store.has(key)) return 0;
    this._store.set(key, value);
    return 1;
  }

  static getset(key, value) {
    const old = this._store.get(key) || null;
    this._store.set(key, value);
    return old;
  }

  static mget(...keys) {
    return keys.map(k => this.get(k));
  }

  static hset(hashKey, field, value) {
    const hash = this._store.get(hashKey) || {};
    hash[field] = value;
    this._store.set(hashKey, hash);
    return 1;
  }

  static hget(hashKey, field) {
    const hash = this._store.get(hashKey);
    return hash ? hash[field] || null : null;
  }

  static hgetall(hashKey) {
    return this._store.get(hashKey) || {};
  }

  static hincrby(hashKey, field, amount) {
    const hash = this._store.get(hashKey) || {};
    hash[field] = String((parseFloat(hash[field] || 0) + amount));
    this._store.set(hashKey, hash);
    return parseFloat(hash[field]);
  }

  static stats() {
    return { totalKeys: this._store.size, keys: Array.from(this._store.keys()).slice(0, 50) };
  }
}

class SupervisoryAccount {
  static _accounts = new Map();

  static create(params) {
    const { userId, accountType, provider, bankAccount } = params;
    const accountId = 'SA-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
    const account = {
      accountId, userId,
      accountType: accountType || 'escrow',
      provider: provider || 'platform',
      bankAccount: bankAccount || null,
      balance: 0, frozenAmount: 0, status: 'active',
      riskFlags: [], judicialFreeze: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this._accounts.set(accountId, account);
    return account;
  }

  static getAccount(accountId) { return this._accounts.get(accountId) || null; }

  static findByUser(userId) { return Array.from(this._accounts.values()).filter(a => a.userId === userId); }

  static deposit(accountId, amount, orderId) {
    const account = this._accounts.get(accountId);
    if (!account) return { success: false, error: 'account_not_found' };
    if (account.judicialFreeze) return { success: false, error: 'judicial_freeze_active' };
    account.balance = parseFloat((account.balance + amount).toFixed(2));
    account.updatedAt = new Date().toISOString();
    this._accounts.set(accountId, account);
    RedisSimulator.hincrby(`sa:${accountId}`, 'balance', amount);
    return { success: true, accountId, newBalance: account.balance, amount, orderId };
  }

  static freezeAmount(accountId, amount, reason) {
    const account = this._accounts.get(accountId);
    if (!account) return { success: false, error: 'account_not_found' };
    const available = account.balance - account.frozenAmount;
    if (available < amount) return { success: false, error: 'insufficient_available', available, requested: amount };
    account.frozenAmount = parseFloat((account.frozenAmount + amount).toFixed(2));
    account.riskFlags.push({ type: 'freeze', amount, reason, at: new Date().toISOString() });
    account.updatedAt = new Date().toISOString();
    this._accounts.set(accountId, account);
    return { success: true, accountId, frozenAmount: account.frozenAmount, availableBalance: account.balance - account.frozenAmount };
  }

  static unfreezeAmount(accountId, amount, reason) {
    const account = this._accounts.get(accountId);
    if (!account) return { success: false, error: 'account_not_found' };
    account.frozenAmount = Math.max(0, parseFloat((account.frozenAmount - amount).toFixed(2)));
    account.updatedAt = new Date().toISOString();
    this._accounts.set(accountId, account);
    return { success: true, accountId, frozenAmount: account.frozenAmount, availableBalance: account.balance - account.frozenAmount };
  }

  static judicialFreeze(accountId, reason, courtRef) {
    const account = this._accounts.get(accountId);
    if (!account) return { success: false, error: 'account_not_found' };
    account.judicialFreeze = true;
    account.frozenAmount = account.balance;
    account.riskFlags.push({ type: 'judicial_freeze', reason, courtRef, at: new Date().toISOString() });
    account.updatedAt = new Date().toISOString();
    this._accounts.set(accountId, account);
    return { success: true, accountId, judicialFreeze: true, frozenAmount: account.frozenAmount };
  }

  static judicialUnfreeze(accountId, reason, courtRef) {
    const account = this._accounts.get(accountId);
    if (!account) return { success: false, error: 'account_not_found' };
    account.judicialFreeze = false;
    account.frozenAmount = 0;
    account.riskFlags.push({ type: 'judicial_unfreeze', reason, courtRef, at: new Date().toISOString() });
    account.updatedAt = new Date().toISOString();
    this._accounts.set(accountId, account);
    return { success: true, accountId, judicialFreeze: false };
  }

  static emergencyCollect(accountId, amount, targetAccount, reason) {
    const account = this._accounts.get(accountId);
    const target = this._accounts.get(targetAccount);
    if (!account || !target) return { success: false, error: 'account_not_found' };
    if (account.balance < amount) return { success: false, error: 'insufficient_balance' };
    account.balance = parseFloat((account.balance - amount).toFixed(2));
    target.balance = parseFloat((target.balance + amount).toFixed(2));
    account.riskFlags.push({ type: 'emergency_collect', amount, targetAccount, reason, at: new Date().toISOString() });
    account.updatedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();
    this._accounts.set(accountId, account);
    this._accounts.set(targetAccount, target);
    return { success: true, fromAccountId: accountId, toAccountId: targetAccount, amount, reason };
  }
}

class RiskWatchdog {
  static _alerts = new Map();

  static checkRisk(userId, params) {
    const { amount, channel, dailyCount, monthlyTotal, hasJudicialRecord, amlFlags } = params;
    const riskTags = [];
    let shouldBlock = false;
    let shouldFreeze = false;
    if (amlFlags && amlFlags.length > 0) { riskTags.push('AML_ALERT'); shouldBlock = true; }
    if (hasJudicialRecord) { riskTags.push('JUDICIAL_RECORD'); shouldFreeze = true; }
    if (dailyCount >= 20) riskTags.push('HIGH_FREQUENCY');
    if (amount >= 50000) riskTags.push('LARGE_AMOUNT');
    if (monthlyTotal >= 200000) riskTags.push('MONTHLY_OVER_LIMIT');
    if (params.pepFlag) riskTags.push('PEP_PERSON');
    const result = {
      userId,
      riskLevel: riskTags.length === 0 ? 'low' : riskTags.length < 3 ? 'medium' : 'high',
      riskTags, shouldBlock, shouldFreeze,
      checkedAt: new Date().toISOString(),
    };
    if (riskTags.length > 0) {
      const alertId = 'RK-' + Date.now().toString(36);
      this._alerts.set(alertId, { ...result, alertId });
      RedisSimulator.set(`risk:${userId}:${alertId}`, JSON.stringify(result), 86400000);
    }
    return result;
  }

  static getAlerts(userId) { return Array.from(this._alerts.values()).filter(a => a.userId === userId); }
  static getAllAlerts() { return Array.from(this._alerts.values()); }
}

class BudgetForecastEngine {
  static forecast(params) {
    const { currentBudget, dailySpendRate, daysRemaining, pendingOrders, projectedDataRevenue } = params;
    const projectedSpend = dailySpendRate * daysRemaining;
    const projectedTotal = currentBudget - projectedSpend + (projectedDataRevenue || 0);
    const willExhaust = projectedTotal < 0;
    const exhaustionDate = willExhaust ? new Date(Date.now() + (currentBudget / dailySpendRate) * 86400000).toISOString() : null;
    let recommendation = '';
    if (willExhaust) recommendation = `预算将在${Math.floor(currentBudget / dailySpendRate)}天内耗尽，建议增加预算或调整数据采购策略`;
    else if (projectedTotal < currentBudget * 0.2) recommendation = `预算余量不足20%，建议规划预算补充，预计可用${Math.floor(projectedTotal / dailySpendRate)}天`;
    else recommendation = `预算充足，预计可用${Math.floor(projectedTotal / dailySpendRate)}天`;
    const timeline = this._generateTimeline(currentBudget, dailySpendRate, daysRemaining);
    return {
      currentBudget, dailySpendRate, daysRemaining,
      projectedSpend: parseFloat(projectedSpend.toFixed(2)),
      projectedDataRevenue: parseFloat((projectedDataRevenue || 0).toFixed(2)),
      projectedRemaining: parseFloat(projectedTotal.toFixed(2)),
      willExhaust, exhaustionDate, recommendation, timeline,
      pendingOrdersCount: pendingOrders || 0,
      forecastAt: new Date().toISOString(),
    };
  }

  static _generateTimeline(budget, dailyRate, days) {
    const entries = [];
    let remaining = budget;
    for (let d = 0; d <= Math.min(days, 30); d += d <= 7 ? 1 : d <= 14 ? 2 : 7) {
      remaining -= dailyRate * d;
      entries.push({
        day: d, date: new Date(Date.now() + d * 86400000).toISOString().split('T')[0],
        projectedRemaining: parseFloat(Math.max(0, remaining).toFixed(2)),
        status: remaining > budget * 0.2 ? 'healthy' : remaining > 0 ? 'warning' : 'exhausted',
      });
    }
    return entries;
  }

  static getBudgetRecommendation(userId) {
    const budgetData = RedisSimulator.hgetall(`budget:${userId}`);
    if (!budgetData || !budgetData.currentBudget) return { userId, hasBudget: false, recommendation: '请先设置预算' };
    return this.forecast({
      currentBudget: parseFloat(budgetData.currentBudget),
      dailySpendRate: parseFloat(budgetData.dailySpendRate || 0),
      daysRemaining: parseInt(budgetData.daysRemaining || 30),
      pendingOrders: parseInt(budgetData.pendingOrders || 0),
      projectedDataRevenue: parseFloat(budgetData.projectedDataRevenue || 0),
    });
  }

  static updateBudgetTracking(userId, budgetData) {
    RedisSimulator.hset(`budget:${userId}`, 'currentBudget', String(budgetData.currentBudget));
    RedisSimulator.hset(`budget:${userId}`, 'dailySpendRate', String(budgetData.dailySpendRate));
    RedisSimulator.hset(`budget:${userId}`, 'daysRemaining', String(budgetData.daysRemaining || 30));
    RedisSimulator.hset(`budget:${userId}`, 'updatedAt', new Date().toISOString());
    return { userId, updated: true };
  }
}

class DualClearanceCompliance {
  static check(params) {
    const { payerId, payeeId, amount, channel, merchantId, isPlatformCollect } = params;
    const violations = [];
    const warnings = [];
    if (isPlatformCollect && amount > 0) {
      warnings.push('资金归集检测: 金额从用户流向平台，需确保分账机制合规');
      if (!merchantId) violations.push('二清违规风险: 无商户ID的资金归集');
    }
    if (amount > 5000 && !params.kycVerified) violations.push('大额交易需KYC验证');
    return { passed: violations.length === 0, violations, warnings, payerId, payeeId, amount, channel, checkedAt: new Date().toISOString() };
  }
}

class DirtyWriteManager {
  static checkAndRepair(storeName, store) {
    const all = store.getAll();
    const issues = [];
    all.forEach(item => {
      if (item.balance !== undefined && item.transactions) {
        const txSum = (item.transactions || []).reduce((sum, t) => sum + (t.type.includes('credit') || t.type === 'split_receipt' || t.type === 'receipt' ? t.amount : -Math.abs(t.amount)), 0);
        if (Math.abs(item.balance - txSum) >= 0.01) issues.push({ id: item.id, type: 'balance_mismatch', bookBalance: item.balance, calculatedBalance: txSum, diff: item.balance - txSum });
      }
      if (item.reservedAmount !== undefined && item.transactions) {
        const reservedSum = (item.transactions || []).filter(t => t.type === 'preauth_reserve').reduce((s, t) => s + Math.abs(t.amount), 0);
        if (Math.abs((item.reservedAmount || 0) - reservedSum) >= 0.01) issues.push({ id: item.id, type: 'reserved_mismatch', bookReserved: item.reservedAmount, calculatedReserved: reservedSum });
      }
    });
    return { storeName, totalChecked: all.length, issues, issueCount: issues.length, checkedAt: new Date().toISOString() };
  }

  static autoRepair(store, issues) {
    const repaired = [];
    issues.forEach(issue => {
      const item = store.get(issue.id);
      if (!item) return;
      if (issue.type === 'balance_mismatch') { item.balance = issue.calculatedBalance; repaired.push({ id: issue.id, field: 'balance', from: issue.bookBalance, to: issue.calculatedBalance }); }
      if (issue.type === 'reserved_mismatch') { item.reservedAmount = issue.calculatedReserved; repaired.push({ id: issue.id, field: 'reservedAmount', from: issue.bookReserved, to: issue.calculatedReserved }); }
      store.set(issue.id, item);
    });
    return { repaired, count: repaired.length, repairedAt: new Date().toISOString() };
  }
}

class ConsentAuthContainer {
  static validateFirstConsent(evidenceId, consentData) {
    const requiredMethods = ['passkey', 'face_recognition', 'password'];
    const authMethod = consentData?.authMethod || 'api';
    const isSecure = requiredMethods.includes(authMethod);
    if (!isSecure && consentData?.granted) return { passed: false, error: 'insecure_auth_method', message: '龟钮奖励权益点归集首次确认必须通过Passkey/人脸/密码验证', requiredMethods, providedMethod: authMethod };
    return DualConsentGate.requireFirstConsent(evidenceId, { ...consentData, authMethod, containerType: isSecure ? 'secure_container' : 'insecure', biometricVerified: authMethod === 'face_recognition', passkeyVerified: authMethod === 'passkey' });
  }

  static validateSecondConsent(evidenceId, consentData) {
    const mandatoryMethods = ['passkey', 'face_recognition'];
    const authMethod = consentData?.authMethod || 'api';
    if (!mandatoryMethods.includes(authMethod)) return { passed: false, error: 'mandatory_secure_auth_required', message: '真钱L1兑付+存证HASH确认必须通过Passkey或人脸识别，不可抗辩', mandatoryMethods, providedMethod: authMethod };
    if (!consentData?.taxDirectClearConsent) return { passed: false, error: 'tax_direct_clear_consent_required', message: '必须同意在先直接清税机制' };
    return DualConsentGate.requireSecondConsent(evidenceId, { ...consentData, authMethod, containerType: 'mandatory_secure', biometricVerified: authMethod === 'face_recognition', passkeyVerified: authMethod === 'passkey', notaryCommit: true, taxDirectClear: true, irrevocable: true });
  }
}

class EvidenceValuationEngine {
  static DIMENSION_WEIGHTS = { viewCount: 0.15, dwellTime: 0.20, purchaseCount: 0.25, shareCount: 0.15, commentCount: 0.10, bookmarkCount: 0.08, reportCount: -0.12 };
  static BASE_VALUE_RATE = 0.001;

  static evaluate(metrics) {
    const { viewCount = 0, dwellTime = 0, purchaseCount = 0, shareCount = 0, commentCount = 0, bookmarkCount = 0, reportCount = 0, baseValue = 0 } = metrics;
    const raw = { viewCount, dwellTime, purchaseCount, shareCount, commentCount, bookmarkCount, reportCount };
    const dimensions = {};
    Object.entries(this.DIMENSION_WEIGHTS).forEach(([dim, weight]) => {
      const rawVal = raw[dim] || 0;
      const normalizedDim = dim === 'dwellTime' ? rawVal / 60 : rawVal;
      dimensions[dim] = parseFloat((normalizedDim * weight).toFixed(4));
    });
    const positiveContribution = Object.entries(dimensions).filter(([_, v]) => v > 0).reduce((s, [_, v]) => s + v, 0);
    const negativeContribution = Object.entries(dimensions).filter(([_, v]) => v < 0).reduce((s, [_, v]) => s + v, 0);
    const totalWeight = parseFloat((positiveContribution + negativeContribution).toFixed(4));
    const estimatedValue = parseFloat((Math.max(0, totalWeight) * (baseValue || this.BASE_VALUE_RATE) * 100).toFixed(4));
    let qualityGrade = 'E';
    if (totalWeight >= 0.8) qualityGrade = 'A';
    else if (totalWeight >= 0.5) qualityGrade = 'B';
    else if (totalWeight >= 0.3) qualityGrade = 'C';
    else if (totalWeight >= 0.1) qualityGrade = 'D';
    return { totalWeight, estimatedValue, positiveContribution: parseFloat(positiveContribution.toFixed(4)), negativeContribution: parseFloat(negativeContribution.toFixed(4)), dimensions, raw, qualityGrade };
  }

  static testValuationPay(evidenceId, valuationResult, channel) {
    const testAmount = valuationResult.estimatedValue;
    if (testAmount <= 0) return { testPayable: false, reason: '估值不足以支付', estimatedValue: testAmount };
    const channelProfile = ChannelCapability.getProfile(channel || 'alipay');
    const microEval = AiThresholdEngine.processMicroPayment({ amount: testAmount, userId: 'valuation_test', channel: channel || 'alipay' });
    return { testPayable: true, evidenceId, estimatedValue: testAmount, qualityGrade: valuationResult.qualityGrade, channel: channel || 'alipay', microEval, testPayAt: new Date().toISOString() };
  }
}

module.exports = {
  _genId, _hash,
  L1BalanceProbe, ChannelCapability, WalletGuard,
  TaxStateMachine, TaxEngine,
  AiThresholdEngine, CollectorAgent,
  DualConsentGate, FourFlowCollector,
  NotaryEngine, SplitContract,
  RESERVE_TTL,
  RedisSimulator,
  SupervisoryAccount,
  RiskWatchdog,
  BudgetForecastEngine,
  DualClearanceCompliance,
  DirtyWriteManager,
  ConsentAuthContainer,
  EvidenceValuationEngine,
};
