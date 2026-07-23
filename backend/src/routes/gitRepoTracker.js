/**
 * 龟钮·印证 — 开源项目 GIT 仓库数据追踪路由
 * 追踪 guiniu-seal 等 GitHub 仓库数据：加权维度、开发者贡献、数据返回、用户增长、存证
 */
const express = require('express');
const router = express.Router();
const { gitRepoTracker, gitContributor, gitWeightedSettle } = require('../models/dataStore');
const crypto = require('crypto');
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API = 'https://api.github.com';
const GITHUB_ACCOUNT = '13616007538@139.com';
const GITHUB_REPO = 'guiniu-seal';
const SELF_BASE = process.env.SELF_BASE || 'http://127.0.0.1:3003';

const REPO_WEIGHT_CONFIG = {
  stars: { weight: 0.15, valuePerUnit: 0.005, maxValue: 1.0 },
  forks: { weight: 0.12, valuePerUnit: 0.008, maxValue: 0.8 },
  issues: { weight: 0.10, valuePerUnit: 0.003, maxValue: 0.5 },
  pullRequests: { weight: 0.12, valuePerUnit: 0.004, maxValue: 0.6 },
  commits: { weight: 0.15, valuePerUnit: 0.002, maxValue: 1.0 },
  contributors: { weight: 0.10, valuePerUnit: 0.01, maxValue: 0.5 },
  watchers: { weight: 0.08, valuePerUnit: 0.006, maxValue: 0.4 },
  traffic: { weight: 0.10, valuePerUnit: 0.0001, maxValue: 0.8 },
  releaseFreq: { weight: 0.05, valuePerUnit: 0.02, maxValue: 0.3 },
  codeQuality: { weight: 0.03, baseValue: 0.5, maxValue: 1.0 },
};

const CONTRIBUTOR_WEIGHT_CONFIG = {
  commitCount: { weight: 0.30, valuePerUnit: 0.01, maxValue: 1.0 },
  prCount: { weight: 0.25, valuePerUnit: 0.02, maxValue: 0.8 },
  issueResolved: { weight: 0.15, valuePerUnit: 0.015, maxValue: 0.5 },
  codeReviewCount: { weight: 0.10, valuePerUnit: 0.01, maxValue: 0.4 },
  activeDays: { weight: 0.10, valuePerUnit: 0.005, maxValue: 0.5 },
  docContribution: { weight: 0.05, valuePerUnit: 0.02, maxValue: 0.3 },
  communityImpact: { weight: 0.05, baseValue: 0.3, maxValue: 0.5 },
};

const SPLIT_CONFIG = {
  platformRate: 0.15,
  contributorRate: 0.55,
  notaryRate: 0.10,
  repoReserveRate: 0.10,
  ecosystemRate: 0.10,
};

function calcRepoWeightedScore(repoData) {
  const scores = {};
  let totalScore = 0;

  const stars = repoData.stars || 0;
  scores.stars = Math.min(stars * REPO_WEIGHT_CONFIG.stars.valuePerUnit, REPO_WEIGHT_CONFIG.stars.maxValue) * REPO_WEIGHT_CONFIG.stars.weight;

  const forks = repoData.forks || 0;
  scores.forks = Math.min(forks * REPO_WEIGHT_CONFIG.forks.valuePerUnit, REPO_WEIGHT_CONFIG.forks.maxValue) * REPO_WEIGHT_CONFIG.forks.weight;

  const issues = repoData.openIssues || 0;
  scores.issues = Math.min(issues * REPO_WEIGHT_CONFIG.issues.valuePerUnit, REPO_WEIGHT_CONFIG.issues.maxValue) * REPO_WEIGHT_CONFIG.issues.weight;

  const prs = repoData.pullRequests || 0;
  scores.pullRequests = Math.min(prs * REPO_WEIGHT_CONFIG.pullRequests.valuePerUnit, REPO_WEIGHT_CONFIG.pullRequests.maxValue) * REPO_WEIGHT_CONFIG.pullRequests.weight;

  const commits = repoData.commits || 0;
  scores.commits = Math.min(commits * REPO_WEIGHT_CONFIG.commits.valuePerUnit, REPO_WEIGHT_CONFIG.commits.maxValue) * REPO_WEIGHT_CONFIG.commits.weight;

  const contributors = repoData.contributors || 0;
  scores.contributors = Math.min(contributors * REPO_WEIGHT_CONFIG.contributors.valuePerUnit, REPO_WEIGHT_CONFIG.contributors.maxValue) * REPO_WEIGHT_CONFIG.contributors.weight;

  const watchers = repoData.watchers || 0;
  scores.watchers = Math.min(watchers * REPO_WEIGHT_CONFIG.watchers.valuePerUnit, REPO_WEIGHT_CONFIG.watchers.maxValue) * REPO_WEIGHT_CONFIG.watchers.weight;

  const traffic = repoData.traffic || 0;
  scores.traffic = Math.min(traffic * REPO_WEIGHT_CONFIG.traffic.valuePerUnit, REPO_WEIGHT_CONFIG.traffic.maxValue) * REPO_WEIGHT_CONFIG.traffic.weight;

  const releases = repoData.releaseCount || 0;
  scores.releaseFreq = Math.min(releases * REPO_WEIGHT_CONFIG.releaseFreq.valuePerUnit, REPO_WEIGHT_CONFIG.releaseFreq.maxValue) * REPO_WEIGHT_CONFIG.releaseFreq.weight;

  const quality = repoData.codeQuality || 0.5;
  scores.codeQuality = Math.min(quality, REPO_WEIGHT_CONFIG.codeQuality.maxValue) * REPO_WEIGHT_CONFIG.codeQuality.weight;

  Object.values(scores).forEach(v => { totalScore += v; });
  return { scores, totalScore: Math.min(totalScore, 5.0) };
}

function calcContributorWeightedScore(contributorData) {
  const scores = {};
  let totalScore = 0;

  const commits = contributorData.commitCount || 0;
  scores.commitCount = Math.min(commits * CONTRIBUTOR_WEIGHT_CONFIG.commitCount.valuePerUnit, CONTRIBUTOR_WEIGHT_CONFIG.commitCount.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.commitCount.weight;

  const prs = contributorData.prCount || 0;
  scores.prCount = Math.min(prs * CONTRIBUTOR_WEIGHT_CONFIG.prCount.valuePerUnit, CONTRIBUTOR_WEIGHT_CONFIG.prCount.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.prCount.weight;

  const issues = contributorData.issueResolved || 0;
  scores.issueResolved = Math.min(issues * CONTRIBUTOR_WEIGHT_CONFIG.issueResolved.valuePerUnit, CONTRIBUTOR_WEIGHT_CONFIG.issueResolved.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.issueResolved.weight;

  const reviews = contributorData.codeReviewCount || 0;
  scores.codeReviewCount = Math.min(reviews * CONTRIBUTOR_WEIGHT_CONFIG.codeReviewCount.valuePerUnit, CONTRIBUTOR_WEIGHT_CONFIG.codeReviewCount.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.codeReviewCount.weight;

  const days = contributorData.activeDays || 0;
  scores.activeDays = Math.min(days * CONTRIBUTOR_WEIGHT_CONFIG.activeDays.valuePerUnit, CONTRIBUTOR_WEIGHT_CONFIG.activeDays.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.activeDays.weight;

  const docs = contributorData.docContribution || 0;
  scores.docContribution = Math.min(docs * CONTRIBUTOR_WEIGHT_CONFIG.docContribution.valuePerUnit, CONTRIBUTOR_WEIGHT_CONFIG.docContribution.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.docContribution.weight;

  const impact = contributorData.communityImpact || 0.3;
  scores.communityImpact = Math.min(impact, CONTRIBUTOR_WEIGHT_CONFIG.communityImpact.maxValue) * CONTRIBUTOR_WEIGHT_CONFIG.communityImpact.weight;

  Object.values(scores).forEach(v => { totalScore += v; });
  return { scores, totalScore: Math.min(totalScore, 3.0) };
}

function executeSplit(amount) {
  return {
    platform: Number((amount * SPLIT_CONFIG.platformRate).toFixed(4)),
    contributor: Number((amount * SPLIT_CONFIG.contributorRate).toFixed(4)),
    notary: Number((amount * SPLIT_CONFIG.notaryRate).toFixed(4)),
    repoReserve: Number((amount * SPLIT_CONFIG.repoReserveRate).toFixed(4)),
    ecosystem: Number((amount * SPLIT_CONFIG.ecosystemRate).toFixed(4)),
  };
}

function generateHashProof(data) {
  const raw = JSON.stringify(data);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function initRepoSeed() {
  const existing = gitRepoTracker.getAll();
  if (existing.length > 0) return;

  const seed = {
    id: `repo-${GITHUB_REPO}`,
    name: GITHUB_REPO,
    fullName: `guiniu-seal/${GITHUB_REPO}`,
    owner: GITHUB_ACCOUNT,
    platform: 'github',
    description: '龟钮开源 — 去中心化数据存证与交易开源项目',
    stars: 0,
    forks: 0,
    watchers: 0,
    openIssues: 0,
    pullRequests: 0,
    commits: 0,
    contributors: 0,
    traffic: 0,
    releaseCount: 0,
    codeQuality: 0.5,
    userGrowth: [],
    snapshots: [],
    lastSyncAt: null,
    createdAt: new Date().toISOString(),
  };
  gitRepoTracker.set(seed.id, seed);
  console.log('[gitRepoTracker] 仓库种子数据初始化:', seed.id);
}

initRepoSeed();

async function fetchGitHubRepoData() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'guiniu-seal-tracker',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }

  try {
    const repoRes = await axios.get(`${GITHUB_API}/repos/${GITHUB_ACCOUNT}/${GITHUB_REPO}`, { headers, timeout: 10000 });
    const repo = repoRes.data;

    let commitCount = 0;
    try {
      const contribRes = await axios.get(`${GITHUB_API}/repos/${GITHUB_ACCOUNT}/${GITHUB_REPO}/contributors`, { headers, timeout: 10000 });
      commitCount = (contribRes.data || []).reduce((s, c) => s + (c.contributions || 0), 0);
    } catch (e) {
      console.log('[gitRepoTracker] contributors fetch fallback');
    }

    let prCount = 0;
    try {
      const prRes = await axios.get(`${GITHUB_API}/search/issues?q=repo:${GITHUB_ACCOUNT}/${GITHUB_REPO}+type:pr&per_page=1`, { headers, timeout: 10000 });
      prCount = prRes.data?.total_count || 0;
    } catch (e) {
      console.log('[gitRepoTracker] PR count fetch fallback');
    }

    let releaseCount = 0;
    try {
      const relRes = await axios.get(`${GITHUB_API}/repos/${GITHUB_ACCOUNT}/${GITHUB_REPO}/releases`, { headers, timeout: 10000 });
      releaseCount = (relRes.data || []).length;
    } catch (e) {
      console.log('[gitRepoTracker] releases fetch fallback');
    }

    return {
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      watchers: repo.subscribers_count || 0,
      openIssues: repo.open_issues_count || 0,
      contributors: (repo.network_count || 0),
      commits: commitCount,
      pullRequests: prCount,
      releaseCount,
      description: repo.description || '',
      htmlUrl: repo.html_url || '',
      updatedAt: repo.updated_at || new Date().toISOString(),
    };
  } catch (e) {
    console.log('[gitRepoTracker] GitHub API fetch error:', e.code || e.message);
    return null;
  }
}

router.post('/sync', async (req, res) => {
  try {
    const ghData = await fetchGitHubRepoData();

    if (!ghData) {
      return res.status(502).json({ success: false, error: 'GitHub API 请求失败' });
    }

  const repoId = `repo-${GITHUB_REPO}`;
  const existing = gitRepoTracker.get(repoId) || {};

  const snapshot = {
    timestamp: new Date().toISOString(),
    stars: ghData.stars,
    forks: ghData.forks,
    watchers: ghData.watchers,
    openIssues: ghData.openIssues,
    commits: ghData.commits,
    pullRequests: ghData.pullRequests,
    contributors: ghData.contributors,
    releaseCount: ghData.releaseCount,
  };

  const userGrowth = existing.userGrowth || [];
  userGrowth.push({
    date: new Date().toISOString().slice(0, 10),
    stars: ghData.stars,
    forks: ghData.forks,
    watchers: ghData.watchers,
    contributors: ghData.contributors,
  });
  if (userGrowth.length > 90) userGrowth.splice(0, userGrowth.length - 90);

  const snapshots = existing.snapshots || [];
  snapshots.push(snapshot);
  if (snapshots.length > 30) snapshots.splice(0, snapshots.length - 30);

  const updated = {
    ...existing,
    id: repoId,
    name: GITHUB_REPO,
    fullName: `${GITHUB_ACCOUNT}/${GITHUB_REPO}`,
    owner: GITHUB_ACCOUNT,
    platform: 'github',
    description: ghData.description || existing.description || '',
    htmlUrl: ghData.htmlUrl || existing.htmlUrl || '',
    stars: ghData.stars,
    forks: ghData.forks,
    watchers: ghData.watchers,
    openIssues: ghData.openIssues,
    pullRequests: ghData.pullRequests,
    commits: ghData.commits,
    contributors: ghData.contributors,
    releaseCount: ghData.releaseCount,
    codeQuality: existing.codeQuality || 0.5,
    userGrowth,
    snapshots,
    lastSyncAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { scores, totalScore } = calcRepoWeightedScore(updated);
  updated.weightedScore = totalScore;
  updated.weightScores = scores;

  gitRepoTracker.set(repoId, updated);

  res.json({
    success: true,
    data: {
      repo: updated,
      snapshot,
      weightedScore: totalScore,
      weightScores: scores,
    }
  });
  } catch (err) {
    console.error('[gitRepoTracker] sync错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/status', (req, res) => {
  try {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);

  if (!repo) {
    return res.status(404).json({ success: false, error: '仓库数据不存在，请先同步' });
  }

  const { scores, totalScore } = calcRepoWeightedScore(repo);

  res.json({
    success: true,
    data: {
      repo: {
        ...repo,
        weightedScore: totalScore,
        weightScores: scores,
      },
      lastSyncAt: repo.lastSyncAt,
      syncAge: repo.lastSyncAt ? Date.now() - new Date(repo.lastSyncAt).getTime() : null,
    }
  });
  } catch (err) {
    console.error('[gitRepoTracker] status错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/weighted-dimensions', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  const repoData = repo || {};

  const { scores, totalScore } = calcRepoWeightedScore(repoData);

  const dimensions = Object.keys(REPO_WEIGHT_CONFIG).map(key => ({
    key,
    weight: REPO_WEIGHT_CONFIG[key].weight,
    currentValue: repoData[key] || 0,
    score: scores[key] || 0,
    maxValue: REPO_WEIGHT_CONFIG[key].maxValue || 0,
    description: {
      stars: 'Star 数量，反映项目受欢迎度',
      forks: 'Fork 数量，反映项目使用与二次开发活跃度',
      issues: '开放 Issue 数量，反映社区参与度与问题反馈',
      pullRequests: 'PR 数量，反映代码贡献活跃度',
      commits: '总提交数，反映开发迭代频率',
      contributors: '贡献者数量，反映社区规模',
      watchers: '关注者数量，反映项目影响力',
      traffic: '访问流量，反映项目曝光度',
      releaseFreq: '发布频率，反映版本迭代节奏',
      codeQuality: '代码质量评分，反映项目工程化水平',
    }[key] || key,
  }));

  res.json({
    success: true,
    data: {
      dimensions,
      totalScore,
      repoName: GITHUB_REPO,
      weightConfig: REPO_WEIGHT_CONFIG,
    }
  });
});

router.post('/contributor/track', (req, res) => {
  const {
    contributorId, username, commitCount, prCount, issueResolved,
    codeReviewCount, activeDays, docContribution, communityImpact
  } = req.body;

  if (!contributorId && !username) {
    return res.status(400).json({ success: false, error: 'contributorId 或 username 为必填' });
  }

  const id = contributorId || `contrib-${username}`;
  const existing = gitContributor.get(id) || {};

  const contributor = {
    ...existing,
    id,
    username: username || existing.username || id,
    commitCount: commitCount ?? existing.commitCount ?? 0,
    prCount: prCount ?? existing.prCount ?? 0,
    issueResolved: issueResolved ?? existing.issueResolved ?? 0,
    codeReviewCount: codeReviewCount ?? existing.codeReviewCount ?? 0,
    activeDays: activeDays ?? existing.activeDays ?? 0,
    docContribution: docContribution ?? existing.docContribution ?? 0,
    communityImpact: communityImpact ?? existing.communityImpact ?? 0.3,
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString(),
  };

  const { scores, totalScore } = calcContributorWeightedScore(contributor);
  contributor.weightedScore = totalScore;
  contributor.weightScores = scores;

  gitContributor.set(id, contributor);

  res.json({
    success: true,
    data: { contributor, weightedScore: totalScore, weightScores: scores }
  });
});

router.get('/contributor/list', (req, res) => {
  const contributors = gitContributor.getAll();
  contributors.sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));

  res.json({
    success: true,
    data: {
      contributors,
      total: contributors.length,
      totalCommitCount: contributors.reduce((s, c) => s + (c.commitCount || 0), 0),
      totalPrCount: contributors.reduce((s, c) => s + (c.prCount || 0), 0),
    }
  });
});

router.get('/contributor/detail', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });

  const contributor = gitContributor.get(id);
  if (!contributor) return res.status(404).json({ success: false, error: '贡献者不存在' });

  const { scores, totalScore } = calcContributorWeightedScore(contributor);
  res.json({
    success: true,
    data: { ...contributor, weightedScore: totalScore, weightScores: scores }
  });
});

router.get('/growth', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);

  if (!repo || !repo.userGrowth || repo.userGrowth.length === 0) {
    return res.json({ success: true, data: { growthData: [], summary: null } });
  }

  const growthData = repo.userGrowth;
  const latest = growthData[growthData.length - 1];
  const earliest = growthData[0];

  const summary = {
    currentStars: latest.stars,
    currentForks: latest.forks,
    currentWatchers: latest.watchers,
    currentContributors: latest.contributors,
    starGrowth: latest.stars - earliest.stars,
    forkGrowth: latest.forks - earliest.forks,
    contributorGrowth: latest.contributors - earliest.contributors,
    growthRate: earliest.stars > 0 ? ((latest.stars - earliest.stars) / earliest.stars * 100).toFixed(2) : '0',
    periodDays: growthData.length,
  };

  res.json({ success: true, data: { growthData, summary } });
});

router.post('/settle', async (req, res) => {
  try {
  const { repoData, contributorId, contributorData } = req.body;

  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  const currentRepoData = repo || repoData || {};

  const { scores: repoScores, totalScore: repoTotalScore } = calcRepoWeightedScore(currentRepoData);
  const baseRate = req.body.baseRate || 2.0;
  const repoSettleAmount = Number((repoTotalScore * baseRate).toFixed(4));

  let contributorSettleAmount = 0;
  let contributorScores = {};
  let contributorTotalScore = 0;

  if (contributorData || contributorId) {
    const cd = contributorData || gitContributor.get(contributorId) || {};
    const result = calcContributorWeightedScore(cd);
    contributorScores = result.scores;
    contributorTotalScore = result.totalScore;
    contributorSettleAmount = Number((contributorTotalScore * baseRate * 0.5).toFixed(4));
  }

  const totalSettleAmount = Number((repoSettleAmount + contributorSettleAmount).toFixed(4));
  const splits = executeSplit(totalSettleAmount);

  const settlement = {
    id: `GIT-${Date.now()}-${(repoId).slice(-6)}`,
    repoId,
    repoName: GITHUB_REPO,
    repoSettleAmount,
    repoTotalScore,
    repoScores,
    contributorId: contributorId || null,
    contributorSettleAmount,
    contributorTotalScore,
    contributorScores,
    totalSettleAmount,
    splits,
    hashProof: '',
    notarized: false,
    status: 'settled',
    createdAt: new Date().toISOString(),
  };

  settlement.hashProof = generateHashProof({
    id: settlement.id,
    repoId,
    totalSettleAmount,
    splits,
    timestamp: settlement.createdAt,
  });

  try {
    const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
      documentType: 'git_repo_tracker_settlement',
      documentHash: settlement.hashProof,
      userId: repoId,
    }, { timeout: 5000 });
    if (notaryRes.data?.success) {
      settlement.notarized = true;
      settlement.notaryId = notaryRes.data.data?.id;
    }
  } catch (e) {
    console.log('[gitRepoTracker] notary fallback:', e.code || e.message);
  }

  gitWeightedSettle.set(settlement.id, settlement);

  res.json({ success: true, data: settlement });
  } catch (err) {
    console.error('[gitRepoTracker] settle错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/settle/records', (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  let records = gitWeightedSettle.getAll();

  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = records.length;
  const paged = records.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

  res.json({
    success: true,
    data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) }
  });
});

router.get('/settle/stats', (req, res) => {
  const records = gitWeightedSettle.getAll();

  const stats = {
    totalSettlements: records.length,
    totalAmount: records.reduce((s, r) => s + (r.totalSettleAmount || 0), 0),
    totalRepoAmount: records.reduce((s, r) => s + (r.repoSettleAmount || 0), 0),
    totalContributorAmount: records.reduce((s, r) => s + (r.contributorSettleAmount || 0), 0),
    totalPlatformFee: records.reduce((s, r) => s + (r.splits?.platform || 0), 0),
    totalContributorEarnings: records.reduce((s, r) => s + (r.splits?.contributor || 0), 0),
    totalNotaryFee: records.reduce((s, r) => s + (r.splits?.notary || 0), 0),
    totalEcosystemFee: records.reduce((s, r) => s + (r.splits?.ecosystem || 0), 0),
    notarizedCount: records.filter(r => r.notarized).length,
    avgRepoScore: records.length > 0 ? records.reduce((s, r) => s + (r.repoTotalScore || 0), 0) / records.length : 0,
    avgContributorScore: records.length > 0 ? records.reduce((s, r) => s + (r.contributorTotalScore || 0), 0) / records.length : 0,
  };

  res.json({ success: true, data: stats });
});

router.post('/notarize', async (req, res) => {
  try {
  const { repoData, hashProof } = req.body;

  const repoId = `repo-${GITHUB_REPO}`;
  const repo = repoData || gitRepoTracker.get(repoId);

  if (!repo) {
    return res.status(400).json({ success: false, error: '仓库数据不存在' });
  }

  const proof = hashProof || generateHashProof({
    repoId,
    stars: repo.stars,
    forks: repo.forks,
    commits: repo.commits,
    timestamp: new Date().toISOString(),
  });

  try {
    const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
      documentType: 'git_repo_data_certification',
      documentHash: proof,
      userId: repoId,
      metadata: {
        repoName: GITHUB_REPO,
        stars: repo.stars,
        forks: repo.forks,
        commits: repo.commits,
        contributors: repo.contributors,
      },
    }, { timeout: 5000 });

    if (notaryRes.data?.success) {
      repo.notaryId = notaryRes.data.data?.id;
      repo.notarizedAt = new Date().toISOString();
      repo.hashProof = proof;
      gitRepoTracker.set(repoId, repo);

      return res.json({
        success: true,
        data: {
          notaryId: notaryRes.data.data?.id,
          hashProof: proof,
          notarizedAt: repo.notarizedAt,
        }
      });
    }

    return res.json({ success: false, error: notaryRes.data?.error || '存证失败' });
  } catch (e) {
    console.error('[gitRepoTracker] notarize公证失败:', e.code || e.message);
    const fallbackProof = generateHashProof({ repoId, proof, fallback: true, ts: Date.now() });
    repo.hashProof = proof;
    repo.notarizedAt = new Date().toISOString();
    gitRepoTracker.set(repoId, repo);

    res.json({
      success: false,
      data: {
        notaryId: null,
        hashProof: proof,
        fallbackProof,
        notarizedAt: repo.notarizedAt,
        note: '公证服务不可达，使用本地存证',
      }
    });
  }
  } catch (err) {
    console.error('[gitRepoTracker] notarize错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/dashboard', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  const contributors = gitContributor.getAll();
  const settleRecords = gitWeightedSettle.getAll();
  const recentSettlements = settleRecords.slice(-5);

  const { scores, totalScore } = repo ? calcRepoWeightedScore(repo) : { scores: {}, totalScore: 0 };

  const dashboard = {
    repo: repo ? { ...repo, weightedScore: totalScore, weightScores: scores } : null,
    contributorCount: contributors.length,
    topContributors: contributors.sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0)).slice(0, 10),
    recentSettlements,
    settleStats: {
      total: settleRecords.length,
      totalAmount: settleRecords.reduce((s, r) => s + (r.totalSettleAmount || 0), 0),
      notarized: settleRecords.filter(r => r.notarized).length,
    },
    weightDimensions: Object.keys(REPO_WEIGHT_CONFIG).map(key => ({
      key,
      weight: REPO_WEIGHT_CONFIG[key].weight,
    })),
  };

  res.json({ success: true, data: dashboard });
});

module.exports = router;
