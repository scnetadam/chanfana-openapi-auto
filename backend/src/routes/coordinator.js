const express = require('express');
const router = express.Router();
const { coordinator } = require('../orchestrator/crossProject');

router.get('/health/all', async (req, res) => {
  try {
    const results = await coordinator.checkAll();
    const overallHealthy = Object.values(results).every(r => r.status === 'healthy');
    res.json({
      success: true,
      data: {
        overall: overallHealthy ? 'healthy' : 'degraded',
        projects: results,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('[coordinator] health/all错误:', e);
    res.status(500).json({ success: false, error: '健康检查失败' });
  }
});

router.post('/sso/exchange', async (req, res) => {
  try {
    const { sourceProject, targetProject, token } = req.body;
    if (!sourceProject || !targetProject || !token) {
      return res.status(400).json({ success: false, error: 'sourceProject, targetProject, token required' });
    }
    const result = await coordinator.exchangeToken(sourceProject, targetProject, token);
    if (!result || !result.success) return res.status(400).json(result || { success: false, error: '令牌交换失败' });
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[coordinator] sso/exchange错误:', e);
    res.status(500).json({ success: false, error: '令牌交换失败' });
  }
});

router.post('/settle/cross-project', async (req, res) => {
  try {
    const { sourceProject, targetProject, amount, payerId, payeeId, metadata } = req.body;
    if (!sourceProject || !targetProject || !amount) {
      return res.status(400).json({ success: false, error: 'sourceProject, targetProject, amount required' });
    }
    const result = await coordinator.initiateCrossProjectSettle({
      sourceProject, targetProject, amount, payerId, payeeId, metadata,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[coordinator] settle/cross-project错误:', e);
    res.status(500).json({ success: false, error: '跨项目结算失败' });
  }
});

router.get('/events', (req, res) => {
  try {
    const { limit } = req.query;
    const events = coordinator.getRecentEvents(parseInt(limit) || 50);
    res.json({ success: true, data: events });
  } catch (e) {
    console.error('[coordinator] events错误:', e);
    res.status(500).json({ success: false, error: '获取事件失败' });
  }
});

router.post('/revenue/distribute', async (req, res) => {
  try {
    const { totalAmount, kolId, merchantId, channel } = req.body;
    if (!totalAmount) {
      return res.status(400).json({ success: false, error: 'totalAmount required' });
    }
    const result = await coordinator.distributeRevenue({ totalAmount, kolId, merchantId, channel });
    if (!result || !result.success) return res.status(400).json(result || { success: false, error: '收益分配失败' });
    res.json({ success: true, data: result.distribution });
  } catch (e) {
    console.error('[coordinator] revenue/distribute错误:', e);
    res.status(500).json({ success: false, error: '收益分配失败' });
  }
});

module.exports = router;
