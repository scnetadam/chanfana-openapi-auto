const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sentimentTopics, sentimentArticles } = require('../models/dataStore');

const SENTIMENT_LABELS = {
  very_positive: { label: '极度正面', score: 1.0, color: '#27AE60' },
  positive: { label: '正面', score: 0.75, color: '#2ECC71' },
  neutral: { label: '中性', score: 0.5, color: '#95A5A6' },
  negative: { label: '负面', score: 0.25, color: '#E74C3C' },
  very_negative: { label: '极度负面', score: 0.0, color: '#C0392B' },
};

const AUTO_KEYWORDS = {
  new_energy: {
    label: '新能源',
    keywords: ['新能源', '电动车', '充电桩', '续航', '电池', '混动', '插混', '增程', '特斯拉', '比亚迪', '蔚来', '小鹏', '理想', '智驾', '辅助驾驶'],
  },
  price_war: {
    label: '价格战',
    keywords: ['降价', '补贴', '优惠', '促销', '价格战', '砍价', '特价', '直降', '限时', '抄底'],
  },
  safety: {
    label: '安全',
    keywords: ['召回', '缺陷', '碰撞', '安全', '刹车', '气囊', '自燃', '起火', '故障', '投诉'],
  },
  intelligence: {
    label: '智能化',
    keywords: ['智能座舱', '车机', 'OTA', '自动驾驶', '激光雷达', '芯片', '算力', '语音助手', 'HUD', '智能网联'],
  },
  brand_reputation: {
    label: '品牌声誉',
    keywords: ['品牌', '口碑', '维权', '315', '质量', '售后', '服务', '4S店', '经销商', '体验'],
  },
  policy: {
    label: '政策法规',
    keywords: ['国六', '排放', '购置税', '限购', '限行', '上牌', '新能源指标', '以旧换新', '报废', '法规'],
  },
};

const KEYWORD_SENTIMENT_MAP = {
  '降价': 'positive', '补贴': 'positive', '优惠': 'positive', '促销': 'positive',
  '直降': 'positive', '限时': 'neutral', '抄底': 'positive',
  '召回': 'negative', '缺陷': 'negative', '碰撞': 'negative', '自燃': 'very_negative',
  '起火': 'very_negative', '故障': 'negative', '投诉': 'negative', '维权': 'negative',
  '续航': 'neutral', '电池': 'neutral', '充电桩': 'neutral',
  '智驾': 'positive', '智能座舱': 'positive', 'OTA': 'positive',
  '质量': 'neutral', '售后': 'neutral', '服务': 'neutral',
  '安全': 'neutral', '刹车': 'negative',
};

function analyzeSentiment(text) {
  if (!text) return { label: 'neutral', score: 0.5, confidence: 0 };

  const lowerText = text.toLowerCase();
  const hits = [];

  Object.entries(KEYWORD_SENTIMENT_MAP).forEach(([keyword, sentiment]) => {
    if (lowerText.includes(keyword)) {
      hits.push({ keyword, sentiment, score: SENTIMENT_LABELS[sentiment].score });
    }
  });

  if (hits.length === 0) {
    return { label: 'neutral', score: 0.5, confidence: 0.3, hits: [] };
  }

  const avgScore = hits.reduce((s, h) => s + h.score, 0) / hits.length;
  const confidence = Math.min(1.0, hits.length / 5 + 0.3);

  let label = 'neutral';
  if (avgScore >= 0.85) label = 'very_positive';
  else if (avgScore >= 0.6) label = 'positive';
  else if (avgScore >= 0.4) label = 'neutral';
  else if (avgScore >= 0.15) label = 'negative';
  else label = 'very_negative';

  return { label, score: parseFloat(avgScore.toFixed(4)), confidence: parseFloat(confidence.toFixed(4)), hits };
}

function extractTopics(text) {
  if (!text) return [];
  const found = [];
  Object.entries(AUTO_KEYWORDS).forEach(([topicId, topic]) => {
    const matchedKeywords = topic.keywords.filter(kw => text.includes(kw));
    if (matchedKeywords.length > 0) {
      found.push({
        topicId,
        label: topic.label,
        matchedKeywords,
        matchCount: matchedKeywords.length,
        relevance: parseFloat(Math.min(1.0, matchedKeywords.length / topic.keywords.length + 0.2).toFixed(4)),
      });
    }
  });
  found.sort((a, b) => b.matchCount - a.matchCount);
  return found;
}

function extractBrandMentions(text) {
  const brandPatterns = [
    { brand: '比亚迪', aliases: ['比亚迪', 'BYD'] },
    { brand: '特斯拉', aliases: ['特斯拉', 'Tesla', 'tesla'] },
    { brand: '蔚来', aliases: ['蔚来', 'NIO'] },
    { brand: '小鹏', aliases: ['小鹏', 'XPeng'] },
    { brand: '理想', aliases: ['理想', 'Li Auto'] },
    { brand: '华为', aliases: ['华为', 'HUAWEI', '鸿蒙', '问界', '智界'] },
    { brand: '小米', aliases: ['小米', 'SU7'] },
    { brand: '吉利', aliases: ['吉利', '极氪', '领克'] },
    { brand: '长安', aliases: ['长安', '深蓝', '阿维塔'] },
    { brand: '广汽', aliases: ['广汽', '埃安', '传祺'] },
    { brand: '一汽', aliases: ['一汽', '红旗', '奔腾'] },
    { brand: '上汽', aliases: ['上汽', '智己', '飞凡'] },
    { brand: '宝马', aliases: ['宝马', 'BMW'] },
    { brand: '奔驰', aliases: ['奔驰', '梅赛德斯', 'Benz'] },
    { brand: '奥迪', aliases: ['奥迪', 'Audi'] },
    { brand: '丰田', aliases: ['丰田', 'Toyota'] },
    { brand: '大众', aliases: ['大众', 'Volkswagen'] },
  ];

  const mentions = [];
  brandPatterns.forEach(({ brand, aliases }) => {
    const matched = aliases.filter(a => text.includes(a));
    if (matched.length > 0) mentions.push({ brand, matchedAliases: matched });
  });
  return mentions;
}

router.post('/analyze', (req, res) => {
  try {
    const { title, content, source, author, url, publishedAt } = req.body;
    const text = [title, content].filter(Boolean).join(' ');
    if (!text) return res.status(400).json({ success: false, error: 'title 或 content 至少填一项' });

    const sentiment = analyzeSentiment(text);
    const topics = extractTopics(text);
    const brandMentions = extractBrandMentions(text);

    const articleId = 'sa_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const article = {
      id: articleId,
      title: title || (content ? content.slice(0, 50) : ''),
      content: content || '',
      source: source || 'unknown',
      author: author || '',
      url: url || '',
      publishedAt: publishedAt || new Date().toISOString(),
      sentiment,
      topics,
      brandMentions,
      analyzedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    sentimentArticles.set(articleId, article);

    topics.forEach(topic => {
      const topicKey = `topic_${new Date().toISOString().slice(0, 10)}_${topic.topicId}`;
      let existing = sentimentTopics.get(topicKey);
      if (!existing) {
        existing = {
          id: topicKey,
          topicId: topic.topicId,
          label: topic.label,
          date: new Date().toISOString().slice(0, 10),
          articleCount: 0,
          sentimentDistribution: { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 },
          avgSentiment: 0,
          totalSentimentScore: 0,
          brands: {},
          trending: false,
          updatedAt: new Date().toISOString(),
        };
      }
      existing.articleCount++;
      existing.sentimentDistribution[sentiment.label] = (existing.sentimentDistribution[sentiment.label] || 0) + 1;
      existing.totalSentimentScore += sentiment.score;
      existing.avgSentiment = parseFloat((existing.totalSentimentScore / existing.articleCount).toFixed(4));

      brandMentions.forEach(bm => {
        existing.brands[bm.brand] = (existing.brands[bm.brand] || 0) + 1;
      });

      existing.trending = existing.articleCount >= 5;
      existing.updatedAt = new Date().toISOString();
      sentimentTopics.set(topicKey, existing);
    });

    res.json({ success: true, data: article });
  } catch (e) {
    console.error('[sentiment] analyze错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.post('/batch-analyze', (req, res) => {
  try {
    const { articles } = req.body;
    if (!articles || !Array.isArray(articles)) {
      return res.status(400).json({ success: false, error: 'articles 数组必填' });
    }

    const results = articles.map(article => {
      const text = [article.title, article.content].filter(Boolean).join(' ');
      if (!text) return { ...article, error: '无文本内容' };

      const sentiment = analyzeSentiment(text);
      const topics = extractTopics(text);
      const brandMentions = extractBrandMentions(text);

      const articleId = 'sa_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      const record = {
        id: articleId,
        title: article.title || article.content?.slice(0, 50) || '',
        content: article.content || '',
        source: article.source || 'unknown',
        author: article.author || '',
        url: article.url || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        sentiment,
        topics,
        brandMentions,
        analyzedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      sentimentArticles.set(articleId, record);

      topics.forEach(topic => {
        const topicKey = `topic_${new Date().toISOString().slice(0, 10)}_${topic.topicId}`;
        let existing = sentimentTopics.get(topicKey);
        if (!existing) {
          existing = {
            id: topicKey, topicId: topic.topicId, label: topic.label,
            date: new Date().toISOString().slice(0, 10),
            articleCount: 0,
            sentimentDistribution: { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 },
            avgSentiment: 0, totalSentimentScore: 0, brands: {}, trending: false,
            updatedAt: new Date().toISOString(),
          };
        }
        existing.articleCount++;
        existing.sentimentDistribution[sentiment.label] = (existing.sentimentDistribution[sentiment.label] || 0) + 1;
        existing.totalSentimentScore += sentiment.score;
        existing.avgSentiment = parseFloat((existing.totalSentimentScore / existing.articleCount).toFixed(4));
        brandMentions.forEach(bm => { existing.brands[bm.brand] = (existing.brands[bm.brand] || 0) + 1; });
        existing.trending = existing.articleCount >= 5;
        existing.updatedAt = new Date().toISOString();
        sentimentTopics.set(topicKey, existing);
      });

      return record;
    });

    res.json({ success: true, data: { analyzed: results.length, results } });
  } catch (e) {
    console.error('[sentiment] batch-analyze错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/trending', (req, res) => {
  try {
    const { days = 7, limit = 20 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 10);
    let topics = sentimentTopics.getAll().filter(t => t.date >= cutoff);
    topics.sort((a, b) => b.articleCount - a.articleCount);
    const trending = topics.slice(0, Number(limit)).map(t => ({
      ...t,
      sentimentSummary: {
        dominantSentiment: Object.entries(t.sentimentDistribution)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral',
        positiveRatio: parseFloat((((t.sentimentDistribution.positive || 0) + (t.sentimentDistribution.very_positive || 0)) / Math.max(1, t.articleCount) * 100).toFixed(1)),
        negativeRatio: parseFloat((((t.sentimentDistribution.negative || 0) + (t.sentimentDistribution.very_negative || 0)) / Math.max(1, t.articleCount) * 100).toFixed(1)),
      },
    }));
    res.json({ success: true, data: { topics: trending, total: trending.length, days: Number(days) } });
  } catch (e) {
    console.error('[sentiment] trending错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/brand-sentiment', (req, res) => {
  try {
    const { brand, days = 30 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 10);

    let articles = sentimentArticles.getAll().filter(a => a.createdAt >= cutoff);
    if (brand) {
      articles = articles.filter(a => a.brandMentions && a.brandMentions.some(bm => bm.brand === brand));
    }

    const brandMap = {};
    articles.forEach(a => {
      (a.brandMentions || []).forEach(bm => {
        if (brand && bm.brand !== brand) return;
        if (!brandMap[bm.brand]) {
          brandMap[bm.brand] = {
            brand: bm.brand,
            mentions: 0,
            sentimentDistribution: { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 },
            totalSentiment: 0,
          };
        }
        brandMap[bm.brand].mentions++;
        brandMap[bm.brand].sentimentDistribution[a.sentiment.label]++;
        brandMap[bm.brand].totalSentiment += a.sentiment.score;
      });
    });

    const results = Object.values(brandMap).map(b => ({
      ...b,
      avgSentiment: b.mentions > 0 ? parseFloat((b.totalSentiment / b.mentions).toFixed(4)) : 0,
      positiveRatio: parseFloat((((b.sentimentDistribution.positive || 0) + (b.sentimentDistribution.very_positive || 0)) / Math.max(1, b.mentions) * 100).toFixed(1)),
      negativeRatio: parseFloat((((b.sentimentDistribution.negative || 0) + (b.sentimentDistribution.very_negative || 0)) / Math.max(1, b.mentions) * 100).toFixed(1)),
    })).sort((a, b) => b.mentions - a.mentions);

    res.json({ success: true, data: { brands: results, days: Number(days) } });
  } catch (e) {
    console.error('[sentiment] brand-sentiment错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/dashboard', (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000).toISOString().slice(0, 10);

    const recentArticles = sentimentArticles.getAll().filter(a => a.createdAt >= cutoff);
    const recentTopics = sentimentTopics.getAll().filter(t => t.date >= cutoff);

    const overallSentiment = {
      very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0,
    };
    recentArticles.forEach(a => { overallSentiment[a.sentiment.label]++; });

    const totalArticles = recentArticles.length;
    const positiveRatio = totalArticles > 0
      ? parseFloat(((overallSentiment.positive + overallSentiment.very_positive) / totalArticles * 100).toFixed(1))
      : 0;
    const negativeRatio = totalArticles > 0
      ? parseFloat(((overallSentiment.negative + overallSentiment.very_negative) / totalArticles * 100).toFixed(1))
      : 0;

    const topTopics = recentTopics.sort((a, b) => b.articleCount - a.articleCount).slice(0, 10);

    const brandAgg = {};
    recentArticles.forEach(a => {
      (a.brandMentions || []).forEach(bm => {
        brandAgg[bm.brand] = (brandAgg[bm.brand] || 0) + 1;
      });
    });
    const topBrands = Object.entries(brandAgg)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([brand, mentions]) => ({ brand, mentions }));

    const dailyStats = {};
    recentArticles.forEach(a => {
      const day = a.createdAt.slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { total: 0, positive: 0, negative: 0, neutral: 0 };
      dailyStats[day].total++;
      if (a.sentiment.label === 'positive' || a.sentiment.label === 'very_positive') dailyStats[day].positive++;
      else if (a.sentiment.label === 'negative' || a.sentiment.label === 'very_negative') dailyStats[day].negative++;
      else dailyStats[day].neutral++;
    });

    const alerts = [];
    recentTopics.filter(t => t.trending && t.avgSentiment < 0.3).forEach(t => {
      alerts.push({
        type: 'negative_trend',
        topic: t.label,
        avgSentiment: t.avgSentiment,
        articleCount: t.articleCount,
        message: `「${t.label}」舆情偏负面，平均情感${t.avgSentiment}，${t.articleCount}篇报道`,
      });
    });

    res.json({
      success: true,
      data: {
        period: `${days}天`,
        totalArticles,
        overallSentiment,
        positiveRatio,
        negativeRatio,
        topTopics,
        topBrands,
        dailyStats,
        alerts,
        trendingTopics: recentTopics.filter(t => t.trending).length,
      },
    });
  } catch (e) {
    console.error('[sentiment] dashboard错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/articles', (req, res) => {
  try {
    const { topicId, brand, sentiment, source, days = 7, page = 1, pageSize = 20 } = req.query;
    const cutoff = new Date(Date.now() - Number(days) * 86400000).toISOString();
    let list = sentimentArticles.getAll().filter(a => a.createdAt >= cutoff);

    if (topicId) list = list.filter(a => a.topics && a.topics.some(t => t.topicId === topicId));
    if (brand) list = list.filter(a => a.brandMentions && a.brandMentions.some(bm => bm.brand === brand));
    if (sentiment) list = list.filter(a => a.sentiment.label === sentiment);
    if (source) list = list.filter(a => a.source === source);

    list.sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
    const total = list.length;
    const paged = list.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));

    res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e) {
    console.error('[sentiment] articles错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/topics', (req, res) => {
  res.json({ success: true, data: AUTO_KEYWORDS });
});

router.get('/sentiment-labels', (req, res) => {
  res.json({ success: true, data: SENTIMENT_LABELS });
});

module.exports = router;
