const express = require('express');
const router = express.Router();
const { budgetPools } = require('../models/dataStore');

router.post('/create', (req, res) => {
  try {
    const { merchantId, totalAmount, description } = req.body;
    if (!merchantId || !totalAmount) return res.status(400).json({ success: false, error: 'merchantId 和 totalAmount 必填' });

    const id = 'bg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const budget = {
      id,
      merchantId,
      totalAmount: Number(totalAmount),
      usedAmount: 0,
      frozenAmount: 0,
      remainingAmount: Number(totalAmount),
      description: description || '',
      status: 'active',
      startedAt: new Date().toISOString(),
      expiredAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    budgetPools.set(id, budget);
    res.json({ success: true, data: budget, message: '预算创建成功' });
  } catch (e) {
    console.error('[budget] create错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/topup', (req, res) => {
  try {
    const { budgetId, amount } = req.body;
    if (!budgetId || !amount) return res.status(400).json({ success: false, error: 'budgetId 和 amount 必填' });

    const budget = budgetPools.get(budgetId);
    if (!budget) return res.status(404).json({ success: false, error: '预算不存在' });
    if (budget.status !== 'active') return res.status(400).json({ success: false, error: '预算已关闭' });

    const result = budgetPools.withLock(budgetId, (item) => {
      item.totalAmount += Number(amount);
      item.remainingAmount = item.totalAmount - item.usedAmount - item.frozenAmount;
      item.topupHistory = item.topupHistory || [];
      item.topupHistory.push({ amount: Number(amount), at: new Date().toISOString() });
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: result.data, message: '预算追加成功' });
  } catch (e) {
    console.error('[budget] topup错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/freeze', (req, res) => {
  try {
    const { budgetId, amount } = req.body;
    if (!budgetId || !amount) return res.status(400).json({ success: false, error: 'budgetId 和 amount 必填' });

    const budget = budgetPools.get(budgetId);
    if (!budget) return res.status(404).json({ success: false, error: '预算不存在' });

    const remaining = budget.totalAmount - budget.usedAmount - budget.frozenAmount;
    if (amount > remaining) return res.status(400).json({ success: false, error: '冻结金额超过剩余预算', remaining });

    const result = budgetPools.withLock(budgetId, (item) => {
      item.frozenAmount += Number(amount);
      item.remainingAmount = item.totalAmount - item.usedAmount - item.frozenAmount;
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: result.data, message: '冻结成功' });
  } catch (e) {
    console.error('[budget] freeze错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/unfreeze', (req, res) => {
  try {
    const { budgetId, amount } = req.body;
    if (!budgetId || !amount) return res.status(400).json({ success: false, error: 'budgetId 和 amount 必填' });

    const budget = budgetPools.get(budgetId);
    if (!budget) return res.status(404).json({ success: false, error: '预算不存在' });

    const result = budgetPools.withLock(budgetId, (item) => {
      item.frozenAmount = Math.max(0, item.frozenAmount - Number(amount));
      item.remainingAmount = item.totalAmount - item.usedAmount - item.frozenAmount;
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: result.data, message: '解冻成功' });
  } catch (e) {
    console.error('[budget] unfreeze错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/consume', (req, res) => {
  try {
    const { budgetId, amount, description } = req.body;
    if (!budgetId || !amount) return res.status(400).json({ success: false, error: 'budgetId 和 amount 必填' });

    const budget = budgetPools.get(budgetId);
    if (!budget) return res.status(404).json({ success: false, error: '预算不存在' });

    const available = budget.totalAmount - budget.usedAmount - budget.frozenAmount;
    if (amount > available) return res.status(400).json({ success: false, error: '金额超过可用预算', available });

    const result = budgetPools.withLock(budgetId, (item) => {
      item.usedAmount += Number(amount);
      item.remainingAmount = item.totalAmount - item.usedAmount - item.frozenAmount;
      item.consumeHistory = item.consumeHistory || [];
      item.consumeHistory.push({ amount: Number(amount), description: description || '', at: new Date().toISOString() });
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: result.data, message: '消费成功' });
  } catch (e) {
    console.error('[budget] consume错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/status/:poolId', (req, res) => {
  try {
    const budget = budgetPools.get(req.params.poolId);
    if (!budget) return res.status(404).json({ success: false, error: '预算不存在' });
    res.json({ success: true, data: budget });
  } catch (e) {
    console.error('[budget] status错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { userId, status, page = 1, limit = 20 } = req.query;
    let budgets = budgetPools.getAll();
    if (userId) budgets = budgets.filter(b => b.merchantId === userId);
    if (status) budgets = budgets.filter(b => b.status === status);
    budgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = budgets.length;
    const start = (page - 1) * limit;
    const paged = budgets.slice(start, start + Number(limit));
    res.json({ success: true, data: { budgets: paged, total, page: Number(page), limit: Number(limit) } });
  } catch (e) {
    console.error('[budget] list错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
