const { v4: uuid } = require('uuid');
const { invoiceStore, hashStore } = require('./models/dataStore');

function issueInvoice(params) {
  // REAL_API: POST {LEQI_API_BASE}/invoices/issue
  const { issuerId, recipientId, recipientTrack, amount, taxRate, bizRef, bizHash, issueMode } = params;
  const totalAmount = amount;
  const preTaxAmount = amount / (1 + taxRate);
  const taxAmount = amount * taxRate / (1 + taxRate);
  const invoiceNo = 'DJP' + Date.now() + uuid().slice(0, 4);
  const leqiRef = 'LQ' + uuid().slice(0, 8);
  const invoiceId = 'INV_' + uuid().slice(0, 12);

  const record = {
    invoiceId,
    invoiceNo,
    leqiRef,
    issuerId,
    recipientId,
    recipientTrack,
    amount,
    taxRate,
    totalAmount,
    preTaxAmount,
    taxAmount,
    bizRef,
    bizHash,
    issueMode: issueMode || 'auto',
    status: 'issued',
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (invoiceStore.insert) {
    invoiceStore.insert(record);
  } else if (invoiceStore.push) {
    invoiceStore.push(record);
  }

  return record;
}

function batchIssueInvoice(items) {
  // REAL_API: POST {LEQI_API_BASE}/invoices/batch-issue
  const invoices = items.map(item => issueInvoice(item));
  return { count: invoices.length, invoices };
}

function deliverInvoice(invoiceId, recipientId) {
  // REAL_API: POST {LEQI_API_BASE}/invoices/{invoiceId}/deliver
  const invoice = invoiceStore.findOne ? invoiceStore.findOne({ invoiceId }) : null;
  if (!invoice) return null;
  const updated = Object.assign({}, invoice, {
    status: 'delivered',
    deliveredTo: recipientId,
    deliveredAt: new Date().toISOString()
  });
  if (invoiceStore.update) {
    invoiceStore.update({ invoiceId }, updated);
  }
  return updated;
}

function queryInvoice(invoiceNo) {
  // REAL_API: GET {LEQI_API_BASE}/invoices/{invoiceNo}
  const invoice = invoiceStore.findOne ? invoiceStore.findOne({ invoiceNo }) : null;
  return invoice;
}

function listInvoices(filter) {
  const { issuerId, recipientId, recipientTrack, status, page, pageSize } = filter;
  const p = page || 1;
  const ps = pageSize || 20;
  const allInvoices = invoiceStore.find ? invoiceStore.find(() => true) : (Array.isArray(invoiceStore) ? invoiceStore : []);

  let filtered = allInvoices;
  if (issuerId) filtered = filtered.filter(i => i.issuerId === issuerId);
  if (recipientId) filtered = filtered.filter(i => i.recipientId === recipientId);
  if (recipientTrack) filtered = filtered.filter(i => i.recipientTrack === recipientTrack);
  if (status) filtered = filtered.filter(i => i.status === status);

  const total = filtered.length;
  const start = (p - 1) * ps;
  const records = filtered.slice(start, start + ps);

  return { total, page: p, pageSize: ps, records };
}

function verifyInvoice(invoiceId, ecnyFlowId, bizHash) {
  // REAL_API: POST {LEQI_API_BASE}/invoices/{invoiceId}/verify
  const invoice = invoiceStore.findOne ? invoiceStore.findOne({ invoiceId }) : null;
  if (!invoice) return { verified: false, amountMatch: false, hashMatch: false, flowMatch: false };

  const hash = hashStore.findOne ? hashStore.findOne({ hash: bizHash }) : null;
  const hashMatch = hash && invoice.bizHash === bizHash;
  const flowMatch = invoice.ecnyFlowId === ecnyFlowId;
  const amountMatch = hash ? Math.abs(invoice.totalAmount - hash.amount) < 0.01 : true;

  return {
    verified: hashMatch && flowMatch && amountMatch,
    amountMatch,
    hashMatch,
    flowMatch
  };
}

function getMonthlySummary(recipientId, period) {
  const allInvoices = invoiceStore.find ? invoiceStore.find(i => i.recipientId === recipientId) : [];
  const filtered = allInvoices.filter(i => {
    const d = new Date(i.issuedAt || i.createdAt);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    return key === period;
  });

  let totalAmount = 0;
  let totalTax = 0;
  const byTrack = { A: { amount: 0, tax: 0, count: 0 }, B: { amount: 0, tax: 0, count: 0 }, C: { amount: 0, tax: 0, count: 0 } };

  filtered.forEach(i => {
    totalAmount += i.totalAmount || 0;
    totalTax += i.taxAmount || 0;
    const t = i.recipientTrack || 'B';
    if (byTrack[t]) {
      byTrack[t].amount += i.totalAmount || 0;
      byTrack[t].tax += i.taxAmount || 0;
      byTrack[t].count++;
    }
  });

  return { totalAmount, totalTax, count: filtered.length, byTrack };
}

module.exports = {
  issueInvoice,
  batchIssueInvoice,
  deliverInvoice,
  queryInvoice,
  listInvoices,
  verifyInvoice,
  getMonthlySummary
};
