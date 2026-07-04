const express = require('express');
const router = express.Router();
const { contentStore, userStore, activityStore } = require('../models/dataStore');
const attributionEngine = require('../attributionEngine');

/** 发布内容 */
router.post('/publish', (req, res) => {
  try {
    const { text, images, carModel, activityId, userId, nickName } = req.body;
    if (!text && (!images || images.length === 0)) {
      return res.status(400).json({ success: false, error: '请填写内容或上传图片' });
    }
    if (!activityId) {
      return res.status(400).json({ success: false, error: '请选择推广活动' });
    }
    if (!userId) {
      return res.status(400).json({ success: false, error: '未登录' });
    }

    const activity = activityStore.getById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, error: '活动不存在' });
    }

    const content = contentStore.create({
      userId,
      activityId,
      images: images || [],
      text,
      carModel: activity.model,
      nickName,
    });

    res.json({
      success: true,
      data: {
        id: content.id,
        trackId: content.trackId,
        shareUrl: content.shareUrl,
        activity: content.activity,
      },
    });
  } catch (err) {
    console.error('[Content Publish Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** 内容详情 (含追踪数据) */
router.get('/:id', (req, res) => {
  const content = contentStore.getById(req.params.id);
  if (!content) {
    return res.status(404).json({ success: false, error: '内容不存在' });
  }
  res.json({ success: true, data: content });
});

/** 内容统计 */
router.get('/stats/:id', (req, res) => {
  const content = contentStore.getById(req.params.id);
  if (!content) {
    return res.status(404).json({ success: false, error: '内容不存在' });
  }

  // 简化归因：按 VIEW 计算预估收益
  const attribution = attributionEngine.calculate(content, 'VIEW');

  res.json({
    success: true,
    data: {
      ...content.stats,
      estimatedEarnings: content.stats.estimatedEarnings,
      attributionPreview: attribution,
    },
  });
});

/** 获取用户的内容列表 */
router.get('/user/:userId', (req, res) => {
  const list = contentStore.getByUser(req.params.userId);
  res.json({ success: true, data: list });
});

/** 记录阅读 (追踪) */
router.post('/track/view', (req, res) => {
  const { contentId, refUserId, spreadUserId } = req.body;
  if (!contentId) {
    return res.status(400).json({ success: false, error: 'contentId required' });
  }

  // 如果有传播者引用，加入追踪链
  if (spreadUserId) {
    contentStore.addSpreadToChain(contentId, spreadUserId, req.body.spreadNickName || '');
  }

  // VIEW 归因 → 给发起人加0.01推广金
  const content = contentStore.getById(contentId);
  if (content) {
    contentStore.updateStats(contentId, { views: 1 });
    const earnings = attributionEngine.CONVERSION_VALUES.VIEW; // 0.01
    contentStore.updateStats(contentId, { earnings });
    // 给发起人钱包加钱
    const { walletStore } = require('../models/dataStore');
    walletStore.addPromotion(
      content.userId,
      earnings,
      `阅读收益 · ${content.carModel}`,
      contentId,
    );
    // 更新活动预算消耗
    activityStore.useBudget(content.activityId, earnings);
  }

  res.json({ success: true, data: { tracked: true, earnings: attributionEngine.CONVERSION_VALUES.VIEW } });
});

module.exports = router;
