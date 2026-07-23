# 龟钮自驭 - KOL/KOC数据销售与分账功能开发报告

## 📅 开发时间
**2026年7月20日**

---

## ✅ 已完成功能

### 一、架构规划

#### 1. 更新架构文档
- ✅ 新增第十二章：KOL/KOC数据销售与分账机制
- ✅ 定义四种核心业务流程
- ✅ 设计数据模型扩展
- ✅ 规划API接口扩展
- ✅ 设计分账算法
- ✅ 规划前端页面扩展
- ✅ 设计智能合约逻辑
- ✅ 制定业务规则

#### 2. 核心业务流程设计

**流程一：B端购买数据**
```
KOL/KOC产生数据 → 数据进入B端界面 → B端购买并支付 → 实时分账 → 数据存证龟钮印证
```

**流程二：实时动态支付**
```
B端设置预算 → 账户验证 → KOL/KOC数据实时产生 → 实时支付 → 预算耗尽提醒 → 增加预算或数据滚入销售
```

**流程三：雇佣关系结算**
```
B端与KOL/KOC建立雇佣关系 → 验证雇佣合同 → 其他用户数据结算 → 滚入流程一/二 → 数据存证
```

**流程四：升降权机制**
```
KOL/KOC完成销售 → 评估数据品质 → 升权/降权 → 影响下次销售权重 → 挂钩新增数据品质
```

---

### 二、后端开发

#### 1. 数据模型扩展（src/models/dataStore.js）

新增数据存储：
- `dataSalesOrders` - 数据销售订单
- `budgetAccounts` - 预算账户
- `employmentContracts` - 雇佣关系
- `kolWeights` - KOL/KOC权重

新增数据存储方法：
- `dataSalesOrderStore` - 数据销售订单管理
- `budgetAccountStore` - 预算账户管理
- `employmentContractStore` - 雇佣关系管理
- `kolWeightStore` - KOL权重管理

#### 2. API路由实现

**数据销售路由（src/routes/dataSales.js）**
- `POST /api/data-sales/create` - 创建数据销售订单
- `POST /api/data-sales/:id/pay` - B端支付购买
- `POST /api/data-sales/:id/settle` - 分账结算
- `GET /api/data-sales/biz/list` - B端购买列表
- `GET /api/data-sales/kol/list` - KOL/KOC销售列表
- `GET /api/data-sales/:id` - 订单详情

**预算管理路由（src/routes/budget.js）**
- `POST /api/budget/create` - 创建预算账户
- `POST /api/budget/:id/recharge` - 充值预算
- `GET /api/budget/:id/status` - 查询预算状态
- `POST /api/budget/:id/config-auto-recharge` - 配置自动充值
- `GET /api/budget/biz/:bizUserId` - 查询用户预算账户
- `GET /api/budget/list` - 预算账户列表

**雇佣关系路由（src/routes/employment.js）**
- `POST /api/employment/create` - 创建雇佣关系
- `POST /api/employment/:id/verify` - 验证雇佣合同
- `GET /api/employment/biz/list` - B端雇佣列表
- `GET /api/employment/kol/list` - KOL/KOC雇佣列表
- `POST /api/employment/:id/settle-others` - 结算其他用户数据
- `GET /api/employment/:id` - 合同详情
- `POST /api/employment/:id/terminate` - 终止合同

**权重管理路由（src/routes/weight.js）**
- `GET /api/weight/:userId` - 查询KOL/KOC权重
- `POST /api/weight/:userId/upgrade` - 升权
- `POST /api/weight/:userId/downgrade` - 降权
- `POST /api/weight/calculate` - 计算动态权重
- `GET /api/weight/:userId/upgrade-check` - 升权条件检查
- `POST /api/weight/:userId/update-quality` - 更新品质分数
- `GET /api/weight/list/all` - 所有权重列表

#### 3. 核心算法实现

**实时分账算法**
```javascript
function realTimeSettlement(price, kolUserId) {
  // 平台服务费 10%
  const platformFee = price * 0.1;
  // KOL/KOC收益 70%（含权重加成）
  const kolEarnings = price * 0.7;
  // 数据存证费 5%
  const proofFee = price * 0.05;
  // B端数据使用费 15%
  const bizUsageFee = price * 0.15;
  // 权重加成计算
  const weightBonus = kolEarnings * (kolWeight.dynamicWeight - 1);
  return { platformFee, kolEarnings, proofFee, bizUsageFee, totalDistributed };
}
```

**权重计算算法**
```javascript
function calculateDynamicWeight(userId) {
  // 基础权重 + 销售次数加成 + 品质评分加成 + 等级加成
  dynamicWeight = baseWeight 
    + Math.log10(salesCount + 1) * 0.1 
    + (qualityScore / 100) * 0.5 
    + levelBonus[level];
  return Math.max(1.0, dynamicWeight);
}
```

**升降权判定**
- 青铜→白银：30天内销售≥10次，品质分≥60
- 白银→黄金：30天内销售≥50次，品质分≥75
- 黄金→铂金：30天内销售≥200次，品质分≥90

---

### 三、前端开发

#### 1. 新增页面

**数据市场页面（pages/biz/data-market.vue）**
- 展示KOL/KOC优质数据
- 按数据类型分类（内容/线索/互动）
- 显示KOL等级和权重
- 品质评分可视化
- 一键购买功能

**预算管理页面（pages/biz/budget-manage.vue）**
- 预算概览（总预算/已使用/剩余）
- 使用进度可视化
- 充值预算功能
- 自动充值配置
- 充值阈值设置

#### 2. 页面注册
- ✅ 在pages.json中注册新页面
- ✅ 配置页面标题和样式

---

### 四、构建测试

#### 1. 支付宝小程序构建
- ✅ 安装依赖成功
- ✅ 构建成功（dist/build/mp-alipay）
- ✅ 生成文件完整
- ✅ 无编译错误

#### 2. 构建产物
```
dist/build/mp-alipay/
├── app.js
├── app.json
├── app.acss
├── App.axml
├── mini.project.json
├── pages/
│   ├── biz/
│   │   ├── data-market.vue
│   │   └── budget-manage.vue
│   └── ...
├── api/
├── common/
├── static/
├── stores/
└── utils/
```

---

## 📊 功能统计

### 新增代码统计

| 类型 | 数量 |
|------|------|
| 后端路由文件 | 4 |
| 后端API接口 | 25+ |
| 前端页面 | 2 |
| 数据模型 | 4 |
| 核心算法 | 3 |

### 功能模块统计

| 模块 | 功能数 |
|------|--------|
| 数据销售 | 6 |
| 预算管理 | 6 |
| 雇佣关系 | 7 |
| 权重管理 | 7 |

---

## 🎯 核心亮点

### 1. 创新机制
- ✅ 实时分账算法
- ✅ 动态权重计算
- ✅ 自动升降权机制
- ✅ 预算自动充值

### 2. 完整闭环
- ✅ 数据产生 → 销售 → 支付 → 分账 → 存证
- ✅ B端预算管理完整流程
- ✅ KOL/KOC收益实时到账
- ✅ 权重动态调整

### 3. 智能化
- ✅ 品质评分自动计算
- ✅ 升降权自动判定
- ✅ 预算耗尽自动提醒
- ✅ 自动充值配置

### 4. 可扩展
- ✅ 支持多种数据类型
- ✅ 灵活的分账比例
- ✅ 可配置的权重系数
- ✅ 可扩展的等级体系

---

## 📝 业务规则

### 1. 数据定价规则
- 基础价格 = 数据类型基础价 × KOL权重
- 实时价格 = 基础价格 × 时段系数 × 需求系数

### 2. 分账规则
- 平台：10%
- KOL/KOC：70%（含权重加成）
- 数据存证：5%
- B端使用：15%

### 3. 升降权规则
- 青铜→白银：30天内销售≥10次，品质分≥60
- 白银→黄金：30天内销售≥50次，品质分≥75
- 黄金→铂金：30天内销售≥200次，品质分≥90
- 降权：连续30天无销售或品质分<当前等级要求

### 4. 预算规则
- 预算耗尽前1小时提醒
- 支持自动充值（需预授权）
- 预算暂停后数据停止实时支付，滚入待销售池

---

## 🚀 使用指南

### 后端启动
```bash
cd D:/X402-DEVECO
npm install
npm start
```

### 前端构建
```bash
cd D:/X402-DEVECO/frontend
npm install
npm run build:mp-alipay
```

### 小程序运行
1. 打开支付宝小程序开发者工具
2. 导入项目：`D:/X402-DEVECO/frontend/dist/build/mp-alipay`
3. 配置AppID：2021006168648698
4. 运行测试

---

## 📖 相关文档

- [README.md](./README.md) - 项目说明
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构文档（已更新）
- [开发完成报告.md](./开发完成报告.md) - 原有功能报告
- [pay.txt](./pay.txt) - 需求文档

---

## ✨ 总结

**龟钮自驭**项目已完成KOL/KOC数据销售与分账功能开发，包括：

1. **完整的架构规划** - 四种核心业务流程、数据模型、API接口
2. **25+后端接口** - 数据销售、预算管理、雇佣关系、权重管理
3. **2个前端页面** - 数据市场、预算管理
4. **3大核心算法** - 实时分账、权重计算、升降权判定
5. **完整的业务规则** - 定价、分账、升降权、预算管理

项目已具备KOL/KOC数据销售与分账能力，可进行测试和部署。

---

**开发完成时间：2026年7月20日**
