const express = require('express');
const router = express.Router();
const agentToolRegistry = require('../agentToolRegistry');
const { agentToolSubStore, agentToolExecLogStore, opcAppStore, llmPreferenceStore } = require('../models/dataStore');

router.get('/catalog', (req, res) => {
  const { userId, category } = req.query;
  let opcStatus = 'none';
  if (userId) {
    const app = opcAppStore.getLatestByUser(userId);
    if (app) opcStatus = app.status;
  }
  let tools = agentToolRegistry.getToolCatalog(opcStatus);
  if (category) {
    tools = tools.filter(t => t.category === category);
  }
  const categories = agentToolRegistry.getCategories();
  let subscribed = [];
  if (userId) {
    subscribed = agentToolSubStore.getByUser(userId).map(s => s.toolId);
  }
  res.json({ success: true, data: { tools, categories, subscribed } });
});

router.get('/categories', (req, res) => {
  res.json({ success: true, data: agentToolRegistry.getCategories() });
});

router.post('/:toolId/subscribe', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const tool = agentToolRegistry.getToolById(req.params.toolId);
  if (!tool) return res.status(404).json({ success: false, error: 'Agent工具不存在' });
  const sub = agentToolSubStore.subscribe(userId, tool.id);
  res.json({ success: true, data: sub });
});

router.post('/:toolId/unsubscribe', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const sub = agentToolSubStore.unsubscribe(userId, req.params.toolId);
  res.json({ success: true, data: sub });
});

router.get('/installed', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const subs = agentToolSubStore.getByUser(userId);
  const tools = subs.map(sub => {
    const tool = agentToolRegistry.getToolById(sub.toolId);
    return {
      ...sub,
      name: tool?.name || sub.toolId,
      category: tool?.category || '',
      capabilities: tool?.capabilities || [],
    };
  });
  res.json({ success: true, data: tools });
});

router.post('/:toolId/execute', async (req, res) => {
  const { userId, inputParams } = req.body;
  const toolId = req.params.toolId;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const tool = agentToolRegistry.getToolById(toolId);
  if (!tool) return res.status(404).json({ success: false, error: 'Agent工具不存在' });

  const app = opcAppStore.getLatestByUser(userId);
  const opcStatus = app?.status || 'none';
  const userLlmPref = llmPreferenceStore.get(userId);

  const result = await agentToolRegistry.executeAgentTool(userId, toolId, opcStatus, inputParams, userLlmPref);

  if (result.success) {
    agentToolSubStore.incrementUsage(userId, toolId);
    agentToolExecLogStore.create({
      userId,
      toolId,
      toolName: result.tool.name,
      usedModel: result.usedModel,
      price: result.price,
      inputParams: inputParams || {},
      resultPreview: typeof result.result === 'string' ? result.result.slice(0, 500) : '',
      success: true,
    });
  }

  res.json(result);
});

router.get('/logs', (req, res) => {
  const { userId, page, pageSize } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const logs = agentToolExecLogStore.getByUser(userId, page, pageSize);
  res.json({ success: true, data: logs });
});

router.get('/stats', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const stats = agentToolExecLogStore.getStats(userId);
  res.json({ success: true, data: stats });
});

module.exports = router;
