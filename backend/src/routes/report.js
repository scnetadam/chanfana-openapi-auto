const express = require('express');
const router = express.Router();
const {
  users, wallets, payments, settleOrders, clues, kolRegistrations,
  kolContracts, merchantActivities, merchants, sentimentArticles,
  sentimentTopics, dataMarket, budgetPools,
} = require('../models/dataStore');

router.get('/overview', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const allUsers = users.getAll();
    const allPayments = payments.getAll();
    const allSettles = settleOrders.getAll();
    const allClues = clues.getAll();
    const allKols = kolRegistrations.getAll();
    const allMerchants = merchants.getAll();
    const allActivities = merchantActivities.getAll();
    const allArticles = sentimentArticles.getAll();

    let filteredPayments = allPayments;
    let filteredSettles = allSettles;
    let filteredClues = allClues;
    let filteredArticles = allArticles;

    if (startDate) {
      const sd = new Date(startDate);
      filteredPayments = filteredPayments.filter(p => new Date(p.createdAt) >= sd);
      filteredSettles = filteredSettles.filter(s => new Date(s.createdAt) >= sd);
      filteredClues = filteredClues.filter(c => new Date(c.createdAt) >= sd);
      filteredArticles = filteredArticles.filter(a => new Date(a.createdAt) >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate + 'T23:59:59.999Z');
      filteredPayments = filteredPayments.filter(p => new Date(p.createdAt) <= ed);
      filteredSettles = filteredSettles.filter(s => new Date(s.createdAt) <= ed);
      filteredClues = filteredClues.filter(c => new Date(c.createdAt) <= ed);
      filteredArticles = filteredArticles.filter(a => new Date(a.createdAt) <= ed);
    }

    const completedSettles = filteredSettles.filter(s => s.status === 'completed');
    const totalSettleAmount = completedSettles.reduce((s, o) => s + (o.amount || 0), 0);
    const convertedClues = filteredClues.filter(c => c.status === 'converted');
    const totalClueBudget = convertedClues.reduce((s, c) => s + (c.budget || 0), 0);
    const activeKols = allKols.filter(k => k.status === 'active');
    const activeMerchants = allMerchants.filter(m => m.status === 'active');
    const activeActivities = allActivities.filter(a => a.status === 'published');

    res.json({
      success: true,
      data: {
        users: { total: allUsers.length, kolUsers: allUsers.filter(u => u.role === 'kol' || u.role === 'merchant_kol').length, merchantUsers: allUsers.filter(u => u.role === 'merchant' || u.role === 'merchant_kol').length },
        financial: { totalSettleAmount: parseFloat(totalSettleAmount.toFixed(2)), totalSettledOrders: completedSettles.length, avgSettleAmount: completedSettles.length > 0 ? parseFloat((totalSettleAmount / completedSettles.length).toFixed(2)) : 0 },
        clues: { total: filteredClues.length, converted: convertedClues.length, conversionRate: filteredClues.length > 0 ? parseFloat(((convertedClues.length / filteredClues.length) * 100).toFixed(2)) : 0, totalConvertedBudget: parseFloat(totalClueBudget.toFixed(2)) },
        kols: { total: allKols.length, active: activeKols.length, avgScore: activeKols.length > 0 ? Math.round(activeKols.reduce((s, k) => s + (k.score || 0), 0) / activeKols.length) : 0, totalEarnings: parseFloat(activeKols.reduce((s, k) => s + (k.totalEarnings || 0), 0).toFixed(2)) },
        merchants: { total: allMerchants.length, active: activeMerchants.length },
        activities: { total: allActivities.length, active: activeActivities.length },
        sentiment: { totalArticles: filteredArticles.length, positiveRatio: filteredArticles.length > 0 ? parseFloat(((filteredArticles.filter(a => a.sentiment?.label === 'positive' || a.sentiment?.label === 'very_positive').length / filteredArticles.length) * 100).toFixed(1)) : 0 },
      },
    });
  } catch (e) {
    console.error('[report] overview错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/financial', (req, res) => {
  try {
    const { period = '30d', merchantId } = req.query;

    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);

    let settles = settleOrders.getAll().filter(s => new Date(s.createdAt) >= cutoff);
    if (merchantId) {
      settles = settles.filter(s => s.payerId === merchantId || s.payeeId === merchantId);
    }

    const completed = settles.filter(s => s.status === 'completed');
    const totalAmount = completed.reduce((s, o) => s + (o.amount || 0), 0);

    const dailyStats = {};
    completed.forEach(s => {
      const day = s.createdAt.slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { count: 0, amount: 0 };
      dailyStats[day].count++;
      dailyStats[day].amount += s.amount || 0;
    });

    Object.keys(dailyStats).forEach(day => {
      dailyStats[day].amount = parseFloat(dailyStats[day].amount.toFixed(2));
    });

    const channelStats = {};
    completed.forEach(s => {
      const ch = s.channel || 'unknown';
      if (!channelStats[ch]) channelStats[ch] = { count: 0, amount: 0 };
      channelStats[ch].count++;
      channelStats[ch].amount += s.amount || 0;
    });
    Object.keys(channelStats).forEach(ch => {
      channelStats[ch].amount = parseFloat(channelStats[ch].amount.toFixed(2));
    });

    res.json({
      success: true,
      data: {
        period: `${days}天`,
        totalOrders: settles.length,
        completedOrders: completed.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        avgOrderAmount: completed.length > 0 ? parseFloat((totalAmount / completed.length).toFixed(2)) : 0,
        dailyStats,
        channelStats,
      },
    });
  } catch (e) {
    console.error('[report] financial错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/kol-performance', (req, res) => {
  try {
    const { period = '30d', limit = 20 } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const allKols = kolRegistrations.getAll().filter(k => k.status === 'active');
    const performance = allKols.map(kol => {
      const contracts = kolContracts.find(c => c.kolUserId === kol.userId || c.kolUserId === kol.id);
      const activeContracts = contracts.filter(c => c.status === 'active').length;
      const kolClues = clues.getAll().filter(c => c.kolReferralId === kol.userId || c.kolReferralId === kol.id);
      const convertedClues = kolClues.filter(c => c.status === 'converted');

      return {
        kolId: kol.id,
        kolName: kol.name || kol.id,
        platform: kol.platform,
        category: kol.category,
        score: kol.score || 0,
        tier: kol.tier || 'C',
        weight: kol.weight,
        totalEarnings: kol.totalEarnings || 0,
        salesCount: kol.salesCount || 0,
        referralCount: kol.referralCount || 0,
        conversionCount: kol.conversionCount || 0,
        conversionRate: kol.referralCount > 0 ? parseFloat(((kol.conversionCount || 0) / kol.referralCount * 100).toFixed(2)) : 0,
        activeContracts,
        dataQuality: kol.dataQuality || 1.0,
        penaltyFlags: kol.penaltyFlags || [],
      };
    });

    performance.sort((a, b) => (b.score || 0) - (a.score || 0));
    const ranked = performance.slice(0, Number(limit));

    res.json({ success: true, data: { kols: ranked, total: performance.length, period: `${days}天` } });
  } catch (e) {
    console.error('[report] kol-performance错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/merchant-performance', (req, res) => {
  try {
    const allMerchants = merchants.getAll();
    const performance = allMerchants.map(m => {
      const mActivities = merchantActivities.find(a => a.merchantId === m.id);
      const mClues = clues.find(c => c.merchantId === m.id || c.merchantId === m.userId);
      const mBudgets = budgetPools.find(b => b.merchantId === m.id || b.merchantId === m.userId);
      const mContracts = kolContracts.find(c => c.bMerchantId === m.id || c.bMerchantId === m.userId);

      const totalSpend = mActivities.reduce((s, a) => s + (a.spentAmount || 0), 0);
      const totalBudget = mBudgets.reduce((s, b) => s + (b.totalAmount || 0), 0);
      const totalLeads = mActivities.reduce((s, a) => s + (a.results?.leads || 0), 0);
      const totalConversions = mActivities.reduce((s, a) => s + (a.results?.conversions || 0), 0);
      const convertedClues = mClues.filter(c => c.status === 'converted').length;

      return {
        merchantId: m.id,
        companyName: m.companyName,
        status: m.status,
        totalActivities: mActivities.length,
        activeActivities: mActivities.filter(a => a.status === 'published').length,
        totalBudget: parseFloat(totalBudget.toFixed(2)),
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        budgetUsage: totalBudget > 0 ? parseFloat(((totalSpend / totalBudget) * 100).toFixed(1)) : 0,
        totalClues: mClues.length,
        convertedClues,
        conversionRate: mClues.length > 0 ? parseFloat(((convertedClues / mClues.length) * 100).toFixed(2)) : 0,
        totalLeads,
        totalConversions,
        kolContracts: mContracts.length,
        cpl: totalLeads > 0 ? parseFloat((totalSpend / totalLeads).toFixed(2)) : 0,
      };
    });

    performance.sort((a, b) => b.totalSpend - a.totalSpend);

    res.json({ success: true, data: { merchants: performance, total: performance.length } });
  } catch (e) {
    console.error('[report] merchant-performance错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/sentiment-trend', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000);
    const articles = sentimentArticles.getAll().filter(a => new Date(a.createdAt) >= cutoff);

    const dailyStats = {};
    articles.forEach(a => {
      const day = a.createdAt.slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { total: 0, positive: 0, negative: 0, neutral: 0 };
      dailyStats[day].total++;
      if (a.sentiment?.label === 'positive' || a.sentiment?.label === 'very_positive') dailyStats[day].positive++;
      else if (a.sentiment?.label === 'negative' || a.sentiment?.label === 'very_negative') dailyStats[day].negative++;
      else dailyStats[day].neutral++;
    });

    const brandStats = {};
    articles.forEach(a => {
      (a.brandMentions || []).forEach(bm => {
        if (!brandStats[bm.brand]) brandStats[bm.brand] = { mentions: 0, positive: 0, negative: 0 };
        brandStats[bm.brand].mentions++;
        if (a.sentiment?.label === 'positive' || a.sentiment?.label === 'very_positive') brandStats[bm.brand].positive++;
        if (a.sentiment?.label === 'negative' || a.sentiment?.label === 'very_negative') brandStats[bm.brand].negative++;
      });
    });

    res.json({ success: true, data: { dailyStats, brandStats, totalArticles: articles.length, period: `${days}天` } });
  } catch (e) {
    console.error('[report] sentiment-trend错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/data-market', (req, res) => {
  try {
    const allData = dataMarket.getAll();
    const listed = allData.filter(d => d.status === 'listed');
    const totalSales = listed.reduce((s, d) => s + (d.sales || 0), 0);
    const totalRevenue = listed.reduce((s, d) => s + (d.price || 0) * (d.sales || 0), 0);

    const categoryStats = {};
    listed.forEach(d => {
      if (!categoryStats[d.category]) categoryStats[d.category] = { count: 0, sales: 0, revenue: 0 };
      categoryStats[d.category].count++;
      categoryStats[d.category].sales += d.sales || 0;
      categoryStats[d.category].revenue += (d.price || 0) * (d.sales || 0);
    });
    Object.keys(categoryStats).forEach(c => {
      categoryStats[c].revenue = parseFloat(categoryStats[c].revenue.toFixed(2));
    });

    const topSelling = [...listed].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 10).map(d => ({
      id: d.id, title: d.title, category: d.category, price: d.price, sales: d.sales, rating: d.rating,
    }));

    res.json({
      success: true,
      data: {
        total: allData.length,
        listed: listed.length,
        totalSales,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        categoryStats,
        topSelling,
      },
    });
  } catch (e) {
    console.error('[report] data-market错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
