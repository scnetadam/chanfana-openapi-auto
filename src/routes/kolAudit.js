const express = require('express');
const router = express.Router();
const { kolAuditStore, opcAppStore, userStore, notificationStore, hashStore } = require('../models/dataStore');
const kolAuditEngine = require('../kolAuditEngine');
const hashEngine = require('../hashEngine');

router.get('/profile', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const audit = kolAuditStore.getLatestByUser(userId);
  const user = userStore.getById(userId);
  res.json({
    success: true,
    data: {
      userId,
      nickName: user?.nickName || '',
      kolStatus: audit?.status || 'none',
      channel: audit?.channel || '',
      followers: audit?.followers || 0,
      opcEligible: audit?.opcEligible || false,
      lastAudit: audit,
    },
  });
});

router.post('/submit', async (req, res) => {
  const { userId, nickName, channel, followers, crossPlatformProof, bizAuthCode, bizUserId } = req.body;
  if (!userId || !channel) return res.status(400).json({ success: false, error: 'userId 和 channel 为必填' });

  const existing = kolAuditStore.getLatestByUser(userId);
  if (existing && existing.status === 'approved') {
    return res.json({ success: true, data: existing, message: '已是认证KOL' });
  }

  if (channel === 'biz_auth' || channel === 'biz_invite') {
    if (!bizUserId) return res.status(400).json({ success: false, error: 'B端授权需提供bizUserId' });
    const bizCheck = await kolAuditEngine.reviewBizAuth(bizUserId, bizAuthCode);
    if (!bizCheck.valid) {
      return res.status(403).json({ success: false, error: bizCheck.reason });
    }
  }

  const auditData = { userId, nickName, channel, followers: followers || 0, crossPlatformProof, bizAuthCode, bizUserId };
  const result = await kolAuditEngine.audit(auditData);

  const status = result.approved ? 'approved' : 'rejected';
  const audit = kolAuditStore.create({
    ...auditData,
    status,
    aiScore: result.aiCheck?.score || null,
    reason: result.reason,
    opcEligible: result.opcEligible,
  });

  if (result.approved) {
    notificationStore.create({ userId, type: 'kol_audit', title: 'KOL审核通过', content: '恭喜！您已通过KOL审核，可以领取任务和分佣' });
  } else {
    notificationStore.create({ userId, type: 'kol_audit', title: 'KOL审核未通过', content: result.reason });
  }

  try {
    const hashData = JSON.stringify({ auditId: audit.id, userId, channel, status, ts: audit.createdAt });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: audit.id, hash, dataDigest: digest,
      dataType: 'kol_identity', metadata: { userId, channel, status },
    });
  } catch (e) {
    console.error('[KOL Audit] IP存证失败:', e.message);
  }

  res.json({ success: true, data: audit, auditResult: result });
});

router.post('/review', async (req, res) => {
  const { auditId, action, reason } = req.body;
  if (!auditId || !action) return res.status(400).json({ success: false, error: 'auditId 和 action 为必填' });

  let audit;
  if (action === 'approve') {
    audit = kolAuditStore.approve(auditId, reason);
  } else if (action === 'reject') {
    audit = kolAuditStore.reject(auditId, reason);
  } else {
    return res.status(400).json({ success: false, error: 'action 必须为 approve/reject' });
  }

  if (!audit) return res.status(404).json({ success: false, error: '审核记录不存在' });

  notificationStore.create({
    userId: audit.userId,
    type: 'kol_audit',
    title: action === 'approve' ? 'KOL审核通过' : 'KOL审核驳回',
    content: reason || (action === 'approve' ? '管理员审核通过' : '管理员审核驳回'),
  });

  res.json({ success: true, data: audit });
});

router.get('/list', (req, res) => {
  const { status, channel, page, pageSize } = req.query;
  const result = kolAuditStore.list({ status, channel, page, pageSize });
  res.json({ success: true, data: result });
});

router.post('/opc-apply', async (req, res) => {
  const { userId, nickName, followers, crossPlatformProof, businessPlan } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const latestAudit = kolAuditStore.getLatestByUser(userId);
  if (latestAudit?.status !== 'approved' && !(followers >= 1000 && crossPlatformProof)) {
    return res.status(400).json({ success: false, error: '需先通过KOL审核(同类平台+粉丝>1000)或已有KOL资格' });
  }

  const existing = opcAppStore.getLatestByUser(userId);
  if (existing && existing.status === 'approved') {
    return res.json({ success: true, data: existing, message: '已获批OPC创业支持' });
  }
  if (existing && existing.status === 'pending') {
    return res.json({ success: true, data: existing, message: 'OPC申请审核中' });
  }

  const app = opcAppStore.create({
    userId, nickName, followers: followers || 0, crossPlatformProof,
    businessPlan, status: 'pending',
  });

  notificationStore.create({ userId, type: 'opc', title: 'OPC申请已提交', content: '您的OPC创业支持申请已提交，等待审核' });

  res.json({ success: true, data: app });
});

router.get('/channels', (req, res) => {
  res.json({ success: true, data: kolAuditEngine.KOL_AUDIT_CHANNELS });
});

module.exports = router;
