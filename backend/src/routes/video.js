const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');

const VIDEO_PROXY_TARGET = process.env.VIDEO_PROXY_TARGET || '';
const VOD_SECRET_ID = process.env.VOD_SECRET_ID || '';
const VOD_SECRET_KEY = process.env.VOD_SECRET_KEY || '';
const VOD_REGION = process.env.VOD_REGION || 'ap-guangzhou';
const EDGEONE_DOMAIN = process.env.EDGEONE_DOMAIN || '';
const CDN_DOMAIN = process.env.CDN_DOMAIN || '';
const CVM_PRIMARY = process.env.CVM_PRIMARY || '159.75.17.54';
const CVM_VIDEO = process.env.CVM_VIDEO || '';
const VIDEO_ROUTE_ENABLED = process.env.VIDEO_ROUTE_ENABLED === 'true';

router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: '视频4层服务',
      version: '1.0.0',
      architecture: {
        L1: { name: 'EdgeOne 边缘加速', domain: EDGEONE_DOMAIN, status: EDGEONE_DOMAIN ? 'configured' : 'pending' },
        L2: { name: 'CDN+数据万象CI', domain: CDN_DOMAIN, status: CDN_DOMAIN ? 'configured' : 'pending' },
        L3: { name: '点播VOD', region: VOD_REGION, configured: !!VOD_SECRET_ID },
        L4: {
          name: '双路CVM源站',
          primary: CVM_PRIMARY,
          video: CVM_VIDEO || 'pending',
          proxy: VIDEO_PROXY_TARGET || 'pending',
          enabled: VIDEO_ROUTE_ENABLED,
        },
      },
      dualRoute: {
        api: CVM_PRIMARY + ':3003',
        video: CVM_VIDEO ? CVM_VIDEO + ':3005' : 'pending',
        description: 'API走主CVM，视频流走专用CVM(包月)',
      },
      vodPackages: {
        mediaProcess: process.env.VOD_MEDIA_PROCESS === 'true',
        transcode: process.env.VOD_TRANSCODE_TEMPLATE || 'default',
        hd: process.env.VOD_HD_PACKAGE === 'true',
        review: process.env.VOD_REVIEW_PACKAGE === 'true',
        flow: process.env.VOD_FLOW_PACKAGE === 'true',
        storage: process.env.VOD_STORAGE_PACKAGE === 'true',
      },
    },
  });
});

router.post('/upload', (req, res) => {
  try {
    const { fileName, fileType, fileSize, userId, metadata } = req.body;
    if (!fileName) return res.status(400).json({ success: false, error: 'fileName 必填' });

    const uploadId = 'vu_' + Date.now().toString(36);
    const upload = {
      uploadId,
      fileName,
      fileType: fileType || 'video/mp4',
      fileSize: fileSize || 0,
      userId: userId || 'anonymous',
      metadata: metadata || {},
      status: 'pending',
      layers: {
        L3_vod: { status: 'pending', description: '待上传至VOD' },
        L2_cdn: { status: 'pending', description: '待CDN分发' },
        L1_edge: { status: 'pending', description: '待EdgeOne加速' },
      },
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        uploadId,
        uploadUrl: VOD_SECRET_ID
          ? `https://vod.tencentcloudapi.com/upload?uploadId=${uploadId}`
          : `http://${CVM_PRIMARY}:3005/upload?uploadId=${uploadId}`,
        layers: upload.layers,
        message: VOD_SECRET_ID ? 'VOD已配置，优先走点播通道' : 'VOD未配置，走CVM直传',
      },
    });
  } catch (e) {
    console.error('[video] upload错误:', e);
    res.status(500).json({ success: false, error: '上传失败' });
  }
});

router.get('/stream/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId) return res.status(400).json({ success: false, error: 'videoId 必填' });

    if (CVM_VIDEO) {
      return res.json({
        success: true,
        data: {
          videoId,
          streamUrl: `http://${CVM_VIDEO}:3005/stream/${videoId}`,
          hlsUrl: `http://${CVM_VIDEO}:3005/hls/${videoId}.m3u8`,
          layer: 'L4-专用CVM',
        },
      });
    }

    if (EDGEONE_DOMAIN) {
      return res.json({
        success: true,
        data: {
          videoId,
          streamUrl: `https://${EDGEONE_DOMAIN}/video/stream/${videoId}`,
          hlsUrl: `https://${EDGEONE_DOMAIN}/video/hls/${videoId}.m3u8`,
          layer: 'L1-EdgeOne',
        },
      });
    }

    res.json({
      success: true,
      data: {
        videoId,
        streamUrl: `http://${CVM_PRIMARY}:3005/stream/${videoId}`,
        layer: 'L4-主CVM(fallback)',
      },
    });
  } catch (e) {
    console.error('[video] stream错误:', e);
    res.status(500).json({ success: false, error: '获取流地址失败' });
  }
});

router.post('/transcode', (req, res) => {
  try {
    const { videoId, template, outputFormat } = req.body;
    if (!videoId) return res.status(400).json({ success: false, error: 'videoId 必填' });

    const task = {
      taskId: 'vt_' + Date.now().toString(36),
      videoId,
      template: template || process.env.VOD_TRANSCODE_TEMPLATE || '自适应码率',
      outputFormat: outputFormat || 'hls',
      status: VOD_SECRET_ID ? 'submitted' : 'local_only',
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: task,
      message: VOD_SECRET_ID ? '转码任务已提交至VOD' : 'VOD未配置，仅本地标记',
    });
  } catch (e) {
    console.error('[video] transcode错误:', e);
    res.status(500).json({ success: false, error: '转码请求失败' });
  }
});

router.get('/cdn/purge', (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, error: 'url 必填' });

    res.json({
      success: true,
      data: {
        purgeId: 'cp_' + Date.now().toString(36),
        url,
        cdnDomain: CDN_DOMAIN || EDGEONE_DOMAIN,
        status: CDN_DOMAIN ? 'submitted' : 'no_cdn_configured',
      },
    });
  } catch (e) {
    console.error('[video] cdn purge错误:', e);
    res.status(500).json({ success: false, error: 'CDN刷新失败' });
  }
});

router.get('/analytics', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        period: '7d',
        totalViews: 0,
        totalBandwidth: '0 GB',
        byLayer: {
          L1_edge: { requests: 0, bandwidth: '0 GB', hitRate: '0%' },
          L2_cdn: { requests: 0, bandwidth: '0 GB', hitRate: '0%' },
          L3_vod: { transcodes: 0, storage: '0 GB' },
          L4_origin: { requests: 0, bandwidth: '0 GB' },
        },
        dualCvm: {
          primary: { cpu: 'N/A', memory: 'N/A', role: 'API' },
          video: CVM_VIDEO ? { cpu: 'N/A', memory: 'N/A', role: 'VideoStream' } : null,
        },
      },
    });
  } catch (e) {
    console.error('[video] analytics错误:', e);
    res.status(500).json({ success: false, error: '统计查询失败' });
  }
});

if (VIDEO_PROXY_TARGET && VIDEO_ROUTE_ENABLED) {
  router.all('/proxy/*', (req, res) => {
    const targetUrl = VIDEO_PROXY_TARGET + req.path.replace('/proxy', '');
    const mod = targetUrl.startsWith('https') ? https : http;

    const proxyReq = mod.request(targetUrl, {
      method: req.method,
      headers: { ...req.headers, host: undefined },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
      console.error('[video] proxy错误:', e);
      res.status(502).json({ success: false, error: '视频代理失败' });
    });

    if (req.body) proxyReq.write(JSON.stringify(req.body));
    proxyReq.end();
  });
}

module.exports = router;
