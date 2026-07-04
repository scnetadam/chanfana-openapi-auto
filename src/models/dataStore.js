/**
 * 内存数据存储 (v1.0 不接数据库)
 *
 * 包含:
 *   activities  — 活动池
 *   contents    — 发布的内容+追踪链
 *   users       — 用户
 *   bookings    — 试驾预约
 *   wallets     — 钱包
 *   transactions — 交易流水
 */

const { v4: uuid } = require('uuid');

// ==================== 种子数据 ====================
const activities = [
  {
    id: 'act_001',
    brand: '小米汽车',
    model: 'SU7',
    title: '小米SU7首发推广季',
    description: '分享你的SU7体验，每带来一次试驾预约奖励 ¥5 推广金',
    cover: 'https://cdn.x402.cn/activities/su7-cover.png',
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    rewardPerBooking: 5.00,
    rewardPerView: 0.01,
    status: 'active', // active | ended | draft
    totalBudget: 50000,
    usedBudget: 0,
  },
  {
    id: 'act_002',
    brand: '蔚来',
    model: 'ET5',
    title: '蔚来ET5 试驾体验官招募',
    description: '分享蔚来ET5的真实体验，高额推广金等你拿',
    cover: 'https://cdn.x402.cn/activities/et5-cover.png',
    startDate: '2026-06-15',
    endDate: '2026-08-15',
    rewardPerBooking: 8.00,
    rewardPerView: 0.01,
    status: 'active',
    totalBudget: 80000,
    usedBudget: 0,
  },
];

const users = {};
const contents = {};
const bookings = [];
const wallets = {};
const transactions = [];

// ==================== Activity ====================
const activityStore = {
  list() {
    return activities.filter(a => a.status === 'active');
  },
  getById(id) {
    return activities.find(a => a.id === id);
  },
  useBudget(activityId, amount) {
    const act = activities.find(a => a.id === activityId);
    if (act) {
      act.usedBudget = +(act.usedBudget + amount).toFixed(2);
    }
  },
};

// ==================== User ====================
const userStore = {
  findOrCreate(openId, nickName, avatarUrl) {
    let user = Object.values(users).find(u => u.openId === openId);
    if (!user) {
      user = {
        id: 'u_' + uuid().slice(0, 8),
        openId,
        nickName: nickName || '微信用户',
        avatarUrl: avatarUrl || '',
        createdAt: new Date().toISOString(),
      };
      users[user.id] = user;
      // 创建钱包
      wallets[user.id] = {
        userId: user.id,
        promotionBalance: 0,    // 推广金
        reputationScore: 0,     // 口碑值
        createdAt: new Date().toISOString(),
      };
    } else if (nickName) {
      user.nickName = nickName;
    }
    return user;
  },
  getById(id) {
    return users[id] || null;
  },
};

// ==================== Content ====================
const contentStore = {
  create(data) {
    const contentId = 'c_' + uuid().slice(0, 8);
    const now = new Date().toISOString();
    const content = {
      id: contentId,
      userId: data.userId,
      activityId: data.activityId,
      images: data.images || [],
      text: data.text || '',
      carModel: data.carModel,
      // 追踪体系
      trackId: 'TRACK_' + contentId,
      shareUrl: `https://x402.app/s/${contentId}`,
      qrCodeUrl: '', // 后续生成
      // 追踪链: 第一个节点是发起人
      trackChain: [
        {
          userId: data.userId,
          role: 'originator',
          nickName: data.nickName || '',
          timestamp: now,
        },
      ],
      // 统计
      stats: {
        views: 0,
        bookings: 0,
        shares: 0,
        estimatedEarnings: 0,
      },
      createdAt: now,
      activity: activityStore.getById(data.activityId),
    };
    contents[contentId] = content;
    return content;
  },
  getById(id) {
    return contents[id] || null;
  },
  getByUser(userId) {
    return Object.values(contents).filter(c => c.userId === userId);
  },
  updateStats(contentId, delta) {
    const c = contents[contentId];
    if (c) {
      if (delta.views) c.stats.views += delta.views;
      if (delta.bookings) c.stats.bookings += delta.bookings;
      if (delta.shares) c.stats.shares += delta.shares;
      if (delta.earnings) c.stats.estimatedEarnings = +(c.stats.estimatedEarnings + delta.earnings).toFixed(2);
    }
  },
  /**
   * 添加传播者到追踪链
   */
  addSpreadToChain(contentId, spreaderUserId, spreaderNickName) {
    const c = contents[contentId];
    if (!c) return null;
    // 防止重复
    const exists = c.trackChain.find(n => n.userId === spreaderUserId);
    if (exists) return c;
    c.trackChain.push({
      userId: spreaderUserId,
      role: 'spreader',
      nickName: spreaderNickName || '',
      timestamp: new Date().toISOString(),
    });
    return c;
  },
};

// ==================== Booking ====================
const bookingStore = {
  create(data) {
    const booking = {
      id: 'bk_' + uuid().slice(0, 8),
      contentId: data.contentId,
      userId: data.userId,
      name: data.name,
      phone: data.phone,
      city: data.city || '',
      dealerName: data.dealerName || '',
      status: 'pending', // pending | checked_in | completed | cancelled
      refChain: data.refChain || [], // 来源追踪链
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    return booking;
  },
  getByContent(contentId) {
    return bookings.filter(b => b.contentId === contentId);
  },
  getByUser(userId) {
    return bookings.filter(b => b.userId === userId);
  },
};

// ==================== Wallet ====================
const walletStore = {
  get(userId) {
    return wallets[userId] || null;
  },
  /**
   * 增加推广金
   */
  addPromotion(userId, amount, desc, contentId) {
    const wallet = wallets[userId];
    if (!wallet) return null;
    wallet.promotionBalance = +(wallet.promotionBalance + amount).toFixed(2);
    transactions.push({
      id: 'tx_' + uuid().slice(0, 8),
      userId,
      type: 'promotion_income',
      amount,
      desc,
      contentId,
      balance: wallet.promotionBalance,
      createdAt: new Date().toISOString(),
    });
    return wallet;
  },
  getTransactions(userId, page = 1, pageSize = 20) {
    const userTxs = transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const start = (page - 1) * pageSize;
    return {
      list: userTxs.slice(start, start + pageSize),
      total: userTxs.length,
      page,
      pageSize,
    };
  },
};

module.exports = {
  activityStore,
  userStore,
  contentStore,
  bookingStore,
  walletStore,
};
