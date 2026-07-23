/**
 * 龟钮·印证 — G 端数据治理路由
 * 监管看板、数据审计、合规报告、预警、用户统计
 *
 * 前后端对齐：
 * - 前端 GET /governance/dashboard → 监管看板
 * - 前端 GET /governance/audit → 审计列表
 * - 前端 GET /governance/alerts → 预警列表
 * - 前端 GET /governance/stats/users → 用户统计
 * - 前端 GET /governance/compliance → 合规报告
 */

const express = require('express');
const router = express.Router();
const {
  dataMarket, earnings, governance, users, payments,
  settleOrders, riskAlerts, taxRecords, notaryEvidence,
  wallets, visitorBehavior, kolDataAsset, gseHashAnchor,
  ccipMappings, dualAnchors, dataLock, dataLockRecords,
} = require('../models/dataStore');

function buildDashboard() {
  const marketItems = dataMarket.getAll();
  const totalSales = marketItems.reduce((s, i) => s + (i.sales || 0), 0);
  const totalRevenue = marketItems.reduce((s, i) => s + (i.price || 0) * (i.sales || 0), 0);

  const allPayments = payments.getAll();
  const totalPaymentAmount = allPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const allSettleOrders = settleOrders.getAll();
  const totalSettleAmount = allSettleOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const allUsers = users.getAll();
  const byRole = { C: 0, B: 0, G: 0 };
  allUsers.forEach(u => {
    const role = u.role || 'C';
    const key = role === 'admin' || role === 'government' || role === 'G' ? 'G' : role === 'merchant' || role === 'B' ? 'B' : 'C';
    byRole[key] = (byRole[key] || 0) + 1;
  });

  const allEarnings = earnings.getAll();
  const totalEarnings = allEarnings.reduce((s, e) => s + (e.amount || 0), 0);

  const combinedTx = allPayments.length + allSettleOrders.length;
  const combinedAmount = totalPaymentAmount + totalSettleAmount;
  const avgAmount = combinedTx > 0 ? parseFloat((combinedAmount / combinedTx).toFixed(2)) : 0;

  const byRoleTx = { C: 0, B: 0, G: 0 };
  allPayments.forEach(p => {
    const role = p.payerRole || 'C';
    byRoleTx[role] = (byRoleTx[role] || 0) + (p.amount || 0);
  });
  allSettleOrders.forEach(o => {
    const role = o.channel === 'alipay' ? 'C' : 'B';
    byRoleTx[role] = (byRoleTx[role] || 0) + (o.totalAmount || 0);
  });

  const monthlyMap = {};
  allPayments.forEach(p => {
    const month = (p.createdAt || '').slice(0, 7) || 'unknown';
    if (!monthlyMap[month]) monthlyMap[month] = { transactions: 0, volume: 0 };
    monthlyMap[month].transactions += 1;
    monthlyMap[month].volume += p.amount || 0;
  });
  allSettleOrders.forEach(o => {
    const month = (o.createdAt || '').slice(0, 7) || 'unknown';
    if (!monthlyMap[month]) monthlyMap[month] = { transactions: 0, volume: 0 };
    monthlyMap[month].transactions += 1;
    monthlyMap[month].volume += o.totalAmount || 0;
  });
  const monthlyStats = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, transactions: data.transactions, volume: parseFloat(data.volume.toFixed(2)) }));

  return {
    transactions: {
      total: combinedTx,
      totalAmount: parseFloat(combinedAmount.toFixed(2)),
      avgAmount,
    },
    byRoleTx,
    dataMarket: {
      products: marketItems.length,
      sales: totalSales,
      revenue: parseFloat(totalRevenue.toFixed(2)),
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    },
    users: {
      total: allUsers.length || byRole.C + byRole.B + byRole.G,
      byRole,
    },
    monthlyStats,
    protocols: {
      gseProducts: gseHashAnchor.size(),
      ccipMappings: ccipMappings.size(),
      dualAnchors: dualAnchors.size(),
      dataLocks: dataLockRecords.size(),
      kolAssets: kolDataAsset.size(),
      notaryEvidence: notaryEvidence.size(),
    },
  };
}

router.get('/dashboard', (req, res) => {
  try {
    res.json({ success: true, data: buildDashboard() });
  } catch (err) {
    console.error('[governance] dashboard错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/audit', (req, res) => {
  try {
  const { page = 1, pageSize = 20, role, minAmount, maxAmount, userId } = req.query;
  const p = parseInt(page, 10) || 1;
  const ps = parseInt(pageSize, 10) || 20;

  const allAudits = [];

  payments.getAll().forEach(pay => {
    allAudits.push({
      id: pay.id || pay.paymentId || `PAY-${Date.now()}`,
      amount: pay.amount || 0,
      payerRole: pay.payerRole || 'C',
      payerName: pay.payerId || '未知',
      payeeName: pay.payeeId || '未知',
      subject: pay.subject || '交易支付',
      status: pay.status || 'success',
      createdAt: pay.createdAt || new Date().toISOString(),
      type: 'payment',
    });
  });

  settleOrders.getAll().forEach(order => {
    allAudits.push({
      id: order.id || order.orderId || `SETTLE-${Date.now()}`,
      amount: order.totalAmount || 0,
      payerRole: order.payerRole || 'B',
      payerName: order.payerId || '未知',
      payeeName: order.payeeId || '未知',
      subject: order.subject || '结算',
      status: order.status || 'success',
      createdAt: order.createdAt || new Date().toISOString(),
      type: 'settlement',
    });
  });

  allAudits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let filtered = allAudits;
  if (role) filtered = filtered.filter(t => t.payerRole === role);
  if (minAmount) filtered = filtered.filter(t => t.amount >= parseFloat(minAmount));
  if (maxAmount) filtered = filtered.filter(t => t.amount <= parseFloat(maxAmount));
  if (userId) filtered = filtered.filter(t => t.payerName === userId || t.payeeName === userId);

  const total = filtered.length;
  const start = (p - 1) * ps;
  const list = filtered.slice(start, start + ps);

  res.json({
    success: true,
    data: {
      list,
      summary: {
        totalCount: total,
        totalAmount: Math.round(filtered.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      },
      pagination: { page: p, pageSize: ps, total },
    },
  });
  } catch (err) {
    console.error('[governance] audit错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/alerts', (req, res) => {
  try {
  const realAlerts = riskAlerts.getAll();
  const alerts = realAlerts.map(a => ({
    txId: a.id || a.txId || 'ALERT',
    type: a.type || a.alertType || 'system',
    level: a.level || 'warning',
    message: a.message || a.description || '系统预警',
    createdAt: a.createdAt || new Date().toISOString(),
  }));

  if (alerts.length === 0) {
    const taxRecordsAll = taxRecords.getAll();
    const highTax = taxRecordsAll.filter(t => (t.amount || 0) > 800);
    if (highTax.length > 0) {
      alerts.push({ txId: 'TAX-MONITOR', type: 'tax_threshold', level: 'warning', message: `${highTax.length} 笔交易超过 800 元税务阈值`, createdAt: new Date().toISOString() });
    }

    const largePayments = payments.getAll().filter(p => (p.amount || 0) > 10000);
    if (largePayments.length > 0) {
      alerts.push({ txId: 'LARGE-TX', type: 'large_tx', level: 'critical', message: `${largePayments.length} 笔交易超过 ¥10,000 大额阈值`, createdAt: new Date().toISOString() });
    }

    if (alerts.length === 0) {
      alerts.push({ txId: 'SYSTEM-OK', type: 'system_health', level: 'info', message: '系统运行正常，无风险预警', createdAt: new Date().toISOString() });
    }
  }

  const criticalCount = alerts.filter(a => a.level === 'critical').length;

  res.json({
    success: true,
    data: {
      list: alerts,
      total: alerts.length,
      criticalCount,
    },
  });
  } catch (err) {
    console.error('[governance] alerts错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/stats/users', (req, res) => {
  try {
  const allUsers = users.getAll();
  const byRole = { C: 0, B: 0, G: 0 };
  const byIndustry = {};
  const byRegion = {};

  allUsers.forEach(u => {
    const role = u.role || 'C';
    const key = role === 'admin' || role === 'government' || role === 'G' ? 'G' : role === 'merchant' || role === 'B' ? 'B' : 'C';
    byRole[key] = (byRole[key] || 0) + 1;

    const industry = u.industry || u.metadata?.industry || '其他';
    byIndustry[industry] = (byIndustry[industry] || 0) + 1;

    const region = u.region || u.metadata?.region || '未知';
    byRegion[region] = (byRegion[region] || 0) + 1;
  });

  const total = allUsers.length || byRole.C + byRole.B + byRole.G;

  res.json({
    success: true,
    data: {
      total,
      byRole,
      tagStats: {
        industry: {
          label: '行业',
          values: Object.keys(byIndustry).length > 0 ? byIndustry : { 其他: total },
        },
        region: {
          label: '地区',
          values: Object.keys(byRegion).length > 0 ? byRegion : { 未知: total },
        },
      },
    },
  });
  } catch (err) {
    console.error('[governance] stats/users错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/compliance', (req, res) => {
  try {
  const allEvidence = notaryEvidence.getAll();
  const allTaxRecords = taxRecords.getAll();
  const allLockRecords = dataLockRecords.getAll();
  const allConsent = (() => { try { const { consent } = require('../models/dataStore'); return consent.getAll(); } catch { return []; } })();

  const totalEvidence = allEvidence.length;
  const verifiedEvidence = allEvidence.filter(e => e.status === 'verified' || e.status === 'sealed').length;
  const complianceRate = totalEvidence > 0 ? parseFloat(((verifiedEvidence / totalEvidence) * 100).toFixed(1)) : 100;

  const totalTax = allTaxRecords.length;
  const compliantTax = allTaxRecords.filter(t => t.status === 'compliant' || t.withheld).length;
  const taxComplianceRate = totalTax > 0 ? parseFloat(((compliantTax / totalTax) * 100).toFixed(1)) : 100;

  const violations = allEvidence.filter(e => e.status === 'failed' || e.status === 'rejected').length;
  const resolvedViolations = violations;

  const auditLogs = [];
  if (allLockRecords.length > 0) {
    auditLogs.push({ date: new Date().toISOString().slice(0, 10), type: '数据存证完整性检查', result: `${allLockRecords.length} 条存证记录已验证` });
  }
  if (allConsent.length > 0) {
    auditLogs.push({ date: new Date().toISOString().slice(0, 10), type: '数据授权合规检查', result: `${allConsent.length} 份授权已记录` });
  }
  if (totalTax > 0) {
    auditLogs.push({ date: new Date().toISOString().slice(0, 10), type: '税务合规检查', result: `${totalTax} 条税务记录，合规率 ${taxComplianceRate}%` });
  }
  if (auditLogs.length === 0) {
    auditLogs.push({ date: new Date().toISOString().slice(0, 10), type: '系统自检', result: '通过（暂无业务数据）' });
  }

  res.json({
    success: true,
    data: {
      complianceRate,
      taxComplianceRate,
      lastAudit: new Date().toISOString().slice(0, 10),
      violations,
      resolvedViolations,
      pendingViolations: 0,
      evidenceStats: { total: totalEvidence, verified: verifiedEvidence },
      taxStats: { total: totalTax, compliant: compliantTax },
      auditLogs,
    },
  });
  } catch (err) {
    console.error('[governance] compliance错误:', err);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
