const express = require('express');
const router = express.Router();
const { WeightCoordinator, Orchestrator } = require('./engine');

router.post('/weight', (req, res) => {
  const { userId, agentId, duration, interactions, shareDepth, project, dryRun } = req.body;
  if (!userId || !agentId) return res.status(400).json({ success: false, error: 'userId, agentId required' });

  const result = WeightCoordinator.calculateWeight({
    userId, agentId,
    duration: duration || 0,
    interactions: interactions || 0,
    shareDepth: shareDepth || 0,
    project: project || 'seal',
    dryRun: !!dryRun,
  });

  res.json({ success: true, data: result });
});

router.post('/weight/batch', (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) return res.status(400).json({ success: false, error: 'records array required' });
  res.json({ success: true, data: WeightCoordinator.batchSettle(records) });
});

router.post('/payment', async (req, res) => {
  const settlement = req.body;
  if (!settlement || !settlement.totalAmount) return res.status(400).json({ success: false, error: 'settlement data required' });
  const result = await Orchestrator.orchestratePayment(settlement);
  res.json({ success: true, data: result });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: WeightCoordinator.stats() });
});

router.post('/retry', (req, res) => {
  const retried = WeightCoordinator.retryFailed();
  res.json({ success: true, data: retried });
});

router.post('/process', (req, res) => {
  const result = WeightCoordinator.processPending();
  res.json({ success: true, data: result });
});

router.get('/dead-letters', (req, res) => {
  res.json({ success: true, data: WeightCoordinator.getDeadLetters() });
});

router.post('/dead-letters/replay', (req, res) => {
  const { opId } = req.body;
  if (!opId) return res.status(400).json({ success: false, error: 'opId required' });
  const result = WeightCoordinator.replayFromDeadLetter(opId);
  if (!result) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: result });
});

module.exports = router;
