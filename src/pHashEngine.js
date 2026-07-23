const crypto = require('crypto');

const PHASH_THRESHOLD = parseInt(process.env.PHASH_THRESHOLD || '10');
const AI_GEN_THRESHOLD = parseFloat(process.env.AI_GEN_THRESHOLD || '0.6');

const pHashStore = {
  hashes: []
};

function computePHash(imageData) {
  if (!imageData) return null;
  const hash = crypto.createHash('sha256').update(imageData).digest('hex');
  return hash.slice(0, 16);
}

function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 999;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    for (let bit = 3; bit >= 0; bit--) {
      if ((xor >> bit) & 1) distance++;
    }
  }
  return distance;
}

function checkDuplicate(newHash, userId) {
  const userHashes = pHashStore.hashes.filter(h => h.userId === userId);
  const matches = [];
  for (const stored of userHashes) {
    const dist = hammingDistance(newHash, stored.hash);
    if (dist < PHASH_THRESHOLD) {
      matches.push({ storedHash: stored.hash, distance: dist, originalContentId: stored.contentId, similarity: +((1 - dist / 64) * 100).toFixed(1) });
    }
  }
  return matches;
}

function storePHash(hash, contentId, userId) {
  pHashStore.hashes.push({ hash, contentId, userId, createdAt: new Date().toISOString() });
}

async function detectAiGeneration(content, type = 'text') {
  if (type === 'text') {
    return detectAiGeneratedText(content);
  }
  return detectAiGeneratedImage(content);
}

function detectAiGeneratedText(text) {
  if (!text || text.length < 10) {
    return { aiRatio: 0, confidence: 0, source: 'skip' };
  }

  let aiScore = 0;
  const factors = [];

  const sentenceEndings = (text.match(/[。！？.!?]/g) || []).length;
  const avgSentenceLen = text.length / Math.max(1, sentenceEndings);
  if (avgSentenceLen > 40 && avgSentenceLen < 80) {
    aiScore += 0.2;
    factors.push('sentence_length_uniform');
  }

  const firstPersonCount = (text.match(/我[们]?/g) || []).length;
  if (firstPersonCount === 0 && text.length > 200) {
    aiScore += 0.15;
    factors.push('no_first_person');
  }

  const transitionWords = ['此外', '然而', '因此', '总之', '值得一提的是', '综上所述', '不可否认'];
  let transitionCount = 0;
  for (const tw of transitionWords) {
    if (text.includes(tw)) transitionCount++;
  }
  if (transitionCount >= 3) {
    aiScore += 0.25;
    factors.push('excessive_transitions');
  }

  const formalPhrases = ['具有重要意义', '发挥着关键作用', '不可忽视', '值得深入探讨', '在当今社会'];
  let formalCount = 0;
  for (const fp of formalPhrases) {
    if (text.includes(fp)) formalCount++;
  }
  if (formalCount >= 2) {
    aiScore += 0.2;
    factors.push('formal_ai_phrases');
  }

  const uniqueWords = new Set(text.split(''));
  const uniqueRatio = uniqueWords.size / text.length;
  if (uniqueRatio < 0.3 && text.length > 100) {
    aiScore += 0.1;
    factors.push('low_vocabulary_diversity');
  }

  const aiRatio = Math.min(1, aiScore);
  return {
    aiRatio: +aiRatio.toFixed(3),
    confidence: aiRatio > AI_GEN_THRESHOLD ? 0.8 : 0.5,
    isAiHeavy: aiRatio > AI_GEN_THRESHOLD,
    factors,
    source: 'local-heuristics',
    recommendation: aiRatio > AI_GEN_THRESHOLD ? 'AI生成占比高，建议降低原创度评分' : 'AI生成占比可控'
  };
}

function detectAiGeneratedImage(imageUrl) {
  if (!imageUrl) return { aiRatio: 0, confidence: 0, source: 'skip' };

  let aiScore = 0;
  const factors = [];

  if (imageUrl.includes('ai-generated') || imageUrl.includes('midjourney') || imageUrl.includes('dall-e') || imageUrl.includes('stable-diffusion')) {
    aiScore = 0.9;
    factors.push('ai_tool_watermark');
  }

  return {
    aiRatio: +aiScore.toFixed(3),
    confidence: aiScore > 0 ? 0.7 : 0.3,
    isAiHeavy: aiScore > AI_GEN_THRESHOLD,
    factors,
    source: 'url-heuristics',
    recommendation: '前期用URL启发式检测，后期接入深度学习模型(如AIDetect)'
  };
}

function adjustOriginalityScore(baseScore, aiDetectionResult) {
  if (!aiDetectionResult || aiDetectionResult.aiRatio <= 0) return baseScore;

  const penalty = aiDetectionResult.aiRatio * 0.5;
  const adjusted = Math.max(0, baseScore - penalty);
  return +adjusted.toFixed(4);
}

module.exports = {
  computePHash,
  hammingDistance,
  checkDuplicate,
  storePHash,
  detectAiGeneration,
  adjustOriginalityScore,
  PHASH_THRESHOLD,
  AI_GEN_THRESHOLD,
};
