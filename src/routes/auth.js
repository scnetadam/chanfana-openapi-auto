const express = require('express');
const router = express.Router();
const { userStore, notificationStore } = require('../models/dataStore');
const { generateToken, generateSsoTokens, JWT_ISSUER, SSO_PROJECTS } = require('../middleware/auth');

router.post('/login', (req, res) => {
  let { code, nickName, avatarUrl, platform } = req.body;

  if (!code) {
    if (nickName && platform) {
      code = platform + '_' + nickName + '_' + Date.now().toString(36);
    } else {
      return res.status(400).json({ success: false, error: 'code or (nickName+platform) is required' });
    }
  }

  const prefix = platform === 'alipay' ? 'ali_' : platform === 'harmony' ? 'hmos_' : 'open_';
  const openId = prefix + code.slice(0, 16) + '_' + Date.now().toString(36);

  const user = userStore.findOrCreate(openId, nickName, avatarUrl, platform);
  const tokenPayload = { userId: user.id, platform: user.platform, role: user.role || 'user' };
  const token = generateToken(tokenPayload);
  const ssoTokens = generateSsoTokens(tokenPayload);

  if (user.wallet && user.wallet.promotionBalance > 0) {
    notificationStore.create({
      userId: user.id,
      type: 'wallet',
      title: '收益提醒',
      content: `您有 ¥${user.wallet.promotionBalance.toFixed(2)} 待领取推广金，请前往钱包查看。`,
    });
  }

  res.json({
    success: true,
    data: {
      token,
      ssoTokens,
      user: {
        id: user.id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: user.role || 'user',
      },
      hasEarnings: (user.wallet?.promotionBalance || 0) > 0,
      pendingEarnings: user.wallet?.promotionBalance || 0,
    },
  });
});

router.post('/sso/verify', (req, res) => {
  const { token, project } = req.body;
  if (!token || !project) return res.status(400).json({ success: false, error: 'token, project required' });
  const { verifySsoToken } = require('../middleware/auth');
  const result = verifySsoToken(token, project);
  if (!result.valid) return res.status(401).json({ success: false, error: 'SSO令牌无效: ' + result.error });
  const userId = result.payload.userId || result.payload.sub;
  const user = userStore.getById(userId);
  if (!user) return res.status(404).json({ success: false, error: '用户不存在' });
  const localToken = generateToken({ userId: user.id, platform: user.platform, role: user.role || 'user' });
  res.json({
    success: true,
    data: {
      token: localToken,
      userId: user.id,
      nickName: user.nickName,
      role: user.role || 'user',
      project,
      scope: result.payload.scope,
    },
  });
});

router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'token required' });
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, require('../middleware/auth').JWT_SECRET);
    res.json({ success: true, data: { payload: decoded } });
  } catch (e) {
    res.status(401).json({ success: false, error: e.name === 'TokenExpiredError' ? '令牌已过期' : '令牌无效' });
  }
});

router.put('/profile', (req, res) => {
  const { userId, nickName, avatarUrl } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  const user = userStore.getById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  if (nickName) user.nickName = nickName;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  res.json({
    success: true,
    data: { id: user.id, nickName: user.nickName, avatarUrl: user.avatarUrl },
  });
});

router.get('/userinfo', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId required' });
  }
  const user = userStore.getById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  res.json({ success: true, data: user });
});

module.exports = router;
