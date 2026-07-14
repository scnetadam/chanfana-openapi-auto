const express = require('express');
const router = express.Router();

const videoStore = {
  videos: [],
  streams: []
};

router.get('/list', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const videos = videoStore.videos.filter(v => v.userId === userId);
  
  res.json({
    success: true,
    data: {
      videos,
      total: videos.length
    }
  });
});

router.post('/upload', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { title, description, duration, fileSize, thumbnail } = req.body;
  
  const video = {
    id: `video-${Date.now()}`,
    userId,
    title,
    description: description || '',
    duration,
    fileSize,
    thumbnail: thumbnail || '',
    status: 'processing',
    playUrl: '',
    createdAt: new Date().toISOString(),
    stats: {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0
    }
  };
  
  videoStore.videos.push(video);
  
  setTimeout(() => {
    video.status = 'ready';
    video.playUrl = `https://video.x402.com/${video.id}.mp4`;
  }, 2000);
  
  res.json({
    success: true,
    data: video,
    message: '视频上传成功，正在处理中'
  });
});

router.get('/:videoId', (req, res) => {
  const { videoId } = req.params;
  const video = videoStore.videos.find(v => v.id === videoId);
  
  if (!video) {
    return res.status(404).json({
      success: false,
      error: '视频不存在'
    });
  }
  
  res.json({
    success: true,
    data: video
  });
});

router.put('/:videoId', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { videoId } = req.params;
  const { title, description } = req.body;
  
  const video = videoStore.videos.find(v => v.id === videoId && v.userId === userId);
  
  if (!video) {
    return res.status(404).json({
      success: false,
      error: '视频不存在'
    });
  }
  
  if (title) video.title = title;
  if (description) video.description = description;
  
  res.json({
    success: true,
    data: video,
    message: '视频信息更新成功'
  });
});

router.delete('/:videoId', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { videoId } = req.params;
  
  const index = videoStore.videos.findIndex(v => v.id === videoId && v.userId === userId);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '视频不存在'
    });
  }
  
  videoStore.videos.splice(index, 1);
  
  res.json({
    success: true,
    message: '视频删除成功'
  });
});

router.post('/:videoId/view', (req, res) => {
  const { videoId } = req.params;
  const video = videoStore.videos.find(v => v.id === videoId);
  
  if (!video) {
    return res.status(404).json({
      success: false,
      error: '视频不存在'
    });
  }
  
  video.stats.views += 1;
  
  res.json({
    success: true,
    data: { views: video.stats.views }
  });
});

router.post('/:videoId/like', (req, res) => {
  const { videoId } = req.params;
  const video = videoStore.videos.find(v => v.id === videoId);
  
  if (!video) {
    return res.status(404).json({
      success: false,
      error: '视频不存在'
    });
  }
  
  video.stats.likes += 1;
  
  res.json({
    success: true,
    data: { likes: video.stats.likes }
  });
});

router.post('/:videoId/share', (req, res) => {
  const { videoId } = req.params;
  const video = videoStore.videos.find(v => v.id === videoId);
  
  if (!video) {
    return res.status(404).json({
      success: false,
      error: '视频不存在'
    });
  }
  
  video.stats.shares += 1;
  
  res.json({
    success: true,
    data: {
      shares: video.stats.shares,
      shareUrl: `https://x402.com/video/${videoId}`
    }
  });
});

router.get('/stream/:videoId', (req, res) => {
  const { videoId } = req.params;
  const video = videoStore.videos.find(v => v.id === videoId);
  
  if (!video || video.status !== 'ready') {
    return res.status(404).json({
      success: false,
      error: '视频不存在或未就绪'
    });
  }
  
  const stream = {
    videoId,
    playUrl: video.playUrl,
    quality: ['720p', '1080p', '4k'],
    format: 'mp4',
    codec: 'h264'
  };
  
  res.json({
    success: true,
    data: stream
  });
});

module.exports = router;
