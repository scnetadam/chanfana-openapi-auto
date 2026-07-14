/**
 * AI 实时加权值引擎
 *
 * 替代 attributionEngine 的固定奖励模式，
 * 通过 GLM 大模型实时计算每笔分享/转化的事件价值。
 *
 * 加权维度:
 *   1. 内容质量分 — 文本长度/图片数/原创度 (0-10)
 *   2. 传播深度分 — 传播链层数/分享次数/二次传播率 (0-10)
 *   3. KOL等级分  — 发布者历史表现/口碑值/转化率 (0-10)
 *   4. 转化效能分 — 阅读→预约→成交各阶段转化率 (0-10)
 *   5. 时效衰减   — e^(-λΔt) 时间衰减
 *
 * 输出:
 *   baseValue  — 基础价值 (GLM 动态评估)
 *   weightMul  — 加权乘数 (各维度综合)
 *   finalValue — 最终权重价值 = baseValue × weightMul × timeDecay
 *   breakdown  — 各维度得分明细
 */

const glmClient = require('./glmClient');
const llmProvider = require('./llmProvider');
const { contentStore, walletStore } = require('./models/dataStore');

const LAMBDA = 0.1;
const CACHE_TTL_MS = 30000;
const _valueCache = new Map();

const BASE_VALUES = {
  VIEW: 0.01,
  BOOKING: 5.00,
  DEPOSIT: 50.00,
  PURCHASE: 6000,
};

const PLATFORM_FEE_RATE = 0.10;

function timeDecayWeight(daysAgo) {
  if (daysAgo < 0) daysAgo = 0;
  return Math.exp(-LAMBDA * daysAgo);
}

function _localQualityScore(content) {
  let score = 3;
  const textLen = (content.text || '').length;
  if (textLen >= 50) score += 1;
  if (textLen >= 150) score += 1;
  if (textLen >= 300) score += 1;
  const imgCount = (content.images || []).length;
  if (imgCount >= 1) score += 1;
  if (imgCount >= 3) score += 1;
  if (imgCount >= 6) score += 1;
  return Math.min(score, 10);
}

function _localSpreadScore(content) {
  let score = 2;
  const chainLen = (content.trackChain || []).length;
  if (chainLen >= 2) score += 1;
  if (chainLen >= 4) score += 1;
  if (chainLen >= 6) score += 2;
  if (chainLen >= 10) score += 2;
  const shares = content.stats?.shares || 0;
  if (shares >= 3) score += 1;
  if (shares >= 10) score += 1;
  return Math.min(score, 10);
}

function _localKolScore(userId) {
  const wallet = walletStore.get(userId);
  const reputation = wallet?.reputationScore || 0;
  let score = 2;
  if (reputation >= 10) score += 1;
  if (reputation >= 50) score += 1;
  if (reputation >= 100) score += 2;
  if (reputation >= 500) score += 2;
  const userContents = contentStore.getByUser(userId);
  if (userContents.length >= 3) score += 1;
  if (userContents.length >= 10) score += 1;
  const totalBookings = userContents.reduce((s, c) => s + (c.stats?.bookings || 0), 0);
  if (totalBookings >= 1) score += 1;
  if (totalBookings >= 5) score += 1;
  return Math.min(score, 10);
}

function _localConversionScore(content) {
  let score = 2;
  const views = content.stats?.views || 0;
  const bookings = content.stats?.bookings || 0;
  if (views > 0) {
    const convRate = bookings / views;
    if (convRate >= 0.01) score += 1;
    if (convRate >= 0.03) score += 1;
    if (convRate >= 0.05) score += 2;
    if (convRate >= 0.10) score += 2;
  }
  if (bookings >= 1) score += 1;
  if (bookings >= 3) score += 1;
  return Math.min(score, 10);
}

function _localWeightMultiplier(content, userId) {
  const quality = _localQualityScore(content);
  const spread = _localSpreadScore(content);
  const kol = _localKolScore(userId);
  const conversion = _localConversionScore(content);
  const avg = (quality * 0.30 + spread * 0.25 + kol * 0.25 + conversion * 0.20);
  const mul = 0.5 + (avg / 10) * 1.5;
  return {
    quality,
    spread,
    kol,
    conversion,
    avg: +avg.toFixed(2),
    multiplier: +mul.toFixed(3),
  };
}

async function _aiValueAssessment(content, userId, conversionType) {
  const activity = content.activity || {};
  const carModel = content.carModel || '';
  const textSnippet = (content.text || '').slice(0, 200);
  const imgCount = (content.images || []).length;
  const chainLen = (content.trackChain || []).length;
  const stats = content.stats || {};
  const wallet = walletStore.get(userId);
  const userContents = contentStore.getByUser(userId);

  const systemPrompt = `你是一个汽车资讯内容价值评估引擎。根据内容质量、传播深度、KOL等级和转化效能，实时计算此次${conversionType}事件的价值权重。

必须返回纯JSON（不要Markdown标记）：
{
  "baseValue": 数字,
  "qualityScore": 0-10,
  "spreadScore": 0-10,
  "kolScore": 0-10,
  "conversionScore": 0-10,
  "weightMultiplier": 0.5-3.0,
  "reason": "简短评估理由(20字内)"
}

规则:
- baseValue: ${conversionType}的基础价值(参考: VIEW≈0.01, BOOKING≈5, DEPOSIT≈50, PURCHASE≈6000)
- qualityScore: 内容文本丰富度/图片质量/原创性
- spreadScore: 传播链深度/二次传播活跃度
- kolScore: 发布者历史表现/口碑/专业度
- conversionScore: 阅读到转化各环节的效能
- weightMultiplier: 综合加权乘数(0.5=低质量,1.0=标准,2.0=优质,3.0=爆款)
- 评估要严格公平，大部分内容应在0.8-1.5区间`;

  const userPrompt = `评估内容:
车型: ${carModel}
活动: ${activity.title || '未知'} (预算: ¥${activity.totalBudget || 0}, 已用: ¥${activity.usedBudget || 0})
内容摘要: ${textSnippet || '(纯图片)'}
图片数: ${imgCount}
传播链长度: ${chainLen}
统计数据: 阅读${stats.views || 0}/预约${stats.bookings || 0}/分享${stats.shares || 0}/预估收益¥${stats.estimatedEarnings || 0}
发布者: 口碑值${wallet?.reputationScore || 0}, 历史${userContents.length}篇内容
转化类型: ${conversionType}

请评估此次${conversionType}的实时价值权重。`;

  try {
    let result;
    try {
      result = await llmProvider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], process.env.GLM_DEFAULT_MODEL || 'glm-4');
    } catch (_e) {
      result = await glmClient.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    }

    const text = result.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        baseValue: _clampNum(parsed.baseValue, 0.001, 10000),
        qualityScore: _clampNum(parsed.qualityScore, 0, 10),
        spreadScore: _clampNum(parsed.spreadScore, 0, 10),
        kolScore: _clampNum(parsed.kolScore, 0, 10),
        conversionScore: _clampNum(parsed.conversionScore, 0, 10),
        weightMultiplier: _clampNum(parsed.weightMultiplier, 0.5, 3.0),
        reason: parsed.reason || '',
        source: 'ai',
      };
    }
  } catch (e) {
    console.error('[AI Value Engine] LLM assessment failed:', e.message);
  }
  return null;
}

function _clampNum(val, min, max) {
  const n = Number(val);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * 核心接口: 实时计算事件价值
 *
 * @param {object} content - 内容对象
 * @param {string} conversionType - VIEW|BOOKING|DEPOSIT|PURCHASE
 * @param {object} [options]
 * @param {boolean} [options.useAI=true] - 是否调用AI评估(降级时false)
 * @param {string} [options.userId] - 发布者ID(默认取content.userId)
 * @returns {Promise<object>} 价值计算结果
 */
async function calculateValue(content, conversionType, options = {}) {
  if (!content) {
    return { baseValue: 0, weightMultiplier: 0, finalValue: 0, breakdown: {}, source: 'none' };
  }

  const useAI = options.useAI !== false;
  const userId = options.userId || content.userId;
  const cacheKey = `${content.id}:${conversionType}:${Date.now() / CACHE_TTL_MS | 0}`;

  const now = Date.now();
  const contentTime = new Date(content.createdAt).getTime();
  const daysSincePublish = (now - contentTime) / (1000 * 60 * 60 * 24);

  if (daysSincePublish > 30) {
    return {
      baseValue: 0,
      weightMultiplier: 0,
      finalValue: 0,
      timeDecay: 0,
      breakdown: {},
      source: 'expired',
    };
  }

  const timeDecay = timeDecayWeight(daysSincePublish);

  const cached = _valueCache.get(cacheKey);
  if (cached) return { ...cached, timeDecay, source: cached.source + '+cache' };

  let baseValue = BASE_VALUES[conversionType] || 0;
  let breakdown;
  let weightMultiplier;
  let source = 'local';

  if (useAI && process.env.GLM_API_KEY) {
    const aiResult = await _aiValueAssessment(content, userId, conversionType);
    if (aiResult) {
      baseValue = aiResult.baseValue;
      weightMultiplier = aiResult.weightMultiplier;
      breakdown = {
        quality: aiResult.qualityScore,
        spread: aiResult.spreadScore,
        kol: aiResult.kolScore,
        conversion: aiResult.conversionScore,
        avg: +((aiResult.qualityScore * 0.30 + aiResult.spreadScore * 0.25 + aiResult.kolScore * 0.25 + aiResult.conversionScore * 0.20)).toFixed(2),
        reason: aiResult.reason,
      };
      source = 'ai';
    }
  }

  if (source === 'local') {
    breakdown = _localWeightMultiplier(content, userId);
    weightMultiplier = breakdown.multiplier;
  }

  const finalValue = +(baseValue * weightMultiplier * timeDecay).toFixed(4);
  const platformFee = +(finalValue * PLATFORM_FEE_RATE).toFixed(4);
  const distributable = +(finalValue - platformFee).toFixed(4);

  const result = {
    baseValue: +baseValue.toFixed(4),
    weightMultiplier: +weightMultiplier.toFixed(3),
    timeDecay: +timeDecay.toFixed(4),
    finalValue,
    platformFee,
    distributable,
    daysSincePublish: +daysSincePublish.toFixed(1),
    breakdown,
    source,
  };

  _valueCache.set(cacheKey, result);
  if (_valueCache.size > 1000) {
    const oldest = _valueCache.keys().next().value;
    _valueCache.delete(oldest);
  }

  return result;
}

/**
 * 归因分配 (兼容原 attributionEngine.calculate 接口)
 * 用实时加权值替代固定池值
 */
async function calculate(content, conversionType, options = {}) {
  if (!content || !content.trackChain || content.trackChain.length === 0) {
    return { chain: [], platformFee: 0, totalPool: 0, valueCalc: null };
  }

  const valueResult = await calculateValue(content, conversionType, options);
  const poolValue = valueResult.finalValue;

  if (poolValue <= 0) {
    return { chain: [], platformFee: 0, totalPool: 0, valueCalc: valueResult };
  }

  const now = Date.now();
  const chainWithWeights = content.trackChain.map(node => {
    const nodeTime = new Date(node.timestamp).getTime();
    const daysAgo = (now - nodeTime) / (1000 * 60 * 60 * 24);
    const weight = timeDecayWeight(daysAgo);
    return { ...node, weight };
  });

  const totalWeight = chainWithWeights.reduce((s, n) => s + n.weight, 0);
  if (totalWeight === 0) {
    return { chain: [], platformFee: 0, totalPool: 0, valueCalc: valueResult };
  }

  const platformFee = valueResult.platformFee;
  const distributable = valueResult.distributable;

  const allocated = chainWithWeights.map(node => {
    const share = node.weight / totalWeight;
    const amount = +(distributable * share).toFixed(4);
    return {
      userId: node.userId,
      role: node.role,
      nickName: node.nickName || '',
      share: +(share * 100).toFixed(1),
      weight: +node.weight.toFixed(4),
      amount,
      conversionType,
    };
  });

  return {
    chain: allocated,
    platformFee,
    totalPool: +poolValue.toFixed(4),
    daysSincePublish: valueResult.daysSincePublish,
    valueCalc: valueResult,
  };
}

module.exports = {
  calculateValue,
  calculate,
  BASE_VALUES,
  PLATFORM_FEE_RATE,
  timeDecayWeight,
};
