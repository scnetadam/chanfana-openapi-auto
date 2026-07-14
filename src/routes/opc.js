const express = require('express');
const router = express.Router();
const { opcAppStore, aiToolUsageStore, notificationStore, kolAuditStore } = require('../models/dataStore');
const opcSupportEngine = require('../opcSupportEngine');

router.get('/info', (req, res) => {
  const { userId } = req.query;
  const benefits = opcSupportEngine.getOpcBenefits();
  let opcStatus = 'none';
  let freeQuota = 0;
  let usedQuota = 0;

  if (userId) {
    const app = opcAppStore.getLatestByUser(userId);
    if (app) {
      opcStatus = app.status;
      freeQuota = app.freeQuota || 0;
      usedQuota = app.usedQuota || 0;
    }
  }

  res.json({
    success: true,
    data: {
      opcStatus,
      freeQuota,
      usedQuota,
      remainingQuota: freeQuota - usedQuota,
      benefits,
    },
  });
});

router.post('/apply', (req, res) => {
  const { userId, nickName, followers, crossPlatformProof, businessPlan } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const latestAudit = kolAuditStore.getLatestByUser(userId);
  if (latestAudit?.status !== 'approved' && !(followers >= 1000 && crossPlatformProof)) {
    return res.status(400).json({ success: false, error: '需先通过KOL审核(同类平台+粉丝>1000)或已有KOL资格' });
  }

  const existing = opcAppStore.getLatestByUser(userId);
  if (existing) {
    if (existing.status === 'approved') return res.json({ success: true, data: existing, message: '已获批' });
    if (existing.status === 'pending') return res.json({ success: true, data: existing, message: '审核中' });
  }

  const app = opcAppStore.create({ userId, nickName, followers, crossPlatformProof, businessPlan, status: 'pending' });
  notificationStore.create({ userId, type: 'opc', title: 'OPC申请已提交', content: '您的OPC创业支持申请已提交' });
  res.json({ success: true, data: app });
});

router.get('/status', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const app = opcAppStore.getLatestByUser(userId);
  if (!app) return res.json({ success: true, data: { status: 'none' } });
  res.json({ success: true, data: app });
});

router.post('/review', (req, res) => {
  const { opcId, action, freeQuota, reason } = req.body;
  if (!opcId || !action) return res.status(400).json({ success: false, error: 'opcId 和 action 为必填' });

  let app;
  if (action === 'approve') {
    app = opcAppStore.approve(opcId, freeQuota || opcSupportEngine.OPC_FREE_MONTHLY_QUOTA);
    if (app) {
      notificationStore.create({ userId: app.userId, type: 'opc', title: 'OPC创业支持已获批', content: '恭喜！您已获得OPC创业支持，享受AI工具折扣和免费额度' });
    }
  } else if (action === 'reject') {
    app = opcAppStore.reject(opcId, reason);
    if (app) {
      notificationStore.create({ userId: app.userId, type: 'opc', title: 'OPC申请未通过', content: reason || '申请未通过审核' });
    }
  }

  if (!app) return res.status(404).json({ success: false, error: '申请不存在' });
  res.json({ success: true, data: app });
});

module.exports = router;
