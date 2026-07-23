const express = require('express');
const router = express.Router();
const { payments, wallets, idempotency } = require('../models/dataStore');

router.post('/create', (req, res) => {
  try {
    const { payerId, payeeId, amount, subject, channel, idempotencyKey } = req.body;
    if (!payerId || !payeeId || !amount) {
      return res.status(400).json({ success: false, error: 'payerId, payeeId, amount 为必填' });
    }

    if (idempotencyKey) {
      const dup = idempotency.check(idempotencyKey);
      if (dup.isDuplicate) {
        return res.json({ success: true, data: dup.result, idempotent: true });
      }
    }

    const payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payerId,
      payeeId,
      amount: Number(amount),
      subject: subject || '转账',
      channel: channel || 'balance',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    payments.set(payment.id, payment);

    if (idempotencyKey) {
      idempotency.complete(idempotencyKey, payment);
    }

    res.json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] 创建错误:', e);
    if (req.body.idempotencyKey) idempotency.fail(req.body.idempotencyKey, e.message);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/confirm', (req, res) => {
  try {
    const { id, idempotencyKey } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });

    if (idempotencyKey) {
      const dup = idempotency.check(idempotencyKey);
      if (dup.isDuplicate) {
        return res.json({ success: true, data: dup.result, idempotent: true });
      }
    }

    const payment = payments.get(id);
    if (!payment) return res.status(404).json({ success: false, error: '支付记录不存在' });
    if (payment.status !== 'pending') {
      const result = { success: false, error: `当前状态不允许确认: ${payment.status}`, currentStatus: payment.status };
      if (idempotencyKey) idempotency.complete(idempotencyKey, result);
      return res.json(result);
    }

    const lockResult = wallets.withLock(payment.payerId, (wallet) => {
      if ((wallet.balance || 0) < payment.amount) {
        return false;
      }
      wallet.balance -= payment.amount;
      wallet.transactions.push({
        id: `tx_${Date.now()}`,
        userId: payment.payerId,
        type: 'payment',
        amount: -payment.amount,
        subject: payment.subject,
        refId: payment.id,
        createdAt: new Date().toISOString(),
      });
      return wallet;
    });

    if (!lockResult.success) {
      const errResult = { success: false, error: lockResult.error === 'operation_rejected' ? '余额不足' : '扣款失败' };
      if (idempotencyKey) idempotency.complete(idempotencyKey, errResult);
      return res.json(errResult);
    }

    if (payment.payeeId) {
      wallets.withLock(payment.payeeId, (wallet2) => {
        wallet2.balance = (wallet2.balance || 0) + payment.amount;
        wallet2.transactions.push({
          id: `tx_${Date.now()}_2`,
          userId: payment.payeeId,
          type: 'receipt',
          amount: payment.amount,
          subject: payment.subject,
          refId: payment.id,
          createdAt: new Date().toISOString(),
        });
        return wallet2;
      });
    }

    payment.status = 'completed';
    payment.updatedAt = new Date().toISOString();
    payments.set(payment.id, payment);

    if (idempotencyKey) {
      idempotency.complete(idempotencyKey, payment);
    }

    res.json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] 确认错误:', e);
    if (req.body.idempotencyKey) idempotency.fail(req.body.idempotencyKey, e.message);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { userId, page = 1, pageSize = 20 } = req.query;

    let list = payments.getAll();
    if (userId) {
      list = list.filter(p => p.payerId === userId || p.payeeId === userId);
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = list.length;
    const paged = list.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (e) {
    console.error('[payment] 列表错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/detail', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });

    const payment = payments.get(id);
    if (!payment) return res.status(404).json({ success: false, error: '交易不存在' });

    res.json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] 详情错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
