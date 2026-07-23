const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { wallets, payments, users } = require('../models/dataStore');

router.get('/balance', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const wallet = wallets.get(userId);
    if (!wallet) return res.status(404).json({ success: false, error: '钱包不存在' });

    res.json({
      success: true,
      data: {
        userId: wallet.id,
        balance: wallet.balance || 0,
        reservedAmount: wallet.reservedAmount || 0,
        availableBalance: (wallet.balance || 0) - (wallet.reservedAmount || 0),
        kycLevel: wallet.kycLevel || 'none',
        version: wallet._v || 0,
      },
    });
  } catch (e) {
    console.error('[wallet] 余额查询错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/transactions', (req, res) => {
  try {
    const { userId, type, page = 1, pageSize = 20 } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const wallet = wallets.get(userId);
    if (!wallet) return res.status(404).json({ success: false, error: '钱包不存在' });

    let txList = (wallet.transactions || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (type) txList = txList.filter(t => t.type === type);

    const total = txList.length;
    const paged = txList.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

    res.json({
      success: true,
      data: { items: paged, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) },
    });
  } catch (e) {
    console.error('[wallet] 交易列表错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/topup', (req, res) => {
  try {
    const { userId, amount, channel, subject } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId 和 amount 必填' });
    const amt = parseFloat(amount);
    if (amt <= 0) return res.status(400).json({ success: false, error: '金额必须大于0' });

    const wallet = wallets.get(userId);
    if (!wallet) return res.status(404).json({ success: false, error: '钱包不存在' });

    const user = users.get(userId);
    const kycLevel = user?.kycLevel || wallet.kycLevel || 'none';
    const dailyLimit = kycLevel === 'full' ? 50000 : kycLevel === 'basic' ? 5000 : 500;
    const todayTxs = (wallet.transactions || []).filter(t =>
      t.type === 'topup' && t.createdAt && t.createdAt.startsWith(new Date().toISOString().slice(0, 10))
    );
    const todayTotal = todayTxs.reduce((s, t) => s + (t.amount || 0), 0);
    if (todayTotal + amt > dailyLimit) {
      return res.status(400).json({
        success: false,
        error: `超过日充值限额 ¥${dailyLimit}，今日已充 ¥${todayTotal.toFixed(2)}`,
        dailyLimit,
        todayTotal: parseFloat(todayTotal.toFixed(2)),
      });
    }

    const txId = 'tx_topup_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    wallets.withLock(userId, (w) => {
      w.balance = (w.balance || 0) + amt;
      w.transactions.push({
        id: txId,
        userId,
        type: 'topup',
        amount: amt,
        subject: subject || '充值',
        channel: channel || 'alipay',
        refId: 'TOPUP-' + Date.now(),
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
      return w;
    });

    const updated = wallets.get(userId);
    res.json({
      success: true,
      data: {
        txId,
        userId,
        amount: amt,
        balance: updated.balance,
        availableBalance: updated.balance - (updated.reservedAmount || 0),
        channel: channel || 'alipay',
        message: '充值成功',
      },
    });
  } catch (e) {
    console.error('[wallet] 充值错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/withdraw', (req, res) => {
  try {
    const { userId, amount, channel, bankInfo, subject } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId 和 amount 必填' });
    const amt = parseFloat(amount);
    if (amt <= 0) return res.status(400).json({ success: false, error: '金额必须大于0' });

    const wallet = wallets.get(userId);
    if (!wallet) return res.status(404).json({ success: false, error: '钱包不存在' });

    const available = (wallet.balance || 0) - (wallet.reservedAmount || 0);
    if (available < amt) {
      return res.status(400).json({ success: false, error: `余额不足，可用 ¥${available.toFixed(2)}` });
    }

    const MIN_WITHDRAW = 1;
    if (amt < MIN_WITHDRAW) return res.status(400).json({ success: false, error: `最低提现金额 ¥${MIN_WITHDRAW}` });

    const fee = channel === 'ecny' ? 0 : Math.max(0.01, amt * 0.001);
    const actualAmount = parseFloat((amt - fee).toFixed(2));

    const txId = 'tx_withdraw_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    wallets.withLock(userId, (w) => {
      const avail = (w.balance || 0) - (w.reservedAmount || 0);
      if (avail < amt) return false;
      w.balance = (w.balance || 0) - amt;
      w.transactions.push({
        id: txId,
        userId,
        type: 'withdraw',
        amount: -amt,
        fee,
        actualAmount,
        subject: subject || '提现',
        channel: channel || 'alipay',
        bankInfo: bankInfo || null,
        refId: 'WD-' + Date.now(),
        status: 'processing',
        createdAt: new Date().toISOString(),
      });
      return w;
    });

    const updated = wallets.get(userId);
    res.json({
      success: true,
      data: {
        txId,
        userId,
        amount: amt,
        fee: parseFloat(fee.toFixed(2)),
        actualAmount,
        balance: updated?.balance || 0,
        availableBalance: ((updated?.balance || 0) - (updated?.reservedAmount || 0)),
        channel: channel || 'alipay',
        status: 'processing',
        message: '提现申请已提交',
      },
    });
  } catch (e) {
    console.error('[wallet] 提现错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/transfer', (req, res) => {
  try {
    const { fromUserId, toUserId, amount, subject, idempotencyKey } = req.body;
    if (!fromUserId || !toUserId || !amount) {
      return res.status(400).json({ success: false, error: 'fromUserId, toUserId, amount 必填' });
    }
    if (fromUserId === toUserId) return res.status(400).json({ success: false, error: '不能转给自己' });
    const amt = parseFloat(amount);
    if (amt <= 0) return res.status(400).json({ success: false, error: '金额必须大于0' });

    const fromWallet = wallets.get(fromUserId);
    if (!fromWallet) return res.status(404).json({ success: false, error: '转出钱包不存在' });

    const fromAvailable = (fromWallet.balance || 0) - (fromWallet.reservedAmount || 0);
    if (fromAvailable < amt) {
      return res.status(400).json({ success: false, error: `余额不足，可用 ¥${fromAvailable.toFixed(2)}` });
    }

    let toWallet = wallets.get(toUserId);
    if (!toWallet) {
      wallets.set(toUserId, {
        id: toUserId,
        balance: 0,
        reservedAmount: 0,
        transactions: [],
        kycLevel: 'none',
        createdAt: new Date().toISOString(),
      });
      toWallet = wallets.get(toUserId);
    }

    const txId = 'tx_transfer_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');

    const debitResult = wallets.withLock(fromUserId, (w) => {
      const avail = (w.balance || 0) - (w.reservedAmount || 0);
      if (avail < amt) return false;
      w.balance = (w.balance || 0) - amt;
      w.transactions.push({
        id: txId,
        userId: fromUserId,
        type: 'transfer_out',
        amount: -amt,
        subject: subject || '转账',
        toUserId,
        refId: txId,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
      return w;
    });

    if (!debitResult.success) {
      return res.json({ success: false, error: '扣款失败，余额不足' });
    }

    wallets.withLock(toUserId, (w) => {
      w.balance = (w.balance || 0) + amt;
      w.transactions.push({
        id: txId + '_in',
        userId: toUserId,
        type: 'transfer_in',
        amount: amt,
        subject: subject || '收到转账',
        fromUserId,
        refId: txId,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
      return w;
    });

    const paymentId = 'pay_transfer_' + Date.now().toString(36);
    payments.set(paymentId, {
      id: paymentId,
      payerId: fromUserId,
      payeeId: toUserId,
      amount: amt,
      subject: subject || '钱包转账',
      channel: 'balance',
      status: 'completed',
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        txId,
        fromUserId,
        toUserId,
        amount: amt,
        subject: subject || '转账',
        message: '转账成功',
      },
    });
  } catch (e) {
    console.error('[wallet] 转账错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/create', (req, res) => {
  try {
    const { userId, kycLevel } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const existing = wallets.get(userId);
    if (existing) return res.json({ success: true, data: existing, message: '钱包已存在', duplicate: true });

    const wallet = {
      id: userId,
      balance: 0,
      reservedAmount: 0,
      transactions: [],
      kycLevel: kycLevel || 'none',
      createdAt: new Date().toISOString(),
    };
    wallets.set(userId, wallet);
    res.json({ success: true, data: wallet, message: '钱包创建成功' });
  } catch (e) {
    console.error('[wallet] 创建钱包错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/summary', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const wallet = wallets.get(userId);
    if (!wallet) return res.status(404).json({ success: false, error: '钱包不存在' });

    const txs = wallet.transactions || [];
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const monthTxs = txs.filter(t => t.createdAt && t.createdAt.startsWith(thisMonth));

    const summary = {
      userId,
      balance: wallet.balance || 0,
      reservedAmount: wallet.reservedAmount || 0,
      availableBalance: (wallet.balance || 0) - (wallet.reservedAmount || 0),
      totalTransactions: txs.length,
      monthTransactions: monthTxs.length,
      monthTopup: monthTxs.filter(t => t.type === 'topup').reduce((s, t) => s + (t.amount || 0), 0),
      monthWithdraw: monthTxs.filter(t => t.type === 'withdraw').reduce((s, t) => s + Math.abs(t.amount || 0), 0),
      monthSpent: monthTxs.filter(t => t.type === 'payment_confirmed' || t.type === 'transfer_out').reduce((s, t) => s + Math.abs(t.amount || 0), 0),
      monthIncome: monthTxs.filter(t => t.type === 'receipt' || t.type === 'split_receipt' || t.type === 'transfer_in').reduce((s, t) => s + (t.amount || 0), 0),
      kycLevel: wallet.kycLevel || 'none',
    };

    res.json({ success: true, data: summary });
  } catch (e) {
    console.error('[wallet] 汇总错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
