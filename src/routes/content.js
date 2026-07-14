const express = require('express');
const router = express.Router();
const { contentStore, userStore, activityStore, walletStore, hashStore } = require('../models/dataStore');
const aiValueEngine = require('../aiValueEngine');
const agentPay = require('../agentPayClient');
const hashEngine = require('../hashEngine');

/** 发布内容 */
router.post('/publish', async (req, res) => {
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

    // ===== Agent 微交易：发布内容自动扣推广费 =====
    // 每次发布扣 ¥1（可配置），走 Agent 决策
    const publishFee = activity.publishFee || 1;
    let payResult = null;
    let agentPayAvailable = true;

    try {
      payResult = await agentPay.execute({
        userId,
        amount: publishFee,
        subject: `发布内容: ${activity.name || '汽车资讯分享'}`,
        payeeId: 'system',
        type: 'promotion',
      });
    } catch (e) {
      console.error('[Content Publish] Agent Pay unavailable:', e.message);
      agentPayAvailable = false;
      payResult = { success: false, error: e.message };
    }

    if (agentPayAvailable && !payResult.success) {
      // Agent 拒绝或需要审批，通知前端
      if (payResult.action === 'pending_approval') {
        return res.json({
          success: false,
          error: payResult.error || '需要确认支付',
          action: 'pending_approval',
          approvalId: payResult.approvalId,
          decision: payResult.decision,
        });
      }
      // 连接失败，降级：跳过支付，免费发布
      console.log('[Content Publish] Degraded mode: skipping agent pay, error:', payResult.error);
    }

    // Agent 支付成功，继续发布
    const content = contentStore.create({
      userId,
      activityId,
      images: images || [],
      text,
      carModel: activity.model,
      nickName,
      agentPayTxId: payResult.data?.id,
      agentPayHash: payResult.data?.hash,
    });

    // HASH 存证 — 内容发布数字资产上链
    try {
      const hashPayload = JSON.stringify({
        id: content.id,
        userId,
        activityId,
        trackId: content.trackId,
        shareUrl: content.shareUrl,
        textPreview: text.slice(0, 100),
        createdAt: content.createdAt,
        agentPayTxId: payResult.data?.id,
      });
      const { hash, digest } = hashEngine.digest(hashPayload);
      const hashResult = hashStore.create({
        txId: content.id,
        hash,
        dataDigest: digest,
        dataType: 'content_publish',
        metadata: { userId, activityId, trackId: content.trackId, agentPayTxId: payResult.data?.id },
      });
      if (hashResult) {
        content.hash = hash;
        content.hashTxId = hashResult.id || '';
      }
    } catch (e) {
      console.error('[Content Publish] IP存证失败:', e.message);
    }

    res.json({
      success: true,
      data: {
        id: content.id,
        trackId: content.trackId,
        shareUrl: content.shareUrl,
        activity: content.activity,
        hash: content.hash || '',
        agentPay: {
          txId: payResult.data?.id,
          amount: payResult.data?.amount,
          hash: payResult.data?.hash,
          decision: payResult.data?.decision,
        },
      },
    });
  } catch (err) {
    console.error('[Content Publish Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** 确认审批后继续发布 */
router.post('/publish/confirm', async (req, res) => {
  try {
    const { text, images, carModel, activityId, userId, nickName, approvalId } = req.body;
    if (!approvalId) {
      return res.status(400).json({ success: false, error: '缺少审批 ID' });
    }

    const aprvRes = await agentPay.approve(approvalId, 'approve');
    if (!aprvRes.success) {
      return res.status(400).json({ success: false, error: aprvRes.error || '审批失败' });
    }

    const activity = activityStore.getById(activityId);
    const publishFee = activity?.publishFee || 1;

    const payResult = await agentPay.execute({
      userId,
      amount: publishFee,
      subject: `发布内容: ${activity?.name || '汽车资讯分享'}`,
      payeeId: 'system',
      type: 'promotion',
      approvalId,
    });

    if (!payResult.success) {
      return res.status(400).json({ success: false, error: payResult.error || '支付执行失败' });
    }

    const content = contentStore.create({
      userId,
      activityId,
      images: images || [],
      text,
      carModel: activity?.model,
      nickName,
      agentPayTxId: payResult.data?.id,
      agentPayHash: payResult.data?.hash,
    });

    try {
      const hashPayload = JSON.stringify({
        id: content.id, userId, activityId, trackId: content.trackId, shareUrl: content.shareUrl,
        textPreview: text.slice(0, 100), createdAt: content.createdAt, agentPayTxId: payResult.data?.id,
      });
      const { hash, digest } = hashEngine.digest(hashPayload);
      const hashResult = hashStore.create({
        txId: content.id, hash, dataDigest: digest,
        dataType: 'content_publish', metadata: { userId, activityId, trackId: content.trackId },
      });
      if (hashResult) { content.hash = hash; content.hashTxId = hashResult.id || ''; }
    } catch (e) { console.error('[Content Confirm] IP存证失败:', e.message); }

    res.json({
      success: true,
      data: {
        id: content.id,
        trackId: content.trackId,
        shareUrl: content.shareUrl,
        activity: content.activity,
        hash: content.hash || '',
        agentPay: {
          txId: payResult.data?.id,
          amount: payResult.data?.amount,
          hash: payResult.data?.hash,
        },
      },
    });
  } catch (err) {
    console.error('[Content Publish Confirm Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** 内容详情 (含追踪数据+HASH存证) */
router.get('/:id', async (req, res) => {
  const content = contentStore.getById(req.params.id);
  if (!content) {
    return res.status(404).json({ success: false, error: '内容不存在' });
  }

  let hashRecords = null;
  if (content.hash) {
    hashRecords = hashStore.getByTxId(content.id);
  }

  res.json({ success: true, data: { ...content, hashRecords } });
});

/** 内容统计 — AI加权价值预览 */
router.get('/stats/:id', async (req, res) => {
  const content = contentStore.getById(req.params.id);
  if (!content) {
    return res.status(404).json({ success: false, error: '内容不存在' });
  }

  const attribution = await aiValueEngine.calculate(content, 'VIEW');

  res.json({
    success: true,
    data: {
      ...content.stats,
      estimatedEarnings: content.stats.estimatedEarnings,
      attributionPreview: attribution,
      valueCalc: attribution.valueCalc,
    },
  });
});

/** 获取用户的内容列表 */
router.get('/user/:userId', (req, res) => {
  const list = contentStore.getByUser(req.params.userId);
  res.json({ success: true, data: list });
});

/** 记录阅读 (追踪) — AI实时加权计算阅读价值 + Agent自动分佣 */
router.post('/track/view', async (req, res) => {
  const { contentId, refUserId, spreadUserId } = req.body;
  if (!contentId) {
    return res.status(400).json({ success: false, error: 'contentId required' });
  }

  if (spreadUserId) {
    contentStore.addSpreadToChain(contentId, spreadUserId, req.body.spreadNickName || '');
  }

    const content = contentStore.getById(contentId);
    if (content) {
      contentStore.updateStats(contentId, { views: 1 });

      const valueResult = await aiValueEngine.calculateValue(content, 'VIEW');
      let earnings = valueResult.finalValue;

      const remainingBudget = activityStore.getRemainingBudget(content.activityId);
      if (remainingBudget > 0 && earnings > remainingBudget) {
        earnings = remainingBudget;
      } else if (remainingBudget <= 0 && activityStore.getById(content.activityId)?.totalBudget > 0) {
        contentStore.updateStats(contentId, { earnings: 0 });
        return res.json({
          success: true,
          data: { tracked: true, earnings: 0, budgetExhausted: true },
        });
      }

      contentStore.updateStats(contentId, { earnings });

      const attribution = await aiValueEngine.calculate(content, 'VIEW');
      const ratio = (remainingBudget > 0 && valueResult.finalValue > remainingBudget)
        ? remainingBudget / valueResult.finalValue : 1;

      for (const node of attribution.chain) {
        const nodeAmount = +(node.amount * ratio).toFixed(4);
        if (nodeAmount > 0) {
          try {
            const payResult = await agentPay.execute({
              userId: node.userId,
              amount: nodeAmount,
              subject: `阅读分成 · ${content.carModel || '汽车资讯'} (${node.role})`,
              payeeId: node.userId,
              type: 'promotion',
            });
            if (payResult.success) {
              walletStore.addPromotion(
                node.userId,
                nodeAmount,
                `阅读分成 · ${content.carModel || '汽车资讯'} (Agent支付)`,
                contentId,
              );
            }
          } catch (e) {
            console.error('[Track View] Agent pay failed for', node.userId, e.message);
            walletStore.addPromotion(
              node.userId,
              nodeAmount,
              `阅读分成 · ${content.carModel || '汽车资讯'}`,
              contentId,
            );
          }
        }
      }

      const budgetOk = activityStore.useBudget(content.activityId, earnings);
      if (!budgetOk) {
        earnings = 0;
      }

      res.json({
        success: true,
        data: {
          tracked: true,
          earnings,
          valueCalc: valueResult,
          attribution: attribution.chain,
          budgetExhausted: !budgetOk,
        },
      });
    } else {
      res.json({ success: true, data: { tracked: true, earnings: 0 } });
    }
});

module.exports = router;