const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const COS_SECRET_ID = process.env.COS_SECRET_ID || '';
const COS_SECRET_KEY = process.env.COS_SECRET_KEY || '';
const COS_BUCKET = process.env.COS_BUCKET || 'x402-1454137396';
const COS_REGION = process.env.COS_REGION || 'ap-guangzhou';
const CAM_SECRET_ID = process.env.CAM_SECRET_ID || COS_SECRET_ID;
const CAM_SECRET_KEY = process.env.CAM_SECRET_KEY || COS_SECRET_KEY;

const cosStore = {
  storages: [],
  camRoles: [],
  applications: []
};

function getStorage(userId) {
  return cosStore.storages.find(s => s.userId === userId);
}

function getCamRole(userId) {
  return cosStore.camRoles.find(r => r.userId === userId);
}

router.get('/status', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const storage = getStorage(userId);
  const camRole = getCamRole(userId);

  res.json({
    success: true,
    data: {
      hasStorage: !!storage,
      storage: storage || null,
      hasCamRole: !!camRole,
      camRole: camRole || null,
      platformBucket: COS_BUCKET,
      region: COS_REGION,
      features: {
        freeSpace: '50GB',
        maxFiles: 50000,
        bandwidth: '200GB/月',
        provider: '腾讯云COS',
        storageClass: '标准存储'
      },
      options: {
        usePlatformCos: {
          name: '使用平台共享COS',
          price: '按量付费',
          description: '直接使用平台COS桶，按实际使用量计费，无需配置'
        },
        useOwnCos: {
          name: '自建COS存储桶',
          price: '免费额度50GB',
          description: '创建自己的COS桶，享受免费额度，需配置CAM角色授权'
        }
      }
    }
  });
});

router.post('/apply', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { mode = 'platform', region = COS_REGION, roleArn = '' } = req.body;

  const existing = getStorage(userId);
  if (existing) {
    return res.status(400).json({
      success: false,
      error: '已申请过COS存储'
    });
  }

  const bucketSlug = crypto.randomBytes(4).toString('hex');

  if (mode === 'own') {
    if (!roleArn) {
      return res.status(400).json({
        success: false,
        error: '自建COS模式需提供CAM角色ARN',
        hint: '请先完成CAM角色配置，或下载Terraform脚本创建角色'
      });
    }

    const storage = {
      id: `cos-${Date.now()}`,
      userId,
      mode: 'own',
      region,
      bucketName: `kol-${userId.slice(0, 8)}-${bucketSlug}`,
      roleArn,
      freeSpace: '50GB',
      usedSpace: '0B',
      fileCount: 0,
      status: 'active',
      provider: 'tencent-cos',
      storageClass: 'STANDARD',
      createdAt: new Date().toISOString()
    };

    cosStore.storages.push(storage);

    res.json({
      success: true,
      data: storage,
      message: '自建COS存储申请成功，已绑定CAM角色'
    });
  } else {
    const storage = {
      id: `cos-${Date.now()}`,
      userId,
      mode: 'platform',
      region: COS_REGION,
      bucketName: COS_BUCKET,
      cloudPath: `/kol-uploads/${userId}`,
      freeSpace: '按量',
      usedSpace: '0B',
      fileCount: 0,
      status: 'active',
      provider: 'tencent-cos-shared',
      storageClass: 'STANDARD',
      createdAt: new Date().toISOString()
    };

    cosStore.storages.push(storage);

    res.json({
      success: true,
      data: storage,
      message: '平台共享COS存储申请成功'
    });
  }
});

router.post('/cam-role', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const { roleArn, roleName } = req.body;

  if (!roleArn || !roleName) {
    return res.status(400).json({
      success: false,
      error: '需提供roleArn和roleName'
    });
  }

  const existing = getCamRole(userId);
  if (existing) {
    existing.roleArn = roleArn;
    existing.roleName = roleName;
    existing.updatedAt = new Date().toISOString();
    return res.json({
      success: true,
      data: existing,
      message: 'CAM角色信息已更新'
    });
  }

  const camRole = {
    id: `cam-${Date.now()}`,
    userId,
    roleArn,
    roleName,
    status: 'configured',
    createdAt: new Date().toISOString()
  };

  cosStore.camRoles.push(camRole);

  res.json({
    success: true,
    data: camRole,
    message: 'CAM角色配置成功'
  });
});

router.get('/cam-guide', (req, res) => {
  res.json({
    success: true,
    data: {
      steps: [
        {
          step: 1,
          title: '登录腾讯云控制台',
          description: '访问 https://console.cloud.tencent.com/cam',
          action: '登录您的腾讯云账号'
        },
        {
          step: 2,
          title: '创建子用户',
          description: '访问访问管理 → 用户列表 → 新建用户',
          action: '创建一个子用户，获取SecretId和SecretKey'
        },
        {
          step: 3,
          title: '配置COS权限策略',
          description: '为子用户授权 QcloudCOSFullAccess 或自定义COS读写策略',
          action: '在策略页面关联权限策略'
        },
        {
          step: 4,
          title: '创建角色并获取ARN',
          description: '访问访问管理 → 角色 → 新建角色，选择COS服务角色',
          action: '创建角色后复制角色ARN（格式：qcs::cam::uin/xxx:roleName/xxx）'
        },
        {
          step: 5,
          title: '回填角色ARN',
          description: '将复制的角色ARN填入本平台，完成授权绑定',
          action: '在COS申请页面选择自建模式，填入角色ARN'
        }
      ],
      terraformAvailable: true,
      terraformDownloadUrl: '/api/cos/terraform-script',
      quickSetup: '推荐下载Terraform脚本一键创建CAM角色'
    }
  });
});

router.get('/terraform-script', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const userSlug = userId.slice(0, 8);
  const timestamp = new Date().toISOString();

  const lines = [
    '# ========================================',
    '# 龟钮自驭 X402 COS + CAM 角色一键部署',
    '# 生成时间: ' + timestamp,
    '# 用户标识: ' + userSlug,
    '# ========================================',
    '',
    'terraform {',
    '  required_providers {',
    '    tencentcloud = {',
    '      source  = "tencentcloudstack/tencentcloud"',
    '      version = "~> 1.81"',
    '    }',
    '  }',
    '}',
    '',
    '# 配置腾讯云 Provider',
    '# 请填入您的 SecretId 和 SecretKey',
    'provider "tencentcloud" {',
    '  secret_id  = var.secret_id',
    '  secret_key = var.secret_key',
    '  region     = "' + COS_REGION + '"',
    '}',
    '',
    'variable "secret_id" {',
    '  description = "腾讯云 SecretId"',
    '  type        = string',
    '  sensitive   = true',
    '}',
    '',
    'variable "secret_key" {',
    '  description = "腾讯云 SecretKey"',
    '  type        = string',
    '  sensitive   = true',
    '}',
    '',
    'variable "user_slug" {',
    '  description = "用户标识(用于资源命名)"',
    '  type        = string',
    '  default     = "' + userSlug + '"',
    '}',
    '',
    '# ====== 1. 创建 COS 存储桶 ======',
    'resource "tencentcloud_cos_bucket" "kol_bucket" {',
    '  bucket = "x402-kol-${var.user_slug}"',
    '',
    '  tags = {',
    '    Project   = "x402-guiniu"',
    '    ManagedBy = "terraform"',
    '    UserId    = var.user_slug',
    '  }',
    '}',
    '',
    '# ====== 2. 创建 CAM 策略(最小COS权限) ======',
    'resource "tencentcloud_cam_policy" "cos_access_policy" {',
    '  name        = "x402-kol-cos-access-${var.user_slug}"',
    '  description = "X402 KOL COS access policy for user ${var.user_slug}"',
    '',
    '  document = jsonencode({',
    '    version = "2.0"',
    '    statement = [',
    '      {',
    '        effect   = "allow"',
    '        action   = [',
    '          "cos:PutObject",',
    '          "cos:GetObject",',
    '          "cos:DeleteObject",',
    '          "cos:ListBucket",',
    '          "cos:HeadObject",',
    '          "cos:PutObjectAcl"',
    '        ]',
    '        resource = [',
    '          "qcs::cos::uid/*:x402-kol-${var.user_slug}/*",',
    '          "qcs::cos::uid/*:x402-kol-${var.user_slug}"',
    '        ]',
    '      }',
    '    ]',
    '  })',
    '}',
    '',
    '# ====== 3. 创建 CAM 角色 ======',
    'resource "tencentcloud_cam_role" "cos_role" {',
    '  name        = "x402-kol-cos-role-${var.user_slug}"',
    '  description = "X402 KOL COS access role"',
    '  document    = jsonencode({',
    '    version = "2.0"',
    '    statement = [',
    '      {',
    '        effect    = "allow"',
    '        principal = {',
    '          service = "cos.tencentcloudapi.com"',
    '        }',
    '        action = "sts:AssumeRole"',
    '      }',
    '    ]',
    '  })',
    '}',
    '',
    '# ====== 4. 绑定策略到角色 ======',
    'resource "tencentcloud_cam_role_policy_attachment" "cos_role_policy" {',
    '  role_id   = tencentcloud_cam_role.cos_role.id',
    '  policy_id = tencentcloud_cam_policy.cos_access_policy.id',
    '}',
    '',
    '# ====== 输出 ======',
    'output "bucket_name" {',
    '  value = tencentcloud_cos_bucket.kol_bucket.bucket',
    '}',
    '',
    'output "role_arn" {',
    '  description = "CAM 角色 ARN，请复制此值回填到龟钮自驭平台"',
    '  value       = "qcs::cam::uin/${var.user_slug}:roleName/${tencentcloud_cam_role.cos_role.name}"',
    '}',
    '',
    'output "cos_region" {',
    '  value = "' + COS_REGION + '"',
    '}'
  ];

  const script = lines.join('\n');

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="x402-cos-cam-' + userSlug + '.tf"');
  res.send(script);
});

router.get('/files', (req, res) => {
  const userId = req.user?.userId || 'anonymous';
  const storage = getStorage(userId);

  if (!storage) {
    return res.status(404).json({
      success: false,
      error: '未申请COS存储'
    });
  }

  res.json({
    success: true,
    data: {
      files: storage.files || [],
      fileCount: storage.fileCount || 0,
      usedSpace: storage.usedSpace,
      cloudPath: storage.cloudPath || `/${storage.bucketName}/kol-uploads/${userId}`
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
      error: '未申请COS存储'
    });
  }

  if (!storage.files) {
    storage.files = [];
  }

  const fileId = `cos-file-${crypto.randomBytes(8).toString('hex')}`;
  const cloudPath = storage.cloudPath
    ? `${storage.cloudPath}/${fileName}`
    : `/kol-uploads/${userId}/${fileName}`;

  const file = {
    id: fileId,
    fileName,
    fileSize,
    fileType,
    cloudPath,
    url: `https://${storage.bucketName}.cos.${storage.region}.myqcloud.com${cloudPath}`,
    storageClass: storage.storageClass || 'STANDARD',
    uploadedAt: new Date().toISOString()
  };

  storage.files.push(file);
  storage.fileCount = (storage.fileCount || 0) + 1;

  res.json({
    success: true,
    data: file,
    message: '文件上传记录已创建'
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
  storage.fileCount = Math.max(0, (storage.fileCount || 1) - 1);

  res.json({
    success: true,
    data: { cloudPath: removed.cloudPath },
    message: '文件删除成功'
  });
});

module.exports = router;
