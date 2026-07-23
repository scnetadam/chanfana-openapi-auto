const express = require('express');
const router = express.Router();
const tipsSimulator = require('../tipsSimulator');
const { tipsAgreementStore } = require('../models/dataStore');

router.post('/sign', (req, res) => {
  const { userId, bankAccount, bankName, taxBureauCode, autoDeductEnabled } = req.body;
  if (!userId || !bankAccount) return res.status(400).json({ success: false, error: 'userId and bankAccount required' });
  const result = tipsSimulator.signAgreement(userId, bankAccount, bankName, taxBureauCode);
  const stored = tipsAgreementStore.create({ userId, bankAccount, bankName, taxBureauCode, autoDeductEnabled, agreementId: result.agreementId });
  res.json({ success: true, data: { ...result, stored } });
});

router.get('/agreement/:agreementId', (req, res) => {
  const agreement = tipsSimulator.queryAgreement(req.params.agreementId);
  if (!agreement) {
    const fallback = tipsAgreementStore.getByAgreementId(req.params.agreementId);
    if (!fallback) return res.status(404).json({ success: false, error: 'agreement not found' });
    return res.json({ success: true, data: fallback });
  }
  res.json({ success: true, data: agreement });
});

router.post('/auto-deduct', (req, res) => {
  const { agreementId, amount, taxType } = req.body;
  if (!agreementId || !amount) return res.status(400).json({ success: false, error: 'agreementId and amount required' });
  const result = tipsSimulator.autoDeduct(agreementId, amount, taxType);
  res.json({ success: true, data: result });
});

router.post('/suspend/:agreementId', (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, error: 'reason required' });
  const result = tipsSimulator.suspendAgreement(req.params.agreementId, reason);
  if (!result) return res.status(404).json({ success: false, error: 'agreement not found' });
  tipsAgreementStore.suspend(req.params.agreementId, reason);
  res.json({ success: true, data: result });
});

router.post('/reactivate/:agreementId', (req, res) => {
  const result = tipsSimulator.reactivateAgreement(req.params.agreementId);
  if (!result) return res.status(404).json({ success: false, error: 'agreement not found' });
  tipsAgreementStore.reactivate(req.params.agreementId);
  res.json({ success: true, data: result });
});

router.get('/list/:userId', (req, res) => {
  const agreements = tipsSimulator.listAgreements(req.params.userId);
  if (!agreements || !agreements.length) {
    const fallback = tipsAgreementStore.getByUserId(req.params.userId);
    return res.json({ success: true, data: fallback });
  }
  res.json({ success: true, data: agreements });
});

module.exports = router;
