const crypto = require('crypto');

const GLM_API_KEY = process.env.GLM_API_KEY || '';
const GLM_API_URL = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODELSCOPE_API = process.env.MODELSCOPE_API || '';
const MODELSCOPE_KEY = process.env.MODELSCOPE_KEY || '';
const TENCENT_MODERATION_SECRET_ID = process.env.TENCENT_MODERATION_SECRET_ID || '';
const TENCENT_MODERATION_SECRET_KEY = process.env.TENCENT_MODERATION_SECRET_KEY || '';
const CONTENT_AUDIT_MODE = process.env.CONTENT_AUDIT_MODE || 'auto';

const AUDIT_LEVELS = {
  pass: 'pass',
  pending: 'pending',
  reject: 'reject'
};

const VIOLATION_CATEGORIES = [
  'pornographic',
  'violent',
  'political',
  'illegal',
  'abuse',
  'ad_fraud',
  'ai_generated_high',
  'copyright_risk'
];

class ContentAuditEngine {
  async auditContent(content, options = {}) {
    const { type = 'text', images = [], userId = '' } = options;
    const results = [];

    if (type === 'text' || (content.text && content.text.length > 0)) {
      const textResult = await this.auditText(content.text || content);
      results.push(textResult);
    }

    if (images.length > 0 || (content.images && content.images.length > 0)) {
      const imgs = images.length > 0 ? images : content.images;
      for (let i = 0; i < imgs.length; i++) {
        const imgResult = await this.auditImage(imgs[i]);
        results.push(imgResult);
      }
    }

    return this.aggregateResults(results, userId);
  }

  async auditText(text) {
    if (!text || text.length === 0) {
      return { level: AUDIT_LEVELS.pass, score: 1.0, violations: [], source: 'skip' };
    }

    const localResult = this._localTextAudit(text);
    if (localResult.level === AUDIT_LEVELS.reject) {
      return localResult;
    }

    if (GLM_API_KEY) {
      try {
        const aiResult = await this._glmTextAudit(text);
        return this._mergeResults(localResult, aiResult);
      } catch (err) {
        console.error('[ContentAudit] GLM审核失败:', err.message);
      }
    }

    return localResult;
  }

  async auditImage(imageUrl) {
    const localResult = this._localImageAudit(imageUrl);
    if (localResult.level === AUDIT_LEVELS.reject) {
      return localResult;
    }

    if (MODELSCOPE_KEY && MODELSCOPE_API) {
      try {
        const msResult = await this._modelscopeImageAudit(imageUrl);
        return this._mergeResults(localResult, msResult);
      } catch (err) {
        console.error('[ContentAudit] 魔搭审核失败:', err.message);
      }
    }

    if (GLM_API_KEY) {
      try {
        const glmResult = await this._glmImageAudit(imageUrl);
        return this._mergeResults(localResult, glmResult);
      } catch (err) {
        console.error('[ContentAudit] GLM图片审核失败:', err.message);
      }
    }

    return localResult;
  }

  async tencentModeration(content, type = 'text') {
    if (!TENCENT_MODERATION_SECRET_ID || !TENCENT_MODERATION_SECRET_KEY) {
      return {
        success: false,
        error: '腾讯天御API未配置',
        simulated: true,
        result: { Suggestion: 'Review', Label: 'Normal', Score: 90 },
        price: 0.003
      };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const hmac = crypto.createHmac('sha256', TENCENT_MODERATION_SECRET_KEY);
      hmac.update('POSTtms.tencentcloudapi.com/?');
      const signature = hmac.digest('base64');

      const body = {
        Content: type === 'text' ? content : '',
        FileUrl: type === 'image' ? content : '',
        Scenes: ['Porn', 'Terrorism', 'Politics', 'Ads'],
      };

      const response = await fetch('https://tms.tencentcloudapi.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'TC3-HMAC-SHA256 Credential=' + TENCENT_MODERATION_SECRET_ID + '/2026/tms/tc3_request',
          'X-TC-Timestamp': timestamp,
          'X-TC-Action': 'TextModeration',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('腾讯天御API返回错误: ' + response.status);
      }

      const result = await response.json();
      return {
        success: true,
        result: result.Response || result,
        price: 0.003
      };
    } catch (err) {
      console.error('[ContentAudit] 腾讯天御审核失败:', err.message);
      return {
        success: false,
        error: err.message,
        simulated: true,
        result: { Suggestion: 'Review', Label: 'Normal', Score: 85 },
        price: 0.003
      };
    }
  }

  _localTextAudit(text) {
    const violations = [];
    let score = 1.0;

    const bannedWords = [
      '代开发票', '刷单', '假证', '办证', '赌博',
      '色情', '裸体', '暴力', '杀人', '毒品',
      '枪支', '炸药', '传销', '套现'
    ];

    const lower = text.toLowerCase();
    for (const word of bannedWords) {
      if (lower.includes(word)) {
        violations.push({ category: 'illegal', keyword: word, severity: 'high' });
        score -= 0.3;
      }
    }

    if (text.length < 5) {
      violations.push({ category: 'low_quality', severity: 'low' });
      score -= 0.1;
    }

    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const urlMatches = text.match(urlPattern);
    if (urlMatches && urlMatches.length > 5) {
      violations.push({ category: 'ad_fraud', severity: 'medium', detail: '链接过多' });
      score -= 0.2;
    }

    score = Math.max(0, score);

    return {
      level: score < 0.5 ? AUDIT_LEVELS.reject : (score < 0.8 ? AUDIT_LEVELS.pending : AUDIT_LEVELS.pass),
      score,
      violations,
      source: 'local-rules'
    };
  }

  _localImageAudit(imageUrl) {
    const violations = [];
    let score = 1.0;

    if (!imageUrl || imageUrl.length === 0) {
      return { level: AUDIT_LEVELS.pass, score: 1.0, violations: [], source: 'skip' };
    }

    const suspiciousPatterns = ['adult', 'nude', 'violence', 'gore', 'weapon'];
    const lower = imageUrl.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      if (lower.includes(pattern)) {
        violations.push({ category: 'inappropriate_content', severity: 'high', pattern });
        score -= 0.5;
      }
    }

    score = Math.max(0, score);
    return {
      level: score < 0.5 ? AUDIT_LEVELS.reject : (score < 0.8 ? AUDIT_LEVELS.pending : AUDIT_LEVELS.pass),
      score,
      violations,
      source: 'local-rules'
    };
  }

  async _glmTextAudit(text) {
    const prompt = '你是一个内容安全审核助手。请评估以下内容是否合规，从以下维度打分(0-100)：\n' +
      '1. 色情低俗(0=无,100=严重)\n2. 暴力恐怖(0=无,100=严重)\n' +
      '3. 政治敏感(0=无,100=严重)\n4. 违法违规(0=无,100=严重)\n' +
      '5. 广告欺诈(0=无,100=严重)\n6. AI生成占比(0=纯原创,100=完全AI生成)\n\n' +
      '请用JSON格式回复：{"scores":{"porn":0,"violence":0,"politics":0,"illegal":0,"ads":0,"ai_ratio":0},"suggestion":"pass/review/reject","reason":""}\n\n' +
      '待审核内容：' + text.slice(0, 2000);

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GLM_API_KEY,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error('GLM API返回错误: ' + response.status);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const scores = parsed.scores || {};
        const maxScore = Math.max(scores.porn || 0, scores.violence || 0, scores.politics || 0, scores.illegal || 0, scores.ads || 0);

        let auditScore = 1.0;
        if (maxScore > 60) auditScore = 0.3;
        else if (maxScore > 30) auditScore = 0.6;
        else auditScore = 0.9;

        const violations = [];
        if ((scores.porn || 0) > 30) violations.push({ category: 'pornographic', severity: scores.porn > 60 ? 'high' : 'medium' });
        if ((scores.violence || 0) > 30) violations.push({ category: 'violent', severity: scores.violence > 60 ? 'high' : 'medium' });
        if ((scores.politics || 0) > 30) violations.push({ category: 'political', severity: scores.politics > 60 ? 'high' : 'medium' });
        if ((scores.illegal || 0) > 30) violations.push({ category: 'illegal', severity: scores.illegal > 60 ? 'high' : 'medium' });
        if ((scores.ads || 0) > 30) violations.push({ category: 'ad_fraud', severity: scores.ads > 60 ? 'high' : 'medium' });
        if ((scores.ai_ratio || 0) > 60) violations.push({ category: 'ai_generated_high', severity: 'medium', aiRatio: scores.ai_ratio });

        return {
          level: parsed.suggestion === 'reject' ? AUDIT_LEVELS.reject : (parsed.suggestion === 'review' ? AUDIT_LEVELS.pending : AUDIT_LEVELS.pass),
          score: auditScore,
          violations,
          aiScores: scores,
          reason: parsed.reason || '',
          source: 'glm-4-flash'
        };
      }
    } catch (parseErr) {
      console.error('[ContentAudit] GLM结果解析失败:', parseErr.message);
    }

    return { level: AUDIT_LEVELS.pending, score: 0.7, violations: [], source: 'glm-parse-fail' };
  }

  async _glmImageAudit(imageUrl) {
    if (!GLM_API_KEY) {
      return { level: AUDIT_LEVELS.pending, score: 0.7, violations: [], source: 'no-api' };
    }

    const prompt = '你是一个图片安全审核助手(QWEN-VL模式)。请评估图片是否合规，' +
      '关注：色情低俗、暴力恐怖、政治敏感、违法内容、广告欺诈。' +
      '回复JSON：{"safe":true/false,"categories":[],"confidence":0-1,"detail":""}';

    try {
      const response = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GLM_API_KEY,
        },
        body: JSON.stringify({
          model: 'glm-4v-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }],
          temperature: 0.1,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error('GLM-4V API返回错误: ' + response.status);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          level: parsed.safe ? AUDIT_LEVELS.pass : AUDIT_LEVELS.reject,
          score: parsed.confidence || 0.8,
          violations: (parsed.categories || []).map(c => ({ category: c, severity: 'high' })),
          reason: parsed.detail || '',
          source: 'glm-4v-flash'
        };
      }
    } catch (err) {
      console.error('[ContentAudit] GLM图片审核失败:', err.message);
    }

    return { level: AUDIT_LEVELS.pending, score: 0.7, violations: [], source: 'glm-4v-fail' };
  }

  async _modelscopeImageAudit(imageUrl) {
    return {
      level: AUDIT_LEVELS.pending,
      score: 0.7,
      violations: [],
      source: 'modelscope-pending',
      note: '魔搭API集成待实现，前期先用GLM-4V'
    };
  }

  _mergeResults(local, ai) {
    const merged = {
      level: local.level,
      score: Math.min(local.score, ai.score),
      violations: [...local.violations, ...ai.violations],
      sources: [local.source, ai.source],
    };

    if (ai.reason) merged.reason = ai.reason;
    if (ai.aiScores) merged.aiScores = ai.aiScores;

    if (local.level === AUDIT_LEVELS.reject || ai.level === AUDIT_LEVELS.reject) {
      merged.level = AUDIT_LEVELS.reject;
    } else if (local.level === AUDIT_LEVELS.pending || ai.level === AUDIT_LEVELS.pending) {
      merged.level = AUDIT_LEVELS.pending;
    }

    return merged;
  }

  aggregateResults(results, userId) {
    if (results.length === 0) {
      return { level: AUDIT_LEVELS.pass, score: 1.0, violations: [], source: 'empty' };
    }

    const all = {
      level: AUDIT_LEVELS.pass,
      score: 1.0,
      violations: [],
      sources: [],
      details: results,
    };

    let minScore = 1.0;
    for (const r of results) {
      minScore = Math.min(minScore, r.score);
      all.violations.push(...(r.violations || []));
      all.sources.push(r.source);
      if (r.level === AUDIT_LEVELS.reject) all.level = AUDIT_LEVELS.reject;
      else if (r.level === AUDIT_LEVELS.pending && all.level !== AUDIT_LEVELS.reject) all.level = AUDIT_LEVELS.pending;
    }

    all.score = minScore;
    return all;
  }

  needsTencentModeration(auditResult) {
    if (auditResult.level === AUDIT_LEVELS.reject) return true;
    if (auditResult.violations.length > 0 && auditResult.score < 0.7) return true;
    return false;
  }

  getAuditPrice() {
    return { tencent: 0.003, modelscope: 0.001, glm: 0 };
  }
}

module.exports = new ContentAuditEngine();
