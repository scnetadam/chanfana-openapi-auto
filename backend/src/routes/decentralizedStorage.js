/**
 * 龟钮·印证 — 去中心化存储 API 路由
 *
 * 路由：
 *   POST /api/storage/upload       — 上传数据到 IPFS/Arweave
 *   POST /api/storage/get          — 获取已存储数据
 *   POST /api/storage/verify       — 数据完整性校验
 *   GET  /api/storage/list         — 所有存储记录
 *   GET  /api/storage/status       — 服务状态
 */

const express = require('express');
const router = express.Router();
const { DecentralizedStorageService } = require('../protocols/decentralizedStorage');

let storageService = null;

function _getService() {
  if (!storageService) storageService = new DecentralizedStorageService();
  return storageService;
}

// 服务状态
router.get('/status', (req, res) => {
  const svc = _getService();
  const records = svc.list();
  res.json({
    success: true,
    data: {
      service: '去中心化存储',
      version: '0.1.0',
      mode: 'sandbox',
      totalRecords: records.length,
      types: [...new Set(records.map(r => r.storageType))],
    },
  });
});

// 上传
router.post('/upload', (req, res) => {
  try {
    const { data, storageType } = req.body;
    if (!data) return res.status(400).json({ success: false, error: 'data 必填' });
    const svc = _getService();
    const result = svc.upload(data, storageType || 'ipfs');
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 获取
router.post('/get', (req, res) => {
  try {
    const { uri } = req.body;
    if (!uri) return res.status(400).json({ success: false, error: 'uri 必填' });
    const svc = _getService();
    const data = svc.get(uri);
    res.json({ success: true, data: { uri, content: data } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 校验
router.post('/verify', (req, res) => {
  try {
    const { uri, hash } = req.body;
    if (!uri || !hash) return res.status(400).json({ success: false, error: 'uri/hash 必填' });
    const svc = _getService();
    const result = svc.verify(uri, hash);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 列表
router.get('/list', (req, res) => {
  const svc = _getService();
  const records = svc.list();
  res.json({ success: true, data: records, total: records.length });
});

module.exports = router;