const express = require('express');
const router = express.Router();
const { complianceCheckStore, hashStore, ecnyFlowStore, invoiceStore, kolTrackStore, contractParamStore } = require('../models/dataStore');
const threeFlowEngine = require('../threeFlowEngine');

router.get('/dashboard', (req, res) => {
  const dashboard = threeFlowEngine.getComplianceDashboard();
  const trackDistribution = kolTrackStore.getDistribution();
  const params = contractParamStore.list();
  res.json({ success: true, data: { dashboard, trackDistribution, contractParams: params } });
});

router.get('/three-flows', (req, res) => {
  const { matchStatus, page, pageSize } = req.query;
  const result = complianceCheckStore.list({ matchStatus, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/three-flows/:checkId', (req, res) => {
  const check = complianceCheckStore.getByCheckId(req.params.checkId);
  if (!check) return res.status(404).json({ success: false, error: 'check not found' });
  res.json({ success: true, data: check });
});

router.post('/three-flows/verify', (req, res) => {
  const { bizRef } = req.body;
  if (!bizRef) return res.status(400).json({ success: false, error: 'bizRef required' });
  const result = threeFlowEngine.verifyThreeFlows(bizRef);
  res.json({ success: true, data: result });
});

router.get('/mismatches', (req, res) => {
  const dashboard = complianceCheckStore.getDashboard();
  res.json({ success: true, data: { recentMismatches: dashboard.recentMismatches, mismatchCount: dashboard.mismatched, mismatchRate: dashboard.mismatchRate } });
});

router.get('/trends', (req, res) => {
  const dashboard = threeFlowEngine.getComplianceDashboard();
  res.json({ success: true, data: dashboard.monthlyTrend });
});

module.exports = router;
