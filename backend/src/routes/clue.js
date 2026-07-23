const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { clues, clueAssignments, clueFollowups, users, kolRegistrations } = require('../models/dataStore');

const CLUE_STATUS = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  CONVERTED: 'converted',
  LOST: 'lost',
  RECYCLED: 'recycled',
};

const CLUE_STATUS_TRANSITIONS = {
  [CLUE_STATUS.NEW]: [CLUE_STATUS.ASSIGNED, CLUE_STATUS.LOST],
  [CLUE_STATUS.ASSIGNED]: [CLUE_STATUS.CONTACTED, CLUE_STATUS.RECYCLED, CLUE_STATUS.LOST],
  [CLUE_STATUS.CONTACTED]: [CLUE_STATUS.QUALIFIED, CLUE_STATUS.RECYCLED, CLUE_STATUS.LOST],
  [CLUE_STATUS.QUALIFIED]: [CLUE_STATUS.CONVERTED, CLUE_STATUS.LOST],
  [CLUE_STATUS.CONVERTED]: [],
  [CLUE_STATUS.LOST]: [CLUE_STATUS.RECYCLED],
  [CLUE_STATUS.RECYCLED]: [CLUE_STATUS.ASSIGNED],
};

const CLUE_SOURCES = {
  kol_referral: { label: 'KOL推荐', weight: 1.2 },
  data_market: { label: '数据市场', weight: 1.0 },
  activity: { label: '活动报名', weight: 1.1 },
  website: { label: '官网注册', weight: 0.8 },
  advertisement: { label: '广告投放', weight: 0.9 },
  offline: { label: '线下拓展', weight: 1.0 },
  referral: { label: '老客转介', weight: 1.3 },
  other: { label: '其他', weight: 0.7 },
};

function calcClueScore(clue) {
  let score = 50;
  const sourceWeight = CLUE_SOURCES[clue.source]?.weight || 0.7;
  score *= sourceWeight;
  if (clue.budget && clue.budget >= 10000) score += 20;
  else if (clue.budget && clue.budget >= 5000) score += 10;
  if (clue.company) score += 10;
  if (clue.intent === 'high') score += 15;
  else if (clue.intent === 'medium') score += 5;
  if (clue.kolReferralId) score += 10;
  return Math.min(100, Math.round(score));
}

router.post('/create', (req, res) => {
  try {
    const {
      merchantId, contactName, contactPhone, contactEmail, company,
      source, kolReferralId, intent, budget, remark, tags,
      carModel, region,
    } = req.body;
    if (!contactName && !contactPhone) {
      return res.status(400).json({ success: false, error: 'contactName 或 contactPhone 至少填一项' });
    }

    const dupCheck = contactPhone
      ? clues.findOne(c => c.contactPhone === contactPhone && c.status !== CLUE_STATUS.LOST)
      : null;
    if (dupCheck) {
      return res.json({ success: true, data: dupCheck, message: '线索已存在', duplicate: true });
    }

    const id = 'clue_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const clue = {
      id,
      merchantId: merchantId || '',
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      contactEmail: contactEmail || '',
      company: company || '',
      source: source || 'other',
      sourceLabel: CLUE_SOURCES[source || 'other']?.label || '其他',
      kolReferralId: kolReferralId || null,
      intent: intent || 'medium',
      budget: budget ? Number(budget) : null,
      carModel: carModel || '',
      region: region || '',
      remark: remark || '',
      tags: tags || [],
      score: 0,
      status: CLUE_STATUS.NEW,
      assignedTo: null,
      followupCount: 0,
      lastFollowupAt: null,
      convertedAt: null,
      lostReason: null,
      statusHistory: [{ status: CLUE_STATUS.NEW, at: new Date().toISOString(), by: 'system' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clue.score = calcClueScore(clue);

    clues.set(id, clue);

    if (kolReferralId) {
      const kol = kolRegistrations.findOne(k => k.userId === kolReferralId || k.id === kolReferralId);
      if (kol) {
        kolRegistrations.withLock(kol.id, (item) => {
          item.referralCount = (item.referralCount || 0) + 1;
          item.updatedAt = new Date().toISOString();
          return item;
        });
      }
    }

    res.json({ success: true, data: clue, message: '线索创建成功' });
  } catch (e) {
    console.error('[clue] create错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/batch-create', (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items 数组必填' });
    }

    const created = [];
    const skipped = [];

    items.forEach(item => {
      if (!item.contactName && !item.contactPhone) {
        skipped.push({ ...item, reason: '缺少联系人信息' });
        return;
      }
      const dupCheck = item.contactPhone
        ? clues.findOne(c => c.contactPhone === item.contactPhone && c.status !== CLUE_STATUS.LOST)
        : null;
      if (dupCheck) {
        skipped.push({ ...item, reason: '线索已存在', existingId: dupCheck.id });
        return;
      }

      const id = 'clue_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      const clue = {
        id,
        merchantId: item.merchantId || '',
        contactName: item.contactName || '',
        contactPhone: item.contactPhone || '',
        contactEmail: item.contactEmail || '',
        company: item.company || '',
        source: item.source || 'other',
        sourceLabel: CLUE_SOURCES[item.source || 'other']?.label || '其他',
        kolReferralId: item.kolReferralId || null,
        intent: item.intent || 'medium',
        budget: item.budget ? Number(item.budget) : null,
        carModel: item.carModel || '',
        region: item.region || '',
        remark: item.remark || '',
        tags: item.tags || [],
        score: 0,
        status: CLUE_STATUS.NEW,
        assignedTo: null,
        followupCount: 0,
        lastFollowupAt: null,
        convertedAt: null,
        lostReason: null,
        statusHistory: [{ status: CLUE_STATUS.NEW, at: new Date().toISOString(), by: 'system' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      clue.score = calcClueScore(clue);
      clues.set(id, clue);
      created.push(clue);
    });

    res.json({
      success: true,
      data: { created: created.length, skipped: skipped.length, createdItems: created, skippedItems: skipped },
    });
  } catch (e) {
    console.error('[clue] batch-create错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/assign', (req, res) => {
  try {
    const { clueId, assignedTo, assignedBy, team } = req.body;
    if (!clueId || !assignedTo) {
      return res.status(400).json({ success: false, error: 'clueId 和 assignedTo 必填' });
    }

    const clue = clues.get(clueId);
    if (!clue) return res.status(404).json({ success: false, error: '线索不存在' });

    const allowed = CLUE_STATUS_TRANSITIONS[clue.status] || [];
    if (!allowed.includes(CLUE_STATUS.ASSIGNED) && clue.status !== CLUE_STATUS.NEW) {
      return res.status(400).json({ success: false, error: `线索状态不允许分配: ${clue.status}`, allowed });
    }

    const assignId = 'ca_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const assignment = {
      id: assignId,
      clueId,
      assignedTo,
      assignedBy: assignedBy || 'system',
      team: team || '',
      status: 'active',
      assignedAt: new Date().toISOString(),
    };
    clueAssignments.set(assignId, assignment);

    clue.status = CLUE_STATUS.ASSIGNED;
    clue.assignedTo = assignedTo;
    clue.team = team || clue.team;
    clue.statusHistory.push({ status: CLUE_STATUS.ASSIGNED, at: new Date().toISOString(), by: assignedBy || 'system', assignedTo });
    clue.updatedAt = new Date().toISOString();
    clues.set(clueId, clue);

    res.json({ success: true, data: { clue, assignment }, message: '线索分配成功' });
  } catch (e) {
    console.error('[clue] assign错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/batch-assign', (req, res) => {
  try {
    const { clueIds, assignedTo, assignedBy, team } = req.body;
    if (!clueIds || !Array.isArray(clueIds) || !assignedTo) {
      return res.status(400).json({ success: false, error: 'clueIds 数组和 assignedTo 必填' });
    }

    const results = { assigned: 0, skipped: 0, details: [] };

    clueIds.forEach(clueId => {
      const clue = clues.get(clueId);
      if (!clue) {
        results.skipped++;
        results.details.push({ clueId, reason: '不存在' });
        return;
      }
      if (clue.status !== CLUE_STATUS.NEW && clue.status !== CLUE_STATUS.RECYCLED) {
        results.skipped++;
        results.details.push({ clueId, reason: `状态不允许: ${clue.status}` });
        return;
      }

      const assignId = 'ca_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      clueAssignments.set(assignId, {
        id: assignId,
        clueId,
        assignedTo,
        assignedBy: assignedBy || 'system',
        team: team || '',
        status: 'active',
        assignedAt: new Date().toISOString(),
      });

      clue.status = CLUE_STATUS.ASSIGNED;
      clue.assignedTo = assignedTo;
      clue.team = team || clue.team;
      clue.statusHistory.push({ status: CLUE_STATUS.ASSIGNED, at: new Date().toISOString(), by: assignedBy || 'system', assignedTo });
      clue.updatedAt = new Date().toISOString();
      clues.set(clueId, clue);
      results.assigned++;
      results.details.push({ clueId, status: 'assigned' });
    });

    res.json({ success: true, data: results });
  } catch (e) {
    console.error('[clue] batch-assign错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/transition', (req, res) => {
  try {
    const { clueId, newStatus, operator, lostReason, note } = req.body;
    if (!clueId || !newStatus) {
      return res.status(400).json({ success: false, error: 'clueId 和 newStatus 必填' });
    }

    const clue = clues.get(clueId);
    if (!clue) return res.status(404).json({ success: false, error: '线索不存在' });

    const allowed = CLUE_STATUS_TRANSITIONS[clue.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `状态转换不允许: ${clue.status} -> ${newStatus}`,
        currentStatus: clue.status,
        allowedTransitions: allowed,
      });
    }

    clue.status = newStatus;
    clue.updatedAt = new Date().toISOString();

    if (newStatus === CLUE_STATUS.LOST) {
      clue.lostReason = lostReason || '未说明';
    }
    if (newStatus === CLUE_STATUS.CONVERTED) {
      clue.convertedAt = new Date().toISOString();
    }

    clue.statusHistory.push({
      status: newStatus,
      at: new Date().toISOString(),
      by: operator || 'system',
      note: note || '',
      lostReason: newStatus === CLUE_STATUS.LOST ? lostReason : undefined,
    });

    clues.set(clueId, clue);

    if (newStatus === CLUE_STATUS.CONVERTED && clue.kolReferralId) {
      const kol = kolRegistrations.findOne(k => k.userId === clue.kolReferralId || k.id === clue.kolReferralId);
      if (kol) {
        kolRegistrations.withLock(kol.id, (item) => {
          item.conversionCount = (item.conversionCount || 0) + 1;
          item.totalEarnings = (item.totalEarnings || 0) + (clue.budget || 0) * (item.commissionRate || 0.05);
          item.updatedAt = new Date().toISOString();
          return item;
        });
      }
    }

    res.json({ success: true, data: clue, message: `线索状态已更新为: ${newStatus}` });
  } catch (e) {
    console.error('[clue] transition错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/followup', (req, res) => {
  try {
    const { clueId, operator, method, content, nextFollowupAt, result } = req.body;
    if (!clueId || !content) {
      return res.status(400).json({ success: false, error: 'clueId 和 content 必填' });
    }

    const clue = clues.get(clueId);
    if (!clue) return res.status(404).json({ success: false, error: '线索不存在' });

    const followupId = 'cf_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const followup = {
      id: followupId,
      clueId,
      operator: operator || clue.assignedTo || 'system',
      method: method || 'phone',
      content,
      result: result || 'pending',
      nextFollowupAt: nextFollowupAt || null,
      createdAt: new Date().toISOString(),
    };
    clueFollowups.set(followupId, followup);

    clues.withLock(clueId, (item) => {
      item.followupCount = (item.followupCount || 0) + 1;
      item.lastFollowupAt = new Date().toISOString();
      if (item.status === CLUE_STATUS.ASSIGNED) {
        item.status = CLUE_STATUS.CONTACTED;
        item.statusHistory.push({ status: CLUE_STATUS.CONTACTED, at: new Date().toISOString(), by: operator || 'system' });
      }
      item.updatedAt = new Date().toISOString();
      return item;
    });

    const updatedClue = clues.get(clueId);
    res.json({ success: true, data: { followup, clue: updatedClue }, message: '跟进记录已添加' });
  } catch (e) {
    console.error('[clue] followup错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/followups/:clueId', (req, res) => {
  try {
    const { clueId } = req.params;
    const records = clueFollowups.find(f => f.clueId === clueId);
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: { items: records, total: records.length } });
  } catch (e) {
    console.error('[clue] followups查询错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const {
      merchantId, status, source, assignedTo, intent,
      minScore, maxScore, startDate, endDate,
      page = 1, pageSize = 20, sortBy = 'score', sortOrder = 'desc',
    } = req.query;

    let list = clues.getAll();

    if (merchantId) list = list.filter(c => c.merchantId === merchantId);
    if (status) list = list.filter(c => c.status === status);
    if (source) list = list.filter(c => c.source === source);
    if (assignedTo) list = list.filter(c => c.assignedTo === assignedTo);
    if (intent) list = list.filter(c => c.intent === intent);
    if (minScore) list = list.filter(c => c.score >= Number(minScore));
    if (maxScore) list = list.filter(c => c.score <= Number(maxScore));
    if (startDate) list = list.filter(c => c.createdAt >= startDate);
    if (endDate) list = list.filter(c => c.createdAt <= endDate + 'T23:59:59.999Z');

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === 'score') return (a.score - b.score) * sortDir;
      if (sortBy === 'createdAt') return (new Date(a.createdAt) - new Date(b.createdAt)) * sortDir;
      if (sortBy === 'updatedAt') return (new Date(a.updatedAt) - new Date(b.updatedAt)) * sortDir;
      return 0;
    });

    const total = list.length;
    const paged = list.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

    res.json({
      success: true,
      data: {
        items: paged,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
  } catch (e) {
    console.error('[clue] list错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/detail/:clueId', (req, res) => {
  try {
    const clue = clues.get(req.params.clueId);
    if (!clue) return res.status(404).json({ success: false, error: '线索不存在' });

    const followupRecords = clueFollowups.find(f => f.clueId === clue.id);
    const assignments = clueAssignments.find(a => a.clueId === clue.id);

    res.json({
      success: true,
      data: {
        ...clue,
        followups: followupRecords,
        assignmentHistory: assignments,
        availableTransitions: CLUE_STATUS_TRANSITIONS[clue.status] || [],
      },
    });
  } catch (e) {
    console.error('[clue] detail错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const { merchantId, startDate, endDate } = req.query;
    let allClues = clues.getAll();
    if (merchantId) allClues = allClues.filter(c => c.merchantId === merchantId);
    if (startDate) allClues = allClues.filter(c => c.createdAt >= startDate);
    if (endDate) allClues = allClues.filter(c => c.createdAt <= endDate + 'T23:59:59.999Z');

    const byStatus = {};
    Object.values(CLUE_STATUS).forEach(s => {
      byStatus[s] = allClues.filter(c => c.status === s).length;
    });

    const bySource = {};
    allClues.forEach(c => {
      bySource[c.source] = (bySource[c.source] || 0) + 1;
    });

    const total = allClues.length;
    const converted = byStatus[CLUE_STATUS.CONVERTED] || 0;
    const conversionRate = total > 0 ? parseFloat(((converted / total) * 100).toFixed(2)) : 0;
    const avgScore = total > 0 ? Math.round(allClues.reduce((s, c) => s + c.score, 0) / total) : 0;
    const totalBudget = allClues.reduce((s, c) => s + (c.budget || 0), 0);
    const convertedBudget = allClues.filter(c => c.status === CLUE_STATUS.CONVERTED).reduce((s, c) => s + (c.budget || 0), 0);

    const byIntent = { high: 0, medium: 0, low: 0 };
    allClues.forEach(c => { if (byIntent[c.intent] !== undefined) byIntent[c.intent]++; });

    const funnel = [
      { stage: '新线索', count: byStatus[CLUE_STATUS.NEW] || 0 },
      { stage: '已分配', count: byStatus[CLUE_STATUS.ASSIGNED] || 0 },
      { stage: '已联系', count: byStatus[CLUE_STATUS.CONTACTED] || 0 },
      { stage: '已甄别', count: byStatus[CLUE_STATUS.QUALIFIED] || 0 },
      { stage: '已成交', count: converted },
    ];

    const dailyStats = {};
    allClues.forEach(c => {
      const day = c.createdAt.slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { newClues: 0, converted: 0 };
      dailyStats[day].newClues++;
      if (c.status === CLUE_STATUS.CONVERTED) dailyStats[day].converted++;
    });

    res.json({
      success: true,
      data: {
        total,
        byStatus,
        bySource,
        byIntent,
        conversionRate,
        avgScore,
        totalBudget: parseFloat(totalBudget.toFixed(2)),
        convertedBudget: parseFloat(convertedBudget.toFixed(2)),
        funnel,
        dailyStats,
      },
    });
  } catch (e) {
    console.error('[clue] stats错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/pool', (req, res) => {
  try {
    const { merchantId, minScore } = req.query;
    let pool = clues.getAll().filter(c => c.status === CLUE_STATUS.NEW || c.status === CLUE_STATUS.RECYCLED);
    if (merchantId) pool = pool.filter(c => c.merchantId === merchantId);
    if (minScore) pool = pool.filter(c => c.score >= Number(minScore));
    pool.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: { items: pool, total: pool.length } });
  } catch (e) {
    console.error('[clue] pool错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/recycle', (req, res) => {
  try {
    const { clueIds, reason } = req.body;
    if (!clueIds || !Array.isArray(clueIds)) {
      return res.status(400).json({ success: false, error: 'clueIds 数组必填' });
    }

    const recycled = [];
    clueIds.forEach(clueId => {
      const clue = clues.get(clueId);
      if (!clue) return;
      const allowed = CLUE_STATUS_TRANSITIONS[clue.status] || [];
      if (allowed.includes(CLUE_STATUS.RECYCLED)) {
        clues.withLock(clueId, (item) => {
          item.status = CLUE_STATUS.RECYCLED;
          item.assignedTo = null;
          item.statusHistory.push({ status: CLUE_STATUS.RECYCLED, at: new Date().toISOString(), by: 'system', note: reason || '回收至公海' });
          item.updatedAt = new Date().toISOString();
          return item;
        });
        recycled.push(clueId);
      }
    });

    res.json({ success: true, data: { recycled: recycled.length, clueIds: recycled } });
  } catch (e) {
    console.error('[clue] recycle错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/kol-referral-stats', (req, res) => {
  try {
    const allClues = clues.getAll();
    const kolMap = {};
    allClues.forEach(c => {
      if (!c.kolReferralId) return;
      if (!kolMap[c.kolReferralId]) {
        kolMap[c.kolReferralId] = { kolId: c.kolReferralId, referrals: 0, converted: 0, lost: 0, totalBudget: 0 };
      }
      kolMap[c.kolReferralId].referrals++;
      if (c.status === CLUE_STATUS.CONVERTED) {
        kolMap[c.kolReferralId].converted++;
        kolMap[c.kolReferralId].totalBudget += c.budget || 0;
      }
      if (c.status === CLUE_STATUS.LOST) kolMap[c.kolReferralId].lost++;
    });

    const stats = Object.values(kolMap).map(k => ({
      ...k,
      conversionRate: k.referrals > 0 ? parseFloat(((k.converted / k.referrals) * 100).toFixed(2)) : 0,
    })).sort((a, b) => b.converted - a.converted);

    res.json({ success: true, data: stats });
  } catch (e) {
    console.error('[clue] kol-referral-stats错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/sources', (req, res) => {
  res.json({ success: true, data: CLUE_SOURCES });
});

router.get('/statuses', (req, res) => {
  res.json({ success: true, data: { statuses: CLUE_STATUS, transitions: CLUE_STATUS_TRANSITIONS } });
});

module.exports = router;
