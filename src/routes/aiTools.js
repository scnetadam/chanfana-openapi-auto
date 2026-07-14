const express = require('express');
const router = express.Router();
const { aiToolUsageStore, opcAppStore } = require('../models/dataStore');
const opcSupportEngine = require('../opcSupportEngine');

router.get('/list', (req, res) => {
  const { userId } = req.query;
  let opcStatus = 'none';
  if (userId) {
    const app = opcAppStore.getLatestByUser(userId);
    if (app) opcStatus = app.status;
  }
  const tools = opcSupportEngine.getAvailableTools(opcStatus);
  res.json({ success: true, data: { tools, opcStatus } });
});

router.post('/:id/subscribe', async (req, res) => {
  const { userId, inputParams } = req.body;
  const toolId = req.params.id;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const app = opcAppStore.getLatestByUser(userId);
  const opcStatus = app?.status || 'none';

  const result = await opcSupportEngine.useAiTool(userId, toolId, opcStatus, inputParams);
  if (!result.success) return res.status(400).json(result);

  aiToolUsageStore.create({
    userId,
    toolId,
    toolName: result.tool.name,
    price: result.price,
    isOpcFree: result.isOpcFree,
    result: typeof result.result === 'string' ? result.result.slice(0, 500) : null,
  });

  if (result.isOpcFree || result.price === 0) {
    opcAppStore.useQuota(userId, 1);
  }

  res.json(result);
});

router.get('/usage', (req, res) => {
  const { userId, page, pageSize } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const usage = aiToolUsageStore.getByUser(userId, page, pageSize);
  const monthlyCount = aiToolUsageStore.getMonthlyUsage(userId);
  res.json({ success: true, data: { ...usage, monthlyCount } });
});

module.exports = router;
