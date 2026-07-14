const express = require('express');
const router = express.Router();
const { bizProductStore, activityStore, walletStore, contentStore, userStore, notificationStore, hashStore, KOL_TASK_TYPES, kolTaskStore, kolTaskSubmissionStore } = require('../models/dataStore');
const yinzhengClient = require('../yinzhengClient');
const hashEngine = require('../hashEngine');
const aiValueEngine = require('../aiValueEngine');

router.get('/types', (req, res) => {
  res.json({ success: true, data: Object.values(KOL_TASK_TYPES) });
});

router.post('/create', async (req, res) => {
  const { bizUserId, activityId, type, title, description, rewardPerUnit, targetCount, totalRewardPool, deadline, requirements } = req.body;
  if (!bizUserId || !title) {
    return res.status(400).json({ success: false, error: 'bizUserId 和 title 为必填' });
  }
  const bizStatus = await yinzhengClient.getBizStatus(bizUserId);
  const bizApproved = bizStatus.success && bizStatus.data?.status === 'approved';
  const bizLocalMode = !bizStatus.success && (bizStatus.error?.includes('timeout') || bizStatus.error?.includes('ECONNREFUSED') || bizStatus.error?.includes('Network Error'));
  if (!bizApproved && !bizLocalMode) {
    return res.status(403).json({ success: false, error: '商家未认证，请先在龟钮印证完成商家认证' });
  }
  if (bizLocalMode) {
    console.warn('[KOL Task] 龟钮印证不可达，降级模式：跳过B端认证校验');
  }
  const task = kolTaskStore.create({
    bizUserId, activityId, type, title, description, rewardPerUnit, targetCount, totalRewardPool, deadline, requirements,
  });
  try {
    const hashData = JSON.stringify({ id: task.id, bizUserId, title, type, createdAt: task.createdAt });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: task.id, hash, dataDigest: digest,
      dataType: 'kol_task', metadata: { bizUserId, type, title },
    });
    task.hash = hash;
  } catch (e) {
    console.error('[KOL Task] IP存证失败:', e.message);
  }
  res.json({ success: true, data: task });
});

router.get('/list', (req, res) => {
  const { bizUserId, activityId, status, type } = req.query;
  const tasks = kolTaskStore.list({ bizUserId, activityId, status, type });
  res.json({ success: true, data: { list: tasks, total: tasks.length } });
});

router.get('/open', (req, res) => {
  const tasks = kolTaskStore.listOpen();
  res.json({ success: true, data: { list: tasks, total: tasks.length } });
});

router.get('/:id', (req, res) => {
  const task = kolTaskStore.getById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
  const submissions = kolTaskSubmissionStore.getByTask(task.id);
  res.json({ success: true, data: { task, submissions: submissions.length } });
});

router.post('/:id/submit', async (req, res) => {
  const { kolUserId, kolNickName, contentId, bookingId, proofData } = req.body;
  const task = kolTaskStore.getById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
  if (task.status !== 'open') return res.status(400).json({ success: false, error: '任务已关闭' });
  if (!kolUserId) return res.status(400).json({ success: false, error: 'kolUserId 为必填' });
  const existingSub = kolTaskSubmissionStore.getByKol(kolUserId).find(s => s.taskId === task.id && s.status === 'approved');
  if (existingSub) return res.status(400).json({ success: false, error: '已提交过该任务' });
  if (task.totalRewardPool > 0 && task.usedReward + task.rewardPerUnit > task.totalRewardPool) {
    return res.status(400).json({ success: false, error: '任务奖励池已耗尽' });
  }
  const sub = kolTaskSubmissionStore.create({
    taskId: task.id, kolUserId, kolNickName, type: task.type, contentId, bookingId, proofData,
  });
  let reward = task.rewardPerUnit;
  let aiScore = null;
  if (contentId) {
    const content = contentStore.getById(contentId);
    if (content) {
      try {
        const valueResult = await aiValueEngine.calculateValue(content, task.type === 'booking' ? 'BOOKING' : 'VIEW', { userId: kolUserId, useAI: false });
        reward = valueResult.finalValue || reward;
        aiScore = { quality: valueResult.breakdown?.quality || 0, spread: valueResult.breakdown?.spread || 0, kol: valueResult.breakdown?.kol || 0, conversion: valueResult.breakdown?.conversion || 0, multiplier: valueResult.weightMultiplier };
      } catch (e) {
        console.error('[KOL Task] AI评估失败:', e.message);
      }
    }
  }
  kolTaskStore.incrementComplete(task.id, 1);
  const autoApprove = !aiScore || (aiScore.multiplier >= 0.5 && reward <= 50);
  if (autoApprove) {
    kolTaskSubmissionStore.approve(sub.id, +reward.toFixed(4), aiScore);
    kolTaskStore.addUsedReward(task.id, reward);
    walletStore.addPromotion(kolUserId, reward, 'KOL任务奖励: ' + task.title, '');
    notificationStore.create({ userId: kolUserId, type: 'wallet', title: '任务奖励到账', content: '完成任务「' + task.title + '」，获得 ¥' + reward.toFixed(2) });
  } else {
    notificationStore.create({ userId: kolUserId, type: 'kol_task', title: '任务待审核', content: '任务「' + task.title + '」已提交，等待B端审核确认' });
  }
  try {
    const hashData = JSON.stringify({ subId: sub.id, taskId: task.id, kolUserId, reward, timestamp: new Date().toISOString() });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: 'kol_sub_' + sub.id, hash, dataDigest: digest,
      dataType: 'commission', metadata: { taskId: task.id, kolUserId, reward },
    });
  } catch (e) {
    console.error('[KOL Task] 提交IP存证失败:', e.message);
  }
  res.json({ success: true, data: { submission: kolTaskSubmissionStore.getById(sub.id), reward, aiScore } });
});

router.get('/:id/submissions', (req, res) => {
  const task = kolTaskStore.getById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
  const subs = kolTaskSubmissionStore.getByTask(task.id);
  res.json({ success: true, data: { list: subs, total: subs.length } });
});

router.get('/kol/:userId/earnings', (req, res) => {
  const { userId } = req.params;
  const subs = kolTaskSubmissionStore.getByKol(userId);
  const approvedSubs = subs.filter(s => s.status === 'approved');
  const totalEarnings = approvedSubs.reduce((s, sub) => s + sub.reward, 0);
  const pendingSubs = subs.filter(s => s.status === 'submitted');
  const taskIds = [...new Set(approvedSubs.map(s => s.taskId))];
  res.json({
    success: true,
    data: {
      totalEarnings: +totalEarnings.toFixed(2),
      completedTasks: taskIds.length,
      totalSubmissions: subs.length,
      pendingCount: pendingSubs.length,
      recentEarnings: approvedSubs.slice(-10).reverse(),
    },
  });
});

router.post('/:id/close', (req, res) => {
  const task = kolTaskStore.close(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
  res.json({ success: true, data: task });
});

module.exports = router;
