const express = require('express');
const router = express.Router();
const { creditPoints } = require('../models/dataStore');

function calculateBalance(credits, userId) {
  const userCredits = credits.filter(c => c.userId === userId);
  return {
    total: userCredits.reduce((s, c) => s + c.amount, 0),
    pending: userCredits.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
    vested: userCredits.filter(c => c.status === 'vested').reduce((s, c) => s + c.amount, 0),
    used: userCredits.filter(c => c.status === 'used').reduce((s, c) => s + c.amount, 0)
  };
}

router.post('/issue', (req, res) => {
  try {
    const { userId, amount, source, transactionId, description } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId 和 amount 必填' });

    const id = 'cp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const credit = {
      id,
      userId,
      amount: Number(amount),
      source: source || 'bonus',
      description: description || '',
      status: 'pending',
      transactionId: transactionId || '',
      createdAt: new Date().toISOString(),
      vestedAt: null,
      usedAt: null
    };
    creditPoints.set(id, credit);

    const allCredits = creditPoints.find(c => c.userId === userId);
    const balance = calculateBalance(allCredits, userId);
    res.json({ success: true, data: { credit, balance }, message: '龟钮点发放成功' });
  } catch (e) {
    console.error('[creditPoints] issue错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/vest', (req, res) => {
  try {
    const { creditId } = req.body;
    if (!creditId) return res.status(400).json({ success: false, error: 'creditId 必填' });

    const credit = creditPoints.get(creditId);
    if (!credit) return res.status(404).json({ success: false, error: '龟钮点不存在' });
    if (credit.status !== 'pending') return res.status(400).json({ success: false, error: '只能归属待归属的龟钮点' });

    const result = creditPoints.withLock(creditId, (item) => {
      item.status = 'vested';
      item.vestedAt = new Date().toISOString();
      return item;
    });

    const allCredits = creditPoints.find(c => c.userId === credit.userId);
    const balance = calculateBalance(allCredits, credit.userId);
    res.json({ success: true, data: { credit: result.data, balance }, message: '归属成功' });
  } catch (e) {
    console.error('[creditPoints] vest错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/use', (req, res) => {
  try {
    const { userId, amount, transactionId, description } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId 和 amount 必填' });

    const allCredits = creditPoints.find(c => c.userId === userId);
    const balance = calculateBalance(allCredits, userId);
    if (balance.vested < amount) return res.status(400).json({ success: false, error: '可用龟钮点不足', available: balance.vested });

    let remaining = Number(amount);
    const used = [];
    const vestedCredits = creditPoints.find(c => c.userId === userId && c.status === 'vested')
      .sort((a, b) => new Date(a.vestedAt) - new Date(b.vestedAt));

    for (const c of vestedCredits) {
      if (remaining <= 0) break;
      const useAmount = Math.min(remaining, c.amount);
      creditPoints.withLock(c.id, (item) => {
        item.status = 'used';
        item.usedAt = new Date().toISOString();
        item.useTransactionId = transactionId;
        item.useDescription = description;
        return item;
      });
      remaining -= useAmount;
      used.push({ creditId: c.id, amount: useAmount });
    }

    const updatedCredits = creditPoints.find(c => c.userId === userId);
    const newBalance = calculateBalance(updatedCredits, userId);
    res.json({ success: true, data: { used, remaining, newBalance }, message: '使用成功' });
  } catch (e) {
    console.error('[creditPoints] use错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/balance/:userId', (req, res) => {
  try {
    const allCredits = creditPoints.find(c => c.userId === req.params.userId);
    const balance = calculateBalance(allCredits, req.params.userId);
    res.json({ success: true, data: { userId: req.params.userId, balance } });
  } catch (e) {
    console.error('[creditPoints] balance错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/history/:userId', (req, res) => {
  try {
    const { status } = req.query;
    let credits = creditPoints.find(c => c.userId === req.params.userId);
    if (status) credits = credits.filter(c => c.status === status);
    credits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const balance = calculateBalance(credits, req.params.userId);
    res.json({ success: true, data: { credits, balance, total: credits.length } });
  } catch (e) {
    console.error('[creditPoints] history错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
