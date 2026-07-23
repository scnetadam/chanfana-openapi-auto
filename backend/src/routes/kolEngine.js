const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  kolRegistrations, kolContracts, kolRankings, kolAntiCheat,
  clues, creditPoints, payments, wallets, settleOrders,
} = require('../models/dataStore');

const RANK_TIERS = [
  { name: 'S+', minScore: 90, icon: 'crown', color: '#FFD700', commissionCap: 0.50 },
  { name: 'S', minScore: 75, icon: 'star', color: '#FF6B00', commissionCap: 0.40 },
  { name: 'A+', minScore: 60, icon: 'diamond', color: '#9B59B6', commissionCap: 0.35 },
  { name: 'A', minScore: 45, icon: 'gem', color: '#3498DB', commissionCap: 0.30 },
  { name: 'B+', minScore: 30, icon: 'shield', color: '#2ECC71', commissionCap: 0.25 },
  { name: 'B', minScore: 15, icon: 'medal', color: '#95A5A6', commissionCap: 0.20 },
  { name: 'C', minScore: 0, icon: 'leaf', color: '#BDC3C7', commissionCap: 0.10 },
];

const DIMENSION_WEIGHTS = {
  salesPerformance: 0.25,
  contentQuality: 0.20,
  audienceEngagement: 0.15,
  conversionEfficiency: 0.15,
  complianceScore: 0.10,
  platformActivity: 0.08,
  referralPerformance: 0.07,
};

function calcDimensionScores(kol, recentPayments, recentClues) {
  const salesCount = kol.salesCount || 0;
  const salesFactor = Math.min(1.0, salesCount / 100);
  const totalEarnings = kol.totalEarnings || 0;
  const earningsFactor = Math.min(1.0, totalEarnings / 50000);

  const qualityScore = Math.min(1.0, (kol.dataQuality || 1.0) / 2.0);
  const verifiedContent = kol.verifiedContent || 0;
  const contentFactor = Math.min(1.0, qualityScore * 0.6 + Math.min(1.0, verifiedContent / 20) * 0.4);

  const followers = kol.followers || 0;
  const avgEngagement = kol.avgEngagement || 0;
  const engagementFactor = Math.min(1.0, (avgEngagement / 10) * 0.6 + Math.min(1.0, followers / 100000) * 0.4);

  const referralCount = kol.referralCount || 0;
  const conversionCount = kol.conversionCount || 0;
  const convRate = referralCount > 0 ? conversionCount / referralCount : 0;
  const conversionFactor = Math.min(1.0, convRate * 0.5 + Math.min(1.0, conversionCount / 20) * 0.5);

  const complianceWeight = kol.complianceWeight || 0.3;
  const noPenalties = !(kol.penaltyFlags && kol.penaltyFlags.length > 0);
  const complianceFactor = complianceWeight * 0.7 + (noPenalties ? 0.3 : 0);

  const activityDays = kol.activityDays || 0;
  const recentPosts = kol.recentPosts || 0;
  const activityFactor = Math.min(1.0, (Math.min(1.0, activityDays / 30) * 0.5 + Math.min(1.0, recentPosts / 15) * 0.5));

  const refFactor = Math.min(1.0, Math.min(1.0, referralCount / 50) * 0.6 + Math.min(1.0, (totalEarnings / 10000)) * 0.4);

  return {
    salesPerformance: parseFloat((salesFactor * 0.5 + earningsFactor * 0.5).toFixed(4)),
    contentQuality: parseFloat(contentFactor.toFixed(4)),
    audienceEngagement: parseFloat(engagementFactor.toFixed(4)),
    conversionEfficiency: parseFloat(conversionFactor.toFixed(4)),
    complianceScore: parseFloat(complianceFactor.toFixed(4)),
    platformActivity: parseFloat(activityFactor.toFixed(4)),
    referralPerformance: parseFloat(refFactor.toFixed(4)),
  };
}

function calcTotalScore(dimensions) {
  let total = 0;
  Object.entries(DIMENSION_WEIGHTS).forEach(([dim, weight]) => {
    total += (dimensions[dim] || 0) * weight;
  });
  return Math.round(total * 100);
}

function getRankTier(score) {
  for (const tier of RANK_TIERS) {
    if (score >= tier.minScore) return tier;
  }
  return RANK_TIERS[RANK_TIERS.length - 1];
}

const CHEAT_PATTERNS = {
  MUTUAL_BRUSH: 'mutual_brush',
  FAKE_FOLLOWERS: 'fake_followers',
  CONTENT_PLAGIARISM: 'content_plagiarism',
  ABNORMAL_FREQUENCY: 'abnormal_frequency',
  SELF_PURCHASE: 'self_purchase',
  COORDINATED_BEHAVIOR: 'coordinated_behavior',
};

function detectAnomalies(kol, recentPayments, recentClues) {
  const alerts = [];
  const now = Date.now();
  const oneDay = 86400000;

  const todayPayments = recentPayments.filter(p => (now - new Date(p.createdAt).getTime()) < oneDay);
  if (todayPayments.length >= 20) {
    alerts.push({
      pattern: CHEAT_PATTERNS.ABNORMAL_FREQUENCY,
      severity: 'high',
      message: `单日交易${todayPayments.length}笔，超过阈值20笔`,
      data: { count: todayPayments.length, threshold: 20 },
    });
  }

  const sameIpPayments = recentPayments.filter(p => {
    return p.payerIp && p.payerIp === kol.lastKnownIp;
  });
  if (sameIpPayments.length >= 3) {
    alerts.push({
      pattern: CHEAT_PATTERNS.SELF_PURCHASE,
      severity: 'critical',
      message: `同IP交易${sameIpPayments.length}笔，疑似自购`,
      data: { count: sameIpPayments.length },
    });
  }

  const referralClues = recentClues.filter(c => c.kolReferralId === kol.userId || c.kolReferralId === kol.id);
  const instantConverts = referralClues.filter(c => {
    if (!c.convertedAt || !c.createdAt) return false;
    return (new Date(c.convertedAt).getTime() - new Date(c.createdAt).getTime()) < 60000;
  });
  if (instantConverts.length >= 3) {
    alerts.push({
      pattern: CHEAT_PATTERNS.COORDINATED_BEHAVIOR,
      severity: 'high',
      message: `${instantConverts.length}个推荐线索1分钟内成交，疑似协同刷单`,
      data: { count: instantConverts.length },
    });
  }

  const followerGrowth = kol.followerGrowthRate || 0;
  if (followerGrowth > 0.5 && (kol.followers || 0) > 10000) {
    alerts.push({
      pattern: CHEAT_PATTERNS.FAKE_FOLLOWERS,
      severity: 'medium',
      message: `粉丝增速${(followerGrowth * 100).toFixed(1)}%异常偏高，疑似假粉`,
      data: { growthRate: followerGrowth },
    });
  }

  const engagementRatio = (kol.avgEngagement || 0) / Math.max(1, (kol.followers || 1) / 1000);
  if (engagementRatio > 0.15 && (kol.followers || 0) > 5000) {
    alerts.push({
      pattern: CHEAT_PATTERNS.MUTUAL_BRUSH,
      severity: 'medium',
      message: `互动率${(engagementRatio * 100).toFixed(1)}%异常偏高，疑似互刷`,
      data: { engagementRatio },
    });
  }

  return alerts;
}

router.post('/anti-cheat/check', (req, res) => {
  try {
    const { kolId } = req.body;
    if (!kolId) return res.status(400).json({ success: false, error: 'kolId 必填' });

    const kol = kolRegistrations.get(kolId) || kolRegistrations.findOne(k => k.userId === kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL不存在' });

    const recentPayments = payments.getAll().filter(p =>
      p.payeeId === kol.userId || p.payeeId === kol.id
    ).slice(-50);

    const recentClues = clues.getAll().filter(c =>
      c.kolReferralId === kol.userId || c.kolReferralId === kol.id
    );

    const alerts = detectAnomalies(kol, recentPayments, recentClues);

    const checkId = 'ac_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const checkRecord = {
      id: checkId,
      kolId: kol.id,
      kolUserId: kol.userId,
      alerts,
      alertCount: alerts.length,
      riskLevel: alerts.some(a => a.severity === 'critical') ? 'critical'
        : alerts.some(a => a.severity === 'high') ? 'high'
        : alerts.some(a => a.severity === 'medium') ? 'medium' : 'low',
      checkedAt: new Date().toISOString(),
    };
    kolAntiCheat.set(checkId, checkRecord);

    if (alerts.length > 0) {
      kolRegistrations.withLock(kol.id, (item) => {
        item.penaltyFlags = item.penaltyFlags || [];
        alerts.forEach(a => {
          if (!item.penaltyFlags.includes(a.pattern)) {
            item.penaltyFlags.push(a.pattern);
          }
        });
        item.lastCheatCheck = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        return item;
      });
    }

    res.json({ success: true, data: checkRecord });
  } catch (e) {
    console.error('[kol-engine] anti-cheat/check错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/anti-cheat/batch-check', (req, res) => {
  try {
    const { kolIds } = req.body;
    if (!kolIds || !Array.isArray(kolIds)) {
      return res.status(400).json({ success: false, error: 'kolIds 数组必填' });
    }

    const results = [];
    kolIds.forEach(kolId => {
      const kol = kolRegistrations.get(kolId) || kolRegistrations.findOne(k => k.userId === kolId);
      if (!kol) { results.push({ kolId, status: 'not_found' }); return; }

      const recentPayments = payments.getAll().filter(p => p.payeeId === kol.userId || p.payeeId === kol.id).slice(-50);
      const recentClues = clues.getAll().filter(c => c.kolReferralId === kol.userId || c.kolReferralId === kol.id);
      const alerts = detectAnomalies(kol, recentPayments, recentClues);

      const checkId = 'ac_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      const record = {
        id: checkId, kolId: kol.id, kolUserId: kol.userId,
        alerts, alertCount: alerts.length,
        riskLevel: alerts.some(a => a.severity === 'critical') ? 'critical'
          : alerts.some(a => a.severity === 'high') ? 'high'
          : alerts.some(a => a.severity === 'medium') ? 'medium' : 'low',
        checkedAt: new Date().toISOString(),
      };
      kolAntiCheat.set(checkId, record);
      results.push(record);
    });

    res.json({ success: true, data: { checked: results.length, results } });
  } catch (e) {
    console.error('[kol-engine] anti-cheat/batch-check错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/anti-cheat/alerts', (req, res) => {
  try {
    const { kolId, riskLevel, severity, page = 1, pageSize = 20 } = req.query;
    let records = kolAntiCheat.getAll();
    if (kolId) records = records.filter(r => r.kolId === kolId || r.kolUserId === kolId);
    if (riskLevel) records = records.filter(r => r.riskLevel === riskLevel);
    records.sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt));
    const total = records.length;
    const paged = records.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[kol-engine] anti-cheat/alerts错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/anti-cheat/clear-flag', (req, res) => {
  try {
    const { kolId, pattern, reason } = req.body;
    if (!kolId || !pattern) return res.status(400).json({ success: false, error: 'kolId 和 pattern 必填' });

    const kol = kolRegistrations.get(kolId) || kolRegistrations.findOne(k => k.userId === kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL不存在' });

    kolRegistrations.withLock(kol.id, (item) => {
      item.penaltyFlags = (item.penaltyFlags || []).filter(f => f !== pattern);
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: { kolId: kol.id, cleared: pattern, reason: reason || 'manual_clear' } });
  } catch (e) {
    console.error('[kol-engine] anti-cheat/clear-flag错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/score/calculate', (req, res) => {
  try {
    const { kolId } = req.body;
    if (!kolId) return res.status(400).json({ success: false, error: 'kolId 必填' });

    const kol = kolRegistrations.get(kolId) || kolRegistrations.findOne(k => k.userId === kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL不存在' });

    const recentPayments = payments.getAll().filter(p => p.payeeId === kol.userId || p.payeeId === kol.id).slice(-50);
    const recentClues = clues.getAll().filter(c => c.kolReferralId === kol.userId || c.kolReferralId === kol.id);

    const dimensions = calcDimensionScores(kol, recentPayments, recentClues);
    const totalScore = calcTotalScore(dimensions);
    const tier = getRankTier(totalScore);

    const oldWeight = kol.weight;
    const newWeight = parseFloat(Math.max(0.1, Math.min(10.0, totalScore / 10)).toFixed(2));

    kolRegistrations.withLock(kol.id, (item) => {
      item.weight = newWeight;
      item.level = RANK_TIERS.indexOf(tier) + 1;
      item.score = totalScore;
      item.scoreDimensions = dimensions;
      item.tier = tier.name;
      item.commissionCap = tier.commissionCap;
      item.weightHistory = item.weightHistory || [];
      item.weightHistory.push({
        old: oldWeight, new: newWeight, score: totalScore, tier: tier.name,
        at: new Date().toISOString(), reason: '综合评分更新',
      });
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({
      success: true,
      data: {
        kolId: kol.id,
        kolName: kol.name || kol.id,
        oldWeight,
        newWeight,
        totalScore,
        tier: tier.name,
        tierIcon: tier.icon,
        tierColor: tier.color,
        commissionCap: tier.commissionCap,
        dimensions,
        dimensionWeights: DIMENSION_WEIGHTS,
      },
    });
  } catch (e) {
    console.error('[kol-engine] score/calculate错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/score/batch-calculate', (req, res) => {
  try {
    const { kolIds } = req.body;
    const targetKols = kolIds && Array.isArray(kolIds)
      ? kolIds.map(id => kolRegistrations.get(id) || kolRegistrations.findOne(k => k.userId === id)).filter(Boolean)
      : kolRegistrations.getAll();

    const results = [];
    targetKols.forEach(kol => {
      const recentPayments = payments.getAll().filter(p => p.payeeId === kol.userId || p.payeeId === kol.id).slice(-50);
      const recentClues = clues.getAll().filter(c => c.kolReferralId === kol.userId || c.kolReferralId === kol.id);
      const dimensions = calcDimensionScores(kol, recentPayments, recentClues);
      const totalScore = calcTotalScore(dimensions);
      const tier = getRankTier(totalScore);
      const newWeight = parseFloat(Math.max(0.1, Math.min(10.0, totalScore / 10)).toFixed(2));

      kolRegistrations.withLock(kol.id, (item) => {
        item.weight = newWeight;
        item.level = RANK_TIERS.indexOf(tier) + 1;
        item.score = totalScore;
        item.scoreDimensions = dimensions;
        item.tier = tier.name;
        item.commissionCap = tier.commissionCap;
        item.updatedAt = new Date().toISOString();
        return item;
      });

      results.push({
        kolId: kol.id, kolName: kol.name || kol.id,
        totalScore, tier: tier.name, weight: newWeight,
      });
    });

    results.sort((a, b) => b.totalScore - a.totalScore);
    res.json({ success: true, data: { calculated: results.length, results } });
  } catch (e) {
    console.error('[kol-engine] score/batch-calculate错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/ranking', (req, res) => {
  try {
    const { category, platform, period = 'all', limit = 50 } = req.query;
    let allKols = kolRegistrations.getAll();

    if (category) allKols = allKols.filter(k => k.category === category);
    if (platform) allKols = allKols.filter(k => k.platform === platform);

    allKols.forEach(kol => {
      if (!kol.score) {
        const dimensions = calcDimensionScores(kol, [], []);
        kol.score = calcTotalScore(dimensions);
        kol.tier = getRankTier(kol.score).name;
      }
    });

    allKols.sort((a, b) => (b.score || 0) - (a.score || 0));

    const ranked = allKols.slice(0, Number(limit)).map((kol, index) => {
      const tier = getRankTier(kol.score || 0);
      return {
        rank: index + 1,
        kolId: kol.id,
        kolName: kol.name || kol.id,
        avatar: kol.avatar || '',
        platform: kol.platform,
        category: kol.category,
        score: kol.score || 0,
        tier: tier.name,
        tierIcon: tier.icon,
        tierColor: tier.color,
        weight: kol.weight,
        salesCount: kol.salesCount || 0,
        totalEarnings: kol.totalEarnings || 0,
        dataQuality: kol.dataQuality || 1.0,
        referralCount: kol.referralCount || 0,
        conversionCount: kol.conversionCount || 0,
        penaltyFlags: kol.penaltyFlags || [],
      };
    });

    const rankId = 'rank_' + Date.now().toString(36);
    kolRankings.set(rankId, {
      id: rankId,
      period,
      category: category || 'all',
      platform: platform || 'all',
      totalRanked: ranked.length,
      generatedAt: new Date().toISOString(),
      topKols: ranked.slice(0, 10),
    });

    res.json({ success: true, data: { rankings: ranked, total: ranked.length, period } });
  } catch (e) {
    console.error('[kol-engine] ranking错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/ranking/tiers', (req, res) => {
  res.json({ success: true, data: RANK_TIERS });
});

router.get('/profile/:kolId', (req, res) => {
  try {
    const kol = kolRegistrations.get(req.params.kolId)
      || kolRegistrations.findOne(k => k.userId === req.params.kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL不存在' });

    const recentPayments = payments.getAll().filter(p => p.payeeId === kol.userId || p.payeeId === kol.id).slice(-50);
    const recentClues = clues.getAll().filter(c => c.kolReferralId === kol.userId || c.kolReferralId === kol.id);
    const dimensions = calcDimensionScores(kol, recentPayments, recentClues);
    const totalScore = calcTotalScore(dimensions);
    const tier = getRankTier(totalScore);
    const cheatRecord = kolAntiCheat.find(r => r.kolId === kol.id || r.kolUserId === kol.userId);
    const latestCheck = cheatRecord.length > 0
      ? cheatRecord.sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt))[0]
      : null;
    const contracts = kolContracts.find(c => c.kolUserId === kol.userId || c.kolUserId === kol.id);

    res.json({
      success: true,
      data: {
        ...kol,
        score: totalScore,
        dimensions,
        dimensionWeights: DIMENSION_WEIGHTS,
        tier: tier.name,
        tierIcon: tier.icon,
        tierColor: tier.color,
        commissionCap: tier.commissionCap,
        recentPaymentsCount: recentPayments.length,
        referralCluesCount: recentClues.length,
        convertedClues: recentClues.filter(c => c.status === 'converted').length,
        cheatCheck: latestCheck,
        contracts,
      },
    });
  } catch (e) {
    console.error('[kol-engine] profile错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/dimension-weights', (req, res) => {
  res.json({ success: true, data: DIMENSION_WEIGHTS });
});

router.get('/cheat-patterns', (req, res) => {
  res.json({ success: true, data: CHEAT_PATTERNS });
});

module.exports = router;
