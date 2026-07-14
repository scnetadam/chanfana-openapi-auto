/**
 * 龟钮印证 — Agent 微交易 API 客户端
 * 供龟钮印信及其他项目调用龟钮印证的 Agent 支付服务
 *
 * 使用方式:
 *   const agentPay = require('./agentPayClient');
 *   const result = await agentPay.execute({
 *     userId: 'u_1',
 *     amount: 30,
 *     subject: '内容推广自动扣款',
 *     payeeId: 'system',
 *     type: 'promotion',
 *   });
 */

const axios = require('axios');

// 龟钮印证 Agent 微交易服务地址
// 生产环境应配置为线上地址
const AGENT_PAY_API = process.env.AGENT_PAY_API || 'http://192.168.0.102:80/api/agent-pay';
const AGENT_PAY_API_KEY = process.env.AGENT_PAY_API_KEY || 'deveco-agent-key-20260709';

const client = axios.create({
  baseURL: AGENT_PAY_API,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': AGENT_PAY_API_KEY,
    'X-Internal': 'true',  // 信任调用方
  },
});

/**
 * 执行 Agent 微交易支付（决策 + 自动扣款 + 存证）
 * @param {object} params
 * @param {string} params.userId - 用户 ID（龟钮印信用户 ID 需映射到龟钮印证用户 ID）
 * @param {number} params.amount - 金额
 * @param {string} params.subject - 交易说明
 * @param {string} params.payeeId - 收款方 ID
 * @param {string} params.type - 交易类型: promotion/subscription/data_purchase/notary
 * @param {string} [params.approvalId] - 审批通过后的 ID（用户确认后传此参数跳过决策）
 * @returns {Promise<object>}
 */
async function execute({ userId, amount, subject, payeeId, type, approvalId }) {
  try {
    const res = await client.post('/execute', {
      userId,
      amount,
      subject,
      payeeId: payeeId || 'system',
      type: type || 'promotion',
      ...(approvalId && { approvalId }),
    });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 只决策不扣款
 */
async function decide({ userId, amount, subject, payeeId, type }) {
  try {
    const res = await client.post('/decide', {
      userId,
      amount,
      subject,
      payeeId: payeeId || 'system',
      type: type || 'promotion',
    });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 审批同意/拒绝
 */
async function approve(approvalId, action) {
  try {
    const res = await client.post('/approve', { approvalId, action });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 查询用户 Agent 支付规则
 */
async function getRule(userId) {
  try {
    const res = await client.get(`/rule?userId=${userId}`);
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 设置用户 Agent 支付规则
 */
async function setRule(userId, rule) {
  try {
    const res = await client.post('/rule', { userId, ...rule });
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 查询待审批列表
 */
async function getPending(userId) {
  try {
    const res = await client.get(`/pending?userId=${userId}`);
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

/**
 * 查询今日统计
 */
async function getStats(userId) {
  try {
    const res = await client.get(`/stats?userId=${userId}`);
    return res.data;
  } catch (err) {
    if (err.response?.data) return err.response.data;
    return { success: false, error: err.message };
  }
}

module.exports = {
  execute,
  decide,
  approve,
  getRule,
  setRule,
  getPending,
  getStats,
};