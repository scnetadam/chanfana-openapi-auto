const express = require('express');
const router = express.Router();
const { userStore } = require('../models/dataStore');

/** 微信登录 */
router.post('/login', (req, res) => {
  const { code, nickName, avatarUrl } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'code is required' });
  }

  // v1.0 简化：用 code 模拟 openId
  // 正式环境需调微信接口 code2Session
  const openId = 'open_' + code.slice(0, 16) + '_' + Date.now().toString(36);

  const user = userStore.findOrCreate(openId, nickName, avatarUrl);
  const token = 'x402_token_' + user.id + '_' + Date.now().toString(36);

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
      },
    },
  });
});

/** 获取用户信息 */
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
