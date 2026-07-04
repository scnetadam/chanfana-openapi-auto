/**
 * X402 归因引擎 — 时间衰减归因算法
 *
 * 核心公式:
 *   weight = e^(-λ × Δt)
 *   λ = 0.1/天 (30天窗口期, 14天过半衰)
 *
 * 用法:
 *   const result = attributionEngine.calculate(contentId)
 *   result = {
 *     chain: [{ userId, role, weight, amount, ... }],
 *     platformFee: number,
 *     totalPool: number,
 *   }
 */

// 时间衰减系数 (λ)
const LAMBDA = 0.1; // per day

// 转化类型 → 佣金池金额 (元)
const CONVERSION_VALUES = {
  VIEW: 0.01,       // 阅读/浏览 → 0.01元
  BOOKING: 5.00,    // 试驾预约 → 5元
  DEPOSIT: 50.00,   // 付意向金 → 50元
  PURCHASE: 6000,   // 最终成交 → 6000元 (20万×3%)
};

// 平台服务费率
const PLATFORM_FEE_RATE = 0.10;

/**
 * 计算时间衰减权重
 * @param {number} daysAgo — 距内容发布天数
 * @returns {number} 0~1 权重
 */
function timeDecayWeight(daysAgo) {
  if (daysAgo < 0) daysAgo = 0;
  return Math.exp(-LAMBDA * daysAgo);
}

/**
 * 多触点归因计算
 * @param {object} content — 内容对象 (含追踪链数据)
 * @param {string} conversionType — 转化类型: VIEW|BOOKING|DEPOSIT|PURCHASE
 * @returns {object} 归因分配结果
 */
function calculate(content, conversionType = 'VIEW') {
  if (!content || !content.trackChain || content.trackChain.length === 0) {
    return { chain: [], platformFee: 0, totalPool: 0 };
  }

  const poolValue = CONVERSION_VALUES[conversionType] || 0;
  if (poolValue <= 0) {
    return { chain: [], platformFee: 0, totalPool: 0 };
  }

  const now = Date.now();
  const contentTime = new Date(content.createdAt).getTime();
  const daysSincePublish = (now - contentTime) / (1000 * 60 * 60 * 24);

  // 超过30天归因窗口 → 归零
  if (daysSincePublish > 30) {
    return { chain: [], platformFee: 0, totalPool: 0 };
  }

  // 计算每个触点的衰减权重
  const chainWithWeights = content.trackChain.map(node => {
    const nodeTime = new Date(node.timestamp).getTime();
    const daysAgo = (now - nodeTime) / (1000 * 60 * 60 * 24);
    const weight = timeDecayWeight(daysAgo);
    return { ...node, weight };
  });

  // 归一化分配
  const totalWeight = chainWithWeights.reduce((s, n) => s + n.weight, 0);
  if (totalWeight === 0) {
    return { chain: [], platformFee: 0, totalPool: 0 };
  }

  // 平台扣服务费
  const platformFee = +(poolValue * PLATFORM_FEE_RATE).toFixed(2);
  const distributable = +(poolValue - platformFee).toFixed(2);

  // 分配
  const allocated = chainWithWeights.map(node => {
    const share = node.weight / totalWeight;
    const amount = +(distributable * share).toFixed(2);
    return {
      userId: node.userId,
      role: node.role,        // 'originator' | 'spreader' | 'converter'
      nickName: node.nickName || '',
      share: +(share * 100).toFixed(1),  // 百分比
      weight: +node.weight.toFixed(4),
      amount,
      conversionType,
    };
  });

  return {
    chain: allocated,
    platformFee,
    totalPool: poolValue,
    daysSincePublish: +daysSincePublish.toFixed(1),
  };
}

module.exports = {
  calculate,
  CONVERSION_VALUES,
  PLATFORM_FEE_RATE,
  timeDecayWeight,
};
