const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { users, wallets, kycRecords } = require('../models/dataStore');
const { _signJwt } = require('./auth');

const SSO_PROJECTS = ['seal', 'deveco', 'verify', 'guiniu'];
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const KYC_LEVELS = {
  none: {
    level: 'none',
    label: '未认证',
    description: '基础访问权限',
    transactionLimit: { daily: 500, monthly: 5000 },
    channels: ['alipay_simulated'],
    features: ['basic_data_access'],
  },
  basic: {
    level: 'basic',
    label: '基础认证',
    description: '已验证身份，标准限额',
    transactionLimit: { daily: 5000, monthly: 50000 },
    channels: ['alipay', 'wechat', 'alipay_simulated', 'wechat_simulated'],
    features: ['basic_data_access', 'data_purchase', 'earnings_claim'],
  },
  full: {
    level: 'full',
    label: '完全认证',
    description: '完整验证，最高限额，全通道',
    transactionLimit: { daily: 50000, monthly: 500000 },
    channels: ['alipay', 'wechat', 'ecny', 'alipay_simulated', 'wechat_simulated', 'ecny_simulated'],
    features: ['basic_data_access', 'data_purchase', 'earnings_claim', 'ecny_umbrella', 'budget_pool', 'split_contract', 'governance_vote'],
  },
};

function _determineKycLevel(phone, realName, idNumber) {
  if (idNumber && realName && phone) return 'full';
  if (idNumber) return 'basic';
  return 'none';
}

function _calculateComplianceWeight(kycLevel, documentCount) {
  const baseWeights = { none: 0.3, basic: 0.7, full: 1.0 };
  const base = baseWeights[kycLevel] || 0.3;
  const docBonus = Math.min(documentCount * 0.05, 0.2);
  return Math.min(base + docBonus, 1.0);
}

function _assessRisk(documentData, documentType) {
  let score = 0.5;
  if (documentData) score += 0.2;
  if (documentType === 'id_card') score += 0.15;
  if (documentType === 'business_license') score += 0.1;
  if (documentType === 'industry_permit') score += 0.05;
  return { score: Math.min(score, 1.0), level: score >= 0.8 ? 'low' : score >= 0.5 ? 'medium' : 'high' };
}

router.post('/register', (req, res) => {
  try {
    const { phone, realName, idNumber, role, platform } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'phone 必填' });
    }

    const existingUser = users.findOne(u => u.phone === phone);
    if (existingUser) {
      return res.status(409).json({ success: false, error: '该手机号已注册' });
    }

    const userId = `u_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const kycLevel = _determineKycLevel(phone, realName, idNumber);

    const user = {
      id: userId,
      phone,
      realName: realName || null,
      idNumber: idNumber || null,
      openId: `open_${phone.slice(-4)}_${crypto.randomBytes(3).toString('hex')}`,
      nickName: realName ? realName.slice(0, 2) + '**' : '用户',
      avatarUrl: '',
      role: role || 'user',
      platform: platform || 'alipay',
      balance: 0,
      kycLevel,
      complianceWeight: _calculateComplianceWeight(kycLevel, idNumber ? 1 : 0),
      ssoTokens: {},
      createdAt: new Date().toISOString(),
    };
    users.set(userId, user);

    const wallet = {
      id: userId,
      balance: 0,
      reservedAmount: 0,
      transactions: [],
      kycLevel,
      createdAt: new Date().toISOString(),
    };
    wallets.set(userId, wallet);

    const jwtPayload = {
      sub: userId,
      openId: user.openId,
      role: user.role,
      platform: user.platform,
      iss: 'guiniu-deveco',
      iat: Date.now(),
      exp: Date.now() + TOKEN_EXPIRY,
    };

    const token = _signJwt(jwtPayload);
    const ssoTokens = {};
    SSO_PROJECTS.forEach(project => {
      ssoTokens[project] = _signJwt({ ...jwtPayload, aud: project, scope: 'sso' });
    });

    user.ssoTokens = ssoTokens;
    users.set(userId, user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          nickName: user.nickName,
          role: user.role,
          kycLevel,
        },
        wallet: { id: wallet.id, balance: wallet.balance },
        kycLevel,
        complianceWeight: user.complianceWeight,
        token,
        ssoTokens,
      },
    });
  } catch (e) {
    console.error('[onboarding] 注册错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/kyc/submit', (req, res) => {
  try {
    const { userId, documentType, documentData, realName } = req.body;
    if (!userId || !documentType) {
      return res.status(400).json({ success: false, error: 'userId, documentType 必填' });
    }

    const validDocTypes = ['id_card', 'business_license', 'industry_permit'];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({ success: false, error: `documentType 必须为: ${validDocTypes.join(', ')}` });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const riskAssessment = _assessRisk(documentData, documentType);

    const recordId = `kyc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const record = {
      id: recordId,
      userId,
      documentType,
      documentData: documentData || null,
      realName: realName || user.realName || null,
      status: 'pending_review',
      riskAssessment,
      riskTags: riskAssessment.level === 'high' ? ['high_risk_document'] : [],
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
    };
    kycRecords.set(recordId, record);

    res.json({
      success: true,
      data: {
        recordId,
        status: record.status,
        riskAssessment,
        submittedAt: record.submittedAt,
      },
    });
  } catch (e) {
    console.error('[onboarding] KYC提交错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/kyc/verify', (req, res) => {
  try {
    const { recordId, approved, riskTags } = req.body;
    if (!recordId || approved === undefined) {
      return res.status(400).json({ success: false, error: 'recordId, approved 必填' });
    }

    const record = kycRecords.get(recordId);
    if (!record) {
      return res.status(404).json({ success: false, error: 'KYC记录不存在' });
    }
    if (record.status !== 'pending_review') {
      return res.status(400).json({ success: false, error: `KYC记录状态不允许审核: ${record.status}` });
    }

    record.status = approved ? 'verified' : 'rejected';
    record.reviewedAt = new Date().toISOString();
    if (riskTags && Array.isArray(riskTags)) {
      record.riskTags = [...(record.riskTags || []), ...riskTags];
    }
    kycRecords.set(recordId, record);

    const user = users.get(record.userId);
    if (user) {
      if (approved) {
        let newLevel = 'basic';
        if (record.realName && user.phone && record.documentType === 'id_card') {
          newLevel = 'full';
        }
        user.kycLevel = newLevel;
        if (record.realName && !user.realName) {
          user.realName = record.realName;
        }
      }
      const allRecords = kycRecords.find(r => r.userId === record.userId);
      const verifiedCount = allRecords.filter(r => r.status === 'verified').length;
      user.complianceWeight = _calculateComplianceWeight(user.kycLevel, verifiedCount);
      users.set(user.id, user);
    }

    res.json({
      success: true,
      data: {
        recordId,
        status: record.status,
        reviewedAt: record.reviewedAt,
        kycLevel: user ? user.kycLevel : undefined,
        complianceWeight: user ? user.complianceWeight : undefined,
      },
    });
  } catch (e) {
    console.error('[onboarding] KYC审核错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/kyc/status', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId 必填' });
    }

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const records = kycRecords.find(r => r.userId === userId);
    const latestRecord = records.length > 0 ? records[records.length - 1] : null;

    res.json({
      success: true,
      data: {
        userId,
        kycLevel: user.kycLevel || 'none',
        complianceWeight: user.complianceWeight || 0.3,
        documentsSubmitted: records.length,
        documentsVerified: records.filter(r => r.status === 'verified').length,
        documentsRejected: records.filter(r => r.status === 'rejected').length,
        currentStatus: latestRecord ? latestRecord.status : 'no_submission',
        latestDocumentType: latestRecord ? latestRecord.documentType : null,
      },
    });
  } catch (e) {
    console.error('[onboarding] KYC状态查询错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/kyc/levels', (req, res) => {
  res.json({ success: true, data: KYC_LEVELS });
});

module.exports = router;
