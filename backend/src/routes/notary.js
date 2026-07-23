/**
 * 龟钮·印证 — 公证服务路由
 * 在线公证服务（15% 服务费），文件持久化
 * 
 * 前后端对齐：
 * - 前端调用 api.listProviders() → GET /api/notary/providers
 * - 前端调用 api.notaryApply(txId, providerId, userId, amount) → POST /api/notary/apply
 * - 前端调用 api.notaryVerify(id) → GET /api/notary/verify?id=...
 */

const express = require('express');
const router = express.Router();
const { notary } = require('../models/dataStore');

// 公证服务商列表（静态）
const PROVIDERS = [
  { id: 'p001', name: '蚂蚁链公证', baseUrl: 'https://antchain.notary.cn', feeRate: 15 },
  { id: 'p002', name: '公证云', baseUrl: 'https://www.notarycloud.com', feeRate: 12 },
  { id: 'p003', name: '司法存证链', baseUrl: 'https://judiciary.chain.cn', feeRate: 10 },
];

/**
 * GET /api/notary/providers — 获取公证服务商列表
 */
router.get('/providers', (req, res) => {
  try {
    res.json({ success: true, data: PROVIDERS });
  } catch (err) {
    console.error('[notary] providers错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/notary/apply — 申请公证
 * 前端调用: api.notaryApply(txId, providerId, userId, amount)
 * 参数: { txId, providerId, userId, amount }
 */
router.post('/apply', (req, res) => {
  try {
    const { txId, providerId, userId, amount } = req.body;
    if (!txId || !providerId || !userId) {
      return res.status(400).json({ success: false, error: 'txId, providerId, userId 为必填' });
    }

    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) {
      return res.status(400).json({ success: false, error: '公证服务商不存在' });
    }

    const txAmount = parseFloat(amount) || 0;
    const feeRate = provider.feeRate;
    const notaryFee = txAmount * (feeRate / 100);

    const record = {
      id: `NO-${Date.now()}`,
      txId,
      providerId,
      providerName: provider.name,
      userId,
      transactionAmount: txAmount,
      feeRate,
      notaryFee: Math.round(notaryFee * 100) / 100,
      feeBreakdown: {
        transactionAmount: txAmount,
        feeRate,
        notaryFee: Math.round(notaryFee * 100) / 100,
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    notary.set(record.id, record);

    res.json({
      success: true,
      data: {
        id: record.id,
        providerName: record.providerName,
        notaryFee: record.notaryFee,
        feeBreakdown: record.feeBreakdown,
        status: record.status,
      },
    });
  } catch (err) {
    console.error('[notary] apply错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/notary/records — 公证记录
 */
router.get('/records', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    const records = notary.find(r => r.userId === userId);
    res.json({ success: true, data: { items: records, total: records.length } });
  } catch (err) {
    console.error('[notary] records错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/notary/verify — 验证公证
 */
router.get('/verify', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });

    const record = notary.get(id);
    if (!record) return res.status(404).json({ success: false, error: '公证记录未找到' });

    res.json({ success: true, data: { status: record.status, providerName: record.providerName, ...record } });
  } catch (err) {
    console.error('[notary] verify错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;