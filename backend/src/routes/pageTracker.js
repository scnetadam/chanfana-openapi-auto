const express = require('express');
const router = express.Router();
const { pageTrackEvents } = require('../models/dataStore');

router.post('/track', (req, res) => {
  try {
    const { userId, page, project, duration, interactions, referrer, sessionId, userAgent } = req.body;
    if (!page || !project) return res.status(400).json({ success: false, error: 'page 和 project 必填' });

    const id = 'pe_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const event = {
      id,
      userId: userId || 'anonymous',
      page,
      project,
      duration: duration || 0,
      interactions: interactions || 0,
      referrer: referrer || '',
      sessionId: sessionId || '',
      userAgent: userAgent || '',
      visitedAt: new Date().toISOString()
    };
    pageTrackEvents.set(id, event);
    res.json({ success: true, data: event, message: '事件上报成功' });
  } catch (e) {
    console.error('[pageTracker] track错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/batch', (req, res) => {
  try {
    const { events: newEvents } = req.body;
    if (!newEvents || !Array.isArray(newEvents)) return res.status(400).json({ success: false, error: 'events 数组必填' });

    const added = newEvents.map(e => {
      const id = 'pe_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const event = {
        id,
        userId: e.userId || 'anonymous',
        page: e.page,
        project: e.project,
        duration: e.duration || 0,
        interactions: e.interactions || 0,
        referrer: e.referrer || '',
        sessionId: e.sessionId || '',
        visitedAt: e.visitedAt || new Date().toISOString()
      };
      pageTrackEvents.set(id, event);
      return event;
    });
    res.json({ success: true, data: { count: added.length }, message: '批量上报成功' });
  } catch (e) {
    console.error('[pageTracker] batch错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/analytics', (req, res) => {
  try {
    const { project, page, period = 'today', userId } = req.query;
    let events = pageTrackEvents.getAll();

    const now = new Date();
    let start;
    if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'week') start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    else if (period === 'month') start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    else start = new Date(0);

    events = events.filter(e => new Date(e.visitedAt) >= start);
    if (project) events = events.filter(e => e.project === project);
    if (page) events = events.filter(e => e.page === page);
    if (userId) events = events.filter(e => e.userId === userId);

    const totalVisits = events.length;
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const totalDuration = events.reduce((s, e) => s + e.duration, 0);
    const totalInteractions = events.reduce((s, e) => s + e.interactions, 0);
    const avgDuration = totalVisits ? Math.round(totalDuration / totalVisits) : 0;
    const bounceRate = totalVisits ? Math.round((events.filter(e => e.duration < 3).length / totalVisits) * 100) : 0;

    const byPage = {};
    events.forEach(e => {
      if (!byPage[e.page]) byPage[e.page] = { visits: 0, uniqueUsers: new Set(), duration: 0 };
      byPage[e.page].visits++;
      byPage[e.page].uniqueUsers.add(e.userId);
      byPage[e.page].duration += e.duration;
    });

    const pageStats = Object.entries(byPage).map(([p, stats]) => ({
      page: p,
      visits: stats.visits,
      uniqueUsers: stats.uniqueUsers.size,
      avgDuration: Math.round(stats.duration / stats.visits)
    })).sort((a, b) => b.visits - a.visits);

    const byProject = {};
    events.forEach(e => {
      if (!byProject[e.project]) byProject[e.project] = { visits: 0, uniqueUsers: new Set() };
      byProject[e.project].visits++;
      byProject[e.project].uniqueUsers.add(e.userId);
    });

    res.json({
      success: true,
      data: {
        period,
        totalVisits,
        uniqueUsers,
        totalDuration,
        totalInteractions,
        avgDuration,
        bounceRate: bounceRate + '%',
        byPage: pageStats,
        byProject: Object.entries(byProject).map(([p, s]) => ({ project: p, visits: s.visits, uniqueUsers: s.uniqueUsers.size }))
      }
    });
  } catch (e) {
    console.error('[pageTracker] analytics错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/weighted-score', (req, res) => {
  try {
    const { userId, project, period = 'week' } = req.query;
    let events = pageTrackEvents.getAll();

    const now = new Date();
    let start;
    if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'week') start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    else if (period === 'month') start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    else start = new Date(0);

    events = events.filter(e => new Date(e.visitedAt) >= start);
    if (userId) events = events.filter(e => e.userId === userId);
    if (project) events = events.filter(e => e.project === project);

    if (events.length === 0) return res.json({ success: true, data: { weight: 0, dimensions: {}, message: '无数据' } });

    const visitCount = events.length;
    const uniqueDays = new Set(events.map(e => e.visitedAt.split('T')[0])).size;
    const totalDuration = events.reduce((s, e) => s + e.duration, 0);
    const totalInteractions = events.reduce((s, e) => s + e.interactions, 0);
    const avgDuration = totalDuration / visitCount;

    const dimensions = {
      visitScore: Math.min(1.0, visitCount / 100) * 0.3,
      frequencyScore: Math.min(1.0, uniqueDays / 7) * 0.2,
      depthScore: Math.min(1.0, avgDuration / 300) * 0.25,
      interactionScore: Math.min(1.0, totalInteractions / 50) * 0.25
    };

    const totalWeight = Object.values(dimensions).reduce((s, v) => s + v, 0);

    res.json({
      success: true,
      data: {
        userId: userId || 'all',
        project: project || 'all',
        period,
        weight: Math.round(totalWeight * 10000) / 10000,
        dimensions: {
          visitScore: Math.round(dimensions.visitScore * 10000) / 10000,
          frequencyScore: Math.round(dimensions.frequencyScore * 10000) / 10000,
          depthScore: Math.round(dimensions.depthScore * 10000) / 10000,
          interactionScore: Math.round(dimensions.interactionScore * 10000) / 10000
        },
        raw: { visitCount, uniqueDays, totalDuration, avgDuration: Math.round(avgDuration), totalInteractions }
      }
    });
  } catch (e) {
    console.error('[pageTracker] weighted-score错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
