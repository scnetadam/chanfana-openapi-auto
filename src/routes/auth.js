const express = require('express');
const router = express.Router();
const { userStore } = require('../models/dataStore');
const { generateToken } = require('../middleware/auth');

/** 登录（支持微信/支付宝/HarmonyOS，并支持龟钮印证用户交叉登录） */
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
  const token = generateToken({ userId: user.id, platform: user.platform });

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

/** 修改用户资料 */
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
