const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const VALUATION_FILE = path.join(DATA_DIR, 'evidenceValuation.json');

function ensureFile(file, defaultData) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readData(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

ensureFile(VALUATION_FILE, []);

const VALUATION_DIMENSIONS = {
  viewCount: { label: '查看次数', weight: 0.15, max: 500 },
  dwellTime: { label: '驻留时长', weight: 0.20, max: 600 },
  purchaseCount: { label: '购买次数', weight: 0.25, max: 50 },
  shareCount: { label: '分享次数', weight: 0.15, max: 30 },
  commentCount: { label: '评价次数', weight: 0.10, max: 20 },
  bookmarkCount: { label: '收藏次数', weight: 0.10, max: 20 },
  reportCount: { label: '举报次数', weight: -0.15, max: 5 },
};

function _calculateValuation(metrics) {
  let positiveScore = 0;
  let negativeScore = 0;
  const dimScores = {};

  for (const [key, config] of Object.entries(VALUATION_DIMENSIONS)) {
    const raw = metrics[key] || 0;
    const normalized = Math.min(1.0, raw / config.max);
    const contribution = normalized * Math.abs(config.weight);
    dimScores[key] = parseFloat(contribution.toFixed(6));

    if (config.weight > 0) positiveScore += contribution;
    else negativeScore += contribution;
  }

  const totalWeight = Math.max(0, positiveScore - negativeScore);
  const baseValue = metrics.baseValue || 0.01;
  const estimatedValue = parseFloat((totalWeight * baseValue * 100).toFixed(6));

  return {
    totalWeight: parseFloat(totalWeight.toFixed(6)),
    estimatedValue,
    positiveContribution: parseFloat(positiveScore.toFixed(6)),
    negativeContribution: parseFloat(negativeScore.toFixed(6)),
    dimensions: dimScores,
    qualityGrade: totalWeight >= 0.8 ? 'A' : totalWeight >= 0.6 ? 'B' : totalWeight >= 0.4 ? 'C' : totalWeight >= 0.2 ? 'D' : 'E',
  };
}

router.post('/valuate', (req, res) => {
  const { evidenceId, userId, metrics } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId 必填' });

  const fullMetrics = {
    viewCount: (metrics && metrics.viewCount) || 0,
    dwellTime: (metrics && metrics.dwellTime) || 0,
    purchaseCount: (metrics && metrics.purchaseCount) || 0,
    shareCount: (metrics && metrics.shareCount) || 0,
    commentCount: (metrics && metrics.commentCount) || 0,
    bookmarkCount: (metrics && metrics.bookmarkCount) || 0,
    reportCount: (metrics && metrics.reportCount) || 0,
    baseValue: (metrics && metrics.baseValue) || 0.01,
  };

  const valuation = _calculateValuation(fullMetrics);

  const record = {
    id: 'ev_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
    evidenceId,
    userId: userId || 'system',
    metrics: fullMetrics,
    valuation,
    valuatedAt: new Date().toISOString(),
  };

  const records = readData(VALUATION_FILE);
  records.push(record);
  if (records.length > 50000) records.splice(0, records.length - 50000);
  writeData(VALUATION_FILE, records);

  res.json({ success: true, data: record });
});

router.post('/test-payment', (req, res) => {
  const { evidenceId, userId, valuationAmount, channel } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId 必填' });

  const amount = valuationAmount || 0.01;
  const ch = channel || 'alipay';

  const paymentRecord = {
    id: 'evp_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
    evidenceId,
    userId: userId || 'system',
    amount,
    channel: ch,
    type: 'test_valuation_payment',
    status: 'simulated',
    simulatedAt: new Date().toISOString(),
    note: '存证数据加权估值测试支付，金额仅为估值演示',
  };

  res.json({ success: true, data: paymentRecord });
});

router.get('/evidence/:evidenceId', (req, res) => {
  const records = readData(VALUATION_FILE);
  const filtered = records.filter(r => r.evidenceId === req.params.evidenceId);
  if (filtered.length === 0) return res.json({ success: true, data: { evidenceId: req.params.evidenceId, valuations: [], count: 0 } });

  const latest = filtered[filtered.length - 1];
  res.json({
    success: true,
    data: {
      evidenceId: req.params.evidenceId,
      latestValuation: latest.valuation,
      historyCount: filtered.length,
      valuations: filtered.slice(-5),
    },
  });
});

router.get('/dimensions', (req, res) => {
  res.json({ success: true, data: VALUATION_DIMENSIONS });
});

router.get('/stats', (req, res) => {
  const records = readData(VALUATION_FILE);
  const byGrade = {};
  records.forEach(r => {
    const grade = r.valuation && r.valuation.qualityGrade || 'N/A';
    byGrade[grade] = (byGrade[grade] || 0) + 1;
  });
  const avgValue = records.length
    ? parseFloat((records.reduce((s, r) => s + (r.valuation && r.valuation.estimatedValue || 0), 0) / records.length).toFixed(6))
    : 0;
  res.json({
    success: true,
    data: {
      total: records.length,
      byGrade,
      avgEstimatedValue: avgValue,
      totalEstimatedValue: parseFloat(records.reduce((s, r) => s + (r.valuation && r.valuation.estimatedValue || 0), 0).toFixed(6)),
    },
  });
});

module.exports = router;
