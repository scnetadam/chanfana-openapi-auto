const { settlementStore, commissionRecordStore, contractParamStore, kolTrackStore } = require('./models/dataStore');

const DEFAULT_PARAMS = {
  global: {
    single_small_threshold: 800,
    single_large_threshold: 800,
    monthly_small_threshold: 10000,
    monthly_large_threshold: 10000,
    daily_freq_threshold: 5
  }
};

function getParams(scope) {
  const param = contractParamStore.findOne ? contractParamStore.findOne({ scope }) : null;
  if (param) {
    return param;
  }
  return DEFAULT_PARAMS.global;
}

function checkThreshold({ userId, amount, track }) {
  const params = getParams('global');
  const triggered = [];
  const details = {};
  const monthlyAcc = getMonthlyAccumulation(userId);
  const dailyFreq = getDailyFrequency(userId);

  details.amount = amount;
  details.track = track;
  details.monthlyAccumulation = monthlyAcc;
  details.dailyFrequency = dailyFreq;
  details.singleSmallThreshold = params.single_small_threshold;
  details.monthlySmallThreshold = params.monthly_small_threshold;

  let action = 'pass';
  let withholdAmount = 0;

  if (track === 'A') {
    action = 'pass';
    details.processing = 'payroll';
  } else if (track === 'B') {
    if (amount > params.single_large_threshold) {
      action = 'withhold';
      withholdAmount = (amount - 800) * 0.20;
      triggered.push('single_large_exceeded');
      details.withholdBase = amount - 800;
      details.withholdRate = 0.20;
    }
    if (monthlyAcc + amount > params.monthly_large_threshold) {
      if (action !== 'withhold') {
        action = 'withhold';
      }
      const monthlyAbove = (monthlyAcc + amount) - 10000;
      const monthlyWithhold = monthlyAbove * 0.20;
      if (monthlyWithhold > withholdAmount) {
        withholdAmount = monthlyWithhold;
        details.withholdBase = monthlyAbove;
        details.withholdRate = 0.20;
      }
      triggered.push('monthly_large_exceeded');
      details.monthlyAboveThreshold = monthlyAbove;
    }
    if (amount <= params.single_small_threshold && monthlyAcc + amount <= params.monthly_small_threshold) {
      action = 'pass';
      details.batchProcessing = true;
      withholdAmount = 0;
    }
  } else if (track === 'C') {
    action = 'pass';
    details.processing = 'business_wallet';
    details.evidenceChain = 'hash_only';
  }

  if (dailyFreq >= params.daily_freq_threshold) {
    triggered.push('high_freq_alert');
    if (action === 'pass' && track !== 'A') {
      action = 'alert';
    }
  }

  if (triggered.length > 0 && action === 'pass' && track !== 'A' && track !== 'C') {
    action = 'alert';
  }

  details.withholdAmount = withholdAmount;

  return { action, triggered, details };
}

function evaluateKolPayment(userId, amount) {
  const trackRecord = kolTrackStore.findOne ? kolTrackStore.findOne({ userId }) : null;
  const track = trackRecord ? trackRecord.track : 'B';
  const monthlyAcc = getMonthlyAccumulation(userId);
  const thresholdResult = checkThreshold({ userId, amount, track });

  let withholdAmount = thresholdResult.details.withholdAmount || 0;
  let netAmount = amount - withholdAmount;
  let needsInvoice = false;
  let invoiceMode = 'none';

  if (track === 'A') {
    needsInvoice = true;
    invoiceMode = 'employer';
    netAmount = amount;
  } else if (track === 'B') {
    needsInvoice = true;
    invoiceMode = 'platform_batch';
    if (thresholdResult.action === 'withhold') {
      withholdAmount = thresholdResult.details.withholdAmount;
      netAmount = amount - withholdAmount;
    }
  } else if (track === 'C') {
    needsInvoice = false;
    invoiceMode = 'self';
    netAmount = amount;
  }

  return {
    track,
    thresholdResult,
    withholdAmount,
    netAmount,
    needsInvoice,
    invoiceMode
  };
}

function getMonthlyAccumulation(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const records = settlementStore.find ? settlementStore.find(r => {
    if (r.userId !== userId) return false;
    const d = new Date(r.createdAt || r.settlementDate || r.timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
  }) : [];
  return records.reduce((sum, r) => sum + (r.amount || 0), 0);
}

function getDailyFrequency(userId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const records = settlementStore.find ? settlementStore.find(r => {
    if (r.userId !== userId) return false;
    const d = new Date(r.createdAt || r.settlementDate || r.timestamp);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  }) : [];
  return records.length;
}

function triggerAlert(userId, alertType, detail) {
  return {
    alertId: 'ALT_' + Date.now(),
    userId,
    alertType,
    detail,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  getParams,
  checkThreshold,
  evaluateKolPayment,
  getMonthlyAccumulation,
  getDailyFrequency,
  triggerAlert
};
