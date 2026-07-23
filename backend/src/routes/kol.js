const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { kolRegistrations, kolContracts, users, wallets } = require('../models/dataStore');

const KOL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  GRADUATED: 'graduated',
  LEFT: 'left',
};

const KOL_PLATFORMS = {
  douyin: { label: '抖音', icon: 'douyin' },
  kuaishou: { label: '快手', icon: 'kuaishou' },
  xiaohongshu: { label: '小红书', icon: 'xiaohongshu' },
  weibo: { label: '微博', icon: 'weibo' },
  bilibili: { label: 'B站', icon: 'bilibili' },
  wechat: { label: '微信公众号', icon: 'wechat' },
  wechat_video: { label: '视频号', icon: 'wechat_video' },
  general: { label: '综合', icon: 'general' },
};

const KOL_CATEGORIES = {
  new_energy: '新能源',
  suv: 'SUV评测',
  sedan: '轿车评测',
  luxury: '豪华车',
  modification: '改装',
  offroad: '越野',
  racing: '赛车',
  tech: '汽车科技',
  general: '综合',
};

router.post('/register', (req, res) => {
  try {
    const {
      userId, platform, category, name, avatar, bio,
      followers, avgEngagement, verifiedContent, realName,
      idNumber, bankAccount, platformUrl,
    } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });

    const existing = kolRegistrations.findOne(k => k.userId === userId);
    if (existing) return res.json({ success: true, data: existing, message: '已注册', duplicate: true });

    const id = 'kol_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const kol = {
      id,
      userId,
      name: name || '',
      avatar: avatar || '',
      bio: bio || '',
      realName: realName || '',
      platform: platform || 'general',
      platformLabel: KOL_PLATFORMS[platform || 'general']?.label || '综合',
      platformUrl: platformUrl || '',
      category: category || 'general',
      categoryLabel: KOL_CATEGORIES[category || 'general'] || '综合',
      followers: followers || 0,
      avgEngagement: avgEngagement || 0,
      verifiedContent: verifiedContent || 0,
      bankAccount: bankAccount || '',
      idNumber: idNumber || '',
      weight: 1.0,
      level: 1,
      score: 0,
      tier: 'C',
      commissionCap: 0.10,
      salesCount: 0,
      dataQuality: 1.0,
      totalEarnings: 0,
      referralCount: 0,
      conversionCount: 0,
      activityDays: 0,
      recentPosts: 0,
      complianceWeight: 0.3,
      penaltyFlags: [],
      status: KOL_STATUS.ACTIVE,
      weightHistory: [],
      contractId: null,
      contractType: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    kolRegistrations.set(id, kol);

    const user = users.get(userId);
    if (user) {
      users.withLock(userId, (u) => {
        u.role = u.role === 'merchant' ? 'merchant_kol' : 'kol';
        u.kolId = id;
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

    res.json({ success: true, data: kol, message: 'KOL注册成功' });
  } catch (e) {
    console.error('[kol] register错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/update/:kolId', (req, res) => {
  try {
    const kol = kolRegistrations.get(req.params.kolId)
      || kolRegistrations.findOne(k => k.userId === req.params.kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL 不存在' });

    const allowedFields = ['name', 'avatar', 'bio', 'platform', 'category', 'followers',
      'avgEngagement', 'verifiedContent', 'bankAccount', 'platformUrl', 'recentPosts', 'activityDays'];
    kolRegistrations.withLock(kol.id, (item) => {
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          item[field] = req.body[field];
          if (field === 'platform') item.platformLabel = KOL_PLATFORMS[req.body.platform]?.label || req.body.platform;
          if (field === 'category') item.categoryLabel = KOL_CATEGORIES[req.body.category] || req.body.category;
        }
      });
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: kolRegistrations.get(kol.id), message: '更新成功' });
  } catch (e) {
    console.error('[kol] update错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/profile/:kolId', (req, res) => {
  try {
    const kol = kolRegistrations.get(req.params.kolId)
      || kolRegistrations.findOne(k => k.userId === req.params.kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL 不存在' });

    const wallet = wallets.get(kol.userId);
    const contracts = kolContracts.find(c => c.kolUserId === kol.userId || c.kolUserId === kol.id);

    res.json({
      success: true,
      data: {
        ...kol,
        wallet: wallet ? { balance: wallet.balance, availableBalance: wallet.balance - (wallet.reservedAmount || 0) } : null,
        contracts,
        contractCount: contracts.length,
        activeContracts: contracts.filter(c => c.status === 'active').length,
      },
    });
  } catch (e) {
    console.error('[kol] profile错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/weight/:kolId', (req, res) => {
  try {
    const kol = kolRegistrations.get(req.params.kolId) || kolRegistrations.findOne(k => k.userId === req.params.kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL 不存在' });
    res.json({ success: true, data: { kolId: kol.id, weight: kol.weight, level: kol.level, score: kol.score || 0, tier: kol.tier || 'C', commissionCap: kol.commissionCap || 0.10, weightHistory: kol.weightHistory || [] } });
  } catch (e) {
    console.error('[kol] weight错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/weight/calculate', (req, res) => {
  try {
    const { kolId } = req.body;
    const kol = kolRegistrations.get(kolId) || kolRegistrations.findOne(k => k.userId === kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL 不存在' });

    const dimensions = {
      salesFactor: Math.min(1.0, kol.salesCount / 100),
      qualityFactor: kol.dataQuality,
      platformFactor: kol.platform === 'verified' ? 1.2 : 1.0,
      activityFactor: 1.0
    };

    const totalWeight = (dimensions.salesFactor * 0.4 + dimensions.qualityFactor * 0.3
      + dimensions.platformFactor * 0.2 + dimensions.activityFactor * 0.1);

    res.json({
      success: true,
      data: {
        kol: kol.name || kol.id,
        currentWeight: kol.weight,
        calculatedWeight: totalWeight,
        dimensions,
        recommendation: totalWeight > kol.weight ? '建议升权' : totalWeight < kol.weight * 0.8 ? '建议降权' : '维持'
      }
    });
  } catch (e) {
    console.error('[kol] weight/calculate错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/status/change', (req, res) => {
  try {
    const { kolId, newStatus, reason } = req.body;
    if (!kolId || !newStatus) return res.status(400).json({ success: false, error: 'kolId 和 newStatus 必填' });

    const validStatuses = Object.values(KOL_STATUS);
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ success: false, error: `无效状态，可选: ${validStatuses.join(', ')}` });
    }

    const kol = kolRegistrations.get(kolId) || kolRegistrations.findOne(k => k.userId === kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL 不存在' });

    kolRegistrations.withLock(kol.id, (item) => {
      item.status = newStatus;
      item.statusChangedAt = new Date().toISOString();
      item.statusChangeReason = reason || '';
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: { kolId: kol.id, status: newStatus, message: `状态已更新为: ${newStatus}` } });
  } catch (e) {
    console.error('[kol] status/change错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/contracts/:kolId', (req, res) => {
  try {
    const kol = kolRegistrations.get(req.params.kolId) || kolRegistrations.findOne(k => k.userId === req.params.kolId);
    if (!kol) return res.status(404).json({ success: false, error: 'KOL 不存在' });

    const contracts = kolContracts.find(c => c.kolUserId === kol.userId || c.kolUserId === kol.id);
    res.json({ success: true, data: { contracts, total: contracts.length } });
  } catch (e) {
    console.error('[kol] contracts错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/contract', (req, res) => {
  try {
    const { bMerchantId, kolUserId, contractType, commissionRate, startDate, endDate, terms } = req.body;
    if (!bMerchantId || !kolUserId) return res.status(400).json({ success: false, error: 'bMerchantId 和 kolUserId 必填' });

    const id = 'ct_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const contract = {
      id,
      bMerchantId,
      kolUserId,
      contractType: contractType || 'cooperation',
      commissionRate: commissionRate || 0.3,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      terms: terms || '',
      status: 'active',
      signedAt: new Date().toISOString(),
      expiredAt: endDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    kolContracts.set(id, contract);

    const kol = kolRegistrations.findOne(k => k.userId === kolUserId);
    if (kol) {
      kolRegistrations.withLock(kol.id, (item) => {
        item.contractId = contract.id;
        item.contractType = contractType;
        item.commissionCap = commissionRate || item.commissionCap;
        item.updatedAt = new Date().toISOString();
        return item;
      });
    }

    res.json({ success: true, data: contract, message: '合同创建成功' });
  } catch (e) {
    console.error('[kol] contract错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/contract/terminate', (req, res) => {
  try {
    const { contractId, reason } = req.body;
    if (!contractId) return res.status(400).json({ success: false, error: 'contractId 必填' });

    const contract = kolContracts.get(contractId);
    if (!contract) return res.status(404).json({ success: false, error: '合同不存在' });
    if (contract.status !== 'active') return res.status(400).json({ success: false, error: '合同状态不允许终止' });

    kolContracts.withLock(contractId, (c) => {
      c.status = 'terminated';
      c.terminatedAt = new Date().toISOString();
      c.terminateReason = reason || '';
      c.updatedAt = new Date().toISOString();
      return c;
    });

    res.json({ success: true, data: { contractId, status: 'terminated', message: '合同已终止' } });
  } catch (e) {
    console.error('[kol] contract/terminate错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { platform, category, status, minWeight, maxWeight, sortBy = 'weight', sortOrder = 'desc', page = 1, pageSize = 20 } = req.query;
    let kols = kolRegistrations.getAll();
    if (platform) kols = kols.filter(k => k.platform === platform);
    if (category) kols = kols.filter(k => k.category === category);
    if (status) kols = kols.filter(k => k.status === status);
    if (minWeight) kols = kols.filter(k => k.weight >= Number(minWeight));
    if (maxWeight) kols = kols.filter(k => k.weight <= Number(maxWeight));

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    kols.sort((a, b) => {
      if (sortBy === 'weight') return (a.weight - b.weight) * sortDir;
      if (sortBy === 'score') return ((a.score || 0) - (b.score || 0)) * sortDir;
      if (sortBy === 'earnings') return ((a.totalEarnings || 0) - (b.totalEarnings || 0)) * sortDir;
      if (sortBy === 'followers') return ((a.followers || 0) - (b.followers || 0)) * sortDir;
      if (sortBy === 'createdAt') return (new Date(a.createdAt) - new Date(b.createdAt)) * sortDir;
      return (a.weight - b.weight) * sortDir;
    });

    const total = kols.length;
    const paged = kols.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
    res.json({ success: true, data: { kols: paged, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) } });
  } catch (e) {
    console.error('[kol] list错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const allKols = kolRegistrations.getAll();
    const byStatus = {};
    Object.values(KOL_STATUS).forEach(s => { byStatus[s] = allKols.filter(k => k.status === s).length; });
    const byPlatform = {};
    allKols.forEach(k => { byPlatform[k.platform] = (byPlatform[k.platform] || 0) + 1; });
    const byCategory = {};
    allKols.forEach(k => { byCategory[k.category] = (byCategory[k.category] || 0) + 1; });

    const totalEarnings = allKols.reduce((s, k) => s + (k.totalEarnings || 0), 0);
    const totalSales = allKols.reduce((s, k) => s + (k.salesCount || 0), 0);
    const totalReferrals = allKols.reduce((s, k) => s + (k.referralCount || 0), 0);
    const avgScore = allKols.length > 0 ? Math.round(allKols.reduce((s, k) => s + (k.score || 0), 0) / allKols.length) : 0;

    res.json({
      success: true,
      data: {
        total: allKols.length,
        byStatus,
        byPlatform,
        byCategory,
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        totalSales,
        totalReferrals,
        avgScore,
      },
    });
  } catch (e) {
    console.error('[kol] stats错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/platforms', (req, res) => {
  res.json({ success: true, data: KOL_PLATFORMS });
});

router.get('/categories', (req, res) => {
  res.json({ success: true, data: KOL_CATEGORIES });
});

router.get('/statuses', (req, res) => {
  res.json({ success: true, data: KOL_STATUS });
});

module.exports = router;
