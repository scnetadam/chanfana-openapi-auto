const express = require('express');
const router = express.Router();
const { kolWeightStore, dataSalesOrderStore, KOL_LEVELS } = require('../models/dataStore');

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

function checkUpgradeConditions(userId) {
  const weight = kolWeightStore.get(userId);
  const orders = dataSalesOrderStore.listByKol(userId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSales = orders.filter(o => 
    o.status === 'settled' && new Date(o.settledAt) >= thirtyDaysAgo
  ).length;
  return {
    bronze_to_silver: {
      eligible: weight.level === KOL_LEVELS.BRONZE && recentSales >= 10 && weight.qualityScore >= 60,
      salesRequired: 10,
      qualityRequired: 60,
      currentSales: recentSales,
      currentQuality: weight.qualityScore
    },
    silver_to_gold: {
      eligible: weight.level === KOL_LEVELS.SILVER && recentSales >= 50 && weight.qualityScore >= 75,
      salesRequired: 50,
      qualityRequired: 75,
      currentSales: recentSales,
      currentQuality: weight.qualityScore
    },
    gold_to_platinum: {
      eligible: weight.level === KOL_LEVELS.GOLD && recentSales >= 200 && weight.qualityScore >= 90,
      salesRequired: 200,
      qualityRequired: 90,
      currentSales: recentSales,
      currentQuality: weight.qualityScore
    }
  };
}

router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const weight = kolWeightStore.get(userId);
  res.json({ success: true, weight });
});

router.post('/:userId/upgrade', (req, res) => {
  const { userId } = req.params;
  const conditions = checkUpgradeConditions(userId);
  const canUpgrade = Object.values(conditions).some(c => c.eligible);
  if (!canUpgrade) {
    return res.status(400).json({
      error: '不满足升权条件',
      conditions
    });
  }
  const weight = kolWeightStore.upgrade(userId);
  weight.dynamicWeight = calculateDynamicWeight(userId);
  res.json({
    success: true,
    weight,
    message: `已升级至 ${weight.level} 级别`
  });
});

router.post('/:userId/downgrade', (req, res) => {
  const { userId } = req.params;
  const weight = kolWeightStore.downgrade(userId);
  weight.dynamicWeight = calculateDynamicWeight(userId);
  res.json({
    success: true,
    weight,
    message: `已降级至 ${weight.level} 级别`
  });
});

router.post('/calculate', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: '缺少userId参数' });
  }
  const weight = kolWeightStore.get(userId);
  const dynamicWeight = calculateDynamicWeight(userId);
  weight.dynamicWeight = dynamicWeight;
  res.json({
    success: true,
    weight,
    dynamicWeight
  });
});

router.get('/:userId/upgrade-check', (req, res) => {
  const { userId } = req.params;
  const conditions = checkUpgradeConditions(userId);
  const weight = kolWeightStore.get(userId);
  res.json({
    success: true,
    currentLevel: weight.level,
    conditions,
    canUpgrade: Object.values(conditions).some(c => c.eligible)
  });
});

router.post('/:userId/update-quality', (req, res) => {
  const { userId } = req.params;
  const { qualityScore } = req.body;
  if (qualityScore === undefined || qualityScore < 0 || qualityScore > 100) {
    return res.status(400).json({ error: '品质分数必须在0-100之间' });
  }
  const weight = kolWeightStore.update(userId, { qualityScore });
  weight.dynamicWeight = calculateDynamicWeight(userId);
  res.json({ success: true, weight });
});

router.get('/list/all', (req, res) => {
  const weights = kolWeightStore.listAll();
  res.json({ success: true, weights });
});

module.exports = router;
