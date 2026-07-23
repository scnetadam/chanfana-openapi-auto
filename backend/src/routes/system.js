const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const SYSTEM_CONFIG = {
  version: '3.2.0',
  project: 'guiniu-deveco',
  features: [
    'sso', 'two-phase-settle', 'channel-capability', 'collector-agent',
    'ai-threshold', 'wallet-reserve', 'idempotency', 'dead-letter-queue',
    'tax-state-machine', 'notary-engine', 'weighted-valuation', 'page-weighted-settle',
    'visitor-behavior', 'data-lock', 'git-repo-tracker', 'collector', 'budget',
    'kol', 'credit-points', 'page-tracker', 'content-center', 'onboarding',
    'kyc', 'payment-backends', 'cross-project-coordinator', 'contract-verify',
    'umbrella-split', 'auth-middleware', 'protocol-persistence', 'clue-management',
    'kol-influence-engine', 'sentiment-analysis', 'data-market-v3', 'batch-settle',
    'auto-reconciliation', 'merchant-workbench', 'report-analytics',
  ],
  paymentChannels: ['alipay', 'wechat', 'ecny'],
  taxTracks: ['A', 'B', 'C'],
  kolRankTiers: ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C'],
};

const CONFIG_STORE = new Map();

function initDefaultConfig() {
  const defaults = [
    { key: 'commission_rate_default', value: 0.30, type: 'number', description: '默认佣金比例', category: 'payment' },
    { key: 'settle_threshold_yuan', value: 10, type: 'number', description: 'AI阈值结算金额(元)', category: 'payment' },
    { key: 'guiniu_point_value', value: 0.01, type: 'number', description: '龟钮点单价(元)', category: 'payment' },
    { key: 'tax_track_b_rate', value: 0.20, type: 'number', description: 'B轨税率', category: 'tax' },
    { key: 'tax_single_threshold', value: 800, type: 'number', description: '单笔扣税阈值(元)', category: 'tax' },
    { key: 'tax_monthly_threshold', value: 10000, type: 'number', description: '月累计扣税阈值(元)', category: 'tax' },
    { key: 'tax_daily_freq_limit', value: 5, type: 'number', description: 'B轨日频警戒线(笔)', category: 'tax' },
    { key: 'kol_anti_cheat_daily_limit', value: 20, type: 'number', description: 'KOL反作弊日交易阈值', category: 'kol' },
    { key: 'kol_same_ip_limit', value: 3, type: 'number', description: 'KOL同IP交易阈值', category: 'kol' },
    { key: 'kol_instant_convert_limit', value: 3, type: 'number', description: 'KOL即时成交线索阈值', category: 'kol' },
    { key: 'clue_score_base', value: 50, type: 'number', description: '线索基础分', category: 'clue' },
    { key: 'sentiment_trending_threshold', value: 5, type: 'number', description: '舆情热点文章阈值', category: 'sentiment' },
    { key: 'data_quality_hash_threshold', value: 0.85, type: 'number', description: '数据确权Hash质量阈值', category: 'data_market' },
    { key: 'wallet_reserve_ttl_ms', value: 1800000, type: 'number', description: '钱包预授权TTL(毫秒)', category: 'wallet' },
  ];

  defaults.forEach(d => {
    if (!CONFIG_STORE.has(d.key)) {
      CONFIG_STORE.set(d.key, { ...d, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() });
    }
  });
}

initDefaultConfig();

const AUDIT_LOG_PATH = path.join(DATA_DIR, 'audit_log.json');

function writeAuditLog(entry) {
  try {
    let logs = [];
    if (fs.existsSync(AUDIT_LOG_PATH)) {
      const raw = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8');
      logs = JSON.parse(raw);
    }
    logs.push(entry);
    if (logs.length > 10000) logs = logs.slice(-10000);
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.error('[system] 审计日志写入失败:', e.message);
  }
}

function getAuditLogs() {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
    return JSON.parse(fs.readFileSync(AUDIT_LOG_PATH, 'utf-8'));
  } catch (e) {
    return [];
  }
}

router.get('/config', (req, res) => {
  try {
    const { category } = req.query;
    let configs = Array.from(CONFIG_STORE.values());
    if (category) configs = configs.filter(c => c.category === category);
    res.json({ success: true, data: { configs, total: configs.length } });
  } catch (e) {
    console.error('[system] config查询错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/config/:key', (req, res) => {
  try {
    const config = CONFIG_STORE.get(req.params.key);
    if (!config) return res.status(404).json({ success: false, error: '配置项不存在' });
    res.json({ success: true, data: config });
  } catch (e) {
    console.error('[system] config/get错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/config/set', (req, res) => {
  try {
    const { key, value, type, description, category, operatorId } = req.body;
    if (!key || value === undefined) return res.status(400).json({ success: false, error: 'key 和 value 必填' });

    const oldConfig = CONFIG_STORE.get(key);
    const config = {
      key,
      value,
      type: type || oldConfig?.type || typeof value,
      description: description || oldConfig?.description || '',
      category: category || oldConfig?.category || 'general',
      updatedAt: new Date().toISOString(),
      createdAt: oldConfig?.createdAt || new Date().toISOString(),
    };
    CONFIG_STORE.set(key, config);

    writeAuditLog({
      id: 'audit_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
      type: 'config_change',
      operatorId: operatorId || 'system',
      key,
      oldValue: oldConfig?.value,
      newValue: value,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data: config, message: '配置已更新' });
  } catch (e) {
    console.error('[system] config/set错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/info', (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      data: {
        ...SYSTEM_CONFIG,
        runtime: {
          uptime: parseFloat(uptime.toFixed(2)),
          uptimeFormatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
          memory: {
            rss: parseFloat((memUsage.rss / 1024 / 1024).toFixed(2)),
            heapUsed: parseFloat((memUsage.heapUsed / 1024 / 1024).toFixed(2)),
            heapTotal: parseFloat((memUsage.heapTotal / 1024 / 1024).toFixed(2)),
          },
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid,
        },
        env: {
          NODE_ENV: process.env.NODE_ENV || 'development',
          PORT: process.env.PORT || 3003,
          AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'not_set',
        },
      },
    });
  } catch (e) {
    console.error('[system] info错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/audit-log', (req, res) => {
  try {
    const { type, operatorId, startDate, endDate, page = 1, pageSize = 50 } = req.query;
    let logs = getAuditLogs();

    if (type) logs = logs.filter(l => l.type === type);
    if (operatorId) logs = logs.filter(l => l.operatorId === operatorId);
    if (startDate) logs = logs.filter(l => l.timestamp >= startDate);
    if (endDate) logs = logs.filter(l => l.timestamp <= endDate + 'T23:59:59.999Z');

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const total = logs.length;
    const paged = logs.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[system] audit-log错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/audit-log', (req, res) => {
  try {
    const { type, operatorId, details, metadata } = req.body;
    if (!type) return res.status(400).json({ success: false, error: 'type 必填' });

    const entry = {
      id: 'audit_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
      type,
      operatorId: operatorId || 'system',
      details: details || '',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    writeAuditLog(entry);
    res.json({ success: true, data: entry });
  } catch (e) {
    console.error('[system] audit-log写入错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/data-stores', (req, res) => {
  try {
    const { ...stores } = require('../models/dataStore');
    const storeStats = {};
    Object.entries(stores).forEach(([name, store]) => {
      if (store && typeof store.size === 'function') {
        storeStats[name] = { size: store.size(), version: store.getVersion ? store.getVersion() : 0 };
      }
    });
    res.json({ success: true, data: storeStats });
  } catch (e) {
    console.error('[system] data-stores错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
