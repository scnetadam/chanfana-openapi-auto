const express = require('express');
const router = express.Router();
const { dataLock, gitRepoTracker, visitorBehavior, gitWeightedSettle, kolDataAsset, gitContributor } = require('../models/dataStore');
const crypto = require('crypto');
const axios = require('axios');

const SELF_BASE = process.env.SELF_BASE || 'http://127.0.0.1:3003';

const LOCK_SOURCES = {
  'git_repo': { label: 'GIT仓库数据', description: '开源项目仓库 Stars/Forks/Commits 等快照' },
  'visitor_behavior': { label: '访客行为数据', description: '访客访问、浏览、点击行为快照' },
  'weighted_settle': { label: '加权结算数据', description: '页面加权结算记录快照' },
  'kol_asset': { label: 'KOL资产数据', description: 'KOL权重指纹入表数据快照' },
  'contributor': { label: '贡献者数据', description: '开源贡献者维度评分快照' },
};

const LOCK_LEVELS = {
  snapshot: { label: '快照锁定', hashAlgo: 'sha256', expiryDays: 0, description: '数据快照锁定，生成指纹' },
  sealed: { label: '密封存证', hashAlgo: 'sha256', expiryDays: 365, description: '密封存证，对接公证' },
  permanent: { label: '永久存证', hashAlgo: 'sha512', expiryDays: 0, description: '永久链上存证，不可篡改' },
};

function collectGitRepoData() {
  return gitRepoTracker.getAll().map(repo => ({
    id: repo.id, name: repo.name, stars: repo.stars, forks: repo.forks,
    watchers: repo.watchers, openIssues: repo.openIssues, pullRequests: repo.pullRequests,
    commits: repo.commits, contributors: repo.contributors, releaseCount: repo.releaseCount,
    weightedScore: repo.weightedScore, lastSyncAt: repo.lastSyncAt,
  }));
}

function collectVisitorBehaviorData() {
  const all = visitorBehavior.getAll ? visitorBehavior.getAll() : [];
  return all.slice(-100).map(v => ({
    id: v.id, visitorId: v.visitorId, page: v.page, action: v.action,
    timestamp: v.timestamp, sessionId: v.sessionId,
  }));
}

function collectWeightedSettleData() {
  const all = gitWeightedSettle.getAll ? gitWeightedSettle.getAll() : [];
  return all.slice(-100).map(s => ({
    id: s.id, userId: s.userId, totalScore: s.totalScore,
    settleAmount: s.settleAmount, status: s.status, createdAt: s.createdAt,
  }));
}

function collectKolAssetData() {
  const all = kolDataAsset.getAll ? kolDataAsset.getAll() : [];
  return all.slice(-50).map(k => ({
    id: k.id, kolId: k.kolId, weightFingerprint: k.weightFingerprint,
    trustScore: k.trustScore, status: k.status, createdAt: k.createdAt,
  }));
}

function collectContributorData() {
  const all = gitContributor.getAll ? gitContributor.getAll() : [];
  return all.slice(-100).map(c => ({
    id: c.id, username: c.username, commitCount: c.commitCount,
    prCount: c.prCount, reviewCount: c.reviewCount, weightedScore: c.weightedScore,
  }));
}

const DATA_COLLECTORS = {
  'git_repo': collectGitRepoData,
  'visitor_behavior': collectVisitorBehaviorData,
  'weighted_settle': collectWeightedSettleData,
  'kol_asset': collectKolAssetData,
  'contributor': collectContributorData,
};

router.post('/lock', async (req, res) => {
  try {
    const { source, lockLevel, customData, customDescription, userId } = req.body;
    if (!source) return res.status(400).json({ success: false, error: 'source 为必填' });
    const validSources = Object.keys(LOCK_SOURCES);
    if (!validSources.includes(source)) return res.status(400).json({ success: false, error: `source 必须为: ${validSources.join(', ')}` });

    const level = lockLevel || 'snapshot';
    const levelConfig = LOCK_LEVELS[level];
    if (!levelConfig) return res.status(400).json({ success: false, error: `lockLevel 必须为: ${Object.keys(LOCK_LEVELS).join(', ')}` });

    const collector = DATA_COLLECTORS[source];
    const data = collector ? collector() : [];

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return res.status(400).json({ success: false, error: '当前数据源无数据可锁定' });
    }

    const timestamp = new Date().toISOString();
    const dataHash = crypto.createHash(levelConfig.hashAlgo).update(JSON.stringify(data)).digest('hex');
    const lockId = `DL-${Date.now()}-${source.slice(0, 4).toUpperCase()}`;

    const lock = {
      id: lockId, source, sourceLabel: LOCK_SOURCES[source]?.label || source,
      lockLevel: level, lockLevelLabel: levelConfig.label,
      customDescription: customDescription || LOCK_SOURCES[source]?.description || '',
      userId: userId || 'system', dataHash, dataCount: Array.isArray(data) ? data.length : 1,
      dataPreview: Array.isArray(data) ? data.slice(0, 3) : data,
      hashAlgo: levelConfig.hashAlgo, timestamp,
      expiryDate: levelConfig.expiryDays > 0 ? new Date(Date.now() + levelConfig.expiryDays * 86400000).toISOString() : null,
      notarized: false, notaryId: null, notaryHash: null, notarizedAt: null,
      status: 'locked', createdAt: timestamp,
    };

    if (level === 'sealed' || level === 'permanent') {
      try {
        const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
          txId: lockId, providerId: level === 'permanent' ? 'p003' : 'p001',
          userId: lock.userId, amount: 0,
          documentType: 'data_lock_certification', documentHash: dataHash,
        }, { timeout: 5000 });
        if (notaryRes.data?.success) {
          lock.notarized = true;
          lock.notaryId = notaryRes.data.data?.id;
          lock.notarizedAt = new Date().toISOString();
          lock.notaryHash = crypto.createHash('sha256').update(JSON.stringify({ lockId, dataHash, notaryId: lock.notaryId, timestamp })).digest('hex');
          lock.status = level === 'permanent' ? 'permanent_sealed' : 'sealed';
        }
      } catch (e) {
        lock.status = 'locked_local';
        lock.notaryError = e.message;
      }
    }

    dataLock.set(lockId, lock);
    res.json({ success: true, data: lock });
  } catch (e) {
    console.error('[dataLock] lock错误:', e);
    res.status(500).json({ success: false, error: '数据锁定失败' });
  }
});

router.post('/batch-lock', async (req, res) => {
  try {
    const { sources, lockLevel, userId } = req.body;
    if (!Array.isArray(sources) || sources.length === 0) return res.status(400).json({ success: false, error: 'sources 数组为必填' });
    const level = lockLevel || 'snapshot';
    const levelConfig = LOCK_LEVELS[level] || LOCK_LEVELS.snapshot;
    const results = [];

    for (const source of sources) {
      const collector = DATA_COLLECTORS[source];
      if (!collector) continue;
      const data = collector();
      if (!data || (Array.isArray(data) && data.length === 0)) continue;
      const timestamp = new Date().toISOString();
      const dataHash = crypto.createHash(levelConfig.hashAlgo).update(JSON.stringify(data)).digest('hex');
      const lockId = `DL-${Date.now()}-${source.slice(0, 4).toUpperCase()}-${results.length}`;
      const lock = {
        id: lockId, source, sourceLabel: LOCK_SOURCES[source]?.label || source,
        lockLevel: level, lockLevelLabel: levelConfig.label,
        userId: userId || 'system', dataHash, dataCount: Array.isArray(data) ? data.length : 1,
        hashAlgo: levelConfig.hashAlgo, timestamp,
        expiryDate: levelConfig.expiryDays > 0 ? new Date(Date.now() + levelConfig.expiryDays * 86400000).toISOString() : null,
        notarized: false, status: 'locked', createdAt: timestamp,
      };
      dataLock.set(lockId, lock);
      results.push(lock);
    }

    res.json({ success: true, data: { count: results.length, locks: results } });
  } catch (e) {
    console.error('[dataLock] batch-lock错误:', e);
    res.status(500).json({ success: false, error: '批量锁定失败' });
  }
});

router.get('/records', (req, res) => {
  try {
    const { userId, source, lockLevel, page = 1, pageSize = 20 } = req.query;
    let records = dataLock.getAll();
    if (userId) records = records.filter(r => r.userId === userId);
    if (source) records = records.filter(r => r.source === source);
    if (lockLevel) records = records.filter(r => r.lockLevel === lockLevel);
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = records.length;
    const paged = records.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[dataLock] records错误:', e);
    res.status(500).json({ success: false, error: '获取记录失败' });
  }
});

router.get('/detail', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
    const lock = dataLock.get(id);
    if (!lock) return res.status(404).json({ success: false, error: '锁定记录不存在' });
    res.json({ success: true, data: lock });
  } catch (e) {
    console.error('[dataLock] detail错误:', e);
    res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

router.post('/verify', (req, res) => {
  try {
    const { id, currentData } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
    const lock = dataLock.get(id);
    if (!lock) return res.status(404).json({ success: false, error: '锁定记录不存在' });
    const dataToVerify = currentData || (() => { const c = DATA_COLLECTORS[lock.source]; return c ? c() : null; })();
    if (!dataToVerify) return res.status(400).json({ success: false, error: '无法获取当前数据进行比对' });
    const currentHash = crypto.createHash(lock.hashAlgo).update(JSON.stringify(dataToVerify)).digest('hex');
    const match = currentHash === lock.dataHash;
    res.json({ success: true, data: { lockId: id, originalHash: lock.dataHash, currentHash, match, status: match ? 'intact' : 'changed', lockedAt: lock.timestamp, verifiedAt: new Date().toISOString(), source: lock.source } });
  } catch (e) {
    console.error('[dataLock] verify错误:', e);
    res.status(500).json({ success: false, error: '验证失败' });
  }
});

router.post('/upgrade', async (req, res) => {
  try {
    const { id, targetLevel } = req.body;
    if (!id || !targetLevel) return res.status(400).json({ success: false, error: 'id 和 targetLevel 为必填' });
    const lock = dataLock.get(id);
    if (!lock) return res.status(404).json({ success: false, error: '锁定记录不存在' });
    const levelOrder = ['snapshot', 'sealed', 'permanent'];
    if (levelOrder.indexOf(targetLevel) <= levelOrder.indexOf(lock.lockLevel)) return res.status(400).json({ success: false, error: '只能向上升级' });
    const levelConfig = LOCK_LEVELS[targetLevel];
    lock.lockLevel = targetLevel;
    lock.lockLevelLabel = levelConfig.label;
    if (targetLevel === 'sealed' || targetLevel === 'permanent') {
      try {
        const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
          txId: lock.id, providerId: targetLevel === 'permanent' ? 'p003' : 'p001',
          userId: lock.userId, amount: 0, documentType: 'data_lock_upgrade', documentHash: lock.dataHash,
        }, { timeout: 5000 });
        if (notaryRes.data?.success) {
          lock.notarized = true; lock.notaryId = notaryRes.data.data?.id;
          lock.notarizedAt = new Date().toISOString();
          lock.notaryHash = crypto.createHash('sha256').update(JSON.stringify({ lockId: lock.id, dataHash: lock.dataHash, notaryId: lock.notaryId })).digest('hex');
          lock.status = targetLevel === 'permanent' ? 'permanent_sealed' : 'sealed';
        }
      } catch (e) {
        lock.status = 'locked_local';
        lock.notaryError = e.message;
      }
    }
    lock.updatedAt = new Date().toISOString();
    dataLock.set(id, lock);
    res.json({ success: true, data: lock });
  } catch (e) {
    console.error('[dataLock] upgrade错误:', e);
    res.status(500).json({ success: false, error: '升级失败' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const records = dataLock.getAll();
    const stats = { totalLocks: records.length, bySource: {}, byLevel: {}, notarizedCount: records.filter(r => r.notarized).length, totalDataPoints: records.reduce((s, r) => s + (r.dataCount || 0), 0) };
    records.forEach(r => { stats.bySource[r.source] = (stats.bySource[r.source] || 0) + 1; stats.byLevel[r.lockLevel] = (stats.byLevel[r.lockLevel] || 0) + 1; });
    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[dataLock] stats错误:', e);
    res.status(500).json({ success: false, error: '统计失败' });
  }
});

router.get('/sources', (req, res) => {
  res.json({ success: true, data: {
    sources: Object.entries(LOCK_SOURCES).map(([key, val]) => ({ key, ...val })),
    levels: Object.entries(LOCK_LEVELS).map(([key, val]) => ({ key, ...val })),
  }});
});

module.exports = router;
