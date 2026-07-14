const express = require('express');
const router = express.Router();
const glmClient = require('../glmClient');
const { activityStore, contentStore, walletStore } = require('../models/dataStore');
const aiValueEngine = require('../aiValueEngine');

const GLM_API_KEY = process.env.GLM_API_KEY || '';

function isAIConfigured() {
  return GLM_API_KEY.length > 0;
}

function aiNotConfigured(res) {
  return res.status(503).json({ success: false, error: 'AI 功能未配置，请设置 GLM_API_KEY' });
}

const RATE_LIMIT_MAP = new Map();

function checkRateLimit(userId, endpoint, intervalMs) {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const lastCall = RATE_LIMIT_MAP.get(key);
  if (lastCall && (now - lastCall) < intervalMs) {
    return false;
  }
  RATE_LIMIT_MAP.set(key, now);
  return true;
}

function parseJsonFromLLM(text) {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    console.error('[AI] JSON parse failed:', e.message);
  }
  return null;
}

// ==================== AI 文案生成 ====================
router.post('/generate-copy', async (req, res) => {
  const { activityId, brand, model, keywords, style } = req.body;
  if (!brand || !model) {
    return res.status(400).json({ success: false, error: 'brand 和 model 为必填' });
  }

  const userId = req.body.userId || '';
  if (userId && !checkRateLimit(userId, 'generate-copy', 10000)) {
    return res.status(429).json({ success: false, error: '请求过于频繁，请10秒后再试' });
  }

  const fallbackDrafts = [
    { style: '专业测评', text: `${model}搭载了最新的智能驾驶系统，动力响应迅捷，底盘调校扎实。综合续航表现出色，是${brand}品牌的诚意之作。如果你追求科技感和驾驶乐趣，${model}值得深度体验。` },
    { style: '生活分享', text: `周末开着${model}带家人出游，智能座舱体验超预期，语音交互丝滑，空间宽敞舒适。长途不累，城市通勤也很省心。推荐大家去试驾感受一下！` },
    { style: '种草安利', text: `姐妹们！${brand} ${model}真的绝了！颜值在线+智能满配+性价比爆表，试驾一圈直接心动！现在预约试驾还有专属优惠，冲就对了！` },
  ];

  if (!isAIConfigured()) {
    return res.json({ success: true, data: { drafts: fallbackDrafts, fallback: true } });
  }

  const activity = activityId ? activityStore.getById(activityId) : null;
  const rewardPerBooking = activity ? activity.rewardPerBooking : 5;
  const rewardPerView = activity ? activity.rewardPerView : 0.01;
  const title = activity ? activity.title : `${brand}${model}推广活动`;

  const systemPrompt = `你是一位专业的汽车推广内容创作助手。你需要根据提供的活动信息生成3套不同风格的推广文案。必须返回JSON格式，结构如下：
{
  "drafts": [
    {"style": "专业测评", "text": "..."},
    {"style": "生活分享", "text": "..."},
    {"style": "种草安利", "text": "..."}
  ]
}
每套文案100-200字，适合社交媒体传播。只返回JSON，不要其他内容。`;

  const userPrompt = `活动：${brand} ${model} — ${title}
奖励：阅读¥${rewardPerView}，试驾预约¥${rewardPerBooking}
关键词：${keywords || '无'}
${style ? `偏好风格：${style}` : ''}

请生成3套推广文案。`;

  try {
    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);

    if (parsed && parsed.drafts && Array.isArray(parsed.drafts)) {
      return res.json({ success: true, data: { drafts: parsed.drafts, usage: result.usage || {} } });
    }

    return res.json({ success: true, data: { drafts: fallbackDrafts, usage: result.usage || {}, fallback: true } });
  } catch (err) {
    console.error('[AI generate-copy error]', err.message);
    return res.json({ success: true, data: { drafts: fallbackDrafts, fallback: true } });
  }
});

// ==================== AI 智能推荐 ====================
router.post('/recommend', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId 为必填' });
  }

  const allActivities = activityStore.listAll().filter(a => a.status === 'active');
  const userContents = contentStore.getByUser(userId);
  const wallet = walletStore.get(userId);

  if (!isAIConfigured() || allActivities.length === 0) {
    const fallbackRecs = allActivities.sort((a, b) => b.rewardPerBooking - a.rewardPerBooking).slice(0, 2).map(a => ({
      activityId: a.id,
      reason: `${a.brand} ${a.model}推广金较高，每笔试驾预约¥${a.rewardPerBooking}，值得参与`,
      confidence: 0.6,
      activity: a,
    }));
    return res.json({ success: true, data: { recommendations: fallbackRecs, fallback: true } });
  }

  const userStatsSummary = userContents.length > 0
    ? userContents.map(c => ({
        carModel: c.carModel,
        views: c.stats.views,
        bookings: c.stats.bookings,
        earnings: c.stats.estimatedEarnings,
      }))
    : [];

  const activitiesSummary = allActivities.map(a => ({
    id: a.id,
    brand: a.brand,
    model: a.model,
    title: a.title,
    rewardPerBooking: a.rewardPerBooking,
    rewardPerView: a.rewardPerView,
    totalBudget: a.totalBudget,
    usedBudget: a.usedBudget,
  }));

  const systemPrompt = `你是一位汽车推广策略顾问。根据用户的历史推广数据和当前可用的活动列表，推荐1-3个最适合该用户参与的活动。必须返回JSON格式：
{
  "recommendations": [
    {"activityId": "...", "reason": "...", "confidence": 0.85}
  ]
}
reason 要具体说明为什么推荐该活动，confidence 为0-1的推荐信心值。只返回JSON。`;

  const userPrompt = `用户推广历史：${userStatsSummary.length > 0 ? JSON.stringify(userStatsSummary) : '暂无'}
用户余额：¥${wallet ? wallet.promotionBalance : 0}
用户口碑值：${wallet ? wallet.reputationScore : 0}

可用活动列表：${JSON.stringify(activitiesSummary)}

请推荐最适合该用户的活动。`;

  try {
    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);

    if (parsed && parsed.recommendations && Array.isArray(parsed.recommendations)) {
      const enriched = parsed.recommendations.map(r => {
        const act = allActivities.find(a => a.id === r.activityId);
        return { ...r, activity: act || null };
      }).filter(r => r.activity);
      return res.json({ success: true, data: { recommendations: enriched, usage: result.usage || {} } });
    }

    const topActivities = allActivities
      .sort((a, b) => b.rewardPerBooking - a.rewardPerBooking)
      .slice(0, 2);
    const fallbackRecs = topActivities.map(a => ({
      activityId: a.id,
      reason: `${a.brand} ${a.model}推广金较高，每笔试驾预约¥${a.rewardPerBooking}，值得参与`,
      confidence: 0.6,
      activity: a,
    }));
    return res.json({ success: true, data: { recommendations: fallbackRecs, usage: result.usage || {}, fallback: true } });
  } catch (err) {
    console.error('[AI recommend error]', err.message);
    return res.status(500).json({ success: false, error: 'AI 推荐失败: ' + err.message });
  }
});

// ==================== AI 数据洞察 ====================
router.post('/insight', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId 为必填' });
  }

  const userContents = contentStore.getByUser(userId);
  const wallet = walletStore.get(userId);

  if (!isAIConfigured() || userContents.length === 0) {
    return res.json({
      success: true,
      data: {
        insights: [
          { type: 'getting_started', title: '开始你的推广之旅', detail: '发布第一篇用车体验，开启你的推广收益！真实体验+清晰图片=更高转化率。' },
        ],
        summary: '暂无内容数据，发布内容后AI将提供个性化洞察。',
        fallback: true,
      },
    });
  }

  const contentsStats = userContents.map(c => ({
    carModel: c.carModel,
    textLength: (c.text || '').length,
    hasImages: (c.images || []).length > 0,
    imageCount: (c.images || []).length,
    views: c.stats.views,
    bookings: c.stats.bookings,
    estimatedEarnings: c.stats.estimatedEarnings,
    createdAt: c.createdAt,
  }));

  const systemPrompt = `你是一位数据分析师，专门为汽车推广员提供内容优化建议。根据用户的内容表现数据，给出3条可操作的洞察建议。必须返回JSON格式：
{
  "insights": [
    {"type": "timing", "title": "...", "detail": "..."},
    {"type": "content", "title": "...", "detail": "..."},
    {"type": "strategy", "title": "...", "detail": "..."}
  ],
  "summary": "一句话总体评价"
}
type 只能是 timing/content/strategy 之一。title 简短（10字内），detail 具体（30-60字）。只返回JSON。`;

  const userPrompt = `用户推广数据：
内容数量：${userContents.length}
钱包余额：¥${wallet ? wallet.promotionBalance : 0}
口碑值：${wallet ? wallet.reputationScore : 0}

各内容表现：${JSON.stringify(contentsStats)}

请给出3条个性化洞察建议。`;

  try {
    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);

    if (parsed && parsed.insights && Array.isArray(parsed.insights)) {
      return res.json({ success: true, data: { insights: parsed.insights, summary: parsed.summary || '', usage: result.usage || {} } });
    }

    const totalViews = userContents.reduce((s, c) => s + c.stats.views, 0);
    const totalBookings = userContents.reduce((s, c) => s + c.stats.bookings, 0);
    const fallbackInsights = [
      { type: 'timing', title: '发布时机', detail: totalViews > 10 ? '你的内容已获得关注，建议在周末晚间8-10点发布，阅读量可能翻倍。' : '坚持发布内容，积累更多阅读数据后可优化发布时间。' },
      { type: 'content', title: '内容质量', detail: userContents.some(c => (c.images || []).length >= 3) ? '配图效果不错，继续保持3张以上图片，可尝试添加车内细节照。' : '添加3张以上清晰图片，阅读率可提升60%！展示车内、外观、细节各一张效果最佳。' },
      { type: 'strategy', title: '推广策略', detail: totalBookings > 0 ? '已有预约转化，建议将内容分享到车主微信群，转化率更高。' : '尚未产生预约，建议分享到有购车意向的社群，并在文案中强调试驾优惠。' },
    ];
    const fallbackSummary = totalViews > 0
      ? `你已发布${userContents.length}篇内容，累计${totalViews}次阅读，继续优化可提升转化。`
      : '刚起步，多发布真实体验内容是提升的关键。';
    return res.json({ success: true, data: { insights: fallbackInsights, summary: fallbackSummary, usage: result.usage || {}, fallback: true } });
  } catch (err) {
    console.error('[AI insight error]', err.message);
    return res.status(500).json({ success: false, error: 'AI 洞察生成失败: ' + err.message });
  }
});

// ==================== AI 客服助手 ====================
router.post('/assistant', async (req, res) => {
  const { contentId, brand, model, question, chatHistory } = req.body;
  if (!question || !brand || !model) {
    return res.status(400).json({ success: false, error: 'question、brand、model 为必填' });
  }

  if (!isAIConfigured()) {
    const fallbackAnswer = `${brand} ${model}是一款非常出色的车型，建议您预约试驾亲身体验！试驾完全免费，4S店专业顾问会为您详细讲解。`;
    const fallbackQuestions = ['续航里程是多少？', '试驾需要带什么证件？', '附近有4S店吗？'];
    return res.json({ success: true, data: { answer: fallbackAnswer, suggestedQuestions: fallbackQuestions, fallback: true } });
  }

  const userId = req.body.userId || '';
  if (userId && !checkRateLimit(userId, 'assistant', 5000)) {
    return res.status(429).json({ success: false, error: '请求过于频繁，请5秒后再试' });
  }

  const activity = contentId ? (contentStore.getById(contentId)?.activity || null) : null;
  const rewardPerBooking = activity ? activity.rewardPerBooking : 5;

  const systemPrompt = `你是${brand} ${model}的汽车顾问助手，负责回答用户关于这款车的真实问题。规则：
1. 只回答与${brand} ${model}车型、试驾流程、预约方式相关的问题
2. 回答简洁（50字以内），准确有用
3. 如果问题不相关，礼貌引导回车型/试驾话题
4. 适时鼓励用户点击「预约试驾」亲身体验
5. 推荐试驾时提一下推广员可获得¥${rewardPerBooking}推广金
必须返回JSON格式：
{
  "answer": "...",
  "suggestedQuestions": ["问题1", "问题2", "问题3"]
}
suggestedQuestions 提供3个用户可能继续问的相关问题。只返回JSON。`;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  if (chatHistory && Array.isArray(chatHistory)) {
    const recentHistory = chatHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  messages.push({ role: 'user', content: question });

  try {
    const result = await glmClient.chat(messages);
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);

    if (parsed && parsed.answer) {
      return res.json({ success: true, data: { answer: parsed.answer, suggestedQuestions: parsed.suggestedQuestions || [] } });
    }

    const fallbackAnswer = `${brand} ${model}是一款非常出色的车型，建议您预约试驾亲身体验！试驾完全免费，4S店专业顾问会为您详细讲解。`;
    const fallbackQuestions = ['续航里程是多少？', '试驾需要带什么证件？', '附近有4S店吗？'];
    return res.json({ success: true, data: { answer: fallbackAnswer, suggestedQuestions: fallbackQuestions, fallback: true } });
  } catch (err) {
    console.error('[AI assistant error]', err.message);
    return res.status(500).json({ success: false, error: 'AI 助手回复失败: ' + err.message });
  }
});

// ==================== AI 实时价值评估 ====================
router.post('/value-assess', async (req, res) => {
  const { contentId, conversionType, userId } = req.body;
  if (!contentId) {
    return res.status(400).json({ success: false, error: 'contentId 为必填' });
  }

  const content = contentStore.getById(contentId);
  if (!content) {
    return res.status(404).json({ success: false, error: '内容不存在' });
  }

  const convType = conversionType || 'VIEW';
  const effectiveUserId = userId || content.userId;

  try {
    const valueResult = await aiValueEngine.calculateValue(content, convType, { userId: effectiveUserId });
    const attribution = await aiValueEngine.calculate(content, convType, { userId: effectiveUserId });

    res.json({
      success: true,
      data: {
        value: valueResult,
        attribution: attribution.chain,
        totalPool: attribution.totalPool,
        platformFee: attribution.platformFee,
      },
    });
  } catch (err) {
    console.error('[AI value-assess error]', err.message);
    return res.status(500).json({ success: false, error: 'AI 价值评估失败: ' + err.message });
  }
});

// ==================== AI 价值看板 ====================
router.get('/value-dashboard', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId 为必填' });
  }

  const userContents = contentStore.getByUser(userId);
  const wallet = walletStore.get(userId);

  if (userContents.length === 0) {
    return res.json({
      success: true,
      data: {
        totalEarned: 0,
        avgWeightMultiplier: 1.0,
        contentCount: 0,
        kolScore: 0,
        recentValues: [],
        breakdown: { quality: 0, spread: 0, kol: 0, conversion: 0 },
      },
    });
  }

  const recentValues = [];
  let totalMultiplier = 0;
  for (const c of userContents.slice(-10)) {
    const val = await aiValueEngine.calculateValue(c, 'VIEW', { userId, useAI: false });
    recentValues.push({
      contentId: c.id,
      carModel: c.carModel,
      views: c.stats.views,
      bookings: c.stats.bookings,
      finalValue: val.finalValue,
      weightMultiplier: val.weightMultiplier,
      source: val.source,
    });
    totalMultiplier += val.weightMultiplier;
  }

  let breakdown = { quality: 0, spread: 0, kol: 0, conversion: 0 };
  if (recentValues.length > 0) {
    const lastVal = recentValues[recentValues.length - 1];
    if (lastVal.weightMultiplier) {
      const avgM = totalMultiplier / recentValues.length;
      breakdown = {
        quality: +(lastVal.weightMultiplier * 0.3).toFixed(3),
        spread: +(avgM * 0.3).toFixed(3),
        kol: +(avgM * 0.2).toFixed(3),
        conversion: +(avgM * 0.4).toFixed(3),
      };
    }
  }

  res.json({
    success: true,
    data: {
      totalEarned: wallet?.promotionBalance || 0,
      avgWeightMultiplier: recentValues.length > 0 ? +(totalMultiplier / recentValues.length).toFixed(3) : 1.0,
      contentCount: userContents.length,
      kolScore: breakdown.kol,
      recentValues,
      breakdown,
      kolValue: wallet?.promotionBalance || 0,
      conversionWeight: breakdown.conversion,
      spreadWeight: breakdown.spread,
      qualityWeight: breakdown.quality,
      realTimeSettlements: recentValues.length,
      pendingSettlementAmount: 0,
    },
  });
});

module.exports = router;
