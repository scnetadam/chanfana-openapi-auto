const express = require('express');
const router = express.Router();
const yinzhengClient = require('../yinzhengClient');

router.post('/apply', async (req, res) => {
  const { userId, companyName, creditCode, legalPerson, contactName, contactPhone, industry, scale } = req.body;
  if (!userId || !companyName) {
    return res.status(400).json({ success: false, error: 'userId 和 companyName 为必填' });
  }
  const result = await yinzhengClient.applyBizCert(userId, { companyName, creditCode, legalPerson, contactName, contactPhone, industry, scale });
  res.json(result);
});

router.get('/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const result = await yinzhengClient.getBizStatus(userId);
  res.json(result);
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: null });
  const result = await yinzhengClient.searchBiz(q);
  res.json(result);
});

module.exports = router;
