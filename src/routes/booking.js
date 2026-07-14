const express = require('express');
const router = express.Router();
const { bookingStore, contentStore, userStore, walletStore, activityStore } = require('../models/dataStore');
const aiValueEngine = require('../aiValueEngine');

/** 提交试驾预约 — AI实时加权计算价值 */
router.post('/submit', async (req, res) => {
  try {
    const { contentId, userId, name, phone, city, dealerName, refChain } = req.body;
    if (!contentId || !name || !phone) {
      return res.status(400).json({ success: false, error: 'contentId, name, phone required' });
    }

    const booking = bookingStore.create({
      contentId,
      userId: userId || '',
      name,
      phone,
      city: city || '',
      dealerName: dealerName || '',
      refChain: refChain || [],
    });

    contentStore.updateStats(contentId, { bookings: 1 });

    const content = contentStore.getById(contentId);
    if (content) {
      const attribution = await aiValueEngine.calculate(content, 'BOOKING');
      const totalEarnings = attribution.totalPool;

      const activity = activityStore.getById(content.activityId);
      if (activity && activity.totalBudget > 0 && (activity.usedBudget + totalEarnings) > activity.totalBudget) {
        const remaining = Math.max(0, activity.totalBudget - activity.usedBudget);
        if (remaining > 0) {
          const ratio = remaining / totalEarnings;
          for (const node of attribution.chain) {
            const adjAmount = +(node.amount * ratio).toFixed(4);
            if (adjAmount > 0) {
              walletStore.addPromotion(node.userId, adjAmount, `试驾预约分成 · ${content.carModel} (${node.role})`, contentId);
            }
          }
          activityStore.useBudget(content.activityId, remaining);
          contentStore.updateStats(contentId, { earnings: remaining });
        }
        res.json({ success: true, data: { bookingId: booking.id, earnings: remaining || 0, attribution: attribution.chain, budgetExhausted: true } });
      } else {
        for (const node of attribution.chain) {
          if (node.amount > 0) {
            walletStore.addPromotion(node.userId, node.amount, `试驾预约分成 · ${content.carModel} (${node.role})`, contentId);
          }
        }
        contentStore.updateStats(contentId, { earnings: totalEarnings });
        activityStore.useBudget(content.activityId, totalEarnings);
        res.json({ success: true, data: { bookingId: booking.id, earnings: totalEarnings, attribution: attribution.chain } });
      }
    } else {
      res.json({ success: true, data: { bookingId: booking.id } });
    }
  } catch (err) {
    console.error('[Booking Submit Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** 到店核销 (预留) */
router.post('/checkin', (req, res) => {
  const { bookingId, gpsLat, gpsLng } = req.body;
  // v1.0 简化：直接标记核销成功
  res.json({
    success: true,
    data: { status: 'checked_in', message: '核销成功（v1.0 自动通过）' },
  });
});

/** 查询预约状态 */
router.get('/:id', (req, res) => {
  res.json({ success: true, data: bookingStore.getByContent(req.params.id) });
});

/** 查询用户预约列表 */
router.get('/user/:userId', (req, res) => {
  const list = bookingStore.getByUser(req.params.userId);
  res.json({ success: true, data: { list, total: list.length } });
});

module.exports = router;
