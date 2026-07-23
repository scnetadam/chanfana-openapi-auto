/**
 * 龟钮·印证 — 双锚机制 API 路由
 *
 * 路由：
 *   POST /api/anchor/domestic       — 国内广数交所锚定
 *   POST /api/anchor/cross-border   — 跨境 HashKey 锚定
 *   POST /api/anchor/dual           — 双锚同时锚定
 *   GET  /api/anchor/:id            — 锚定记录查询
 *   GET  /api/anchor/list           — 锚定列表
 *   GET  /api/anchor/stats          — 统计
 *   GET  /api/anchor/status         — 服务状态
 */

const express = require('express');
const router = express.Router();
const { DualAnchorService } = require('../protocols/dualAnchor');
const { dualAnchors } = require('../models/dataStore');

let anchorService = null;

function _getService() {
  if (!anchorService) anchorService = new DualAnchorService(dualAnchors);
  return anchorService;
}

// 服务状态
router.get('/status', (req, res) => {
  const svc = _getService();
  const stats = svc.getStats();
  res.json({ success: true, data: { service: '双锚机制', version: '0.1.0', mode: 'sandbox', ...stats } });
});

// 国内锚定
router.post('/domestic', async (req, res) => {
  try {
    const { hash, productId } = req.body;
    if (!hash) return res.status(400).json({ success: false, error: 'hash 必填' });
    const svc = _getService();
    const result = await svc.anchorDomestic(hash, productId);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 跨境锚定
router.post('/cross-border', async (req, res) => {
  try {
    const { hash, productId } = req.body;
    if (!hash) return res.status(400).json({ success: false, error: 'hash 必填' });
    const svc = _getService();
    const result = await svc.anchorCrossBorder(hash, productId);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 双锚
router.post('/dual', async (req, res) => {
  try {
    const { hash, productId } = req.body;
    if (!hash) return res.status(400).json({ success: false, error: 'hash 必填' });
    const svc = _getService();
    const result = await svc.anchorDual(hash, productId);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 锚定查询
router.get('/:id', (req, res) => {
  const svc = _getService();
  const anchor = svc.getAnchor(req.params.id);
  if (!anchor) return res.status(404).json({ success: false, error: '锚定记录不存在' });
  res.json({ success: true, data: anchor });
});

// 列表
router.get('/list/all', (req, res) => {
  const svc = _getService();
  const anchors = svc.listAnchors();
  res.json({ success: true, data: anchors, total: anchors.length });
});

// 统计
router.get('/stats/all', (req, res) => {
  const svc = _getService();
  res.json({ success: true, data: svc.getStats() });
});

module.exports = router;