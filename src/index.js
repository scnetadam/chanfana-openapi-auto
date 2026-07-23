const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const glmClient = require('./glmClient');
const workerClient = require('./workerClient');
const { authMiddleware, optionalAuth } = require('./middleware/auth');

const app = express();
const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// HTTPS options (mkcert certs)
let httpsOptions = null;
const keyPath = './127.0.0.1+2-key.pem';
const certPath = './127.0.0.1+2.pem';
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} else {
  console.log('[guiniu-ziyu] HTTPS 证书不存在，仅启动 HTTP');
}

// v3.0 routes
const activityRoutes = require('./routes/activity');
const contentRoutes = require('./routes/content');
const bookingRoutes = require('./routes/booking');
const walletRoutes = require('./routes/wallet');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notification');
const aiRoutes = require('./routes/ai');
const bizProductRoutes = require('./routes/bizProduct');
const kolTaskRoutes = require('./routes/kolTask');
const settlementRoutes = require('./routes/settlement');
const bizRoutes = require('./routes/biz');
const kolAuditRoutes = require('./routes/kolAudit');
const opcRoutes = require('./routes/opc');
const aiToolsRoutes = require('./routes/aiTools');
const commissionRoutes = require('./routes/commission');
const hashRoutes = require('./routes/hash');
const llmRoutes = require('./routes/llm');
const agentToolRoutes = require('./routes/agentTools');
const cfsRoutes = require('./routes/cfs');
const cosRoutes = require('./routes/cos');
const contentAuditRoutes = require('./routes/contentAudit');
const adminRoutes = require('./routes/admin');
const fundVerificationRoutes = require('./routes/fundVerification');
const valueEnhanceRoutes = require('./routes/valueEnhance');
const maasRoutes = require('./routes/maas');
const videoRoutes = require('./routes/video');
const aiVideoRoutes = require('./routes/aiVideo');
const stereoRoutes = require('./routes/stereo');
const leadRoutes = require('./routes/lead');
const complianceRoutes = require('./routes/compliance');
const ecnyRoutes = require('./routes/ecny');
const invoiceRoutes = require('./routes/invoice');
const tipsRoutes = require('./routes/tips');
const kolTrackRoutes = require('./routes/kolTrack');
const contractParamsRoutes = require('./routes/contractParams');
const taxRoutes = require('./routes/tax');
const bankSimulatorRoutes = require('./routes/bankSimulator');
const dataSalesRoutes = require('./routes/dataSales');
const budgetRoutes = require('./routes/budget');
const employmentRoutes = require('./routes/employment');
const weightRoutes = require('./routes/weight');
const cloudVideoRoutes = require('./routes/cloudVideo');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({
    service: '龟钮自驭 API',
    version: '4.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
    modules: ['activity', 'content', 'booking', 'wallet', 'auth', 'kol-task', 'kol-audit', 'settlement', 'opc', 'ai-tools', 'commission', 'biz', 'hash', 'llm', 'agent-tools', 'cfs', 'cos', 'content-audit', 'admin', 'fund-verification', 'value-enhance', 'maas', 'video', 'ai-video', 'stereo', 'lead', 'compliance', 'ecny', 'invoice', 'tips', 'kol-track', 'contract-params', 'tax', 'bank', 'data-sales', 'budget', 'employment', 'weight', 'cloud-video'],
    features: ['sso', 'two-phase-settle', 'tax-state-machine', 'ai-threshold', 'idempotency', 'notary-engine', 'wallet-reserve', 'channel-capability', 'notify-channels', 'dead-letter-queue'],
    auth: 'JWT+SSO',
    environment: process.env.PAY_ENV || (process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

app.use('/api/activity', optionalAuth, activityRoutes);
app.use('/api/content', authMiddleware, contentRoutes);
app.use('/api/booking', authMiddleware, bookingRoutes);
app.use('/api/wallet', authMiddleware, walletRoutes);
app.use('/api/notification', authMiddleware, notificationRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
// 内网 AI 代理路由（无认证，仅限内网调用）
app.use('/api/ai-proxy', aiRoutes);
app.use('/api/biz-product', authMiddleware, bizProductRoutes);
app.use('/api/kol-task', authMiddleware, kolTaskRoutes);
app.use('/api/settlement', authMiddleware, settlementRoutes);
app.use('/api/biz', authMiddleware, bizRoutes);
app.use('/api/kol-audit', authMiddleware, kolAuditRoutes);
app.use('/api/opc', authMiddleware, opcRoutes);
app.use('/api/ai-tools', authMiddleware, aiToolsRoutes);
app.use('/api/biz/commission', authMiddleware, commissionRoutes);
app.use('/api/hash', authMiddleware, hashRoutes);
app.use('/api/llm', authMiddleware, llmRoutes);
app.use('/api/agent-tools', authMiddleware, agentToolRoutes);
app.use('/api/cfs', authMiddleware, cfsRoutes);
app.use('/api/cos', authMiddleware, cosRoutes);
app.use('/api/content-audit', authMiddleware, contentAuditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fund-verification', authMiddleware, fundVerificationRoutes);
app.use('/api/value-enhance', authMiddleware, valueEnhanceRoutes);
app.use('/api/maas', authMiddleware, maasRoutes);
app.use('/api/video', authMiddleware, videoRoutes);
app.use('/api/ai-video', authMiddleware, aiVideoRoutes);
app.use('/api/stereo', authMiddleware, stereoRoutes);
app.use('/api/lead', authMiddleware, leadRoutes);
app.use('/api/compliance', authMiddleware, complianceRoutes);
app.use('/api/ecny', authMiddleware, ecnyRoutes);
app.use('/api/invoice', authMiddleware, invoiceRoutes);
app.use('/api/tips', authMiddleware, tipsRoutes);
app.use('/api/kol-track', authMiddleware, kolTrackRoutes);
app.use('/api/contract-params', authMiddleware, contractParamsRoutes);
app.use('/api/tax', authMiddleware, taxRoutes);
app.use('/api/bank', authMiddleware, bankSimulatorRoutes);
app.use('/api/data-sales', authMiddleware, dataSalesRoutes);
app.use('/api/budget', authMiddleware, budgetRoutes);
app.use('/api/employment', authMiddleware, employmentRoutes);
app.use('/api/weight', authMiddleware, weightRoutes);
app.use('/api/cloud-video', optionalAuth, cloudVideoRoutes);

app.post('/api/glm/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages is required and must be an array' });
    }
    const result = await glmClient.chat(messages, model);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[GLM Chat Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/payment/create', async (req, res) => {
  try {
    const { subject, totalAmount, outTradeNo } = req.body;
    if (!subject || !totalAmount) {
      return res.status(400).json({ error: 'subject and totalAmount are required' });
    }
    const result = await workerClient.createPayment({
      subject,
      total_amount: totalAmount,
      out_trade_no: outTradeNo || require('uuid').v4(),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Payment Create Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/payment/notify', async (req, res) => {
  try {
    const notification = req.body;
    console.log('[Payment Notify]', JSON.stringify(notification));
    const verified = await workerClient.verifyNotification(notification);
    if (verified) {
      res.send('success');
    } else {
      res.status(400).send('fail');
    }
  } catch (err) {
    console.error('[Payment Notify Error]', err.message);
    res.status(500).send('fail');
  }
});

app.get('/api/payment/query', async (req, res) => {
  try {
    const { outTradeNo } = req.query;
    if (!outTradeNo) {
      return res.status(400).json({ error: 'outTradeNo is required' });
    }
    const result = await workerClient.queryPayment(outTradeNo);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Payment Query Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server(s)
const HTTP_SERVER = http.createServer(app);
HTTP_SERVER.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[guiniu-ziyu] HTTP Server running on http://0.0.0.0:${HTTP_PORT}`);
});

// 生产环境跳过 HTTPS（由nginx提供）
const isProduction = process.env.NODE_ENV === 'production';
if (httpsOptions && !isProduction) {
  https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`[guiniu-ziyu] HTTPS Server running on https://127.0.0.1:${HTTPS_PORT}`);
  });
}
console.log(`[guiniu-ziyu] GLM API endpoint: ${process.env.GLM_API_BASE || 'not configured'}`);
console.log(`[guiniu-ziyu] Worker endpoint: ${process.env.WORKER_BASE_URL || 'not configured'}`);

module.exports = app;
