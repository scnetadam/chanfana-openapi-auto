const express = require('express');
const router = express.Router();
const invoiceSimulator = require('../invoiceSimulator');
const { invoiceStore } = require('../models/dataStore');

router.post('/issue', (req, res) => {
  const { issuerId, recipientId, recipientTrack, amount, taxRate, bizRef, bizHash, issueMode } = req.body;
  if (!issuerId || !recipientId || !amount) return res.status(400).json({ success: false, error: 'issuerId, recipientId, amount required' });
  const result = invoiceSimulator.issueInvoice({ issuerId, recipientId, recipientTrack, amount, taxRate, bizRef, bizHash, issueMode });
  res.json({ success: true, data: result });
});

router.post('/batch-issue', (req, res) => {
  const { items } = req.body;
  if (!items || !items.length) return res.status(400).json({ success: false, error: 'items array required' });
  const result = invoiceSimulator.batchIssueInvoice(items);
  res.json({ success: true, data: result });
});

router.get('/list', (req, res) => {
  const { issuerId, recipientId, recipientTrack, status, page, pageSize } = req.query;
  const result = invoiceStore.list({ issuerId, recipientId, recipientTrack, status, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/:invoiceId', (req, res) => {
  const invoice = invoiceStore.getByInvoiceId(req.params.invoiceId);
  if (!invoice) return res.status(404).json({ success: false, error: 'invoice not found' });
  res.json({ success: true, data: invoice });
});

router.post('/deliver/:invoiceId', (req, res) => {
  const result = invoiceSimulator.deliverInvoice(req.params.invoiceId, req.body.recipientId);
  if (!result) return res.status(404).json({ success: false, error: 'invoice not found' });
  res.json({ success: true, data: result });
});

router.get('/verify/:invoiceId', (req, res) => {
  const { ecnyFlowId, bizHash } = req.query;
  const result = invoiceSimulator.verifyInvoice(req.params.invoiceId, ecnyFlowId, bizHash);
  res.json({ success: true, data: result });
});

router.get('/summary/:recipientId', (req, res) => {
  const { period } = req.query;
  if (!period) return res.status(400).json({ success: false, error: 'period (YYYY-MM) required' });
  const result = invoiceSimulator.getMonthlySummary(req.params.recipientId, period);
  res.json({ success: true, data: result });
});

module.exports = router;
