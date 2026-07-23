// 龟钮·自驭 — 种子数据预设
// 引用自驭项目 seed 模块（跨项目引用）

const path = require('path');
const DEVECO_SEED = path.resolve('D:\\X402-DEVECO\\backend\\src\\seed\\seedData');
const seedData = require(DEVECO_SEED);

// 验证关键字段
const required = ['agents', 'contents', 'tasks', 'weightRecords'];
for (const key of required) {
  if (!seedData[key]) {
    throw new Error(`[deveco preset] 缺少必需数据: ${key}`);
  }
}

module.exports = seedData;