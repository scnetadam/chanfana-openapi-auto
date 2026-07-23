const express = require('express');
const router = express.Router();
const { opcAppStore, aiToolUsageStore, notificationStore, kolAuditStore } = require('../models/dataStore');
const opcSupportEngine = require('../opcSupportEngine');

router.get('/info', (req, res) => {
  const { userId } = req.query;
  const benefits = opcSupportEngine.getOpcBenefits();
  let opcStatus = 'none';
  let freeQuota = 0;
  let usedQuota = 0;

  if (userId) {
    const app = opcAppStore.getLatestByUser(userId);
    if (app) {
      opcStatus = app.status;
      freeQuota = app.freeQuota || 0;
      usedQuota = app.usedQuota || 0;
    }
  }

  res.json({
    success: true,
    data: {
      opcStatus,
      freeQuota,
      usedQuota,
      remainingQuota: freeQuota - usedQuota,
      benefits,
    },
  });
});

router.post('/apply', (req, res) => {
  const { userId, nickName, followers, crossPlatformProof, businessPlan } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

  const latestAudit = kolAuditStore.getLatestByUser(userId);
  if (latestAudit?.status !== 'approved' && !(followers >= 1000 && crossPlatformProof)) {
    return res.status(400).json({ success: false, error: '需先通过KOL审核(同类平台+粉丝>1000)或已有KOL资格' });
  }

  const existing = opcAppStore.getLatestByUser(userId);
  if (existing) {
    if (existing.status === 'approved') return res.json({ success: true, data: existing, message: '已获批' });
    if (existing.status === 'pending') return res.json({ success: true, data: existing, message: '审核中' });
  }

  const app = opcAppStore.create({ userId, nickName, followers, crossPlatformProof, businessPlan, status: 'pending' });
  notificationStore.create({ userId, type: 'opc', title: 'OPC申请已提交', content: '您的OPC创业支持申请已提交' });
  res.json({ success: true, data: app });
});

router.get('/status', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });
  const app = opcAppStore.getLatestByUser(userId);
  if (!app) return res.json({ success: true, data: { status: 'none' } });
  res.json({ success: true, data: app });
});

router.post('/review', (req, res) => {
  const { opcId, action, freeQuota, reason } = req.body;
  if (!opcId || !action) return res.status(400).json({ success: false, error: 'opcId 和 action 为必填' });

  let app;
  if (action === 'approve') {
    app = opcAppStore.approve(opcId, freeQuota || opcSupportEngine.OPC_FREE_MONTHLY_QUOTA);
    if (app) {
      notificationStore.create({ userId: app.userId, type: 'opc', title: 'OPC创业支持已获批', content: '恭喜！您已获得OPC创业支持，享受AI工具折扣和免费额度' });
    }
  } else if (action === 'reject') {
    app = opcAppStore.reject(opcId, reason);
    if (app) {
      notificationStore.create({ userId: app.userId, type: 'opc', title: 'OPC申请未通过', content: reason || '申请未通过审核' });
    }
  }

  if (!app) return res.status(404).json({ success: false, error: '申请不存在' });
  res.json({ success: true, data: app });
});

// 城市数据
const citiesData = [
  { id: 1, name: '北京', province: '北京市', projects: 156, subsidy: '2.5亿', tokens: '500万', policies: 12, hot: true },
  { id: 2, name: '上海', province: '上海市', projects: 189, subsidy: '3.2亿', tokens: '680万', policies: 15, hot: true },
  { id: 3, name: '深圳', province: '广东省', projects: 234, subsidy: '4.1亿', tokens: '920万', policies: 18, hot: true },
  { id: 4, name: '杭州', province: '浙江省', projects: 145, subsidy: '2.8亿', tokens: '560万', policies: 14, hot: false },
  { id: 5, name: '广州', province: '广东省', projects: 167, subsidy: '3.0亿', tokens: '640万', policies: 16, hot: false },
  { id: 6, name: '成都', province: '四川省', projects: 98, subsidy: '1.8亿', tokens: '380万', policies: 10, hot: false },
  { id: 7, name: '武汉', province: '湖北省', projects: 87, subsidy: '1.5亿', tokens: '320万', policies: 9, hot: false },
  { id: 8, name: '南京', province: '江苏省', projects: 112, subsidy: '2.2亿', tokens: '440万', policies: 11, hot: false },
];

// 政策数据
const policiesData = [
  { id: 1, title: '北京AI产业扶持计划', city: '北京', cityId: 1, subsidy: '最高500万', deadline: '2026-12-31', type: '投资补贴', status: 'active', description: '支持AI企业研发创新，提供最高500万元研发补贴', requirements: ['注册地在北京', 'AI相关业务占比>50%', '研发投入>100万'] },
  { id: 2, title: '深圳人工智能创新专项', city: '深圳', cityId: 3, subsidy: '最高800万', deadline: '2026-11-30', type: '投资补贴', status: 'active', description: '支持AI技术创新和应用落地，最高800万元资助', requirements: ['深圳注册企业', '拥有AI专利或软著', '团队规模>10人'] },
  { id: 3, title: '上海AI人才引进补贴', city: '上海', cityId: 2, subsidy: '最高300万', deadline: '2026-12-15', type: '人才补贴', status: 'active', description: '引进AI高端人才，提供安家补贴和科研启动资金', requirements: ['引进博士或高级工程师', 'AI领域工作经验>5年', '签订3年以上合同'] },
  { id: 4, title: '杭州数字经济TOKEN激励', city: '杭州', cityId: 4, subsidy: '100万TOKEN', deadline: '长期有效', type: 'TOKEN补贴', status: 'active', description: '参与数字经济建设，获得TOKEN生态激励', requirements: ['杭州注册企业', '数字经济相关业务', '接入TOKEN生态'] },
  { id: 5, title: '广州AI应用示范项目', city: '广州', cityId: 5, subsidy: '最高600万', deadline: '2026-10-31', type: '应用补贴', status: 'active', description: '支持AI技术在各行业应用示范', requirements: ['广州注册企业', '有成功应用案例', '可复制推广'] },
  { id: 6, title: '成都AI创业孵化计划', city: '成都', cityId: 6, subsidy: '最高200万', deadline: '2026-12-31', type: '创业补贴', status: 'active', description: '支持AI初创企业发展，提供场地和资金支持', requirements: ['成立时间<3年', 'AI核心技术', '融资轮次<A轮'] },
];

// 项目数据
const projectsData = [
  { id: 1, name: '智能客服系统', company: '智言科技', city: '北京', cityId: 1, stage: 'A轮', funding: '2000万', valuation: '1.2亿', team: '35人', founded: '2024-03', description: '基于大模型的智能客服解决方案', tags: ['NLP', '客服', '企业服务'], metrics: { users: '500+', revenue: '800万', growth: '150%' }, founder: { name: '张明', background: '清华博士，前百度NLP负责人' } },
  { id: 2, name: 'AI视觉检测平台', company: '视界智能', city: '深圳', cityId: 3, stage: 'B轮', funding: '5000万', valuation: '3亿', team: '80人', founded: '2023-06', description: '工业视觉检测和质量控制系统', tags: ['CV', '工业', '质检'], metrics: { users: '200+', revenue: '3000万', growth: '200%' }, founder: { name: '李华', background: '腾讯AI Lab前研究员' } },
  { id: 3, name: '智能投顾引擎', company: '财智AI', city: '上海', cityId: 2, stage: 'Pre-A', funding: '800万', valuation: '5000万', team: '20人', founded: '2024-08', description: 'AI驱动的智能投资顾问系统', tags: ['金融', '投资', 'AI'], metrics: { users: '1000+', revenue: '200万', growth: '180%' }, founder: { name: '王芳', background: '摩根士丹利前量化分析师' } },
  { id: 4, name: '医疗影像AI', company: '医智云', city: '杭州', cityId: 4, stage: 'A轮', funding: '3000万', valuation: '2亿', team: '50人', founded: '2023-01', description: '医疗影像智能诊断系统', tags: ['医疗', '影像', '诊断'], metrics: { users: '100+', revenue: '1500万', growth: '120%' }, founder: { name: '赵伟', background: '浙大医学院教授' } },
  { id: 5, name: '自动驾驶方案', company: '智行科技', city: '深圳', cityId: 3, stage: 'B轮', funding: '1亿', valuation: '8亿', team: '150人', founded: '2022-05', description: 'L4级自动驾驶解决方案', tags: ['自动驾驶', '汽车', 'AI'], metrics: { users: '10+', revenue: '5000万', growth: '300%' }, founder: { name: '刘强', background: '前小鹏自动驾驶负责人' } },
  { id: 6, name: 'AI教育平台', company: '智学教育', city: '北京', cityId: 1, stage: '天使轮', funding: '500万', valuation: '3000万', team: '15人', founded: '2024-10', description: 'AI个性化学习平台', tags: ['教育', 'AI', '个性化'], metrics: { users: '5000+', revenue: '100万', growth: '250%' }, founder: { name: '陈静', background: '好未来前产品总监' } },
];

// 获取城市列表
router.get('/cities', (req, res) => {
  res.json({ success: true, data: citiesData });
});

// 获取城市详情
router.get('/cities/:id', (req, res) => {
  const city = citiesData.find(c => c.id === parseInt(req.params.id));
  if (!city) return res.status(404).json({ success: false, error: '城市不存在' });
  
  const policies = policiesData.filter(p => p.cityId === city.id);
  const projects = projectsData.filter(p => p.cityId === city.id);
  
  res.json({ success: true, data: { ...city, policies, projects } });
});

// 获取政策列表
router.get('/policies', (req, res) => {
  const { cityId, type } = req.query;
  let policies = policiesData;
  
  if (cityId) policies = policies.filter(p => p.cityId === parseInt(cityId));
  if (type) policies = policies.filter(p => p.type === type);
  
  res.json({ success: true, data: policies });
});

// 获取政策详情
router.get('/policies/:id', (req, res) => {
  const policy = policiesData.find(p => p.id === parseInt(req.params.id));
  if (!policy) return res.status(404).json({ success: false, error: '政策不存在' });
  res.json({ success: true, data: policy });
});

// 获取项目列表
router.get('/projects', (req, res) => {
  const { filter, cityId } = req.query;
  let projects = projectsData;
  
  if (cityId) projects = projects.filter(p => p.cityId === parseInt(cityId));
  
  if (filter === 'hot') {
    projects = projects.filter(p => p.metrics.growth > '150%');
  } else if (filter === 'funding') {
    projects = projects.filter(p => ['A轮', 'B轮', 'C轮'].includes(p.stage));
  }
  
  res.json({ success: true, data: projects });
});

// 获取项目详情
router.get('/projects/:id', (req, res) => {
  const project = projectsData.find(p => p.id === parseInt(req.params.id));
  if (!project) return res.status(404).json({ success: false, error: '项目不存在' });
  res.json({ success: true, data: project });
});

// 申请补贴
router.post('/subsidies/apply', (req, res) => {
  const { userId, policyId, companyName, creditCode, legalPerson, phone, projectType, projectIntro, teamSize, funding } = req.body;
  
  if (!userId || !policyId || !companyName) {
    return res.status(400).json({ success: false, error: '必填信息不完整' });
  }
  
  const policy = policiesData.find(p => p.id === parseInt(policyId));
  if (!policy) return res.status(404).json({ success: false, error: '政策不存在' });
  
  const application = {
    id: Date.now(),
    userId,
    policyId,
    policyTitle: policy.title,
    companyName,
    creditCode,
    legalPerson,
    phone,
    projectType,
    projectIntro,
    teamSize,
    funding,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  notificationStore.create({ 
    userId, 
    type: 'opc', 
    title: '补贴申请已提交', 
    content: `您的${policy.title}补贴申请已提交，等待审核` 
  });
  
  res.json({ success: true, data: application, message: '申请已提交' });
});

// 获取统计数据
router.get('/stats', (req, res) => {
  const stats = {
    totalCities: citiesData.length,
    totalProjects: projectsData.length,
    totalSubsidy: 25.6,
    totalTokens: 5200,
    totalPolicies: policiesData.length,
  };
  
  res.json({ success: true, data: stats });
});

module.exports = router;
