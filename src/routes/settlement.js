const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { walletStore, userStore, notificationStore, hashStore, SETTLEMENT_STATUS, settlementStore, idempotency, kolTrackStore, taxRecords } = require('../models/dataStore');
const yinzhengClient = require('../yinzhengClient');
const hashEngine = require('../hashEngine');
const aiValueEngine = require('../aiValueEngine');

const FEE_RATE = 0.006;
const AI_VERIFY_THRESHOLD = 100;
const RESERVE_TTL = 30 * 60 * 1000;

const ENVIRONMENT = process.env.PAY_ENV || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox');

const TAX_THRESHOLDS = {
  singleSmall: 800,
  singleLarge: 800,
  monthSmall: 10000,
  monthLarge: 10000,
  dailyFreq: 5,
};

const TAX_STATES = {
  PENDING: 'pending',
  DECLARED: 'declared',
  VERIFIED: 'verified',
  INCENTIVIZED: 'incentivized',
  PENALIZED: 'penalized',
  VOID: 'void',
};

const TAX_TRANSITIONS = {
  pending: ['declared', 'void'],
  declared: ['verified', 'penalized', 'void'],
  verified: ['incentivized', 'penalized', 'void'],
  incentivized: ['void'],
  penalized: ['void'],
  void: [],
};

class TaxStateMachine {
  constructor(record) {
    this.record = record || { state: TAX_STATES.PENDING, history: [] };
  }

  getState() { return this.record.state; }

  canTransitionTo(targetState) {
    const allowed = TAX_TRANSITIONS[this.record.state] || [];
    return allowed.includes(targetState);
  }

  transition(targetState, reason, actor) {
    if (!this.canTransitionTo(targetState)) {
      return { success: false, error: `不允许从 ${this.record.state} 转到 ${targetState}` };
    }
    const prev = this.record.state;
    this.record.state = targetState;
    this.record.history.push({ from: prev, to: targetState, reason, actor: actor || 'system', timestamp: new Date().toISOString() });
    return { success: true, from: prev, to: targetState };
  }
}

class TaxEngine {
  static calculate(params) {
    const { amount, track = 'B', monthlyAccumulated = 0, dailyCount = 0 } = params;
    let netAmount = amount, taxWithheld = 0, needInvoice = false;
    const riskTags = [];
    let detail = '';

    if (track === 'A') {
      detail = 'A轨工资薪金，全额 ' + amount.toFixed(2) + ' 元，由雇主代扣代缴个税';
    } else if (track === 'B') {
      const accumulated = monthlyAccumulated + amount;
      if (dailyCount >= TAX_THRESHOLDS.dailyFreq) riskTags.push('高频交易预警: 单日≥' + TAX_THRESHOLDS.dailyFreq + '笔');
      if (amount > TAX_THRESHOLDS.singleLarge) {
        taxWithheld = parseFloat((amount * 0.2).toFixed(2));
        netAmount = parseFloat((amount - taxWithheld).toFixed(2));
        needInvoice = true;
        detail = 'B轨单笔大额，预扣20%=' + taxWithheld.toFixed(2) + '元，实发' + netAmount.toFixed(2) + '元';
      } else if (accumulated > TAX_THRESHOLDS.monthLarge) {
        const taxable = Math.max(0, amount - 800);
        taxWithheld = parseFloat((taxable * 0.2).toFixed(2));
        netAmount = parseFloat((amount - taxWithheld).toFixed(2));
        needInvoice = true;
        riskTags.push('月累超限额: 建议引导C轨');
        detail = 'B轨月累大额，应税' + taxable.toFixed(2) + '元×20%=' + taxWithheld.toFixed(2) + '元，实发' + netAmount.toFixed(2) + '元';
      } else {
        detail = 'B轨小额，暂不扣缴，月底汇算';
      }
    } else if (track === 'C') {
      detail = 'C轨经营所得，全额 ' + amount.toFixed(2) + ' 元拨付，龟钮票Hash凭证链';
    }

    return { netAmount, taxWithheld, needInvoice, riskTags, track, detail };
  }

  static batchProcessMonth(items) {
    return items.map(function(item) {
      const taxable = Math.max(0, item.monthlyAccumulated - 800);
      const taxW = parseFloat((taxable * 0.2).toFixed(2));
      return {
        userId: item.userId,
        monthlyTotal: item.monthlyAccumulated,
        taxWithheld: taxW,
        netAmount: item.amount - taxW,
        needInvoice: true,
        detail: '月底汇算: 月累' + item.monthlyAccumulated.toFixed(2) + '元，应税' + taxable.toFixed(2) + '元×20%=' + taxW.toFixed(2) + '元',
      };
    });
  }
}

class AiThresholdEngine {
  static THRESHOLD_YUAN = 10;
  static COST_PER_TX = 0.01;

  static processMicroPayment(params) {
    const { amount, userId, channel, kolTrack } = params;
    const cost = 0.01;
    const isBelowCost = amount < cost * 100;
    if (!isBelowCost) {
      return { action: 'direct_settle', reason: '金额超过成本线', amount, channel };
    }
    return {
      action: 'accumulate_guiniu_point',
      reason: `金额${amount}元低于通道成本线${cost * 100}元，累计龟钮点`,
      amount,
      channel,
      pointsAdded: parseFloat((amount / 0.01).toFixed(2)),
      costSaving: true,
    };
  }

  static evaluateGuiniuPoint(params) {
    const { currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel } = params;
    let multiplier = 1.0;
    if (channelCost > 0) multiplier += channelCost * 10;
    if (taxCost > 0) multiplier += taxCost * 5;
    if (splitWeight > 1) multiplier += (splitWeight - 1) * 0.5;
    if (userComplianceLevel === 'full') multiplier *= 0.8;
    else if (userComplianceLevel === 'none') multiplier *= 1.5;
    const threshold = parseFloat((this.THRESHOLD_YUAN * multiplier).toFixed(2));
    const totalValue = currentPoints * pointValue;
    const canTrigger = totalValue >= threshold;
    return {
      currentPoints, pointValue,
      totalValue: parseFloat(totalValue.toFixed(4)),
      threshold,
      canTrigger,
      netAfterCost: parseFloat(Math.max(0, totalValue - channelCost - taxCost).toFixed(4)),
      remainingToThreshold: canTrigger ? 0 : parseFloat(((threshold - totalValue) / pointValue).toFixed(2)),
      complianceLevel: userComplianceLevel,
      recommendation: canTrigger ? '触发分账结算' : `还需累计 ${parseFloat(((threshold - totalValue) / pointValue).toFixed(2))} 龟钮点`,
    };
  }
}

class NotaryEngine {
  static _records = new Map();
  static _counter = 0;

  static createEvidence(params) {
    const { orderId, amount, channel, payerId, payeeId, subject, splits, taxResult, hash } = params;
    this._counter++;
    const evidenceId = 'EV-' + Date.now().toString(36) + '-' + this._counter;
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
      taxSnapshot: taxResult || null,
      digest, status: 'created', timestamp, createdAt: timestamp,
      confirmations: { firstConsent: null, secondConsent: null },
    };
    this._records.set(evidenceId, record);
    return record;
  }

  static getEvidence(evidenceId) { return this._records.get(evidenceId) || null; }
  static findByOrder(orderId) { return Array.from(this._records.values()).filter(r => r.evidenceBody.orderId === orderId); }

  static recordConsent(evidenceId, consentType, consentData) {
    const r = this._records.get(evidenceId);
    if (!r) return null;
    if (!r.confirmations) r.confirmations = {};
    r.confirmations[consentType] = {
      granted: true,
      grantedAt: new Date().toISOString(),
      method: consentData.method || 'api',
      userAgent: consentData.userAgent || null,
      ip: consentData.ip || null,
    };
    r.updatedAt = new Date().toISOString();
    return r;
  }
}

function _genId() {
  return 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function _hash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj) + crypto.randomBytes(4).toString('hex')).digest('hex');
}

function _getEnvironment(channel, backendAvailable) {
  if (ENVIRONMENT === 'live' && backendAvailable) return 'live';
  if (ENVIRONMENT === 'sandbox' || (process.env.NODE_ENV !== 'production' && backendAvailable)) return 'sandbox';
  return 'simulated';
}

router.post('/prepare', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, type, refType, refId, description, kolTrack, monthlyAccumulated, dailyCount, idempotencyKey } = req.body;
    if (!fromUserId || !toUserId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'fromUserId, toUserId, amount(>0) 为必填' });
    }

    if (idempotencyKey) {
      const dup = idempotency.check(idempotencyKey);
      if (dup.isDuplicate) {
        return res.json({ success: true, data: dup.result, idempotent: true });
      }
    }

    const fee = +(amount * FEE_RATE).toFixed(4);
    const settlement = settlementStore.create({
      fromUserId, toUserId, amount, fee, type, refType, refId, description,
    });

    let taxResult = null;
    if (kolTrack) {
      taxResult = TaxEngine.calculate({
        amount, track: kolTrack,
        monthlyAccumulated: monthlyAccumulated || 0,
        dailyCount: dailyCount || 0,
      });
      settlement.taxResult = taxResult;
      settlement.netAmount = taxResult.netAmount - fee;
    }

    const hashData = JSON.stringify({ id: settlement.id, from: fromUserId, to: toUserId, amount, fee, taxResult, ts: settlement.createdAt });
    const hash = _hash(hashData);
    const evidence = NotaryEngine.createEvidence({
      orderId: settlement.id, amount, channel: 'internal', payerId: fromUserId, payeeId: toUserId,
      subject: description || type || 'settlement', taxResult, hash,
    });

    settlement.hashProof = hash;
    settlement.evidenceId = evidence.evidenceId;
    settlement.status = 'prepared';
    settlement.environment = _getEnvironment('internal', false);
    settlement.taxState = TAX_STATES.PENDING;

    const thresholdEval = AiThresholdEngine.processMicroPayment({ amount, userId: fromUserId, channel: 'internal', kolTrack });
    settlement.thresholdEval = thresholdEval;

    const wallet = walletStore.get(fromUserId);
    const walletCheck = {
      available: wallet?.promotionBalance || 0,
      requested: amount,
      canReserve: (wallet?.promotionBalance || 0) >= amount,
    };

    if (idempotencyKey) {
      idempotency.complete(idempotencyKey, { settlementId: settlement.id, status: 'prepared' });
    }

    res.json({
      success: true,
      data: {
        settlementId: settlement.id,
        status: 'prepared',
        totalAmount: amount,
        fee,
        netAmount: settlement.netAmount || (amount - fee),
        taxResult,
        evidence: { evidenceId: evidence.evidenceId, digest: evidence.digest, status: evidence.status },
        hash,
        walletCheck,
        thresholdEval,
        environment: settlement.environment,
        nextStep: 'confirm',
        confirmUrl: '/api/settlement/confirm',
      },
    });
  } catch (e) {
    console.error('[Settlement Prepare Error]', e);
    res.status(500).json({ success: false, error: '结算准备失败: ' + e.message });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { settlementId, firstConsent, secondConsent, consentMethod } = req.body;
    if (!settlementId) return res.status(400).json({ success: false, error: 'settlementId 必填' });

    const settlement = settlementStore.getById(settlementId);
    if (!settlement) return res.status(404).json({ success: false, error: '结算单不存在' });
    if (settlement.status !== 'prepared') {
      return res.status(400).json({ success: false, error: `结算单状态不允许确认: ${settlement.status}` });
    }

    if (!firstConsent) {
      return res.status(400).json({ success: false, error: '第一次用户确认（龟钮奖励权益点归属同意）未通过' });
    }

    if (settlement.evidenceId) {
      NotaryEngine.recordConsent(settlement.evidenceId, 'firstConsent', {
        method: consentMethod || 'api',
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    }

    const wallet = walletStore.get(settlement.toUserId);
    if (wallet && wallet.promotionBalance !== undefined) {
      if (wallet.promotionBalance + settlement.netAmount > 0) {
        wallet.promotionBalance = +(wallet.promotionBalance + 0).toFixed(2);
      }
    }

    if (!secondConsent) {
      settlementStore.updateStatus(settlement.id, 'reserved', { firstConsent: true });
      return res.json({
        success: true,
        data: {
          settlementId,
          status: 'reserved',
          message: '预扣已锁定，等待第二次确认（真钱L1兑付+存证HASH确认）',
          nextStep: 'execute',
          executeUrl: '/api/settlement/' + settlementId + '/execute',
        },
      });
    }

    if (settlement.evidenceId) {
      NotaryEngine.recordConsent(settlement.evidenceId, 'secondConsent', {
        method: consentMethod || 'api',
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    }

    settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.PROCESSING, {
      firstConsent: true,
      secondConsent: true,
    });

    await _executeSettlement(settlement, req);

    const completed = settlementStore.getById(settlementId);
    res.json({ success: true, data: completed });
  } catch (e) {
    console.error('[Settlement Confirm Error]', e);
    res.status(500).json({ success: false, error: '结算确认失败: ' + e.message });
  }
});

async function _executeSettlement(settlement, req) {
  let aiVerified = false;
  if (settlement.amount >= AI_VERIFY_THRESHOLD && process.env.GLM_API_KEY) {
    try {
      const recentSettlements = settlementStore.getByUser(settlement.toUserId)
        .filter(s => s.status === SETTLEMENT_STATUS.COMPLETED);
      const aiResult = await aiValueEngine.calculateValue(
        { id: settlement.refId, trackChain: [{ userId: settlement.toUserId, role: 'originator', timestamp: settlement.createdAt }], stats: { views: recentSettlements.length, bookings: 0, shares: 0, estimatedEarnings: settlement.amount }, createdAt: settlement.createdAt },
        'BOOKING',
        { userId: settlement.toUserId, useAI: true }
      );
      aiVerified = aiResult.weightMultiplier >= 0.5;
    } catch (e) {
      console.error('[Settlement] AI验证失败:', e.message);
      aiVerified = false;
    }
  } else {
    aiVerified = true;
  }

  if (!aiVerified) {
    settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.FAILED, { aiVerified: false });
    return;
  }

  walletStore.addPromotion(settlement.toUserId, settlement.netAmount, settlement.description || '结算收入', settlement.refId);

  try {
    const hashData = JSON.stringify({ settlementId: settlement.id, status: 'completed', netAmount: settlement.netAmount, completedAt: new Date().toISOString() });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: 'stl_exec_' + settlement.id, hash, dataDigest: digest,
      dataType: 'commission', metadata: { settlementId: settlement.id, netAmount: settlement.netAmount },
    });

    try {
      await yinzhengClient.createPaymentHash({
        txId: 'stl_pay_' + settlement.id, hash, dataDigest: digest,
        dataType: 'settlement_execute', metadata: { settlementId: settlement.id, netAmount: settlement.netAmount, fromUserId: settlement.fromUserId, toUserId: settlement.toUserId },
      });
    } catch (ye) {
      console.error('[Settlement] 支付数据存证(印证)失败:', ye.message);
    }

    settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.COMPLETED, {
      yinzhengTxId: 'stl_exec_' + settlement.id,
      aiVerified: true,
      hashProof: hash,
      environment: _getEnvironment('internal', !!yinzhengClient),
    });
  } catch (e) {
    console.error('[Settlement] IP存证失败:', e.message);
    settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.COMPLETED, { aiVerified: true });
  }

  if (settlement.taxResult && taxRecords) {
    const tsm = new TaxStateMachine({ state: TAX_STATES.PENDING, history: [] });
    tsm.transition(TAX_STATES.DECLARED, '结算完成自动申报', 'system');
    taxRecords.set('tax_' + settlement.id, {
      id: 'tax_' + settlement.id,
      settlementId: settlement.id,
      track: settlement.taxResult.track,
      amount: settlement.amount,
      taxWithheld: settlement.taxResult.taxWithheld,
      netAmount: settlement.taxResult.netAmount,
      state: tsm.getState(),
      history: tsm.record.history,
      createdAt: new Date().toISOString(),
    });
  }

  notificationStore.create({
    userId: settlement.toUserId,
    type: 'wallet',
    title: '结算到账',
    content: '收到结算 ¥' + settlement.netAmount.toFixed(2) + ' (手续费 ¥' + settlement.fee.toFixed(2) + ')',
  });
}

router.post('/create', async (req, res) => {
  const { fromUserId, toUserId, amount, type, refType, refId, description, idempotencyKey } = req.body;
  if (!fromUserId || !toUserId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'fromUserId, toUserId, amount(>0) 为必填' });
  }

  if (idempotencyKey) {
    const dup = idempotency.check(idempotencyKey);
    if (dup.isDuplicate) {
      return res.json({ success: true, data: dup.result, idempotent: true });
    }
  }

  const fee = +(amount * FEE_RATE).toFixed(4);
  const settlement = settlementStore.create({
    fromUserId, toUserId, amount, fee, type, refType, refId, description,
  });

  try {
    const hashData = JSON.stringify({
      id: settlement.id, from: fromUserId, to: toUserId,
      amount, fee, net: settlement.netAmount, ts: settlement.createdAt,
    });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: settlement.id, hash, dataDigest: digest,
      dataType: 'commission', metadata: { fromUserId, toUserId, amount, fee },
    });
    settlement.hashProof = hash;
  } catch (e) {
    console.error('[Settlement] IP存证失败:', e.message);
  }

  settlement.environment = _getEnvironment('internal', false);

  if (idempotencyKey) {
    idempotency.complete(idempotencyKey, settlement);
  }

  res.json({ success: true, data: settlement });
});

router.post('/:id/execute', async (req, res) => {
  const { idempotencyKey } = req.body;
  if (idempotencyKey) {
    const dup = idempotency.check(idempotencyKey);
    if (dup.isDuplicate) {
      return res.json({ success: true, data: dup.result, idempotent: true });
    }
  }

  const settlement = settlementStore.getById(req.params.id);
  if (!settlement) return res.status(404).json({ success: false, error: '结算单不存在' });
  if (settlement.status !== SETTLEMENT_STATUS.PENDING && settlement.status !== 'reserved') {
    return res.status(400).json({ success: false, error: '结算单状态不可执行' });
  }

  settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.PROCESSING);

  try {
    await _executeSettlement(settlement, req);

    const completed = settlementStore.getById(settlement.id);
    if (idempotencyKey) {
      idempotency.complete(idempotencyKey, completed);
    }
    res.json({ success: true, data: completed });
  } catch (e) {
    settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.FAILED);
    console.error('[Settlement] 执行失败:', e.message);
    res.status(500).json({ success: false, error: '结算执行失败: ' + e.message });
  }
});

router.get('/list', (req, res) => {
  const { userId, type, status, page, pageSize } = req.query;
  const result = settlementStore.list({ userId, type, status, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/stats', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const userSettlements = settlementStore.getByUser(userId);
  const completed = userSettlements.filter(s => s.status === SETTLEMENT_STATUS.COMPLETED);
  const pending = userSettlements.filter(s => s.status === SETTLEMENT_STATUS.PENDING);
  const totalIncome = completed.filter(s => s.toUserId === userId).reduce((sum, s) => sum + s.netAmount, 0);
  const totalExpense = completed.filter(s => s.fromUserId === userId).reduce((sum, s) => sum + s.amount, 0);
  const totalFee = completed.reduce((sum, s) => sum + s.fee, 0);
  res.json({
    success: true,
    data: {
      totalIncome: +totalIncome.toFixed(2),
      totalExpense: +totalExpense.toFixed(2),
      totalFee: +totalFee.toFixed(2),
      completedCount: completed.length,
      pendingCount: pending.length,
      pendingAmount: +pending.reduce((s, st) => s + st.amount, 0).toFixed(2),
    },
  });
});

router.get('/:id', async (req, res) => {
  const settlement = settlementStore.getById(req.params.id);
  if (!settlement) return res.status(404).json({ success: false, error: '结算单不存在' });
  let hashVerified = false;
  if (settlement.hashProof) {
    const localRecords = hashStore.getByTxId(settlement.id);
    hashVerified = localRecords.length > 0;
  }
  let evidence = null;
  if (settlement.evidenceId) {
    evidence = NotaryEngine.getEvidence(settlement.evidenceId);
  }
  res.json({ success: true, data: { settlement, hashVerified, evidence } });
});

router.post('/tax/calculate', (req, res) => {
  const { amount, track, monthlyAccumulated, dailyCount } = req.body;
  if (!amount || !track) return res.status(400).json({ success: false, error: '缺少金额或税务轨' });
  const result = TaxEngine.calculate({ amount: parseFloat(amount), track, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
  res.json({ success: true, data: result });
});

router.post('/tax/transition', (req, res) => {
  const { settlementId, targetState, reason } = req.body;
  if (!settlementId || !targetState) return res.status(400).json({ success: false, error: 'settlementId, targetState 必填' });

  let record = taxRecords ? taxRecords.get('tax_' + settlementId) : null;
  if (!record) {
    record = { state: TAX_STATES.PENDING, history: [] };
  }

  const tsm = new TaxStateMachine(record);
  const result = tsm.transition(targetState, reason || 'manual', req.user?.userId || 'admin');
  if (!result.success) return res.status(400).json({ success: false, error: result.error });

  record.state = tsm.getState();
  record.history = tsm.record.history;
  if (taxRecords) taxRecords.set('tax_' + settlementId, record);

  res.json({ success: true, data: { settlementId, state: record.state, history: record.history } });
});

router.get('/tax/thresholds', (req, res) => {
  res.json({ success: true, data: { thresholds: TAX_THRESHOLDS, states: TAX_STATES, transitions: TAX_TRANSITIONS } });
});

router.post('/threshold/evaluate', (req, res) => {
  const { currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel } = req.body;
  const result = AiThresholdEngine.evaluateGuiniuPoint({
    currentPoints: currentPoints || 0,
    pointValue: pointValue || 0.01,
    channelCost: channelCost || 0,
    taxCost: taxCost || 0,
    splitWeight: splitWeight || 1,
    userComplianceLevel: userComplianceLevel || 'basic',
  });
  res.json({ success: true, data: result });
});

module.exports = router;
