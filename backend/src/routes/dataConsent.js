/**
 * 龟钮·印证 — 数据授权路由
 * 管理数据贡献开关、授权范围，文件持久化
 */

const express = require('express');
const router = express.Router();
const { consent } = require('../models/dataStore');

/**
 * GET /api/data-consent/status — 授权状态
 */
router.get('/status', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    const userConsent = consent.get(userId) || {
      userId,
      enabled: false,
      dataTypes: ['location', 'usage'],
      scope: 'anonymous',
      lastUpdated: null,
    };

    res.json({ success: true, data: userConsent });
  } catch (err) {
    console.error('[dataConsent] status错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/data-consent/toggle — 开关授权
 */
router.post('/toggle', (req, res) => {
  try {
    const { userId, enabled } = req.body;
    if (userId === undefined || userId === null || enabled === undefined || enabled === null) {
      return res.status(400).json({ success: false, error: 'userId 和 enabled 为必填' });
    }

    const userConsent = consent.get(userId) || {
      userId,
      enabled: false,
      dataTypes: ['location', 'usage'],
      scope: 'anonymous',
      lastUpdated: null,
    };

    userConsent.enabled = enabled;
    userConsent.lastUpdated = new Date().toISOString();
    consent.set(userId, userConsent);

    res.json({ success: true, data: userConsent });
  } catch (err) {
    console.error('[dataConsent] toggle错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/data-consent/scope — 设置授权范围
 */
router.post('/scope', (req, res) => {
  try {
    const { userId, scope, dataTypes } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    const userConsent = consent.get(userId) || {
      userId,
      enabled: false,
      dataTypes: [],
      scope: 'anonymous',
      lastUpdated: null,
    };

    if (scope) userConsent.scope = scope;
    if (dataTypes) userConsent.dataTypes = dataTypes;
    userConsent.lastUpdated = new Date().toISOString();
    consent.set(userId, userConsent);

    res.json({ success: true, data: userConsent });
  } catch (err) {
    console.error('[dataConsent] scope错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;