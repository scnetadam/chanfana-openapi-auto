const express = require('express');
const router = express.Router();
const { walletStore, userStore } = require('../models/dataStore');
const { notificationStore } = require('../models/dataStore');

/** 获取钱包余额 */
router.get('/balance', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }
  const wallet = walletStore.get(userId);
  if (!wallet) {
    return res.json({ success: true, data: { promotionBalance: 0, reputationScore: 0 } });
  }
  res.json({ success: true, data: wallet });
});

/** 交易流水 */
router.get('/transactions', (req, res) => {
  const { userId, page } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }
  const result = walletStore.getTransactions(userId, parseInt(page) || 1);
  res.json({ success: true, data: result });
});

/** 提现 */
router.post('/withdraw', (req, res) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'userId and positive amount required' });
    }
    const wallet = walletStore.get(userId);
    if (!wallet || wallet.promotionBalance < amount) {
      return res.status(400).json({ success: false, error: '余额不足' });
    }
    if (amount < 10) {
      return res.status(400).json({ success: false, error: '最低提现金额 ¥10.00' });
    }
    wallet.promotionBalance = +(wallet.promotionBalance - amount).toFixed(2);
    const { transactions } = require('../models/dataStore');
    transactions.push({
      id: 'tx_' + require('uuid').v4().slice(0, 8),
      userId,
      type: 'withdraw',
      amount: -amount,
      desc: `提现 ¥${amount.toFixed(2)} 到支付宝`,
      contentId: '',
      balance: wallet.promotionBalance,
      createdAt: new Date().toISOString(),
    });
    notificationStore.create({
      userId,
      type: 'wallet',
      title: '提现申请已提交',
      content: `您申请提现 ¥${amount.toFixed(2)}，预计 T+3 到账`,
    });
    res.json({ success: true, data: { balance: wallet.promotionBalance, withdrawn: amount } });
  } catch (err) {
    console.error('[Wallet Withdraw Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
