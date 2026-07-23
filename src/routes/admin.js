const express = require('express');
const router = express.Router();
const { userStore, kolTaskStore, kolTaskSubmissionStore, settlementStore, contentStore, notificationStore, adminStore, fundVerificationStore } = require('../models/dataStore');

function requireAdmin(req, res, next) {
  const userId = req.user?.userId || '';
  if (userId !== 'admin' && userId !== 'system_admin') {
    const adminUser = adminStore.users.find(u => u.userId === userId && u.role === 'admin');
    if (!adminUser) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
  }
  next();
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '用户名和密码为必填' });
  }
  if (username === 'admin' && password === 'x402admin2026') {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'x402-guiniu-secret';
    const token = jwt.sign({ userId: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, data: { token, role: 'admin' } });
  }
  return res.status(401).json({ success: false, error: '管理员认证失败' });
});

router.use(requireAdmin);

router.get('/dashboard', (req, res) => {
  const tasks = kolTaskStore.list({});
  const subs = kolTaskSubmissionStore.getByTask;
  const allSubs = [];
  const taskIds = tasks.map(t => t.id);
  for (const tid of taskIds) {
    const tSubs = kolTaskSubmissionStore.getByTask(tid);
    allSubs.push(...tSubs);
  }

  res.json({
    success: true,
    data: {
      users: { total: 0 },
      tasks: { total: tasks.length, open: tasks.filter(t => t.status === 'open').length, completed: tasks.filter(t => t.status === 'completed').length },
      submissions: { total: allSubs.length, approved: allSubs.filter(s => s.status === 'approved').length, pending: allSubs.filter(s => s.status === 'submitted').length, rejected: allSubs.filter(s => s.status === 'rejected').length },
      budget: { totalPool: tasks.reduce((s, t) => s + t.totalRewardPool, 0), usedReward: tasks.reduce((s, t) => s + t.usedReward, 0) },
    }
  });
});

router.get('/users', (req, res) => {
  const { page, pageSize } = req.query;
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  const users = userStore.list ? userStore.list({ page: p, pageSize: ps }) : { list: [], total: 0 };
  res.json({ success: true, data: users });
});

router.get('/tasks', (req, res) => {
  const tasks = kolTaskStore.list({});
  res.json({ success: true, data: { list: tasks, total: tasks.length } });
});

router.get('/submissions/pending', (req, res) => {
  const { page, pageSize } = req.query;
  const allSubs = [];
  const tasks = kolTaskStore.list({});
  for (const t of tasks) {
    allSubs.push(...kolTaskSubmissionStore.getByTask(t.id));
  }
  const pending = allSubs.filter(s => s.status === 'submitted');
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  res.json({ success: true, data: { list: pending.slice((p - 1) * ps, p * ps), total: pending.length } });
});

router.post('/submissions/:subId/review', (req, res) => {
  const { decision, reason } = req.body;
  const { subId } = req.params;
  if (!decision || !['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ success: false, error: 'decision必须为approve或reject' });
  }

  const sub = kolTaskSubmissionStore.getById(subId);
  if (!sub) return res.status(404).json({ success: false, error: '提交不存在' });

  if (decision === 'approve') {
    const task = kolTaskStore.getById(sub.taskId);
    const reward = task?.rewardPerUnit || sub.reward || 0;
    kolTaskSubmissionStore.approve(subId, reward, sub.aiScore);
    if (task) {
      kolTaskStore.addUsedReward(task.id, reward);
      walletStore.addPromotion(sub.kolUserId, reward, '管理员审核通过: ' + task.title, '');
    }
    notificationStore.create({ userId: sub.kolUserId, type: 'kol_task', title: '任务审核通过', content: '管理员已审核通过您的任务提交' });
  } else {
    kolTaskSubmissionStore.reject(subId, reason);
    notificationStore.create({ userId: sub.kolUserId, type: 'kol_task', title: '任务审核未通过', content: reason || '管理员审核未通过' });
  }

  res.json({ success: true, data: kolTaskSubmissionStore.getById(subId) });
});

router.get('/settlements', (req, res) => {
  const { status } = req.query;
  const settlements = settlementStore.list({ status, page: 1, pageSize: 50 });
  res.json({ success: true, data: settlements });
});

router.get('/budget-alerts', (req, res) => {
  const tasks = kolTaskStore.list({ status: 'open' });
  const alerts = [];
  for (const t of tasks) {
    if (t.totalRewardPool > 0) {
      const remaining = t.totalRewardPool - t.usedReward;
      const ratio = remaining / t.totalRewardPool;
      if (ratio < 0.2) {
        alerts.push({ taskId: t.id, title: t.title, bizUserId: t.bizUserId, totalPool: t.totalRewardPool, usedReward: t.usedReward, remaining: +remaining.toFixed(2), ratio: +ratio.toFixed(4), level: ratio < 0.1 ? 'critical' : 'warning' });
      }
    }
  }
  res.json({ success: true, data: { list: alerts, total: alerts.length } });
});

router.get('/actions', (req, res) => {
  const { page, pageSize } = req.query;
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 20;
  res.json({ success: true, data: { list: adminStore.actions.slice((p - 1) * ps, p * ps), total: adminStore.actions.length } });
});

module.exports = router;
