/**
 * 龟钮·印证 — CCIP 接驳 API 路由
 *
 * 路由：
 *   POST /api/ccip/map         — Hash → 广数交所产品编码映射
 *   POST /api/ccip/batch-map   — 批量映射
 *   POST /api/ccip/reverse     — 产品编码反查 Hash
 *   POST /api/ccip/detail      — 映射详情
 *   GET  /api/ccip/list        — 映射列表
 *   GET  /api/ccip/stats       — 统计
 *   GET  /api/ccip/messages    — CCIP 消息列表
 *   GET  /api/ccip/status      — 服务状态
 */

const express = require('express');
const router = express.Router();
const { CcipMappingService } = require('../protocols/ccipMapping');
const { ccipMappings, ccipMessages } = require('../models/dataStore');

let ccipService = null;

function _getService() {
  if (!ccipService) ccipService = new CcipMappingService(ccipMappings, ccipMessages);
  return ccipService;
}

// 服务状态
router.get('/status', (req, res) => {
  try {
    const svc = _getService();
    const stats = svc.getStats();
    res.json({ success: true, data: { service: 'CCIP 接驳', version: '0.1.0', mode: 'sandbox', ...stats } });
  } catch (err) {
    console.error('[ccipMapping] status错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// Hash → 产品编码映射
router.post('/map', async (req, res) => {
  try {
    const { hash, productInfo } = req.body;
    if (!hash) return res.status(400).json({ success: false, error: 'hash 必填' });
    const svc = _getService();
    const result = await svc.mapHashToGse(hash, productInfo || {});
    res.json({ success: true, data: result });
  } catch (err) { console.error('[ccipMapping] map错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

// 批量映射
router.post('/batch-map', async (req, res) => {
  try {
    const { hashes, productInfos } = req.body;
    if (!hashes || !Array.isArray(hashes) || hashes.length === 0) return res.status(400).json({ success: false, error: 'hashes 数组必填' });
    const svc = _getService();
    const result = await svc.batchMap(hashes, productInfos || {});
    res.json({ success: true, data: result });
  } catch (err) { console.error('[ccipMapping] batch-map错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

// 反查
router.post('/reverse', (req, res) => {
  try {
    const { gseProductCode } = req.body;
    if (!gseProductCode) return res.status(400).json({ success: false, error: 'gseProductCode 必填' });
    const svc = _getService();
    const mapping = svc.getHashByGseCode(gseProductCode);
    if (!mapping) return res.status(404).json({ success: false, error: '未找到映射' });
    res.json({ success: true, data: mapping });
  } catch (err) { console.error('[ccipMapping] reverse错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

// 详情
router.post('/detail', (req, res) => {
  try {
    const { mappingId } = req.body;
    if (!mappingId) return res.status(400).json({ success: false, error: 'mappingId 必填' });
    const svc = _getService();
    const mapping = svc.getMapping(mappingId);
    if (!mapping) return res.status(404).json({ success: false, error: '映射不存在' });
    res.json({ success: true, data: mapping });
  } catch (err) {
    console.error('[ccipMapping] detail错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 列表
router.get('/list', (req, res) => {
  try {
    const svc = _getService();
    const mappings = svc.listMappings(req.query.status || null);
    res.json({ success: true, data: mappings, total: mappings.length });
  } catch (err) {
    console.error('[ccipMapping] list错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 统计
router.get('/stats', (req, res) => {
  try {
    const svc = _getService();
    res.json({ success: true, data: svc.getStats() });
  } catch (err) {
    console.error('[ccipMapping] stats错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// CCIP 消息列表
router.get('/messages', (req, res) => {
  try {
    const svc = _getService();
    const msgs = svc.listCcipMessages();
    res.json({ success: true, data: msgs, total: msgs.length });
  } catch (err) {
    console.error('[ccipMapping] messages错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;