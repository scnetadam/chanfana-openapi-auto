const express = require('express');
const router = express.Router();
const jinshui4Simulator = require('../jinshui4Simulator');
const { taxReportStore } = require('../models/dataStore');

router.get('/report/:period', (req, res) => {
  const reports = taxReportStore.getByPeriod(req.params.period);
  res.json({ success: true, data: reports });
});

router.post('/report/generate', (req, res) => {
  const { period, track } = req.body;
  if (!period) return res.status(400).json({ success: false, error: 'period required' });
  const result = jinshui4Simulator.generateReport(period);
  res.json({ success: true, data: result });
});

router.get('/jinshui4/query', (req, res) => {
  const { creditCode, period } = req.query;
  if (!creditCode || !period) return res.status(400).json({ success: false, error: 'creditCode and period required' });
  const result = jinshui4Simulator.penetrationQuery(creditCode, period);
  res.json({ success: true, data: result });
});

router.post('/submit/:reportId', (req, res) => {
  const result = jinshui4Simulator.submitReport(req.params.reportId);
  if (!result) return res.status(404).json({ success: false, error: 'report not found' });
  res.json({ success: true, data: result });
});

router.get('/compliance/:companyId', (req, res) => {
  const result = jinshui4Simulator.complianceCheck(req.params.companyId);
  res.json({ success: true, data: result });
});

module.exports = router;
