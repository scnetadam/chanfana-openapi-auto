const express = require('express');
const router = express.Router();
const { fundVerificationStore, walletStore, settlementStore, notificationStore } = require('../models/dataStore');

router.post('/bind-alipay', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { alipayAccount, realName } = req.body;
  if (!alipayAccount || !realName) {
    return res.status(400).json({ success: false, error: '支付宝账号和真实姓名为必填' });
  }

  const record = {
    id: 'fv-' + Date.now(),
    userId,
    type: 'alipay',
    account: alipayAccount,
    realName,
    status: 'pending_verification',
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  };

  fundVerificationStore.records.push(record);

  res.json({
    success: true,
    data: record,
    message: '支付宝账号已提交，待验证(沙箱环境自动通过)',
    note: '生产环境需调用支付宝实名认证API验证'
  });
});

router.post('/bind-wechat', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { wechatOpenId, realName } = req.body;
  if (!wechatOpenId) {
    return res.status(400).json({ success: false, error: '微信OpenID为必填' });
  }

  const record = {
    id: 'fv-' + Date.now(),
    userId,
    type: 'wechat',
    account: wechatOpenId,
    realName: realName || '',
    status: 'pending_verification',
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  };

  fundVerificationStore.records.push(record);

  res.json({
    success: true,
    data: record,
    message: '微信账号已提交，待验证(沙箱环境自动通过)',
    note: '生产环境需调用微信实名认证API验证'
  });
});

router.post('/bind-bank', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { bankName, bankAccount, realName, idCard, phone } = req.body;
  if (!bankName || !bankAccount || !realName || !idCard || !phone) {
    return res.status(400).json({ success: false, error: '银行名称、银行卡号、真实姓名、身份证号、手机号为必填(四要素验证)' });
  }

  if (idCard.length !== 18) {
    return res.status(400).json({ success: false, error: '身份证号必须为18位' });
  }

  const record = {
    id: 'fv-' + Date.now(),
    userId,
    type: 'bank',
    bankName,
    account: bankAccount,
    realName,
    idCardLast4: idCard.slice(-4),
    phone,
    status: 'pending_verification',
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  };

  fundVerificationStore.records.push(record);

  res.json({
    success: true,
    data: record,
    message: '银行卡信息已提交，四要素验证中(沙箱环境自动通过)',
    note: '生产环境需调用银行四要素验证API(姓名+身份证+卡号+手机号)'
  });
});

router.get('/status', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const records = fundVerificationStore.records.filter(r => r.userId === userId);

  const byType = {};
  for (const r of records) {
    if (!byType[r.type] || new Date(r.createdAt) > new Date(byType[r.type].createdAt)) {
      byType[r.type] = r;
    }
  }

  res.json({
    success: true,
    data: {
      hasAlipay: !!byType.alipay,
      alipayVerified: byType.alipay?.status === 'verified',
      hasWechat: !!byType.wechat,
      wechatVerified: byType.wechat?.status === 'verified',
      hasBank: !!byType.bank,
      bankVerified: byType.bank?.status === 'verified',
      records: Object.values(byType),
    }
  });
});

router.post('/verify/:recordId', (req, res) => {
  const { recordId } = req.params;
  const record = fundVerificationStore.records.find(r => r.id === recordId);
  if (!record) {
    return res.status(404).json({ success: false, error: '验证记录不存在' });
  }

  record.status = 'verified';
  record.verifiedAt = new Date().toISOString();

  notificationStore.create({ userId: record.userId, type: 'wallet', title: '资金账户验证通过', content: record.type === 'alipay' ? '支付宝账号验证通过' : (record.type === 'wechat' ? '微信账号验证通过' : '银行卡验证通过') });

  res.json({ success: true, data: record, message: '验证通过(沙箱自动通过)' });
});

router.post('/settle-now', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { amount, toType, settlementType } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: '结算金额必须大于0' });
  }

  const wallet = walletStore.get(userId);
  if (!wallet || wallet.balance < amount) {
    return res.status(400).json({ success: false, error: '余额不足' });
  }

  const fundRecords = fundVerificationStore.records.filter(r => r.userId === userId && r.status === 'verified');
  const targetAccount = fundRecords.find(r => r.type === (toType || 'alipay'));
  if (!targetAccount) {
    return res.status(400).json({ success: false, error: '未验证对应的资金账户，请先完成验证' });
  }

  walletStore.withdraw(userId, amount, '实时结算到' + targetAccount.type);

  const settlement = settlementStore.create({
    fromUserId: userId,
    toUserId: userId,
    amount,
    fee: +(amount * 0.006).toFixed(4),
    type: settlementType || 'realtime_withdrawal',
    description: '实时结算到' + targetAccount.type + ' (' + targetAccount.account.slice(-4) + ')',
  });

  settlementStore.updateStatus(settlement.id, 'completed', { yinzhengTxId: 'realtime-settle-' + Date.now() });

  notificationStore.create({ userId, type: 'wallet', title: '实时结算完成', content: '已结算 ¥' + amount.toFixed(2) + ' 到' + targetAccount.type });

  res.json({
    success: true,
    data: { settlement, targetAccount: { type: targetAccount.type, accountLast4: targetAccount.account.slice(-4) } },
    message: '实时结算成功'
  });
});

router.get('/records', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const records = fundVerificationStore.records.filter(r => r.userId === userId);
  res.json({ success: true, data: { list: records, total: records.length } });
});

module.exports = router;
