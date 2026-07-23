const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const SEAL_BASE = process.env.SEAL_API_BASE || 'http://localhost:3000';
const VERIFY_BASE = process.env.VERIFY_API_BASE || 'http://localhost:3004';

router.get('/cls/status', (req, res) => {
  res.json({
    success: true,
    data: {
      cosRedundancy: true,
      rdsStatus: true,
      complianceLevel: '等保3级预备',
      retentionMonths: 6,
      logSets: [
        { id: 'cls-1', name: '信息流日志', status: '运行中', retention: '6个月', tag: 'INFO' },
        { id: 'cls-2', name: '支付流日志', status: '运行中', retention: '6个月', tag: 'PAY' },
        { id: 'cls-3', name: '税务流日志', status: '运行中', retention: '6个月', tag: 'TAX' },
        { id: 'cls-4', name: 'HASH流日志', status: '运行中', retention: '6个月', tag: 'HASH' },
        { id: 'cls-5', name: '堡垒机审计日志', status: '待配置', retention: '6个月', tag: 'AUDIT' },
        { id: 'cls-6', name: 'RDS操作日志', status: '待配置', retention: '6个月', tag: 'DB' }
      ]
    }
  });
});

router.get('/bastion/status', (req, res) => {
  res.json({
    success: true,
    data: {
      trialDays: 14,
      trialUsed: 0,
      is4aEnabled: false,
      isZeroTrustEnabled: false,
      sessions: [
        { id: 'bs-1', user: 'admin01', target: 'CVM-Web-01', protocol: 'SSH', status: '活跃' },
        { id: 'bs-2', user: 'admin02', target: 'CVM-DB-01', protocol: 'RDP', status: '已断开' }
      ]
    }
  });
});

router.get('/storage/status', (req, res) => {
  res.json({
    success: true,
    data: {
      cdnDomain: 'cdn.GNXYZ.XYZ',
      isInnerNetwork: true,
      buckets: [
        { id: 'cos-1', name: 'video-source', type: '源文件', encryption: 'SSE-KMS', size: '2.1TB' },
        { id: 'cos-2', name: 'video-output', type: '转码输出', encryption: 'SSE-KMS', size: '800GB' },
        { id: 'cos-3', name: 'ai-intermediate', type: 'AI中间物', encryption: 'SSE-KMS', size: '150GB' }
      ],
      vodAssets: [
        { id: 'vod-1', name: 'KOL汽车评测01', duration: '25:30', transcodeStatus: '已完成' },
        { id: 'vod-2', name: 'KOL汽车评测02', duration: '18:45', transcodeStatus: '转码中' }
      ]
    }
  });
});

router.get('/billing/status', (req, res) => {
  res.json({
    success: true,
    data: {
      vmTrialMinutes: 200,
      vmUsedMinutes: 0,
      x402Balance: '¥5,280.00',
      sealApiBase: SEAL_BASE,
      billingRecords: [
        { id: 'bill-1', service: 'COS存储', usage: '2.1TB', cost: '¥126/月', settlement: 'X402' },
        { id: 'bill-2', service: 'VOD转码', usage: '50小时', cost: '¥75/月', settlement: 'X402' },
        { id: 'bill-3', service: 'CDN流量', usage: '5TB', cost: '¥450/月', settlement: 'X402' },
        { id: 'bill-4', service: 'MPS转码', usage: '30小时', cost: '¥45/月', settlement: 'X402' }
      ]
    }
  });
});

router.post('/billing/settle', async (req, res) => {
  try {
    const { amount, service, channel } = req.body;
    const txId = 'tx-' + Date.now();
    const hash = crypto.createHash('sha256').update(txId + amount + service).digest('hex').substring(0, 16);

    res.json({
      success: true,
      data: {
        txId,
        amount: amount || 0,
        service: service || 'unknown',
        channel: channel || 'x402',
        sealApiBase: SEAL_BASE,
        status: 'settled',
        hash,
        timestamp: new Date().toISOString(),
        message: `X402结算完成，通过龟钮印信${channel || 'X402'}通道扣费，Hash已送印证存证`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/security/status', (req, res) => {
  res.json({
    success: true,
    data: {
      totalItems: 19,
      enabledCount: 16,
      pendingCount: 3,
      categories: ['数据不出域', '加密', 'DRM', '水印', '四流分离', '访问控制', 'CDN']
    }
  });
});

router.get('/tax-chain/status', (req, res) => {
  const latestHash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 24);
  res.json({
    success: true,
    data: {
      latestHash: '0x' + latestHash,
      chainDualWrite: true,
      wormEnabled: true,
      retentionMonths: 6,
      verifyApiBase: VERIFY_BASE,
      taxFlows: [
        { id: 'tax-1', name: '金税4对接', status: '预备中', detail: '增值税发票系统' },
        { id: 'tax-2', name: '自然人税务APP', status: '预备中', detail: '个税申报' },
        { id: 'tax-3', name: '个人税务', status: '预备中', detail: '综合所得申报' },
        { id: 'tax-4', name: 'WORM存储', status: '已启用', detail: '一次写入多次读取' },
        { id: 'tax-5', name: 'DSAUDIT精细审计', status: '待配置', detail: '100%审计入DSAUDIT' }
      ],
      chainNodes: [
        { id: 'chain-1', chain: '蚂蚁链', txHash: '0x3a7f...b2c1', type: 'HASH双写' },
        { id: 'chain-2', chain: '公正云', txHash: '0x8d2e...f4a3', type: 'HASH双写' }
      ],
      kolTracks: {
        trackA: '全职/驻场KOL - 工资薪金3%-45%',
        trackB: '散签劳务KOL - 劳务报酬20%预扣',
        trackC: '个体户/工作室KOL - 经营所得5%-35%'
      }
    }
  });
});

router.post('/tax-chain/hash-chain', async (req, res) => {
  try {
    const { dataId, dataType } = req.body;
    const hash = crypto.createHash('sha256').update((dataId || 'default') + Date.now()).digest('hex');

    res.json({
      success: true,
      data: {
        dataId: dataId || 'default',
        dataType: dataType || 'tax',
        hash: '0x' + hash.substring(0, 24),
        antChain: { txHash: '0x' + hash.substring(0, 16) + '...a1', status: 'written' },
        notaryCloud: { txHash: '0x' + hash.substring(0, 16) + '...b2', status: 'written' },
        wormStorage: { status: 'sealed', immutable: true },
        verifyApiBase: VERIFY_BASE,
        message: 'HASH双写完成：蚂蚁链+公正云互为背书，已通过龟钮印证存证'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/kol-video/status', (req, res) => {
  res.json({
    success: true,
    data: {
      freeQuota: 'KOL免费COS+VOD使用申请中',
      drmEnabled: true,
      watermarkEnabled: true,
      tiers: [
        { id: 'tier-1', tier: '第一层', desc: '独立申请腾讯云产品', cosVod: 'COS+VOD全申请', cdn: 'CDN全配置', billing: 'X402支付' },
        { id: 'tier-2', tier: '第二层', desc: '全使用我们配置', cosVod: '我们管COS+VOD', cdn: '我们管CDN', billing: 'X402支付' },
        { id: 'tier-3', tier: '第三层', desc: '用户为主我们辅助', cosVod: '用户自管', cdn: '我们做CDN+私有化MPS', billing: 'X402支付' },
        { id: 'tier-4', tier: '第四层', desc: '其他方案预备', cosVod: '预备方案', cdn: '预备方案', billing: 'X402支付' }
      ]
    }
  });
});

router.get('/ha/status', (req, res) => {
  res.json({
    success: true,
    data: {
      failoverMode: '自动切换',
      peakBalance: true,
      independentRun: true,
      servers: [
        { id: 'srv-1', name: 'X402-主', role: 'X402计费主服务器', status: '运行中', cpu: '32%', memory: '58%', load: 32 },
        { id: 'srv-2', name: 'X402-备', role: 'X402计费备服务器', status: '热备', cpu: '8%', memory: '30%', load: 8 },
        { id: 'srv-3', name: '视频-主', role: '汽车视频主服务器', status: '运行中', cpu: '45%', memory: '72%', load: 45 },
        { id: 'srv-4', name: '视频-备', role: '汽车视频备服务器', status: '热备', cpu: '5%', memory: '25%', load: 5 }
      ]
    }
  });
});

router.post('/ha/failover', (req, res) => {
  res.json({
    success: true,
    data: {
      action: 'failover',
      result: '主备切换完成',
      timestamp: new Date().toISOString(),
      newPrimary: 'X402-备',
      newStandby: 'X402-主'
    }
  });
});

router.get('/cross-project/status', (req, res) => {
  res.json({
    success: true,
    data: {
      seal: {
        name: '龟钮印信',
        project: 'D:/X402',
        apiBase: SEAL_BASE,
        features: ['X402微支付', '支付宝/微信/e-CNY分账', '伞顶伞底自动清分', 'TIPS三方扣税']
      },
      verify: {
        name: '龟钮印证',
        project: 'D:/x402-guiniu',
        apiBase: VERIFY_BASE,
        features: ['HASH确权存证', '蚂蚁链+公正云双写', '广数交所数据挂牌', 'KOL权重指纹估值']
      },
      auto: {
        name: '龟钮自驭',
        project: 'D:/X402-DEVECO',
        apiBase: 'http://10.0.2.2:3003',
        features: ['AI Agent自动执行', 'KOL/KOC权重计算', '实时支付分账', '四流合一合规']
      },
      cloudVideo: {
        name: '云视管',
        features: ['CLS日志', '堡垒机4A', 'COS+VOD+CDN', 'X402计费', '安全核心', '税务链存证', 'KOL视频四层', '双机HA']
      },
      integration: {
        billingToSeal: 'X402计费→印信支付通道结算',
        taxToVerify: '税务链HASH→印证存证确权',
        kolWeight: 'KOL权重→印信分账→印证存证→税务合规',
        fourFlows: '信息流+支付流+税务流+HASH流四流合一'
      }
    }
  });
});

module.exports = router;
