const express = require('express');
const router = express.Router();
const { contractParamStore } = require('../models/dataStore');
const contractThresholdEngine = require('../contractThresholdEngine');

router.get('/', (req, res) => {
  const { scope } = req.query;
  const result = contractParamStore.list(scope);
  res.json({ success: true, data: result });
});

router.get('/check', (req, res) => {
  const { userId, amount } = req.query;
  if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId and amount required' });
  const result = contractThresholdEngine.evaluateKolPayment(userId, parseFloat(amount));
  res.json({ success: true, data: result });
});

router.get('/:paramKey', (req, res) => {
  const { scope } = req.query;
  const param = contractParamStore.get(req.params.paramKey, scope);
  if (!param) return res.status(404).json({ success: false, error: 'param not found' });
  res.json({ success: true, data: param });
});

router.put('/:paramKey', (req, res) => {
  const { value, scope, updatedBy } = req.body;
  if (value === undefined) return res.status(400).json({ success: false, error: 'value required' });
  const result = contractParamStore.set(req.params.paramKey, value, scope, updatedBy);
  if (!result) return res.status(404).json({ success: false, error: 'param not found' });
  res.json({ success: true, data: result });
});

router.post('/reset', (req, res) => {
  const { paramKey } = req.body;
  const result = paramKey ? contractParamStore.reset(paramKey) : contractParamStore.resetAll();
  res.json({ success: true, data: result });
});

module.exports = router;
