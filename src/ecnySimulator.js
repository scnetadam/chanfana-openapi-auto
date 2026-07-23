const { v4: uuid } = require('uuid');
const { ecnyFlowStore, tipsAgreementStore } = require('./models/dataStore');

function createWallet(walletType, ownerId) {
  // REAL_API: POST {ECNY_API_BASE}/wallets/create
  const walletId = 'W_' + uuid().slice(0, 12);
  const wallet = {
    walletId,
    address: 'ecny_' + uuid().slice(0, 12),
    type: walletType,
    balance: 0,
    ownerId,
    createdAt: new Date().toISOString()
  };
  return wallet;
}

function rechargeUmbrellaTop(walletId, amount) {
  // REAL_API: POST {ECNY_API_BASE}/wallets/recharge
  const flowId = 'EF_' + uuid().slice(0, 12);
  const flow = {
    flowId,
    walletId,
    direction: 'in',
    amount,
    bizType: 'recharge',
    status: 'completed',
    hashProof: '',
    createdAt: new Date().toISOString()
  };
  if (ecnyFlowStore.insert) {
    ecnyFlowStore.insert(flow);
  } else if (ecnyFlowStore.push) {
    ecnyFlowStore.push(flow);
  }
  const currentBalance = getWalletBalance(walletId);
  const newBalance = currentBalance + amount;
  return { flowId, walletId, newBalance };
}

function umbrellaSplit(parentTradeNo, totalAmount, splits) {
  // REAL_API: POST {ECNY_API_BASE}/umbrella/split
  const batchNo = 'US_' + uuid().slice(0, 8);
  const flowRecords = splits.map(split => {
    const flowId = 'EF_' + uuid().slice(0, 12);
    const flow = {
      flowId,
      parentTradeNo,
      batchNo,
      direction: 'out',
      amount: split.amount,
      partyId: split.partyId,
      partyType: split.partyType,
      walletAddress: split.walletAddress,
      bizType: split.partyType || 'split',
      status: 'completed',
      hashProof: '',
      createdAt: new Date().toISOString()
    };
    if (ecnyFlowStore.insert) {
      ecnyFlowStore.insert(flow);
    } else if (ecnyFlowStore.push) {
      ecnyFlowStore.push(flow);
    }
    return flow;
  });
  return { batchNo, flowRecords };
}

function queryFlow(flowId) {
  // REAL_API: GET {ECNY_API_BASE}/flows/{flowId}
  const flow = ecnyFlowStore.findOne ? ecnyFlowStore.findOne({ flowId }) : null;
  return flow;
}

function queryFlows(filter) {
  const { walletId, direction, bizType, status, page, pageSize } = filter;
  const p = page || 1;
  const ps = pageSize || 20;
  const allFlows = ecnyFlowStore.find ? ecnyFlowStore.find(() => true) : (Array.isArray(ecnyFlowStore) ? ecnyFlowStore : []);

  let filtered = allFlows;
  if (walletId) filtered = filtered.filter(f => f.walletId === walletId);
  if (direction) filtered = filtered.filter(f => f.direction === direction);
  if (bizType) filtered = filtered.filter(f => f.bizType === bizType);
  if (status) filtered = filtered.filter(f => f.status === status);

  const total = filtered.length;
  const start = (p - 1) * ps;
  const records = filtered.slice(start, start + ps);

  return { total, page: p, pageSize: ps, records };
}

function verifyFlowHash(flowId) {
  // REAL_API: GET {ECNY_API_BASE}/flows/{flowId}/verify
  const flow = ecnyFlowStore.findOne ? ecnyFlowStore.findOne({ flowId }) : null;
  if (!flow) return { verified: false, computedHash: null, storedHash: null };

  const flowData = JSON.stringify({
    flowId: flow.flowId,
    walletId: flow.walletId,
    direction: flow.direction,
    amount: flow.amount,
    bizType: flow.bizType,
    createdAt: flow.createdAt
  });

  const crypto = require('crypto');
  const computedHash = crypto.createHash('sha256').update(flowData).digest('hex');
  const storedHash = flow.hashProof || computedHash;
  const verified = computedHash === storedHash;

  return { verified, computedHash, storedHash };
}

function bindTaxAccount(walletId, tipsAgreementId) {
  // REAL_API: POST {ECNY_API_BASE}/wallets/{walletId}/bind-tax
  const agreement = tipsAgreementStore.findOne ? tipsAgreementStore.findOne({ agreementId: tipsAgreementId }) : null;
  return {
    walletId,
    tipsAgreementId,
    bound: true,
    bankAccount: agreement ? agreement.bankAccount : null,
    boundAt: new Date().toISOString()
  };
}

function withholdAndRemit(amount, tipsAgreementId) {
  // REAL_API: POST {ECNY_API_BASE}/withhold
  const flowId = 'EF_' + uuid().slice(0, 12);
  const tipsRef = 'TIPS_' + uuid().slice(0, 8);
  const flow = {
    flowId,
    direction: 'out',
    amount,
    bizType: 'tips_withholding',
    tipsAgreementId,
    tipsRef,
    status: 'completed',
    hashProof: '',
    createdAt: new Date().toISOString()
  };
  if (ecnyFlowStore.insert) {
    ecnyFlowStore.insert(flow);
  } else if (ecnyFlowStore.push) {
    ecnyFlowStore.push(flow);
  }
  return { flowId, tipsRef };
}

function getWalletBalance(walletId) {
  const allFlows = ecnyFlowStore.find ? ecnyFlowStore.find(f => f.walletId === walletId) : [];
  let balance = 0;
  allFlows.forEach(f => {
    if (f.direction === 'in') balance += (f.amount || 0);
    if (f.direction === 'out') balance -= (f.amount || 0);
  });
  return balance;
}

module.exports = {
  createWallet,
  rechargeUmbrellaTop,
  umbrellaSplit,
  queryFlow,
  queryFlows,
  verifyFlowHash,
  bindTaxAccount,
  withholdAndRemit,
  getWalletBalance
};
