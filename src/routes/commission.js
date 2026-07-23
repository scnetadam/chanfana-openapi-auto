const express = require('express');
const router = express.Router();
const { commissionRecordStore, walletStore } = require('../models/dataStore');
const { calculateThreeWaySplit, THREE_WAY_SPLIT } = require('../commissionEngine');

router.get('/list', (req, res) => {
  const { userId, taskId, page, pageSize } = req.query;
  const result = commissionRecordStore.list({ userId, taskId, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/stats', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const stats = commissionRecordStore.getStats(userId);
  const wallet = walletStore.get(userId);
  res.json({
    success: true,
    data: {
      ...stats,
      walletBalance: wallet?.promotionBalance || 0,
      reputationScore: wallet?.reputationScore || 0,
    },
  });
});

router.post('/three-way-split', (req, res) => {
  const { totalReward, kolRate, kocRate, platformRate, isKol, chainDepth } = req.body;
  if (!totalReward || totalReward <= 0) {
    return res.status(400).json({ success: false, error: 'totalReward必须大于0' });
  }
  const split = calculateThreeWaySplit(totalReward, { kolRate, kocRate, platformRate, isKol, chainDepth });
  res.json({ success: true, data: split });
});

router.get('/split-rates', (req, res) => {
  res.json({ success: true, data: THREE_WAY_SPLIT });
});

module.exports = router;
