const GLM_API_KEY = process.env.GLM_API_KEY || '';
const GLM_API_URL = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const engagementStore = {
  records: []
};

const SUSPICION_THRESHOLDS = {
  maxLikesPerMinute: 5,
  maxCommentsPerHour: 20,
  likeToViewRatio: 0.8,
  sameIpInteractions: 10,
  shortViewDuration: 3,
};

function trackCompletionRate(viewDuration, totalDuration) {
  if (!totalDuration || totalDuration <= 0) return 0;
  return Math.min(1, viewDuration / totalDuration);
}

function analyzeEngagementQuality(stats) {
  const { views = 0, likes = 0, comments = 0, shares = 0, bookmarks = 0, avgViewDuration = 0, totalDuration = 0 } = stats;

  const completionRate = trackCompletionRate(avgViewDuration, totalDuration);
  const likeRate = views > 0 ? likes / views : 0;
  const commentRate = views > 0 ? comments / views : 0;
  const shareRate = views > 0 ? shares / views : 0;

  let qualityScore = 0;
  qualityScore += completionRate * 0.3;
  qualityScore += Math.min(1, likeRate * 5) * 0.2;
  qualityScore += Math.min(1, commentRate * 10) * 0.25;
  qualityScore += Math.min(1, shareRate * 8) * 0.15;
  qualityScore += (bookmarks > 0 ? Math.min(1, bookmarks / views * 20) * 0.1 : 0);

  return {
    qualityScore: +qualityScore.toFixed(4),
    completionRate: +completionRate.toFixed(4),
    likeRate: +likeRate.toFixed(4),
    commentRate: +commentRate.toFixed(4),
    shareRate: +shareRate.toFixed(4),
    engagementLevel: qualityScore > 0.7 ? 'high' : (qualityScore > 0.3 ? 'medium' : 'low'),
  };
}

function detectFraud(stats, interactionLog = []) {
  const { likes = 0, views = 0, comments = 0, uniqueIps = 0 } = stats;
  const suspicions = [];
  let fraudScore = 0;

  const likeToViewRatio = views > 0 ? likes / views : 0;
  if (likeToViewRatio > SUSPICION_THRESHOLDS.likeToViewRatio) {
    suspicions.push({ type: 'abnormal_like_ratio', detail: '点赞/浏览比异常: ' + likeToViewRatio.toFixed(3), severity: 'high' });
    fraudScore += 0.4;
  }

  if (uniqueIps > 0 && (likes + comments) / uniqueIps > SUSPICION_THRESHOLDS.sameIpInteractions) {
    suspicions.push({ type: 'same_ip_cluster', detail: '同IP集中互动', severity: 'high' });
    fraudScore += 0.3;
  }

  if (interactionLog.length > 0) {
    const recentLikes = interactionLog.filter(l => l.type === 'like' && Date.now() - new Date(l.timestamp).getTime() < 60000);
    if (recentLikes.length > SUSPICION_THRESHOLDS.maxLikesPerMinute) {
      suspicions.push({ type: 'rapid_likes', detail: '1分钟内' + recentLikes.length + '次点赞', severity: 'medium' });
      fraudScore += 0.2;
    }
  }

  if (comments > 0 && views > 0 && comments / views > 0.5) {
    suspicions.push({ type: 'abnormal_comment_ratio', detail: '评论/浏览比异常', severity: 'medium' });
    fraudScore += 0.15;
  }

  fraudScore = Math.min(1, fraudScore);

  return {
    fraudScore: +fraudScore.toFixed(4),
    isFraudSuspect: fraudScore > 0.5,
    suspicions,
    recommendation: fraudScore > 0.5 ? '疑似刷量，建议降低互动质量分' : '互动正常',
  };
}

function calculateEngagementWeightedScore(baseScore, completionRate, engagementQuality, fraudResult, hasAttachLink = false, hasLeadCapture = false) {
  let score = baseScore;

  score = score * 0.6 + engagementQuality.qualityScore * 0.4;

  if (completionRate > 0.8) {
    score += 0.1;
  } else if (completionRate < 0.3) {
    score -= 0.1;
  }

  if (fraudResult.isFraudSuspect) {
    score -= fraudResult.fraudScore * 0.3;
  }

  if (hasAttachLink) {
    score += 0.15;
  }

  if (hasLeadCapture) {
    score += 0.25;
  }

  return +Math.max(0, Math.min(1, score)).toFixed(4);
}

module.exports = {
  trackCompletionRate,
  analyzeEngagementQuality,
  detectFraud,
  calculateEngagementWeightedScore,
  engagementStore,
  SUSPICION_THRESHOLDS,
};
