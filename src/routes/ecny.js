const express = require('express');
const router = express.Router();
const ecnySimulator = require('../ecnySimulator');
const { ecnyWalletStore, ecnyFlowStore } = require('../models/dataStore');

router.post('/wallet', (req, res) => {
  const { walletType, ownerId } = req.body;
  if (!walletType || !ownerId) return res.status(400).json({ success: false, error: 'walletType and ownerId required' });
  const wallet = ecnySimulator.createWallet(walletType, ownerId);
  const stored = ecnyWalletStore.create({ walletType, ownerId, walletId: wallet.walletId });
  res.json({ success: true, data: { ...wallet, stored } });
});

router.post('/recharge', (req, res) => {
  const { walletId, amount } = req.body;
  if (!walletId || !amount || amount <= 0) return res.status(400).json({ success: false, error: 'walletId and positive amount required' });
  const result = ecnySimulator.rechargeUmbrellaTop(walletId, amount);
  ecnyWalletStore.updateBalance(walletId, amount);
  res.json({ success: true, data: result });
});

router.post('/umbrella-split', (req, res) => {
  const { parentTradeNo, totalAmount, splits } = req.body;
  if (!parentTradeNo || !totalAmount || !splits || !splits.length) return res.status(400).json({ success: false, error: 'parentTradeNo, totalAmount, splits required' });
  const result = ecnySimulator.umbrellaSplit(parentTradeNo, totalAmount, splits);
  res.json({ success: true, data: result });
});

router.get('/flows', (req, res) => {
  const { walletId, direction, bizType, status, page, pageSize } = req.query;
  const result = ecnyFlowStore.list({ walletId, direction, bizType, status, page, pageSize });
  res.json({ success: true, data: result });
});

router.get('/flows/:flowId', (req, res) => {
  const flow = ecnyFlowStore.getByFlowId(req.params.flowId);
  if (!flow) return res.status(404).json({ success: false, error: 'flow not found' });
  res.json({ success: true, data: flow });
});

router.get('/wallet/:walletId/balance', (req, res) => {
  const balance = ecnySimulator.getWalletBalance(req.params.walletId);
  res.json({ success: true, data: { walletId: req.params.walletId, balance } });
});

router.post('/withhold', (req, res) => {
  const { amount, tipsAgreementId } = req.body;
  if (!amount || !tipsAgreementId) return res.status(400).json({ success: false, error: 'amount and tipsAgreementId required' });
  const result = ecnySimulator.withholdAndRemit(amount, tipsAgreementId);
  res.json({ success: true, data: result });
});

module.exports = router;
