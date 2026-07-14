const express = require('express');
const router = express.Router();
const { bizProductStore, BIZ_PRODUCT_TYPES, activityStore, hashStore } = require('../models/dataStore');
const yinzhengClient = require('../yinzhengClient');
const hashEngine = require('../hashEngine');
const aiValueEngine = require('../aiValueEngine');

router.get('/types', (req, res) => {
  res.json({ success: true, data: Object.values(BIZ_PRODUCT_TYPES) });
});

router.post('/create', async (req, res) => {
  const { bizUserId, activityId, type, title, description, price, cover, externalUrl, contactInfo } = req.body;
  if (!bizUserId || !title) {
    return res.status(400).json({ success: false, error: 'bizUserId 和 title 为必填' });
  }

  const bizStatus = await yinzhengClient.getBizStatus(bizUserId);
  if (!bizStatus.success || bizStatus.data?.status !== 'approved') {
    return res.status(403).json({ success: false, error: '商家未认证，请先在龟钮印证完成商家认证' });
  }

  const product = bizProductStore.create({
    bizUserId,
    activityId: activityId || '',
    type: type || 'custom',
    title,
    description: description || '',
    price: price || 0,
    cover: cover || '',
    externalUrl: externalUrl || '',
    contactInfo: contactInfo || {},
  });

  try {
    const hashData = JSON.stringify({
      id: product.id,
      bizUserId,
      title,
      type,
      createdAt: product.createdAt,
    });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: product.id,
      hash,
      dataDigest: digest,
      dataType: 'biz_product',
      metadata: { bizUserId, type, title },
    });
    product.hash = hash;
  } catch (e) {
    console.error('[BizProduct] IP存证失败:', e.message);
  }

  res.json({ success: true, data: product });
});

router.get('/list', (req, res) => {
  const { activityId, bizUserId, page, pageSize } = req.query;
  if (activityId) {
    return res.json({ success: true, data: { list: bizProductStore.getByActivity(activityId), total: bizProductStore.getByActivity(activityId).length } });
  }
  if (bizUserId) {
    return res.json({ success: true, data: { list: bizProductStore.getByBizUser(bizUserId), total: bizProductStore.getByBizUser(bizUserId).length } });
  }
  const result = bizProductStore.list(parseInt(page) || 1, parseInt(pageSize) || 20);
  res.json({ success: true, data: result });
});

router.get('/:id', (req, res) => {
  const product = bizProductStore.getById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: '产品不存在' });
  }
  bizProductStore.updateStats(product.id, { views: 1 });
  res.json({ success: true, data: product });
});

router.post('/:id/convert', async (req, res) => {
  const { userId, conversionData } = req.body;
  const product = bizProductStore.getById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: '产品不存在' });
  }

  bizProductStore.updateStats(product.id, { conversions: 1 });

  let conversionValue = product.price > 0 ? product.price * 0.03 : 0;
  if (product.activityId) {
    const activity = activityStore.getById(product.activityId);
    if (activity) {
      conversionValue = activity.rewardPerBooking || conversionValue;
    }
  }

  let valueCalc = null;
  if (conversionValue > 0 && userId) {
    try {
      valueCalc = await aiValueEngine.calculateValue(
        { id: product.id, carModel: product.title, trackChain: [{ userId: product.bizUserId, role: 'originator', timestamp: product.createdAt }], stats: { views: product.stats.views, bookings: product.stats.conversions, shares: 0, estimatedEarnings: 0 }, createdAt: product.createdAt, activity: activityStore.getById(product.activityId) },
        'BOOKING',
        { userId: product.bizUserId, useAI: false }
      );
      conversionValue = valueCalc.finalValue || conversionValue;
    } catch (e) {
      console.error('[BizProduct] AI价值计算失败:', e.message);
    }

    bizProductStore.updateStats(product.id, { revenue: conversionValue });
  }

  try {
    const hashData = JSON.stringify({ productId: product.id, userId, conversionValue, timestamp: new Date().toISOString() });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: `conv_${product.id}_${Date.now()}`,
      hash,
      dataDigest: digest,
      dataType: 'booking_convert',
      metadata: { productId: product.id, userId, conversionValue },
    });
  } catch (e) {
    console.error('[BizProduct] 转化IP存证失败:', e.message);
  }

  res.json({
    success: true,
    data: {
      productId: product.id,
      conversionValue,
      valueCalc,
      redirectUrl: product.externalUrl,
    },
  });
});

router.post('/:id/deactivate', (req, res) => {
  const product = bizProductStore.deactivate(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: '产品不存在' });
  }
  res.json({ success: true, data: product });
});

module.exports = router;
