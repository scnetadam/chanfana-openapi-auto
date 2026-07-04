const express = require('express');
const router = express.Router();
const { activityStore } = require('../models/dataStore');

/** 获取活动列表 */
router.get('/list', (req, res) => {
  const list = activityStore.list();
  res.json({ success: true, data: list });
});

/** 获取活动详情 */
router.get('/:id', (req, res) => {
  const activity = activityStore.getById(req.params.id);
  if (!activity) {
    return res.status(404).json({ success: false, error: '活动不存在' });
  }
  res.json({ success: true, data: activity });
});

module.exports = router;
