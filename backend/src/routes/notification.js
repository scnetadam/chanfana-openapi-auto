const express = require('express');
const router = express.Router();
const { notification, notificationTemplate, userNotificationPref, wallets, payments } = require('../models/dataStore');

const CHANNEL_TYPES = {
  sms: { label: '短信', description: '手机短信通知', icon: 'sms' },
  email: { label: '邮件', description: '电子邮件通知', icon: 'email' },
  login: { label: '登录提示', description: '用户登录时弹窗提醒', icon: 'login' },
  in_app: { label: '站内通知', description: '应用内消息中心', icon: 'in_app' },
};

const NOTIFICATION_CATEGORIES = {
  earnings_claim: { label: '收益领取提醒', description: '注册用户领取收益提示', priority: 'high' },
  earnings_settled: { label: '收益到账通知', description: '收益已结算到账', priority: 'high' },
  data_lock: { label: '数据锁定通知', description: '数据锁定存证完成', priority: 'medium' },
  git_sync: { label: 'GIT同步通知', description: '仓库数据同步完成', priority: 'low' },
  payment_received: { label: '收款通知', description: '收到支付款项', priority: 'high' },
  tax_compliance: { label: '税务合规通知', description: '税务合规提醒', priority: 'high' },
  threshold_trigger: { label: '阀值触发通知', description: '龟钮点阀值触发分账', priority: 'high' },
  system: { label: '系统通知', description: '系统公告和通知', priority: 'medium' },
};

class NotifyChannel {
  constructor(type) {
    this.type = type;
    this.enabled = true;
  }

  async send(target, title, body, options) {
    throw new Error('NotifyChannel.send must be implemented');
  }

  isEnabled() { return this.enabled; }
}

class SmsChannel extends NotifyChannel {
  constructor() {
    super('sms');
    this.provider = process.env.SMS_PROVIDER || 'sandbox';
    this.apiKey = process.env.SMS_API_KEY || '';
    this.signName = process.env.SMS_SIGN_NAME || '龟钮自驭';
  }

  async send(target, title, body, options) {
    if (!target) return { success: false, channel: 'sms', error: '手机号缺失' };
    if (this.provider === 'sandbox') {
      console.log(`[NotifyChannel:sms] SANDBOX → ${target}: ${body}`);
      return { success: true, channel: 'sms', target, provider: 'sandbox', sentAt: new Date().toISOString() };
    }
    try {
      const axios = require('axios');
      const resp = await axios.post(process.env.SMS_GATEWAY_URL, {
        phone: target,
        content: body,
        sign: this.signName,
        apiKey: this.apiKey,
      }, { timeout: 5000 });
      return { success: true, channel: 'sms', target, provider: this.provider, response: resp.data, sentAt: new Date().toISOString() };
    } catch (e) {
      console.error('[NotifyChannel:sms] 发送失败:', e.message);
      return { success: false, channel: 'sms', target, error: e.message };
    }
  }
}

class EmailChannel extends NotifyChannel {
  constructor() {
    super('email');
    this.provider = process.env.EMAIL_PROVIDER || 'sandbox';
    this.smtpHost = process.env.SMTP_HOST || '';
    this.smtpPort = process.env.SMTP_PORT || 587;
    this.smtpUser = process.env.SMTP_USER || '';
    this.smtpPass = process.env.SMTP_PASS || '';
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@guiniu-seal.com';
  }

  async send(target, title, body, options) {
    if (!target) return { success: false, channel: 'email', error: '邮箱地址缺失' };
    if (this.provider === 'sandbox') {
      console.log(`[NotifyChannel:email] SANDBOX → ${target}: ${title}`);
      return { success: true, channel: 'email', target, provider: 'sandbox', sentAt: new Date().toISOString() };
    }
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({ host: this.smtpHost, port: this.smtpPort, secure: false, auth: { user: this.smtpUser, pass: this.smtpPass } });
      const info = await transporter.sendMail({ from: this.fromAddress, to: target, subject: title, text: body, html: options?.html || body.replace(/\n/g, '<br>') });
      return { success: true, channel: 'email', target, provider: this.provider, messageId: info.messageId, sentAt: new Date().toISOString() };
    } catch (e) {
      console.error('[NotifyChannel:email] 发送失败:', e.message);
      return { success: false, channel: 'email', target, error: e.message };
    }
  }
}

class InAppChannel extends NotifyChannel {
  constructor() { super('in_app'); }

  async send(target, title, body, options) {
    return { success: true, channel: 'in_app', target, note: '站内通知已记录', sentAt: new Date().toISOString() };
  }
}

class LoginChannel extends NotifyChannel {
  constructor() { super('login'); }

  async send(target, title, body, options) {
    return { success: true, channel: 'login', target, note: '登录提示已排队', status: 'pending_display', sentAt: new Date().toISOString() };
  }
}

class NotificationDispatcher {
  static _channels = {
    sms: new SmsChannel(),
    email: new EmailChannel(),
    in_app: new InAppChannel(),
    login: new LoginChannel(),
  };

  static registerChannel(type, channelInstance) {
    this._channels[type] = channelInstance;
  }

  static getChannel(type) {
    return this._channels[type] || null;
  }

  static async dispatch(params) {
    const { userId, category, channel, title, body, variables, actionUrl, actionText, priority, options } = params;
    const ch = this._channels[channel];
    if (!ch) return { success: false, error: `未知通知渠道: ${channel}` };

    const userPrefs = this._getUserChannelPref(userId, channel);
    if (userPrefs && !userPrefs.enabled) {
      return { success: false, error: `用户已禁用 ${channel} 通知`, suppressed: true };
    }

    const target = this._resolveTarget(userId, channel, variables, userPrefs);

    const sendResult = await ch.send(target, title, body, options);

    const record = {
      id: `NTF-${Date.now()}-${channel}`,
      userId,
      category,
      channel,
      channelLabel: CHANNEL_TYPES[channel]?.label || channel,
      title,
      body,
      actionUrl: actionUrl || '',
      actionText: actionText || '',
      priority: priority || 'medium',
      variables: variables || {},
      status: channel === 'login' ? 'pending_display' : (sendResult.success ? 'sent' : 'failed'),
      sendResult,
      readAt: null,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const { notification: notificationStore } = require('../models/dataStore');
    notificationStore.set(record.id, record);
    return record;
  }

  static _getUserChannelPref(userId, channel) {
    const { userNotificationPref } = require('../models/dataStore');
    return userNotificationPref.get(`${userId}:${channel}`) || null;
  }

  static _resolveTarget(userId, channel, variables, userPrefs) {
    if (channel === 'sms') return variables?.phone || userPrefs?.target || '';
    if (channel === 'email') return variables?.email || userPrefs?.target || '';
    return userId;
  }

  static async dispatchMultiChannel(params) {
    const { channels, ...rest } = params;
    const targetChannels = channels || ['in_app'];
    const results = [];
    for (const ch of targetChannels) {
      const result = await this.dispatch({ ...rest, channel: ch });
      results.push(result);
    }
    return results;
  }
}

function initTemplateSeeds() {
  const existing = notificationTemplate.getAll();
  if (existing.length > 0) return;
  const templates = [
    { id: 'tpl-earnings-claim-login', category: 'earnings_claim', channel: 'login', title: '您有未领取的收益', body: '尊敬的龟钮自驭用户，您有 ¥{amount} 待领取收益，请前往钱包查看。', priority: 'high', actionUrl: '/pages/wallet/index', actionText: '立即查看' },
    { id: 'tpl-earnings-claim-sms', category: 'earnings_claim', channel: 'sms', title: '龟钮自驭收益提醒', body: '【龟钮自驭】您有¥{amount}待领取收益，请登录领取。退订回T', priority: 'high' },
    { id: 'tpl-earnings-claim-email', category: 'earnings_claim', channel: 'email', title: '龟钮自驭 — 您有未领取的收益', body: '尊敬的用户，\n\n您在龟钮自驭平台有 ¥{amount} 待领取收益。\n\n来源：{source}\n时间：{date}\n\n请登录龟钮自驭小程序领取您的收益。\n\n龟钮自驭团队', priority: 'high' },
    { id: 'tpl-earnings-settled', category: 'earnings_settled', channel: 'login', title: '收益已到账', body: '您的 ¥{amount} 收益已结算到账，来自{source}。', priority: 'high', actionUrl: '/pages/wallet/index' },
    { id: 'tpl-earnings-settled-sms', category: 'earnings_settled', channel: 'sms', title: '龟钮自驭收益到账', body: '【龟钮自驭】您¥{amount}收益已到账，来源{source}。退订回T', priority: 'high' },
    { id: 'tpl-data-lock', category: 'data_lock', channel: 'in_app', title: '数据已锁定存证', body: '您的{sourceLabel}数据已成功锁定存证，Hash: {hash}', priority: 'medium', actionUrl: '/pages/dataLock/index' },
    { id: 'tpl-payment-received', category: 'payment_received', channel: 'login', title: '收到款项', body: '您收到 ¥{amount} 款项，来自{source}。', priority: 'high', actionUrl: '/pages/wallet/index' },
    { id: 'tpl-git-sync', category: 'git_sync', channel: 'in_app', title: '仓库数据已同步', body: 'guiniu-seal 仓库数据已同步：stars={stars} forks={forks}', priority: 'low' },
    { id: 'tpl-daily-earnings-sms', category: 'earnings_claim', channel: 'sms', title: '龟钮自驭每日收益提醒', body: '【龟钮自驭】您有¥{amount}待领取收益，请登录查看。退订回T', priority: 'high' },
    { id: 'tpl-daily-earnings-email', category: 'earnings_claim', channel: 'email', title: '龟钮自驭每日收益提醒', body: '尊敬的用户，\n\n截至{date}，您在龟钮自驭有 ¥{amount} 待领取收益。\n\n请登录领取。\n\n龟钮自驭团队', priority: 'high' },
    { id: 'tpl-tax-compliance', category: 'tax_compliance', channel: 'email', title: '龟钮自驭税务合规提醒', body: '尊敬的用户，您有待申报的税务记录，请及时在个税APP完成清税。合规可获加权奖励。', priority: 'high' },
    { id: 'tpl-threshold-trigger', category: 'threshold_trigger', channel: 'login', title: '龟钮点已触发分账', body: '您的龟钮点累计已达阀值，¥{amount}分账订单已触发。', priority: 'high', actionUrl: '/pages/wallet/index' },
  ];
  templates.forEach(t => notificationTemplate.set(t.id, t));
  console.log('[notification] 模板种子初始化:', templates.length, '条');
}
initTemplateSeeds();

function fillTemplate(template, vars) {
  let result = template;
  Object.entries(vars).forEach(([key, val]) => { result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val || '')); });
  return result;
}

function getUserEarningsInfo(userId) {
  const wallet = wallets.get(userId);
  const balance = wallet?.balance || 0;
  const txs = wallet?.transactions || [];
  const incomingTxs = txs.filter(t => t.amount > 0);
  const totalIncoming = incomingTxs.reduce((s, t) => s + (t.amount || 0), 0);
  return { pendingAmount: balance, totalIncoming, hasEarnings: balance > 0 };
}

router.post('/send', async (req, res) => {
  const { userId, category, channel, templateId, variables, customTitle, customBody, channels } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  let title = customTitle || '', body = customBody || '', actionUrl = '', actionText = '', priority = 'medium';

  if (templateId) {
    const tpl = notificationTemplate.get(templateId);
    if (tpl) {
      title = fillTemplate(tpl.title, variables || {});
      body = fillTemplate(tpl.body, variables || {});
      actionUrl = tpl.actionUrl || '';
      actionText = tpl.actionText || '';
      priority = tpl.priority || 'medium';
    }
  } else if (category && NOTIFICATION_CATEGORIES[category]) {
    title = title || NOTIFICATION_CATEGORIES[category].label;
    priority = NOTIFICATION_CATEGORIES[category].priority;
  }

  const cat = category || 'system';

  if (channels && Array.isArray(channels) && channels.length > 1) {
    const results = await NotificationDispatcher.dispatchMultiChannel({
      userId, category: cat, channels, title, body, variables: variables || {}, actionUrl, actionText, priority,
    });
    return res.json({ success: true, data: results });
  }

  const ch = channel || 'in_app';
  const result = await NotificationDispatcher.dispatch({
    userId, category: cat, channel: ch, title, body, variables: variables || {}, actionUrl, actionText, priority,
  });
  res.json({ success: true, data: result });
});

router.post('/earnings-reminder', async (req, res) => {
  const { userId, channels, phone, email } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const earningsInfo = getUserEarningsInfo(userId);
  const targetChannels = channels || ['login', 'in_app'];
  if (!earningsInfo.hasEarnings) return res.json({ success: true, data: { userId, hasEarnings: false, message: '无待领取收益' } });
  const vars = { amount: earningsInfo.pendingAmount.toFixed(2), source: '龟钮自驭平台', date: new Date().toISOString().slice(0, 10), phone: phone || '', email: email || '' };
  const results = await NotificationDispatcher.dispatchMultiChannel({
    userId, category: 'earnings_claim', channels: targetChannels, title: `您有 ¥${vars.amount} 待领取收益`, body: `尊敬的龟钮自驭用户，您有 ¥${vars.amount} 待领取收益，请前往钱包查看。`, variables: vars, actionUrl: '/pages/wallet/index', actionText: '立即查看', priority: 'high',
  });
  res.json({ success: true, data: { userId, hasEarnings: true, totalPending: earningsInfo.pendingAmount, notifications: results } });
});

router.post('/daily-reminder', async (req, res) => {
  const { userId, phone, email } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const earningsInfo = getUserEarningsInfo(userId);
  if (!earningsInfo.hasEarnings) return res.json({ success: true, data: { userId, hasEarnings: false, message: '无待领取收益，跳过每日提醒' } });
  const vars = { amount: earningsInfo.pendingAmount.toFixed(2), source: '龟钮自驭平台', date: new Date().toISOString().slice(0, 10), phone: phone || '', email: email || '' };
  const targetChannels = [];
  if (phone) targetChannels.push('sms');
  if (email) targetChannels.push('email');
  targetChannels.push('login');
  const results = await NotificationDispatcher.dispatchMultiChannel({
    userId, category: 'earnings_claim', channels: targetChannels,
    title: `龟钮自驭每日收益提醒: ¥${vars.amount}`, body: `截至${vars.date}，您在龟钮自驭有 ¥${vars.amount} 待领取收益。`, variables: vars, actionUrl: '/pages/wallet/index', actionText: '立即查看', priority: 'high',
  });
  res.json({ success: true, data: { userId, hasEarnings: true, totalPending: earningsInfo.pendingAmount, dailyReminders: results } });
});

router.get('/login-reminders', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const pending = notification.find(n => n.userId === userId && n.channel === 'login' && n.status === 'pending_display');
  pending.sort((a, b) => { const pOrder = { high: 0, medium: 1, low: 2 }; return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1); });
  res.json({ success: true, data: { reminders: pending, count: pending.length, hasEarningsReminder: pending.some(n => n.category === 'earnings_claim') } });
});

router.post('/mark-read', (req, res) => {
  const { notificationIds, userId } = req.body;
  if (!notificationIds || !Array.isArray(notificationIds)) return res.status(400).json({ success: false, error: 'notificationIds 数组为必填' });
  let marked = 0;
  notificationIds.forEach(id => { const n = notification.get(id); if (n && (!userId || n.userId === userId)) { n.readAt = new Date().toISOString(); n.status = 'read'; notification.set(id, n); marked++; } });
  res.json({ success: true, data: { marked } });
});

router.post('/dismiss-reminder', (req, res) => {
  const { id, userId } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
  const n = notification.get(id);
  if (!n) return res.status(404).json({ success: false, error: '通知不存在' });
  n.status = 'dismissed'; n.readAt = new Date().toISOString();
  notification.set(id, n);
  res.json({ success: true, data: { id, status: 'dismissed' } });
});

router.get('/list', (req, res) => {
  const { userId, category, channel, status, page = 1, pageSize = 20 } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  let records = notification.find(n => n.userId === userId);
  if (category) records = records.filter(n => n.category === category);
  if (channel) records = records.filter(n => n.channel === channel);
  if (status) records = records.filter(n => n.status === status);
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = records.filter(n => !n.readAt).length;
  const total = records.length;
  const paged = records.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
  res.json({ success: true, data: { items: paged, total, unreadCount, page: Number(page), pageSize: Number(pageSize) } });
});

router.get('/unread-count', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const all = notification.find(n => n.userId === userId && !n.readAt);
  const countByCategory = {};
  all.forEach(n => { countByCategory[n.category] = (countByCategory[n.category] || 0) + 1; });
  res.json({ success: true, data: { total: all.length, byCategory: countByCategory, hasEarningsReminder: all.some(n => n.category === 'earnings_claim') } });
});

router.post('/pref/set', (req, res) => {
  const { userId, channel, enabled, target } = req.body;
  if (!userId || !channel) return res.status(400).json({ success: false, error: 'userId 和 channel 为必填' });
  const prefId = `${userId}:${channel}`;
  const existing = userNotificationPref.get(prefId) || {};
  const pref = { ...existing, id: prefId, userId, channel, channelLabel: CHANNEL_TYPES[channel]?.label || channel, enabled: enabled !== undefined ? enabled : true, target: target || existing.target || '', updatedAt: new Date().toISOString(), createdAt: existing.createdAt || new Date().toISOString() };
  userNotificationPref.set(prefId, pref);
  res.json({ success: true, data: pref });
});

router.get('/pref/list', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const prefs = userNotificationPref.find(p => p.userId === userId);
  const allChannels = Object.entries(CHANNEL_TYPES).map(([key, val]) => {
    const existing = prefs.find(p => p.channel === key);
    return { channel: key, label: val.label, description: val.description, icon: val.icon, enabled: existing ? existing.enabled : true, target: existing?.target || '' };
  });
  res.json({ success: true, data: allChannels });
});

router.get('/categories', (req, res) => {
  res.json({ success: true, data: { categories: Object.entries(NOTIFICATION_CATEGORIES).map(([key, val]) => ({ key, ...val })), channels: Object.entries(CHANNEL_TYPES).map(([key, val]) => ({ key, ...val })) } });
});

router.get('/templates', (req, res) => {
  let templates = notificationTemplate.getAll();
  const { category, channel } = req.query;
  if (category) templates = templates.filter(t => t.category === category);
  if (channel) templates = templates.filter(t => t.channel === channel);
  res.json({ success: true, data: templates });
});

router.get('/channels/status', (req, res) => {
  const status = Object.entries(NotificationDispatcher._channels).map(([type, ch]) => ({
    type,
    enabled: ch.isEnabled(),
    provider: ch.provider || 'sandbox',
  }));
  res.json({ success: true, data: status });
});

module.exports = { router, NotificationDispatcher };
