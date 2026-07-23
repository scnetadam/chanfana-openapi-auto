const express = require('express');
const router = express.Router();
const { contentArticles } = require('../models/dataStore');

router.post('/create', (req, res) => {
  try {
    const { title, summary, content, category, tags } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title required' });

    const id = 'art_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    const article = {
      id,
      title,
      summary: summary || '',
      content: content || '',
      category: category || 'tech',
      status: 'draft',
      tags: tags || [],
      platforms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    contentArticles.set(id, article);
    res.json({ success: true, data: article });
  } catch (e) {
    console.error('[contentCenter] create错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { category, status, tag } = req.query;
    let articles = contentArticles.getAll();
    if (category) articles = articles.filter(a => a.category === category);
    if (status) articles = articles.filter(a => a.status === status);
    if (tag) articles = articles.filter(a => a.tags && a.tags.includes(tag));
    res.json({ success: true, data: articles });
  } catch (e) {
    console.error('[contentCenter] list错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/detail/:id', (req, res) => {
  try {
    const article = contentArticles.get(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: '文章不存在' });
    res.json({ success: true, data: article });
  } catch (e) {
    console.error('[contentCenter] detail错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.put('/update/:id', (req, res) => {
  try {
    const article = contentArticles.get(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: '文章不存在' });

    const { title, summary, content, category, status, tags } = req.body;
    const result = contentArticles.withLock(req.params.id, (item) => {
      if (title) item.title = title;
      if (summary !== undefined) item.summary = summary;
      if (content !== undefined) item.content = content;
      if (category) item.category = category;
      if (status) item.status = status;
      if (tags) item.tags = tags;
      item.updatedAt = new Date().toISOString();
      return item;
    });

    res.json({ success: true, data: result.data });
  } catch (e) {
    console.error('[contentCenter] update错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.delete('/delete/:id', (req, res) => {
  try {
    const article = contentArticles.get(req.params.id);
    if (!article) return res.status(404).json({ success: false, error: '文章不存在' });
    contentArticles.delete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (e) {
    console.error('[contentCenter] delete错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
