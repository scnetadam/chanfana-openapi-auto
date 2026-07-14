/**
 * 内存数据存储 (v3.0)
 *
 * 包含:
 *   activities    — 活动池
 *   contents      — 发布的内容+追踪链
 *   users         — 用户
 *   bookings      — 试驾预约
 *   wallets       — 钱包
 *   transactions  — 交易流水
 *   kolAudits     — KOL审核记录
 *   opcApps       — OPC创业支持申请
 *   commissions   — 分佣记录
 *   aiToolUsage   — AI工具使用记录
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
const notifications = [];
const bizProducts = [];
const kolAudits = [];
const opcApps = [];
const commissionRecords = [];
const aiToolUsageRecords = [];
const hashRecords = [];
const llmUserPreferences = {};
const llmApiKeys = {};
const agentToolSubscriptions = [];
const agentToolExecLogs = [];

const kolTasks = [];
const kolTaskSubmissions = [];
const settlements = [];

const BIZ_PRODUCT_TYPES = {
  TEST_DRIVE: { key: 'test_drive', label: '试驾预约', icon: 'car' },
  NEW_RELEASE: { key: 'new_release', label: '新品发布', icon: 'star' },
  MERCHANDISE: { key: 'merchandise', label: '周边商城', icon: 'gift' },
  MAINTENANCE: { key: 'maintenance', label: '维修保养', icon: 'wrench' },
  USED_CAR: { key: 'used_car', label: '二手车', icon: 'refresh' },
  CUSTOM: { key: 'custom', label: '自定义', icon: 'plus' },
};

// ==================== Activity ====================
const activityStore = {
  list() {
    return activities.filter(a => a.status === 'active');
  },
  listAll() {
    return activities;
  },
  getById(id) {
    return activities.find(a => a.id === id);
  },
  useBudget(activityId, amount) {
    const act = activities.find(a => a.id === activityId);
    if (!act) return false;
    if (act.totalBudget > 0 && (act.usedBudget + amount) > act.totalBudget) {
      return false;
    }
    act.usedBudget = +(act.usedBudget + amount).toFixed(2);
    return true;
  },
  getRemainingBudget(activityId) {
    const act = activities.find(a => a.id === activityId);
    if (!act) return 0;
    return Math.max(0, +(act.totalBudget - act.usedBudget).toFixed(2));
  },
};

// ==================== User ====================
const userStore = {
  findOrCreate(openId, nickName, avatarUrl, platform) {
    let user = Object.values(users).find(u => u.openId === openId);
    if (!user) {
      user = {
        id: 'u_' + uuid().slice(0, 8),
        openId,
        nickName: nickName || (platform === 'alipay' ? '支付宝用户' : '微信用户'),
        avatarUrl: avatarUrl || '',
        platform: platform || 'wechat',
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

// ==================== Notification ====================
const notificationStore = {
  create(data) {
    const notification = {
      id: 'ntf_' + uuid().slice(0, 8),
      userId: data.userId,
      type: data.type || 'system',
      title: data.title || '',
      content: data.content || '',
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);
    return notification;
  },
  getByUser(userId) {
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  markRead(userId, notificationId) {
    const n = notifications.find(n => n.id === notificationId && n.userId === userId);
    if (n) n.read = true;
  },
  markAllRead(userId) {
    notifications.filter(n => n.userId === userId).forEach(n => n.read = true);
  },
  getUnreadCount(userId) {
    return notifications.filter(n => n.userId === userId && !n.read).length;
  },
};

const bizProductStore = {
  create(data) {
    const productId = 'bp_' + uuid().slice(0, 8);
    const product = {
      id: productId,
      bizUserId: data.bizUserId || '',
      activityId: data.activityId || '',
      type: data.type || 'custom',
      typeName: BIZ_PRODUCT_TYPES[data.type?.toUpperCase()]?.label || data.typeName || '自定义产品',
      typeIcon: BIZ_PRODUCT_TYPES[data.type?.toUpperCase()]?.icon || 'plus',
      title: data.title || '',
      description: data.description || '',
      price: data.price || 0,
      cover: data.cover || '',
      externalUrl: data.externalUrl || '',
      contactInfo: data.contactInfo || {},
      status: 'active',
      stats: { views: 0, conversions: 0, revenue: 0 },
      createdAt: new Date().toISOString(),
    };
    bizProducts.push(product);
    return product;
  },
  getById(id) {
    return bizProducts.find(p => p.id === id) || null;
  },
  getByActivity(activityId) {
    return bizProducts.filter(p => p.activityId === activityId && p.status === 'active');
  },
  getByBizUser(bizUserId) {
    return bizProducts.filter(p => p.bizUserId === bizUserId);
  },
  list(page = 1, pageSize = 20) {
    const active = bizProducts.filter(p => p.status === 'active');
    const start = (page - 1) * pageSize;
    return {
      list: active.slice(start, start + pageSize),
      total: active.length,
      page,
      pageSize,
    };
  },
  updateStats(productId, delta) {
    const p = bizProducts.find(pr => pr.id === productId);
    if (p) {
      if (delta.views) p.stats.views += delta.views;
      if (delta.conversions) p.stats.conversions += delta.conversions;
      if (delta.revenue) p.stats.revenue = +(p.stats.revenue + delta.revenue).toFixed(2);
    }
  },
  deactivate(id) {
    const p = bizProducts.find(pr => pr.id === id);
    if (p) { p.status = 'inactive'; return p; }
    return null;
  },
};

// ==================== KOL Audit ====================
const kolAuditStore = {
  create(data) {
    const audit = {
      id: 'ka_' + uuid().slice(0, 8),
      userId: data.userId,
      nickName: data.nickName || '',
      channel: data.channel || 'standard',
      followers: data.followers || 0,
      crossPlatformProof: data.crossPlatformProof || '',
      bizAuthCode: data.bizAuthCode || '',
      bizUserId: data.bizUserId || '',
      status: data.status || 'pending',
      aiScore: data.aiScore || null,
      reason: data.reason || '',
      opcEligible: data.opcEligible || false,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    };
    kolAudits.push(audit);
    return audit;
  },
  getByUser(userId) {
    return kolAudits.filter(a => a.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getLatestByUser(userId) {
    const userAudits = kolAudits.filter(a => a.userId === userId);
    return userAudits.length > 0 ? userAudits[userAudits.length - 1] : null;
  },
  getPending() {
    return kolAudits.filter(a => a.status === 'pending');
  },
  approve(id, reason) {
    const a = kolAudits.find(a => a.id === id);
    if (a) {
      a.status = 'approved';
      a.reason = reason || '审核通过';
      a.reviewedAt = new Date().toISOString();
    }
    return a;
  },
  reject(id, reason) {
    const a = kolAudits.find(a => a.id === id);
    if (a) {
      a.status = 'rejected';
      a.reason = reason || '审核未通过';
      a.reviewedAt = new Date().toISOString();
    }
    return a;
  },
  list({ status, channel, page, pageSize }) {
    let result = kolAudits;
    if (status) result = result.filter(a => a.status === status);
    if (channel) result = result.filter(a => a.channel === channel);
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
};

// ==================== OPC Application ====================
const opcAppStore = {
  create(data) {
    const app = {
      id: 'opc_' + uuid().slice(0, 8),
      userId: data.userId,
      nickName: data.nickName || '',
      followers: data.followers || 0,
      crossPlatformProof: data.crossPlatformProof || '',
      businessPlan: data.businessPlan || '',
      status: data.status || 'pending',
      freeQuota: 0,
      usedQuota: 0,
      approvedAt: null,
      createdAt: new Date().toISOString(),
    };
    opcApps.push(app);
    return app;
  },
  getByUser(userId) {
    return opcApps.filter(a => a.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getLatestByUser(userId) {
    const userApps = opcApps.filter(a => a.userId === userId);
    return userApps.length > 0 ? userApps[userApps.length - 1] : null;
  },
  approve(id, freeQuota) {
    const a = opcApps.find(a => a.id === id);
    if (a) {
      a.status = 'approved';
      a.freeQuota = freeQuota || 100;
      a.approvedAt = new Date().toISOString();
    }
    return a;
  },
  reject(id, reason) {
    const a = opcApps.find(a => a.id === id);
    if (a) {
      a.status = 'rejected';
      a.reason = reason || '';
    }
    return a;
  },
  useQuota(userId, amount) {
    const app = opcApps.find(a => a.userId === userId && a.status === 'approved');
    if (app) {
      app.usedQuota += (amount || 1);
    }
    return app;
  },
};

// ==================== Commission Record ====================
const commissionRecordStore = {
  create(data) {
    const record = {
      id: 'cm_' + uuid().slice(0, 8),
      taskId: data.taskId || '',
      fromUserId: data.fromUserId || '',
      toUserId: data.toUserId || '',
      amount: data.amount || 0,
      commissionType: data.commissionType || 'task_reward',
      platformFee: data.platformFee || 0,
      netAmount: data.netAmount || 0,
      status: 'completed',
      hashProof: data.hashProof || '',
      createdAt: new Date().toISOString(),
    };
    commissionRecords.push(record);
    return record;
  },
  getByUser(userId) {
    return commissionRecords.filter(r => r.fromUserId === userId || r.toUserId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getByTask(taskId) {
    return commissionRecords.filter(r => r.taskId === taskId);
  },
  list({ userId, taskId, page, pageSize }) {
    let result = commissionRecords;
    if (userId) result = result.filter(r => r.fromUserId === userId || r.toUserId === userId);
    if (taskId) result = result.filter(r => r.taskId === taskId);
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
  getStats(userId) {
    const userRecords = commissionRecords.filter(r => r.toUserId === userId);
    const totalIncome = userRecords.reduce((s, r) => s + r.netAmount, 0);
    const totalFee = userRecords.reduce((s, r) => s + r.platformFee, 0);
    return { totalIncome: +totalIncome.toFixed(2), totalFee: +totalFee.toFixed(2), count: userRecords.length };
  },
};

// ==================== AI Tool Usage ====================
const aiToolUsageStore = {
  create(data) {
    const record = {
      id: 'atu_' + uuid().slice(0, 8),
      userId: data.userId,
      toolId: data.toolId,
      toolName: data.toolName || '',
      price: data.price || 0,
      isOpcFree: data.isOpcFree || false,
      result: data.result || null,
      createdAt: new Date().toISOString(),
    };
    aiToolUsageRecords.push(record);
    return record;
  },
  getByUser(userId, page, pageSize) {
    const userRecords = aiToolUsageRecords.filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    return { list: userRecords.slice((p - 1) * ps, p * ps), total: userRecords.length };
  },
  getMonthlyUsage(userId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return aiToolUsageRecords.filter(r => r.userId === userId && r.createdAt >= monthStart).length;
  },
};

// ==================== Hash (IP Data Notarization) ====================
const hashStore = {
  create({ txId, hash, dataDigest, dataType = 'kol_ip', metadata = {}, source = 'local' }) {
    const record = {
      id: 'hsh_' + uuid().slice(0, 8),
      txId,
      hash,
      dataDigest,
      dataType,
      metadata,
      source,
      createdAt: new Date().toISOString(),
    };
    hashRecords.push(record);
    return record;
  },
  getById(id) {
    return hashRecords.find(h => h.id === id) || null;
  },
  getByTxId(txId) {
    return hashRecords.filter(h => h.txId === txId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getByHash(hash) {
    return hashRecords.find(h => h.hash === hash) || null;
  },
  list({ dataType, userId, page, pageSize }) {
    let result = hashRecords;
    if (dataType) result = result.filter(h => h.dataType === dataType);
    if (userId) {
      const uid = userId;
      result = result.filter(h => {
        const meta = h.metadata || {};
        return meta.userId === uid || meta.kolUserId === uid || meta.bizUserId === uid;
      });
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
  getStats() {
    const byType = {};
    for (const h of hashRecords) {
      byType[h.dataType] = (byType[h.dataType] || 0) + 1;
    }
    return { total: hashRecords.length, byType };
  },
};

// ==================== LLM User Preference ====================
const llmPreferenceStore = {
  get(userId) {
    return llmUserPreferences[userId] || null;
  },
  set(userId, data) {
    llmUserPreferences[userId] = {
      userId,
      preferredModel: data.preferredModel || '',
      fallbackModel: data.fallbackModel || 'glm-4-flash',
      customProviders: data.customProviders || [],
      temperature: data.temperature || 0.7,
      maxTokens: data.maxTokens || 4096,
      updatedAt: new Date().toISOString(),
    };
    return llmUserPreferences[userId];
  },
  setPreferredModel(userId, modelId) {
    if (!llmUserPreferences[userId]) {
      llmUserPreferences[userId] = { userId, preferredModel: '', fallbackModel: 'glm-4-flash', customProviders: [], temperature: 0.7, maxTokens: 4096, updatedAt: new Date().toISOString() };
    }
    llmUserPreferences[userId].preferredModel = modelId;
    llmUserPreferences[userId].updatedAt = new Date().toISOString();
    return llmUserPreferences[userId];
  },
};

// ==================== LLM API Key (per-user) ====================
const llmApiKeyStore = {
  set(userId, provider, apiKey, apiBase) {
    const key = userId + ':' + provider;
    llmApiKeys[key] = {
      id: 'lak_' + uuid().slice(0, 8),
      userId,
      provider,
      apiKey,
      apiBase: apiBase || '',
      createdAt: new Date().toISOString(),
    };
    return llmApiKeys[key];
  },
  get(userId, provider) {
    const key = userId + ':' + provider;
    return llmApiKeys[key] || null;
  },
  getByUser(userId) {
    return Object.values(llmApiKeys).filter(k => k.userId === userId);
  },
  delete(userId, provider) {
    const key = userId + ':' + provider;
    delete llmApiKeys[key];
  },
};

// ==================== Agent Tool Subscription ====================
const agentToolSubStore = {
  subscribe(userId, toolId) {
    const existing = agentToolSubscriptions.find(s => s.userId === userId && s.toolId === toolId && s.status === 'active');
    if (existing) return existing;
    const sub = {
      id: 'ats_' + uuid().slice(0, 8),
      userId,
      toolId,
      status: 'active',
      autoPay: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    agentToolSubscriptions.push(sub);
    return sub;
  },
  unsubscribe(userId, toolId) {
    const sub = agentToolSubscriptions.find(s => s.userId === userId && s.toolId === toolId && s.status === 'active');
    if (sub) { sub.status = 'inactive'; }
    return sub;
  },
  getByUser(userId) {
    return agentToolSubscriptions.filter(s => s.userId === userId && s.status === 'active');
  },
  isActive(userId, toolId) {
    return agentToolSubscriptions.some(s => s.userId === userId && s.toolId === toolId && s.status === 'active');
  },
  incrementUsage(userId, toolId) {
    const sub = agentToolSubscriptions.find(s => s.userId === userId && s.toolId === toolId && s.status === 'active');
    if (sub) sub.usageCount++;
  },
};

// ==================== Agent Tool Execution Log ====================
const agentToolExecLogStore = {
  create(data) {
    const log = {
      id: 'ael_' + uuid().slice(0, 8),
      userId: data.userId,
      toolId: data.toolId,
      toolName: data.toolName || '',
      usedModel: data.usedModel || '',
      price: data.price || 0,
      inputParams: data.inputParams || {},
      resultPreview: data.resultPreview || '',
      success: data.success !== false,
      createdAt: new Date().toISOString(),
    };
    agentToolExecLogs.push(log);
    return log;
  },
  getByUser(userId, page, pageSize) {
    const userLogs = agentToolExecLogs.filter(l => l.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    return { list: userLogs.slice((p - 1) * ps, p * ps), total: userLogs.length, page: p, pageSize: ps };
  },
  getByTool(toolId) {
    return agentToolExecLogs.filter(l => l.toolId === toolId);
  },
  getStats(userId) {
    const userLogs = agentToolExecLogs.filter(l => l.userId === userId);
    const totalSpent = userLogs.reduce((s, l) => s + l.price, 0);
    const byTool = {};
    for (const l of userLogs) {
      byTool[l.toolId] = (byTool[l.toolId] || 0) + 1;
    }
    return { totalExecutions: userLogs.length, totalSpent: +totalSpent.toFixed(2), byTool };
  },
};

// ==================== KOL Task ====================
const KOL_TASK_TYPES = {
  PROMOTE: { key: 'promote', label: '推广传播', desc: '发布推广内容并传播' },
  BOOKING: { key: 'booking', label: '试驾引导', desc: '引导用户完成试驾预约' },
  CONTENT: { key: 'content', label: '内容创作', desc: '创作原创汽车评测内容' },
  SHARE: { key: 'share', label: '裂变分享', desc: '分享推广链接获取二次传播' },
};

const kolTaskStore = {
  create(data) {
    const task = {
      id: 'kt_' + uuid().slice(0, 8),
      bizUserId: data.bizUserId,
      activityId: data.activityId || '',
      type: data.type || 'promote',
      typeName: KOL_TASK_TYPES[data.type?.toUpperCase()]?.label || '推广传播',
      title: data.title,
      description: data.description || '',
      rewardPerUnit: data.rewardPerUnit || 0,
      targetCount: data.targetCount || 10,
      completedCount: 0,
      totalRewardPool: data.totalRewardPool || 0,
      usedReward: 0,
      status: 'open',
      requirements: data.requirements || {},
      deadline: data.deadline || '',
      createdAt: new Date().toISOString(),
    };
    kolTasks.push(task);
    return task;
  },
  getById(id) {
    return kolTasks.find(t => t.id === id) || null;
  },
  list(filters) {
    let result = kolTasks;
    if (filters.bizUserId) result = result.filter(t => t.bizUserId === filters.bizUserId);
    if (filters.activityId) result = result.filter(t => t.activityId === filters.activityId);
    if (filters.status) result = result.filter(t => t.status === filters.status);
    if (filters.type) result = result.filter(t => t.type === filters.type);
    return result;
  },
  listOpen() {
    return kolTasks.filter(t => t.status === 'open');
  },
  incrementComplete(taskId, count) {
    const t = kolTasks.find(t => t.id === taskId);
    if (t) {
      t.completedCount += count;
      if (t.completedCount >= t.targetCount) t.status = 'completed';
    }
  },
  addUsedReward(taskId, amount) {
    const t = kolTasks.find(t => t.id === taskId);
    if (t) t.usedReward = +(t.usedReward + amount).toFixed(2);
  },
  close(taskId) {
    const t = kolTasks.find(t => t.id === taskId);
    if (t && t.status === 'open') t.status = 'closed';
    return t;
  },
};

const kolTaskSubmissionStore = {
  create(data) {
    const sub = {
      id: 'ks_' + uuid().slice(0, 8),
      taskId: data.taskId,
      kolUserId: data.kolUserId,
      kolNickName: data.kolNickName || '',
      type: data.type || 'promote',
      contentId: data.contentId || '',
      bookingId: data.bookingId || '',
      proofData: data.proofData || {},
      reward: 0,
      aiScore: null,
      status: 'submitted',
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    };
    kolTaskSubmissions.push(sub);
    return sub;
  },
  getById(id) {
    return kolTaskSubmissions.find(s => s.id === id) || null;
  },
  getByTask(taskId) {
    return kolTaskSubmissions.filter(s => s.taskId === taskId);
  },
  getByKol(kolUserId) {
    return kolTaskSubmissions.filter(s => s.kolUserId === kolUserId);
  },
  approve(subId, reward, aiScore) {
    const s = kolTaskSubmissions.find(s => s.id === subId);
    if (s) {
      s.status = 'approved';
      s.reward = reward;
      s.aiScore = aiScore;
      s.reviewedAt = new Date().toISOString();
    }
    return s;
  },
  reject(subId, reason) {
    const s = kolTaskSubmissions.find(s => s.id === subId);
    if (s) {
      s.status = 'rejected';
      s.reviewedAt = new Date().toISOString();
    }
    return s;
  },
  getByKolAndStatus(kolUserId, status) {
    return kolTaskSubmissions.filter(s => s.kolUserId === kolUserId && s.status === status);
  },
};

// ==================== Settlement ====================
const SETTLEMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const settlementStore = {
  create(data) {
    const s = {
      id: 'stl_' + uuid().slice(0, 8),
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      fee: data.fee || 0,
      netAmount: +(data.amount - (data.fee || 0)).toFixed(4),
      type: data.type || 'kol_commission',
      refType: data.refType || '',
      refId: data.refId || '',
      description: data.description || '',
      status: SETTLEMENT_STATUS.PENDING,
      yinzhengTxId: '',
      hashProof: '',
      aiVerified: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    settlements.push(s);
    return s;
  },
  getById(id) {
    return settlements.find(s => s.id === id) || null;
  },
  getByUser(userId) {
    return settlements.filter(s => s.fromUserId === userId || s.toUserId === userId);
  },
  getByStatus(status) {
    return settlements.filter(s => s.status === status);
  },
  updateStatus(id, status, extra) {
    const s = settlements.find(s => s.id === id);
    if (s) {
      s.status = status;
      if (status === SETTLEMENT_STATUS.COMPLETED) s.completedAt = new Date().toISOString();
      if (extra) Object.assign(s, extra);
    }
    return s;
  },
  list({ userId, type, status, page, pageSize }) {
    let result = settlements;
    if (userId) result = result.filter(s => s.fromUserId === userId || s.toUserId === userId);
    if (type) result = result.filter(s => s.type === type);
    if (status) result = result.filter(s => s.status === status);
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(page) || 1;
    const ps = parseInt(pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
};

module.exports = {
  activityStore,
  userStore,
  contentStore,
  bookingStore,
  walletStore,
  notificationStore,
  bizProductStore,
  BIZ_PRODUCT_TYPES,
  kolAuditStore,
  opcAppStore,
  commissionRecordStore,
  aiToolUsageStore,
  hashStore,
  llmPreferenceStore,
  llmApiKeyStore,
  agentToolSubStore,
  agentToolExecLogStore,
  KOL_TASK_TYPES,
  kolTaskStore,
  kolTaskSubmissionStore,
  SETTLEMENT_STATUS,
  settlementStore,
};
