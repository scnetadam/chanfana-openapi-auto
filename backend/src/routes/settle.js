const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
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
} = require('../engine/settle.engine');

const { settleOrders, splitRules: splitRulesStore, settleNotaryRecords, umbrellaAccounts, umbrellaRules, umbrellaLogs } = require('../models/dataStore');

let alipayBackend = null;
let wechatPayBackend = null;
let ecnyBackend = null;

function _loadBackends() {
  if (!alipayBackend) {
    try {
      const { AlipayBackend } = require('../paymentBackends/alipay');
      const keyPath = path.join(__dirname, '..', '..', 'keys', 'alipay-private.pem');
      const pubPath = path.join(__dirname, '..', '..', 'keys', 'alipay-public.pem');
      if (fs.existsSync(keyPath) && fs.existsSync(pubPath)) {
        alipayBackend = new AlipayBackend({
          appId: process.env.ALIPAY_APP_ID,
          appPrivateKeyPath: keyPath,
          alipayPublicKeyPath: pubPath,
          gatewayUrl: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
          notifyUrl: process.env.ALIPAY_NOTIFY_URL,
          returnUrl: process.env.ALIPAY_RETURN_URL,
        });
        console.log('[Settle] 支付宝沙箱后端已加载');
      }
    } catch (e) {
      console.log('[Settle] 支付宝沙箱后端未配置:', e.message);
    }
  }
  if (!wechatPayBackend) {
    try {
      const { WechatPayBackend } = require('../paymentBackends/wechat');
      if (process.env.WECHAT_MCH_ID && process.env.WECHAT_APP_ID && process.env.WECHAT_API_V3_KEY) {
        wechatPayBackend = new WechatPayBackend({
          appId: process.env.WECHAT_APP_ID, mchId: process.env.WECHAT_MCH_ID,
          apiV3Key: process.env.WECHAT_API_V3_KEY, notifyUrl: process.env.WECHAT_NOTIFY_URL,
        });
        console.log('[Settle] 微信支付后端已加载');
      }
    } catch (e) {
      console.log('[Settle] 微信支付后端未配置:', e.message);
    }
  }
  if (!ecnyBackend) {
    try {
      const { ECnyBackend } = require('../paymentBackends/ecny');
      if (process.env.ECNY_MCH_ID && process.env.ECNY_API_KEY) {
        ecnyBackend = new ECnyBackend({
          gatewayUrl: process.env.ECNY_GATEWAY || 'https://api.ccb.com/ecny/v1',
          mchId: process.env.ECNY_MCH_ID, appId: process.env.ECNY_APP_ID || process.env.ALIPAY_APP_ID,
          apiKey: process.env.ECNY_API_KEY, notifyUrl: process.env.ECNY_NOTIFY_URL,
        });
        console.log('[Settle] e-CNY 数字人民币后端已加载');
      }
    } catch (e) {
      console.log('[Settle] e-CNY 数字人民币后端未配置:', e.message);
    }
  }
}

router.post('/estimate', (req, res) => {
  const { totalAmount, ruleId, splits: customSplits, kolTrack, monthlyAccumulated, dailyCount } = req.body;
  let splitResult = [];
  const amount = parseFloat(totalAmount) || 0;
  if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
    const totalW = customSplits.reduce((s, x) => s + (x.weight || 0), 0);
    splitResult = new SplitContract({ splits: customSplits, totalWeight: totalW }).calculate(amount);
  } else if (ruleId && splitRulesStore.get(ruleId)) {
    splitResult = splitRulesStore.get(ruleId).calculate(amount);
  }
  let taxResult = null;
  if (kolTrack && amount > 0) {
    taxResult = TaxEngine.calculate({ amount, track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
  }
  const channelRecommendation = ChannelCapability.recommend({ amount, needSplit: splitResult.length > 0, needUmbrella: false, userKycLevel: 'basic', preferLowCost: true });
  res.json({ success: true, data: { splits: splitResult, taxEstimate: taxResult, channelRecommendation } });
});

router.post('/rule', (req, res) => {
  const { ruleId, name, splits, conditions } = req.body;
  if (!name || !splits || !Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ success: false, error: '请填写分账规则名称和分账列表' });
  }
  const totalWeight = splits.reduce((s, x) => s + (x.weight || 0), 0);
  const contract = new SplitContract({ ruleId: ruleId || _genId(), name, totalWeight, splits, conditions: conditions || {} });
  splitRulesStore.set(contract.ruleId, contract);
  res.json({ success: true, data: { ruleId: contract.ruleId, name: contract.name, splits: contract.splits, totalWeight: contract.totalWeight, enabled: contract.enabled } });
});

router.get('/rules', (req, res) => {
  res.json({ success: true, data: splitRulesStore.getAll().map(r => ({ ruleId: r.ruleId, name: r.name, splits: r.splits, totalWeight: r.totalWeight, enabled: r.enabled, createdAt: r.createdAt })) });
});

router.delete('/rule', (req, res) => {
  const { ruleId } = req.query;
  if (!ruleId) return res.status(400).json({ success: false, error: 'ruleId required' });
  const deleted = splitRulesStore.delete(ruleId);
  res.json({ success: deleted, message: deleted ? '已删除' : '未找到' });
});

router.post('/tax/calculate', (req, res) => {
  const { amount, track, monthlyAccumulated, dailyCount } = req.body;
  if (!amount || !track) return res.status(400).json({ success: false, error: '缺少金额或税轨道' });
  const result = TaxEngine.calculate({ amount: parseFloat(amount), track, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
  res.json({ success: true, data: result });
});

router.post('/tax/batch', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, error: '需要items数组' });
  const results = items.map(function(item) {
    const result = TaxEngine.calculate({ amount: parseFloat(item.amount || item.monthlyAccumulated || 0), track: item.track || 'B', monthlyAccumulated: parseFloat(item.monthlyAccumulated || 0), dailyCount: parseInt(item.dailyCount || 0) });
    const taxable = Math.max(0, item.monthlyAccumulated - 800);
    const taxW = parseFloat((taxable * 0.2).toFixed(2));
    return { userId: item.userId, monthlyTotal: item.monthlyAccumulated, taxWithheld: taxW, netAmount: item.amount - taxW, needInvoice: true, detail: '月底汇总: 月累' + item.monthlyAccumulated.toFixed(2) + '元，应税' + taxable.toFixed(2) + '元×0.2=' + taxW.toFixed(2) + '元' };
  });
  res.json({ success: true, data: results });
});

router.get('/tax/thresholds', (req, res) => {
  res.json({ success: true, data: TaxEngine.THRESHOLDS });
});

router.post('/tax/record', (req, res) => {
  const { userId, amount, track, taxWithheld, netAmount, orderId } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId, amount 必填' });
  const record = TaxStateMachine.createRecord({ userId, amount: parseFloat(amount), track: track || 'B', taxWithheld: taxWithheld || 0, netAmount: netAmount || amount, orderId });
  res.json({ success: true, data: record });
});

router.post('/tax/transition', (req, res) => {
  const { recordId, newState, params } = req.body;
  if (!recordId || !newState) return res.status(400).json({ success: false, error: 'recordId, newState 必填' });
  const result = TaxStateMachine.transition(recordId, newState, params || {});
  res.json(result);
});

router.get('/tax/compliance', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  res.json({ success: true, data: TaxStateMachine.getUserComplianceWeight(userId) });
});

router.post('/tax/verify-external', (req, res) => {
  const { userId, source, ref, declarationId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  const result = TaxStateMachine.verifyFromExternal(userId, { source, ref, declarationId });
  res.json({ success: true, data: result });
});

router.post('/prepare', async (req, res) => {
  try {
    _loadBackends();
    const { channel = 'alipay', totalAmount, subject, payerId, payeeId, splits: customSplits, ruleId, agentId, payMode, kolTrack, monthlyAccumulated, dailyCount } = req.body;
    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '无效金额' });
    if (!subject) return res.status(400).json({ success: false, error: '请填写订单标题' });

    let splitResult = [];
    if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
      const totalW = customSplits.reduce((s, x) => s + (x.weight || 0), 0);
      splitResult = new SplitContract({ splits: customSplits, totalWeight: totalW }).calculate(amount);
    } else if (ruleId && splitRulesStore.get(ruleId)) {
      splitResult = splitRulesStore.get(ruleId).calculate(amount);
    }

    let taxResult = null;
    if (kolTrack) taxResult = TaxEngine.calculate({ amount, track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });

    const orderId = _genId();
    const order = { id: orderId, channel, amount, subject, payerId: payerId || agentId || 'anonymous', payeeId, splits: splitResult, agentId: agentId || null, status: 'prepared', createdAt: new Date().toISOString() };
    const hash = _hash(order);
    order.hash = hash;

    const evidenceRecord = NotaryEngine.createEvidence({ orderId, amount, channel, payerId: order.payerId, payeeId, subject, splits: splitResult, taxResult, hash, notaryProvider: channel === 'ecny' ? 'ecny_trail' : 'self' });
    order.evidenceId = evidenceRecord.evidenceId;

    const walletCheck = await L1BalanceProbe.checkAndReserve({ userId: order.payerId, amount, channel, orderId, strategy: 'preauth_probe' });
    const channelProfile = ChannelCapability.getProfile(channel);
    const thresholdEval = AiThresholdEngine.processMicroPayment({ amount, userId: order.payerId, channel, kolTrack });
    const guiniuEval = AiThresholdEngine.evaluateGuiniuPoint({
      currentPoints: amount / 0.01, pointValue: 0.01,
      channelCost: channelProfile.costPerTx, taxCost: taxResult?.taxWithheld || 0,
      splitWeight: splitResult.length || 1, userComplianceLevel: 'basic',
    });

    order.walletCheck = walletCheck;
    order.thresholdEval = thresholdEval;
    order.guiniuEval = guiniuEval;
    settleOrders.set(orderId, order);

    res.json({ success: true, data: {
      paymentId: orderId, channel, totalAmount: amount, subject, payerId: order.payerId, payeeId,
      splits: splitResult, taxResult, walletCheck, channelProfile, thresholdEval, guiniuEval,
      evidence: { evidenceId: evidenceRecord.evidenceId, digest: evidenceRecord.digest, status: evidenceRecord.status, timestamp: evidenceRecord.timestamp },
      hash, status: order.status, nextStep: 'confirm', confirmUrl: '/api/settle/confirm',
      createdAt: order.createdAt,
    } });
  } catch (err) {
    console.error('[Settle Prepare Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    _loadBackends();
    const { paymentId, firstConsent, secondConsent, consentMethod, channel, payMode } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId 必填' });
    if (!firstConsent) return res.status(400).json({ success: false, error: '第一次用户确认（龟钮奖励权益点归集同意）未通过' });

    const order = settleOrders.get(paymentId);
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' });
    if (order.status !== 'prepared') return res.status(400).json({ success: false, error: `订单状态不允许确认: ${order.status}` });

    const firstGate = DualConsentGate.requireFirstConsent(order.evidenceId, { granted: true, method: consentMethod || 'api', userAgent: req.headers['user-agent'], ip: req.ip });
    if (!firstGate.passed) return res.status(400).json({ success: false, error: firstGate.error });

    const ch = channel || order.channel;
    const reserveResult = await L1BalanceProbe.executePreauth(order.payerId, order.amount, paymentId, ch);
    if (!reserveResult.reserved) {
      order.status = 'reserve_failed';
      settleOrders.set(paymentId, order);
      return res.json({ success: false, error: '预扣失败: ' + reserveResult.reason, paymentId });
    }

    if (!secondConsent) {
      return res.json({ success: true, data: {
        paymentId, status: 'reserved', reserve: reserveResult,
        message: '预扣已锁定，等待第二次确认（真钱L1兑付+存证HASH确认）',
        nextStep: 'execute', executeUrl: '/api/settle/execute',
      } });
    }

    const secondGate = DualConsentGate.requireSecondConsent(order.evidenceId, { granted: true, method: consentMethod || 'api', authMethod: req.body.authMethod || 'face_recognition', userAgent: req.headers['user-agent'], ip: req.ip });
    if (!secondGate.passed) return res.status(400).json({ success: false, error: secondGate.error });

    order.status = 'confirmed';
    order.confirmedAt = new Date().toISOString();
    settleOrders.set(paymentId, order);

    let paymentInstruction;
    const mode = payMode || 'page';
    switch (ch) {
      case 'wechat': {
        if (wechatPayBackend) {
          paymentInstruction = await wechatPayBackend.createJsapiPay(order.amount.toFixed(2), order.subject, req.body.openid || 'simulate_openid');
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'wechat', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'ecny': {
        if (ecnyBackend) {
          const ecnyResult = await ecnyBackend.createTradeQrcode(order.amount, order.subject, req.body.payeeWallet || '');
          paymentInstruction = { channel: 'ecny', outTradeNo: ecnyResult.tradeNo, qrCode: ecnyResult.qrCode, payUrl: ecnyResult.payUrl, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'qrcode', environment: 'live' };
        } else {
          paymentInstruction = { channel: 'ecny', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'alipay':
      default: {
        if (alipayBackend) {
          switch (mode) {
            case 'qrcode': paymentInstruction = await alipayBackend.createTradePrecreate(order.amount.toFixed(2), order.subject); break;
            case 'app': paymentInstruction = await alipayBackend.createTradeAppPay(order.amount.toFixed(2), order.subject); break;
            default: paymentInstruction = await alipayBackend.createTradePagePay(order.amount.toFixed(2), order.subject);
          }
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'alipay', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
      }
    }

    const collectResult = FourFlowCollector.collect({
      orderFlow: { orderId: paymentId, payerId: order.payerId, payeeId: order.payeeId, subject: order.subject, status: 'confirmed' },
      fundFlow: { amount: order.amount, channel: ch, splits: order.splits, status: 'confirmed' },
      taxFlow: order.taxResult || { status: 'pending' },
      notaryFlow: { provider: 'self', evidenceId: order.evidenceId, status: 'sealed' },
    });

    order.status = 'executing';
    order.paymentInstruction = paymentInstruction;
    settleOrders.set(paymentId, order);

    res.json({ success: true, data: {
      paymentId, channel: ch, totalAmount: order.amount, subject: order.subject,
      payerId: order.payerId, payeeId: order.payeeId, paymentInstruction,
      splits: order.splits, taxResult: order.taxResult,
      evidence: { evidenceId: order.evidenceId, confirmations: { firstConsent: true, secondConsent: true }, status: 'sealed' },
      collectionId: collectResult.collectionId, reserve: reserveResult, status: order.status,
    } });
  } catch (err) {
    console.error('[Settle Confirm Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId 必填' });
    const order = settleOrders.get(paymentId);
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' });
    if (order.status !== 'reserved' && order.status !== 'confirmed') return res.status(400).json({ success: false, error: `订单状态不允许执行: ${order.status}` });

    if (req.body.secondConsent) {
      DualConsentGate.requireSecondConsent(order.evidenceId, { granted: true, method: req.body.secondConsent.method || 'api', authMethod: req.body.authMethod || 'face_recognition', userAgent: req.headers['user-agent'], ip: req.ip });
    }

    const debitResult = WalletGuard.pessimisticDebit(order.payerId, order.amount, paymentId, order.channel);
    if (!debitResult.success) return res.json({ success: false, error: '扣款失败: ' + debitResult.error });

    if (order.splits && order.splits.length > 0) {
      order.splits.forEach(split => {
        if (split.partyId) WalletGuard.credit(split.partyId, split.amount, paymentId, 'split_receipt');
      });
    }
    if (order.payeeId) WalletGuard.credit(order.payeeId, order.amount, paymentId, 'receipt');

    NotaryEngine.updateStatus(order.evidenceId, 'sealed', { sealedAt: new Date().toISOString() });

    const collectResult = FourFlowCollector.collect({
      orderFlow: { orderId: paymentId, payerId: order.payerId, payeeId: order.payeeId, subject: order.subject, status: 'completed' },
      fundFlow: { amount: order.amount, channel: order.channel, splits: order.splits, status: 'completed' },
      taxFlow: order.taxResult || { status: 'pending' },
      notaryFlow: { provider: 'self', evidenceId: order.evidenceId, status: 'sealed' },
    });

    if (order.taxResult && order.taxResult.taxWithheld > 0) {
      TaxStateMachine.createRecord({ userId: order.payeeId, amount: order.amount, track: order.taxResult.track || 'B', taxWithheld: order.taxResult.taxWithheld, netAmount: order.taxResult.netAmount, orderId: paymentId });
    }

    order.status = 'completed';
    order.paidAt = new Date().toISOString();
    settleOrders.set(paymentId, order);

    const reconcile = WalletGuard.reconcile(order.payerId);

    res.json({ success: true, data: {
      paymentId, channel: order.channel, totalAmount: order.amount, subject: order.subject,
      payerId: order.payerId, payeeId: order.payeeId,
      splits: order.splits, taxResult: order.taxResult,
      evidence: { evidenceId: order.evidenceId, status: 'sealed', confirmations: { firstConsent: true, secondConsent: true } },
      collectionId: collectResult.collectionId, reconcile,
      status: order.status, paidAt: order.paidAt,
    } });
  } catch (err) {
    console.error('[Settle Execute Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/release', async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId 必填' });
    const order = settleOrders.get(paymentId);
    if (!order) return res.status(404).json({ success: false, error: '订单不存在' });
    const releaseResult = await L1BalanceProbe.releasePreauth(order.payerId, paymentId, reason || 'manual_release');
    order.status = 'released';
    order.releasedAt = new Date().toISOString();
    order.releaseReason = reason || 'manual_release';
    settleOrders.set(paymentId, order);
    NotaryEngine.updateStatus(order.evidenceId, 'voided', { voidedAt: new Date().toISOString(), voidReason: reason || 'manual_release' });
    res.json({ success: true, data: { paymentId, status: order.status, releaseResult } });
  } catch (err) {
    console.error('[Settle Release Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    _loadBackends();
    const { channel = 'alipay', totalAmount, subject, payerId, payeeId, splits: customSplits, ruleId, agentId, payMode, kolTrack, monthlyAccumulated, dailyCount } = req.body;
    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '无效金额' });
    if (!subject) return res.status(400).json({ success: false, error: '请填写订单标题' });

    let splitResult = [];
    if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
      const totalW = customSplits.reduce((s, x) => s + (x.weight || 0), 0);
      splitResult = new SplitContract({ splits: customSplits, totalWeight: totalW }).calculate(amount);
    } else if (ruleId && splitRulesStore.get(ruleId)) {
      splitResult = splitRulesStore.get(ruleId).calculate(amount);
    }

    let taxResult = null;
    if (kolTrack) taxResult = TaxEngine.calculate({ amount, track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });

    const orderId = _genId();
    const order = { id: orderId, channel, amount, subject, payerId: payerId || agentId || 'anonymous', payeeId, splits: splitResult, taxResult, agentId: agentId || null, status: 'pending', createdAt: new Date().toISOString() };
    const hash = _hash(order);
    order.hash = hash;

    const evidenceRecord = NotaryEngine.createEvidence({ orderId, amount, channel, payerId: order.payerId, payeeId, subject, splits: splitResult, taxResult, hash, notaryProvider: channel === 'ecny' ? 'ecny_trail' : 'self' });
    order.evidenceId = evidenceRecord.evidenceId;

    let paymentInstruction;
    switch (channel) {
      case 'wechat': {
        if (wechatPayBackend) {
          paymentInstruction = await wechatPayBackend.createJsapiPay(amount.toFixed(2), subject, req.body.openid || 'simulate_openid');
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'wechat', outTradeNo: orderId, totalAmount: amount.toFixed(2), subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'ecny': {
        if (ecnyBackend) {
          const ecnyResult = await ecnyBackend.createTradeQrcode(amount, subject, req.body.payeeWallet || '');
          paymentInstruction = { channel: 'ecny', outTradeNo: ecnyResult.tradeNo, qrCode: ecnyResult.qrCode, payUrl: ecnyResult.payUrl, totalAmount: amount.toFixed(2), subject, mode: 'qrcode', environment: 'live' };
        } else {
          paymentInstruction = { channel: 'ecny', outTradeNo: orderId, totalAmount: amount.toFixed(2), subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'alipay':
      default: {
        const mode = payMode || 'page';
        if (alipayBackend) {
          switch (mode) {
            case 'qrcode': paymentInstruction = await alipayBackend.createTradePrecreate(amount.toFixed(2), subject); break;
            case 'app': paymentInstruction = await alipayBackend.createTradeAppPay(amount.toFixed(2), subject); break;
            default: paymentInstruction = await alipayBackend.createTradePagePay(amount.toFixed(2), subject);
          }
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'alipay', outTradeNo: orderId, totalAmount: amount.toFixed(2), subject, mode: 'simulated', environment: 'simulated' };
        }
      }
    }

    if (splitResult.length > 0 && channel === 'ecny') {
      try {
        let umbrellaResult = null;
        try {
          const { UmbrellaSplitEngine, UmbrellaMatrix } = require('../protocols/umbrellaSplit');
          const localMatrix = new UmbrellaMatrix(umbrellaAccounts);
          const localEngine = new UmbrellaSplitEngine({ matrix: localMatrix, accountStore: umbrellaAccounts, ruleStore: umbrellaRules, logStore: umbrellaLogs });
          umbrellaResult = localEngine.execute({
            totalAmount: amount,
            sourceTradeNo: orderId,
            kol: req.body.kol ? { track: req.body.kol.track || 'B' } : null,
            monthlyAccumulated: req.body.monthlyAccumulated || 0,
            dailyCount: req.body.dailyCount || 0,
            customSplits: splitResult.map(s => ({ weight: s.weight, targetType: s.partyId, memo: s.memo })),
          });
        } catch (ue) {
          console.warn('[Settle] 本地伞列引擎未加载，尝试 e-CNY 后端:', ue.message);
          if (ecnyBackend) {
            umbrellaResult = await ecnyBackend.umbrellaSplit({
              parentTradeNo: paymentInstruction.outTradeNo || orderId,
              totalAmount: amount,
              splits: splitResult.map(s => ({ wallet: s.wallet, amount: s.amount, memo: s.memo || s.partyId })),
            });
          }
        }
        if (umbrellaResult) {
          order.umbrellaBatchNo = umbrellaResult.batchNo || '';
          order.umbrellaEntries = umbrellaResult.entries || [];
        }
      } catch (ue) {
        console.warn('[Settle] 伞列分账执行失败:', ue.message);
      }
    }

    settleOrders.set(orderId, order);

    res.json({ success: true, data: {
      paymentId: orderId, channel, totalAmount: amount, subject, payerId: order.payerId, payeeId,
      paymentInstruction, splits: splitResult, taxResult, hash,
      evidence: { evidenceId: evidenceRecord.evidenceId, digest: evidenceRecord.digest, status: evidenceRecord.status, timestamp: evidenceRecord.timestamp, fundFlowSnapshot: evidenceRecord.fundFlowSnapshot },
      status: order.status, createdAt: order.createdAt,
    } });
  } catch (err) {
    console.error('[Settle Checkout Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/channels', (req, res) => {
  _loadBackends();
  const channels = [];
  if (alipayBackend) channels.push({ id: 'alipay', name: '支付宝', modes: ['page', 'qrcode', 'app'], icon: 'alipay', description: '支付宝扫码/跳转支付' });
  if (wechatPayBackend) channels.push({ id: 'wechat', name: '微信支付', modes: ['jsapi'], icon: 'wechat', description: '微信小程序支付' });
  if (ecnyBackend) channels.push({ id: 'ecny', name: '数字人民币', modes: ['qrcode', 'page'], icon: 'ecny', description: 'e-CNY 数字人民币结算（建行）' });
  if (channels.length === 0) {
    channels.push({ id: 'alipay', name: '支付宝（模拟）', modes: ['page'], icon: 'alipay', description: '模拟模式' });
    channels.push({ id: 'wechat', name: '微信支付（模拟）', modes: ['jsapi'], icon: 'wechat', description: '模拟模式' });
    channels.push({ id: 'ecny', name: '数字人民币（模拟）', modes: ['qrcode'], icon: 'ecny', description: '模拟模式' });
  }
  res.json({ success: true, data: channels });
});

router.get('/channel/profile', (req, res) => {
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ success: false, error: 'channel required' });
  res.json({ success: true, data: ChannelCapability.getProfile(channel) });
});

router.post('/channel/recommend', (req, res) => {
  const { amount, needSplit, needUmbrella, userKycLevel, preferLowCost } = req.body;
  res.json({ success: true, data: ChannelCapability.recommend({ amount, needSplit, needUmbrella, userKycLevel, preferLowCost }) });
});

router.post('/wallet/check', async (req, res) => {
  const { userId, amount, channel, strategy } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId, amount 必填' });
  const result = await L1BalanceProbe.checkAndReserve({ userId, amount: parseFloat(amount), channel: channel || 'alipay', orderId: 'probe_check', strategy: strategy || 'standard' });
  res.json({ success: true, data: result });
});

router.post('/wallet/reserve', async (req, res) => {
  const { userId, amount, orderId, channel } = req.body;
  if (!userId || !amount || !orderId) return res.status(400).json({ success: false, error: 'userId, amount, orderId 必填' });
  const result = await L1BalanceProbe.executePreauth(userId, parseFloat(amount), orderId, channel || 'alipay');
  res.json({ success: true, data: result });
});

router.post('/wallet/release', async (req, res) => {
  const { userId, orderId, reason } = req.body;
  if (!userId || !orderId) return res.status(400).json({ success: false, error: 'userId, orderId 必填' });
  const result = await L1BalanceProbe.releasePreauth(userId, orderId, reason || 'manual');
  res.json({ success: true, data: result });
});

router.get('/wallet/reconcile', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  const result = WalletGuard.reconcile(userId);
  res.json({ success: true, data: result });
});

router.post('/threshold/evaluate', (req, res) => {
  const { currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel } = req.body;
  const result = AiThresholdEngine.evaluateGuiniuPoint({ currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel });
  res.json({ success: true, data: result });
});

router.post('/threshold/micro-payment', (req, res) => {
  const { amount, userId, channel, kolTrack } = req.body;
  if (!amount || !userId) return res.status(400).json({ success: false, error: 'amount, userId 必填' });
  const result = AiThresholdEngine.processMicroPayment({ amount: parseFloat(amount), userId, channel: channel || 'alipay', kolTrack });
  res.json({ success: true, data: result });
});

router.get('/collector/stats', (req, res) => {
  res.json({ success: true, data: CollectorAgent.stats() });
});

router.get('/collector/dead-letters', (req, res) => {
  res.json({ success: true, data: CollectorAgent.getDeadLetters() });
});

router.post('/collector/replay', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const result = CollectorAgent.replayDeadLetter(id);
  res.json({ success: result.success, data: result });
});

router.post('/notarize', (req, res) => {
  const evidence = NotaryEngine.createEvidence(req.body);
  res.json({ success: true, data: evidence });
});

router.get('/evidence/:id', (req, res) => {
  const record = NotaryEngine.getEvidence(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: '存证不存在' });
  res.json({ success: true, data: record });
});

router.get('/evidence', (req, res) => {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });
  res.json({ success: true, data: NotaryEngine.findByOrder(orderId) });
});

router.post('/evidence/verify', (req, res) => {
  const { evidenceId } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId required' });
  const result = NotaryEngine.verify(evidenceId);
  res.json({ success: true, data: { evidenceId, ...result } });
});

router.get('/evidence/stats', (req, res) => {
  res.json({ success: true, data: NotaryEngine.stats() });
});

router.post('/evidence/attach', (req, res) => {
  const { evidenceId, streamName, data } = req.body;
  if (!evidenceId || !streamName || !data) {
    return res.status(400).json({ success: false, error: 'evidenceId, streamName, data required' });
  }
  const record = settleNotaryRecords.get(evidenceId);
  if (!record) return res.status(404).json({ success: false, error: '存证不存在' });
  if (!record.extraStreams) record.extraStreams = {};
  record.extraStreams[streamName] = { data, attachedAt: new Date().toISOString() };
  record.updatedAt = new Date().toISOString();
  settleNotaryRecords.set(evidenceId, record);
  res.json({ success: true, data: record });
});

router.post('/evidence/consent', (req, res) => {
  const { evidenceId, consentType, consentData } = req.body;
  if (!evidenceId || !consentType) {
    return res.status(400).json({ success: false, error: 'evidenceId, consentType required' });
  }
  const record = settleNotaryRecords.get(evidenceId);
  if (!record) return res.status(404).json({ success: false, error: '存证不存在' });
  if (!record.confirmations) record.confirmations = {};
  record.confirmations[consentType] = {
    granted: true,
    grantedAt: new Date().toISOString(),
    method: (consentData || {}).method || 'api',
    userAgent: (consentData || {}).userAgent || null,
    ip: (consentData || {}).ip || null,
  };
  record.updatedAt = new Date().toISOString();
  settleNotaryRecords.set(evidenceId, record);
  res.json({ success: true, data: record });
});

router.get('/order/:id', (req, res) => {
  const order = settleOrders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: '订单不存在' });
  res.json({ success: true, data: order });
});

router.post('/notify', async (req, res) => {
  _loadBackends();
  const { channel } = req.query;
  const notification = req.body;
  console.log('[Settle Notify]', channel, JSON.stringify(notification).slice(0, 200));
  try {
    if (channel === 'ecny' && ecnyBackend) {
      const valid = await ecnyBackend.handleNotify(notification);
      if (valid) {
        const order = settleOrders.get(notification.outTradeNo);
        if (order) { order.status = 'completed'; order.paidAt = new Date().toISOString(); settleOrders.set(order.id, order); }
        return res.send('success');
      }
    } else if (channel === 'alipay' && alipayBackend) {
      const valid = await alipayBackend.handleNotify(notification);
      if (valid) {
        const order = settleOrders.get(notification.out_trade_no);
        if (order) { order.status = 'completed'; order.paidAt = new Date().toISOString(); settleOrders.set(order.id, order); }
        return res.send('success');
      }
    }
  } catch (e) {
    console.error('[Settle Notify Error]', e.message);
  }
  res.send('success');
});

router.post('/collect', (req, res) => {
  const result = FourFlowCollector.collect(req.body);
  res.json({ success: result.collected, data: result });
});

router.post('/consent/first', (req, res) => {
  const { evidenceId, consentData } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId 必填' });
  const result = DualConsentGate.requireFirstConsent(evidenceId, consentData || {});
  res.json({ success: result.passed, data: result });
});

router.post('/consent/second', (req, res) => {
  const { evidenceId, consentData } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId 必填' });
  const result = DualConsentGate.requireSecondConsent(evidenceId, consentData || {});
  res.json({ success: result.passed, data: result });
});

router.post('/supervisory/create', (req, res) => {
  const { userId, accountType, provider, bankAccount } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  const account = SupervisoryAccount.create({ userId, accountType, provider, bankAccount });
  res.json({ success: true, data: account });
});

router.get('/supervisory/account/:id', (req, res) => {
  const account = SupervisoryAccount.getAccount(req.params.id);
  if (!account) return res.status(404).json({ success: false, error: '监管账户不存在' });
  res.json({ success: true, data: account });
});

router.get('/supervisory/user/:userId', (req, res) => {
  res.json({ success: true, data: SupervisoryAccount.findByUser(req.params.userId) });
});

router.post('/supervisory/deposit', (req, res) => {
  const { accountId, amount, orderId } = req.body;
  if (!accountId || !amount) return res.status(400).json({ success: false, error: 'accountId, amount 必填' });
  const result = SupervisoryAccount.deposit(accountId, parseFloat(amount), orderId);
  res.json({ success: result.success, data: result });
});

router.post('/supervisory/freeze', (req, res) => {
  const { accountId, amount, reason } = req.body;
  if (!accountId || !amount) return res.status(400).json({ success: false, error: 'accountId, amount 必填' });
  const result = SupervisoryAccount.freezeAmount(accountId, parseFloat(amount), reason || 'risk_freeze');
  res.json({ success: result.success, data: result });
});

router.post('/supervisory/unfreeze', (req, res) => {
  const { accountId, amount, reason } = req.body;
  if (!accountId || !amount) return res.status(400).json({ success: false, error: 'accountId, amount 必填' });
  const result = SupervisoryAccount.unfreezeAmount(accountId, parseFloat(amount), reason || 'manual_unfreeze');
  res.json({ success: result.success, data: result });
});

router.post('/supervisory/judicial-freeze', (req, res) => {
  const { accountId, reason, courtRef } = req.body;
  if (!accountId) return res.status(400).json({ success: false, error: 'accountId 必填' });
  const result = SupervisoryAccount.judicialFreeze(accountId, reason || '司法冻结', courtRef);
  res.json({ success: result.success, data: result });
});

router.post('/supervisory/judicial-unfreeze', (req, res) => {
  const { accountId, reason, courtRef } = req.body;
  if (!accountId) return res.status(400).json({ success: false, error: 'accountId 必填' });
  const result = SupervisoryAccount.judicialUnfreeze(accountId, reason || '司法解冻', courtRef);
  res.json({ success: result.success, data: result });
});

router.post('/supervisory/emergency-collect', (req, res) => {
  const { accountId, amount, targetAccount, reason } = req.body;
  if (!accountId || !amount || !targetAccount) return res.status(400).json({ success: false, error: 'accountId, amount, targetAccount 必填' });
  const result = SupervisoryAccount.emergencyCollect(accountId, parseFloat(amount), targetAccount, reason || '风险预警特例归集');
  res.json({ success: result.success, data: result });
});

router.post('/risk/check', (req, res) => {
  const { userId, amount, channel, dailyCount, monthlyTotal, hasJudicialRecord, amlFlags, pepFlag } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  const result = RiskWatchdog.checkRisk(userId, { amount: parseFloat(amount || 0), channel, dailyCount: parseInt(dailyCount || 0), monthlyTotal: parseFloat(monthlyTotal || 0), hasJudicialRecord, amlFlags, pepFlag });
  res.json({ success: true, data: result });
});

router.get('/risk/alerts/:userId', (req, res) => {
  res.json({ success: true, data: RiskWatchdog.getAlerts(req.params.userId) });
});

router.get('/risk/alerts', (req, res) => {
  res.json({ success: true, data: RiskWatchdog.getAllAlerts() });
});

router.post('/budget/forecast', (req, res) => {
  const { currentBudget, dailySpendRate, daysRemaining, pendingOrders, projectedDataRevenue } = req.body;
  if (!currentBudget || !dailySpendRate) return res.status(400).json({ success: false, error: 'currentBudget, dailySpendRate 必填' });
  const result = BudgetForecastEngine.forecast({ currentBudget: parseFloat(currentBudget), dailySpendRate: parseFloat(dailySpendRate), daysRemaining: parseInt(daysRemaining || 30), pendingOrders, projectedDataRevenue: parseFloat(projectedDataRevenue || 0) });
  res.json({ success: true, data: result });
});

router.get('/budget/recommendation/:userId', (req, res) => {
  const result = BudgetForecastEngine.getBudgetRecommendation(req.params.userId);
  res.json({ success: true, data: result });
});

router.post('/budget/update', (req, res) => {
  const { userId, currentBudget, dailySpendRate, daysRemaining } = req.body;
  if (!userId || !currentBudget) return res.status(400).json({ success: false, error: 'userId, currentBudget 必填' });
  const result = BudgetForecastEngine.updateBudgetTracking(userId, { currentBudget: parseFloat(currentBudget), dailySpendRate: parseFloat(dailySpendRate || 0), daysRemaining: parseInt(daysRemaining || 30) });
  res.json({ success: true, data: result });
});

router.post('/clearance/check', (req, res) => {
  const result = DualClearanceCompliance.check(req.body);
  res.json({ success: result.passed, data: result });
});

router.post('/dirty-check', (req, res) => {
  const { wallets } = require('../models/dataStore');
  const result = DirtyWriteManager.checkAndRepair('wallets', wallets);
  res.json({ success: true, data: result });
});

router.post('/dirty-repair', (req, res) => {
  const { wallets } = require('../models/dataStore');
  const check = DirtyWriteManager.checkAndRepair('wallets', wallets);
  if (check.issueCount === 0) return res.json({ success: true, data: { message: '无脏数据', issues: [] } });
  const repair = DirtyWriteManager.autoRepair(wallets, check.issues);
  res.json({ success: true, data: repair });
});

router.post('/consent/first-secure', (req, res) => {
  const { evidenceId, consentData } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId 必填' });
  const result = ConsentAuthContainer.validateFirstConsent(evidenceId, consentData || {});
  res.json({ success: result.passed, data: result });
});

router.post('/consent/second-secure', (req, res) => {
  const { evidenceId, consentData } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId 必填' });
  const result = ConsentAuthContainer.validateSecondConsent(evidenceId, consentData || {});
  res.json({ success: result.passed, data: result });
});

router.post('/valuation/evaluate', (req, res) => {
  const result = EvidenceValuationEngine.evaluate(req.body);
  res.json({ success: true, data: result });
});

router.post('/valuation/test-pay', (req, res) => {
  const { evidenceId, metrics, channel } = req.body;
  if (!metrics) return res.status(400).json({ success: false, error: 'metrics 必填' });
  const valuationResult = EvidenceValuationEngine.evaluate(metrics);
  const testPayResult = EvidenceValuationEngine.testValuationPay(evidenceId || 'test', valuationResult, channel);
  res.json({ success: true, data: { valuation: valuationResult, testPay: testPayResult } });
});

router.get('/redis/stats', (req, res) => {
  res.json({ success: true, data: RedisSimulator.stats() });
});

router.post('/redis/set', (req, res) => {
  const { key, value, ttl } = req.body;
  RedisSimulator.set(key, value, ttl);
  res.json({ success: true });
});

router.get('/redis/get', (req, res) => {
  const { key } = req.query;
  res.json({ success: true, data: RedisSimulator.get(key) });
});

router.post('/batch/prepare', (req, res) => {
  try {
    const { items, channel = 'alipay', batchName } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items 数组必填' });
    }

    const batchId = 'batch_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
    const batch = {
      id: batchId,
      name: batchName || `批量结算_${new Date().toISOString().slice(0, 10)}`,
      channel,
      totalItems: items.length,
      items: [],
      totalAmount: 0,
      status: 'prepared',
      preparedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    let prepared = 0;
    let skipped = 0;
    const preparedItems = [];

    items.forEach(item => {
      const { payeeId, amount, subject, payerId, splits, ruleId, kolTrack, monthlyAccumulated, dailyCount } = item;
      const amt = parseFloat(amount);
      if (!payeeId || !amt || amt <= 0) { skipped++; return; }

      const orderId = _genId();
      let splitResult = [];
      if (splits && Array.isArray(splits) && splits.length > 0) {
        const totalW = splits.reduce((s, x) => s + (x.weight || 0), 0);
        splitResult = new SplitContract({ splits, totalWeight: totalW }).calculate(amt);
      } else if (ruleId && splitRulesStore.get(ruleId)) {
        splitResult = splitRulesStore.get(ruleId).calculate(amt);
      }

      let taxResult = null;
      if (kolTrack) taxResult = TaxEngine.calculate({ amount: amt, track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });

      const order = {
        id: orderId,
        channel,
        amount: amt,
        subject: subject || '批量结算',
        payerId: payerId || 'batch_payer',
        payeeId,
        splits: splitResult,
        taxResult,
        agentId: null,
        status: 'prepared',
        batchId,
        createdAt: new Date().toISOString(),
      };
      const hash = _hash(order);
      order.hash = hash;
      const evidenceRecord = NotaryEngine.createEvidence({ orderId, amount: amt, channel, payerId: order.payerId, payeeId, subject: order.subject, splits: splitResult, taxResult, hash, notaryProvider: 'self' });
      order.evidenceId = evidenceRecord.evidenceId;

      settleOrders.set(orderId, order);
      batch.items.push(orderId);
      batch.totalAmount += amt;
      prepared++;
      preparedItems.push({ orderId, payeeId, amount: amt, subject: order.subject, status: 'prepared' });
    });

    const { batchSettleJobs } = require('../models/dataStore');
    batch.prepared = prepared;
    batch.skipped = skipped;
    batch.totalAmount = parseFloat(batch.totalAmount.toFixed(2));
    batchSettleJobs.set(batchId, batch);

    res.json({ success: true, data: { batchId, totalItems: items.length, prepared, skipped, totalAmount: batch.totalAmount, items: preparedItems, status: 'prepared' } });
  } catch (err) {
    console.error('[Settle Batch Prepare Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/batch/execute', (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ success: false, error: 'batchId 必填' });

    const { batchSettleJobs } = require('../models/dataStore');
    const batch = batchSettleJobs.get(batchId);
    if (!batch) return res.status(404).json({ success: false, error: '批量任务不存在' });
    if (batch.status !== 'prepared') return res.status(400).json({ success: false, error: `批量任务状态不允许执行: ${batch.status}` });

    const results = { succeeded: 0, failed: 0, details: [] };

    batch.items.forEach(orderId => {
      try {
        const order = settleOrders.get(orderId);
        if (!order || order.status !== 'prepared') {
          results.failed++;
          results.details.push({ orderId, status: 'skipped', reason: '订单不存在或状态不允许' });
          return;
        }

        const debitResult = WalletGuard.pessimisticDebit(order.payerId, order.amount, orderId, order.channel);
        if (!debitResult.success) {
          order.status = 'debit_failed';
          settleOrders.set(orderId, order);
          results.failed++;
          results.details.push({ orderId, status: 'failed', reason: '扣款失败' });
          return;
        }

        if (order.splits && order.splits.length > 0) {
          order.splits.forEach(split => {
            if (split.partyId) WalletGuard.credit(split.partyId, split.amount, orderId, 'split_receipt');
          });
        }
        if (order.payeeId) WalletGuard.credit(order.payeeId, order.amount, orderId, 'receipt');

        NotaryEngine.updateStatus(order.evidenceId, 'sealed', { sealedAt: new Date().toISOString() });

        if (order.taxResult && order.taxResult.taxWithheld > 0) {
          TaxStateMachine.createRecord({ userId: order.payeeId, amount: order.amount, track: order.taxResult.track || 'B', taxWithheld: order.taxResult.taxWithheld, netAmount: order.taxResult.netAmount, orderId });
        }

        order.status = 'completed';
        order.paidAt = new Date().toISOString();
        settleOrders.set(orderId, order);
        results.succeeded++;
        results.details.push({ orderId, status: 'completed', amount: order.amount, payeeId: order.payeeId });
      } catch (e) {
        results.failed++;
        results.details.push({ orderId, status: 'error', reason: e.message });
      }
    });

    batch.status = 'completed';
    batch.executedAt = new Date().toISOString();
    batch.results = results;
    batchSettleJobs.set(batchId, batch);

    res.json({ success: true, data: { batchId, ...results, totalAmount: batch.totalAmount, executedAt: batch.executedAt } });
  } catch (err) {
    console.error('[Settle Batch Execute Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/batch/status/:batchId', (req, res) => {
  try {
    const { batchSettleJobs } = require('../models/dataStore');
    const batch = batchSettleJobs.get(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, error: '批量任务不存在' });
    res.json({ success: true, data: batch });
  } catch (e) {
    console.error('[Settle Batch Status Error]', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/batch/list', (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const { batchSettleJobs } = require('../models/dataStore');
    let list = batchSettleJobs.getAll();
    if (status) list = list.filter(b => b.status === status);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const paged = list.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[Settle Batch List Error]', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/reconcile/auto', (req, res) => {
  try {
    const { userId, period } = req.body;
    const { wallets, payments, settleOrders, reconciliationRecords } = require('../models/dataStore');

    const wallet = wallets.get(userId);
    if (!wallet) return res.status(404).json({ success: false, error: '钱包不存在' });

    const walletReconcile = WalletGuard.reconcile(userId);

    const userPayments = payments.getAll().filter(p => p.payerId === userId || p.payeeId === userId);
    const userSettles = settleOrders.getAll().filter(o => o.payerId === userId || o.payeeId === userId);

    const txCalcBalance = userPayments.filter(p => p.status === 'completed').reduce((s, p) => {
      if (p.payeeId === userId) return s + p.amount;
      return s - p.amount;
    }, 0) + userSettles.filter(o => o.status === 'completed').reduce((s, o) => {
      if (o.payeeId === userId) return s + (o.amount || 0);
      return s - (o.amount || 0);
    }, 0);

    const balanceMatch = Math.abs((wallet.balance || 0) - txCalcBalance) < 0.01;

    const anomalies = [];
    if (!walletReconcile.balanceMatch) anomalies.push({ type: 'balance_mismatch', bookBalance: wallet.balance, calculatedBalance: txCalcBalance, diff: wallet.balance - txCalcBalance });
    if (!walletReconcile.reservedMatch) anomalies.push({ type: 'reserved_mismatch', bookReserved: wallet.reservedAmount || 0, calculatedReserved: walletReconcile.calculatedReserved });

    const pendingPayments = userPayments.filter(p => p.status === 'pending');
    if (pendingPayments.length > 0) anomalies.push({ type: 'pending_payments', count: pendingPayments.length, totalAmount: pendingPayments.reduce((s, p) => s + p.amount, 0) });

    const prepareNoExecute = userSettles.filter(o => o.status === 'prepared' || o.status === 'reserved');
    if (prepareNoExecute.length > 0) anomalies.push({ type: 'stale_orders', count: prepareNoExecute.length, orderIds: prepareNoExecute.map(o => o.id) });

    const reconId = 'recon_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const reconRecord = {
      id: reconId,
      userId,
      period: period || new Date().toISOString().slice(0, 10),
      walletReconcile,
      transactionCalcBalance: txCalcBalance,
      balanceMatch,
      anomalyCount: anomalies.length,
      anomalies,
      paymentCount: userPayments.length,
      settleCount: userSettles.filter(o => o.status === 'completed').length,
      reconciledAt: new Date().toISOString(),
    };
    reconciliationRecords.set(reconId, reconRecord);

    if (anomalies.length > 0) {
      const { DirtyWriteManager } = require('../engine/settle.engine');
      const dirtyCheck = DirtyWriteManager.checkAndRepair('wallets', wallets);
      if (dirtyCheck.issueCount > 0) {
        DirtyWriteManager.autoRepair(wallets, dirtyCheck.issues);
        reconRecord.autoRepairApplied = true;
        reconRecord.repairedIssues = dirtyCheck.issues;
      }
    }

    res.json({ success: true, data: reconRecord });
  } catch (e) {
    console.error('[Settle Reconcile Auto Error]', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/reconcile/history/:userId', (req, res) => {
  try {
    const { reconciliationRecords } = require('../models/dataStore');
    const records = reconciliationRecords.find(r => r.userId === req.params.userId);
    records.sort((a, b) => new Date(b.reconciledAt) - new Date(a.reconciledAt));
    res.json({ success: true, data: { items: records, total: records.length } });
  } catch (e) {
    console.error('[Settle Reconcile History Error]', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/report/summary', (req, res) => {
  try {
    const { startDate, endDate, channel } = req.query;
    const { payments, settleOrders, taxRecords } = require('../models/dataStore');

    let allSettles = settleOrders.getAll().filter(o => o.status === 'completed');
    let allPays = payments.getAll().filter(p => p.status === 'completed');

    if (startDate) {
      allSettles = allSettles.filter(o => o.paidAt >= startDate);
      allPays = allPays.filter(p => p.updatedAt >= startDate);
    }
    if (endDate) {
      allSettles = allSettles.filter(o => o.paidAt <= endDate + 'T23:59:59.999Z');
      allPays = allPays.filter(p => p.updatedAt <= endDate + 'T23:59:59.999Z');
    }
    if (channel) {
      allSettles = allSettles.filter(o => o.channel === channel);
    }

    const totalSettleAmount = allSettles.reduce((s, o) => s + (o.amount || 0), 0);
    const totalPayAmount = allPays.reduce((s, p) => s + (p.amount || 0), 0);
    const combinedAmount = totalSettleAmount + totalPayAmount;

    const byChannel = {};
    allSettles.forEach(o => {
      if (!byChannel[o.channel]) byChannel[o.channel] = { count: 0, amount: 0 };
      byChannel[o.channel].count++;
      byChannel[o.channel].amount += o.amount || 0;
    });

    const byDay = {};
    allSettles.forEach(o => {
      const day = (o.paidAt || o.createdAt || '').slice(0, 10);
      if (!byDay[day]) byDay[day] = { count: 0, amount: 0 };
      byDay[day].count++;
      byDay[day].amount += o.amount || 0;
    });

    const topPayees = {};
    allSettles.forEach(o => {
      if (!topPayees[o.payeeId]) topPayees[o.payeeId] = { count: 0, amount: 0 };
      topPayees[o.payeeId].count++;
      topPayees[o.payeeId].amount += o.amount || 0;
    });

    const allTax = taxRecords.getAll();
    const totalTaxWithheld = allTax.reduce((s, r) => s + (r.taxWithheld || 0), 0);

    const avgSettleAmount = allSettles.length > 0 ? totalSettleAmount / allSettles.length : 0;

    res.json({
      success: true,
      data: {
        period: { startDate: startDate || 'all', endDate: endDate || 'all' },
        channel: channel || 'all',
        settleCount: allSettles.length,
        payCount: allPays.length,
        totalSettleAmount: parseFloat(totalSettleAmount.toFixed(2)),
        totalPayAmount: parseFloat(totalPayAmount.toFixed(2)),
        combinedAmount: parseFloat(combinedAmount.toFixed(2)),
        avgSettleAmount: parseFloat(avgSettleAmount.toFixed(2)),
        totalTaxWithheld: parseFloat(totalTaxWithheld.toFixed(2)),
        byChannel: Object.entries(byChannel).map(([ch, d]) => ({ channel: ch, ...d, amount: parseFloat(d.amount.toFixed(2)) })),
        byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, ...d, amount: parseFloat(d.amount.toFixed(2)) })),
        topPayees: Object.entries(topPayees).sort(([, a], [, b]) => b.amount - a.amount).slice(0, 10).map(([id, d]) => ({ payeeId: id, ...d, amount: parseFloat(d.amount.toFixed(2)) })),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('[Settle Report Summary Error]', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
