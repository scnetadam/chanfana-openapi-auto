/**
 * 龟钮印信 — IP 数据存证路由
 *
 * 独立于龟钮印证的支付数据存证
 * 存证类型: kol_identity/kol_ip/content_publish/content_share/commission/opc_identity/booking_convert/biz_product
 */

const express = require('express');
const router = express.Router();
const hashEngine = require('../hashEngine');
const { hashStore } = require('../models/dataStore');

router.post('/create', (req, res) => {
  const { txId, data, dataType, metadata, nonce } = req.body;
  if (!txId || (!data && !req.body.hash)) {
    return res.status(400).json({ success: false, error: 'txId and data(或hash) 为必填' });
  }
  let hash, dataDigest;
  if (req.body.hash) {
    hash = req.body.hash;
    dataDigest = req.body.dataDigest || hash.slice(0, 16);
  } else {
    const result = hashEngine.digest(data, nonce || '');
    hash = result.hash;
    dataDigest = result.digest;
  }
  const record = hashStore.create({ txId, hash, dataDigest, dataType: dataType || 'kol_ip', metadata: metadata || {}, source: 'local' });
  res.json({ success: true, data: record });
});

router.get('/query', (req, res) => {
  const { txId, hash } = req.query;
  let records = [];
  if (txId) records = hashStore.getByTxId(txId);
  else if (hash) records = [hashStore.getByHash(hash)].filter(Boolean);
  if (records.length === 0) {
    return res.status(404).json({ success: false, error: '存证不存在' });
  }
  res.json({ success: true, data: records.length === 1 ? records[0] : records });
});

router.post('/verify', (req, res) => {
  const { data, hash, nonce } = req.body;
  if (!data || !hash) {
    return res.status(400).json({ success: false, error: 'data and hash 为必填' });
  }
  const valid = hashEngine.verify(data, hash, nonce || '');
  res.json({ success: true, data: { valid, hash } });
});

router.get('/list', (req, res) => {
  const { dataType, userId, page, pageSize } = req.query;
  const result = hashStore.list({ dataType, userId, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/stats', (req, res) => {
  const stats = hashStore.getStats();
  res.json({ success: true, data: stats });
});

module.exports = router;
