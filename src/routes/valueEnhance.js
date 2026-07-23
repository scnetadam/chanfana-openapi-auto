const express = require('express');
const router = express.Router();
const pHashEngine = require('../pHashEngine');
const engagementEngine = require('../engagementEngine');
const { contentStore } = require('../models/dataStore');

router.post('/phash/check', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { imageData, contentId } = req.body;
  if (!imageData) {
    return res.status(400).json({ success: false, error: 'imageData为必填' });
  }

  const hash = pHashEngine.computePHash(imageData);
  if (!hash) {
    return res.status(400).json({ success: false, error: 'pHash计算失败' });
  }

  const duplicates = pHashEngine.checkDuplicate(hash, userId);

  if (duplicates.length === 0) {
    pHashEngine.storePHash(hash, contentId || '', userId);
  }

  res.json({
    success: true,
    data: {
      hash,
      isDuplicate: duplicates.length > 0,
      duplicates,
      threshold: pHashEngine.PHASH_THRESHOLD,
    },
    message: duplicates.length > 0 ? '检测到重复内容(相似度>' + (100 - pHashEngine.PHASH_THRESHOLD) + '%)' : '内容原创，无重复'
  });
});

router.post('/ai-gen/detect', (req, res) => {
  const { content, type = 'text' } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, error: 'content为必填' });
  }

  const result = pHashEngine.detectAiGeneration(content, type);

  res.json({
    success: true,
    data: result,
    message: result.isAiHeavy ? 'AI生成占比高，建议扣减原创度评分' : 'AI生成占比可控'
  });
});

router.post('/ai-gen/adjust-score', (req, res) => {
  const { baseScore, aiDetectionResult } = req.body;
  if (baseScore === undefined || !aiDetectionResult) {
    return res.status(400).json({ success: false, error: 'baseScore和aiDetectionResult为必填' });
  }

  const adjusted = pHashEngine.adjustOriginalityScore(baseScore, aiDetectionResult);

  res.json({
    success: true,
    data: { baseScore, adjusted, penalty: +(baseScore - adjusted).toFixed(4), aiRatio: aiDetectionResult.aiRatio },
  });
});

router.post('/engagement/track', (req, res) => {
  const { contentId, viewDuration, totalDuration, likes, comments, shares, bookmarks, uniqueIps } = req.body;

  const completionRate = engagementEngine.trackCompletionRate(viewDuration || 0, totalDuration || 60);

  const engagement = engagementEngine.analyzeEngagementQuality({
    views: 1,
    likes: likes || 0,
    comments: comments || 0,
    shares: shares || 0,
    bookmarks: bookmarks || 0,
    avgViewDuration: viewDuration || 0,
    totalDuration: totalDuration || 60,
  });

  const fraud = engagementEngine.detectFraud({
    likes: likes || 0,
    views: 1,
    comments: comments || 0,
    uniqueIps: uniqueIps || 1,
  });

  engagementEngine.engagementStore.records.push({
    contentId,
    completionRate,
    engagement,
    fraud,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: { completionRate, engagement, fraud },
  });
});

router.post('/engagement/weighted-score', (req, res) => {
  const { baseScore, completionRate, engagementQuality, fraudResult, hasAttachLink, hasLeadCapture } = req.body;

  const score = engagementEngine.calculateEngagementWeightedScore(
    baseScore || 0.5,
    completionRate || 0,
    engagementQuality || { qualityScore: 0.5 },
    fraudResult || { isFraudSuspect: false, fraudScore: 0 },
    hasAttachLink || false,
    hasLeadCapture || false
  );

  const breakdown = {
    base: baseScore || 0.5,
    completionBonus: completionRate > 0.8 ? 0.1 : (completionRate < 0.3 ? -0.1 : 0),
    engagementMix: +(score * 0.4).toFixed(4),
    attachLinkBonus: hasAttachLink ? 0.15 : 0,
    leadCaptureBonus: hasLeadCapture ? 0.25 : 0,
    fraudPenalty: fraudResult?.isFraudSuspect ? +(fraudResult.fraudScore * 0.3).toFixed(4) : 0,
    final: score,
  };

  res.json({ success: true, data: { score, breakdown } });
});

router.get('/attach-link/weights', (req, res) => {
  res.json({
    success: true,
    data: {
      attachLinkBonus: 0.15,
      leadCaptureBonus: 0.25,
      leadCaptureIsTop: true,
      description: '挂车留资加权顶高：挂车+0.15，留资转化+0.25(顶格加权)',
      hierarchy: [
        { type: 'lead_capture', weight: 0.25, label: '挂车留资转化' },
        { type: 'booking', weight: 0.20, label: '预约到店' },
        { type: 'attach_link', weight: 0.15, label: '商品卡片挂车' },
        { type: 'share', weight: 0.10, label: '分享传播' },
        { type: 'view', weight: 0.05, label: '纯浏览' },
      ],
    }
  });
});

module.exports = router;
