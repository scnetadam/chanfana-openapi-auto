const express = require('express');
const router = express.Router();

const aiVideoStore = {
  projects: [],
  templates: [
    {
      id: 'template-1',
      name: '汽车产品介绍',
      category: '产品展示',
      description: '适用于汽车产品功能介绍视频',
      duration: 30,
      scenes: 5,
      features: ['AI配音', '自动字幕', '转场特效']
    },
    {
      id: 'template-2',
      name: '试驾体验Vlog',
      category: '体验分享',
      description: '适用于试驾体验分享视频',
      duration: 60,
      scenes: 8,
      features: ['AI剪辑', '音乐匹配', '滤镜']
    },
    {
      id: 'template-3',
      name: '车型对比分析',
      category: '专业评测',
      description: '适用于车型对比分析视频',
      duration: 90,
      scenes: 10,
      features: ['数据可视化', 'AI配音', '图表动画']
    }
  ]
};

router.get('/templates', (req, res) => {
  res.json({
    success: true,
    data: {
      templates: aiVideoStore.templates,
      total: aiVideoStore.templates.length
    }
  });
});

router.get('/templates/:templateId', (req, res) => {
  const { templateId } = req.params;
  const template = aiVideoStore.templates.find(t => t.id === templateId);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      error: '模板不存在'
    });
  }
  
  res.json({
    success: true,
    data: template
  });
});

router.post('/create', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { title, templateId, materials, options } = req.body;
  
  const template = aiVideoStore.templates.find(t => t.id === templateId);
  
  const project = {
    id: `project-${Date.now()}`,
    userId,
    title,
    templateId,
    templateName: template ? template.name : '自定义',
    materials: materials || [],
    options: options || {},
    status: 'draft',
    progress: 0,
    result: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  aiVideoStore.projects.push(project);
  
  res.json({
    success: true,
    data: project,
    message: 'AI视频项目创建成功'
  });
});

router.get('/projects', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const projects = aiVideoStore.projects.filter(p => p.userId === userId);
  
  res.json({
    success: true,
    data: {
      projects,
      total: projects.length
    }
  });
});

router.get('/projects/:projectId', (req, res) => {
  const { projectId } = req.params;
  const project = aiVideoStore.projects.find(p => p.id === projectId);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      error: '项目不存在'
    });
  }
  
  res.json({
    success: true,
    data: project
  });
});

router.post('/projects/:projectId/generate', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { projectId } = req.params;
  const { tasks } = req.body;
  
  const project = aiVideoStore.projects.find(
    p => p.id === projectId && p.userId === userId
  );
  
  if (!project) {
    return res.status(404).json({
      success: false,
      error: '项目不存在'
    });
  }
  
  project.status = 'generating';
  project.progress = 0;
  project.tasks = tasks || [];
  
  res.json({
    success: true,
    data: {
      projectId: project.id,
      status: project.status,
      message: 'AI视频生成任务已启动'
    }
  });
});

router.get('/projects/:projectId/progress', (req, res) => {
  const { projectId } = req.params;
  const project = aiVideoStore.projects.find(p => p.id === projectId);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      error: '项目不存在'
    });
  }
  
  if (project.status === 'generating') {
    project.progress = Math.min(project.progress + 20, 100);
    if (project.progress >= 100) {
      project.status = 'completed';
      project.result = {
        videoUrl: `https://ai-video.x402.com/${project.id}.mp4`,
        duration: 30,
        fileSize: '50MB',
        thumbnail: `https://ai-video.x402.com/${project.id}.jpg`
      };
    }
  }
  
  res.json({
    success: true,
    data: {
      projectId: project.id,
      status: project.status,
      progress: project.progress,
      result: project.result
    }
  });
});

router.post('/subtitle', (req, res) => {
  const { videoUrl, language = 'zh-CN' } = req.body;
  
  const subtitle = {
    id: `subtitle-${Date.now()}`,
    videoUrl,
    language,
    format: 'srt',
    content: '1\n00:00:00,000 --> 00:00:05,000\n这是AI生成的字幕示例\n\n2\n00:00:05,000 --> 00:00:10,000\n实际使用时需要接入语音识别API\n',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: subtitle,
    message: 'AI字幕生成成功'
  });
});

router.post('/effect', (req, res) => {
  const { videoUrl, effectType, params } = req.body;
  
  const effect = {
    id: `effect-${Date.now()}`,
    videoUrl,
    effectType,
    params: params || {},
    resultUrl: `https://ai-video.x402.com/effect-${Date.now()}.mp4`,
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: effect,
    message: 'AI特效应用成功'
  });
});

router.post('/edit', (req, res) => {
  const { clips, transitions, music } = req.body;
  
  const editedVideo = {
    id: `edit-${Date.now()}`,
    clips: clips || [],
    transitions: transitions || [],
    music: music || null,
    resultUrl: `https://ai-video.x402.com/edit-${Date.now()}.mp4`,
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: editedVideo,
    message: 'AI剪辑完成'
  });
});

module.exports = router;
