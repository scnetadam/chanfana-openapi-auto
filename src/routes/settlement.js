const express = require('express');
const router = express.Router();
const { walletStore, userStore, notificationStore, hashStore, SETTLEMENT_STATUS, settlementStore } = require('../models/dataStore');
const yinzhengClient = require('../yinzhengClient');
const hashEngine = require('../hashEngine');
const aiValueEngine = require('../aiValueEngine');

router.post('/create', async (req, res) => {
  const { fromUserId, toUserId, amount, type, refType, refId, description } = req.body;
  if (!fromUserId || !toUserId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'fromUserId, toUserId, amount(>0) 为必填' });
  }
  const FEE_RATE = 0.006;
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
  res.json({ success: true, data: settlement });
});

router.post('/:id/execute', async (req, res) => {
  const settlement = settlementStore.getById(req.params.id);
  if (!settlement) return res.status(404).json({ success: false, error: '结算单不存在' });
  if (settlement.status !== SETTLEMENT_STATUS.PENDING) {
    return res.status(400).json({ success: false, error: '结算单状态不可执行' });
  }
  settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.PROCESSING);
  try {
    let aiVerified = false;
    if (settlement.amount >= 100 && process.env.GLM_API_KEY) {
      try {
        const fromUser = userStore.getById(settlement.fromUserId);
        const toUser = userStore.getById(settlement.toUserId);
        const fromWallet = walletStore.get(settlement.fromUserId);
        const toWallet = walletStore.get(settlement.toUserId);
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
      return res.json({ success: false, data: settlement, error: 'AI风控验证未通过' });
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
      settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.COMPLETED, { yinzhengTxId: 'stl_exec_' + settlement.id, aiVerified: true, hashProof: hash });
    } catch (e) {
      console.error('[Settlement] IP存证失败:', e.message);
      settlementStore.updateStatus(settlement.id, SETTLEMENT_STATUS.COMPLETED, { aiVerified: true });
    }
    notificationStore.create({ userId: settlement.toUserId, type: 'wallet', title: '结算到账', content: '收到结算 ¥' + settlement.netAmount.toFixed(2) + ' (手续费 ¥' + settlement.fee.toFixed(2) + ')' });
    const completed = settlementStore.getById(settlement.id);
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
  res.json({ success: true, data: { settlement, hashVerified } });
});

module.exports = router;
