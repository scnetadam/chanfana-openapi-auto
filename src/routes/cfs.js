const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const TCB_ENV_ID = process.env.TCB_ENV_ID || 'd1g9iojop685ea11a';
const CFS_DOMAIN = `https://${TCB_ENV_ID}.tcloudbaseapp.com`;

const cfsStore = {
  storages: [],
  applications: []
};

function getStorage(userId) {
  return cfsStore.storages.find(s => s.userId === userId);
}

function generateFileId() {
  return `file-${crypto.randomBytes(8).toString('hex')}`;
}

router.get('/status', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const storage = getStorage(userId);

  res.json({
    success: true,
    data: {
      hasStorage: !!storage,
      storage: storage || null,
      envId: TCB_ENV_ID,
      domain: CFS_DOMAIN,
      features: {
        freeSpace: '10GB',
        maxFiles: 10000,
        bandwidth: '100GB/月',
        provider: '腾讯CloudBase CFS'
      }
    }
  });
});

router.post('/apply', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { region = 'ap-guangzhou' } = req.body;

  const existing = getStorage(userId);
  if (existing) {
    return res.status(400).json({
      success: false,
      error: '已申请过CFS存储'
    });
  }

  const bucketSlug = crypto.randomBytes(4).toString('hex');
  const storage = {
    id: `cfs-${Date.now()}`,
    userId,
    region,
    envId: TCB_ENV_ID,
    bucketName: `kol-${userId.slice(0, 8)}-${bucketSlug}`,
    cloudPath: `/kol-uploads/${userId}`,
    freeSpace: '10GB',
    usedSpace: '0GB',
    status: 'active',
    provider: 'tencent-cloudbase-cfs',
    createdAt: new Date().toISOString()
  };

  cfsStore.storages.push(storage);

  res.json({
    success: true,
    data: storage,
    message: 'CFS存储申请成功，已开通腾讯CloudBase CFS'
  });
});

router.get('/files', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const storage = getStorage(userId);

  if (!storage) {
    return res.status(404).json({
      success: false,
      error: '未申请CFS存储'
    });
  }

  res.json({
    success: true,
    data: {
      files: storage.files || [],
      totalSize: storage.usedSpace,
      cloudPath: storage.cloudPath
    }
  });
});

router.post('/upload', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { fileName, fileSize, fileType } = req.body;

  const storage = getStorage(userId);
  if (!storage) {
    return res.status(404).json({
      success: false,
      error: '未申请CFS存储'
    });
  }

  if (!storage.files) {
    storage.files = [];
  }

  const fileId = generateFileId();
  const cloudPath = `${storage.cloudPath}/${fileName}`;
  const file = {
    id: fileId,
    fileName,
    fileSize,
    fileType,
    cloudPath,
    url: `${CFS_DOMAIN}/cloudbase-storage${cloudPath}`,
    uploadedAt: new Date().toISOString()
  };

  storage.files.push(file);

  res.json({
    success: true,
    data: file,
    uploadUrl: `${CFS_DOMAIN}/api/cfs/upload?cloudPath=${encodeURIComponent(cloudPath)}`,
    message: '文件上传成功'
  });
});

router.delete('/files/:fileId', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { fileId } = req.params;

  const storage = getStorage(userId);
  if (!storage || !storage.files) {
    return res.status(404).json({
      success: false,
      error: '文件不存在'
    });
  }

  const index = storage.files.findIndex(f => f.id === fileId);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: '文件不存在'
    });
  }

  const removed = storage.files.splice(index, 1)[0];

  res.json({
    success: true,
    data: { cloudPath: removed.cloudPath },
    message: '文件删除成功'
  });
});

module.exports = router;
