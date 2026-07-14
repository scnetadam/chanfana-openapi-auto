const express = require('express');
const router = express.Router();

const maasStore = {
  models: [
    {
      id: 'glm-4',
      name: '智谱GLM-4',
      provider: '智谱AI',
      type: '大语言模型',
      description: '智谱AI最新大语言模型，支持多轮对话、代码生成',
      pricing: { input: 0.1, output: 0.1, unit: '元/千tokens' },
      features: ['多轮对话', '代码生成', '知识问答', '长文本'],
      status: 'available',
      isFreeForOpc: true
    },
    {
      id: 'qwen-max',
      name: '通义千问Max',
      provider: '阿里云',
      type: '大语言模型',
      description: '阿里云通义千问旗舰版，支持多模态理解',
      pricing: { input: 0.12, output: 0.12, unit: '元/千tokens' },
      features: ['多模态', '长文本', '代码生成', '数学推理'],
      status: 'available',
      isFreeForOpc: false
    },
    {
      id: 'ernie-4',
      name: '文心一言4.0',
      provider: '百度',
      type: '大语言模型',
      description: '百度文心一言旗舰版，知识增强大模型',
      pricing: { input: 0.12, output: 0.12, unit: '元/千tokens' },
      features: ['知识增强', '多轮对话', '语义理解', '内容创作'],
      status: 'available',
      isFreeForOpc: false
    },
    {
      id: 'hunyuan',
      name: '腾讯混元',
      provider: '腾讯',
      type: '大语言模型',
      description: '腾讯混元大模型，支持多模态和长文本',
      pricing: { input: 0.1, output: 0.1, unit: '元/千tokens' },
      features: ['多模态', '长文本', '代码生成', '逻辑推理'],
      status: 'available',
      isFreeForOpc: true
    },
    {
      id: 'spark-v3',
      name: '讯飞星火V3.5',
      provider: '科大讯飞',
      type: '大语言模型',
      description: '科大讯飞星火认知大模型',
      pricing: { input: 0.08, output: 0.08, unit: '元/千tokens' },
      features: ['语音交互', '多模态', '代码生成', '数学推理'],
      status: 'available',
      isFreeForOpc: false
    }
  ],
  subscriptions: []
};

router.get('/models', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const userSubs = maasStore.subscriptions.filter(s => s.userId === userId);
  
  const modelsWithStatus = maasStore.models.map(model => {
    const sub = userSubs.find(s => s.modelId === model.id);
    return {
      ...model,
      subscribed: !!sub,
      subscription: sub || null
    };
  });
  
  res.json({
    success: true,
    data: {
      models: modelsWithStatus,
      total: modelsWithStatus.length
    }
  });
});

router.get('/models/:modelId', (req, res) => {
  const { modelId } = req.params;
  const model = maasStore.models.find(m => m.id === modelId);
  
  if (!model) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  res.json({
    success: true,
    data: model
  });
});

router.post('/subscribe', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { modelId } = req.body;
  
  const model = maasStore.models.find(m => m.id === modelId);
  if (!model) {
    return res.status(404).json({
      success: false,
      error: '模型不存在'
    });
  }
  
  const existing = maasStore.subscriptions.find(
    s => s.userId === userId && s.modelId === modelId
  );
  
  if (existing) {
    return res.status(400).json({
      success: false,
      error: '已订阅该模型'
    });
  }
  
  const subscription = {
    id: `sub-${Date.now()}`,
    userId,
    modelId,
    modelName: model.name,
    status: 'active',
    subscribedAt: new Date().toISOString(),
    usage: { inputTokens: 0, outputTokens: 0, cost: 0 }
  };
  
  maasStore.subscriptions.push(subscription);
  
  res.json({
    success: true,
    data: subscription,
    message: '模型订阅成功'
  });
});

router.delete('/subscribe/:modelId', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { modelId } = req.params;
  
  const index = maasStore.subscriptions.findIndex(
    s => s.userId === userId && s.modelId === modelId
  );
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '订阅不存在'
    });
  }
  
  maasStore.subscriptions.splice(index, 1);
  
  res.json({
    success: true,
    message: '取消订阅成功'
  });
});

router.get('/subscriptions', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const subscriptions = maasStore.subscriptions.filter(s => s.userId === userId);
  
  res.json({
    success: true,
    data: {
      subscriptions,
      total: subscriptions.length
    }
  });
});

router.post('/chat', async (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { modelId, messages } = req.body;
  
  const subscription = maasStore.subscriptions.find(
    s => s.userId === userId && s.modelId === modelId
  );
  
  if (!subscription) {
    return res.status(403).json({
      success: false,
      error: '未订阅该模型'
    });
  }
  
  const model = maasStore.models.find(m => m.id === modelId);
  
  const response = {
    id: `chat-${Date.now()}`,
    modelId,
    modelName: model.name,
    message: {
      role: 'assistant',
      content: `这是来自${model.name}的模拟响应。实际使用时需要接入对应模型的API。`
    },
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      cost: (100 * model.pricing.input + 50 * model.pricing.output) / 1000
    },
    timestamp: new Date().toISOString()
  };
  
  subscription.usage.inputTokens += response.usage.inputTokens;
  subscription.usage.outputTokens += response.usage.outputTokens;
  subscription.usage.cost += response.usage.cost;
  
  res.json({
    success: true,
    data: response
  });
});

module.exports = router;
