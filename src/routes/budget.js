const express = require('express');
const router = express.Router();
const { budgetAccountStore } = require('../models/dataStore');

router.post('/create', (req, res) => {
  const { bizUserId, totalBudget, autoRecharge, rechargeThreshold } = req.body;
  if (!bizUserId || !totalBudget) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const existing = budgetAccountStore.getByBizUserId(bizUserId);
  if (existing) {
    return res.status(400).json({ error: '该用户已有预算账户' });
  }
  const account = budgetAccountStore.create({
    bizUserId,
    totalBudget,
    autoRecharge: autoRecharge || false,
    rechargeThreshold: rechargeThreshold || 0
  });
  res.json({ success: true, account });
});

router.post('/:id/recharge', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: '充值金额必须大于0' });
  }
  const account = budgetAccountStore.recharge(id, amount);
  if (!account) {
    return res.status(404).json({ error: '预算账户不存在' });
  }
  res.json({ success: true, account });
});

router.get('/:id/status', (req, res) => {
  const { id } = req.params;
  const account = budgetAccountStore.getById(id);
  if (!account) {
    return res.status(404).json({ error: '预算账户不存在' });
  }
  const usagePercent = (account.usedBudget / account.totalBudget) * 100;
  const isLow = account.remainingBudget < account.totalBudget * 0.2;
  res.json({
    success: true,
    account,
    usagePercent,
    isLow,
    needsRecharge: isLow && !account.autoRecharge
  });
});

router.post('/:id/config-auto-recharge', (req, res) => {
  const { id } = req.params;
  const { autoRecharge, rechargeThreshold } = req.body;
  const account = budgetAccountStore.update(id, {
    autoRecharge,
    rechargeThreshold
  });
  if (!account) {
    return res.status(404).json({ error: '预算账户不存在' });
  }
  res.json({ success: true, account });
});

router.get('/biz/:bizUserId', (req, res) => {
  const { bizUserId } = req.params;
  const account = budgetAccountStore.getByBizUserId(bizUserId);
  if (!account) {
    return res.status(404).json({ error: '预算账户不存在' });
  }
  res.json({ success: true, account });
});

router.get('/list', (req, res) => {
  const accounts = budgetAccountStore.listAll();
  res.json({ success: true, accounts });
});

module.exports = router;
