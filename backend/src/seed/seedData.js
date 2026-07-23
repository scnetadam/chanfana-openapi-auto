// 龟钮·印证 — 种子数据模块
const dataProducts = [
  { id: 'prod_001', name: '车型热度指数（7月）', category: '汽车数据', price: 500, description: '2026年7月各车型搜索热度排行', tags: ['热度', '排行', '7月'], salesCount: 128, rating: 4.5 },
  { id: 'prod_002', name: '新能源车价格走势月报', category: '汽车数据', price: 800, description: '新能源车价格波动分析及预测', tags: ['新能源', '价格', '走势'], salesCount: 85, rating: 4.8 },
  { id: 'prod_003', name: 'SUV销量排行TOP50', category: '汽车数据', price: 300, description: '2026年上半年SUV车型销量排名', tags: ['SUV', '销量', '排行'], salesCount: 203, rating: 4.2 },
  { id: 'prod_004', name: '购车意向用户画像报告', category: '用户画像', price: 1500, description: '基于10万+用户行为数据的购车意向分析', tags: ['画像', '购车意向', '用户分析'], salesCount: 45, rating: 4.9 },
  { id: 'prod_005', name: '品牌偏好度分析', category: '用户画像', price: 2000, description: '各汽车品牌在目标人群中的偏好度排名', tags: ['品牌', '偏好', '分析'], salesCount: 32, rating: 4.6 },
  { id: 'prod_006', name: '价格区间分布数据', category: '用户画像', price: 600, description: '购车用户价格接受区间分布统计', tags: ['价格', '区间', '分布'], salesCount: 98, rating: 4.3 },
  { id: 'prod_007', name: '用户浏览行为追踪', category: '行为数据', price: 1200, description: '用户在平台上的浏览路径和停留时长数据', tags: ['浏览', '行为', '追踪'], salesCount: 56, rating: 4.4 },
  { id: 'prod_008', name: '互动数据深度分析', category: '行为数据', price: 900, description: '点赞、评论、分享等互动行为分析', tags: ['互动', '分析', '社交'], salesCount: 67, rating: 4.1 },
  { id: 'prod_009', name: '内容分享传播链追踪', category: '行为数据', price: 1800, description: 'KOL/KOC内容分享的传播路径追踪', tags: ['分享', '传播', 'KOL'], salesCount: 23, rating: 4.7 },
  { id: 'prod_010', name: '2026年Q2汽车行业报告', category: '行业报告', price: 5000, description: '2026年第二季度汽车行业全面分析报告', tags: ['行业', '报告', 'Q2'], salesCount: 15, rating: 5.0 },
  { id: 'prod_011', name: '竞品车型对比分析', category: '行业报告', price: 3500, description: '主流车型竞品对比分析报告', tags: ['竞品', '对比', '分析'], salesCount: 28, rating: 4.5 },
  { id: 'prod_012', name: '汽车消费趋势预测', category: '行业报告', price: 4200, description: '基于AI模型的2026下半年消费趋势预测', tags: ['趋势', '预测', 'AI'], salesCount: 19, rating: 4.8 },
];

const kolWeights = [
  { id: 'kw_001', userId: 'user_001', hash: 'hash_a1b2c3d4', weight: 0.85, category: '车型评测', updatedAt: '2026-07-15' },
  { id: 'kw_002', userId: 'user_004', hash: 'hash_e5f6a7b8', weight: 0.72, category: '内容分发', updatedAt: '2026-07-16' },
  { id: 'kw_003', userId: 'user_005', hash: 'hash_c9d0e1f2', weight: 0.91, category: '新能源车', updatedAt: '2026-07-17' },
  { id: 'kw_004', userId: 'user_008', hash: 'hash_a3b4c5d6', weight: 0.78, category: 'AI技术', updatedAt: '2026-07-18' },
  { id: 'kw_005', userId: 'user_001', hash: 'hash_e7f8a9b0', weight: 0.88, category: '深度评测', updatedAt: '2026-07-19' },
];

const notaryRecords = [
  { id: 'not_001', userId: 'user_001', documentType: 'content_hash', documentHash: 'sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b', status: 'certified', certifiedAt: '2026-07-01T10:30:00Z', provider: 'ipfs' },
  { id: 'not_002', userId: 'user_005', documentType: 'content_hash', documentHash: 'sha256:b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c', status: 'certified', certifiedAt: '2026-07-05T14:00:00Z', provider: 'arweave' },
  { id: 'not_003', userId: 'user_004', documentType: 'contract', documentHash: 'sha256:c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d', status: 'pending', provider: 'ipfs' },
  { id: 'not_004', userId: 'user_008', documentType: 'ai_output', documentHash: 'sha256:d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', status: 'certified', certifiedAt: '2026-07-15T09:00:00Z', provider: 'dual' },
  { id: 'not_005', userId: 'user_002', documentType: 'transaction', documentHash: 'sha256:e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5', status: 'certified', certifiedAt: '2026-07-18T16:30:00Z', provider: 'arweave' },
];

const governanceRecords = [
  { id: 'gov_001', type: 'compliance', status: 'pass', content: '7月数据合规检查：所有数据产品均通过隐私合规审查', checkedAt: '2026-07-05', inspector: 'system_auto' },
  { id: 'gov_002', type: 'audit', status: 'warning', content: '数据产品 prod_009 内容分享传播链追踪：数据来源需补充授权声明', checkedAt: '2026-07-10', inspector: 'audit_001' },
  { id: 'gov_003', type: 'report', status: 'generated', content: '2026年Q2数据交易合规报告', checkedAt: '2026-07-15', inspector: 'system_auto' },
  { id: 'gov_004', type: 'alert', status: 'active', content: '用户 user_001 高频交易触发风控规则', checkedAt: '2026-07-19', inspector: 'system_risk' },
  { id: 'gov_005', type: 'compliance', status: 'pass', content: 'AI服务数据使用合规检查：所有AI输出均已标注来源', checkedAt: '2026-07-20', inspector: 'system_auto' },
];

const dataConsentRecords = [
  { id: 'dc_001', userId: 'user_001', dataType: 'behavior', enabled: true, scope: 'platform_only', grantedAt: '2026-06-01', expiresAt: '2027-06-01' },
  { id: 'dc_002', userId: 'user_004', dataType: 'content', enabled: true, scope: 'marketplace', grantedAt: '2026-06-10', expiresAt: '2027-06-10' },
  { id: 'dc_003', userId: 'user_005', dataType: 'all', enabled: true, scope: 'full', grantedAt: '2026-06-05', expiresAt: '2027-06-05' },
  { id: 'dc_004', userId: 'user_008', dataType: 'ai_output', enabled: true, scope: 'marketplace', grantedAt: '2026-06-20', expiresAt: '2027-06-20' },
  { id: 'dc_005', userId: 'user_003', dataType: 'basic', enabled: false, scope: 'none', grantedAt: '2026-06-15', expiresAt: '2026-12-15' },
];

const earningsRecords = [
  { id: 'earn_001', userId: 'user_001', amount: 5000, source: 'data_sale', productId: 'prod_001', status: 'settled', settledAt: '2026-07-01' },
  { id: 'earn_002', userId: 'user_004', amount: 12000, source: 'data_sale', productId: 'prod_007', status: 'settled', settledAt: '2026-07-03' },
  { id: 'earn_003', userId: 'user_005', amount: 8000, source: 'data_sale', productId: 'prod_004', status: 'settled', settledAt: '2026-07-02' },
  { id: 'earn_004', userId: 'user_006', amount: 25000, source: 'data_sale', productId: 'prod_010', status: 'settled', settledAt: '2026-07-08' },
  { id: 'earn_005', userId: 'user_008', amount: 6000, source: 'data_sale', productId: 'prod_011', status: 'pending', settledAt: null },
  { id: 'earn_006', userId: 'user_001', amount: 15000, source: 'data_sale', productId: 'prod_002', status: 'pending', settledAt: null },
];

module.exports = { dataProducts, kolWeights, notaryRecords, governanceRecords, dataConsentRecords, earningsRecords };
