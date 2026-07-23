/**
 * 龟钮·印证 — 广数交所 Hash 锚路由 v3
 * Hash 指纹 → 广数交所产品编码一键映射
 * 流程：登记 → Hash生成 → 锚定 → 挂牌 → 交易 → 交割
 * 使用 GseHashAnchorService + FileStore 持久化
 */
const express = require('express');
const router = express.Router();
const { GseHashAnchorService } = require('../protocols/gseHashAnchor');
const { gseHashAnchor } = require('../models/dataStore');

let gseService = null;

function _getService() {
  if (!gseService) {
    gseService = new GseHashAnchorService({}, gseHashAnchor);
  }
  return gseService;
}

_getService();

router.post('/register', async (req, res) => {
  try {
    const { title, category, price, description, hash, provider, storageType, storageUri, metadata } = req.body;
    if (!title) return res.status(400).json({ success: false, error: '产品名称必填' });

    const svc = _getService();
    const result = await svc.registerProduct({
      title, category, price, description, hash, provider, storageType, storageUri, metadata,
    });
    res.json({ success: true, data: result.product });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/products', (req, res) => {
  const svc = _getService();
  const { status } = req.query;
  res.json({ success: true, data: svc.getAllProducts(status || null) });
});

router.get('/detail', (req, res) => {
  const { productId } = req.query;
  if (!productId) return res.status(400).json({ success: false, error: 'productId 必填' });
  const svc = _getService();
  const p = svc.getProduct(productId);
  if (!p) return res.status(404).json({ success: false, error: '产品不存在' });
  res.json({ success: true, data: p });
});

router.post('/list', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'productId 必填' });
    const svc = _getService();
    const result = await svc.listProduct(productId);
    res.json({ success: true, data: { productId, exchangeCode: result.gseProductCode, status: 'listed', message: `已挂牌上架，广数交所编码: ${result.gseProductCode}` } });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.post('/trade', async (req, res) => {
  try {
    const { productId, buyerId, amount } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'productId 必填' });
    const svc = _getService();
    const trade = await svc.trade(productId, buyerId, amount);
    res.json({ success: true, data: { productId, status: 'traded', tradeId: trade.id, message: '交易成功' } });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.post('/settle', async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'productId 必填' });
    const svc = _getService();
    const result = await svc.settle(productId);
    res.json({ success: true, data: { productId, status: 'settled', hashVerified: result.hashVerification.valid, message: '交割完成' } });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

router.get('/status', (req, res) => {
  const svc = _getService();
  const summary = svc.getStatusSummary();
  res.json({ success: true, data: { service: '广数交所 Hash 锚', version: '3.0.0', mode: 'sandbox', ...summary } });
});

module.exports = router;
