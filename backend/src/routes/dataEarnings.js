/**
 * 龟钮·印证 — 数据收益路由
 * 数据贡献者收益管理，文件持久化
 */

const express = require('express');
const router = express.Router();
const { earnings } = require('../models/dataStore');

/**
 * GET /api/data-earnings/summary — 收益总览
 */
router.get('/summary', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    let user = earnings.get(userId);
    if (!user) {
      user = { userId, total: 0, pending: 0, settled: 0, records: [] };
      earnings.set(userId, user);
    }

    res.json({
      success: true,
      data: {
        totalEarnings: user.total,
        pendingSettlement: user.pending,
        settledAmount: user.settled,
        recordCount: user.records.length,
      },
    });
  } catch (err) {
    console.error('[dataEarnings] summary错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/data-earnings/records — 收益明细（分页）
 */
router.get('/records', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const user = earnings.get(userId) || { records: [] };
    const records = user.records.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      data: {
        items: records,
        total: user.records.length,
        page,
        pageSize,
      },
    });
  } catch (err) {
    console.error('[dataEarnings] records错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/data-earnings/settle — 结算提现
 */
router.post('/settle', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    let user = earnings.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '无收益数据' });
    }

    if (user.pending <= 0) {
      return res.status(400).json({ success: false, error: '无可结算金额' });
    }

    const amount = user.pending;
    user.settled += amount;
    user.pending = 0;
    user.records.push({
      id: `SET-${Date.now()}`,
      type: 'settle',
      amount,
      status: 'settled',
      time: new Date().toISOString(),
    });
    earnings.set(userId, user);

    res.json({ success: true, data: { settledAmount: amount, message: `已结算 ¥${amount}` } });
  } catch (err) {
    console.error('[dataEarnings] settle错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;