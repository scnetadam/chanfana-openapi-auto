const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { dataMarket, wallets, payments, settleOrders } = require('../models/dataStore');

const DATA_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  REVIEW_REVISION: 'review_revision',
  LISTED: 'listed',
  DELISTED: 'delisted',
  REJECTED: 'rejected',
};

function initSeedData() {
  const items = dataMarket.getAll();
  if (items.length > 0) return;

  const seeds = [
    { id: 'd001', title: '汽车KOL行为数据（华南）', category: 'KOL行为', desc: '覆盖华南地区50+汽车KOL的发布频次、互动率、转化数据，含抖音/快手/小红书多平台', price: 2999, unit: '月', provider: '龟钮数据', providerId: 'prov_001', sample: true, hashAnchor: true, status: 'listed', dataFormat: 'json', dataSize: '12MB', recordCount: 5000, coverage: '华南地区', timeRange: '2025-01~2025-12', updateFrequency: '月更', dataQuality: 0.92, previewData: null, certificationHash: null, sales: 23, rating: 4.5, ratingCount: 8 },
    { id: 'd002', title: '新能源车意向用户画像', category: '用户画像', desc: '基于2000+真实购车用户行为数据，含品牌偏好、预算区间、决策周期等维度', price: 4999, unit: '份', provider: '龟钮数据', providerId: 'prov_001', sample: true, hashAnchor: true, status: 'listed', dataFormat: 'csv', dataSize: '25MB', recordCount: 2000, coverage: '全国', timeRange: '2025-06~2025-12', updateFrequency: '季更', dataQuality: 0.88, previewData: null, certificationHash: null, sales: 15, rating: 4.2, ratingCount: 5 },
    { id: 'd003', title: '4S店短视频运营数据', category: '运营数据', desc: '全国200+4S店抖音/视频号运营数据，含播放量、粉丝增长、线索转化率', price: 1999, unit: '月', provider: '龟钮数据', providerId: 'prov_001', sample: false, hashAnchor: false, status: 'listed', dataFormat: 'xlsx', dataSize: '8MB', recordCount: 200, coverage: '全国', timeRange: '2025-01~2025-06', updateFrequency: '月更', dataQuality: 0.85, previewData: null, certificationHash: null, sales: 31, rating: 3.8, ratingCount: 12 },
    { id: 'd004', title: 'KOL权重评分数据集', category: 'KOL权重', desc: '汽车垂类KOL权重评分模型训练数据，含粉丝质量、内容质量、商业价值三大维度评分', price: 8999, unit: '份', provider: '龟钮数据', providerId: 'prov_001', sample: true, hashAnchor: true, status: 'listed', dataFormat: 'json', dataSize: '45MB', recordCount: 10000, coverage: '全国', timeRange: '2024-01~2025-12', updateFrequency: '半年更', dataQuality: 0.95, previewData: null, certificationHash: null, sales: 7, rating: 4.8, ratingCount: 3 },
    { id: 'd005', title: '汽车内容消费趋势', category: '行业报告', desc: '2026上半年汽车内容消费趋势报告，含平台分布、内容形式偏好、转化漏斗分析', price: 1599, unit: '份', provider: '龟钮研究院', providerId: 'prov_002', sample: true, hashAnchor: false, status: 'listed', dataFormat: 'pdf', dataSize: '3MB', recordCount: 1, coverage: '全国', timeRange: '2026-H1', updateFrequency: '半年更', dataQuality: 0.90, previewData: null, certificationHash: null, sales: 42, rating: 4.1, ratingCount: 18 },
    { id: 'd006', title: 'KOL数据资产入表模板', category: '工具', desc: 'KOL数据资产入表标准化模板，含Hash指纹、权重评分、财务报表模板，适配广数交所挂牌', price: 999, unit: '套', provider: '龟钮数据', providerId: 'prov_001', sample: false, hashAnchor: true, status: 'listed', dataFormat: 'xlsx', dataSize: '1MB', recordCount: 5, coverage: '通用', timeRange: '2026', updateFrequency: '年更', dataQuality: 0.80, previewData: null, certificationHash: null, sales: 56, rating: 4.6, ratingCount: 22 },
  ];

  seeds.forEach(s => dataMarket.set(s.id, s));
  console.log('[dataMarket] 种子数据已初始化:', seeds.length, '条');
}

initSeedData();

router.post('/submit', (req, res) => {
  try {
    const {
      title, desc, category, price, unit, provider, providerId,
      dataFormat, dataSize, recordCount, coverage, timeRange,
      updateFrequency, sample, tags, previewData,
    } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ success: false, error: 'title, price, category 必填' });
    }

    const id = 'ds_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const item = {
      id,
      title,
      desc: desc || '',
      category,
      price: Number(price),
      unit: unit || '份',
      provider: provider || '未知',
      providerId: providerId || '',
      sample: !!sample,
      hashAnchor: false,
      status: DATA_STATUS.PENDING_REVIEW,
      dataFormat: dataFormat || 'json',
      dataSize: dataSize || '',
      recordCount: recordCount || 0,
      coverage: coverage || '',
      timeRange: timeRange || '',
      updateFrequency: updateFrequency || '',
      dataQuality: 0,
      previewData: previewData || null,
      certificationHash: null,
      tags: tags || [],
      sales: 0,
      rating: 0,
      ratingCount: 0,
      reviewNotes: [],
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      listedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dataMarket.set(id, item);

    res.json({ success: true, data: item, message: '数据商品已提交审核' });
  } catch (e) {
    console.error('[dataMarket] submit错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/review', (req, res) => {
  try {
    const { dataId, approved, reviewerId, notes, dataQuality } = req.body;
    if (!dataId || approved === undefined) {
      return res.status(400).json({ success: false, error: 'dataId 和 approved 必填' });
    }

    const item = dataMarket.get(dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });
    if (item.status !== DATA_STATUS.PENDING_REVIEW && item.status !== DATA_STATUS.REVIEW_REVISION) {
      return res.status(400).json({ success: false, error: `当前状态不允许审核: ${item.status}` });
    }

    item.reviewNotes = item.reviewNotes || [];
    item.reviewNotes.push({
      reviewerId: reviewerId || 'system',
      approved,
      notes: notes || '',
      at: new Date().toISOString(),
    });

    if (approved) {
      item.status = DATA_STATUS.LISTED;
      item.listedAt = new Date().toISOString();
      item.dataQuality = dataQuality || item.dataQuality || 0.8;
      if (item.dataQuality >= 0.85) item.hashAnchor = true;

      const hashPayload = JSON.stringify({
        id: item.id,
        title: item.title,
        provider: item.provider,
        price: item.price,
        dataQuality: item.dataQuality,
        timestamp: new Date().toISOString(),
      });
      item.certificationHash = crypto.createHash('sha256').update(hashPayload).digest('hex');
    } else {
      item.status = DATA_STATUS.REVIEW_REVISION;
    }

    item.reviewedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    dataMarket.set(dataId, item);

    res.json({ success: true, data: item, message: approved ? '审核通过，已上架' : '审核退回，需修改' });
  } catch (e) {
    console.error('[dataMarket] review错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/preview/:dataId', (req, res) => {
  try {
    const item = dataMarket.get(req.params.dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });

    const { rows = 5, format = 'json' } = req.body;

    if (item.previewData) {
      return res.json({ success: true, data: { source: 'provider', previewData: item.previewData, dataId: item.id, title: item.title } });
    }

    const mockSchema = [];
    const cat = item.category;
    if (cat === 'KOL行为') {
      mockSchema.push({ kol_id: 'string', platform: 'string', post_count: 'number', avg_engagement: 'number', conversion_rate: 'number', period: 'string' });
    } else if (cat === '用户画像') {
      mockSchema.push({ user_id: 'string', brand_preference: 'string', budget_range: 'string', decision_cycle: 'number', region: 'string' });
    } else if (cat === '运营数据') {
      mockSchema.push({ store_id: 'string', platform: 'string', views: 'number', followers_growth: 'number', lead_conversion: 'number' });
    } else if (cat === 'KOL权重') {
      mockSchema.push({ kol_id: 'string', follower_quality: 'number', content_quality: 'number', commercial_value: 'number', total_weight: 'number' });
    } else {
      mockSchema.push({ id: 'string', value: 'number', category: 'string', timestamp: 'string' });
    }

    const previewRows = [];
    for (let i = 0; i < Math.min(rows, 5); i++) {
      const row = {};
      Object.entries(mockSchema[0]).forEach(([key, type]) => {
        if (type === 'string') row[key] = `${key}_${(i + 1)}`;
        else if (type === 'number') row[key] = parseFloat((Math.random() * 100).toFixed(2));
      });
      previewRows.push(row);
    }

    res.json({
      success: true,
      data: {
        source: 'generated',
        dataId: item.id,
        title: item.title,
        schema: mockSchema[0],
        previewRows,
        totalRows: item.recordCount || 0,
        isSample: true,
        disclaimer: '预览数据为模拟示例，实际数据以购买后为准',
      },
    });
  } catch (e) {
    console.error('[dataMarket] preview错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/certify/:dataId', (req, res) => {
  try {
    const item = dataMarket.get(req.params.dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });

    const certPayload = {
      dataId: item.id,
      title: item.title,
      provider: item.provider,
      providerId: item.providerId,
      dataQuality: item.dataQuality,
      recordCount: item.recordCount,
      coverage: item.coverage,
      timeRange: item.timeRange,
      price: item.price,
      certifiedAt: new Date().toISOString(),
    };

    const certHash = crypto.createHash('sha256')
      .update(JSON.stringify(certPayload) + crypto.randomBytes(8).toString('hex'))
      .digest('hex');

    item.certificationHash = certHash;
    item.hashAnchor = true;
    item.certifiedAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    dataMarket.set(item.id, item);

    res.json({
      success: true,
      data: {
        dataId: item.id,
        title: item.title,
        certificationHash: certHash,
        certifiedAt: item.certifiedAt,
        hashAnchor: item.hashAnchor,
        dataQuality: item.dataQuality,
        certPayload,
      },
      message: '数据确权Hash已生成',
    });
  } catch (e) {
    console.error('[dataMarket] certify错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/verify-cert', (req, res) => {
  try {
    const { dataId, certificationHash } = req.body;
    if (!dataId || !certificationHash) {
      return res.status(400).json({ success: false, error: 'dataId 和 certificationHash 必填' });
    }

    const item = dataMarket.get(dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });

    const valid = item.certificationHash === certificationHash;
    res.json({
      success: true,
      data: {
        dataId,
        valid,
        title: item.title,
        provider: item.provider,
        certifiedAt: item.certifiedAt,
        dataQuality: item.dataQuality,
      },
    });
  } catch (e) {
    console.error('[dataMarket] verify-cert错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/purchase', async (req, res) => {
  try {
    const { userId, dataId, channel } = req.body;
    if (!userId || !dataId) return res.status(400).json({ success: false, error: 'userId 和 dataId 为必填' });

    const item = dataMarket.get(dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据集未找到' });
    if (item.status !== DATA_STATUS.LISTED) {
      return res.status(400).json({ success: false, error: `数据集当前不可购买: ${item.status}` });
    }

    const wallet = wallets.get(userId);
    if (wallet && (wallet.balance || 0) >= item.price) {
      wallets.withLock(userId, (w) => {
        if ((w.balance || 0) < item.price) return false;
        w.balance -= item.price;
        w.transactions.push({
          id: `tx_dm_${Date.now()}`,
          userId,
          type: 'data_purchase',
          amount: -item.price,
          subject: `购买数据「${item.title}」`,
          refId: dataId,
          createdAt: new Date().toISOString(),
        });
        return w;
      });

      if (item.providerId) {
        wallets.withLock(item.providerId, (w) => {
          w.balance = (w.balance || 0) + item.price * 0.5;
          w.transactions.push({
            id: `tx_dm_prov_${Date.now()}`,
            userId: item.providerId,
            type: 'data_sale',
            amount: item.price * 0.5,
            subject: `数据销售分成「${item.title}」`,
            refId: dataId,
            createdAt: new Date().toISOString(),
          });
          return w;
        });
      }

      dataMarket.withLock(dataId, (d) => {
        d.sales = (d.sales || 0) + 1;
        d.updatedAt = new Date().toISOString();
        return d;
      });

      return res.json({
        success: true,
        data: {
          orderId: `DM-${Date.now()}-${userId.slice(-4)}`,
          dataId, userId, title: item.title, amount: item.price,
          status: 'completed',
          certificationHash: item.certificationHash,
          message: `购买「${item.title}」成功，¥${item.price} 已扣款`,
        },
      });
    }

    try {
      const axios = require('axios');
      const payRes = await axios.post('http://127.0.0.1:3003/api/settle/checkout', {
        channel: channel || 'alipay',
        totalAmount: item.price,
        subject: `购买数据「${item.title}」`,
        payerId: userId,
        payeeId: item.providerId || 'platform',
      }, { timeout: 10000 });

      if (payRes.data.success) {
        return res.json({
          success: true,
          data: {
            orderId: payRes.data.data.paymentId,
            dataId, userId, title: item.title, amount: item.price,
            status: 'pending_payment',
            paymentInstruction: payRes.data.data.paymentInstruction,
            message: `购买「${item.title}」，需支付 ¥${item.price}`,
          },
        });
      }
    } catch (e) {
      console.log('[dataMarket] settle proxy failed, local fallback:', e.code);
    }

    const order = {
      orderId: `DM-${Date.now()}-${userId.slice(-4)}`,
      dataId, userId, title: item.title, amount: item.price,
      status: 'pending_payment',
      certificationHash: item.certificationHash,
      createdAt: new Date().toISOString(),
      message: `购买「${item.title}」，需支付 ¥${item.price}（本地沙箱）`,
    };
    res.json({ success: true, data: order });
  } catch (e) {
    console.error('[dataMarket] purchase错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/rating', (req, res) => {
  try {
    const { dataId, userId, rating, review } = req.body;
    if (!dataId || !userId || !rating) {
      return res.status(400).json({ success: false, error: 'dataId, userId, rating 必填' });
    }
    const r = Number(rating);
    if (r < 1 || r > 5) return res.status(400).json({ success: false, error: 'rating 1-5' });

    const item = dataMarket.get(dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });

    dataMarket.withLock(dataId, (d) => {
      const oldTotal = (d.rating || 0) * (d.ratingCount || 0);
      d.ratingCount = (d.ratingCount || 0) + 1;
      d.rating = parseFloat(((oldTotal + r) / d.ratingCount).toFixed(1));
      d.reviews = d.reviews || [];
      d.reviews.push({ userId, rating: r, review: review || '', at: new Date().toISOString() });
      d.updatedAt = new Date().toISOString();
      return d;
    });

    res.json({ success: true, data: { dataId, rating: dataMarket.get(dataId).rating, ratingCount: dataMarket.get(dataId).ratingCount } });
  } catch (e) {
    console.error('[dataMarket] rating错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/delist/:dataId', (req, res) => {
  try {
    const item = dataMarket.get(req.params.dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });
    dataMarket.withLock(req.params.dataId, (d) => {
      d.status = DATA_STATUS.DELISTED;
      d.delistAt = new Date().toISOString();
      d.updatedAt = new Date().toISOString();
      return d;
    });
    res.json({ success: true, data: { dataId: req.params.dataId, status: DATA_STATUS.DELISTED } });
  } catch (e) {
    console.error('[dataMarket] delist错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/relist/:dataId', (req, res) => {
  try {
    const item = dataMarket.get(req.params.dataId);
    if (!item) return res.status(404).json({ success: false, error: '数据商品不存在' });
    if (item.status !== DATA_STATUS.DELISTED) {
      return res.status(400).json({ success: false, error: '只有已下架商品可重新上架' });
    }
    dataMarket.withLock(req.params.dataId, (d) => {
      d.status = DATA_STATUS.LISTED;
      d.relistAt = new Date().toISOString();
      d.updatedAt = new Date().toISOString();
      return d;
    });
    res.json({ success: true, data: { dataId: req.params.dataId, status: DATA_STATUS.LISTED } });
  } catch (e) {
    console.error('[dataMarket] relist错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/pending-reviews', (req, res) => {
  try {
    const items = dataMarket.getAll().filter(i => i.status === DATA_STATUS.PENDING_REVIEW || i.status === DATA_STATUS.REVIEW_REVISION);
    items.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    res.json({ success: true, data: { items, total: items.length } });
  } catch (e) {
    console.error('[dataMarket] pending-reviews错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  const { category, keyword, minPrice, maxPrice, dataFormat, sortBy = 'sales', page = 1, pageSize = 20 } = req.query;
  let items = dataMarket.getAll().filter(i => i.status === DATA_STATUS.LISTED);

  if (category) items = items.filter(i => i.category === category);
  if (keyword) items = items.filter(i => i.title.includes(keyword) || i.desc.includes(keyword));
  if (minPrice) items = items.filter(i => i.price >= Number(minPrice));
  if (maxPrice) items = items.filter(i => i.price <= Number(maxPrice));
  if (dataFormat) items = items.filter(i => i.dataFormat === dataFormat);

  if (sortBy === 'price_asc') items.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price_desc') items.sort((a, b) => b.price - a.price);
  else if (sortBy === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sortBy === 'newest') items.sort((a, b) => new Date(b.listedAt || b.createdAt) - new Date(a.listedAt || a.createdAt));
  else items.sort((a, b) => (b.sales || 0) - (a.sales || 0));

  const total = items.length;
  const paged = items.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

  res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) } });
});

router.get('/detail', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
  const item = dataMarket.get(id);
  if (!item) return res.status(404).json({ success: false, error: '数据集未找到' });
  res.json({ success: true, data: item });
});

router.get('/categories', (req, res) => {
  const items = dataMarket.getAll().filter(i => i.status === DATA_STATUS.LISTED);
  const categories = [...new Set(items.map(i => i.category))];
  const catStats = categories.map(c => ({
    category: c,
    count: items.filter(i => i.category === c).length,
    avgPrice: Math.round(items.filter(i => i.category === c).reduce((s, i) => s + i.price, 0) / Math.max(1, items.filter(i => i.category === c).length)),
  }));
  res.json({ success: true, data: catStats });
});

router.get('/statuses', (req, res) => {
  res.json({ success: true, data: DATA_STATUS });
});

router.get('/stats', (req, res) => {
  try {
    const all = dataMarket.getAll();
    const listed = all.filter(i => i.status === DATA_STATUS.LISTED);
    const pending = all.filter(i => i.status === DATA_STATUS.PENDING_REVIEW || i.status === DATA_STATUS.REVIEW_REVISION);
    const totalSales = listed.reduce((s, i) => s + (i.sales || 0), 0);
    const totalRevenue = listed.reduce((s, i) => s + (i.price || 0) * (i.sales || 0), 0);
    const avgPrice = listed.length > 0 ? Math.round(listed.reduce((s, i) => s + i.price, 0) / listed.length) : 0;
    const avgQuality = listed.length > 0 ? parseFloat((listed.reduce((s, i) => s + (i.dataQuality || 0), 0) / listed.length).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        total: all.length,
        listed: listed.length,
        pendingReview: pending.length,
        delisted: all.filter(i => i.status === DATA_STATUS.DELISTED).length,
        totalSales,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        avgPrice,
        avgQuality,
        certified: listed.filter(i => i.certificationHash).length,
      },
    });
  } catch (e) {
    console.error('[dataMarket] stats错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
