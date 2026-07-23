const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PAGE_SETTLE_FILE = path.join(DATA_DIR, 'pageWeightedSettle.json');

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

ensureFile(PAGE_SETTLE_FILE, []);

const WEIGHT_DIMENSIONS = {
  visitCount: { label: '访问量', weight: 0.15, max: 200, description: '页面访问次数' },
  frequency: { label: '频率', weight: 0.15, max: 14, description: '不同天数访问' },
  duration: { label: '时长', weight: 0.20, max: 600, description: '平均驻留秒数' },
  interaction: { label: '互动', weight: 0.15, max: 50, description: '互动次数' },
  contentDimension: { label: '内容维度', weight: 0.15, max: 10, description: '页面内容丰富度评分' },
  depthScore: { label: '了解深度', weight: 0.10, max: 5, description: '用户对平台了解深度层级' },
  shareTrack: { label: '分享追踪', weight: 0.10, max: 20, description: '分享传播数据' },
};

function _calculatePageWeight(event) {
  const dimScores = {};
  let totalScore = 0;

  for (const [key, config] of Object.entries(WEIGHT_DIMENSIONS)) {
    const raw = event[key] || 0;
    const normalized = Math.min(1.0, raw / config.max);
    dimScores[key] = parseFloat((normalized * config.weight).toFixed(6));
    totalScore += normalized * config.weight;
  }

  return {
    totalWeight: parseFloat(totalScore.toFixed(6)),
    dimensions: dimScores,
    raw: {
      visitCount: event.visitCount || 0,
      frequency: event.frequency || 0,
      duration: event.duration || 0,
      interaction: event.interaction || 0,
      contentDimension: event.contentDimension || 0,
      depthScore: event.depthScore || 0,
      shareTrack: event.shareTrack || 0,
    },
  };
}

function _calculateSettleAmount(weight, baseRate) {
  const rate = baseRate || 0.001;
  return parseFloat((weight * rate).toFixed(6));
}

router.post('/event', (req, res) => {
  const {
    userId, page, project,
    visitCount, frequency, duration, interaction,
    contentDimension, depthScore, shareTrack,
    sessionId, referrer,
  } = req.body;

  if (!userId || !page || !project) {
    return res.status(400).json({ success: false, error: 'userId, page, project 必填' });
  }

  const event = {
    id: 'pws_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
    userId, page, project,
    visitCount: visitCount || 1,
    frequency: frequency || 1,
    duration: duration || 0,
    interaction: interaction || 0,
    contentDimension: contentDimension || 1,
    depthScore: depthScore || 1,
    shareTrack: shareTrack || 0,
    sessionId: sessionId || '',
    referrer: referrer || '',
    visitedAt: new Date().toISOString(),
  };

  const weightResult = _calculatePageWeight(event);
  event.weight = weightResult.totalWeight;
  event.weightDimensions = weightResult.dimensions;

  const records = readData(PAGE_SETTLE_FILE);
  records.push(event);
  if (records.length > 100000) records.splice(0, records.length - 100000);
  writeData(PAGE_SETTLE_FILE, records);

  res.json({
    success: true,
    data: {
      eventId: event.id,
      userId: event.userId,
      page: event.page,
      project: event.project,
      weight: event.weight,
      dimensions: event.weightDimensions,
      raw: weightResult.raw,
    },
  });
});

router.post('/settle', (req, res) => {
  const { userId, project, period, baseRate, channel, kolTrack } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

  const records = readData(PAGE_SETTLE_FILE);
  let filtered = records.filter(r => r.userId === userId);
  if (project) filtered = filtered.filter(r => r.project === project);

  const now = new Date();
  let start;
  if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (period === 'week') start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  else if (period === 'month') start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  else start = new Date(0);
  filtered = filtered.filter(r => new Date(r.visitedAt) >= start);

  if (filtered.length === 0) {
    return res.json({ success: true, data: { userId, totalWeight: 0, settleAmount: 0, events: 0, message: '无数据' } });
  }

  const totalWeight = filtered.reduce((s, r) => s + (r.weight || 0), 0);
  const rate = baseRate || 0.001;
  const settleAmount = _calculateSettleAmount(totalWeight, rate);

  const settleRecord = {
    id: 'pws_settle_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
    userId,
    project: project || 'all',
    period: period || 'all',
    eventCount: filtered.length,
    totalWeight: parseFloat(totalWeight.toFixed(6)),
    baseRate: rate,
    settleAmount,
    channel: channel || 'alipay',
    kolTrack: kolTrack || 'B',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: settleRecord,
  });
});

router.post('/settle/realtime', (req, res) => {
  const { userId, project, page, baseRate, channel } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

  const records = readData(PAGE_SETTLE_FILE);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let filtered = records.filter(r => r.userId === userId && new Date(r.visitedAt) >= todayStart);
  if (project) filtered = filtered.filter(r => r.project === project);
  if (page) filtered = filtered.filter(r => r.page === page);

  const totalWeight = filtered.reduce((s, r) => s + (r.weight || 0), 0);
  const rate = baseRate || 0.001;
  const settleAmount = _calculateSettleAmount(totalWeight, rate);

  const dimAgg = {};
  filtered.forEach(r => {
    if (r.weightDimensions) {
      for (const [k, v] of Object.entries(r.weightDimensions)) {
        dimAgg[k] = (dimAgg[k] || 0) + v;
      }
    }
  });

  res.json({
    success: true,
    data: {
      userId,
      project: project || 'all',
      page: page || 'all',
      period: 'today',
      eventCount: filtered.length,
      totalWeight: parseFloat(totalWeight.toFixed(6)),
      settleAmount,
      baseRate: rate,
      channel: channel || 'alipay',
      aggregatedDimensions: dimAgg,
    },
  });
});

router.get('/weight/dimensions', (req, res) => {
  res.json({ success: true, data: WEIGHT_DIMENSIONS });
});

router.post('/weight/calculate', (req, res) => {
  const weightResult = _calculatePageWeight(req.body);
  const rate = req.body.baseRate || 0.001;
  const amount = _calculateSettleAmount(weightResult.totalWeight, rate);
  res.json({
    success: true,
    data: {
      totalWeight: weightResult.totalWeight,
      dimensions: weightResult.dimensions,
      raw: weightResult.raw,
      settleAmount: amount,
      baseRate: rate,
    },
  });
});

router.get('/dashboard', (req, res) => {
  const { project } = req.query;
  const records = readData(PAGE_SETTLE_FILE);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let filtered = records;
  if (project) filtered = filtered.filter(r => r.project === project);

  const today = filtered.filter(r => new Date(r.visitedAt) >= todayStart);
  const uniqueUsers = new Set(today.map(r => r.userId)).size;
  const totalWeight = today.reduce((s, r) => s + (r.weight || 0), 0);

  res.json({
    success: true,
    data: {
      today: {
        events: today.length,
        uniqueUsers,
        totalWeight: parseFloat(totalWeight.toFixed(6)),
        estimatedSettlement: _calculateSettleAmount(totalWeight, 0.001),
      },
      topPages: Object.entries(
        today.reduce((acc, r) => { acc[r.page] = (acc[r.page] || 0) + 1; return acc; }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([page, count]) => ({ page, count })),
      topUsers: Object.entries(
        today.reduce((acc, r) => { acc[r.userId] = (acc[r.userId] || 0) + (r.weight || 0); return acc; }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([userId, weight]) => ({ userId, weight: parseFloat(weight.toFixed(6)) })),
    },
  });
});

router.get('/stats', (req, res) => {
  const records = readData(PAGE_SETTLE_FILE);
  const byProject = {};
  records.forEach(r => {
    if (!byProject[r.project]) byProject[r.project] = { events: 0, totalWeight: 0, users: new Set() };
    byProject[r.project].events++;
    byProject[r.project].totalWeight += r.weight || 0;
    byProject[r.project].users.add(r.userId);
  });
  const projectStats = Object.entries(byProject).map(([project, stats]) => ({
    project,
    events: stats.events,
    totalWeight: parseFloat(stats.totalWeight.toFixed(6)),
    uniqueUsers: stats.users.size,
    estimatedSettlement: _calculateSettleAmount(stats.totalWeight, 0.001),
  }));
  res.json({ success: true, data: { total: records.length, byProject: projectStats } });
});

module.exports = router;
