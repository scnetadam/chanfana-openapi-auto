/**
 * 龟钮·自驭 — 后端入口
 * X402 智能微支付协议
 * 纯代理模式：AI 能力通过 API 调用龟钮·自驭
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3003;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const originalMethod = req.headers['x-original-method'];
  if (originalMethod && req.method === 'POST' && originalMethod === 'GET') {
    req.method = 'GET';
    delete req.headers['x-original-method'];
  }
  next();
});

const { router: authRoutes, authMiddleware } = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const walletRoutes = require('./routes/wallet');
const agentPayRoutes = require('./routes/agentPay');
const aiRoutes = require('./routes/ai');
const gitRepoTrackerRoutes = require('./routes/gitRepoTracker');
const dataLockRoutes = require('./routes/dataLock');
const { router: notificationRoutes } = require('./routes/notification');
const settleRoutes = require('./routes/settle');
const notaryRoutes = require('./routes/notary');
const governanceRoutes = require('./routes/governance');
const dataMarketRoutes = require('./routes/dataMarket');
const dataConsentRoutes = require('./routes/dataConsent');
const dataEarningsRoutes = require('./routes/dataEarnings');
const visitorBehaviorRoutes = require('./routes/visitorBehavior');
const pageWeightedSettleRoutes = require('./routes/pageWeightedSettle');
const weightedValuationRoutes = require('./routes/weightedValuation');
const gseHashAnchorRoutes = require('./routes/gseHashAnchor');
const kolDataAssetRoutes = require('./routes/kolDataAsset');
const ccipMappingRoutes = require('./routes/ccipMapping');
const dualAnchorRoutes = require('./routes/dualAnchor');
const decentralizedStorageRoutes = require('./routes/decentralizedStorage');
const orchestratorRoutes = require('./orchestrator/route');
const seedEngineRoutes = require('./seed-engine/route');
const collectorRoutes = require('./routes/collector');
const budgetRoutes = require('./routes/budget');
const kolRoutes = require('./routes/kol');
const creditPointsRoutes = require('./routes/creditPoints');
const pageTrackerRoutes = require('./routes/pageTracker');
const contentCenterRoutes = require('./routes/contentCenter');
const onboardingRoutes = require('./routes/onboarding');
const crossProjectRoutes = require('./routes/coordinator');
const contractVerifyRoutes = require('./routes/contractVerify');
const umbrellaSplitRoutes = require('./routes/umbrellaSplit');
const clueRoutes = require('./routes/clue');
const kolEngineRoutes = require('./routes/kolEngine');
const sentimentRoutes = require('./routes/sentiment');
const merchantRoutes = require('./routes/merchant');
const reportRoutes = require('./routes/report');
const systemRoutes = require('./routes/system');
const videoRoutes = require('./routes/video');
const { requestLogger } = require('./middleware/common');

app.use(requestLogger);

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/sso/verify',
  '/api/auth/verify',
  '/api/health',
  '/api/onboarding/register',
  '/api/onboarding/kyc/submit',
  '/api/settle/notify',
  '/api/settle/channels',
  '/api/data-market/list',
  '/api/data-market/categories',
  '/api/governance/dashboard',
  '/api/governance/compliance',
  '/api/gse-hash-anchor/status',
  '/api/gse-hash-anchor/products',
  '/api/kol-data-asset/status',
  '/api/ccip-mapping/status',
  '/api/dual-anchor/status',
  '/api/decentralized-storage/status',
  '/api/orchestrator/status',
  '/api/sentiment/dashboard',
  '/api/sentiment/trending',
  '/api/sentiment/topics',
  '/api/sentiment/sentiment-labels',
  '/api/kol-engine/ranking',
  '/api/kol-engine/ranking/tiers',
  '/api/kol-engine/dimension-weights',
  '/api/kol-engine/cheat-patterns',
  '/api/merchant/statuses',
  '/api/clue/sources',
  '/api/clue/statuses',
  '/api/report/overview',
  '/api/system/info',
  '/api/system/config',
  '/api/kol/platforms',
  '/api/kol/categories',
  '/api/kol/statuses',
  '/api/kol/rank',
  '/api/kol/list',
  '/api/kol/stats',
  '/api/ai/intro',
  '/api/ai/quick-commands',
  '/api/ai/health',
  '/api/system/announcements',
  '/api/report/overview',
  '/api/report/financial',
  '/api/report/kol-performance',
  '/api/report/merchant-performance',
  '/api/sentiment/dashboard',
  '/api/merchant/statuses',
  '/api/merchant/list',
  '/api/video/status',
];

app.use('/api', (req, res, next) => {
  const reqPath = req.path;
  const isPublic = PUBLIC_PATHS.some(p => {
    const normalized = p.replace('/api', '');
    return reqPath === normalized || reqPath === p || reqPath.startsWith(normalized + '/');
  });
  if (isPublic) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  const { _verifyJwt } = require('./routes/auth');
  const token = authHeader.slice(7);
  const result = _verifyJwt(token);
  if (!result.valid) {
    return res.status(401).json({ success: false, error: `认证失败: ${result.error}` });
  }

  req.user = result.payload;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/agent-pay', agentPayRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/git-repo', gitRepoTrackerRoutes);
app.use('/api/data-lock', dataLockRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/settle', settleRoutes);
app.use('/api/notary', notaryRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/data-market', dataMarketRoutes);
app.use('/api/data-consent', dataConsentRoutes);
app.use('/api/data-earnings', dataEarningsRoutes);
app.use('/api/visitor-behavior', visitorBehaviorRoutes);
app.use('/api/page-weighted-settle', pageWeightedSettleRoutes);
app.use('/api/weighted-valuation', weightedValuationRoutes);
app.use('/api/gse-hash-anchor', gseHashAnchorRoutes);
app.use('/api/kol-data-asset', kolDataAssetRoutes);
app.use('/api/ccip-mapping', ccipMappingRoutes);
app.use('/api/dual-anchor', dualAnchorRoutes);
app.use('/api/decentralized-storage', decentralizedStorageRoutes);
app.use('/api/orchestrator', orchestratorRoutes);
app.use('/api/seed', seedEngineRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/kol', kolRoutes);
app.use('/api/credits', creditPointsRoutes);
app.use('/api/page-track', pageTrackerRoutes);
app.use('/api/content-center', contentCenterRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/cross-project', crossProjectRoutes);
app.use('/api/contract-verify', contractVerifyRoutes);
app.use('/api/umbrella-split', umbrellaSplitRoutes);
app.use('/api/clue', clueRoutes);
app.use('/api/kol-engine', kolEngineRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/video', videoRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, project: 'guiniu-deveco', version: '3.3.0', status: 'running',       features: ['sso', 'two-phase-settle', 'channel-capability', 'collector-agent', 'ai-threshold', 'wallet-reserve', 'idempotency', 'dead-letter-queue', 'tax-state-machine', 'notary-engine', 'weighted-valuation', 'page-weighted-settle', 'visitor-behavior', 'data-lock', 'git-repo-tracker', 'collector', 'budget', 'kol', 'credit-points', 'page-tracker', 'content-center', 'onboarding', 'kyc', 'payment-backends', 'cross-project-coordinator', 'contract-verify', 'umbrella-split', 'auth-middleware', 'protocol-persistence', 'clue-management', 'kol-influence-engine', 'sentiment-analysis', 'data-market-v3', 'batch-settle', 'auto-reconciliation', 'merchant-workbench', 'report-analytics', 'system-config', 'audit-log', 'wallet-topup-withdraw-transfer', 'kol-full-management', 'ai-auto-brand-kol'] });
});

app.use((err, req, res, _next) => {
  console.error('[龟钮自驭] 错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[龟钮自驭] 后端服务启动: http://0.0.0.0:${PORT}`);
  console.log(`[龟钮自驭] 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`[龟钮自驭] 认证中间件: 已启用 (公开路径 ${PUBLIC_PATHS.length} 个)`);
  console.log(`[龟钮自驭] AI 服务代理: ${process.env.AI_SERVICE_URL || 'http://localhost:80'}`);
});

module.exports = app;
