const express = require('express');
const router = express.Router();
const { bookingStore, contentStore, userStore, walletStore, activityStore } = require('../models/dataStore');
const attributionEngine = require('../attributionEngine');

/** 提交试驾预约 */
router.post('/submit', (req, res) => {
  try {
    const { contentId, userId, name, phone, city, dealerName, refChain } = req.body;
    if (!contentId || !name || !phone) {
      return res.status(400).json({ success: false, error: 'contentId, name, phone required' });
    }

    // 创建预约
    const booking = bookingStore.create({
      contentId,
      userId: userId || '',
      name,
      phone,
      city: city || '',
      dealerName: dealerName || '',
      refChain: refChain || [],
    });

    // 更新内容统计
    contentStore.updateStats(contentId, { bookings: 1 });

    // BOOKING 归因 → 给发起人加 ¥5
    const content = contentStore.getById(contentId);
    if (content) {
      const earnings = attributionEngine.CONVERSION_VALUES.BOOKING; // 5
      // 计算归因分配（如果有传播链）
      const attribution = attributionEngine.calculate(content, 'BOOKING');

      // 给追踪链上各角色分账
      for (const node of attribution.chain) {
        if (node.amount > 0) {
          walletStore.addPromotion(
            node.userId,
            node.amount,
            `试驾预约分成 · ${content.carModel} (${node.role})`,
            contentId,
          );
        }
      }

      // 更新内容预估收益
      contentStore.updateStats(contentId, { earnings });
      // 更新活动预算
      activityStore.useBudget(content.activityId, earnings);

      res.json({
        success: true,
        data: {
          bookingId: booking.id,
          earnings,
          attribution: attribution.chain,
        },
      });
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
  // 简化：返回用户所有预约
  res.json({ success: true, data: bookingStore.getByContent(req.params.id) });
});

module.exports = router;
