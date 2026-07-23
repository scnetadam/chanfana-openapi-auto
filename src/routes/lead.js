const express = require('express');
const router = express.Router();
const glmClient = require('../glmClient');
const { leadStore, LEAD_STATUS, LEAD_SOURCE } = require('../models/dataStore');

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

/**
 * 创建线索
 * POST /api/lead/create
 */
router.post('/create', (req, res) => {
  try {
    const userId = req.user?.userId || '';
    const { 
      name, 
      phone, 
      city, 
      source, 
      carModel, 
      carBrand, 
      budget, 
      remarks 
    } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'name 和 phone 为必填项' 
      });
    }
    
    const lead = leadStore.create({
      bizUserId: userId,
      name,
      phone,
      city: city || '',
      source: source || LEAD_SOURCE.FORM,
      carModel: carModel || '',
      carBrand: carBrand || '',
      budget: budget || '',
      remarks: remarks || '',
    });
    
    res.json({
      success: true,
      data: lead,
      message: '线索创建成功',
    });
  } catch (err) {
    console.error('[Lead Create Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 线索列表
 * GET /api/lead/list
 */
router.get('/list', (req, res) => {
  try {
    const userId = req.user?.userId || '';
    const { status, source, priority, page, pageSize } = req.query;
    
    const result = leadStore.list({
      bizUserId: userId,
      status,
      source,
      priority,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[Lead List Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 线索详情
 * GET /api/lead/:id
 */
router.get('/:id', (req, res) => {
  try {
    const lead = leadStore.getById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        error: '线索不存在' 
      });
    }
    
    res.json({
      success: true,
      data: lead,
    });
  } catch (err) {
    console.error('[Lead Detail Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 更新线索
 * PUT /api/lead/:id
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    delete updates.id;
    delete updates.bizUserId;
    delete updates.createdAt;
    
    const lead = leadStore.update(id, updates);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        error: '线索不存在' 
      });
    }
    
    res.json({
      success: true,
      data: lead,
      message: '线索更新成功',
    });
  } catch (err) {
    console.error('[Lead Update Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 更新线索状态
 * PUT /api/lead/:id/status
 */
router.put('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, dealAmount } = req.body;
    
    if (!status || !Object.values(LEAD_STATUS).includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的状态值' 
      });
    }
    
    const extra = {};
    if (status === LEAD_STATUS.CLOSED && dealAmount) {
      extra.dealAmount = dealAmount;
    }
    
    const lead = leadStore.updateStatus(id, status, extra);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        error: '线索不存在' 
      });
    }
    
    res.json({
      success: true,
      data: lead,
      message: '状态更新成功',
    });
  } catch (err) {
    console.error('[Lead Status Update Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 添加跟进记录
 * POST /api/lead/:id/followup
 */
router.post('/:id/followup', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || '';
    const { type, result, nextAction } = req.body;
    
    const followup = {
      type: type || 'call',
      salesId: userId,
      result: result || '',
      nextAction: nextAction || '',
    };
    
    const lead = leadStore.addFollowup(id, followup);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        error: '线索不存在' 
      });
    }
    
    res.json({
      success: true,
      data: lead,
      message: '跟进记录添加成功',
    });
  } catch (err) {
    console.error('[Lead Followup Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 线索统计
 * GET /api/lead/stats
 */
router.get('/stats/summary', (req, res) => {
  try {
    const userId = req.user?.userId || '';
    const stats = leadStore.getStats(userId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('[Lead Stats Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AI 线索分类 ====================
/**
 * AI线索智能分类
 * POST /api/lead/classify
 */
router.post('/classify', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId 为必填' });
    }
    
    const lead = leadStore.getById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: '线索不存在' });
    }
    
    const userId = req.user?.userId || '';
    if (!checkRateLimit(userId, 'lead-classify', 5000)) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请5秒后再试' });
    }
    
    if (!isAIConfigured()) {
      const fallbackResult = classifyLeadFallback(lead);
      leadStore.update(leadId, { classification: fallbackResult });
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }
    
    const systemPrompt = `你是汽车销售线索分析专家。分析线索信息并返回JSON格式：

{
  "leadType": "high_intent|medium|low|invalid",
  "carInterest": ["车型1", "车型2"],
  "purchaseStage": "awareness|considering|decision|purchase",
  "intentScore": 0-100,
  "tags": ["标签1", "标签2"],
  "suggestedActions": ["动作1", "动作2"],
  "estimatedPurchaseTime": "时间描述",
  "confidence": 0-1
}

分析维度：
1. leadType: 高意向(明确购车)/中等(有兴趣)/低意向(观望)/无效
2. purchaseStage: 认知阶段/考虑阶段/决策阶段/购买阶段
3. intentScore: 综合意向评分(0-100)
4. tags: 自动标签(如"高意向"、"近期购车"、"关注智能驾驶")
5. suggestedActions: 建议跟进动作
6. estimatedPurchaseTime: 预估购车时间

只返回JSON，不要其他内容。`;

    const userPrompt = `线索信息：
- 来源：${lead.source}
- 姓名：${lead.name}
- 城市：${lead.city || '未知'}
- 关注车型：${lead.carModel || '未知'}
- 品牌：${lead.carBrand || '未知'}
- 预算：${lead.budget || '未知'}
- 备注：${lead.remarks || '无'}

请分析此线索。`;

    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);
    
    if (parsed) {
      parsed.confidence = parsed.confidence || 0.8;
      leadStore.update(leadId, { classification: parsed });
      return res.json({ success: true, data: parsed, usage: result.usage || {} });
    }
    
    const fallbackResult = classifyLeadFallback(lead);
    leadStore.update(leadId, { classification: fallbackResult });
    return res.json({ success: true, data: fallbackResult, usage: result.usage || {}, fallback: true });
    
  } catch (err) {
    console.error('[Lead Classify Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function classifyLeadFallback(lead) {
  const { remarks, carModel } = lead;
  
  let intentScore = 50;
  let leadType = 'medium';
  let purchaseStage = 'considering';
  const tags = [];
  const suggestedActions = [];
  
  if (remarks && (remarks.includes('购车') || remarks.includes('买') || remarks.includes('订'))) {
    intentScore = 80;
    leadType = 'high_intent';
    purchaseStage = 'decision';
    tags.push('高意向', '近期购车');
    suggestedActions.push('48小时内电话跟进', '发送车型配置报价');
  } else if (remarks && (remarks.includes('了解') || remarks.includes('咨询'))) {
    intentScore = 65;
    leadType = 'medium';
    tags.push('待跟进');
    suggestedActions.push('72小时内联系', '发送车型资料');
  } else {
    intentScore = 40;
    leadType = 'low';
    tags.push('需培育');
    suggestedActions.push('加入线索培育流程');
  }
  
  if (carModel) {
    tags.push(`关注${carModel}`);
  }
  
  return {
    leadType,
    carInterest: carModel ? [carModel] : [],
    purchaseStage,
    intentScore,
    tags,
    suggestedActions,
    estimatedPurchaseTime: leadType === 'high_intent' ? '1个月内' : '3个月内',
    confidence: 0.5,
    fallback: true,
  };
}

// ==================== AI 质量评分 ====================
/**
 * AI线索质量评分
 * POST /api/lead/score
 */
router.post('/score', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId 为必填' });
    }
    
    const lead = leadStore.getById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: '线索不存在' });
    }
    
    const userId = req.user?.userId || '';
    if (!checkRateLimit(userId, 'lead-score', 5000)) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请5秒后再试' });
    }
    
    if (!isAIConfigured()) {
      const fallbackResult = scoreLeadFallback(lead);
      leadStore.update(leadId, { qualityScore: fallbackResult });
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }
    
    const systemPrompt = `你是汽车线索质量评估专家。评估线索质量并返回JSON：

{
  "dimensions": {
    "intentScore": 0-100,
    "budgetMatch": 0-100,
    "timingScore": 0-100,
    "sourceQuality": 0-100,
    "completeness": 0-100
  },
  "totalScore": 0-100,
  "grade": "A|B|C|D",
  "priority": "high|medium|low",
  "reasons": ["原因1", "原因2"]
}

评分维度：
1. intentScore: 意向度(权重40%) - 基于购车意向强度
2. budgetMatch: 预算匹配度(权重20%) - 预算与车型匹配程度
3. timingScore: 购车时机(权重15%) - 购车时间紧迫度
4. sourceQuality: 来源质量(权重15%) - 线索来源可信度
5. completeness: 信息完整度(权重10%) - 信息完整程度

等级：A(80-100) B(60-79) C(40-59) D(0-39)
优先级：high(A级) medium(B-C级) low(D级)

只返回JSON。`;

    const userPrompt = `线索信息：
- 姓名：${lead.name}
- 城市：${lead.city || '未知'}
- 关注车型：${lead.carModel || '未知'}
- 预算：${lead.budget || '未知'}
- 来源：${lead.source}
- 备注：${lead.remarks || '无'}
- 已分类：${lead.classification ? JSON.stringify(lead.classification) : '未分类'}

请评估质量。`;

    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);
    
    if (parsed && parsed.dimensions && parsed.totalScore !== undefined) {
      leadStore.update(leadId, { qualityScore: parsed });
      return res.json({ success: true, data: parsed, usage: result.usage || {} });
    }
    
    const fallbackResult = scoreLeadFallback(lead);
    leadStore.update(leadId, { qualityScore: fallbackResult });
    return res.json({ success: true, data: fallbackResult, usage: result.usage || {}, fallback: true });
    
  } catch (err) {
    console.error('[Lead Score Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function scoreLeadFallback(lead) {
  const intentScore = lead.classification?.intentScore || 50;
  
  const dimensions = {
    intentScore,
    budgetMatch: lead.budget ? 75 : 50,
    timingScore: 60,
    sourceQuality: lead.source === 'booking' ? 85 : 70,
    completeness: (lead.name && lead.phone && lead.city && lead.carModel) ? 90 : 60,
  };
  
  const totalScore = Math.round(
    dimensions.intentScore * 0.4 +
    dimensions.budgetMatch * 0.2 +
    dimensions.timingScore * 0.15 +
    dimensions.sourceQuality * 0.15 +
    dimensions.completeness * 0.1
  );
  
  let grade = 'D';
  let priority = 'low';
  if (totalScore >= 80) { grade = 'A'; priority = 'high'; }
  else if (totalScore >= 60) { grade = 'B'; priority = 'medium'; }
  else if (totalScore >= 40) { grade = 'C'; priority = 'medium'; }
  
  const reasons = [];
  if (intentScore >= 70) reasons.push('意向度较高');
  if (lead.budget) reasons.push('预算明确');
  if (lead.carModel) reasons.push('车型明确');
  if (lead.city) reasons.push('地区明确');
  
  return {
    dimensions,
    totalScore,
    grade,
    priority,
    reasons: reasons.length > 0 ? reasons : ['信息待补充'],
    fallback: true,
  };
}

// ==================== AI 转化预测 ====================
/**
 * AI线索转化预测
 * POST /api/lead/predict
 */
router.post('/predict', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId 为必填' });
    }
    
    const lead = leadStore.getById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: '线索不存在' });
    }
    
    const userId = req.user?.userId || '';
    if (!checkRateLimit(userId, 'lead-predict', 10000)) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请10秒后再试' });
    }
    
    if (!isAIConfigured()) {
      const fallbackResult = predictLeadFallback(lead);
      leadStore.update(leadId, { prediction: fallbackResult });
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }
    
    const systemPrompt = `你是汽车销售转化预测专家。预测线索转化概率并返回JSON：

{
  "conversionProbability": 0-1,
  "estimatedCloseTime": "时间描述",
  "estimatedDealAmount": 金额,
  "riskFactors": ["风险1", "风险2"],
  "opportunityFactors": ["机会1", "机会2"],
  "suggestedActions": ["建议1", "建议2"],
  "timeline": [
    {"stage": "阶段名", "deadline": "时间", "status": "pending|completed"}
  ]
}

预测维度：
1. conversionProbability: 转化概率(0-1)
2. estimatedCloseTime: 预估成交时间
3. estimatedDealAmount: 预估成交金额
4. riskFactors: 风险因素
5. opportunityFactors: 机会因素
6. suggestedActions: 建议动作
7. timeline: 转化时间线

只返回JSON。`;

    const userPrompt = `线索信息：
- 姓名：${lead.name}
- 城市：${lead.city || '未知'}
- 关注车型：${lead.carModel || '未知'}
- 预算：${lead.budget || '未知'}
- 来源：${lead.source}
- 备注：${lead.remarks || '无'}
- 分类：${lead.classification ? JSON.stringify(lead.classification) : '未分类'}
- 质量评分：${lead.qualityScore ? JSON.stringify(lead.qualityScore) : '未评分'}
- 跟进次数：${lead.followups?.length || 0}

请预测转化。`;

    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);
    
    if (parsed && parsed.conversionProbability !== undefined) {
      leadStore.update(leadId, { prediction: parsed });
      return res.json({ success: true, data: parsed, usage: result.usage || {} });
    }
    
    const fallbackResult = predictLeadFallback(lead);
    leadStore.update(leadId, { prediction: fallbackResult });
    return res.json({ success: true, data: fallbackResult, usage: result.usage || {}, fallback: true });
    
  } catch (err) {
    console.error('[Lead Predict Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function predictLeadFallback(lead) {
  const intentScore = lead.classification?.intentScore || 50;
  const qualityScore = lead.qualityScore?.totalScore || 50;
  
  const conversionProbability = Math.min(0.95, (intentScore * 0.6 + qualityScore * 0.4) / 100);
  
  const riskFactors = [];
  const opportunityFactors = [];
  const suggestedActions = [];
  
  if (!lead.budget) riskFactors.push('预算未确认');
  if (!lead.city) riskFactors.push('地区未确认');
  if (lead.followups?.length === 0) riskFactors.push('尚未跟进');
  
  if (lead.classification?.leadType === 'high_intent') opportunityFactors.push('意向明确');
  if (lead.carModel) opportunityFactors.push('车型明确');
  if (lead.source === 'booking') opportunityFactors.push('主动预约');
  
  if (conversionProbability > 0.7) {
    suggestedActions.push('优先跟进', '尽快安排试驾', '准备报价方案');
  } else if (conversionProbability > 0.4) {
    suggestedActions.push('定期跟进', '发送车型资料', '邀约试驾');
  } else {
    suggestedActions.push('线索培育', '定期触达');
  }
  
  const timeline = [
    { stage: '首次跟进', deadline: '3天内', status: 'pending' },
    { stage: '试驾邀约', deadline: '7天内', status: 'pending' },
    { stage: '报价谈判', deadline: '14天内', status: 'pending' },
    { stage: '成交', deadline: conversionProbability > 0.7 ? '30天内' : '60天内', status: 'pending' },
  ];
  
  return {
    conversionProbability: +conversionProbability.toFixed(2),
    estimatedCloseTime: conversionProbability > 0.7 ? '30天内' : '60天内',
    estimatedDealAmount: 250000,
    riskFactors,
    opportunityFactors,
    suggestedActions,
    timeline,
    fallback: true,
  };
}

// ==================== 智能分配 ====================
/**
 * AI线索智能分配
 * POST /api/lead/assign
 */
router.post('/assign', async (req, res) => {
  try {
    const { leadId, salesList } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId 为必填' });
    }
    
    const lead = leadStore.getById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: '线索不存在' });
    }
    
    if (!salesList || !Array.isArray(salesList) || salesList.length === 0) {
      return res.status(400).json({ success: false, error: 'salesList 为必填且非空数组' });
    }
    
    const userId = req.user?.userId || '';
    if (!checkRateLimit(userId, 'lead-assign', 5000)) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请5秒后再试' });
    }
    
    if (!isAIConfigured()) {
      const fallbackResult = assignLeadFallback(lead, salesList);
      leadStore.update(leadId, { assignedTo: fallbackResult.assignedTo });
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }
    
    const systemPrompt = `你是汽车销售线索分配专家。根据线索特征和销售顾问能力，匹配最合适的顾问。返回JSON：

{
  "assignedTo": {
    "salesId": "销售ID",
    "salesName": "销售姓名",
    "matchScore": 0-1,
    "reasons": ["原因1", "原因2"]
  },
  "alternativeSales": [
    {"salesId": "ID", "matchScore": 0-1}
  ]
}

匹配维度：
1. 品牌专长匹配
2. 地区服务匹配
3. 当前负荷均衡
4. 历史成交率
5. 用户画像匹配

只返回JSON。`;

    const userPrompt = `线索信息：
- 姓名：${lead.name}
- 城市：${lead.city || '未知'}
- 关注车型：${lead.carModel || '未知'}
- 品牌：${lead.carBrand || '未知'}
- 分类：${lead.classification ? JSON.stringify(lead.classification) : '未分类'}
- 质量评分：${lead.qualityScore ? JSON.stringify(lead.qualityScore) : '未评分'}

可选销售顾问：
${salesList.map((s, i) => `${i + 1}. ${s.salesName} (ID:${s.salesId}, 品牌:${s.brandExpertise || '通用'}, 地区:${s.region || '全国'}, 成交率:${s.conversionRate || '未知'}%, 当前线索:${s.currentLeads || 0})`).join('\n')}

请分配最合适的顾问。`;

    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);
    
    if (parsed && parsed.assignedTo) {
      leadStore.update(leadId, { assignedTo: parsed.assignedTo });
      return res.json({ success: true, data: parsed, usage: result.usage || {} });
    }
    
    const fallbackResult = assignLeadFallback(lead, salesList);
    leadStore.update(leadId, { assignedTo: fallbackResult.assignedTo });
    return res.json({ success: true, data: fallbackResult, usage: result.usage || {}, fallback: true });
    
  } catch (err) {
    console.error('[Lead Assign Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function assignLeadFallback(lead, salesList) {
  const scoredSales = salesList.map(sales => {
    let score = 0.5;
    const reasons = [];
    
    if (lead.carBrand && sales.brandExpertise && sales.brandExpertise.includes(lead.carBrand)) {
      score += 0.2;
      reasons.push(`擅长${lead.carBrand}品牌`);
    }
    
    if (lead.city && sales.region && (sales.region === lead.city || sales.region === '全国')) {
      score += 0.15;
      reasons.push(`服务${lead.city}地区`);
    }
    
    if (sales.conversionRate && sales.conversionRate > 70) {
      score += 0.1;
      reasons.push(`成交率${sales.conversionRate}%`);
    }
    
    if (sales.currentLeads !== undefined && sales.currentLeads < 15) {
      score += 0.05;
      reasons.push('当前负荷适中');
    }
    
    return {
      ...sales,
      matchScore: Math.min(1, score),
      reasons: reasons.length > 0 ? reasons : ['综合匹配'],
    };
  });
  
  scoredSales.sort((a, b) => b.matchScore - a.matchScore);
  
  const assignedTo = {
    salesId: scoredSales[0].salesId,
    salesName: scoredSales[0].salesName,
    matchScore: scoredSales[0].matchScore,
    reasons: scoredSales[0].reasons,
  };
  
  const alternativeSales = scoredSales.slice(1, 3).map(s => ({
    salesId: s.salesId,
    matchScore: s.matchScore,
  }));
  
  return {
    assignedTo,
    alternativeSales,
    fallback: true,
  };
}

// ==================== 话术生成 ====================
/**
 * AI跟进话术生成
 * POST /api/lead/followup-script
 */
router.post('/followup-script', async (req, res) => {
  try {
    const { leadId, followupType } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId 为必填' });
    }
    
    const lead = leadStore.getById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: '线索不存在' });
    }
    
    const userId = req.user?.userId || '';
    if (!checkRateLimit(userId, 'lead-script', 5000)) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请5秒后再试' });
    }
    
    const type = followupType || 'first_call';
    
    if (!isAIConfigured()) {
      const fallbackResult = generateScriptFallback(lead, type);
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }
    
    const systemPrompt = `你是汽车销售话术专家。根据线索特征生成个性化跟进话术。返回JSON：

{
  "script": "完整话术文本",
  "keyPoints": ["要点1", "要点2"],
  "objectionHandlers": {
    "价格问题": "话术A",
    "竞品对比": "话术B"
  },
  "suggestedTiming": "建议跟进时间"
}

话术要求：
1. 开场白自然亲切
2. 针对用户关注点
3. 引导下一步行动
4. 预设异议处理
5. 符合销售流程

只返回JSON。`;

    const userPrompt = `线索信息：
- 姓名：${lead.name}
- 城市：${lead.city || '未知'}
- 关注车型：${lead.carModel || '未知'}
- 品牌：${lead.carBrand || '未知'}
- 备注：${lead.remarks || '无'}
- 分类：${lead.classification ? JSON.stringify(lead.classification) : '未分类'}
- 跟进类型：${type} (first_call=首次电话, wechat=微信, sms=短信, second_followup=二次跟进)
- 历史跟进：${lead.followups?.length || 0}次

请生成跟进话术。`;

    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);
    
    if (parsed && parsed.script) {
      return res.json({ success: true, data: parsed, usage: result.usage || {} });
    }
    
    const fallbackResult = generateScriptFallback(lead, type);
    return res.json({ success: true, data: fallbackResult, usage: result.usage || {}, fallback: true });
    
  } catch (err) {
    console.error('[Lead Script Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateScriptFallback(lead, type) {
  const name = lead.name || '您好';
  const carModel = lead.carModel || '这款车型';
  
  let script = '';
  const keyPoints = [];
  
  if (type === 'first_call') {
    script = `${name}您好，我是${lead.carBrand || '汽车'}品牌的销售顾问。了解到您对${carModel}很感兴趣...\n\n${carModel}是我们品牌的热门车型，配置丰富、性能出色...\n\n这周末我们店有${carModel}的试驾活动，您方便的话可以来体验一下，亲身感受一下车辆的性能和配置...\n\n另外，如果您有任何问题，随时可以加我微信，我会为您详细解答。`;
    keyPoints.push('确认购车需求', '介绍车型亮点', '邀请试驾体验', '留下联系方式');
  } else if (type === 'wechat') {
    script = `${name}您好！感谢您关注${carModel}。\n\n这是${carModel}的详细配置资料：[发送资料]\n\n如果您方便的话，可以预约到店试驾，亲身感受一下车辆的性能。试驾完全免费，我们的专业顾问会为您详细讲解。\n\n有任何问题随时问我！`;
    keyPoints.push('发送车型资料', '邀约试驾', '保持联系');
  } else if (type === 'sms') {
    script = `【汽车品牌】${name}您好，您关注的${carModel}本周末有试驾活动，名额有限，回复"1"预约或致电咨询。退订回T`;
    keyPoints.push('邀约试驾', '引导回复');
  } else {
    script = `${name}您好，之前跟您介绍过${carModel}，不知您考虑得怎么样了？\n\n如果您还有疑问，我可以为您详细解答。另外，我们店最近有一些优惠活动，如果您近期有购车计划，可以来店详谈。\n\n您看这周末方便来试驾吗？`;
    keyPoints.push('跟进意向', '告知优惠', '邀约试驾');
  }
  
  const objectionHandlers = {
    '价格问题': '我们的价格在同级别车型中很有竞争力，而且现在有一些优惠活动，具体可以到店详谈。',
    '竞品对比': `${carModel}相比竞品在[优势点]方面表现出色，建议您到店试驾对比一下，亲身感受差异。`,
    '续航焦虑': `${carModel}的续航表现很出色，CLTC续航达到[续航里程]，完全满足日常使用需求。`,
  };
  
  return {
    script,
    keyPoints,
    objectionHandlers,
    suggestedTiming: '工作日18:00-20:00 或 周末10:00-12:00',
    fallback: true,
  };
}

// ==================== 数据洞察 ====================
/**
 * AI线索数据洞察
 * GET /api/lead/insights
 */
router.get('/insights', async (req, res) => {
  try {
    const userId = req.user?.userId || '';
    const userLeads = leadStore.getByBizUser(userId);
    
    if (userLeads.length === 0) {
      return res.json({
        success: true,
        data: {
          summary: { totalLeads: 0, highIntent: 0, converted: 0, conversionRate: '0%' },
          insights: [],
          recommendations: ['暂无线索数据，建议先创建线索'],
        },
      });
    }
    
    if (!checkRateLimit(userId, 'lead-insights', 30000)) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请30秒后再试' });
    }
    
    const stats = leadStore.getStats(userId);
    
    if (!isAIConfigured()) {
      const fallbackResult = generateInsightsFallback(userLeads, stats);
      return res.json({ success: true, data: fallbackResult, fallback: true });
    }
    
    const leadsSummary = {
      total: userLeads.length,
      byStatus: {
        new: userLeads.filter(l => l.status === 'new').length,
        following: userLeads.filter(l => l.status === 'following').length,
        closed: userLeads.filter(l => l.status === 'closed').length,
        lost: userLeads.filter(l => l.status === 'lost').length,
      },
      bySource: {
        booking: userLeads.filter(l => l.source === 'booking').length,
        form: userLeads.filter(l => l.source === 'form').length,
        chat: userLeads.filter(l => l.source === 'chat').length,
      },
      avgIntentScore: userLeads.reduce((sum, l) => sum + (l.classification?.intentScore || 50), 0) / userLeads.length,
      avgQualityScore: userLeads.reduce((sum, l) => sum + (l.qualityScore?.totalScore || 50), 0) / userLeads.length,
      topCarModels: [...new Set(userLeads.map(l => l.carModel).filter(Boolean))].slice(0, 5),
    };
    
    const systemPrompt = `你是汽车销售数据分析专家。分析线索数据并返回洞察建议。返回JSON：

{
  "summary": {
    "totalLeads": 数量,
    "highIntent": 高意向数量,
    "converted": 成交数量,
    "conversionRate": "转化率%"
  },
  "insights": [
    {"type": "timing|source|segment|bottleneck", "title": "标题", "detail": "详细分析"}
  ],
  "recommendations": ["建议1", "建议2"]
}

分析维度：
1. 最佳跟进时机
2. 线索来源效果
3. 客群画像特征
4. 转化瓶颈分析

只返回JSON。`;

    const userPrompt = `线索数据概览：
- 总线索数：${leadsSummary.total}
- 状态分布：${JSON.stringify(leadsSummary.byStatus)}
- 来源分布：${JSON.stringify(leadsSummary.bySource)}
- 平均意向分：${leadsSummary.avgIntentScore.toFixed(1)}
- 平均质量分：${leadsSummary.avgQualityScore.toFixed(1)}
- 热门车型：${leadsSummary.topCarModels.join(', ')}
- 转化率：${stats.conversionRate}%

请分析数据并提供洞察建议。`;

    const result = await glmClient.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    
    const content = result.choices?.[0]?.message?.content || '';
    const parsed = parseJsonFromLLM(content);
    
    if (parsed && parsed.summary && parsed.insights) {
      return res.json({ success: true, data: parsed, usage: result.usage || {} });
    }
    
    const fallbackResult = generateInsightsFallback(userLeads, stats);
    return res.json({ success: true, data: fallbackResult, usage: result.usage || {}, fallback: true });
    
  } catch (err) {
    console.error('[Lead Insights Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateInsightsFallback(leads, stats) {
  const insights = [];
  const recommendations = [];
  
  const newLeads = leads.filter(l => l.status === 'new').length;
  if (newLeads > 0) {
    insights.push({
      type: 'timing',
      title: '新线索待跟进',
      detail: `当前有${newLeads}条新线索待跟进，建议2小时内完成首次联系，转化率可提升40%。`,
    });
    recommendations.push('建立2小时快速跟进机制');
  }
  
  const bookingLeads = leads.filter(l => l.source === 'booking');
  const formLeads = leads.filter(l => l.source === 'form');
  
  if (bookingLeads.length > 0 || formLeads.length > 0) {
    const bookingRate = bookingLeads.length > 0 
      ? (bookingLeads.filter(l => l.status === 'closed').length / bookingLeads.length * 100).toFixed(1)
      : 0;
    const formRate = formLeads.length > 0
      ? (formLeads.filter(l => l.status === 'closed').length / formLeads.length * 100).toFixed(1)
      : 0;
    
    insights.push({
      type: 'source',
      title: '线索来源分析',
      detail: `试驾预约转化率${bookingRate}%，表单留资转化率${formRate}%。${bookingRate > formRate ? '试驾预约效果更好，建议加大试驾邀约力度。' : '表单留资效果更好，建议优化表单投放。'}`,
    });
  }
  
  const highIntentLeads = leads.filter(l => l.classification?.leadType === 'high_intent');
  if (highIntentLeads.length > 0) {
    insights.push({
      type: 'segment',
      title: '高意向客群画像',
      detail: `高意向客户${highIntentLeads.length}位，特征：关注具体车型+预算明确+主动咨询。建议精准投放类似人群。`,
    });
    recommendations.push('针对高意向线索优先分配资深顾问');
  }
  
  const followingLeads = leads.filter(l => l.status === 'following');
  const followingToClosed = followingLeads.length > 0
    ? (leads.filter(l => l.status === 'closed').length / (followingLeads.length + leads.filter(l => l.status === 'closed').length) * 100).toFixed(1)
    : 0;
  
  if (followingToClosed < 50) {
    insights.push({
      type: 'bottleneck',
      title: '转化瓶颈',
      detail: `跟进→成交转化率仅${followingToClosed}%，建议优化跟进话术和邀约策略，提升试驾转化率。`,
    });
    recommendations.push('优化跟进话术，提升试驾邀约率');
  }
  
  return {
    summary: {
      totalLeads: leads.length,
      highIntent: highIntentLeads.length,
      converted: stats.closed,
      conversionRate: `${stats.conversionRate}%`,
    },
    insights: insights.length > 0 ? insights : [{ type: 'general', title: '数据积累中', detail: '线索数据较少，建议继续积累数据后分析' }],
    recommendations: recommendations.length > 0 ? recommendations : ['继续积累线索数据'],
    fallback: true,
  };
}

module.exports = router;
