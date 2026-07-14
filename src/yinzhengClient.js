/**
 * 龟钮印证 — 支付数据存证 API 客户端
 * 供龟钮印信调用龟钮印证的支付结算存证服务
 *
 * 职责边界:
 *   龟钮印证 → 支付数据存证 (结算、退款、Agent微交易)
 *   龟钮印信 → KOL/KOC IP数据存证 (本地hashEngine，不走印证)
 *
 * 本客户端仅用于支付相关存证调用
 */

const axios = require('axios');

const YINZHENG_API = process.env.YINZHENG_API || 'http://192.168.0.102:80/api';
const AGENT_PAY_API_KEY = process.env.AGENT_PAY_API_KEY || 'deveco-agent-key-20260709';

const client = axios.create({
  baseURL: YINZHENG_API,
  timeout: 2000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': AGENT_PAY_API_KEY,
    'X-Internal': 'true',
  },
});

/**
 * 创建支付数据存证 (仅在结算执行/退款等支付场景调用)
 * @param {object} params
 * @param {string} params.txId - 支付交易 ID
 * @param {string} params.hash - SHA256 哈希值
 * @param {string} params.dataDigest - 数据摘要
 * @param {string} params.dataType - 数据类型: settlement_execute/settlement_create/refund/agent_pay
 * @param {object} params.metadata - 附加元数据 (支付金额、双方ID等)
 */
async function createPaymentHash({ txId, hash, dataDigest, dataType, metadata }) {
  try {
    const res = await client.post('/hash/create', {
      txId,
      hash,
      dataDigest,
      dataType: dataType || 'settlement_create',
      metadata: metadata || {},
    });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 查询支付存证
 */
async function queryHash(txId) {
  try {
    const res = await client.get(`/hash/query?txId=${txId}`);
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 验证支付存证
 */
async function verifyHash(hash, dataDigest) {
  try {
    const res = await client.post('/hash/verify', { hash, dataDigest });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * B端商家认证查询
 */
async function getBizStatus(userId) {
  try {
    const res = await client.get(`/biz/status?userId=${userId}`);
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * B端商家认证申请
 */
async function applyBizCert(userId, bizInfo) {
  try {
    const res = await client.post('/biz/apply', { userId, ...bizInfo });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 搜索已认证商家
 */
async function searchBiz(query) {
  try {
    const res = await client.get(`/biz/search?q=${encodeURIComponent(query)}`);
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

const crypto = require('crypto');

function generateHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = {
  createPaymentHash,
  queryHash,
  verifyHash,
  getBizStatus,
  applyBizCert,
  searchBiz,
  generateHash,
};
