/**
 * 龟钮印信 — 建行 e-CNY 伞列"智合分账"引擎
 *
 * 对接建行数字人民币伞列账户体系
 * 支持 FileStore 持久化
 */

const crypto = require('crypto');

const ACCOUNT_TYPE = {
  MAIN_UMBRELLA: 'main_umbrella',
  SUB_WALLET: 'sub_wallet',
  TIPS_HOLDING: 'tips_holding',
  PLATFORM: 'platform',
  MCN: 'mcn',
  KOL: 'kol',
};

class UmbrellaAccount {
  constructor(data) {
    this.accountId = data.accountId || `ua_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    this.type = data.type || ACCOUNT_TYPE.SUB_WALLET;
    this.parentId = data.parentId || '';
    this.name = data.name || '未命名账户';
    this.walletAddress = data.walletAddress || '';
    this.binding = data.binding || '';
    this.track = data.track || null;
    this.priority = data.priority || 0;
    this.status = data.status || 'active';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.balance = data.balance || 0;
  }
}

class UmbrellaMatrix {
  constructor(accountStore = null) {
    this._store = accountStore;
    this._initDefault();
  }

  _initDefault() {
    if (this._store && this._store.size() === 0) {
      const main = new UmbrellaAccount({
        type: ACCOUNT_TYPE.MAIN_UMBRELLA,
        name: '龟钮印信主伞账户',
        walletAddress: 'ecny_main_umbrella_001',
        priority: 0,
      });
      this._store.set(main.accountId, main);

      const tips = new UmbrellaAccount({
        type: ACCOUNT_TYPE.TIPS_HOLDING,
        name: 'TIPS 税务暂存账户',
        walletAddress: 'ecny_tips_holding_001',
        binding: 'tips_tax_001',
        priority: 1,
      });
      this._store.set(tips.accountId, tips);
    }
  }

  register(data) {
    const account = new UmbrellaAccount(data);
    if (this._store) this._store.set(account.accountId, account);
    return account;
  }

  get(accountId) {
    if (this._store) return this._store.get(accountId) || null;
    return null;
  }

  findByType(type) {
    if (this._store) return this._store.find(a => a.type === type);
    return [];
  }

  findByBinding(binding) {
    if (this._store) return this._store.find(a => a.binding === binding);
    return [];
  }

  findChildren(parentId) {
    if (this._store) {
      return this._store.find(a => a.parentId === parentId)
        .sort((a, b) => a.priority - b.priority);
    }
    return [];
  }

  listActive() {
    if (this._store) return this._store.find(a => a.status === 'active');
    return [];
  }

  get count() {
    return this._store ? this._store.size() : 0;
  }

  remove(accountId) {
    if (this._store) return this._store.delete(accountId);
    return false;
  }

  toggleStatus(accountId) {
    if (!this._store) return null;
    const account = this._store.get(accountId);
    if (!account) return null;
    account.status = account.status === 'active' ? 'frozen' : 'active';
    this._store.set(accountId, account);
    return account;
  }

  listAll() {
    if (this._store) return this._store.getAll();
    return [];
  }
}

class SplitRule {
  constructor(data) {
    this.ruleId = data.ruleId || `sr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    this.id = this.ruleId;
    this.name = data.name || '未命名清分规则';
    this.type = data.type || 'percentage';
    this.value = data.value || 0;
    this.targetAccountId = data.targetAccountId || '';
    this.targetType = data.targetType || 'kol';
    this.priority = data.priority || 0;
    this.conditions = data.conditions || [];
    this.memo = data.memo || '';
  }
}

class UmbrellaSplitEngine {
  constructor(options = {}) {
    this.matrix = options.matrix || new UmbrellaMatrix(options.accountStore);
    this.contractEngine = options.contractEngine || null;
    this._ruleStore = options.ruleStore || null;
    this._logStore = options.logStore || null;
    this._initDefaultRules();
  }

  _initDefaultRules() {
    if (this._ruleStore && this._ruleStore.size() === 0) {
      const defaultRules = [
        { name: 'KOL 分成', type: 'percentage', value: 50, targetType: 'kol', priority: 0, memo: '50% KOL分成' },
        { name: '平台服务费', type: 'percentage', value: 10, targetType: 'platform', priority: 1, memo: '10% 平台' },
        { name: 'MCN 管理费', type: 'percentage', value: 6, targetType: 'mcn', priority: 2, memo: '6% MCN' },
        { name: '商户净额', type: 'residual', value: 0, targetType: 'merchant', priority: 99, memo: '剩余归商户' },
      ];
      for (const r of defaultRules) {
        const rule = new SplitRule(r);
        this._ruleStore.set(rule.ruleId, rule);
      }
    }
  }

  addRule(data) {
    const rule = new SplitRule(data);
    if (this._ruleStore) this._ruleStore.set(rule.ruleId, rule);
    return rule;
  }

  removeRule(ruleId) {
    if (this._ruleStore) return this._ruleStore.delete(ruleId);
    return false;
  }

  listRules() {
    if (this._ruleStore) return this._ruleStore.getAll();
    return [];
  }

  async execute(params) {
    const { totalAmount, sourceTradeNo, kol, monthlyAccumulated = 0, dailyCount = 0, customSplits } = params;

    let splitRules = [];
    if (customSplits && customSplits.length > 0) {
      splitRules = customSplits.map((s, i) => new SplitRule({
        name: s.memo || `分账-${i}`,
        type: 'percentage',
        value: s.weight || s.percentage || 0,
        targetAccountId: s.accountId || '',
        targetType: s.targetType || s.partyType || 'kol',
        priority: s.priority || i,
        memo: s.memo || '',
      }));
    } else {
      splitRules = this._ruleStore
        ? this._ruleStore.getAll().sort((a, b) => a.priority - b.priority)
        : [];
    }

    if (splitRules.length === 0) {
      throw new Error('没有可用的清分规则');
    }

    const totalWeight = splitRules.reduce((s, r) => s + r.value, 0);
    const entries = [];

    for (const rule of splitRules) {
      let amount = 0;

      if (rule.type === 'percentage') {
        amount = parseFloat((totalAmount * rule.value / totalWeight).toFixed(2));
      } else if (rule.type === 'fixed') {
        amount = Math.min(rule.value, totalAmount);
      } else if (rule.type === 'residual') {
        const allocated = entries.reduce((s, e) => s + e.amount, 0);
        amount = parseFloat((totalAmount - allocated).toFixed(2));
      }

      const targetAccount = this.matrix.get(rule.targetAccountId);

      entries.push({
        ruleId: rule.ruleId,
        ruleName: rule.name,
        targetType: rule.targetType,
        targetAccountId: rule.targetAccountId,
        targetWallet: targetAccount ? targetAccount.walletAddress : '',
        amount,
        memo: rule.memo,
      });
    }

    let withhold = 0;
    let kolTrack = null;
    let invoice = { needsInvoice: false };
    let tips = { needsTips: false };

    const kolEntry = entries.find(e => e.targetType === 'kol');
    if (kol && kolEntry) {
      if (kol.track === 'B' || !kol.track) {
        if (kolEntry.amount > 800) {
          withhold = Math.round((kolEntry.amount - 800) * 0.2 * 100) / 100;
          kolEntry.withhold = withhold;
          kolEntry.netAmount = kolEntry.amount - withhold;
        }

        if (dailyCount >= 5 || monthlyAccumulated > 10000) {
          invoice = { needsInvoice: true, invoiceType: 'service', amount: kolEntry.amount, remarks: '月累/频次达警戒，需乐企自动开票' };
        }

        if (withhold > 0) {
          tips = { needsTips: true, withholdAmount: withhold, taxType: '劳务报酬预扣' };
        }
      }
    }

    const batchNo = `um_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const logEntry = {
      id: batchNo,
      batchNo,
      sourceTradeNo: sourceTradeNo || '',
      totalAmount,
      entries,
      withhold,
      tips,
      invoice,
      kolTrack,
      executedAt: new Date().toISOString(),
    };

    if (this._logStore) this._logStore.set(batchNo, logEntry);

    return logEntry;
  }

  getLog(batchNo) {
    if (this._logStore) return this._logStore.get(batchNo) || null;
    return null;
  }

  listLogs(limit = 10) {
    if (this._logStore) {
      const all = this._logStore.getAll();
      return all.slice(-limit).reverse();
    }
    return [];
  }
}

module.exports = {
  ACCOUNT_TYPE,
  UmbrellaAccount,
  UmbrellaMatrix,
  SplitRule,
  UmbrellaSplitEngine,
};
