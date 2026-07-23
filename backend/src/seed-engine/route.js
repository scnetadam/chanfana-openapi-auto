const express = require('express');
const router = express.Router();
const { checkAll, runAll, runProject, checkPermission } = require('./engine');

router.get('/status', (req, res) => {
  try {
    const { checkDataDir } = require('./engine');
    const { PROJECTS } = require('./config');
    const status = {};
    for (const [key, project] of Object.entries(PROJECTS)) {
      status[key] = { name: project.name, ...checkDataDir(project.dataDir) };
    }
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/run', (req, res) => {
  const { project, force, manualConfirmed, ai } = req.body;
  try {
    let result;
    if (project) {
      result = runProject(project, { force: !!force, manualConfirmed: !!manualConfirmed });
    } else {
      result = runAll({ force: !!force, cos: false, manualConfirmed: !!manualConfirmed, ai: ai !== false });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/check-permission', (req, res) => {
  const { operation, manualConfirmed, userRole, amount } = req.body;
  if (!operation) return res.status(400).json({ success: false, error: 'operation 必填' });
  const perm = checkPermission(operation, { manualConfirmed: !!manualConfirmed, userRole: userRole || '', amount: amount || 0 });
  res.json({ success: true, data: perm });
});

router.get('/permissions', (req, res) => {
  const { PERMISSION_GATES } = require('./config');
  const summary = Object.entries(PERMISSION_GATES).map(([op, gate]) => ({
    operation: op,
    autoAllowed: !!gate.autoAllowed,
    requireManual: !!gate.requireManual,
    manualReason: gate.manualReason || null,
    requireRole: gate.requireRole || null,
    maxAmount: gate.maxAmount || null,
  }));
  res.json({ success: true, data: summary });
});

router.get('/data-streams', (req, res) => {
  const { PROJECTS } = require('./config');
  const streams = {};
  for (const [key, project] of Object.entries(PROJECTS)) {
    streams[key] = project.dataStreams ? Object.entries(project.dataStreams).map(([name, config]) => ({
      stream: name,
      files: config.files,
      cosPrefix: config.cosPrefix,
    })) : [];
  }
  res.json({ success: true, data: streams });
});

router.post('/cos-sync', (req, res) => {
  const { project, stream } = req.body;
  const { PROJECTS } = require('./config');
  const { uploadProjectData, uploadByStream } = require('./cos');

  if (project && PROJECTS[project]) {
    const p = PROJECTS[project];
    if (stream && p.dataStreams && p.dataStreams[stream]) {
      uploadByStream({ [project]: p }, { [project]: { written: true } }).then(r => {
        res.json({ success: true, data: { project, stream, synced: true } });
      }).catch(err => {
        res.status(500).json({ success: false, error: err.message });
      });
    } else {
      uploadProjectData(project, p.dataDir, p.files).then(r => {
        res.json({ success: true, data: { project, ...r } });
      }).catch(err => {
        res.status(500).json({ success: false, error: err.message });
      });
    }
  } else {
    res.status(400).json({ success: false, error: 'project 必填且有效' });
  }
});

module.exports = router;
