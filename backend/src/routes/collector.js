const express = require('express');
const router = express.Router();
const { collectorQueue, collectorSubscriptions } = require('../models/dataStore');

router.post('/check', (req, res) => {
  try {
    const { orderId, settleData, taxData, splitData, evidenceData } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId 必填' });

    const checks = {
      settle: { exists: !!settleData, amount: settleData?.amount || 0, status: settleData?.status || 'unknown' },
      tax: { exists: !!taxData, amount: taxData?.taxAmount || 0, track: taxData?.track || 'unknown' },
      split: { exists: !!splitData, parties: splitData?.parties?.length || 0, total: splitData?.total || 0 },
      evidence: { exists: !!evidenceData, digest: evidenceData?.digest || '', status: evidenceData?.status || 'unknown' }
    };

    const allPassed = Object.values(checks).every(c => c.exists);
    const score = Object.values(checks).filter(c => c.exists).length / 4;

    res.json({
      success: true,
      data: {
        orderId,
        checks,
        allPassed,
        completeness: Math.round(score * 100) + '%',
        status: allPassed ? 'ready' : 'incomplete',
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('[龟钮自驭/collector] check错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/submit', (req, res) => {
  try {
    const { orderId, settleData, taxData, splitData, evidenceData, userId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId 必填' });

    const id = 'col_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const record = {
      id,
      orderId,
      userId: userId || 'system',
      streams: {
        settle: settleData || {},
        tax: taxData || {},
        split: splitData || {},
        evidence: evidenceData || {}
      },
      status: 'submitted',
      streamCount: [settleData, taxData, splitData, evidenceData].filter(Boolean).length,
      createdAt: new Date().toISOString()
    };
    collectorQueue.set(id, record);
    res.json({ success: true, data: record, message: '四流提交成功' });
  } catch (e) {
    console.error('[龟钮自驭/collector] submit错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/status/:id', (req, res) => {
  try {
    const record = collectorQueue.get(req.params.id) || collectorQueue.findOne(r => r.orderId === req.params.id);
    if (!record) return res.status(404).json({ success: false, error: '记录不存在' });

    const streams = record.streams;
    const completedStreams = Object.entries(streams).filter(([_, v]) => v && Object.keys(v).length > 0).length;

    res.json({
      success: true,
      data: {
        ...record,
        completedStreams,
        totalStreams: 4,
        progress: Math.round((completedStreams / 4) * 100) + '%'
      }
    });
  } catch (e) {
    console.error('[龟钮自驭/collector] status错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/fuse', (req, res) => {
  try {
    const { orderId, threshold, reason } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId 必填' });

    const record = collectorQueue.get(orderId) || collectorQueue.findOne(r => r.orderId === orderId);
    if (!record) return res.status(404).json({ success: false, error: '记录不存在' });

    const triggered = threshold && record.streamCount < threshold;
    const result = collectorQueue.withLock(record.id, (item) => {
      item.status = triggered ? 'fused' : 'passed';
      item.fuseReason = triggered ? (reason || '阀值未达标') : '';
      item.fuseThreshold = threshold || 4;
      item.fusedAt = triggered ? new Date().toISOString() : null;
      return item;
    });

    res.json({
      success: true,
      data: {
        orderId: record.orderId,
        status: triggered ? 'fused' : 'passed',
        streamCount: record.streamCount,
        threshold: threshold || 4,
        triggered,
        message: triggered ? '熔断触发' : '阀值通过'
      }
    });
  } catch (e) {
    console.error('[龟钮自驭/collector] fuse错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/subscribe', (req, res) => {
  try {
    const { orderId, events, callbackUrl } = req.body;
    if (!orderId || !events) return res.status(400).json({ success: false, error: 'orderId 和 events 必填' });

    const id = 'sub_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const sub = {
      id,
      orderId,
      events: Array.isArray(events) ? events : [events],
      callbackUrl: callbackUrl || '',
      createdAt: new Date().toISOString()
    };
    collectorSubscriptions.set(id, sub);
    res.json({ success: true, data: sub, message: '订阅成功' });
  } catch (e) {
    console.error('[龟钮自驭/collector] subscribe错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let records = collectorQueue.getAll();
    if (status) records = records.filter(r => r.status === status);
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = records.length;
    const start = (page - 1) * limit;
    const paged = records.slice(start, start + Number(limit));
    res.json({ success: true, data: { records: paged, total, page: Number(page), limit: Number(limit) } });
  } catch (e) {
    console.error('[龟钮自驭/collector] list错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/stats/overview', (req, res) => {
  try {
    const records = collectorQueue.getAll();
    res.json({
      success: true,
      data: {
        total: records.length,
        submitted: records.filter(r => r.status === 'submitted').length,
        fused: records.filter(r => r.status === 'fused').length,
        passed: records.filter(r => r.status === 'passed').length,
        avgStreamCount: records.length ? Math.round(records.reduce((s, r) => s + r.streamCount, 0) / records.length * 100) / 100 : 0,
        byStreamCount: records.reduce((acc, r) => { acc[r.streamCount] = (acc[r.streamCount] || 0) + 1; return acc; }, {})
      }
    });
  } catch (e) {
    console.error('[龟钮自驭/collector] stats错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ========== 事件总线 (订阅队列事件触发) ==========
const EventEmitter = require('events');
const collectorEmitter = new EventEmitter();

function emitCollectorEvent(eventType, payload) {
  const enriched = { ...payload, emittedAt: new Date().toISOString(), eventType };
  collectorEmitter.emit(eventType, enriched);
  collectorEmitter.emit('*', enriched);
  const subs = collectorSubscriptions.getAll().filter(s => s.events.includes(eventType) || s.events.includes('*'));
  subs.forEach(s => {
    console.log(`[龟钮自驭/collector事件] 通知订阅 ${s.id}: ${eventType} -> ${s.callbackUrl || 'log'}`);
  });
  const { RedisSimulator } = require('../engine/settle.engine');
  const eventKey = `collector:events:${Date.now()}`;
  RedisSimulator.set(eventKey, JSON.stringify(enriched), 86400000 * 7);
  return enriched;
}

// POST /api/collector/emit — 手动触发事件
router.post('/emit', (req, res) => {
  try {
    const { eventType, payload } = req.body;
    if (!eventType) return res.status(400).json({ success: false, error: 'eventType 必填' });
    const enriched = emitCollectorEvent(eventType, payload || {});
    res.json({ success: true, data: enriched, message: '事件已触发' });
  } catch (e) {
    console.error('[龟钮自驭/collector] emit错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/collector/events — 查询事件日志
router.get('/events', (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const { RedisSimulator } = require('../engine/settle.engine');
    const keys = RedisSimulator.keys('collector:events:*');
    let events = keys.map(k => { try { return JSON.parse(RedisSimulator.get(k)); } catch { return null; } }).filter(Boolean);
    if (type) events = events.filter(e => e.eventType === type);
    events.sort((a, b) => new Date(b.emittedAt) - new Date(a.emittedAt));
    res.json({ success: true, data: { events: events.slice(0, Number(limit)), total: events.length } });
  } catch (e) {
    console.error('[龟钮自驭/collector] events错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ========== 预算超支提醒 ==========

// POST /api/collector/budget-alert — 预算超支检测与提醒
router.post('/budget-alert', (req, res) => {
  try {
    const { userId, currentBudget, dailySpendRate, daysRemaining, pendingOrders, projectedDataRevenue } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const { BudgetForecastEngine } = require('../engine/settle.engine');
    BudgetForecastEngine.updateBudgetTracking(userId, { currentBudget: currentBudget || 0, dailySpendRate: dailySpendRate || 0, daysRemaining: daysRemaining || 30, pendingOrders: pendingOrders || 0, projectedDataRevenue: projectedDataRevenue || 0 });

    const forecast = currentBudget !== undefined
      ? BudgetForecastEngine.forecast({ currentBudget, dailySpendRate: dailySpendRate || 0, daysRemaining: daysRemaining || 30, pendingOrders: pendingOrders || 0, projectedDataRevenue: projectedDataRevenue || 0 })
      : BudgetForecastEngine.getBudgetRecommendation(userId);

    const alertLevel = forecast.willExhaust ? 'critical' : forecast.projectedRemaining < (currentBudget || forecast.currentBudget) * 0.2 ? 'warning' : 'normal';
    const alert = { userId, alertLevel, forecast, alertAt: new Date().toISOString() };

    if (alertLevel !== 'normal') {
      emitCollectorEvent('budget_overshoot', { userId, alertLevel, projectedRemaining: forecast.projectedRemaining, exhaustionDate: forecast.exhaustionDate, recommendation: forecast.recommendation });
    }

    res.json({ success: true, data: { alert, forecast } });
  } catch (e) {
    console.error('[龟钮自驭/collector] budget-alert错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/collector/budget-alerts/:userId — 查询用户预算提醒历史
router.get('/budget-alerts/:userId', (req, res) => {
  try {
    const { RedisSimulator } = require('../engine/settle.engine');
    const keys = RedisSimulator.keys('collector:events:*');
    const alerts = keys.map(k => { try { return JSON.parse(RedisSimulator.get(k)); } catch { return null; } }).filter(e => e && e.eventType === 'budget_overshoot' && e.userId === req.params.userId);
    alerts.sort((a, b) => new Date(b.emittedAt) - new Date(a.emittedAt));
    res.json({ success: true, data: { alerts, total: alerts.length } });
  } catch (e) {
    console.error('[龟钮自驭/collector] budget-alerts错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ========== 时间轴预测 ==========

// POST /api/collector/timeline-forecast — 综合时间轴预测
router.post('/timeline-forecast', (req, res) => {
  try {
    const { userId, currentBudget, dailySpendRate, daysRemaining, pendingOrders, projectedDataRevenue } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const { BudgetForecastEngine, RiskWatchdog } = require('../engine/settle.engine');
    const forecast = BudgetForecastEngine.forecast({ currentBudget: currentBudget || 0, dailySpendRate: dailySpendRate || 0, daysRemaining: daysRemaining || 30, pendingOrders: pendingOrders || 0, projectedDataRevenue: projectedDataRevenue || 0 });
    const riskAlerts = RiskWatchdog.getAlerts(userId);

    const timeline = forecast.timeline.map(point => ({
      ...point,
      riskAlerts: riskAlerts.filter(a => new Date(a.checkedAt).toISOString().split('T')[0] <= point.date).length,
      riskLevel: riskAlerts.filter(a => new Date(a.checkedAt).toISOString().split('T')[0] <= point.date).length > 0 ? 'elevated' : 'normal'
    }));

    const recommendation = forecast.willExhaust
      ? `预算将在${Math.floor((currentBudget || 0) / (dailySpendRate || 1))}天内耗尽，建议立即调整支出策略`
      : forecast.projectedRemaining < (currentBudget || forecast.currentBudget) * 0.2
      ? '预算余量不足20%，建议关注支出节奏'
      : '预算状况良好';

    emitCollectorEvent('timeline_forecast', { userId, willExhaust: forecast.willExhaust, recommendation });

    res.json({
      success: true,
      data: {
        userId,
        budgetForecast: forecast,
        timeline,
        riskSummary: { totalAlerts: riskAlerts.length, highRisk: riskAlerts.filter(a => a.riskLevel === 'high').length },
        recommendation,
        forecastAt: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error('[龟钮自驭/collector] timeline-forecast错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
