const express = require('express');
const router = express.Router();
const { notificationStore, notificationTemplate, userNotificationPref, walletStore } = require('../models/dataStore');

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
      console.log(`[NotifyChannel:sms] SANDBOX -> ${target}: ${body}`);
      return { success: true, channel: 'sms', target, provider: 'sandbox', sentAt: new Date().toISOString() };
    }
    try {
      const axios = require('axios');
      const resp = await axios.post(process.env.SMS_GATEWAY_URL, {
        phone: target, content: body, sign: this.signName, apiKey: this.apiKey,
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
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@guiniu-deveco.com';
  }

  async send(target, title, body, options) {
    if (!target) return { success: false, channel: 'email', error: '邮箱地址缺失' };
    if (this.provider === 'sandbox') {
      console.log(`[NotifyChannel:email] SANDBOX -> ${target}: ${title}`);
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

    const record = notificationStore.create({
      userId,
      type: category || 'system',
      title: title || '',
      content: body || '',
      channel,
      channelLabel: CHANNEL_TYPES[channel]?.label || channel,
      category,
      actionUrl: actionUrl || '',
      actionText: actionText || '',
      priority: priority || 'medium',
      variables: variables || {},
      status: channel === 'login' ? 'pending_display' : (sendResult.success ? 'sent' : 'failed'),
      sendResult,
      sentAt: new Date().toISOString(),
    });

    return record;
  }

  static _getUserChannelPref(userId, channel) {
    if (!userNotificationPref) return null;
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

function fillTemplate(template, vars) {
  let result = template;
  Object.entries(vars).forEach(([key, val]) => { result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val || '')); });
  return result;
}

function getUserEarningsInfo(userId) {
  const wallet = walletStore.get(userId);
  const balance = wallet?.promotionBalance || 0;
  return { pendingAmount: balance, hasEarnings: balance > 0 };
}

router.post('/send', async (req, res) => {
  const { userId, category, channel, templateId, variables, customTitle, customBody, channels } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  let title = customTitle || '', body = customBody || '', actionUrl = '', actionText = '', priority = 'medium';

  if (templateId && notificationTemplate) {
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

router.get('/list', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  const list = notificationStore.getByUser(userId);
  res.json({ success: true, data: { list, total: list.length } });
});

router.get('/unread-count', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  const count = notificationStore.getUnreadCount(userId);
  res.json({ success: true, data: { total: count } });
});

router.post('/read', (req, res) => {
  const { userId, notificationId } = req.body;
  if (!userId || !notificationId) return res.status(400).json({ success: false, error: 'userId and notificationId required' });
  notificationStore.markRead(userId, notificationId);
  res.json({ success: true, data: { read: true } });
});

router.post('/read-all', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  notificationStore.markAllRead(userId);
  res.json({ success: true, data: { read: true } });
});

router.post('/pref/set', (req, res) => {
  const { userId, channel, enabled, target } = req.body;
  if (!userId || !channel) return res.status(400).json({ success: false, error: 'userId 和 channel 为必填' });
  const prefId = `${userId}:${channel}`;
  const existing = userNotificationPref ? userNotificationPref.get(prefId) : null;
  const pref = { ...(existing || {}), id: prefId, userId, channel, channelLabel: CHANNEL_TYPES[channel]?.label || channel, enabled: enabled !== undefined ? enabled : true, target: target || existing?.target || '', updatedAt: new Date().toISOString(), createdAt: existing?.createdAt || new Date().toISOString() };
  if (userNotificationPref) userNotificationPref.set(prefId, pref);
  res.json({ success: true, data: pref });
});

router.get('/pref/list', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const prefs = userNotificationPref ? userNotificationPref.find(p => p.userId === userId) : [];
  const allChannels = Object.entries(CHANNEL_TYPES).map(([key, val]) => {
    const existing = prefs.find(p => p.channel === key);
    return { channel: key, label: val.label, description: val.description, icon: val.icon, enabled: existing ? existing.enabled : true, target: existing?.target || '' };
  });
  res.json({ success: true, data: allChannels });
});

router.get('/categories', (req, res) => {
  res.json({ success: true, data: { categories: Object.entries(NOTIFICATION_CATEGORIES).map(([key, val]) => ({ key, ...val })), channels: Object.entries(CHANNEL_TYPES).map(([key, val]) => ({ key, ...val })) } });
});

router.get('/channels/status', (req, res) => {
  const status = Object.entries(NotificationDispatcher._channels).map(([type, ch]) => ({
    type, enabled: ch.isEnabled(), provider: ch.provider || 'sandbox',
  }));
  res.json({ success: true, data: status });
});

module.exports = { router, NotificationDispatcher };
