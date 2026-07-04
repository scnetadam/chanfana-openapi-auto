const express = require('express');
const router = express.Router();
const { walletStore, userStore } = require('../models/dataStore');

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

module.exports = router;
