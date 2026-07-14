const express = require('express');
const router = express.Router();
const { notificationStore } = require('../models/dataStore');

/** 获取通知列表 */
router.get('/list', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }
  const list = notificationStore.getByUser(userId);
  res.json({ success: true, data: { list, total: list.length } });
});

/** 标记已读 */
router.post('/read', (req, res) => {
  const { userId, notificationId } = req.body;
  if (!userId || !notificationId) {
    return res.status(400).json({ success: false, error: 'userId and notificationId required' });
  }
  notificationStore.markRead(userId, notificationId);
  res.json({ success: true, data: { read: true } });
});

/** 标记全部已读 */
router.post('/read-all', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }
  notificationStore.markAllRead(userId);
  res.json({ success: true, data: { read: true } });
});

module.exports = router;
