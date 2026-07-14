const aiValueEngine = require('./aiValueEngine');
const hashEngine = require('./hashEngine');
const { walletStore, notificationStore, hashStore } = require('./models/dataStore');

const COMMISSION_TYPES = {
  TASK_REWARD: { key: 'task_reward', label: '任务奖励', rate: 0.90 },
  BOOKING_COMMISSION: { key: 'booking_commission', label: '预约分佣', rate: 0.90 },
  CONTENT_REVENUE: { key: 'content_revenue', label: '内容收益', rate: 0.90 },
  SHARE_COMMISSION: { key: 'share_commission', label: '分享分佣', rate: 0.85 },
  BIZ_OVERRIDE: { key: 'biz_override', label: 'B端自定义分佣', rate: null },
};

async function calculateCommission(task, submission, options = {}) {
  const { commissionType = 'task_reward', bizOverrideRate } = options;
  const rule = COMMISSION_TYPES[commissionType.toUpperCase()];
  if (!rule) return { success: false, error: '无效分佣类型' };

  let distributableRate = rule.rate;
  if (commissionType === 'biz_override' && bizOverrideRate) {
    distributableRate = Math.max(0.5, Math.min(1.0, bizOverrideRate));
  }

  let reward = task.rewardPerUnit || 0;
  let valueCalc = null;

  if (submission.contentId) {
    try {
      valueCalc = await aiValueEngine.calculateValue(
        { id: submission.contentId, trackChain: [{ userId: submission.kolUserId, role: 'originator', timestamp: submission.createdAt }], stats: {}, createdAt: submission.createdAt },
        task.type === 'booking' ? 'BOOKING' : 'VIEW',
        { userId: submission.kolUserId, useAI: true }
      );
      if (valueCalc.finalValue > 0) {
        reward = valueCalc.finalValue;
      }
    } catch (e) {
      console.error('[Commission] AI价值计算失败:', e.message);
    }
  }

  const platformFee = +(reward * (1 - distributableRate)).toFixed(4);
  const kolShare = +(reward * distributableRate).toFixed(4);

  if (task.trackChain && task.trackChain.length > 1) {
    const chainAllocation = _allocateByChain(reward, task.trackChain, distributableRate);
    return {
      success: true,
      commissionType,
      totalReward: +reward.toFixed(4),
      platformFee,
      distributableRate,
      chainAllocation,
      valueCalc,
    };
  }

  return {
    success: true,
    commissionType,
    totalReward: +reward.toFixed(4),
    platformFee,
    kolShare,
    distributableRate,
    valueCalc,
  };
}

function _allocateByChain(totalReward, trackChain, distributableRate) {
  const now = Date.now();
  const chainWithWeights = trackChain.map(node => {
    const nodeTime = new Date(node.timestamp).getTime();
    const daysAgo = Math.max(0, (now - nodeTime) / (1000 * 60 * 60 * 24));
    const weight = aiValueEngine.timeDecayWeight(daysAgo);
    return { ...node, weight };
  });

  const totalWeight = chainWithWeights.reduce((s, n) => s + n.weight, 0);
  if (totalWeight === 0) return [];

  const distributable = totalReward * distributableRate;
  return chainWithWeights.map(node => {
    const share = node.weight / totalWeight;
    const amount = +(distributable * share).toFixed(4);
    return {
      userId: node.userId,
      role: node.role,
      nickName: node.nickName || '',
      share: +(share * 100).toFixed(1),
      amount,
    };
  });
}

async function settleCommission(kolUserId, amount, description, refId) {
  walletStore.addPromotion(kolUserId, amount, description, refId);
  notificationStore.create({
    userId: kolUserId,
    type: 'wallet',
    title: '分佣到账',
    content: description + ' ¥' + amount.toFixed(2),
  });

  try {
    const hashData = JSON.stringify({ kolUserId, amount, description, refId, ts: new Date().toISOString() });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: 'comm_' + refId,
      hash,
      dataDigest: digest,
      dataType: 'commission',
      metadata: { kolUserId, amount },
    });
  } catch (e) {
    console.error('[Commission] IP存证失败:', e.message);
  }

  return { success: true, amount, kolUserId };
}

module.exports = {
  calculateCommission,
  settleCommission,
  COMMISSION_TYPES,
};
