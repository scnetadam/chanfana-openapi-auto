const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { users, notification } = require('../models/dataStore');

const JWT_SECRET = process.env.JWT_SECRET || 'guiniu_seal_sso_secret_2026';
const JWT_ISSUER = 'guiniu-seal';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;
const SSO_PROJECTS = ['seal', 'deveco', 'verify', 'guiniu'];

function _base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _base64UrlDecode(str) {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) padded += '=';
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function _signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT', iss: JWT_ISSUER };
  const headerB64 = _base64UrlEncode(JSON.stringify(header));
  const payloadB64 = _base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${headerB64}.${payloadB64}.${signature}`;
}

function _verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, error: 'invalid_format' };
  const [headerB64, payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (signature !== expectedSig) return { valid: false, error: 'invalid_signature' };
  try {
    const payload = JSON.parse(_base64UrlDecode(payloadB64));
    if (payload.exp && Date.now() > payload.exp) return { valid: false, error: 'token_expired' };
    if (payload.iss !== JWT_ISSUER) return { valid: false, error: 'invalid_issuer' };
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'invalid_payload' };
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }
  const token = authHeader.slice(7);
  const result = _verifyJwt(token);
  if (!result.valid) {
    return res.status(401).json({ success: false, error: `认证失败: ${result.error}` });
  }
  req.user = result.payload;
  next();
}

router.post('/login', (req, res) => {
  try {
    const { code, nickName, avatarUrl, platform } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'code required' });
    }

    const openId = code.startsWith('demo_') ? code : `open_${code.slice(0, 12)}`;

    let user = users.findOne(u => u.openId === openId);
    if (!user) {
      const newUser = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        openId,
        nickName: nickName || '用户',
        avatarUrl: avatarUrl || '',
        platform: platform || 'alipay',
        role: 'user',
        balance: 0,
        ssoTokens: {},
        createdAt: new Date().toISOString(),
      };
      users.set(newUser.id, newUser);
      user = newUser;
    }

    const jwtPayload = {
      sub: user.id,
      openId: user.openId,
      role: user.role,
      platform: user.platform || platform || 'alipay',
      iss: JWT_ISSUER,
      iat: Date.now(),
      exp: Date.now() + TOKEN_EXPIRY,
    };

    const token = _signJwt(jwtPayload);

    const ssoTokens = {};
    SSO_PROJECTS.forEach(project => {
      ssoTokens[project] = _signJwt({ ...jwtPayload, aud: project, scope: 'sso' });
    });

    user.ssoTokens = ssoTokens;
    users.set(user.id, user);

    if (user.balance > 0) {
      const earningsReminder = {
        id: `NTF-LOGIN-EARN-${Date.now()}`,
        userId: user.id,
        category: 'earnings_claim',
        channel: 'login',
        channelLabel: '登录提示',
        title: `您有 ¥${user.balance.toFixed(2)} 待领取收益`,
        body: `尊敬的龟钮自驭用户，您有 ¥${user.balance.toFixed(2)} 待领取收益，请前往钱包查看。`,
        actionUrl: '/pages/wallet/index',
        actionText: '立即查看',
        priority: 'high',
        status: 'pending_display',
        readAt: null,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      notification.set(earningsReminder.id, earningsReminder);
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
          role: user.role,
        },
        hasEarnings: user.balance > 0,
        pendingEarnings: user.balance || 0,
      },
    });
  } catch (e) {
    console.error('[auth] 登录错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/sso/verify', (req, res) => {
  try {
    const { token, project } = req.body;
    if (!token || !project) return res.status(400).json({ success: false, error: 'token, project required' });

    const result = _verifyJwt(token);
    if (!result.valid) return res.status(401).json({ success: false, error: `SSO令牌无效: ${result.error}` });
    if (result.payload.aud !== project) return res.status(401).json({ success: false, error: 'SSO令牌项目不匹配' });

    const user = users.get(result.payload.sub);
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' });

    res.json({
      success: true,
      data: {
        userId: user.id,
        openId: user.openId,
        nickName: user.nickName,
        role: user.role,
        project: result.payload.aud,
        scope: result.payload.scope,
      },
    });
  } catch (e) {
    console.error('[auth] SSO验证错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token required' });
    const result = _verifyJwt(token);
    if (!result.valid) return res.status(401).json({ success: false, error: result.error });
    res.json({ success: true, data: { payload: result.payload } });
  } catch (e) {
    console.error('[auth] 验证错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/user', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const user = users.get(userId);
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' });

    res.json({
      success: true,
      data: {
        id: user.id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        balance: user.balance || 0,
        ssoProjects: Object.keys(user.ssoTokens || {}),
      },
    });
  } catch (e) {
    console.error('[auth] 查询用户错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = { router, authMiddleware, _signJwt, _verifyJwt };
