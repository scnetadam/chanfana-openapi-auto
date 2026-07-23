/**
 * 龟钮印信 — 伞列智合分账独立路由
 *
 * 路由：
 *   GET  /api/umbrella-split/status           — 服务状态
 *   GET  /api/umbrella-split/accounts         — 伞列账户列表
 *   POST /api/umbrella-split/accounts         — 注册新账户
 *   GET  /api/umbrella-split/accounts/:id     — 账户详情
 *   POST /api/umbrella-split/accounts/:id/toggle — 冻结/解冻
 *   GET  /api/umbrella-split/rules            — 清分规则列表
 *   POST /api/umbrella-split/rules            — 添加规则
 *   DELETE /api/umbrella-split/rules/:id      — 删除规则
 *   POST /api/umbrella-split/execute          — 执行分账
 *   GET  /api/umbrella-split/logs             — 分账日志
 *   GET  /api/umbrella-split/logs/:batchNo    — 日志详情
 */

const express = require('express');
const router = express.Router();
const {
  UmbrellaSplitEngine, UmbrellaMatrix, ACCOUNT_TYPE,
} = require('../protocols/umbrellaSplit');
const { umbrellaAccounts, umbrellaRules, umbrellaLogs } = require('../models/dataStore');

let engine = null;

function _getEngine() {
  if (!engine) {
    const matrix = new UmbrellaMatrix(umbrellaAccounts);
    engine = new UmbrellaSplitEngine({
      matrix,
      accountStore: umbrellaAccounts,
      ruleStore: umbrellaRules,
      logStore: umbrellaLogs,
    });
  }
  return engine;
}

router.get('/status', (req, res) => {
  try {
    const eng = _getEngine();
    const accounts = umbrellaAccounts.getAll();
    const rules = umbrellaRules.getAll();
    const logs = umbrellaLogs.getAll();
    res.json({
      success: true,
      data: {
        service: '伞列智合分账',
        version: '1.0.0',
        mode: 'sandbox',
        accounts: accounts.length,
        rules: rules.length,
        splitLogs: logs.length,
        accountTypes: Object.values(ACCOUNT_TYPE),
      },
    });
  } catch (err) {
    console.error('[umbrellaSplit] status错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/accounts', (req, res) => {
  try {
    const eng = _getEngine();
    const { type, status } = req.query;
    let accounts = eng.matrix.listAll();
    if (type) accounts = accounts.filter(a => a.type === type);
    if (status) accounts = accounts.filter(a => a.status === status);
    res.json({ success: true, data: accounts, total: accounts.length });
  } catch (err) {
    console.error('[umbrellaSplit] accounts list错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/accounts', (req, res) => {
  try {
    const { type, name, walletAddress, binding, track, priority, parentId } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name 必填' });
    const eng = _getEngine();
    const account = eng.matrix.register({ type: type || 'sub_wallet', name, walletAddress, binding, track, priority: priority || 0, parentId });
    res.json({ success: true, data: account });
  } catch (err) { console.error('[umbrellaSplit] accounts create错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

router.get('/accounts/:id', (req, res) => {
  try {
    const eng = _getEngine();
    const account = eng.matrix.get(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: '账户不存在' });
    res.json({ success: true, data: account });
  } catch (err) {
    console.error('[umbrellaSplit] accounts/:id get错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/accounts/:id/toggle', (req, res) => {
  try {
    const eng = _getEngine();
    const account = eng.matrix.toggleStatus(req.params.id);
    if (!account) return res.status(404).json({ success: false, error: '账户不存在' });
    res.json({ success: true, data: account });
  } catch (err) {
    console.error('[umbrellaSplit] accounts/:id/toggle错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/rules', (req, res) => {
  try {
    const eng = _getEngine();
    const rules = eng.listRules().sort((a, b) => a.priority - b.priority);
    res.json({ success: true, data: rules, total: rules.length });
  } catch (err) {
    console.error('[umbrellaSplit] rules list错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/rules', (req, res) => {
  try {
    const { name, type, value, targetAccountId, targetType, priority, memo } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name 必填' });
    const eng = _getEngine();
    const rule = eng.addRule({ name, type: type || 'percentage', value: value || 0, targetAccountId, targetType: targetType || 'kol', priority: priority || 0, memo });
    res.json({ success: true, data: rule });
  } catch (err) { console.error('[umbrellaSplit] rules create错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

router.delete('/rules/:id', (req, res) => {
  try {
    const eng = _getEngine();
    const deleted = eng.removeRule(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: '规则不存在' });
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    console.error('[umbrellaSplit] rules/:id delete错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { totalAmount, sourceTradeNo, kol, monthlyAccumulated, dailyCount, customSplits } = req.body;
    if (!totalAmount || totalAmount <= 0) return res.status(400).json({ success: false, error: 'totalAmount 必填且大于0' });
    const eng = _getEngine();
    const result = await eng.execute({
      totalAmount: parseFloat(totalAmount),
      sourceTradeNo: sourceTradeNo || '',
      kol: kol || null,
      monthlyAccumulated: monthlyAccumulated || 0,
      dailyCount: dailyCount || 0,
      customSplits: customSplits || undefined,
    });
    res.json({ success: true, data: result });
  } catch (err) { console.error('[umbrellaSplit] execute错误:', err); res.status(500).json({ success: false, error: '服务器错误' }); }
});

router.get('/logs', (req, res) => {
  try {
    const eng = _getEngine();
    const { limit = 20 } = req.query;
    const logs = eng.listLogs(parseInt(limit, 10) || 20);
    res.json({ success: true, data: logs, total: logs.length });
  } catch (err) {
    console.error('[umbrellaSplit] logs错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/logs/:batchNo', (req, res) => {
  try {
    const eng = _getEngine();
    const log = eng.getLog(req.params.batchNo);
    if (!log) return res.status(404).json({ success: false, error: '日志不存在' });
    res.json({ success: true, data: log });
  } catch (err) {
    console.error('[umbrellaSplit] logs/:batchNo错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
