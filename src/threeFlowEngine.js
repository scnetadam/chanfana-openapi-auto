const { hashStore, ecnyFlowStore, invoiceStore, complianceCheckStore, settlementStore } = require('./models/dataStore');

function verifyThreeFlows(bizRef) {
  const mismatches = [];

  const biz = hashStore.findOne ? hashStore.findOne({ bizRef }) : null;
  const flow = ecnyFlowStore.findOne ? ecnyFlowStore.findOne({ bizRef }) : null;
  const invoice = invoiceStore.findOne ? invoiceStore.findOne({ bizRef }) : null;

  const details = { biz, flow, invoice, mismatches };

  if (!biz || !flow || !invoice) {
    const missing = [];
    if (!biz) missing.push('business_hash');
    if (!flow) missing.push('ecny_flow');
    if (!invoice) missing.push('invoice');
    mismatches.push('missing_records: ' + missing.join(','));
    return { matchStatus: 'mismatch', details };
  }

  const bizAmount = biz.amount || 0;
  const flowAmount = flow.amount || 0;
  const invoiceTotalAmount = invoice.totalAmount || 0;

  if (Math.abs(bizAmount - flowAmount) > 0.01) {
    mismatches.push('amount_mismatch_biz_flow');
  }
  if (Math.abs(bizAmount - invoiceTotalAmount) > 0.01) {
    mismatches.push('amount_mismatch_biz_invoice');
  }
  if (Math.abs(flowAmount - invoiceTotalAmount) > 0.01) {
    mismatches.push('amount_mismatch_flow_invoice');
  }

  const bizUserId = biz.userId;
  const flowUserId = flow.userId;
  const invoiceUserId = invoice.recipientId || invoice.userId;

  if (bizUserId !== flowUserId) {
    mismatches.push('identity_mismatch_biz_flow');
  }
  if (bizUserId !== invoiceUserId) {
    mismatches.push('identity_mismatch_biz_invoice');
  }

  const bizTime = new Date(biz.createdAt || biz.timestamp);
  const flowTime = new Date(flow.createdAt || flow.timestamp);
  const invoiceTime = new Date(invoice.createdAt || invoice.issuedAt);

  const flowDiffMs = Math.abs(flowTime - bizTime);
  if (flowDiffMs > 24 * 60 * 60 * 1000) {
    mismatches.push('flow_timing_exceeded_24h');
  }

  const invoiceDiffMs = Math.abs(invoiceTime - bizTime);
  if (invoiceDiffMs > 48 * 60 * 60 * 1000) {
    mismatches.push('invoice_timing_exceeded_48h');
  }

  let matchStatus = 'matched';
  if (mismatches.length > 0) {
    matchStatus = mismatches.length >= 3 ? 'mismatch' : 'partial';
  }

  return { matchStatus, details };
}

function createComplianceCheck(bizRef) {
  const result = verifyThreeFlows(bizRef);
  const record = {
    checkId: 'CC_' + Date.now(),
    bizRef,
    matchStatus: result.matchStatus,
    details: result.details,
    createdAt: new Date().toISOString()
  };
  if (complianceCheckStore.insert) {
    complianceCheckStore.insert(record);
  } else if (complianceCheckStore.push) {
    complianceCheckStore.push(record);
  }
  return record;
}

function getComplianceDashboard(filter) {
  const records = complianceCheckStore.find ? complianceCheckStore.find(() => true) : (Array.isArray(complianceCheckStore) ? complianceCheckStore : []);
  const totalChecks = records.length;
  const matched = records.filter(r => r.matchStatus === 'matched').length;
  const mismatched = records.filter(r => r.matchStatus === 'mismatch').length;
  const partial = records.filter(r => r.matchStatus === 'partial').length;
  const matchRate = totalChecks > 0 ? matched / totalChecks : 0;
  const mismatchRate = totalChecks > 0 ? mismatched / totalChecks : 0;
  const partialRate = totalChecks > 0 ? partial / totalChecks : 0;

  const recentMismatches = records
    .filter(r => r.matchStatus === 'mismatch')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const monthMap = {};
  records.forEach(r => {
    const d = new Date(r.createdAt);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!monthMap[key]) monthMap[key] = { matched: 0, mismatched: 0, partial: 0 };
    if (r.matchStatus === 'matched') monthMap[key].matched++;
    else if (r.matchStatus === 'mismatch') monthMap[key].mismatched++;
    else monthMap[key].partial++;
  });

  const monthlyTrend = Object.entries(monthMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, counts]) => ({ period, ...counts }));

  return { totalChecks, matchRate, mismatchRate, partialRate, recentMismatches, monthlyTrend };
}

function linkBizToFlow(bizHash, ecnyFlowId) {
  const flow = ecnyFlowStore.findOne ? ecnyFlowStore.findOne({ flowId: ecnyFlowId }) : null;
  if (flow && ecnyFlowStore.update) {
    ecnyFlowStore.update({ flowId: ecnyFlowId }, { bizRef: bizHash });
  }
  const hash = hashStore.findOne ? hashStore.findOne({ hash: bizHash }) : null;
  if (hash && hashStore.update) {
    hashStore.update({ hash: bizHash }, { ecnyFlowId });
  }
  return { bizHash, ecnyFlowId, linked: true };
}

function linkFlowToInvoice(ecnyFlowId, invoiceId) {
  const invoice = invoiceStore.findOne ? invoiceStore.findOne({ invoiceId }) : null;
  if (invoice && invoiceStore.update) {
    invoiceStore.update({ invoiceId }, { ecnyFlowId });
  }
  return { ecnyFlowId, invoiceId, linked: true };
}

function autoVerifyOnSettlement(settlementId) {
  const settlement = settlementStore.findOne ? settlementStore.findOne({ settlementId }) : null;
  if (!settlement) {
    return { matchStatus: 'mismatch', details: { mismatches: ['settlement_not_found'] } };
  }
  const bizRef = settlement.bizRef || settlement.settlementId;
  const result = verifyThreeFlows(bizRef);
  const check = createComplianceCheck(bizRef);
  return check;
}

module.exports = {
  verifyThreeFlows,
  createComplianceCheck,
  getComplianceDashboard,
  linkBizToFlow,
  linkFlowToInvoice,
  autoVerifyOnSettlement
};
