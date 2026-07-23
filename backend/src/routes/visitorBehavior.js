/**
 * 龟钮·印证 — 访问行为采集路由
 * 采集用户对龟钮三个项目页面的访问行为数据
 * 维度：页面算力、频次、时长、内容深度、互动、了解深度、分享追踪、跨项目访问
 */
const express = require('express');
const router = express.Router();
const { visitorBehavior } = require('../models/dataStore');
const crypto = require('crypto');

function calcSessionFingerprint(userId, pageId, timestamp) {
  const raw = `${userId}:${pageId}:${timestamp}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function calcContentDepthScore(pageId, pageType) {
  const depthMap = {
    'home': 0.3,
    'governance': 0.8,
    'dataMarket': 0.7,
    'dataEarnings': 0.6,
    'notary': 0.9,
    'gseHashAnchor': 0.95,
    'dualAnchor': 0.9,
    'kolDataAsset': 0.85,
    'ccipMapping': 0.8,
    'dataConsent': 0.7,
    'decentralizedStorage': 0.75,
    'ai-chat': 0.5,
    'profile': 0.4,
  };
  return depthMap[pageId] || depthMap[pageType] || 0.5;
}

function calcPlatformDepthScore(visitCount, uniquePages, crossProjectCount) {
  let score = 0;
  score += Math.min(visitCount * 0.02, 0.3);
  score += Math.min(uniquePages * 0.05, 0.3);
  score += Math.min(crossProjectCount * 0.1, 0.4);
  return Math.min(score, 1.0);
}

function calcFrequencyDecay(dailyCount) {
  if (dailyCount <= 3) return 1.0;
  if (dailyCount <= 10) return 0.8;
  if (dailyCount <= 30) return 0.5;
  return 0.3;
}

router.post('/track', (req, res) => {
  const {
    userId, pageId, pageType, project,
    duration, interactions, shareChain,
    referrer, referrerProject
  } = req.body;

  if (!userId || !pageId) {
    return res.status(400).json({ success: false, error: 'userId 和 pageId 为必填' });
  }

  const validProjects = ['guiniu-zy', 'guiniu-yx', 'guiniu-yz'];
  const proj = validProjects.includes(project) ? project : 'guiniu-yz';

  const today = new Date().toISOString().slice(0, 10);
  const userKey = `${userId}:${today}:${proj}`;

  let userBehavior = visitorBehavior.get(userKey);
  if (!userBehavior) {
    userBehavior = {
      id: userKey,
      userId,
      date: today,
      project: proj,
      visits: [],
      totalDuration: 0,
      totalInteractions: 0,
      uniquePages: new Set(),
      dailyCount: 0,
      crossProjectVisits: 0,
      shareChainRefs: [],
      createdAt: new Date().toISOString(),
    };
  }

  const visit = {
    sessionId: calcSessionFingerprint(userId, pageId, Date.now()),
    pageId,
    pageType: pageType || pageId,
    duration: duration || 0,
    interactions: interactions || 0,
    contentDepth: calcContentDepthScore(pageId, pageType),
    timestamp: new Date().toISOString(),
    referrer: referrer || '',
    referrerProject: referrerProject || '',
    isCrossProject: !!(referrerProject && referrerProject !== proj),
  };

  userBehavior.visits.push(visit);
  userBehavior.totalDuration += visit.duration;
  userBehavior.totalInteractions += visit.interactions;
  userBehavior.uniquePages.add(pageId);
  userBehavior.dailyCount += 1;
  if (visit.isCrossProject) {
    userBehavior.crossProjectVisits += 1;
  }
  if (shareChain && shareChain.length > 0) {
    userBehavior.shareChainRefs = userBehavior.shareChainRefs.concat(shareChain);
  }

  const uniquePagesArr = Array.from(userBehavior.uniquePages);
  const platformDepth = calcPlatformDepthScore(
    userBehavior.dailyCount,
    uniquePagesArr.length,
    userBehavior.crossProjectVisits
  );
  const freqDecay = calcFrequencyDecay(userBehavior.dailyCount);

  userBehavior.uniquePages = uniquePagesArr;
  userBehavior.platformDepthScore = platformDepth;
  userBehavior.frequencyDecay = freqDecay;
  userBehavior.updatedAt = new Date().toISOString();

  visitorBehavior.set(userKey, userBehavior);

  res.json({
    success: true,
    data: {
      sessionId: visit.sessionId,
      dailyCount: userBehavior.dailyCount,
      frequencyDecay: freqDecay,
      contentDepth: visit.contentDepth,
      platformDepth: platformDepth,
      crossProjectVisits: userBehavior.crossProjectVisits,
    }
  });
});

router.get('/summary', (req, res) => {
  const { userId, date, project } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const today = date || new Date().toISOString().slice(0, 10);
  const allData = visitorBehavior.getAll();
  const userRecords = allData.filter(r =>
    r.userId === userId && r.date === today &&
    (!project || r.project === project)
  );

  const summary = {
    userId,
    date: today,
    totalVisits: 0,
    totalDuration: 0,
    totalInteractions: 0,
    uniquePages: 0,
    crossProjectVisits: 0,
    projectBreakdown: {},
    platformDepthScore: 0,
  };

  userRecords.forEach(r => {
    summary.totalVisits += r.dailyCount || r.visits?.length || 0;
    summary.totalDuration += r.totalDuration || 0;
    summary.totalInteractions += r.totalInteractions || 0;
    summary.crossProjectVisits += r.crossProjectVisits || 0;
    if (!summary.projectBreakdown[r.project]) {
      summary.projectBreakdown[r.project] = { visits: 0, duration: 0, interactions: 0 };
    }
    summary.projectBreakdown[r.project].visits += r.dailyCount || 0;
    summary.projectBreakdown[r.project].duration += r.totalDuration || 0;
    summary.projectBreakdown[r.project].interactions += r.totalInteractions || 0;
  });

  const allUniquePages = new Set();
  userRecords.forEach(r => {
    (r.uniquePages || []).forEach(p => allUniquePages.add(p));
  });
  summary.uniquePages = allUniquePages.size;
  summary.platformDepthScore = calcPlatformDepthScore(
    summary.totalVisits,
    summary.uniquePages,
    summary.crossProjectVisits
  );

  res.json({ success: true, data: summary });
});

router.get('/cross-project', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const allData = visitorBehavior.getAll();
  const userRecords = allData.filter(r => r.userId === userId);

  const crossProject = {
    userId,
    projects: {},
    totalCrossVisits: 0,
    crossProjectPaths: [],
  };

  const validProjects = ['guiniu-zy', 'guiniu-yx', 'guiniu-yz'];
  validProjects.forEach(p => {
    const projRecords = userRecords.filter(r => r.project === p);
    crossProject.projects[p] = {
      totalVisits: projRecords.reduce((s, r) => s + (r.dailyCount || 0), 0),
      totalDuration: projRecords.reduce((s, r) => s + (r.totalDuration || 0), 0),
    };
  });

  userRecords.forEach(r => {
    if (r.visits) {
      r.visits.forEach(v => {
        if (v.isCrossProject && v.referrerProject) {
          crossProject.crossProjectPaths.push({
            from: v.referrerProject,
            to: r.project,
            pageId: v.pageId,
            timestamp: v.timestamp,
          });
          crossProject.totalCrossVisits += 1;
        }
      });
    }
  });

  res.json({ success: true, data: crossProject });
});

module.exports = router;
