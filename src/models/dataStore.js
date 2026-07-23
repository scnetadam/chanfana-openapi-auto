/**
 * 内存数据存储 (v3.7.0 → v4.0.0 升级)
 *
 * v4.0.0 新增:
 *   FileStore      — 写入队列+compareAndSwap+withLock防并发覆盖
 *   IdempotencyStore — 幂等键防双重扣款
 *   opRegistry     — 协调层持久化操作注册
 *   deadLetterOps  — 死信队列
 *   taxRecords     — 税务记录
 *   notificationTemplate — 通知模板
 *   userNotificationPref — 用户通知偏好
 */

const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class FileStore {
  constructor(name, seedData = []) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.data = new Map();
    this._writeQueue = Promise.resolve();
    this._version = 0;
    this._load(seedData);
  }

  _load(seedData) {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => this.data.set(item.id, item));
        }
      }
    } catch (e) {
      console.error(`[FileStore:${this.name}] 加载失败:`, e.message);
    }

    if (this.data.size === 0 && seedData.length > 0) {
      seedData.forEach(item => this.data.set(item.id, { ...item }));
      this._enqueueSave();
    }
  }

  _enqueueSave() {
    this._writeQueue = this._writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          const payload = JSON.stringify(Array.from(this.data.values()), null, 2);
          fs.writeFileSync(this.filePath, payload, 'utf-8');
        } catch (e) {
          console.error(`[FileStore:${this.name}] 保存失败:`, e.message);
        }
        resolve();
      });
    });
    return this._writeQueue;
  }

  get(id) { return this.data.get(id) || null; }

  set(id, value) {
    this.data.set(id, value);
    this._version++;
    this._enqueueSave();
    return value;
  }

  getAll() { return Array.from(this.data.values()); }
  find(predicate) { return Array.from(this.data.values()).filter(predicate); }
  findOne(predicate) { return Array.from(this.data.values()).find(predicate); }

  delete(id) {
    const r = this.data.delete(id);
    if (r) {
      this._version++;
      this._enqueueSave();
    }
    return r;
  }

  size() { return this.data.size; }

  getVersion() { return this._version; }

  compareAndSwap(id, expectedVersion, updater) {
    const current = this.data.get(id);
    if (!current) return { success: false, error: 'not_found' };
    if ((current._v || 0) !== expectedVersion) {
      return { success: false, error: 'version_conflict', currentVersion: current._v || 0 };
    }
    const updated = updater(current);
    if (!updated) return { success: false, error: 'update_rejected' };
    updated._v = expectedVersion + 1;
    this.data.set(id, updated);
    this._version++;
    this._enqueueSave();
    return { success: true, data: updated, newVersion: updated._v };
  }

  withLock(id, fn) {
    const current = this.data.get(id);
    if (!current) return { success: false, error: 'not_found' };
    const vBefore = current._v || 0;
    const result = fn(current);
    if (result === false) return { success: false, error: 'operation_rejected' };
    const updated = result || current;
    updated._v = vBefore + 1;
    this.data.set(id, updated);
    this._version++;
    this._enqueueSave();
    return { success: true, data: updated, newVersion: updated._v };
  }
}

class IdempotencyStore {
  constructor() {
    this._keys = new Map();
    this._results = new Map();
  }

  check(key) {
    if (this._keys.has(key)) {
      return { isDuplicate: true, result: this._results.get(key) || null };
    }
    this._keys.set(key, { status: 'processing', createdAt: new Date().toISOString() });
    return { isDuplicate: false };
  }

  complete(key, result) {
    this._keys.set(key, { status: 'completed', completedAt: new Date().toISOString() });
    this._results.set(key, result);
  }

  fail(key, error) {
    this._keys.set(key, { status: 'failed', error: String(error), failedAt: new Date().toISOString() });
  }

  getResult(key) {
    return this._results.get(key) || null;
  }

  has(key) {
    return this._keys.has(key);
  }

  stats() {
    const all = Array.from(this._keys.values());
    return {
      total: all.length,
      byStatus: all.reduce((a, k) => { a[k.status] = (a[k.status] || 0) + 1; return a; }, {}),
    };
  }
}

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
const leads = [];

const kolTasks = [];
const kolTaskSubmissions = [];
const settlements = [];

const kolTracks = [];
const ecnyFlows = [];
const invoices = [];
const contractParams = [];
const tipsAgreements = [];
const taxReports = [];
const complianceChecks = [];
const ecnyWallets = [];

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
      chainTxId: '',
      chainTimestamp: '',
      chainBlock: '',
      chainExplorer: '',
      chainSource: '',
      notaryId: '',
      notaryUrl: '',
      notaryTimestamp: '',
      notarySource: '',
      notaryPrice: 0,
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
  updateChain(hash, chainData) {
    const record = hashRecords.find(h => h.hash === hash);
    if (record) {
      Object.assign(record, chainData);
    }
    return record;
  },
  updateNotary(hash, notaryData) {
    const record = hashRecords.find(h => h.hash === hash);
    if (record) {
      Object.assign(record, notaryData);
    }
    return record;
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
    let chainCount = 0;
    let notaryCount = 0;
    for (const h of hashRecords) {
      byType[h.dataType] = (byType[h.dataType] || 0) + 1;
      if (h.chainTxId) chainCount++;
      if (h.notaryId) notaryCount++;
    }
    return { total: hashRecords.length, byType, chainCount, notaryCount };
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

const KOL_TASK_THEMES = [
  { key: 'review', label: '测评', desc: '汽车深度测评内容' },
  { key: 'testdrive', label: '试驾', desc: '试驾体验分享' },
  { key: 'lifestyle', label: '生活', desc: '汽车生活场景内容' },
  { key: 'tech', label: '技术', desc: '汽车技术解析' },
  { key: 'creative', label: '创意', desc: '创意汽车内容' },
];

const KOL_TASK_CAR_MODELS = [
  { brand: '小米汽车', model: 'SU7' },
  { brand: '蔚来', model: 'ET5' },
  { brand: '理想', model: 'L7' },
  { brand: '小鹏', model: 'G6' },
  { brand: '比亚迪', model: '汉EV' },
  { brand: '极氪', model: '001' },
  { brand: '问界', model: 'M5' },
  { brand: '智己', model: 'LS7' },
];

const adminStore = {
  users: [],
  actions: []
};

const fundVerificationStore = {
  records: []
};

const kolTaskStore = {
  create(data) {
    const task = {
      id: 'kt_' + uuid().slice(0, 8),
      bizUserId: data.bizUserId,
      activityId: data.activityId || '',
      type: data.type || 'promote',
      typeName: KOL_TASK_TYPES[data.type?.toUpperCase()]?.label || '推广传播',
      carModel: data.carModel || '',
      carBrand: data.carBrand || '',
      theme: data.theme || '',
      themeName: KOL_TASK_THEMES.find(t => t.key === data.theme)?.label || '',
      title: data.title,
      description: data.description || '',
      rewardPerUnit: data.rewardPerUnit || 0,
      targetCount: data.targetCount || 10,
      completedCount: 0,
      totalRewardPool: data.totalRewardPool || 0,
      usedReward: 0,
      subBudgets: data.subBudgets || [],
      budgetAlertSent: false,
      status: 'open',
      requirements: data.requirements || {},
      deadline: data.deadline || '',
      dispatchMode: data.dispatchMode || 'kol_pick',
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
    if (filters.carModel) result = result.filter(t => t.carModel === filters.carModel);
    if (filters.theme) result = result.filter(t => t.theme === filters.theme);
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
  replenishBudget(taskId, additionalAmount) {
    const t = kolTasks.find(t => t.id === taskId);
    if (t) {
      t.totalRewardPool = +(t.totalRewardPool + additionalAmount).toFixed(2);
      t.budgetAlertSent = false;
    }
    return t;
  },
  checkBudgetAlert(taskId) {
    const t = kolTasks.find(t => t.id === taskId);
    if (!t || t.totalRewardPool <= 0) return null;
    const remaining = t.totalRewardPool - t.usedReward;
    const ratio = remaining / t.totalRewardPool;
    if (ratio < 0.1 && !t.budgetAlertSent) {
      t.budgetAlertSent = true;
      return { taskId: t.id, bizUserId: t.bizUserId, remaining, ratio, alertLevel: 'critical', message: '预算池低于10%，请及时补款' };
    }
    if (ratio < 0.2 && !t.budgetAlertSent) {
      return { taskId: t.id, bizUserId: t.bizUserId, remaining, ratio, alertLevel: 'warning', message: '预算池低于20%' };
    }
    return null;
  },
  close(taskId) {
    const t = kolTasks.find(t => t.id === taskId);
    if (t && t.status === 'open') t.status = 'closed';
    return t;
  },
};

const kolTaskSubmissionStore = {
  create(data) {
    const taskId = data.taskId;
    const kolUserId = data.kolUserId;
    const existing = kolTaskSubmissions.find(s => s.taskId === taskId && s.kolUserId === kolUserId && s.status !== 'rejected');
    if (existing) {
      return { duplicate: true, existing };
    }

    const sub = {
      id: 'ks_' + uuid().slice(0, 8),
      taskId,
      kolUserId,
      kolNickName: data.kolNickName || '',
      type: data.type || 'promote',
      contentId: data.contentId || '',
      bookingId: data.bookingId || '',
      proofData: data.proofData || {},
      reward: 0,
      aiScore: null,
      status: 'submitted',
      reEvaluated: false,
      reEvalCount: 0,
      supplementaryReward: 0,
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
  reEvaluate(subId, newAiScore, supplementaryReward) {
    const s = kolTaskSubmissions.find(s => s.id === subId);
    if (s) {
      s.reEvaluated = true;
      s.reEvalCount = (s.reEvalCount || 0) + 1;
      s.aiScore = newAiScore;
      if (supplementaryReward && supplementaryReward > 0) {
        s.supplementaryReward = +(s.supplementaryReward || 0) + supplementaryReward;
        s.reward = +(s.reward + supplementaryReward).toFixed(4);
      }
    }
    return s;
  },
  getByKolAndStatus(kolUserId, status) {
    return kolTaskSubmissions.filter(s => s.kolUserId === kolUserId && s.status === status);
  },
  checkDuplicate(taskId, kolUserId) {
    return kolTaskSubmissions.find(s => s.taskId === taskId && s.kolUserId === kolUserId && s.status !== 'rejected') || null;
  },
};

// ==================== Lead (B端线索) ====================
const LEAD_STATUS = {
  NEW: 'new',                 // 新线索
  FOLLOWING: 'following',     // 跟进中
  TEST_DRIVE: 'test_drive',   // 已试驾
  NEGOTIATING: 'negotiating', // 谈判中
  CLOSED: 'closed',           // 已成交
  LOST: 'lost',               // 已流失
};

const LEAD_SOURCE = {
  BOOKING: 'booking',         // 试驾预约
  FORM: 'form',               // 表单留资
  CHAT: 'chat',               // 在线咨询
  PHONE: 'phone',             // 电话线索
  IMPORT: 'import',           // 批量导入
};

const leadStore = {
  create(data) {
    const lead = {
      id: 'lead_' + uuid().slice(0, 8),
      bizUserId: data.bizUserId || '',
      
      name: data.name || '',
      phone: data.phone || '',
      city: data.city || '',
      source: data.source || LEAD_SOURCE.FORM,
      
      carModel: data.carModel || '',
      carBrand: data.carBrand || '',
      budget: data.budget || '',
      remarks: data.remarks || '',
      
      classification: data.classification || null,
      qualityScore: data.qualityScore || null,
      prediction: data.prediction || null,
      
      assignedTo: data.assignedTo || null,
      followups: [],
      
      status: LEAD_STATUS.NEW,
      convertedAt: null,
      dealAmount: null,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    leads.push(lead);
    return lead;
  },
  
  getById(id) {
    return leads.find(l => l.id === id) || null;
  },
  
  getByBizUser(bizUserId, filters = {}) {
    let result = leads.filter(l => l.bizUserId === bizUserId);
    
    if (filters.status) {
      result = result.filter(l => l.status === filters.status);
    }
    if (filters.source) {
      result = result.filter(l => l.source === filters.source);
    }
    if (filters.priority) {
      result = result.filter(l => l.qualityScore?.priority === filters.priority);
    }
    
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  },
  
  list(filters = {}) {
    let result = leads;
    
    if (filters.bizUserId) {
      result = result.filter(l => l.bizUserId === filters.bizUserId);
    }
    if (filters.status) {
      result = result.filter(l => l.status === filters.status);
    }
    if (filters.source) {
      result = result.filter(l => l.source === filters.source);
    }
    
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const start = (page - 1) * pageSize;
    
    return {
      list: result.slice(start, start + pageSize),
      total: result.length,
      page,
      pageSize,
    };
  },
  
  update(id, updates) {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      Object.assign(lead, updates, { updatedAt: new Date().toISOString() });
    }
    return lead;
  },
  
  addFollowup(leadId, followup) {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      lead.followups.push({
        id: 'fu_' + uuid().slice(0, 8),
        ...followup,
        createdAt: new Date().toISOString(),
      });
      lead.updatedAt = new Date().toISOString();
    }
    return lead;
  },
  
  updateStatus(id, status, extra = {}) {
    const lead = leads.find(l => l.id === id);
    if (lead) {
      lead.status = status;
      lead.updatedAt = new Date().toISOString();
      if (status === LEAD_STATUS.CLOSED) {
        lead.convertedAt = new Date().toISOString();
      }
      Object.assign(lead, extra);
    }
    return lead;
  },
  
  getStats(bizUserId) {
    const userLeads = leads.filter(l => l.bizUserId === bizUserId);
    return {
      total: userLeads.length,
      new: userLeads.filter(l => l.status === LEAD_STATUS.NEW).length,
      following: userLeads.filter(l => l.status === LEAD_STATUS.FOLLOWING).length,
      testDrive: userLeads.filter(l => l.status === LEAD_STATUS.TEST_DRIVE).length,
      closed: userLeads.filter(l => l.status === LEAD_STATUS.CLOSED).length,
      lost: userLeads.filter(l => l.status === LEAD_STATUS.LOST).length,
      conversionRate: userLeads.length > 0 
        ? +(userLeads.filter(l => l.status === LEAD_STATUS.CLOSED).length / userLeads.length * 100).toFixed(2)
        : 0,
    };
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

const KOL_TRACKS = {
  A: { key: 'A', label: '全职/驻场', desc: '车商/4S店签约KOL', taxType: '工资薪金', taxRange: '3%-45%' },
  B: { key: 'B', label: '散签劳务', desc: '大部分腰部KOL', taxType: '劳务报酬', taxRange: '20%预扣' },
  C: { key: 'C', label: '个体户/工作室', desc: '头部KOL(有营业执照)', taxType: '经营所得', taxRange: '5%-35%' },
};

const kolTrackStore = {
  create(data) {
    const track = {
      id: 'kt_' + uuid().slice(0, 8),
      userId: data.userId,
      track: data.track || 'B',
      trackCriteria: {
        hasEmployment: data.hasEmployment || false,
        hasBusinessLicense: data.hasBusinessLicense || false,
        monthlyIncomeRange: data.monthlyIncomeRange || 'unknown',
      },
      taxConfig: {
        taxType: KOL_TRACKS[data.track || 'B'].taxType,
        withholdingRate: data.track === 'B' ? 0.20 : 0,
        selfInvoicing: data.track === 'C',
      },
      trackHistory: [],
      assignedAt: new Date().toISOString(),
      autoClassified: data.autoClassified !== false,
    };
    kolTracks.push(track);
    return track;
  },
  getByUserId(userId) {
    return kolTracks.find(t => t.userId === userId) || null;
  },
  update(userId, updates) {
    const track = kolTracks.find(t => t.userId === userId);
    if (track) Object.assign(track, updates, { assignedAt: new Date().toISOString() });
    return track;
  },
  reclassify(userId, newTrack, reason) {
    const track = kolTracks.find(t => t.userId === userId);
    if (track) {
      track.trackHistory.push({ from: track.track, to: newTrack, reason, changedAt: new Date().toISOString() });
      track.track = newTrack;
      track.taxConfig = {
        taxType: KOL_TRACKS[newTrack].taxType,
        withholdingRate: newTrack === 'B' ? 0.20 : 0,
        selfInvoicing: newTrack === 'C',
      };
      track.autoClassified = false;
      track.assignedAt = new Date().toISOString();
    }
    return track;
  },
  list(filter) {
    let result = kolTracks;
    if (filter && filter.track) result = result.filter(t => t.track === filter.track);
    return result;
  },
  getDistribution() {
    const dist = { A: 0, B: 0, C: 0 };
    kolTracks.forEach(t => { if (dist[t.track] !== undefined) dist[t.track]++; });
    return dist;
  },
};

// ==================== e-CNY Wallet ====================
const ecnyWalletStore = {
  create(data) {
    const wallet = {
      id: 'ew_' + uuid().slice(0, 8),
      walletId: 'ecny_' + uuid().slice(0, 12),
      walletType: data.walletType || 'personal',
      ownerId: data.ownerId || '',
      balance: 0,
      tipsAgreementId: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    ecnyWallets.push(wallet);
    return wallet;
  },
  getByWalletId(walletId) {
    return ecnyWallets.find(w => w.walletId === walletId) || null;
  },
  getByOwner(ownerId) {
    return ecnyWallets.filter(w => w.ownerId === ownerId);
  },
  getByType(walletType) {
    return ecnyWallets.filter(w => w.walletType === walletType);
  },
  updateBalance(walletId, amount) {
    const wallet = ecnyWallets.find(w => w.walletId === walletId);
    if (wallet) wallet.balance = +(wallet.balance + amount).toFixed(2);
    return wallet;
  },
  bindTips(walletId, tipsAgreementId) {
    const wallet = ecnyWallets.find(w => w.walletId === walletId);
    if (wallet) wallet.tipsAgreementId = tipsAgreementId;
    return wallet;
  },
};

// ==================== e-CNY Flow ====================
const ecnyFlowStore = {
  create(data) {
    const flow = {
      id: 'ef_' + uuid().slice(0, 8),
      flowId: 'FLOW_' + uuid().slice(0, 12),
      walletId: data.walletId || '',
      walletType: data.walletType || 'personal',
      amount: data.amount || 0,
      direction: data.direction || 'in',
      bizRef: data.bizRef || '',
      bizType: data.bizType || 'settlement',
      splitDetail: data.splitDetail || [],
      hashProof: '',
      umbrellaSplitRef: data.umbrellaSplitRef || '',
      status: data.status || 'completed',
      createdAt: new Date().toISOString(),
    };
    ecnyFlows.push(flow);
    return flow;
  },
  getByFlowId(flowId) {
    return ecnyFlows.find(f => f.flowId === flowId) || null;
  },
  getByBizRef(bizRef) {
    return ecnyFlows.find(f => f.bizRef === bizRef) || null;
  },
  list(filter) {
    let result = ecnyFlows;
    if (filter) {
      if (filter.walletId) result = result.filter(f => f.walletId === filter.walletId);
      if (filter.direction) result = result.filter(f => f.direction === filter.direction);
      if (filter.bizType) result = result.filter(f => f.bizType === filter.bizType);
      if (filter.status) result = result.filter(f => f.status === filter.status);
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(filter?.page) || 1;
    const ps = parseInt(filter?.pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
  updateHashProof(flowId, hashProof) {
    const flow = ecnyFlows.find(f => f.flowId === flowId);
    if (flow) flow.hashProof = hashProof;
    return flow;
  },
  getByWallet(walletId) {
    return ecnyFlows.filter(f => f.walletId === walletId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
};

// ==================== Invoice ====================
const invoiceStore = {
  create(data) {
    const invoice = {
      id: 'inv_' + uuid().slice(0, 8),
      invoiceId: 'inv_' + uuid().slice(0, 8),
      invoiceNo: data.invoiceNo || 'DJP' + Date.now() + uuid().slice(0, 4),
      invoiceType: data.invoiceType || '电子普票',
      issuerId: data.issuerId || '',
      recipientId: data.recipientId || '',
      recipientTrack: data.recipientTrack || 'B',
      amount: data.amount || 0,
      preTaxAmount: data.preTaxAmount || data.amount || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount || data.amount || 0,
      taxRate: data.taxRate || 0.06,
      bizRef: data.bizRef || '',
      bizHash: data.bizHash || '',
      ecnyFlowId: data.ecnyFlowId || '',
      leqiRef: data.leqiRef || 'LQ' + uuid().slice(0, 8),
      status: data.status || 'draft',
      issueMode: data.issueMode || 'auto',
      createdAt: new Date().toISOString(),
    };
    invoices.push(invoice);
    return invoice;
  },
  getByInvoiceId(invoiceId) {
    return invoices.find(i => i.invoiceId === invoiceId || i.id === invoiceId) || null;
  },
  getByInvoiceNo(invoiceNo) {
    return invoices.find(i => i.invoiceNo === invoiceNo) || null;
  },
  getByBizRef(bizRef) {
    return invoices.find(i => i.bizRef === bizRef) || null;
  },
  list(filter) {
    let result = invoices;
    if (filter) {
      if (filter.issuerId) result = result.filter(i => i.issuerId === filter.issuerId);
      if (filter.recipientId) result = result.filter(i => i.recipientId === filter.recipientId);
      if (filter.recipientTrack) result = result.filter(i => i.recipientTrack === filter.recipientTrack);
      if (filter.status) result = result.filter(i => i.status === filter.status);
    }
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const p = parseInt(filter?.page) || 1;
    const ps = parseInt(filter?.pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
  updateStatus(invoiceId, status) {
    const inv = invoices.find(i => i.invoiceId === invoiceId || i.id === invoiceId);
    if (inv) inv.status = status;
    return inv;
  },
  linkFlow(invoiceId, ecnyFlowId) {
    const inv = invoices.find(i => i.invoiceId === invoiceId || i.id === invoiceId);
    if (inv) inv.ecnyFlowId = ecnyFlowId;
    return inv;
  },
  getMonthlySummary(recipientId, period) {
    const monthInvoices = invoices.filter(i => i.recipientId === recipientId && i.createdAt.startsWith(period));
    const byTrack = { A: { count: 0, amount: 0 }, B: { count: 0, amount: 0 }, C: { count: 0, amount: 0 } };
    let totalAmount = 0, totalTax = 0;
    monthInvoices.forEach(i => {
      totalAmount += i.totalAmount;
      totalTax += i.taxAmount;
      if (byTrack[i.recipientTrack]) {
        byTrack[i.recipientTrack].count++;
        byTrack[i.recipientTrack].amount += i.totalAmount;
      }
    });
    return { totalAmount: +totalAmount.toFixed(2), totalTax: +totalTax.toFixed(2), count: monthInvoices.length, byTrack };
  },
};

// ==================== Contract Params ====================
const DEFAULT_CONTRACT_PARAMS = [
  { paramKey: 'single_small_threshold', paramValue: 800, defaultValue: 800, scope: 'global', description: '单笔小额阈值(元)' },
  { paramKey: 'single_large_threshold', paramValue: 800, defaultValue: 800, scope: 'global', description: '单笔大额触发阈值(元)' },
  { paramKey: 'monthly_small_threshold', paramValue: 10000, defaultValue: 10000, scope: 'global', description: '月累小额阈值(元)' },
  { paramKey: 'monthly_large_threshold', paramValue: 10000, defaultValue: 10000, scope: 'global', description: '月累大额触发阈值(元)' },
  { paramKey: 'daily_freq_threshold', paramValue: 5, defaultValue: 5, scope: 'global', description: '单日频次预警阈值' },
  { paramKey: 'withholding_rate_b', paramValue: 0.20, defaultValue: 0.20, scope: 'track_B', description: 'B轨劳务报酬预扣率' },
  { paramKey: 'withholding_threshold', paramValue: 800, defaultValue: 800, scope: 'track_B', description: '劳务报酬起征点(元)' },
  { paramKey: 'batch_settle_day', paramValue: 28, defaultValue: 28, scope: 'global', description: '月底batch结算日' },
  { paramKey: 'fee_rate', paramValue: 0.006, defaultValue: 0.006, scope: 'global', description: '平台手续费率' },
  { paramKey: 'settlement_ai_verify_threshold', paramValue: 100, defaultValue: 100, scope: 'global', description: '结算AI验证阈值(元)' },
];
contractParams.push(...DEFAULT_CONTRACT_PARAMS.map(p => ({ ...p, updatedAt: new Date().toISOString(), updatedBy: 'system' })));

const contractParamStore = {
  list(scope) {
    let result = contractParams;
    if (scope) result = result.filter(p => p.scope === scope || p.scope === 'global');
    return result;
  },
  get(paramKey, scope) {
    if (scope) {
      const scoped = contractParams.find(p => p.paramKey === paramKey && p.scope === scope);
      if (scoped) return scoped;
    }
    return contractParams.find(p => p.paramKey === paramKey && p.scope === 'global') || null;
  },
  getValue(paramKey, scope) {
    const param = contractParamStore.get(paramKey, scope);
    return param ? param.paramValue : null;
  },
  set(paramKey, value, scope, updatedBy) {
    const param = contractParams.find(p => p.paramKey === paramKey && p.scope === (scope || 'global'));
    if (param) {
      param.paramValue = value;
      param.updatedAt = new Date().toISOString();
      param.updatedBy = updatedBy || 'admin';
    }
    return param;
  },
  reset(paramKey) {
    const params = contractParams.filter(p => p.paramKey === paramKey);
    params.forEach(p => { p.paramValue = p.defaultValue; p.updatedAt = new Date().toISOString(); p.updatedBy = 'system'; });
    return params;
  },
  resetAll() {
    contractParams.forEach(p => { p.paramValue = p.defaultValue; p.updatedAt = new Date().toISOString(); p.updatedBy = 'system'; });
    return contractParams;
  },
};

// ==================== Tips Agreement ====================
const tipsAgreementStore = {
  create(data) {
    const agreement = {
      id: 'ta_' + uuid().slice(0, 8),
      agreementId: 'TIPS_' + uuid().slice(0, 8),
      userId: data.userId,
      bankAccount: data.bankAccount || '',
      bankName: data.bankName || '',
      taxBureauCode: data.taxBureauCode || '',
      status: 'active',
      signDate: new Date().toISOString(),
      autoDeductEnabled: data.autoDeductEnabled !== false,
    };
    tipsAgreements.push(agreement);
    return agreement;
  },
  getByAgreementId(agreementId) {
    return tipsAgreements.find(a => a.agreementId === agreementId) || null;
  },
  getByUserId(userId) {
    return tipsAgreements.filter(a => a.userId === userId);
  },
  suspend(agreementId, reason) {
    const a = tipsAgreements.find(a => a.agreementId === agreementId);
    if (a) { a.status = 'suspended'; a.suspendReason = reason; }
    return a;
  },
  reactivate(agreementId) {
    const a = tipsAgreements.find(a => a.agreementId === agreementId);
    if (a) { a.status = 'active'; delete a.suspendReason; }
    return a;
  },
};

// ==================== Tax Report ====================
const taxReportStore = {
  create(data) {
    const report = {
      id: 'tr_' + uuid().slice(0, 8),
      reportId: 'TR_' + uuid().slice(0, 8),
      period: data.period || new Date().toISOString().slice(0, 7),
      track: data.track || 'B',
      totalAmount: data.totalAmount || 0,
      taxableAmount: data.taxableAmount || 0,
      taxAmount: data.taxAmount || 0,
      withholdingCount: data.withholdingCount || 0,
      batchInvoiceCount: data.batchInvoiceCount || 0,
      status: 'draft',
      jinshui4Ref: '',
      createdAt: new Date().toISOString(),
    };
    taxReports.push(report);
    return report;
  },
  getByReportId(reportId) {
    return taxReports.find(r => r.reportId === reportId) || null;
  },
  getByPeriod(period) {
    return taxReports.filter(r => r.period === period);
  },
  list(filter) {
    let result = taxReports;
    if (filter && filter.status) result = result.filter(r => r.status === filter.status);
    if (filter && filter.track) result = result.filter(r => r.track === filter.track);
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return result;
  },
  updateStatus(reportId, status, extra) {
    const r = taxReports.find(r => r.reportId === reportId);
    if (r) { r.status = status; if (extra) Object.assign(r, extra); }
    return r;
  },
};

// ==================== Compliance Check ====================
const complianceCheckStore = {
  create(data) {
    const check = {
      id: 'cc_' + uuid().slice(0, 8),
      checkId: 'CC_' + uuid().slice(0, 8),
      bizHash: data.bizHash || '',
      ecnyFlowId: data.ecnyFlowId || '',
      invoiceId: data.invoiceId || '',
      bizAmount: data.bizAmount || 0,
      flowAmount: data.flowAmount || 0,
      invoiceAmount: data.invoiceAmount || 0,
      matchStatus: data.matchStatus || 'pending',
      mismatchDetail: data.mismatchDetail || '',
      checkTime: new Date().toISOString(),
      autoCheck: data.autoCheck !== false,
    };
    complianceChecks.push(check);
    return check;
  },
  getByCheckId(checkId) {
    return complianceChecks.find(c => c.checkId === checkId) || null;
  },
  getByBizHash(bizHash) {
    return complianceChecks.filter(c => c.bizHash === bizHash);
  },
  list(filter) {
    let result = complianceChecks;
    if (filter) {
      if (filter.matchStatus) result = result.filter(c => c.matchStatus === filter.matchStatus);
      if (filter.autoCheck !== undefined) result = result.filter(c => c.autoCheck === filter.autoCheck);
    }
    result.sort((a, b) => new Date(b.checkTime) - new Date(a.checkTime));
    const p = parseInt(filter?.page) || 1;
    const ps = parseInt(filter?.pageSize) || 20;
    return { list: result.slice((p - 1) * ps, p * ps), total: result.length, page: p, pageSize: ps };
  },
  getDashboard() {
    const total = complianceChecks.length;
    const matched = complianceChecks.filter(c => c.matchStatus === 'matched').length;
    const mismatched = complianceChecks.filter(c => c.matchStatus === 'mismatch').length;
    const partial = complianceChecks.filter(c => c.matchStatus === 'partial').length;
    const recentMismatches = complianceChecks.filter(c => c.matchStatus === 'mismatch')
      .sort((a, b) => new Date(b.checkTime) - new Date(a.checkTime)).slice(0, 10);
    return {
      total,
      matchRate: total > 0 ? +(matched / total * 100).toFixed(2) : 100,
      mismatchRate: total > 0 ? +(mismatched / total * 100).toFixed(2) : 0,
      partialRate: total > 0 ? +(partial / total * 100).toFixed(2) : 0,
      matched,
      mismatched,
      partial,
      recentMismatches,
    };
  },
};



// ==================== 数据销售相关 ====================
const dataSalesOrders = [];
const budgetAccounts = [];
const employmentContracts = [];
const kolWeights = {};

const DATA_SALES_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SETTLED: 'settled',
  CANCELLED: 'cancelled'
};

const DATA_TYPES = {
  CONTENT: 'content',
  LEADS: 'leads',
  ENGAGEMENT: 'engagement'
};

const EMPLOYMENT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated'
};

const KOL_LEVELS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
};

const dataSalesOrderStore = {
  create(order) {
    const newOrder = {
      id: uuid(),
      ...order,
      status: DATA_SALES_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      settledAt: null
    };
    dataSalesOrders.push(newOrder);
    return newOrder;
  },
  
  getById(id) {
    return dataSalesOrders.find(o => o.id === id);
  },
  
  listByBiz(bizUserId) {
    return dataSalesOrders.filter(o => o.bizUserId === bizUserId);
  },
  
  listByKol(kolUserId) {
    return dataSalesOrders.filter(o => o.kolUserId === kolUserId);
  },
  
  update(id, updates) {
    const index = dataSalesOrders.findIndex(o => o.id === id);
    if (index !== -1) {
      dataSalesOrders[index] = { ...dataSalesOrders[index], ...updates };
      return dataSalesOrders[index];
    }
    return null;
  },
  
  listAll() {
    return dataSalesOrders;
  }
};

const budgetAccountStore = {
  create(account) {
    const newAccount = {
      id: uuid(),
      ...account,
      usedBudget: 0,
      remainingBudget: account.totalBudget,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    budgetAccounts.push(newAccount);
    return newAccount;
  },
  
  getById(id) {
    return budgetAccounts.find(a => a.id === id);
  },
  
  getByBizUserId(bizUserId) {
    return budgetAccounts.find(a => a.bizUserId === bizUserId);
  },
  
  update(id, updates) {
    const index = budgetAccounts.findIndex(a => a.id === id);
    if (index !== -1) {
      budgetAccounts[index] = { ...budgetAccounts[index], ...updates };
      return budgetAccounts[index];
    }
    return null;
  },
  
  deduct(id, amount) {
    const account = this.getById(id);
    if (account && account.remainingBudget >= amount) {
      account.usedBudget += amount;
      account.remainingBudget -= amount;
      if (account.remainingBudget === 0) {
        account.status = 'exhausted';
      }
      return account;
    }
    return null;
  },
  
  recharge(id, amount) {
    const account = this.getById(id);
    if (account) {
      account.totalBudget += amount;
      account.remainingBudget += amount;
      account.status = 'active';
      return account;
    }
    return null;
  },
  
  listAll() {
    return budgetAccounts;
  }
};

const employmentContractStore = {
  create(contract) {
    const newContract = {
      id: uuid(),
      ...contract,
      status: EMPLOYMENT_STATUS.ACTIVE,
      verifiedAt: null,
      verificationProof: null,
      createdAt: new Date().toISOString()
    };
    employmentContracts.push(newContract);
    return newContract;
  },
  
  getById(id) {
    return employmentContracts.find(c => c.id === id);
  },
  
  listByBiz(bizUserId) {
    return employmentContracts.filter(c => c.bizUserId === bizUserId);
  },
  
  listByKol(kolUserId) {
    return employmentContracts.filter(c => c.kolUserId === kolUserId);
  },
  
  update(id, updates) {
    const index = employmentContracts.findIndex(c => c.id === id);
    if (index !== -1) {
      employmentContracts[index] = { ...employmentContracts[index], ...updates };
      return employmentContracts[index];
    }
    return null;
  },
  
  verify(id, proof) {
    const contract = this.getById(id);
    if (contract) {
      contract.verifiedAt = new Date().toISOString();
      contract.verificationProof = proof;
      return contract;
    }
    return null;
  },
  
  listAll() {
    return employmentContracts;
  }
};

const kolWeightStore = {
  init(userId) {
    if (!kolWeights[userId]) {
      kolWeights[userId] = {
        userId,
        baseWeight: 1.0,
        dynamicWeight: 1.0,
        salesCount: 0,
        qualityScore: 50,
        level: KOL_LEVELS.BRONZE,
        lastUpgradeAt: null,
        lastDowngradeAt: null,
        createdAt: new Date().toISOString()
      };
    }
    return kolWeights[userId];
  },
  
  get(userId) {
    return kolWeights[userId] || this.init(userId);
  },
  
  update(userId, updates) {
    const weight = this.get(userId);
    Object.assign(weight, updates);
    return weight;
  },
  
  incrementSales(userId) {
    const weight = this.get(userId);
    weight.salesCount += 1;
    return weight;
  },
  
  upgrade(userId) {
    const weight = this.get(userId);
    const levels = Object.values(KOL_LEVELS);
    const currentIndex = levels.indexOf(weight.level);
    if (currentIndex < levels.length - 1) {
      weight.level = levels[currentIndex + 1];
      weight.lastUpgradeAt = new Date().toISOString();
    }
    return weight;
  },
  
  downgrade(userId) {
    const weight = this.get(userId);
    const levels = Object.values(KOL_LEVELS);
    const currentIndex = levels.indexOf(weight.level);
    if (currentIndex > 0) {
      weight.level = levels[currentIndex - 1];
      weight.lastDowngradeAt = new Date().toISOString();
    }
    return weight;
  },
  
  listAll() {
    return Object.values(kolWeights);
  }
};

const fileStores = {
  opRegistry: new FileStore('opRegistry'),
  deadLetterOps: new FileStore('deadLetterOps'),
  taxRecords: new FileStore('taxRecords'),
  notificationTemplate: new FileStore('notificationTemplate'),
  userNotificationPref: new FileStore('userNotificationPref'),
};

const idempotency = new IdempotencyStore();

module.exports = {
  FileStore,
  IdempotencyStore,
  idempotency,
  ...fileStores,
  activityStore,
  userStore,
  contentStore,
  bookingStore,
  walletStore,
  transactionStore,
  notificationStore,
  bizProductStore,
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
  KOL_TASK_THEMES,
  KOL_TASK_CAR_MODELS,
  adminStore,
  fundVerificationStore,
  kolTaskStore,
  kolTaskSubmissionStore,
  SETTLEMENT_STATUS,
  settlementStore,
  leadStore,
  LEAD_STATUS,
  LEAD_SOURCE,
  KOL_TRACKS,
  kolTrackStore,
  ecnyWalletStore,
  ecnyFlowStore,
  invoiceStore,
  contractParamStore,
  tipsAgreementStore,
  taxReportStore,
  complianceCheckStore,
  dataSalesOrderStore,
  budgetAccountStore,
  employmentContractStore,
  kolWeightStore,
  DATA_SALES_STATUS,
  DATA_TYPES,
  EMPLOYMENT_STATUS,
  KOL_LEVELS
};
