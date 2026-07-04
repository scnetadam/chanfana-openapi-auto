const axios = require('axios');

const WORKER_BASE_URL = process.env.WORKER_BASE_URL || '';
const WORKER_AUTH_TOKEN = process.env.WORKER_AUTH_TOKEN || '';

const client = axios.create({
  baseURL: WORKER_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    ...(WORKER_AUTH_TOKEN && { Authorization: `Bearer ${WORKER_AUTH_TOKEN}` }),
  },
});

async function createPayment({ subject, total_amount, out_trade_no }) {
  const response = await client.post('/payment/create', {
    subject,
    total_amount,
    out_trade_no,
  });
  return response.data;
}

async function queryPayment(outTradeNo) {
  const response = await client.get('/payment/query', {
    params: { out_trade_no: outTradeNo },
  });
  return response.data;
}

async function verifyNotification(notification) {
  const sign = notification.sign;
  if (!sign) {
    console.warn('[WorkerClient] Notification missing sign field');
    return false;
  }
  try {
    const response = await client.post('/payment/verify', notification);
    return response.data.verified === true;
  } catch (err) {
    console.error('[WorkerClient] Verify notification failed:', err.message);
    return false;
  }
}

async function refundPayment({ out_trade_no, refund_amount, refund_reason }) {
  const response = await client.post('/payment/refund', {
    out_trade_no,
    refund_amount,
    refund_reason,
  });
  return response.data;
}

module.exports = {
  createPayment,
  queryPayment,
  verifyNotification,
  refundPayment,
};
