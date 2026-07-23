const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  merchants, merchantActivities, users, wallets, clues, kolContracts,
  budgetPools, payments, settleOrders,
} = require('../models/dataStore');

const MERCHANT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
};

const ACTIVITY_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PAUSED: 'paused',
  ENDED: 'ended',
};

router.post('/register', (req, res) => {
  try {
    const {
      userId, companyName, contactName, contactPhone, contactEmail,
      industry, businessLicense, address, description,
    } = req.body;

    if (!userId || !companyName || !contactPhone) {
      return res.status(400).json({ success: false, error: 'userId, companyName, contactPhone 必填' });
    }

    const existing = merchants.findOne(m => m.userId === userId || m.contactPhone === contactPhone);
    if (existing) return res.json({ success: true, data: existing, message: '商家已存在', duplicate: true });

    const id = 'mch_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const merchant = {
      id,
      userId,
      companyName,
      contactName: contactName || '',
      contactPhone,
      contactEmail: contactEmail || '',
      industry: industry || '汽车',
      businessLicense: businessLicense || '',
      address: address || '',
      description: description || '',
      status: MERCHANT_STATUS.PENDING,
      verifiedAt: null,
      kycLevel: 'none',
      commissionRate: 0.30,
      totalSpent: 0,
      totalLeads: 0,
      totalConversions: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    merchants.set(id, merchant);

    const user = users.get(userId);
    if (user) {
      users.withLock(userId, (u) => {
        u.role = 'merchant';
        u.merchantId = id;
        u.updatedAt = new Date().toISOString();
        return u;
      });
    }

    const wallet = wallets.get(userId);
    if (!wallet) {
      wallets.set(userId, {
        id: userId,
        balance: 0,
        reservedAmount: 0,
        transactions: [],
        kycLevel: 'none',
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: merchant, message: '商家注册成功，待审核' });
  } catch (e) {
    console.error('[merchant] register错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/verify', (req, res) => {
  try {
    const { merchantId, approved, reviewerId, kycLevel, commissionRate, notes } = req.body;
    if (!merchantId || approved === undefined) {
      return res.status(400).json({ success: false, error: 'merchantId 和 approved 必填' });
    }

    const merchant = merchants.get(merchantId);
    if (!merchant) return res.status(404).json({ success: false, error: '商家不存在' });
    if (merchant.status !== MERCHANT_STATUS.PENDING) {
      return res.status(400).json({ success: false, error: `商家状态不允许审核: ${merchant.status}` });
    }

    merchants.withLock(merchantId, (m) => {
      m.status = approved ? MERCHANT_STATUS.ACTIVE : MERCHANT_STATUS.SUSPENDED;
      m.verifiedAt = new Date().toISOString();
      m.kycLevel = kycLevel || (approved ? 'basic' : 'none');
      if (commissionRate) m.commissionRate = commissionRate;
      m.reviewNotes = m.reviewNotes || [];
      m.reviewNotes.push({ reviewerId: reviewerId || 'system', approved, notes: notes || '', at: new Date().toISOString() });
      m.updatedAt = new Date().toISOString();
      return m;
    });

    res.json({ success: true, data: merchants.get(merchantId), message: approved ? '商家审核通过' : '商家审核拒绝' });
  } catch (e) {
    console.error('[merchant] verify错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/profile/:merchantId', (req, res) => {
  try {
    const merchant = merchants.get(req.params.merchantId)
      || merchants.findOne(m => m.userId === req.params.merchantId);
    if (!merchant) return res.status(404).json({ success: false, error: '商家不存在' });

    const wallet = wallets.get(merchant.userId);
    const activities = merchantActivities.find(a => a.merchantId === merchant.id);
    const contracts = kolContracts.find(c => c.bMerchantId === merchant.id || c.bMerchantId === merchant.userId);
    const merchantClues = clues.find(c => c.merchantId === merchant.id || c.merchantId === merchant.userId);
    const budgets = budgetPools.find(b => b.merchantId === merchant.id || b.merchantId === merchant.userId);

    res.json({
      success: true,
      data: {
        ...merchant,
        wallet: wallet ? { balance: wallet.balance, reservedAmount: wallet.reservedAmount || 0 } : null,
        stats: {
          activities: activities.length,
          activeActivities: activities.filter(a => a.status === ACTIVITY_STATUS.PUBLISHED).length,
          kolContracts: contracts.length,
          totalClues: merchantClues.length,
          newClues: merchantClues.filter(c => c.status === 'new').length,
          convertedClues: merchantClues.filter(c => c.status === 'converted').length,
          totalBudgets: budgets.length,
          totalBudgetAmount: budgets.reduce((s, b) => s + (b.totalAmount || 0), 0),
        },
      },
    });
  } catch (e) {
    console.error('[merchant] profile错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/create', (req, res) => {
  try {
    const {
      merchantId, title, description, type, budget, targetKols,
      startDate, endDate, commissionRate, tags, requirements,
    } = req.body;

    if (!merchantId || !title || !type) {
      return res.status(400).json({ success: false, error: 'merchantId, title, type 必填' });
    }

    const merchant = merchants.get(merchantId);
    if (!merchant) return res.status(404).json({ success: false, error: '商家不存在' });
    if (merchant.status !== MERCHANT_STATUS.ACTIVE) {
      return res.status(400).json({ success: false, error: '商家未激活' });
    }

    const id = 'act_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const activity = {
      id,
      merchantId,
      merchantName: merchant.companyName,
      title,
      description: description || '',
      type: type || 'kol_promotion',
      budget: budget ? Number(budget) : 0,
      spentAmount: 0,
      targetKols: targetKols || [],
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      commissionRate: commissionRate || merchant.commissionRate || 0.30,
      tags: tags || [],
      requirements: requirements || '',
      kolApplications: [],
      kolParticipants: [],
      results: { impressions: 0, clicks: 0, leads: 0, conversions: 0, spend: 0 },
      status: ACTIVITY_STATUS.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    merchantActivities.set(id, activity);

    if (budget && budget > 0) {
      const budgetId = 'bg_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      budgetPools.set(budgetId, {
        id: budgetId,
        merchantId,
        activityId: id,
        totalAmount: Number(budget),
        usedAmount: 0,
        frozenAmount: 0,
        remainingAmount: Number(budget),
        description: `活动「${title}」预算`,
        status: 'active',
        startedAt: new Date().toISOString(),
        expiredAt: endDate || new Date(Date.now() + 30 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: activity, message: '活动创建成功' });
  } catch (e) {
    console.error('[merchant] activity/create错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/publish', (req, res) => {
  try {
    const { activityId } = req.body;
    if (!activityId) return res.status(400).json({ success: false, error: 'activityId 必填' });

    const activity = merchantActivities.get(activityId);
    if (!activity) return res.status(404).json({ success: false, error: '活动不存在' });
    if (activity.status !== ACTIVITY_STATUS.DRAFT) {
      return res.status(400).json({ success: false, error: `活动状态不允许发布: ${activity.status}` });
    }

    merchantActivities.withLock(activityId, (a) => {
      a.status = ACTIVITY_STATUS.PUBLISHED;
      a.publishedAt = new Date().toISOString();
      a.updatedAt = new Date().toISOString();
      return a;
    });

    res.json({ success: true, data: merchantActivities.get(activityId), message: '活动已发布' });
  } catch (e) {
    console.error('[merchant] activity/publish错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/pause', (req, res) => {
  try {
    const { activityId, reason } = req.body;
    if (!activityId) return res.status(400).json({ success: false, error: 'activityId 必填' });

    const activity = merchantActivities.get(activityId);
    if (!activity) return res.status(404).json({ success: false, error: '活动不存在' });

    merchantActivities.withLock(activityId, (a) => {
      a.status = ACTIVITY_STATUS.PAUSED;
      a.pauseReason = reason || '';
      a.pausedAt = new Date().toISOString();
      a.updatedAt = new Date().toISOString();
      return a;
    });

    res.json({ success: true, data: { activityId, status: ACTIVITY_STATUS.PAUSED }, message: '活动已暂停' });
  } catch (e) {
    console.error('[merchant] activity/pause错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/end', (req, res) => {
  try {
    const { activityId } = req.body;
    if (!activityId) return res.status(400).json({ success: false, error: 'activityId 必填' });

    merchantActivities.withLock(activityId, (a) => {
      a.status = ACTIVITY_STATUS.ENDED;
      a.endedAt = new Date().toISOString();
      a.updatedAt = new Date().toISOString();
      return a;
    });

    res.json({ success: true, data: { activityId, status: ACTIVITY_STATUS.ENDED }, message: '活动已结束' });
  } catch (e) {
    console.error('[merchant] activity/end错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/apply', (req, res) => {
  try {
    const { activityId, kolId, kolName, proposal } = req.body;
    if (!activityId || !kolId) return res.status(400).json({ success: false, error: 'activityId 和 kolId 必填' });

    const activity = merchantActivities.get(activityId);
    if (!activity) return res.status(404).json({ success: false, error: '活动不存在' });
    if (activity.status !== ACTIVITY_STATUS.PUBLISHED) {
      return res.status(400).json({ success: false, error: '活动未开放报名' });
    }

    const alreadyApplied = (activity.kolApplications || []).some(a => a.kolId === kolId);
    if (alreadyApplied) return res.json({ success: true, data: { alreadyApplied: true }, message: '已报名' });

    merchantActivities.withLock(activityId, (a) => {
      a.kolApplications = a.kolApplications || [];
      a.kolApplications.push({
        kolId,
        kolName: kolName || '',
        proposal: proposal || '',
        status: 'pending',
        appliedAt: new Date().toISOString(),
      });
      a.updatedAt = new Date().toISOString();
      return a;
    });

    res.json({ success: true, data: { activityId, kolId, status: 'applied' }, message: '报名成功' });
  } catch (e) {
    console.error('[merchant] activity/apply错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/approve-kol', (req, res) => {
  try {
    const { activityId, kolId, approved } = req.body;
    if (!activityId || !kolId) return res.status(400).json({ success: false, error: 'activityId 和 kolId 必填' });

    merchantActivities.withLock(activityId, (a) => {
      const app = (a.kolApplications || []).find(ap => ap.kolId === kolId);
      if (!app) return false;
      app.status = approved ? 'approved' : 'rejected';
      app.reviewedAt = new Date().toISOString();
      if (approved) {
        a.kolParticipants = a.kolParticipants || [];
        a.kolParticipants.push({ kolId, joinedAt: new Date().toISOString() });
      }
      a.updatedAt = new Date().toISOString();
      return a;
    });

    res.json({ success: true, data: { activityId, kolId, approved }, message: approved ? 'KOL已通过' : 'KOL已拒绝' });
  } catch (e) {
    console.error('[merchant] activity/approve-kol错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/activity/report-result', (req, res) => {
  try {
    const { activityId, impressions, clicks, leads, conversions, spend } = req.body;
    if (!activityId) return res.status(400).json({ success: false, error: 'activityId 必填' });

    merchantActivities.withLock(activityId, (a) => {
      a.results = a.results || { impressions: 0, clicks: 0, leads: 0, conversions: 0, spend: 0 };
      if (impressions) a.results.impressions += Number(impressions);
      if (clicks) a.results.clicks += Number(clicks);
      if (leads) a.results.leads += Number(leads);
      if (conversions) a.results.conversions += Number(conversions);
      if (spend) a.results.spend += Number(spend);
      a.spentAmount = a.results.spend;
      a.updatedAt = new Date().toISOString();
      return a;
    });

    res.json({ success: true, data: { activityId, results: merchantActivities.get(activityId).results } });
  } catch (e) {
    console.error('[merchant] activity/report-result错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/activities', (req, res) => {
  try {
    const { merchantId, status, type, page = 1, pageSize = 20 } = req.query;
    let list = merchantActivities.getAll();
    if (merchantId) list = list.filter(a => a.merchantId === merchantId);
    if (status) list = list.filter(a => a.status === status);
    if (type) list = list.filter(a => a.type === type);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const paged = list.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[merchant] activities错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/activity/:activityId', (req, res) => {
  try {
    const activity = merchantActivities.get(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, error: '活动不存在' });

    const activityClues = clues.find(c => c.merchantId === activity.merchantId);
    const recentClues = activityClues.filter(c => c.createdAt >= activity.createdAt).slice(-20);

    const roi = activity.results?.spend > 0
      ? parseFloat(((activity.results?.conversions || 0) / activity.results.spend * 100).toFixed(2))
      : 0;
    const cpl = activity.results?.leads > 0
      ? parseFloat((activity.results.spend / activity.results.leads).toFixed(2))
      : 0;
    const conversionRate = activity.results?.leads > 0
      ? parseFloat(((activity.results.conversions || 0) / activity.results.leads * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        ...activity,
        performance: { roi, cpl, conversionRate },
        recentClues: recentClues.length,
        budgetUsage: activity.budget > 0 ? parseFloat(((activity.spentAmount || 0) / activity.budget * 100).toFixed(1)) : 0,
      },
    });
  } catch (e) {
    console.error('[merchant] activity/detail错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/dashboard/:merchantId', (req, res) => {
  try {
    const merchant = merchants.get(req.params.merchantId)
      || merchants.findOne(m => m.userId === req.params.merchantId);
    if (!merchant) return res.status(404).json({ success: false, error: '商家不存在' });

    const mActivities = merchantActivities.find(a => a.merchantId === merchant.id);
    const mClues = clues.find(c => c.merchantId === merchant.id || c.merchantId === merchant.userId);
    const mContracts = kolContracts.find(c => c.bMerchantId === merchant.id || c.bMerchantId === merchant.userId);
    const mBudgets = budgetPools.find(b => b.merchantId === merchant.id || b.merchantId === merchant.userId);

    const activeActivities = mActivities.filter(a => a.status === ACTIVITY_STATUS.PUBLISHED).length;
    const totalSpend = mActivities.reduce((s, a) => s + (a.spentAmount || 0), 0);
    const totalBudget = mBudgets.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalImpressions = mActivities.reduce((s, a) => s + (a.results?.impressions || 0), 0);
    const totalLeads = mActivities.reduce((s, a) => s + (a.results?.leads || 0), 0);
    const totalConversions = mActivities.reduce((s, a) => s + (a.results?.conversions || 0), 0);

    const newClues = mClues.filter(c => c.status === 'new').length;
    const convertedClues = mClues.filter(c => c.status === 'converted').length;
    const conversionRate = mClues.length > 0 ? parseFloat(((convertedClues / mClues.length) * 100).toFixed(2)) : 0;
    const overallCpl = totalLeads > 0 ? parseFloat((totalSpend / totalLeads).toFixed(2)) : 0;
    const overallRoi = totalSpend > 0 ? parseFloat(((totalConversions * 100) / totalSpend).toFixed(2)) : 0;

    const kolPerformance = mActivities.reduce((agg, a) => {
      (a.kolParticipants || []).forEach(p => {
        if (!agg[p.kolId]) agg[p.kolId] = { kolId: p.kolId, activities: 0, leads: 0, conversions: 0 };
        agg[p.kolId].activities++;
        agg[p.kolId].leads += a.results?.leads || 0;
        agg[p.kolId].conversions += a.results?.conversions || 0;
      });
      return agg;
    }, {});

    res.json({
      success: true,
      data: {
        merchant: { id: merchant.id, companyName: merchant.companyName, status: merchant.status, kycLevel: merchant.kycLevel },
        overview: {
          totalActivities: mActivities.length,
          activeActivities,
          totalKolContracts: mContracts.length,
          totalClues: mClues.length,
          newClues,
          convertedClues,
          conversionRate,
        },
        financial: {
          totalBudget: parseFloat(totalBudget.toFixed(2)),
          totalSpend: parseFloat(totalSpend.toFixed(2)),
          budgetUsage: totalBudget > 0 ? parseFloat(((totalSpend / totalBudget) * 100).toFixed(1)) : 0,
          overallCpl,
          overallRoi,
        },
        performance: {
          totalImpressions,
          totalLeads,
          totalConversions,
        },
        topKols: Object.values(kolPerformance).sort((a, b) => b.conversions - a.conversions).slice(0, 10),
      },
    });
  } catch (e) {
    console.error('[merchant] dashboard错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { status, industry, page = 1, pageSize = 20 } = req.query;
    let list = merchants.getAll();
    if (status) list = list.filter(m => m.status === status);
    if (industry) list = list.filter(m => m.industry === industry);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = list.length;
    const paged = list.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[merchant] list错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/statuses', (req, res) => {
  res.json({ success: true, data: { merchant: MERCHANT_STATUS, activity: ACTIVITY_STATUS } });
});

module.exports = router;
