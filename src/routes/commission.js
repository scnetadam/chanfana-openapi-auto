const express = require('express');
const router = express.Router();
const { commissionRecordStore, walletStore } = require('../models/dataStore');

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

module.exports = router;
