const express = require('express');
const router = express.Router();
const { activityStore } = require('../models/dataStore');

/** 获取活动列表（支持搜索+分页） */
router.get('/list', (req, res) => {
  const { brand, keyword, page, pageSize } = req.query;
  let list = activityStore.listAll();
  if (brand && brand !== '全部') {
    list = list.filter(a => a.brand === brand);
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    list = list.filter(a =>
      a.title.toLowerCase().includes(kw) ||
      a.model.toLowerCase().includes(kw) ||
      a.brand.toLowerCase().includes(kw) ||
      a.description.toLowerCase().includes(kw)
    );
  }
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  const start = (p - 1) * ps;
  res.json({
    success: true,
    data: {
      list: list.slice(start, start + ps),
      total: list.length,
      page: p,
      pageSize: ps,
    },
  });
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
