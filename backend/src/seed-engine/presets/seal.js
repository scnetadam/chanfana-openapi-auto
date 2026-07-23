// 龟钮·印信 — 种子数据预设
// 引用主 seed 模块

const seedData = require('../../seed/seedData');

// 验证关键字段
const required = ['users', 'wallets', 'payments', 'contracts', 'transactions'];
for (const key of required) {
  if (!seedData[key]) {
    throw new Error(`[seal preset] 缺少必需数据: ${key}`);
  }
}

module.exports = seedData;