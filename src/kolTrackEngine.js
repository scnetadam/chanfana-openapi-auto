const { kolTrackStore, kolAuditStore, userStore } = require('./models/dataStore');

const TRACK_CONFIGS = {
  A: {
    taxType: '工资薪金',
    withholdingRate: 0,
    selfInvoicing: false,
    invoiceMode: 'employer',
    description: '全职/驻场KOL，车商/MCN签约'
  },
  B: {
    taxType: '劳务报酬',
    withholdingRate: 0.20,
    selfInvoicing: false,
    invoiceMode: 'platform_batch',
    description: '散签劳务KOL，平台代扣代缴'
  },
  C: {
    taxType: '经营所得',
    withholdingRate: 0,
    selfInvoicing: true,
    invoiceMode: 'self',
    description: '个体户/工作室KOL，自行开票'
  }
};

function classifyKol(userId, profile) {
  let track = 'B';
  const criteria = [];

  if (profile.hasBusinessLicense) {
    track = 'C';
    criteria.push('hasBusinessLicense');
  } else if (profile.hasEmployment) {
    track = 'A';
    criteria.push('hasEmployment');
  } else {
    criteria.push('default_mid_tier');
  }

  const record = {
    userId,
    track,
    criteria,
    autoClassified: true,
    profile,
    classifiedAt: new Date().toISOString(),
    history: [{ track, changedAt: new Date().toISOString(), reason: 'auto_classification' }]
  };

  if (kolTrackStore.insert) {
    kolTrackStore.insert(record);
  } else if (kolTrackStore.push) {
    kolTrackStore.push(record);
  }

  return { track, criteria, autoClassified: true };
}

function reclassifyKol(userId, newTrack, reason) {
  const existing = kolTrackStore.findOne ? kolTrackStore.findOne({ userId }) : null;
  const history = existing ? (existing.history || []) : [];
  history.push({ track: newTrack, changedAt: new Date().toISOString(), reason });

  const updated = {
    userId,
    track: newTrack,
    criteria: existing ? existing.criteria : [],
    autoClassified: false,
    profile: existing ? existing.profile : {},
    classifiedAt: existing ? existing.classifiedAt : new Date().toISOString(),
    history,
    reclassifiedAt: new Date().toISOString()
  };

  if (kolTrackStore.update) {
    kolTrackStore.update({ userId }, updated);
  }

  if (kolAuditStore.insert) {
    kolAuditStore.insert({
      userId,
      fromTrack: existing ? existing.track : null,
      toTrack: newTrack,
      reason,
      auditedAt: new Date().toISOString()
    });
  }

  return updated;
}

function getTrackConfig(track) {
  return TRACK_CONFIGS[track] || null;
}

function validateTrackChange(userId, fromTrack, toTrack) {
  if (fromTrack === toTrack) {
    return { valid: false, reason: 'same_track' };
  }

  if (fromTrack === 'A' && toTrack === 'B') {
    return { valid: true, reason: 'employment_termination_required' };
  }

  if (fromTrack === 'A' && toTrack === 'C') {
    return { valid: true, reason: 'employment_termination_and_business_license_required' };
  }

  if (fromTrack === 'B' && toTrack === 'A') {
    return { valid: true, reason: 'employment_contract_required' };
  }

  if (fromTrack === 'B' && toTrack === 'C') {
    return { valid: true, reason: 'business_license_required' };
  }

  if (fromTrack === 'C' && toTrack === 'B') {
    return { valid: true, reason: 'allowed' };
  }

  if (fromTrack === 'C' && toTrack === 'A') {
    return { valid: true, reason: 'employment_contract_and_license_cancellation_required' };
  }

  return { valid: false, reason: 'invalid_transition' };
}

function getTrackDistribution() {
  const records = kolTrackStore.find ? kolTrackStore.find(() => true) : (Array.isArray(kolTrackStore) ? kolTrackStore : []);
  const distribution = { A: 0, B: 0, C: 0 };
  records.forEach(r => {
    if (r.track && distribution[r.track] !== undefined) {
      distribution[r.track]++;
    }
  });
  return distribution;
}

function getKolTrack(userId) {
  const record = kolTrackStore.findOne ? kolTrackStore.findOne({ userId }) : null;
  if (!record) return null;
  return record.track;
}

module.exports = {
  classifyKol,
  reclassifyKol,
  getTrackConfig,
  validateTrackChange,
  getTrackDistribution,
  getKolTrack
};
