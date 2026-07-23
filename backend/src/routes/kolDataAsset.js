/**
 * 龟钮·印证 — KOL 权重指纹入表 API 路由
 *
 * 路由：
 *   POST /api/kol-asset/create              — 创建 KOL 数据资产
 *   GET  /api/kol-asset/list                — 资产列表
 *   POST /api/kol-asset/detail              — 资产详情
 *   POST /api/kol-asset/calculate-value     — 计算资产价值（明细）
 *   POST /api/kol-asset/financial-report    — KOL 财务报表
 *   GET  /api/kol-asset/financial-reports   — 全部财务报表汇总
 *   GET  /api/kol-asset/status              — 服务状态
 */

const express = require('express');
const router = express.Router();
const { KolDataAssetService } = require('../protocols/kolDataAsset');
const { kolDataAsset } = require('../models/dataStore');

let assetService = null;

function _getService() {
  if (!assetService) assetService = new KolDataAssetService(kolDataAsset);
  return assetService;
}

// 服务状态
router.get('/status', (req, res) => {
  try {
    const svc = _getService();
    const reports = svc.getAllFinancialReports();
    const totalValue = reports.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    res.json({ success: true, data: { service: 'KOL 权重指纹入表', version: '0.1.0', totalKol: reports.length, totalValue } });
  } catch (err) {
    console.error('[kolDataAsset] status错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 创建资产
router.post('/create', async (req, res) => {
  try {
    const { kolId, kolName, weightScore, contentMetrics } = req.body;
    if (!kolId || !kolName || weightScore === undefined) return res.status(400).json({ success: false, error: 'kolId/kolName/weightScore 必填' });
    const svc = _getService();
    const result = await svc.createAsset(kolId, kolName, weightScore, contentMetrics || {});
    res.json({ success: true, data: result });
  } catch (err) { console.error('[kolDataAsset] create错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

// 列表
router.get('/list', (req, res) => {
  try {
    const svc = _getService();
    const assets = svc.listAssets(req.query.kolId || null);
    res.json({ success: true, data: assets, total: assets.length });
  } catch (err) {
    console.error('[kolDataAsset] list错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 详情
router.post('/detail', (req, res) => {
  try {
    const { assetId } = req.body;
    if (!assetId) return res.status(400).json({ success: false, error: 'assetId 必填' });
    const svc = _getService();
    const asset = svc.getAsset(assetId);
    if (!asset) return res.status(404).json({ success: false, error: '资产不存在' });
    res.json({ success: true, data: asset });
  } catch (err) {
    console.error('[kolDataAsset] detail错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 计算价值明细
router.post('/calculate-value', (req, res) => {
  try {
    const { assetId } = req.body;
    if (!assetId) return res.status(400).json({ success: false, error: 'assetId 必填' });
    const svc = _getService();
    const result = svc.calculateAssetValue(assetId);
    res.json({ success: true, data: result });
  } catch (err) { console.error('[kolDataAsset] calculate-value错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

// 财务报表
router.post('/financial-report', (req, res) => {
  try {
    const { kolId } = req.body;
    if (!kolId) return res.status(400).json({ success: false, error: 'kolId 必填' });
    const svc = _getService();
    const report = svc.getFinancialReport(kolId);
    if (!report) return res.status(404).json({ success: false, error: '该 KOL 无资产数据' });
    res.json({ success: true, data: report });
  } catch (err) { console.error('[kolDataAsset] financial-report错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

// 全部报表
router.get('/financial-reports', (req, res) => {
  try {
    const svc = _getService();
    const reports = svc.getAllFinancialReports();
    res.json({ success: true, data: reports, total: reports.length });
  } catch (err) {
    console.error('[kolDataAsset] financial-reports错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;