const express = require('express');
const router = express.Router();
const contentAuditEngine = require('../contentAuditEngine');

const auditStore = {
  records: []
};

function getAuditRecord(contentId) {
  return auditStore.records.find(r => r.contentId === contentId);
}

router.post('/submit', async (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { contentId, content, type = 'text', images = [] } = req.body;

  if (!contentId) {
    return res.status(400).json({ success: false, error: 'contentId为必填' });
  }

  const existing = getAuditRecord(contentId);
  if (existing && existing.status === 'pass') {
    return res.json({ success: true, data: existing, message: '内容已通过审核' });
  }

  try {
    const auditResult = await contentAuditEngine.auditContent(
      content || { text: '' },
      { type, images, userId }
    );

    const record = {
      id: 'audit-' + Date.now(),
      contentId,
      userId,
      status: auditResult.level,
      score: auditResult.score,
      violations: auditResult.violations || [],
      sources: auditResult.sources || [],
      details: auditResult.details || {},
      reason: auditResult.reason || '',
      needsTencentModeration: contentAuditEngine.needsTencentModeration(auditResult),
      tencentModerated: false,
      createdAt: new Date().toISOString(),
    };

    auditStore.records.push(record);

    res.json({
      success: true,
      data: record,
      message: record.status === 'pass' ? '内容审核通过' : (record.status === 'reject' ? '内容审核未通过' : '内容待人工审核')
    });
  } catch (err) {
    console.error('[ContentAudit] 审核失败:', err.message);
    res.status(500).json({ success: false, error: '审核服务异常: ' + err.message });
  }
});

router.post('/tencent-moderation', async (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { contentId, content, type = 'text' } = req.body;

  if (!contentId) {
    return res.status(400).json({ success: false, error: 'contentId为必填' });
  }

  const auditRecord = getAuditRecord(contentId);
  if (!auditRecord) {
    return res.status(404).json({ success: false, error: '审核记录不存在，请先提交审核' });
  }

  try {
    const result = await contentAuditEngine.tencentModeration(content, type);

    if (result.success || result.simulated) {
      auditRecord.tencentModerated = true;
      auditRecord.tencentResult = result.result;
      auditRecord.tencentPrice = result.price;

      if (result.result?.Suggestion === 'Block') {
        auditRecord.status = 'reject';
      } else if (result.result?.Suggestion === 'Pass') {
        if (auditRecord.status === 'pending') {
          auditRecord.status = 'pass';
        }
      }
    }

    res.json({
      success: true,
      data: {
        contentId,
        tencentResult: result.result,
        price: result.price,
        simulated: result.simulated || false,
        auditStatus: auditRecord.status,
      },
      message: result.simulated ? '腾讯天御模拟审核完成(需配置API)' : '腾讯天御审核完成'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: '腾讯天御审核失败: ' + err.message });
  }
});

router.post('/review', (req, res) => {
  const { contentId, decision, reason = '' } = req.body;
  const adminUserId = req.user?.userId || 'admin';

  if (!contentId || !decision) {
    return res.status(400).json({ success: false, error: 'contentId和decision为必填' });
  }

  const record = getAuditRecord(contentId);
  if (!record) {
    return res.status(404).json({ success: false, error: '审核记录不存在' });
  }

  if (!['pass', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, error: 'decision必须为pass或reject' });
  }

  record.status = decision;
  record.reviewer = adminUserId;
  record.reviewReason = reason;
  record.reviewedAt = new Date().toISOString();

  res.json({
    success: true,
    data: record,
    message: decision === 'pass' ? '人工审核通过' : '人工审核拒绝'
  });
});

router.get('/record/:contentId', (req, res) => {
  const { contentId } = req.params;
  const record = getAuditRecord(contentId);
  if (!record) {
    return res.status(404).json({ success: false, error: '审核记录不存在' });
  }
  res.json({ success: true, data: record });
});

router.get('/list', (req, res) => {
  const { status, userId, page, pageSize } = req.query;
  let result = auditStore.records;

  if (status) result = result.filter(r => r.status === status);
  if (userId) result = result.filter(r => r.userId === userId);

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  res.json({
    success: true,
    data: {
      list: result.slice((p - 1) * ps, p * ps),
      total: result.length,
      page: p,
      pageSize: ps
    }
  });
});

router.get('/stats', (req, res) => {
  const stats = { total: auditStore.records.length, pass: 0, pending: 0, reject: 0, tencentModerated: 0 };
  for (const r of auditStore.records) {
    if (r.status === 'pass') stats.pass++;
    else if (r.status === 'pending') stats.pending++;
    else if (r.status === 'reject') stats.reject++;
    if (r.tencentModerated) stats.tencentModerated++;
  }
  res.json({ success: true, data: stats });
});

router.get('/price', (req, res) => {
  res.json({ success: true, data: contentAuditEngine.getAuditPrice() });
});

module.exports = router;
