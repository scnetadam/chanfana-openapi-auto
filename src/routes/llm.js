const express = require('express');
const router = express.Router();
const llmProvider = require('../llmProvider');
const { llmPreferenceStore, llmApiKeyStore, opcAppStore } = require('../models/dataStore');

router.get('/models', (req, res) => {
  const { userId } = req.query;
  let opcStatus = 'none';
  let userPref = null;
  if (userId) {
    const app = opcAppStore.getLatestByUser(userId);
    if (app) opcStatus = app.status;
    userPref = llmPreferenceStore.get(userId);
  }
  const models = llmProvider.getAvailableModels(userPref, opcStatus);
  const providers = llmProvider.getProviderTypes();
  res.json({ success: true, data: { models, providers, userPreference: userPref } });
});

router.get('/providers', (req, res) => {
  const providers = llmProvider.getProviderTypes();
  res.json({ success: true, data: providers });
});

router.get('/preference/:userId', (req, res) => {
  const pref = llmPreferenceStore.get(req.params.userId);
  const apiKeys = llmApiKeyStore.getByUser(req.params.userId).map(k => ({
    provider: k.provider,
    apiBase: k.apiBase,
    hasKey: true,
    createdAt: k.createdAt,
  }));
  res.json({ success: true, data: { preference: pref, apiKeys } });
});

router.post('/preference/:userId', (req, res) => {
  const { preferredModel, fallbackModel, temperature, maxTokens } = req.body;
  const pref = llmPreferenceStore.set(req.params.userId, {
    preferredModel: preferredModel || '',
    fallbackModel: fallbackModel || 'glm-4-flash',
    temperature: temperature || 0.7,
    maxTokens: maxTokens || 4096,
  });
  res.json({ success: true, data: pref });
});

router.post('/preference/:userId/model', (req, res) => {
  const { modelId } = req.body;
  if (!modelId) return res.status(400).json({ success: false, error: 'modelId 为必填' });
  const model = llmProvider.resolveModel(modelId);
  if (!model) return res.status(400).json({ success: false, error: '模型不存在: ' + modelId });
  const pref = llmPreferenceStore.setPreferredModel(req.params.userId, modelId);
  res.json({ success: true, data: pref });
});

router.post('/apikey/:userId', (req, res) => {
  const { provider, apiKey, apiBase } = req.body;
  if (!provider || !apiKey) return res.status(400).json({ success: false, error: 'provider 和 apiKey 为必填' });
  const key = llmApiKeyStore.set(req.params.userId, provider, apiKey, apiBase);
  res.json({ success: true, data: { provider: key.provider, apiBase: key.apiBase, hasKey: true } });
});

router.delete('/apikey/:userId/:provider', (req, res) => {
  llmApiKeyStore.delete(req.params.userId, req.params.provider);
  res.json({ success: true });
});

router.post('/chat', async (req, res) => {
  const { messages, model, userId, temperature, maxTokens } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: 'messages 为必填数组' });
  }
  const modelId = model || 'glm-4-flash';
  try {
    let opts = { temperature: temperature || 0.7, maxTokens: maxTokens || 4096 };
    if (userId) {
      const userKey = llmApiKeyStore.get(userId, llmProvider.resolveProvider(modelId));
      if (userKey) {
        opts.apiKey = userKey.apiKey;
        opts.apiBase = userKey.apiBase || undefined;
      }
    }
    const result = await llmProvider.chat(messages, modelId, opts);
    res.json({ success: true, data: result, model: modelId });
  } catch (err) {
    console.error('[LLM Chat Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/test', async (req, res) => {
  const { modelId, apiKey, apiBase } = req.body;
  if (!modelId) return res.status(400).json({ success: false, error: 'modelId 为必填' });
  const result = await llmProvider.testConnection(modelId, apiKey, apiBase);
  res.json(result);
});

module.exports = router;
