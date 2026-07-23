const express = require('express');
const router = express.Router();
const { bizProductStore, activityStore, walletStore, contentStore, userStore, notificationStore, hashStore, KOL_TASK_TYPES, KOL_TASK_THEMES, KOL_TASK_CAR_MODELS, kolTaskStore, kolTaskSubmissionStore } = require('../models/dataStore');
const yinzhengClient = require('../yinzhengClient');
const hashEngine = require('../hashEngine');
const aiValueEngine = require('../aiValueEngine');

router.get('/types', (req, res) => {
  res.json({ success: true, data: Object.values(KOL_TASK_TYPES) });
});

router.get('/themes', (req, res) => {
  res.json({ success: true, data: KOL_TASK_THEMES });
});

router.get('/car-models', (req, res) => {
  res.json({ success: true, data: KOL_TASK_CAR_MODELS });
});

router.post('/create', async (req, res) => {
  const { bizUserId, activityId, type, title, description, rewardPerUnit, targetCount, totalRewardPool, deadline, requirements, carModel, carBrand, theme, dispatchMode, subBudgets } = req.body;
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
    carModel, carBrand, theme, dispatchMode, subBudgets,
  });
  try {
    const hashData = JSON.stringify({ id: task.id, bizUserId, title, type, carModel, theme, createdAt: task.createdAt });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: task.id, hash, dataDigest: digest,
      dataType: 'kol_task', metadata: { bizUserId, type, title, carModel, theme },
    });
    task.hash = hash;
  } catch (e) {
    console.error('[KOL Task] IP存证失败:', e.message);
  }
  res.json({ success: true, data: task });
});

router.get('/list', (req, res) => {
  const { bizUserId, activityId, status, type, carModel, theme } = req.query;
  const tasks = kolTaskStore.list({ bizUserId, activityId, status, type, carModel, theme });
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
  const remaining = task.totalRewardPool - task.usedReward;
  const budgetRatio = task.totalRewardPool > 0 ? remaining / task.totalRewardPool : 1;
  res.json({ success: true, data: { task, submissions: submissions.length, budgetRemaining: +remaining.toFixed(2), budgetRatio: +budgetRatio.toFixed(4) } });
});

router.post('/:id/submit', async (req, res) => {
  const { kolUserId, kolNickName, contentId, bookingId, proofData } = req.body;
  const task = kolTaskStore.getById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
  if (task.status !== 'open') return res.status(400).json({ success: false, error: '任务已关闭' });
  if (!kolUserId) return res.status(400).json({ success: false, error: 'kolUserId 为必填' });

  const dupCheck = kolTaskSubmissionStore.checkDuplicate(task.id, kolUserId);
  if (dupCheck) return res.status(400).json({ success: false, error: '已提交过该任务(TASK_ID+USER_ID唯一)', duplicate: true });

  if (task.totalRewardPool > 0 && task.usedReward + task.rewardPerUnit > task.totalRewardPool) {
    return res.status(400).json({ success: false, error: '任务奖励池已耗尽' });
  }

  const subResult = kolTaskSubmissionStore.create({
    taskId: task.id, kolUserId, kolNickName, type: task.type, contentId, bookingId, proofData,
  });

  if (subResult.duplicate) {
    return res.status(400).json({ success: false, error: '重复提交(TASK_ID+SUB_ID+USER_ID唯一约束)', duplicate: true });
  }

  const sub = subResult;
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

  const budgetAlert = kolTaskStore.checkBudgetAlert(task.id);
  if (budgetAlert) {
    notificationStore.create({ userId: task.bizUserId, type: 'budget_alert', title: '预算池预警', content: budgetAlert.message + '。剩余：¥' + budgetAlert.remaining.toFixed(2) });
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
  res.json({ success: true, data: { submission: kolTaskSubmissionStore.getById(sub.id), reward, aiScore, budgetAlert } });
});

router.post('/:id/replenish', (req, res) => {
  const { amount } = req.body;
  const taskId = req.params.id;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: '补款金额必须大于0' });
  }
  const task = kolTaskStore.replenishBudget(taskId, amount);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });

  notificationStore.create({ userId: task.bizUserId, type: 'budget', title: '预算已补充', content: '任务「' + task.title + '」预算已补充 ¥' + amount });

  res.json({ success: true, data: task, message: '预算补充成功' });
});

router.post('/:id/re-evaluate', async (req, res) => {
  const { submissionId } = req.body;
  const task = kolTaskStore.getById(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: '任务不存在' });

  const sub = kolTaskSubmissionStore.getById(submissionId);
  if (!sub) return res.status(404).json({ success: false, error: '提交记录不存在' });
  if (sub.taskId !== task.id) return res.status(400).json({ success: false, error: '提交记录不属于该任务' });

  let newAiScore = sub.aiScore;
  let supplementaryReward = 0;

  if (sub.contentId) {
    const content = contentStore.getById(sub.contentId);
    if (content) {
      try {
        const valueResult = await aiValueEngine.calculateValue(content, task.type === 'booking' ? 'BOOKING' : 'VIEW', { userId: sub.kolUserId, useAI: true });
        newAiScore = { quality: valueResult.breakdown?.quality || 0, spread: valueResult.breakdown?.spread || 0, kol: valueResult.breakdown?.kol || 0, conversion: valueResult.breakdown?.conversion || 0, multiplier: valueResult.weightMultiplier };
        const newReward = valueResult.finalValue || task.rewardPerUnit;
        supplementaryReward = Math.max(0, +(newReward - sub.reward).toFixed(4));
      } catch (e) {
        console.error('[KOL Task] AI重评失败:', e.message);
      }
    }
  }

  kolTaskSubmissionStore.reEvaluate(submissionId, newAiScore, supplementaryReward);

  if (supplementaryReward > 0) {
    kolTaskStore.addUsedReward(task.id, supplementaryReward);
    walletStore.addPromotion(sub.kolUserId, supplementaryReward, 'AI重评补算: ' + task.title, '');
    notificationStore.create({ userId: sub.kolUserId, type: 'wallet', title: '补算奖励到账', content: '任务「' + task.title + '」AI重评补算 ¥' + supplementaryReward.toFixed(2) });
  }

  res.json({
    success: true,
    data: { submission: kolTaskSubmissionStore.getById(submissionId), supplementaryReward, newAiScore },
    message: supplementaryReward > 0 ? 'AI重评完成，补算 ¥' + supplementaryReward.toFixed(2) : 'AI重评完成，无需补算'
  });
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
  const totalEarnings = approvedSubs.reduce((s, sub) => s + sub.reward + (sub.supplementaryReward || 0), 0);
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
