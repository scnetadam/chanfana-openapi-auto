const { v4: uuid } = require('uuid');
const { taxReportStore, settlementStore, commissionRecordStore, complianceCheckStore } = require('./models/dataStore');

function penetrationQuery(creditCode, period) {
  // REAL_API: POST {JINSHUI4_API_BASE}/query/penetration
  return {
    creditCode,
    period,
    incomeReport: {
      totalRevenue: 0,
      kolPayments: 0,
      commissionPaid: 0
    },
    taxFiling: {
      filed: false,
      amount: 0,
      status: 'pending'
    },
    riskScore: 0.85,
    complianceLevel: 'B',
    dataSharing: {
      bankFlowVerified: false,
      platformDataConsistent: false,
      invoiceMatched: false
    }
  };
}

function dataShare(userId, dataType) {
  // REAL_API: POST {JINSHUI4_API_BASE}/data/share
  return {
    shared: true,
    dataTypes: ['income', 'tax', 'invoice'],
    timestamp: new Date().toISOString()
  };
}

function complianceCheck(companyId) {
  // REAL_API: POST {JINSHUI4_API_BASE}/compliance/check
  const checks = complianceCheckStore.find ? complianceCheckStore.find(() => true) : (Array.isArray(complianceCheckStore) ? complianceCheckStore : []);
  const matched = checks.filter(c => c.matchStatus === 'matched').length;
  const total = checks.length;
  const threeFlowMatchRate = total > 0 ? matched / total : 0;
  const recentViolations = checks
    .filter(c => c.matchStatus === 'mismatch')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  let overallScore = threeFlowMatchRate * 100;
  let recommendation = 'normal';
  if (overallScore < 60) {
    recommendation = 'investigate';
  } else if (overallScore < 80) {
    recommendation = 'review';
  }

  return {
    companyId,
    overallScore,
    threeFlowMatchRate,
    recentViolations,
    recommendation
  };
}

function generateReport(period) {
  const settlements = settlementStore.find ? settlementStore.find(() => true) : (Array.isArray(settlementStore) ? settlementStore : []);
  const periodSettlements = settlements.filter(s => {
    const d = new Date(s.createdAt || s.settlementDate || s.timestamp);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return key === period;
  });

  const totalAmount = periodSettlements.reduce((sum, s) => sum + (s.amount || 0), 0);
  const taxableAmount = totalAmount * 0.80;
  const taxAmount = taxableAmount * 0.20;
  const withholdingCount = periodSettlements.length;

  const reportId = 'RPT_' + uuid().slice(0, 12);
  const record = {
    reportId,
    period,
    totalAmount,
    taxableAmount,
    taxAmount,
    withholdingCount,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  if (taxReportStore.insert) {
    taxReportStore.insert(record);
  } else if (taxReportStore.push) {
    taxReportStore.push(record);
  }

  return record;
}

function submitReport(reportId) {
  // REAL_API: POST {JINSHUI4_API_BASE}/reports/submit
  const report = taxReportStore.findOne ? taxReportStore.findOne({ reportId }) : null;
  if (!report) return null;
  const updated = Object.assign({}, report, {
    status: 'submitted',
    jinshui4Ref: 'JS4_' + uuid().slice(0, 8),
    submittedAt: new Date().toISOString()
  });
  if (taxReportStore.update) {
    taxReportStore.update({ reportId }, updated);
  }
  return updated;
}

module.exports = {
  penetrationQuery,
  dataShare,
  complianceCheck,
  generateReport,
  submitReport
};
