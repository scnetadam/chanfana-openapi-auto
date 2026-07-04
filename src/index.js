require('dotenv').config();

const express = require('express');
const cors = require('cors');
const glmClient = require('./glmClient');
const workerClient = require('./workerClient');

const app = express();
const PORT = process.env.PORT || 3000;

// New v1.0 routes
const activityRoutes = require('./routes/activity');
const contentRoutes = require('./routes/content');
const bookingRoutes = require('./routes/booking');
const walletRoutes = require('./routes/wallet');
const authRoutes = require('./routes/auth');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount v1.0 API routes
app.use('/api/activity', activityRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/auth', authRoutes);

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

app.listen(PORT, () => {
  console.log(`[x402-deveco] Server running on http://localhost:${PORT}`);
  console.log(`[x402-deveco] GLM API endpoint: ${process.env.GLM_API_BASE || 'not configured'}`);
  console.log(`[x402-deveco] Worker endpoint: ${process.env.WORKER_BASE_URL || 'not configured'}`);
});

module.exports = app;
