const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');

router.post('/cmb/split', (req, res) => {
  const { merchantId, totalAmount, splits } = req.body;
  if (!merchantId || !totalAmount || !splits) return res.status(400).json({ success: false, error: 'merchantId, totalAmount, splits required' });
  // REAL_API: POST https://api.cmbchina.com/corporate/split
  const result = {
    success: true,
    batchNo: 'CMB_' + uuid().slice(0, 8),
    splits: splits.map(s => ({ ...s, status: 'completed' })),
    status: 'completed'
  };
  res.json({ success: true, data: result });
});

router.post('/bocom/settle', (req, res) => {
  const { merchantId, amount, accountNo } = req.body;
  if (!merchantId || !amount || !accountNo) return res.status(400).json({ success: false, error: 'merchantId, amount, accountNo required' });
  // REAL_API: POST https://api.bankcomm.com/corporate/settle
  const result = {
    success: true,
    settleNo: 'BOCOM_' + uuid().slice(0, 8),
    amount,
    status: 'completed'
  };
  res.json({ success: true, data: result });
});

router.get('/status', (req, res) => {
  res.json({ success: true, data: { banks: { cmb: { mode: 'simulate', connected: false }, bocom: { mode: 'simulate', connected: false } } } });
});

module.exports = router;
