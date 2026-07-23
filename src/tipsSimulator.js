const { v4: uuid } = require('uuid');
const { tipsAgreementStore } = require('./models/dataStore');

function signAgreement(userId, bankAccount, bankName, taxBureauCode) {
  // REAL_API: POST {TIPS_API_BASE}/agreements/sign
  const agreementId = 'TIPS_' + uuid().slice(0, 8);
  const record = {
    agreementId,
    userId,
    bankAccount,
    bankName,
    taxBureauCode,
    status: 'active',
    signedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  if (tipsAgreementStore.insert) {
    tipsAgreementStore.insert(record);
  } else if (tipsAgreementStore.push) {
    tipsAgreementStore.push(record);
  }
  return record;
}

function queryAgreement(agreementId) {
  // REAL_API: GET {TIPS_API_BASE}/agreements/{agreementId}
  const agreement = tipsAgreementStore.findOne ? tipsAgreementStore.findOne({ agreementId }) : null;
  return agreement;
}

function autoDeduct(agreementId, amount, taxType) {
  // REAL_API: POST {TIPS_API_BASE}/deduct
  const deductRef = 'TD_' + uuid().slice(0, 8);
  return {
    deductRef,
    agreementId,
    amount,
    taxType,
    status: 'completed',
    timestamp: new Date().toISOString()
  };
}

function suspendAgreement(agreementId, reason) {
  // REAL_API: POST {TIPS_API_BASE}/agreements/{agreementId}/suspend
  const agreement = tipsAgreementStore.findOne ? tipsAgreementStore.findOne({ agreementId }) : null;
  if (!agreement) return null;
  const updated = Object.assign({}, agreement, {
    status: 'suspended',
    suspendReason: reason,
    suspendedAt: new Date().toISOString()
  });
  if (tipsAgreementStore.update) {
    tipsAgreementStore.update({ agreementId }, updated);
  }
  return updated;
}

function reactivateAgreement(agreementId) {
  const agreement = tipsAgreementStore.findOne ? tipsAgreementStore.findOne({ agreementId }) : null;
  if (!agreement) return null;
  const updated = Object.assign({}, agreement, {
    status: 'active',
    reactivatedAt: new Date().toISOString()
  });
  if (tipsAgreementStore.update) {
    tipsAgreementStore.update({ agreementId }, updated);
  }
  return updated;
}

function listAgreements(userId) {
  const agreements = tipsAgreementStore.find ? tipsAgreementStore.find(a => a.userId === userId) : [];
  return agreements;
}

module.exports = {
  signAgreement,
  queryAgreement,
  autoDeduct,
  suspendAgreement,
  reactivateAgreement,
  listAgreements
};
