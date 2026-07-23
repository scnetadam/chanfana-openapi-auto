const express = require('express');
const router = express.Router();
const {
  employmentContractStore,
  dataSalesOrderStore,
  budgetAccountStore,
  DATA_SALES_STATUS,
  EMPLOYMENT_STATUS
} = require('../models/dataStore');

router.post('/create', (req, res) => {
  const { bizUserId, kolUserId, contractType, startDate, endDate, terms } = req.body;
  if (!bizUserId || !kolUserId || !startDate || !endDate) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  const contract = employmentContractStore.create({
    bizUserId,
    kolUserId,
    contractType: contractType || 'non-exclusive',
    startDate,
    endDate,
    terms: terms || ''
  });
  res.json({ success: true, contract });
});

router.post('/:id/verify', (req, res) => {
  const { id } = req.params;
  const { proof } = req.body;
  if (!proof) {
    return res.status(400).json({ error: '缺少验证凭证' });
  }
  const contract = employmentContractStore.verify(id, proof);
  if (!contract) {
    return res.status(404).json({ error: '雇佣合同不存在' });
  }
  res.json({ success: true, contract });
});

router.get('/biz/list', (req, res) => {
  const { bizUserId } = req.query;
  if (!bizUserId) {
    return res.status(400).json({ error: '缺少bizUserId参数' });
  }
  const contracts = employmentContractStore.listByBiz(bizUserId);
  res.json({ success: true, contracts });
});

router.get('/kol/list', (req, res) => {
  const { kolUserId } = req.query;
  if (!kolUserId) {
    return res.status(400).json({ error: '缺少kolUserId参数' });
  }
  const contracts = employmentContractStore.listByKol(kolUserId);
  res.json({ success: true, contracts });
});

router.post('/:id/settle-others', (req, res) => {
  const { id } = req.params;
  const { otherUserId, amount, dataId } = req.body;
  const contract = employmentContractStore.getById(id);
  if (!contract) {
    return res.status(404).json({ error: '雇佣合同不存在' });
  }
  if (contract.status !== EMPLOYMENT_STATUS.ACTIVE) {
    return res.status(400).json({ error: '合同状态不正确' });
  }
  if (!contract.verifiedAt) {
    return res.status(400).json({ error: '合同未验证' });
  }
  const order = dataSalesOrderStore.create({
    bizUserId: contract.bizUserId,
    kolUserId: otherUserId,
    dataType: 'engagement',
    dataId,
    price: amount,
    paymentProof: null,
    settlementProof: null,
    hashProof: null
  });
  const budget = budgetAccountStore.getByBizUserId(contract.bizUserId);
  if (!budget || budget.remainingBudget < amount) {
    return res.status(400).json({ error: '预算不足' });
  }
  budgetAccountStore.deduct(budget.id, amount);
  dataSalesOrderStore.update(order.id, {
    status: DATA_SALES_STATUS.PAID,
    paymentProof: `employment_${id}`
  });
  res.json({
    success: true,
    message: '其他用户数据已结算',
    order,
    contract
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const contract = employmentContractStore.getById(id);
  if (!contract) {
    return res.status(404).json({ error: '雇佣合同不存在' });
  }
  res.json({ success: true, contract });
});

router.post('/:id/terminate', (req, res) => {
  const { id } = req.params;
  const contract = employmentContractStore.update(id, {
    status: EMPLOYMENT_STATUS.TERMINATED
  });
  if (!contract) {
    return res.status(404).json({ error: '雇佣合同不存在' });
  }
  res.json({ success: true, contract });
});

module.exports = router;
