const glmClient = require('./glmClient');
const llmProvider = require('./llmProvider');
const { walletStore, notificationStore, hashStore } = require('./models/dataStore');
const agentPayClient = require('./agentPayClient');
const hashEngine = require('./hashEngine');

const AI_TOOL_CATALOG = [
  { id: 'ai_basic', name: '基础AI评估', type: 'free', price: 0, opcFree: true, desc: '内容质量评估、传播建议', icon: 'star' },
  { id: 'ai_content_opt', name: '内容优化助手', type: 'free', price: 0, opcFree: true, desc: 'AI内容润色、标题优化', icon: 'edit' },
  { id: 'glm4_flash', name: 'GLM-4-Flash', type: 'paid', price: 0.02, opcDiscount: 0.5, opcPrice: 0.01, desc: '快速对话生成，适合日常使用', icon: 'zap' },
  { id: 'glm4', name: 'GLM-4', type: 'paid', price: 0.1, opcDiscount: 0.7, opcPrice: 0.03, desc: '高级推理分析，深度内容评估', icon: 'brain' },
  { id: 'glm4v', name: 'GLM-4V 视觉', type: 'paid', price: 0.15, opcDiscount: 0.6, opcPrice: 0.06, desc: '图片内容分析、视觉质量评估', icon: 'eye' },
  { id: 'ai_data_analysis', name: '高级数据分析', type: 'paid', price: 0.5, opcDiscount: 0.5, opcPrice: 0.25, desc: '推广数据深度分析、竞品洞察', icon: 'chart' },
  { id: 'ai_seo', name: 'SEO优化工具', type: 'paid', price: 0.3, opcDiscount: 0.4, opcPrice: 0.12, desc: '关键词优化、传播策略', icon: 'search' },
];

const OPC_FREE_MONTHLY_QUOTA = 100;
const OPC_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

function getAvailableTools(opcStatus) {
  return AI_TOOL_CATALOG.map(tool => {
    if (opcStatus === OPC_STATUS.APPROVED) {
      return {
        ...tool,
        effectivePrice: tool.opcFree ? 0 : (tool.opcPrice || tool.price),
        discount: tool.opcDiscount || 1,
        label: tool.opcFree ? 'OPC免费' : `OPC ${(tool.opcDiscount * 100).toFixed(0)}%折扣`,
      };
    }
    return {
      ...tool,
      effectivePrice: tool.price,
      discount: 1,
      label: tool.price === 0 ? '免费' : '¥' + tool.price + '/次',
    };
  });
}

async function useAiTool(userId, toolId, opcStatus, inputParams) {
  const tool = AI_TOOL_CATALOG.find(t => t.id === toolId);
  if (!tool) return { success: false, error: '工具不存在' };

  const isOpc = opcStatus === OPC_STATUS.APPROVED;
  let effectivePrice = isOpc ? (tool.opcFree ? 0 : (tool.opcPrice || tool.price)) : tool.price;

  if (effectivePrice > 0) {
    try {
      const payResult = await agentPayClient.execute({
        userId,
        amount: effectivePrice,
        subject: `AI工具: ${tool.name}`,
        payeeId: 'system',
        type: 'ai_tool',
      });
      if (!payResult.success) {
        return { success: false, error: '支付失败: ' + (payResult.error || payResult.decision?.reason || '余额不足') };
      }
    } catch (e) {
      console.error('[OPC] Agent支付失败:', e.message);
      return { success: false, error: '支付服务暂不可用' };
    }
  }

  let aiResult = null;
  if (process.env.GLM_API_KEY) {
    try {
      const model = _toolToModel(toolId);
      const messages = _buildToolPrompt(toolId, inputParams);
      let chatResult;
      try {
        chatResult = await llmProvider.chat(messages, model);
      } catch (_e) {
        chatResult = await glmClient.chat(messages, model);
      }
      aiResult = chatResult.choices?.[0]?.message?.content || '';
    } catch (e) {
      console.error('[OPC] AI调用失败:', e.message);
    }
  }

  notificationStore.create({
    userId,
    type: 'ai_tool',
    title: 'AI工具使用',
    content: `使用${tool.name}，花费¥${effectivePrice.toFixed(2)}`,
  });

  try {
    const hashData = JSON.stringify({ userId, toolId, price: effectivePrice, ts: new Date().toISOString() });
    const { hash, digest } = hashEngine.digest(hashData);
    hashStore.create({
      txId: `aitool_${userId}_${Date.now()}`,
      hash,
      dataDigest: digest,
      dataType: 'opc_identity',
      metadata: { userId, toolId, price: effectivePrice },
    });
  } catch (e) {
    console.error('[OPC] AI工具IP存证失败:', e.message);
  }

  return {
    success: true,
    tool: { id: tool.id, name: tool.name },
    price: effectivePrice,
    result: aiResult,
    isOpcFree: isOpc && tool.opcFree,
  };
}

function _toolToModel(toolId) {
  const map = { glm4_flash: 'glm-4-flash', glm4: 'glm-4', glm4v: 'glm-4v' };
  return map[toolId] || 'glm-4-flash';
}

function _buildToolPrompt(toolId, params) {
  if (toolId === 'ai_basic' || toolId === 'ai_content_opt') {
    return [
      { role: 'system', content: '你是汽车资讯内容优化助手，提供内容质量和优化建议。' },
      { role: 'user', content: params?.text || '请提供内容优化建议' },
    ];
  }
  if (toolId === 'ai_data_analysis') {
    return [
      { role: 'system', content: '你是汽车行业数据分析专家，提供推广数据分析洞察。' },
      { role: 'user', content: params?.query || '请分析我的推广数据' },
    ];
  }
  if (toolId === 'ai_seo') {
    return [
      { role: 'system', content: '你是SEO优化专家，帮助优化汽车资讯内容的传播效果。' },
      { role: 'user', content: params?.text || '请提供SEO优化建议' },
    ];
  }
  return [
    { role: 'system', content: '你是龟钮印信AI助手，为汽车资讯KOL提供专业支持。' },
    { role: 'user', content: params?.text || '你好' },
  ];
}

function getOpcBenefits() {
  return {
    freeQuota: OPC_FREE_MONTHLY_QUOTA,
    freeTools: AI_TOOL_CATALOG.filter(t => t.opcFree).map(t => ({ id: t.id, name: t.name, desc: t.desc })),
    discountTools: AI_TOOL_CATALOG.filter(t => !t.opcFree && t.opcDiscount).map(t => ({
      id: t.id,
      name: t.name,
      originalPrice: t.price,
      opcPrice: t.opcPrice,
      discount: t.opcDiscount,
      desc: t.desc,
    })),
    extraBenefits: [
      '独立运营数据分析面板',
      '优先活动推荐位',
      '专属KOL社群',
      '月度数据报告',
    ],
  };
}

module.exports = {
  AI_TOOL_CATALOG,
  OPC_FREE_MONTHLY_QUOTA,
  OPC_STATUS,
  getAvailableTools,
  useAiTool,
  getOpcBenefits,
};
