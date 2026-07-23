# 龟钮印信 - 系统架构文档

## 一、系统概述

**龟钮印信**是一个基于区块链溯源的汽车推广试驾平台，融合AI能力实现智能内容生成、KOL价值评估、微交易结算。

### 核心价值
- **C端用户**：发布用车体验 → 分享赚推广金 → 好友试驾获奖
- **B端商家**：发布推广活动 → 招募KOL任务 → 数据驱动决策
- **AI赋能**：智能内容生成、KOL价值评估、视频自动生成

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端层                              │
├──────────────────┬──────────────────┬──────────────────┤
│  支付宝小程序     │   微信小程序     │   HarmonyOS App  │
│  (uni-app)       │   (uni-app)      │   (ArkTS)        │
│  AppID: 202100...│  AppID: wx85f... │                  │
└──────────────────┴──────────────────┴──────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     API网关层                            │
│              Nginx (175.178.28.162)                      │
│         /api/* → Node.js :3000                           │
│         /pay/* → Python  :8000                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     后端服务层                           │
├──────────────────┬──────────────────┬──────────────────┤
│  Node.js API     │  Python Pay      │  AI Services     │
│  Express :3000   │  FastAPI :8000   │  GLM-4 / DALL-E  │
│  业务逻辑         │  支付结算         │  智能生成         │
│                  │  支付宝+微信      │  语音识别/合成    │
└──────────────────┴──────────────────┴──────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     数据存储层                           │
├──────────────────┬──────────────────┬──────────────────┤
│  内存存储         │  腾讯云COS       │  区块链存证       │
│  (开发环境)       │  图片/视频        │  内容哈希上链     │
└──────────────────┴──────────────────┴──────────────────┘
```

### 2.2 技术栈

**前端**
- 支付宝小程序：uni-app + Vue3 + TypeScript
- HarmonyOS App：ArkTS + ArkUI
- 状态管理：Pinia
- UI组件：自定义组件库

**后端**
- Node.js API：Express + JWT + 中间件
- Python支付：FastAPI + 支付宝SDK
- AI服务：智谱GLM-4 + DALL-E 3

**基础设施**
- 服务器：腾讯云 175.178.28.162
- 对象存储：腾讯云COS
- 支付：支付宝沙箱环境
- 域名：x402.chinaauto.ccwu.cc

---

## 三、功能模块

### 3.1 C端功能（用户端）

#### 核心流程
```
登录 → 浏览活动 → 发布内容 → 分享传播 → 预约试驾 → 获得奖励
```

#### 功能列表

| 模块 | 功能 | 页面 | 说明 |
|------|------|------|------|
| **引导登录** | 引导页 | `/pages/guide/index` | 3页滑动引导 |
| | 登录 | `/pages/login/index` | 支付宝/微信授权 |
| **活动推广** | 活动列表 | `/pages/activity/index` | 推广活动浏览 |
| | 活动详情 | `/pages/activity/detail` | 奖励规则说明 |
| **内容创作** | 发布内容 | `/pages/publish/index` | 图文+AI生成 |
| | 我的内容 | `/pages/dashboard/index` | 内容管理 |
| | 内容详情 | `/pages/share/index` | 分享+预约 |
| **视频中心** | 视频列表 | `/pages/video/index` | 视频浏览 |
| | 视频详情 | `/pages/video/detail` | 播放+互动 |
| | AI视频 | `/pages/aivideo/index` | AI生成视频 |
| **KOL任务** | 任务列表 | `/pages/koltask/index` | 任务大厅 |
| **AI评估** | AI看板 | `/pages/aidashboard/index` | 价值评估 |
| **钱包结算** | 我的钱包 | `/pages/wallet/index` | 余额+流水 |
| | 结算中心 | `/pages/settlement/index` | 结算记录 |
| **商家认证** | 认证页 | `/pages/bizcert/index` | 商家入驻 |

### 3.2 B端功能（商家端）

#### 核心流程
```
商家认证 → 创建活动 → 发布任务 → 审核内容 → 数据分析 → 结算支付
```

#### 功能列表

| 模块 | 功能 | 页面 | 说明 |
|------|------|------|------|
| **工作台** | 商家首页 | `/pages/biz/index` | 数据概览+快捷入口 |
| **认证管理** | 商家认证 | `/pages/biz/cert` | 资质审核 |
| **活动管理** | 活动列表 | `/pages/biz/activity` | 创建/编辑活动 |
| **任务管理** | KOL任务 | `/pages/biz/task` | 发布/审核任务 |
| **数据统计** | 数据看板 | `/pages/biz/stats` | 推广效果分析 |
| **结算管理** | 结算列表 | `/pages/biz/settlement` | 待结算处理 |
| **商品管理** | 商品列表 | `/pages/biz/products` | 优惠券/礼包 |

### 3.3 AI应用功能（新增）

#### AI能力矩阵

| 能力 | 应用场景 | API | 说明 |
|------|----------|-----|------|
| **智能内容生成** | 文案创作 | `/api/ai/generate-copy` | GLM-4生成多风格文案 |
| **KOL推荐** | 活动匹配 | `/api/ai/recommend` | 智能匹配KOL |
| **价值评估** | 内容评分 | `/api/ai/value-assess` | 多维度价值计算 |
| **AI顾问** | 智能问答 | `/api/ai/assistant` | 汽车知识问答 |
| **数据洞察** | 趋势分析 | `/api/ai/insight` | 推广数据洞察 |
| **AI视频** | 视频生成 | `/api/ai-video/*` | 模板化视频生成 |
| **AI字幕** | 语音识别 | `/api/ai-video/subtitle` | 自动生成字幕 |
| **AI剪辑** | 智能剪辑 | `/api/ai-video/edit` | 自动剪辑拼接 |
| **AI语音** | 语音识别 | `/api/ai/voice/recognize` | 实时语音转文字 |
| **AI语音** | 语音合成 | `/api/ai/voice/synthesize` | 文字转语音播报 |
| **AI语音** | 语音翻译 | `/api/ai/voice/translate` | 多语言实时翻译 |

---

## 四、数据模型

### 4.1 核心实体

```typescript
// 用户
interface User {
  id: string;
  nickName: string;
  avatarUrl: string;
  platform: 'alipay' | 'wechat';
  isBizCertified: boolean;
  reputationScore: number;
}

// 活动
interface Activity {
  id: string;
  brand: string;
  model: string;
  title: string;
  rewardPerView: number;
  rewardPerBooking: number;
  totalBudget: number;
  usedBudget: number;
  status: 'active' | 'ended';
}

// 内容
interface Content {
  id: string;
  userId: string;
  activityId: string;
  text: string;
  images: string[];
  hash: string;
  trackChain: TrackNode[];
  stats: {
    views: number;
    bookings: number;
    estimatedEarnings: number;
  };
}

// 追踪链
interface TrackNode {
  userId: string;
  role: 'originator' | 'spreader' | 'converter';
  nickName: string;
  timestamp: string;
}

// KOL任务
interface KolTask {
  id: string;
  bizUserId: string;
  type: string;
  rewardPerUnit: number;
  targetCount: number;
  completedCount: number;
  status: 'active' | 'completed';
}

// 结算
interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  fee: number;
  status: 'pending' | 'completed';
  hashProof: string;
}
```

### 4.2 价值计算模型

```typescript
// 价值计算公式
function calculateValue(content: Content): number {
  const baseValue = 1.0;
  
  const qualityScore = calculateQuality(content);
  const spreadScore = calculateSpread(content.trackChain);
  const kolScore = calculateKolScore(content.userId);
  const conversionScore = calculateConversion(content.stats.bookings);
  
  const weightMultiplier = (qualityScore + spreadScore + kolScore + conversionScore) / 4;
  
  const daysSincePublish = getDaysSince(content.createdAt);
  const timeDecay = Math.exp(-0.1 * daysSincePublish);
  
  const finalValue = baseValue * weightMultiplier * timeDecay;
  const platformFee = finalValue * 0.1;
  const distributable = finalValue - platformFee;
  
  return distributable;
}
```

---

## 五、API接口

### 5.1 接口列表

#### 认证授权
- `POST /api/auth/login` - 统一登录
- `GET /api/auth/verify` - 验证token

#### 活动管理
- `GET /api/activity/list` - 活动列表
- `GET /api/activity/:id` - 活动详情

#### 内容管理
- `POST /api/content/publish` - 发布内容
- `GET /api/content/:id` - 内容详情
- `POST /api/content/track/view` - 记录阅读

#### 预约管理
- `POST /api/booking/submit` - 提交预约

#### 钱包管理
- `GET /api/wallet/balance` - 余额查询
- `GET /api/wallet/transactions` - 交易流水

#### AI能力
- `POST /api/ai/generate-copy` - 生成文案
- `POST /api/ai/recommend` - KOL推荐
- `POST /api/ai/value-assess` - 价值评估
- `POST /api/ai/assistant` - AI问答
- `POST /api/ai/insight` - 数据洞察

#### AI视频
- `GET /api/ai-video/templates` - 模板列表
- `POST /api/ai-video/create` - 创建项目
- `POST /api/ai-video/projects/:id/generate` - 启动生成
- `GET /api/ai-video/projects/:id/progress` - 查询进度

#### B端管理
- `POST /api/biz/apply` - 商家认证申请
- `GET /api/biz/status` - 认证状态
- `POST /api/kol-task/:id/submit` - 提交任务
- `POST /api/settlement/create` - 创建结算

### 5.2 认证方式

```typescript
// JWT认证
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

---

## 六、部署架构

### 6.1 服务器配置

```yaml
服务器: 腾讯云 CentOS
IP: 175.178.28.162
域名: x402.chinaauto.ccwu.cc

服务:
  - Node.js API (端口3000)
  - Python Pay (端口8000)
  - Nginx (端口80/443)
  
进程管理:
  - systemd (x402-node.service)
  - systemd (x402-python.service)
```

### 6.2 Nginx配置

```nginx
server {
    listen 80;
    server_name 175.178.28.162 x402.chinaauto.ccwu.cc;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
    }

    location /pay/ {
        proxy_pass http://127.0.0.1:8000;
    }

    location /orders/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

### 6.3 环境变量

```bash
# Node.js (.env)
JWT_SECRET=your-secret-key
COS_SECRET_ID=xxx
COS_SECRET_KEY=xxx
GLM_API_KEY=xxx

# Python (.env)
ALIPAY_APPID=2021006168648698
ALIPAY_PRIVATE_KEY=xxx
```

---

## 七、安全机制

### 7.1 认证授权
- JWT Token认证
- 平台授权登录（支付宝/微信）
- 商家资质审核

### 7.2 数据安全
- 敏感信息加密存储
- HTTPS传输加密
- 接口限流防护

### 7.3 区块链存证
- 内容哈希上链
- 追踪链不可篡改
- 结算记录存证

---

## 八、性能优化

### 8.1 前端优化
- 代码分包加载
- 图片懒加载
- 接口缓存策略
- 骨架屏加载

### 8.2 后端优化
- 接口响应缓存
- 数据库索引优化
- 异步任务处理
- CDN加速

---

## 九、监控告警

### 9.1 日志监控
- 应用日志：console + 文件
- 错误上报：前端错误监控
- 性能监控：接口响应时间

### 9.2 业务监控
- 活动转化率
- KOL任务完成率
- 结算成功率
- AI生成成功率

---

## 十、开发规范

### 10.1 代码规范
- TypeScript严格模式
- ESLint代码检查
- 统一命名规范
- 注释文档化

### 10.2 Git规范
- 分支管理：main/dev/feature
- 提交规范：feat/fix/docs
- 代码审查：PR Review

### 10.3 接口规范
- RESTful设计
- 统一响应格式
- 错误码规范
- 版本管理

---

## 十一、未来规划

### 11.1 短期目标（1-2周）
- [ ] 完善AI应用中心
- [ ] 优化用户体验
- [ ] 完善错误处理
- [ ] 性能优化

### 11.2 中期目标（1-2月）
- [ ] 引入真实数据库
- [ ] 完善支付流程
- [ ] AI能力升级
- [ ] 数据分析增强

### 11.3 长期目标（3-6月）
- [ ] 多平台扩展
- [ ] 区块链主网部署
- [ ] AI模型训练
- [ ] 商业化运营

---

## 十二、KOL/KOC数据销售与分账机制（20260719升级）

### 12.1 核心业务流程

#### 流程一：B端购买数据
```
KOL/KOC产生数据 → 数据进入B端界面 → B端购买并支付 → 实时分账 → 数据存证龟钮印证
```

#### 流程二：实时动态支付
```
B端设置预算 → 账户验证 → KOL/KOC数据实时产生 → 实时支付 → 预算耗尽提醒 → 增加预算或数据滚入销售
```

#### 流程三：雇佣关系结算
```
B端与KOL/KOC建立雇佣关系 → 验证雇佣合同 → 其他用户数据结算 → 滚入流程一/二 → 数据存证
```

#### 流程四：升降权机制
```
KOL/KOC完成销售 → 评估数据品质 → 升权/降权 → 影响下次销售权重 → 挂钩新增数据品质
```

### 12.2 数据模型扩展

```typescript
// 数据销售订单
interface DataSalesOrder {
  id: string;
  bizUserId: string;           // B端用户ID
  kolUserId: string;           // KOL/KOC用户ID
  dataType: 'content' | 'leads' | 'engagement';
  dataId: string;              // 数据ID
  price: number;               // 购买价格
  status: 'pending' | 'paid' | 'settled';
  paymentProof: string;        // 支付凭证
  settlementProof: string;     // 分账凭证
  hashProof: string;           // 区块链存证哈希
  createdAt: string;
  settledAt: string;
}

// 预算账户
interface BudgetAccount {
  id: string;
  bizUserId: string;
  totalBudget: number;         // 总预算
  usedBudget: number;          // 已使用预算
  remainingBudget: number;     // 剩余预算
  autoRecharge: boolean;       // 自动充值
  rechargeThreshold: number;   // 充值阈值
  status: 'active' | 'exhausted' | 'paused';
}

// 雇佣关系
interface EmploymentContract {
  id: string;
  bizUserId: string;           // B端用户ID
  kolUserId: string;           // KOL/KOC用户ID
  contractType: 'exclusive' | 'non-exclusive';
  startDate: string;
  endDate: string;
  terms: string;               // 合同条款
  status: 'active' | 'expired' | 'terminated';
  verifiedAt: string;          // 验证时间
  verificationProof: string;   // 验证凭证
}

// KOL/KOC权重
interface KolWeight {
  userId: string;
  baseWeight: number;          // 基础权重
  dynamicWeight: number;       // 动态权重
  salesCount: number;          // 销售次数
  qualityScore: number;        // 数据品质评分
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastUpgradeAt: string;
  lastDowngradeAt: string;
}
```

### 12.3 API接口扩展

#### 数据销售接口
- `POST /api/data-sales/create` - 创建数据销售订单
- `POST /api/data-sales/:id/pay` - B端支付购买
- `POST /api/data-sales/:id/settle` - 分账结算
- `GET /api/data-sales/biz/list` - B端购买列表
- `GET /api/data-sales/kol/list` - KOL/KOC销售列表

#### 预算管理接口
- `POST /api/budget/create` - 创建预算账户
- `POST /api/budget/:id/recharge` - 充值预算
- `GET /api/budget/:id/status` - 查询预算状态
- `POST /api/budget/:id/config-auto-recharge` - 配置自动充值

#### 雇佣关系接口
- `POST /api/employment/create` - 创建雇佣关系
- `POST /api/employment/:id/verify` - 验证雇佣合同
- `GET /api/employment/biz/list` - B端雇佣列表
- `GET /api/employment/kol/list` - KOL/KOC雇佣列表
- `POST /api/employment/:id/settle-others` - 结算其他用户数据

#### 权重管理接口
- `GET /api/weight/:userId` - 查询KOL/KOC权重
- `POST /api/weight/:userId/upgrade` - 升权
- `POST /api/weight/:userId/downgrade` - 降权
- `POST /api/weight/calculate` - 计算动态权重

### 12.4 分账算法

```typescript
// 实时分账算法
function realTimeSettlement(order: DataSalesOrder): SettlementResult {
  const totalPrice = order.price;
  
  // 平台服务费 10%
  const platformFee = totalPrice * 0.1;
  
  // KOL/KOC收益 70%
  const kolEarnings = totalPrice * 0.7;
  
  // 数据存证费 5%
  const proofFee = totalPrice * 0.05;
  
  // B端数据使用费 15%
  const bizUsageFee = totalPrice * 0.15;
  
  // 计算KOL权重加成
  const kolWeight = getKolWeight(order.kolUserId);
  const weightBonus = kolEarnings * (kolWeight.dynamicWeight - 1);
  
  return {
    platformFee,
    kolEarnings: kolEarnings + weightBonus,
    proofFee,
    bizUsageFee,
    totalDistributed: platformFee + kolEarnings + weightBonus + proofFee + bizUsageFee
  };
}

// 权重计算算法
function calculateDynamicWeight(userId: string): number {
  const weight = getKolWeight(userId);
  
  // 基础权重
  let dynamicWeight = weight.baseWeight;
  
  // 销售次数加成
  dynamicWeight += Math.log10(weight.salesCount + 1) * 0.1;
  
  // 品质评分加成
  dynamicWeight += (weight.qualityScore / 100) * 0.5;
  
  // 等级加成
  const levelBonus = {
    'bronze': 0,
    'silver': 0.2,
    'gold': 0.5,
    'platinum': 1.0
  };
  dynamicWeight += levelBonus[weight.level];
  
  return Math.max(1.0, dynamicWeight);
}

// 升权判定
function checkUpgrade(userId: string): boolean {
  const weight = getKolWeight(userId);
  const recentSales = getRecentSales(userId, 30); // 最近30天销售
  
  // 升权条件
  const conditions = {
    bronze_to_silver: recentSales >= 10 && weight.qualityScore >= 60,
    silver_to_gold: recentSales >= 50 && weight.qualityScore >= 75,
    gold_to_platinum: recentSales >= 200 && weight.qualityScore >= 90
  };
  
  return Object.values(conditions).some(c => c);
}
```

### 12.5 前端页面扩展

#### B端新增页面
- `/pages/biz/data-market` - 数据市场（浏览KOL/KOC数据）
- `/pages/biz/data-purchased` - 已购数据管理
- `/pages/biz/budget-manage` - 预算管理
- `/pages/biz/employment` - 雇佣关系管理
- `/pages/biz/settlement-realtime` - 实时结算看板

#### KOL/KOC新增页面
- `/pages/kol/data-sales` - 数据销售记录
- `/pages/kol/weight-dashboard` - 权重看板
- `/pages/kol/employment-contracts` - 雇佣合同列表
- `/pages/kol/earnings-realtime` - 实时收益看板

### 12.6 智能合约逻辑

```solidity
// 数据存证合约（简化版）
contract DataProof {
    struct Proof {
        bytes32 dataHash;
        address bizOwner;
        address kolOwner;
        uint256 price;
        uint256 timestamp;
        bool verified;
    }
    
    mapping(bytes32 => Proof) public proofs;
    
    function createProof(
        bytes32 dataHash,
        address kolOwner,
        uint256 price
    ) public returns (bool) {
        proofs[dataHash] = Proof({
            dataHash: dataHash,
            bizOwner: msg.sender,
            kolOwner: kolOwner,
            price: price,
            timestamp: block.timestamp,
            verified: true
        });
        return true;
    }
    
    function verifyProof(bytes32 dataHash) public view returns (bool) {
        return proofs[dataHash].verified;
    }
}
```

### 12.7 业务规则

1. **数据定价规则**
   - 基础价格 = 数据类型基础价 × KOL权重
   - 实时价格 = 基础价格 × 时段系数 × 需求系数

2. **分账规则**
   - 平台：10%
   - KOL/KOC：70%（含权重加成）
   - 数据存证：5%
   - B端使用：15%

3. **升降权规则**
   - 青铜→白银：30天内销售≥10次，品质分≥60
   - 白银→黄金：30天内销售≥50次，品质分≥75
   - 黄金→铂金：30天内销售≥200次，品质分≥90
   - 降权：连续30天无销售或品质分<当前等级要求

4. **预算规则**
   - 预算耗尽前1小时提醒
   - 支持自动充值（需预授权）
   - 预算暂停后数据停止实时支付，滚入待销售池
