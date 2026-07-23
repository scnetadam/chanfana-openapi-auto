const express = require('express');
const router = express.Router();
const kolTrackEngine = require('../kolTrackEngine');
const { kolTrackStore, KOL_TRACKS } = require('../models/dataStore');

router.get('/classify/:userId', (req, res) => {
  const track = kolTrackEngine.getKolTrack(req.params.userId);
  if (!track) return res.status(404).json({ success: false, error: 'track not found for user' });
  const record = kolTrackStore.getByUserId(req.params.userId);
  res.json({ success: true, data: { userId: req.params.userId, track, trackInfo: KOL_TRACKS[track], record } });
});

router.post('/classify', (req, res) => {
  const { userId, hasEmployment, hasBusinessLicense, monthlyIncomeRange } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  const result = kolTrackEngine.classifyKol(userId, { hasEmployment, hasBusinessLicense, monthlyIncomeRange });
  res.json({ success: true, data: result });
});

router.post('/reclassify', (req, res) => {
  const { userId, newTrack, reason } = req.body;
  if (!userId || !newTrack || !reason) return res.status(400).json({ success: false, error: 'userId, newTrack, reason required' });
  if (!KOL_TRACKS[newTrack]) return res.status(400).json({ success: false, error: 'invalid track' });
  const current = kolTrackEngine.getKolTrack(userId);
  if (current) {
    const validation = kolTrackEngine.validateTrackChange(userId, current, newTrack);
    if (!validation.valid) return res.status(400).json({ success: false, error: validation.reason });
  }
  const result = kolTrackEngine.reclassifyKol(userId, newTrack, reason);
  res.json({ success: true, data: result });
});

router.get('/distribution', (req, res) => {
  const distribution = kolTrackEngine.getTrackDistribution();
  res.json({ success: true, data: distribution });
});

router.get('/config/:track', (req, res) => {
  const config = kolTrackEngine.getTrackConfig(req.params.track);
  if (!config) return res.status(404).json({ success: false, error: 'track config not found' });
  res.json({ success: true, data: { track: req.params.track, ...config } });
});

router.get('/tracks', (req, res) => {
  res.json({ success: true, data: KOL_TRACKS });
});

module.exports = router;
