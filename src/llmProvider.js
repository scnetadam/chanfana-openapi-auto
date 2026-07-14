const axios = require('axios');
const crypto = require('crypto');

const PROVIDER_TYPES = {
  GLM: 'glm',
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek',
  MOONSHOT: 'moonshot',
  BAICHUAN: 'baichuan',
  QWEN: 'qwen',
  CUSTOM: 'custom',
};

const DEFAULT_MODELS = [
  { id: 'glm-4-flash', provider: PROVIDER_TYPES.GLM, name: 'GLM-4-Flash', desc: '快速对话，日常使用', tier: 'free', price: 0.02, opcDiscount: 0.5, contextWindow: 128000 },
  { id: 'glm-4', provider: PROVIDER_TYPES.GLM, name: 'GLM-4', desc: '高级推理，深度分析', tier: 'paid', price: 0.1, opcDiscount: 0.7, contextWindow: 128000 },
  { id: 'glm-4v', provider: PROVIDER_TYPES.GLM, name: 'GLM-4V 视觉', desc: '图片分析，视觉评估', tier: 'paid', price: 0.15, opcDiscount: 0.6, contextWindow: 128000 },
  { id: 'glm-4-plus', provider: PROVIDER_TYPES.GLM, name: 'GLM-4-Plus', desc: '旗舰模型，最强推理', tier: 'paid', price: 0.5, opcDiscount: 0.7, contextWindow: 128000 },
  { id: 'deepseek-chat', provider: PROVIDER_TYPES.DEEPSEEK, name: 'DeepSeek-V3', desc: '高性价比推理模型', tier: 'paid', price: 0.01, opcDiscount: 0.5, contextWindow: 64000 },
  { id: 'deepseek-reasoner', provider: PROVIDER_TYPES.DEEPSEEK, name: 'DeepSeek-R1', desc: '深度推理链模型', tier: 'paid', price: 0.05, opcDiscount: 0.5, contextWindow: 64000 },
  { id: 'qwen-max', provider: PROVIDER_TYPES.QWEN, name: '通义千问-Max', desc: '阿里旗舰模型', tier: 'paid', price: 0.2, opcDiscount: 0.6, contextWindow: 32000 },
  { id: 'qwen-plus', provider: PROVIDER_TYPES.QWEN, name: '通义千问-Plus', desc: '均衡性价比', tier: 'paid', price: 0.08, opcDiscount: 0.6, contextWindow: 128000 },
  { id: 'moonshot-v1-8k', provider: PROVIDER_TYPES.MOONSHOT, name: 'Kimi-8K', desc: '长文本理解专家', tier: 'paid', price: 0.06, opcDiscount: 0.5, contextWindow: 8000 },
  { id: 'moonshot-v1-32k', provider: PROVIDER_TYPES.MOONSHOT, name: 'Kimi-32K', desc: '超长文本处理', tier: 'paid', price: 0.12, opcDiscount: 0.5, contextWindow: 32000 },
];

const PROVIDER_API_MAP = {
  [PROVIDER_TYPES.GLM]: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', envKey: 'GLM_API_KEY' },
  [PROVIDER_TYPES.OPENAI]: { baseURL: 'https://api.openai.com/v1', envKey: 'OPENAI_API_KEY' },
  [PROVIDER_TYPES.DEEPSEEK]: { baseURL: 'https://api.deepseek.com/v1', envKey: 'DEEPSEEK_API_KEY' },
  [PROVIDER_TYPES.MOONSHOT]: { baseURL: 'https://api.moonshot.cn/v1', envKey: 'MOONSHOT_API_KEY' },
  [PROVIDER_TYPES.BAICHUAN]: { baseURL: 'https://api.baichuan-ai.com/v1', envKey: 'BAICHUAN_API_KEY' },
  [PROVIDER_TYPES.QWEN]: { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', envKey: 'QWEN_API_KEY' },
  [PROVIDER_TYPES.CUSTOM]: { baseURL: '', envKey: 'CUSTOM_LLM_API_KEY' },
};

const _providerClients = new Map();

function _getProviderConfig(providerType) {
  const config = PROVIDER_API_MAP[providerType];
  if (!config) return null;
  const envBase = process.env[providerType.toUpperCase() + '_API_BASE'];
  const envKey = process.env[config.envKey];
  return {
    baseURL: envBase || config.baseURL,
    apiKey: envKey || '',
  };
}

function _getProviderClient(providerType) {
  if (_providerClients.has(providerType)) {
    return _providerClients.get(providerType);
  }
  const config = _getProviderConfig(providerType);
  if (!config || !config.apiKey) return null;
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.apiKey,
    },
  });
  _providerClients.set(providerType, client);
  return client;
}

function _getProviderClientWithKey(providerType, apiKey, baseURL) {
  const config = _getProviderConfig(providerType);
  const finalBase = baseURL || (config ? config.baseURL : '');
  const finalKey = apiKey || (config ? config.apiKey : '');
  if (!finalKey) return null;
  return axios.create({
    baseURL: finalBase,
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + finalKey,
    },
  });
}

function getAvailableModels(userPreference, opcStatus) {
  const isOpc = opcStatus === 'approved';
  return DEFAULT_MODELS.map(model => {
    const effectivePrice = isOpc ? +(model.price * model.opcDiscount).toFixed(4) : model.price;
    const isPreferred = userPreference && userPreference.preferredModel === model.id;
    return {
      ...model,
      effectivePrice,
      preferred: isPreferred,
      label: model.price === 0 ? '免费' : (isOpc ? 'OPC ¥' + effectivePrice + '/次' : '¥' + model.price + '/次'),
    };
  });
}

function resolveModel(modelId) {
  return DEFAULT_MODELS.find(m => m.id === modelId) || null;
}

function resolveProvider(modelId) {
  const model = resolveModel(modelId);
  if (!model) return PROVIDER_TYPES.GLM;
  return model.provider;
}

async function chat(messages, modelId, options) {
  const opts = options || {};
  const model = resolveModel(modelId);
  if (!model) throw new Error('Unknown model: ' + modelId);
  const providerType = model.provider;

  let client;
  if (opts.apiKey) {
    client = _getProviderClientWithKey(providerType, opts.apiKey, opts.apiBase);
  } else {
    client = _getProviderClient(providerType);
  }

  if (!client) {
    if (providerType === PROVIDER_TYPES.GLM) {
      const glmClient = require('./glmClient');
      return glmClient.chat(messages, modelId);
    }
    throw new Error('Provider ' + providerType + ' not configured (missing API key)');
  }

  const response = await client.post('/chat/completions', {
    model: modelId,
    messages,
    temperature: opts.temperature || 0.7,
    max_tokens: opts.maxTokens || 4096,
  });

  return response.data;
}

async function chatStream(messages, modelId, options) {
  const opts = options || {};
  const model = resolveModel(modelId);
  if (!model) throw new Error('Unknown model: ' + modelId);
  const providerType = model.provider;

  let client;
  if (opts.apiKey) {
    client = _getProviderClientWithKey(providerType, opts.apiKey, opts.apiBase);
  } else {
    client = _getProviderClient(providerType);
  }

  if (!client) throw new Error('Provider ' + providerType + ' not configured');

  const response = await client.post('/chat/completions', {
    model: modelId,
    messages,
    stream: true,
    temperature: opts.temperature || 0.7,
  }, { responseType: 'stream' });

  return response.data;
}

async function testConnection(modelId, apiKey, apiBase) {
  try {
    const client = _getProviderClientWithKey(
      resolveProvider(modelId),
      apiKey,
      apiBase,
    );
    if (!client) return { success: false, error: 'API key required' };
    const result = await client.post('/chat/completions', {
      model: modelId,
      messages: [{ role: 'user', content: 'Hello, respond with OK' }],
      max_tokens: 10,
    });
    const content = result.data?.choices?.[0]?.message?.content || '';
    return { success: true, response: content, model: modelId };
  } catch (e) {
    return { success: false, error: e.response?.data?.error?.message || e.message };
  }
}

function getProviderTypes() {
  return Object.entries(PROVIDER_TYPES).map(([key, value]) => ({
    key,
    value,
    name: _providerDisplayName(value),
    envKey: PROVIDER_API_MAP[value]?.envKey || '',
    configured: !!_getProviderConfig(value)?.apiKey,
  }));
}

function _providerDisplayName(type) {
  const names = {
    glm: '智谱GLM',
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
    moonshot: 'Moonshot/Kimi',
    baichuan: '百川',
    qwen: '通义千问',
    custom: '自定义OpenAI兼容',
  };
  return names[type] || type;
}

module.exports = {
  PROVIDER_TYPES,
  DEFAULT_MODELS,
  getAvailableModels,
  resolveModel,
  resolveProvider,
  chat,
  chatStream,
  testConnection,
  getProviderTypes,
};
