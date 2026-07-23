const express = require('express');
const router = express.Router();
const {
  dataSalesOrderStore,
  budgetAccountStore,
  kolWeightStore,
  walletStore,
  transactionStore,
  DATA_SALES_STATUS,
  DATA_TYPES
} = require('../models/dataStore');

function calculateDynamicWeight(userId) {
  const weight = kolWeightStore.get(userId);
  let dynamicWeight = weight.baseWeight;
  dynamicWeight += Math.log10(weight.salesCount + 1) * 0.1;
  dynamicWeight += (weight.qualityScore / 100) * 0.5;
  const levelBonus = {
    'bronze': 0,
    'silver': 0.2,
    'gold': 0.5,
    'platinum': 1.0
  };
  dynamicWeight += levelBonus[weight.level] || 0;
  return Math.max(1.0, dynamicWeight);
}

function realTimeSettlement(price, kolUserId) {
  const platformFee = price * 0.1;
  const kolEarnings = price * 0.7;
  const proofFee = price * 0.05;
  const bizUsageFee = price * 0.15;
  const kolWeight = kolWeightStore.get(kolUserId);
  const weightBonus = kolEarnings * (kolWeight.dynamicWeight - 1);
  return {
    platformFee,
    kolEarnings: kolEarnings + weightBonus,
    proofFee,
    bizUsageFee,
    totalDistributed: platformFee + kolEarnings + weightBonus + proofFee + bizUsageFee
  };
}

router.post('/create', (req, res) => {
  const { bizUserId, kolUserId, dataType, dataId, price } = req.body;
  if (!bizUserId || !kolUserId || !dataType || !dataId || !price) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  if (!Object.values(DATA_TYPES).includes(dataType)) {
    return res.status(400).json({ error: '无效的数据类型' });
  }
  const order = dataSalesOrderStore.create({
    bizUserId,
    kolUserId,
    dataType,
    dataId,
    price,
    paymentProof: null,
    settlementProof: null,
    hashProof: null
  });
  res.json({ success: true, order });
});

router.post('/:id/pay', (req, res) => {
  const { id } = req.params;
  const { paymentProof } = req.body;
  const order = dataSalesOrderStore.getById(id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  if (order.status !== DATA_SALES_STATUS.PENDING) {
    return res.status(400).json({ error: '订单状态不正确' });
  }
  const budget = budgetAccountStore.getByBizUserId(order.bizUserId);
  if (!budget || budget.remainingBudget < order.price) {
    return res.status(400).json({ error: '预算不足' });
  }
  const deducted = budgetAccountStore.deduct(budget.id, order.price);
  if (!deducted) {
    return res.status(400).json({ error: '预算扣除失败' });
  }
  const updatedOrder = dataSalesOrderStore.update(id, {
    status: DATA_SALES_STATUS.PAID,
    paymentProof
  });
  res.json({ success: true, order: updatedOrder, budget: deducted });
});

router.post('/:id/settle', (req, res) => {
  const { id } = req.params;
  const { settlementProof, hashProof } = req.body;
  const order = dataSalesOrderStore.getById(id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  if (order.status !== DATA_SALES_STATUS.PAID) {
    return res.status(400).json({ error: '订单未支付' });
  }
  const settlement = realTimeSettlement(order.price, order.kolUserId);
  const kolWallet = walletStore.getOrCreate(order.kolUserId);
  kolWallet.balance += settlement.kolEarnings;
  transactionStore.create({
    userId: order.kolUserId,
    type: 'data_sales_income',
    amount: settlement.kolEarnings,
    description: `数据销售收益 - 订单${id}`,
    orderId: id
  });
  kolWeightStore.incrementSales(order.kolUserId);
  const weight = kolWeightStore.get(order.kolUserId);
  weight.dynamicWeight = calculateDynamicWeight(order.kolUserId);
  const updatedOrder = dataSalesOrderStore.update(id, {
    status: DATA_SALES_STATUS.SETTLED,
    settlementProof,
    hashProof,
    settledAt: new Date().toISOString()
  });
  res.json({
    success: true,
    order: updatedOrder,
    settlement,
    newWeight: weight
  });
});

router.get('/biz/list', (req, res) => {
  const { bizUserId } = req.query;
  if (!bizUserId) {
    return res.status(400).json({ error: '缺少bizUserId参数' });
  }
  const orders = dataSalesOrderStore.listByBiz(bizUserId);
  res.json({ success: true, orders });
});

router.get('/kol/list', (req, res) => {
  const { kolUserId } = req.query;
  if (!kolUserId) {
    return res.status(400).json({ error: '缺少kolUserId参数' });
  }
  const orders = dataSalesOrderStore.listByKol(kolUserId);
  res.json({ success: true, orders });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const order = dataSalesOrderStore.getById(id);
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  res.json({ success: true, order });
});

module.exports = router;
