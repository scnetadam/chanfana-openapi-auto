const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:80';

const SYSTEM_PROMPTS = {
  verify: `你是「龟钮·自驭」的 AI 数据助手。平台定位是去中心化数据存证集市。

核心功能：
1. 数据市场 — 数据商品货架，购买数据集
2. 数据存证 — 数据 Hash 上链，生成唯一"印痕"
3. 数据收益 — 查看数据贡献收益
4. 数据授权 — 管理数据贡献开关
5. 公证 — 在线公证服务（15% 服务费）
6. 数据治理 — G 端监管看板

定价规则：
- 数据购买方：按数据集定价
- 数据贡献者：50% 分佣
- G 端政府用户：数据购买方免费

回答要求：简洁、准确、友好。纯文本。`,

  seal: `你是「龟钮·印信」的 AI 支付助手。平台定位是 X402 智能微支付协议。

核心功能：
1. 支付 — 个人/Agent 间转账支付
2. Agent 支付 — AI 智能体发起的微交易
3. 收款 — 生成收款码
4. 账单 — 交易流水
5. 钱包 — 余额管理

定价：C 端免费，B 端 ≤2000 免费，>2000 费率 0.38%（封顶 20 元）

回答要求：简洁、准确、友好。纯文本。`,

  deveco: `你是「龟钮·自驭」汽车 AI 智能助手。专注于汽车行业 KOL/KOC 生态与数据服务。

核心能力：
1. KOL 影响力评估 — 基于多维度评分模型分析 KOL 价值
2. 舆情分析 — 实时监测汽车品牌/车型舆情动态
3. 线索管理 — 智能线索评分与分配推荐
4. 商家工作台 — 活动投放、预算管理、ROI 分析
5. 数据市场 — KOL 数据资产交易与确权
6. 智能结算 — 基于 X402 协议的自动化分账

汽车行业知识：
- 熟悉新能源/传统燃油车市场格局
- 了解各品牌定位、销量、口碑
- 掌握汽车营销渠道与 KOL 生态
- 精通车载智能化与自动驾驶趋势

回答要求：专业、简洁、数据驱动。涉及品牌评价需客观中立。`,
};

const PROJECT_INTROS = {
  verify: {
    title: '龟钮·自驭',
    brief: '龟钮·自驭是去中心化数据存证集市，数据 Hash 上链确权，支持数据交易与存证。',
    features: ['数据市场浏览与购买', '数据 Hash 上链存证', '数据贡献收益管理', '数据授权开关', '在线公证服务', 'G 端数据治理看板'],
    shortIntro: '欢迎使用龟钮·自驭！我是自驭 AI 数据助手，可以帮你逛数据市场、查收益、做存证。请长按语音按钮或点击下方指令开始提问。',
    welcome: '欢迎使用龟钮·自驭！我是 AI 数据助手，请长按语音按钮开始提问。',
  },
  seal: {
    title: '龟钮·印信',
    brief: '龟钮·印信是开源智能微支付协议，支持法币+链上双轨结算。',
    features: ['个人/Agent 间支付转账', 'AI Agent 授权额度管理', '收款码生成与扫码支付', '交易流水与账单查询', '钱包余额管理', 'B 端商家工具'],
    shortIntro: '欢迎使用龟钮·印信！我是印信 AI 支付助手，可以帮你管理支付、查账单、设置 Agent 额度。请长按语音按钮或点击下方指令开始提问。',
    welcome: '欢迎使用龟钮·印信！我是 AI 支付助手，请长按语音按钮开始提问。',
  },
  deveco: {
    title: '龟钮·自驭',
    brief: '汽车行业 KOL/KOC 智能生态平台，AI 驱动的影响力评估、舆情监测与智能结算。',
    features: ['KOL 影响力评估与反作弊', '汽车品牌舆情实时监测', 'B 端线索智能评分与管理', '商家活动投放与 ROI 追踪', 'KOL 数据资产确权与交易', 'X402 智能微支付自动分账'],
    shortIntro: '欢迎使用龟钮·自驭！我是汽车 AI 智能助手，可以帮你评估 KOL、分析舆情、管理线索、追踪 ROI。请告诉我你想了解什么？',
    welcome: '欢迎使用龟钮·自驭！我是汽车 AI 智能助手，请问有什么可以帮您？',
  },
};

const SESSION_MEMORY = new Map();

function getSession(userId) {
  if (!userId) return { messages: [], context: {} };
  if (!SESSION_MEMORY.has(userId)) {
    SESSION_MEMORY.set(userId, { messages: [], context: {} });
  }
  const session = SESSION_MEMORY.get(userId);
  if (session.messages.length > 30) session.messages = session.messages.slice(-30);
  return session;
}

async function callAIService(project, message, context) {
  const systemPrompt = SYSTEM_PROMPTS[project] || SYSTEM_PROMPTS.deveco;

  try {
    const res = await axios.post(`${AI_SERVICE_URL}/api/ai-proxy/assistant`, {
      contentId: 'guiniu-deveco-chat',
      brand: '龟钮·自驭',
      model: 'X402',
      question: message,
      chatHistory: [
        { role: 'system', content: systemPrompt },
        ...(context.history || []),
      ],
    }, { timeout: 30000 });

    if (res.data.success) return res.data.data.answer;
    throw new Error(res.data.error || 'AI 服务返回失败');
  } catch (err) {
    console.error('[Deveco AI Proxy] 调用印鉴服务失败:', err.message);
    return generateLocalResponse(project, message);
  }
}

function generateLocalResponse(project, message) {
  const autoKeywords = {
    kol: ['KOL', '博主', '达人', '网红', '大V', '影响力', '权重', '评分'],
    sentiment: ['舆情', '负面', '正面', '品牌', '口碑', '投诉', '召回'],
    clue: ['线索', '客户', '跟进', '分配', '成交', '转化'],
    settle: ['结算', '分账', '支付', '佣金', '分成', '提现'],
    brand: ['比亚迪', '特斯拉', '蔚来', '小鹏', '理想', '华为', '小米', '吉利', '宝马', '奔驰', '奥迪', '丰田'],
    policy: ['政策', '补贴', '购置税', '限购', '限行', '国六', '新能源'],
  };

  for (const [topic, keywords] of Object.entries(autoKeywords)) {
    if (keywords.some(kw => message.includes(kw))) {
      const responses = {
        kol: '关于KOL影响力评估，我们采用七维度评分模型：销售业绩(25%)、内容质量(20%)、受众互动(15%)、转化效率(15%)、合规分(10%)、平台活跃(8%)、推荐表现(7%)。KOL分为S+/S/A+/A/B+/B/C七个等级，不同等级对应不同的佣金上限。如需查看具体KOL的评分详情，可使用 /api/kol-engine/profile 接口。',
        sentiment: '我们的舆情分析引擎覆盖6大汽车行业主题：新能源、价格战、安全、智能化、品牌声誉、政策法规。支持17+汽车品牌的实时舆情监测，可分析品牌情感趋势和热点话题。使用 /api/sentiment/dashboard 可查看实时舆情概览。',
        clue: '线索管理系统支持8种来源渠道的智能评分，包括KOL推荐(权重1.2)、活动报名(1.1)、数据市场(1.0)等。线索生命周期包含7个状态节点：新线索→已分配→已联系→已甄别→已成交/已流失→回收。使用 /api/clue/stats 查看线索漏斗。',
        settle: '智能结算系统基于X402微支付协议，支持支付宝/微信/数字人民币三通道。核心特性：双次确认机制、四流归集(订单流/资金流/税务流/存证流)、龟钮点累计触发分账、监管账户与风险看板。B轨税务预扣20%，C轨经营所得全额拨付。',
        brand: '我们实时监测17+主流汽车品牌舆情，包括新能源品牌(比亚迪/特斯拉/蔚来/小鹏/理想/华为/小米)和传统品牌(吉利/长安/宝马/奔驰/奥迪/丰田等)。可按品牌维度分析情感分布、热点话题和KOL影响。使用 /api/sentiment/brand-sentiment 查看详情。',
        policy: '政策法规模块跟踪国六排放、购置税优惠、限购限行、新能源指标、以旧换新等政策动态。政策变动直接影响汽车消费舆情，我们的舆情引擎已内置政策关键词识别。',
      };
      return responses[topic];
    }
  }

  return '您好！我是龟钮·自驭 AI 汽车智能助手。我可以帮您：\n1. 评估KOL影响力和反作弊\n2. 分析汽车品牌舆情动态\n3. 管理B端线索与转化\n4. 追踪活动投放ROI\n5. 了解数据市场与智能结算\n\n请告诉我您想了解哪方面？';
}

const QUICK_COMMANDS = [
  { command: 'KOL排行', description: '查看KOL影响力排行榜', action: 'kol-ranking', page: '/pages/kolEngine/index' },
  { command: '舆情概览', description: '查看汽车行业舆情概况', action: 'sentiment-dashboard', page: '/pages/sentiment/index' },
  { command: '我的线索', description: '查看我的线索列表', action: 'my-clues', page: '/pages/clue/index' },
  { command: '数据市场', description: '浏览数据市场商品', action: 'data-market', page: '/pages/dataMarket/index' },
  { command: '钱包余额', description: '查看钱包余额与交易', action: 'wallet', page: '/pages/wallet/index' },
  { command: '收益领取', description: '查看待领取收益', action: 'earnings', page: '/pages/dataEarnings/index' },
];

router.post('/chat', async (req, res) => {
  const { project, userId, message, voiceMode, context } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'message 为必填' });

  const session = getSession(userId);
  const chatContext = { userId: userId || '', history: session.messages.slice(-8), ...context };

  try {
    const reply = await callAIService(project || 'deveco', message, chatContext);

    if (userId) {
      session.messages.push({ role: 'user', content: message });
      session.messages.push({ role: 'assistant', content: reply });
    }

    const chatId = 'chat_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');

    res.json({
      success: true,
      data: {
        chatId,
        reply,
        voiceMode: !!voiceMode,
        project: project || 'deveco',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Deveco AI Chat Error]', err.message);
    res.json({ success: true, data: { reply: '抱歉，服务暂时不可用，请稍后再试。', timestamp: new Date().toISOString() } });
  }
});

router.post('/voice-command', async (req, res) => {
  const { project, text } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text 为必填' });

  const intentMap = {
    'KOL排行': { action: 'kol-ranking', page: '/pages/kolEngine/index' },
    'KOL': { action: 'kol-ranking', page: '/pages/kolEngine/index' },
    '影响力': { action: 'kol-ranking', page: '/pages/kolEngine/index' },
    '舆情': { action: 'sentiment-dashboard', page: '/pages/sentiment/index' },
    '品牌': { action: 'brand-sentiment', page: '/pages/sentiment/index' },
    '负面': { action: 'negative-alerts', page: '/pages/sentiment/index' },
    '线索': { action: 'my-clues', page: '/pages/clue/index' },
    '客户': { action: 'my-clues', page: '/pages/clue/index' },
    '数据市场': { action: 'data-market', page: '/pages/dataMarket/index' },
    '收益': { action: 'earnings', page: '/pages/dataEarnings/index' },
    '存证': { action: 'notary', page: '/pages/notary/index' },
    '授权': { action: 'consent', page: '/pages/dataConsent/index' },
    '治理': { action: 'governance', page: '/pages/governance/index' },
    '公证': { action: 'notary', page: '/pages/notary/index' },
    '钱包': { action: 'wallet', page: '/pages/wallet/index' },
    '结算': { action: 'settle', page: '/pages/wallet/index' },
    '活动': { action: 'merchant-activity', page: '/pages/merchant/index' },
    '介绍': { action: 'intro', page: '' },
  };

  let matched = null;
  for (const [keyword, intent] of Object.entries(intentMap)) {
    if (text.includes(keyword)) { matched = intent; break; }
  }

  res.json({ success: true, data: { text, intent: matched || { action: 'chat', page: '' }, project: project || 'deveco' } });
});

router.get('/intro', async (req, res) => {
  const project = req.query.project || 'deveco';
  const intro = PROJECT_INTROS[project] || PROJECT_INTROS.deveco;
  res.json({ success: true, data: intro });
});

router.get('/quick-commands', (req, res) => {
  res.json({ success: true, data: QUICK_COMMANDS });
});

router.get('/health', async (req, res) => {
  try {
    await axios.get(`${AI_SERVICE_URL}/api/ai-proxy/assistant`, { timeout: 5000 });
    res.json({ success: true, data: { status: 'connected', service: AI_SERVICE_URL } });
  } catch (e) {
    res.json({ success: true, data: { status: 'disconnected', service: AI_SERVICE_URL, fallback: 'local_response_active', error: e.message } });
  }
});

router.post('/session/clear', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  SESSION_MEMORY.delete(userId);
  res.json({ success: true, data: { userId, message: '会话已清除' } });
});

router.get('/session/history', (req, res) => {
  const { userId, limit = 20 } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 必填' });
  const session = getSession(userId);
  const messages = session.messages.slice(-Number(limit));
  res.json({ success: true, data: { userId, messages, total: session.messages.length } });
});

router.post('/analyze-kol', (req, res) => {
  try {
    const { kolName, platform, followers, avgEngagement, contentQuality, salesCount } = req.body;
    if (!kolName) return res.status(400).json({ success: false, error: 'kolName 必填' });

    const score = Math.min(100, Math.round(
      (Math.min(1, (salesCount || 0) / 100) * 25) +
      ((contentQuality || 0.5) * 20) +
      (Math.min(1, (avgEngagement || 0) / 10) * 15) +
      (Math.min(1, (followers || 0) / 100000) * 15) +
      25
    ));

    const tier = score >= 90 ? 'S+' : score >= 75 ? 'S' : score >= 60 ? 'A+' : score >= 45 ? 'A' : score >= 30 ? 'B+' : score >= 15 ? 'B' : 'C';

    const suggestion = score >= 60
      ? `推荐合作。${kolName}的综合评分${score}分（${tier}级），建议佣金上限${score >= 75 ? '40%' : score >= 60 ? '35%' : '30%'}。`
      : `建议观望。${kolName}的综合评分${score}分（${tier}级），影响力尚需提升。`;

    res.json({
      success: true,
      data: {
        kolName,
        platform: platform || 'general',
        score,
        tier,
        suggestion,
        dimensions: {
          salesPerformance: Math.min(100, Math.round((salesCount || 0) / 100 * 25)),
          contentQuality: Math.round((contentQuality || 0.5) * 100 * 0.2),
          audienceEngagement: Math.min(100, Math.round((avgEngagement || 0) / 10 * 15)),
          followerBase: Math.min(100, Math.round((followers || 0) / 100000 * 15)),
          complianceScore: 25,
        },
      },
    });
  } catch (e) {
    console.error('[ai] analyze-kol错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/analyze-brand', (req, res) => {
  try {
    const { brand } = req.body;
    if (!brand) return res.status(400).json({ success: false, error: 'brand 必填' });

    const brandProfiles = {
      '比亚迪': { sentiment: 0.72, marketShare: 35, newEnergy: true, topModel: '秦PLUS DM-i' },
      '特斯拉': { sentiment: 0.68, marketShare: 8, newEnergy: true, topModel: 'Model Y' },
      '蔚来': { sentiment: 0.65, marketShare: 3, newEnergy: true, topModel: 'ES6' },
      '小鹏': { sentiment: 0.62, marketShare: 2, newEnergy: true, topModel: 'G6' },
      '理想': { sentiment: 0.75, marketShare: 4, newEnergy: true, topModel: 'L7' },
      '华为': { sentiment: 0.80, marketShare: 5, newEnergy: true, topModel: '问界M7' },
      '小米': { sentiment: 0.78, marketShare: 1, newEnergy: true, topModel: 'SU7' },
      '吉利': { sentiment: 0.70, marketShare: 10, newEnergy: false, topModel: '星越L' },
      '宝马': { sentiment: 0.72, marketShare: 4, newEnergy: false, topModel: 'iX3' },
      '奔驰': { sentiment: 0.71, marketShare: 3, newEnergy: false, topModel: 'EQE' },
      '奥迪': { sentiment: 0.69, marketShare: 3, newEnergy: false, topModel: 'Q4 e-tron' },
      '丰田': { sentiment: 0.73, marketShare: 8, newEnergy: false, topModel: '凯美瑞' },
    };

    const profile = brandProfiles[brand] || { sentiment: 0.5, marketShare: 0, newEnergy: false, topModel: '未知' };

    res.json({
      success: true,
      data: {
        brand,
        ...profile,
        sentimentLabel: profile.sentiment >= 0.7 ? 'positive' : profile.sentiment >= 0.4 ? 'neutral' : 'negative',
        recommendation: profile.sentiment >= 0.7
          ? `${brand}舆情偏正面，推荐加大KOL合作投放。`
          : profile.sentiment >= 0.5
          ? `${brand}舆情中性，建议持续监测并优化内容策略。`
          : `${brand}舆情偏负面，建议关注负面话题并及时公关。`,
      },
    });
  } catch (e) {
    console.error('[ai] analyze-brand错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
