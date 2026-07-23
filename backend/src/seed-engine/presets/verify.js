// 龟钮·印证 — 种子数据预设
// 引用印证项目 seed 模块（跨项目引用）

const path = require('path');
const VERIFY_SEED = path.resolve('D:\\X402-GUINIU\\backend\\src\\seed\\seedData');
const seedData = require(VERIFY_SEED);

// 验证关键字段
const required = ['dataProducts', 'kolWeights', 'notaryRecords', 'governanceRecords', 'dataConsentRecords', 'earningsRecords'];
for (const key of required) {
  if (!seedData[key]) {
    throw new Error(`[verify preset] 缺少必需数据: ${key}`);
  }
}

module.exports = seedData;