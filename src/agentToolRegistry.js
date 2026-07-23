const { v4: uuid } = require('uuid');
const llmProvider = require('./llmProvider');
const agentPayClient = require('./agentPayClient');
const { hashStore, notificationStore } = require('./models/dataStore');
const hashEngine = require('./hashEngine');

const AGENT_TOOL_CATALOG = [
  {
    id: 'agent_content_writer',
    name: '内容创作Agent',
    desc: '自动生成汽车资讯内容，支持多风格',
    category: 'content',
    icon: 'edit',
    price: 0.5,
    opcDiscount: 0.6,
    requiredModels: ['glm-4', 'glm-4-flash'],
    capabilities: ['content_generation', 'style_transfer', 'seo_optimize'],
  },
  {
    id: 'agent_data_analyst',
    name: '数据分析Agent',
    desc: '推广数据深度分析，竞品洞察报告',
    category: 'data',
    icon: 'chart',
    price: 1.0,
    opcDiscount: 0.5,
    requiredModels: ['glm-4-plus', 'deepseek-reasoner'],
    capabilities: ['data_analysis', 'trend_prediction', 'competitor_insight'],
  },
  {
    id: 'agent_auto_publisher',
    name: '定时发布Agent',
    desc: '最佳时段自动发布，多平台同步',
    category: 'automation',
    icon: 'clock',
    price: 0.3,
    opcDiscount: 0.4,
    requiredModels: ['glm-4-flash'],
    capabilities: ['scheduled_publish', 'multi_platform', 'timing_optimize'],
  },
  {
    id: 'agent_comment_reply',
    name: '智能回复Agent',
    desc: '评论区自动回复，粉丝互动增强',
    category: 'engagement',
    icon: 'message',
    price: 0.2,
    opcDiscount: 0.5,
    requiredModels: ['glm-4-flash', 'deepseek-chat'],
    capabilities: ['auto_reply', 'sentiment_analysis', 'lead_qualify'],
  },
  {
    id: 'agent_brand_monitor',
    name: '品牌监控Agent',
    desc: '实时监控品牌舆情，竞品动态追踪',
    category: 'monitor',
    icon: 'eye',
    price: 0.8,
    opcDiscount: 0.5,
    requiredModels: ['glm-4', 'qwen-max'],
    capabilities: ['brand_monitor', 'sentiment_alert', 'competitor_track'],
  },
  {
    id: 'agent_commission_tracker',
    name: '分佣追踪Agent',
    desc: '自动追踪分佣链，收益智能归因',
    category: 'finance',
    icon: 'wallet',
    price: 0.4,
    opcDiscount: 0.5,
    requiredModels: ['glm-4-flash'],
    capabilities: ['commission_track', 'earning_forecast', 'chain_verify'],
  },
  {
    id: 'agent_video_script',
    name: '视频脚本Agent',
    desc: '短视频脚本生成，爆款模板库',
    category: 'content',
    icon: 'video',
    price: 0.6,
    opcDiscount: 0.5,
    requiredModels: ['glm-4', 'glm-4v'],
    capabilities: ['script_generation', 'storyboard', 'hook_optimizer'],
  },
  {
    id: 'agent_kol_matcher',
    name: 'KOL匹配Agent',
    desc: 'B端自动匹配KOL，智能推荐',
    category: 'matching',
    icon: 'link',
    price: 0.5,
    opcDiscount: 0.4,
    requiredModels: ['glm-4', 'deepseek-chat'],
    capabilities: ['kol_matching', 'score_ranking', 'activity_recommend'],
  },
];

const CATEGORIES = [
  { id: 'content', name: '内容创作', icon: 'edit' },
  { id: 'data', name: '数据分析', icon: 'chart' },
  { id: 'automation', name: '自动化', icon: 'clock' },
  { id: 'engagement', name: '粉丝互动', icon: 'message' },
  { id: 'monitor', name: '监控追踪', icon: 'eye' },
  { id: 'finance', name: '财务分佣', icon: 'wallet' },
  { id: 'matching', name: 'KOL匹配', icon: 'link' },
];

function getToolCatalog(opcStatus) {
  const isOpc = opcStatus === 'approved';
  return AGENT_TOOL_CATALOG.map(tool => {
    const effectivePrice = isOpc ? +(tool.price * tool.opcDiscount).toFixed(2) : tool.price;
    return {
      ...tool,
      effectivePrice,
      label: isOpc ? 'OPC ¥' + effectivePrice + '/次' : '¥' + tool.price + '/次',
      opcPrice: effectivePrice,
    };
  });
}

function getToolById(toolId) {
  return AGENT_TOOL_CATALOG.find(t => t.id === toolId) || null;
}

function getCategories() {
  return CATEGORIES;
}

async function executeAgentTool(userId, toolId, opcStatus, inputParams, userLlmPreference) {
  const tool = getToolById(toolId);
  if (!tool) return { success: false, error: 'Agent工具不存在' };

  const isOpc = opcStatus === 'approved';
  const effectivePrice = isOpc ? +(tool.price * tool.opcDiscount).toFixed(2) : tool.price;

  if (effectivePrice > 0) {
    try {
      const payResult = await agentPayClient.execute({
        userId,
        amount: effectivePrice,
        subject: 'Agent工具: ' + tool.name,
        payeeId: 'system',
        type: 'agent_tool',
      });
      if (!payResult.success) {
        return { success: false, error: '支付失败: ' + (payResult.error || payResult.decision?.reason || '余额不足') };
      }
    } catch (e) {
      console.error('[AgentTool] Agent支付失败:', e.message);
      return { success: false, error: '支付服务暂不可用' };
    }
  }

  let result = null;
  let usedModel = '';

  try {
    const modelId = _selectModel(tool, userLlmPreference);
    usedModel = modelId;
    const messages = _buildAgentPrompt(toolId, inputParams);
    const chatResult = await llmProvider.chat(messages, modelId);
    result = chatResult.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('[AgentTool] LLM调用失败:', e.message);
    result = 'Agent执行出错: ' + e.message;
  }

  notificationStore.create({
    userId,
    type: 'agent_tool',
    title: 'Agent工具执行',
    content: '执行' + tool.name + '，花费¥' + effectivePrice.toFixed(2),
  });

  try {
    const hashData = JSON.stringify({ userId, toolId, price: effectivePrice, model: usedModel, ts: new Date().toISOString() });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: 'agent_' + userId + '_' + Date.now(),
      hash,
      dataDigest: digest,
      dataType: 'agent_tool',
      metadata: { userId, toolId, price: effectivePrice, model: usedModel },
    });
  } catch (e) {
    console.error('[AgentTool] IP存证失败:', e.message);
  }

  return {
    success: true,
    tool: { id: tool.id, name: tool.name, category: tool.category },
    price: effectivePrice,
    usedModel,
    result,
    isOpc,
  };
}

function _selectModel(tool, userPreference) {
  if (userPreference?.preferredModel) {
    const pref = userPreference.preferredModel;
    if (tool.requiredModels.includes(pref)) return pref;
  }
  return tool.requiredModels[0] || 'glm-4-flash';
}

function _buildAgentPrompt(toolId, params) {
  const p = params || {};
  const builder = PROMPT_BUILDERS[toolId];
  if (builder) return builder(p);
  return [
    { role: 'system', content: '你是龟钮自驭Agent助手，为汽车资讯KOL提供专业支持。' },
    { role: 'user', content: p.text || p.query || '请执行任务' },
  ];
}

const PROMPT_BUILDERS = {
  agent_content_writer: (p) => [
    { role: 'system', content: '你是汽车资讯内容创作Agent。根据提供的车型和主题，生成高质量的汽车资讯内容。风格: ' + (p.style || '专业客观') },
    { role: 'user', content: '车型: ' + (p.carModel || '未知') + '\n主题: ' + (p.topic || '车型评测') + '\n要求: ' + (p.requirements || '800字左右，结构清晰') },
  ],
  agent_data_analyst: (p) => [
    { role: 'system', content: '你是汽车推广数据分析Agent。深度分析推广数据，提供竞品洞察和趋势预测。' },
    { role: 'user', content: '数据: ' + (p.data || '推广数据摘要') + '\n分析方向: ' + (p.direction || 'ROI分析') },
  ],
  agent_auto_publisher: (p) => [
    { role: 'system', content: '你是定时发布策略Agent。分析最佳发布时段，规划多平台发布策略。' },
    { role: 'user', content: '内容类型: ' + (p.contentType || '图文') + '\n目标平台: ' + (p.platforms || '全平台') + '\n发布时段偏好: ' + (p.timeSlot || '晚高峰') },
  ],
  agent_comment_reply: (p) => [
    { role: 'system', content: '你是粉丝互动Agent。根据评论内容生成专业、有温度的回复。' },
    { role: 'user', content: '评论: ' + (p.comment || '') + '\n语气: ' + (p.tone || '专业友好') + '\n品牌: ' + (p.brand || '') },
  ],
  agent_brand_monitor: (p) => [
    { role: 'system', content: '你是品牌舆情监控Agent。分析品牌声量，追踪竞品动态，预警负面舆情。' },
    { role: 'user', content: '监控品牌: ' + (p.brand || '全部') + '\n关注维度: ' + (p.dimensions || '声量,情感,竞品') },
  ],
  agent_commission_tracker: (p) => [
    { role: 'system', content: '你是分佣追踪Agent。追踪分佣链路，计算收益归因，预测未来收益。' },
    { role: 'user', content: '查询内容: ' + (p.contentId || '全部') + '\n时间范围: ' + (p.period || '本月') },
  ],
  agent_video_script: (p) => [
    { role: 'system', content: '你是短视频脚本Agent。生成爆款汽车短视频脚本，含镜头语言和时间轴。' },
    { role: 'user', content: '车型: ' + (p.carModel || '') + '\n视频类型: ' + (p.videoType || '60s竖屏') + '\n卖点: ' + (p.sellingPoints || '') },
  ],
  agent_kol_matcher: (p) => [
    { role: 'system', content: '你是KOL匹配Agent。根据活动需求匹配最合适的KOL，综合评估粉丝量、互动率、专业度。' },
    { role: 'user', content: '活动: ' + (p.activityName || '') + '\n目标受众: ' + (p.targetAudience || '') + '\n预算范围: ' + (p.budget || '不限') },
  ],
};

module.exports = {
  AGENT_TOOL_CATALOG,
  CATEGORIES,
  getToolCatalog,
  getToolById,
  getCategories,
  executeAgentTool,
};
