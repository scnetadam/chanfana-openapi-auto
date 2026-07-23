const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const CONTRACT_FILE = path.join(DATA_DIR, 'kolContracts.json');
const KOL_FILE = path.join(DATA_DIR, 'kol.json');

function readData(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function _verifyContract(merchantId, kolUserId) {
  const contracts = readData(CONTRACT_FILE);
  const activeContracts = contracts.filter(c =>
    c.bMerchantId === merchantId &&
    c.kolUserId === kolUserId &&
    c.status === 'active'
  );

  if (activeContracts.length === 0) {
    return {
      verified: false,
      reason: 'no_active_contract',
      message: 'B端与KOL/KOC无有效雇佣合同，无法按雇佣结算方式处理',
    };
  }

  const contract = activeContracts[0];
  const now = new Date();
  const expiredAt = new Date(contract.expiredAt);

  if (now > expiredAt) {
    return {
      verified: false,
      reason: 'contract_expired',
      message: '雇佣合同已过期',
      contractId: contract.id,
      expiredAt: contract.expiredAt,
    };
  }

  return {
    verified: true,
    contractId: contract.id,
    contractType: contract.contractType,
    commissionRate: contract.commissionRate,
    signedAt: contract.signedAt,
    expiredAt: contract.expiredAt,
  };
}

function _updateKolWeight(kolUserId, salesIncrement, qualityDelta) {
  const kols = readData(KOL_FILE);
  const kol = kols.find(k => k.userId === kolUserId);
  if (!kol) return null;

  const oldWeight = kol.weight;
  kol.salesCount = (kol.salesCount || 0) + (salesIncrement || 0);

  if (qualityDelta !== undefined) {
    kol.dataQuality = Math.max(0.1, Math.min(2.0, (kol.dataQuality || 1.0) + qualityDelta));
  }

  const newSalesFactor = Math.min(1.0, kol.salesCount / 100);
  const newQualityFactor = Math.min(1.0, kol.dataQuality);
  const baseWeight = newSalesFactor * 0.5 + newQualityFactor * 0.5;
  kol.weight = Math.max(0.1, Math.min(10.0, baseWeight * 5));

  if (kol.weight > oldWeight) {
    kol.level = Math.min(11, Math.floor(kol.weight) + 1);
  } else if (kol.weight < oldWeight) {
    kol.level = Math.max(1, Math.floor(kol.weight) + 1);
  }

  kol.weightHistory = kol.weightHistory || [];
  kol.weightHistory.push({
    old: oldWeight,
    new: kol.weight,
    reason: qualityDelta > 0 ? '数据品质提升升权' : qualityDelta < 0 ? '数据品质下降降权' : '销售增量更新',
    at: new Date().toISOString(),
  });

  kol.updatedAt = new Date().toISOString();
  writeData(KOL_FILE, kols);

  return {
    kolUserId,
    oldWeight,
    newWeight: kol.weight,
    level: kol.level,
    salesCount: kol.salesCount,
    dataQuality: kol.dataQuality,
    direction: kol.weight > oldWeight ? 'up' : kol.weight < oldWeight ? 'down' : 'stable',
  };
}

router.post('/verify', (req, res) => {
  try {
    const { merchantId, kolUserId } = req.body;
    if (!merchantId || !kolUserId) {
      return res.status(400).json({ success: false, error: 'merchantId 和 kolUserId 必填' });
    }

    const result = _verifyContract(merchantId, kolUserId);
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[contractVerify] verify错误:', e);
    res.status(500).json({ success: false, error: '合同验证失败' });
  }
});

router.post('/settle-with-contract', (req, res) => {
  try {
    const { merchantId, kolUserId, amount, subject, channel } = req.body;
    if (!merchantId || !kolUserId || !amount) {
      return res.status(400).json({ success: false, error: 'merchantId, kolUserId, amount 必填' });
    }

    const contractResult = _verifyContract(merchantId, kolUserId);
    if (!contractResult.verified) {
      return res.status(400).json({
        success: false,
        data: {
          settled: false,
          reason: 'contract_verification_failed',
          contractCheck: contractResult,
          message: '需先验证雇佣合同，验证通过后按结算方式滚入并分账',
        },
      });
    }

  const settleAmount = parseFloat(amount);
  const commissionRate = contractResult.commissionRate || 0.3;
  const kolShare = parseFloat((settleAmount * commissionRate).toFixed(2));
  const merchantShare = parseFloat((settleAmount - kolShare).toFixed(2));
  const platformFee = parseFloat((settleAmount * 0.10).toFixed(2));
  const taxReserve = parseFloat((settleAmount * 0.06).toFixed(2));

  const weightUpdate = _updateKolWeight(kolUserId, 1, 0);

  const settleRecord = {
    id: 'cts_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
    merchantId,
    kolUserId,
    amount: settleAmount,
    subject: subject || '雇佣合同结算',
    channel: channel || 'alipay',
    contractId: contractResult.contractId,
    contractType: contractResult.contractType,
    commissionRate,
    breakdown: {
      kolShare,
      merchantShare,
      platformFee,
      taxReserve,
    },
    weightUpdate,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  res.json({ success: true, data: settleRecord });
  } catch (e) {
    console.error('[contractVerify] settle-with-contract错误:', e);
    res.status(500).json({ success: false, error: '合同结算失败' });
  }
});

router.post('/kol/adjust-weight', (req, res) => {
  try {
    const { kolUserId, salesIncrement, qualityDelta, reason } = req.body;
    if (!kolUserId) return res.status(400).json({ success: false, error: 'kolUserId 必填' });

    const result = _updateKolWeight(kolUserId, salesIncrement || 0, qualityDelta || 0);
    if (!result) return res.status(404).json({ success: false, error: 'KOL不存在' });

    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[contractVerify] adjust-weight错误:', e);
    res.status(500).json({ success: false, error: '权重调整失败' });
  }
});

router.get('/contracts/check', (req, res) => {
  try {
    const { merchantId, kolUserId } = req.query;
    if (!merchantId || !kolUserId) {
      return res.status(400).json({ success: false, error: 'merchantId 和 kolUserId 必填' });
    }
    const result = _verifyContract(merchantId, kolUserId);
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('[contractVerify] contracts/check错误:', e);
    res.status(500).json({ success: false, error: '合同检查失败' });
  }
});

module.exports = router;
