# 龟钮印信 — X402-DEVECO 汽车资讯 KOL 加权评估与微交易平台

> **龟钮印信**：汽车资讯分享与 KOL 价值评估平台，基于 AI 加权计算 KOL 对 KOC 的价值评估，
> 通过 X402 微交易支付实现实时结算，KOL 可通过 B 端任务加挂实现在线分佣。
> 支付与会员能力由 **龟钮印证（X402 支付中台）** 统一提供。

## 架构定位

```
┌────────────────────────────────────────────────────────────┐
│                   龟钮印信 (汽车资讯 · KOL 评估)                 │
│                 D:\X402-DEVECO (本目录)                          │
│   HarmonyOS App · 支付宝小程序 · AI 加权评估 · 微交易结算         │
│   KOL 审核 · OPC 创业支持 · IP 存证 · B端任务分佣                 │
│                     ↓ 调用龟钮印证 API                           │
├────────────────────────────────────────────────────────────┤
│                   龟钮印证 (支付中台 L0 层)                       │
│                   D:\X402                                     │
│   支付宝支付 · 微信支付 · 会员体系 · 钱包 · 鉴权                  │
├────────────────────────────────────────────────────────────┤
│                     基础设施层                                   │
│          华为云服务器 (4C8G) · Docker · nginx                    │
│          Cloudflare Worker · X402 微交易协议                     │
└────────────────────────────────────────────────────────────┘
```

### 多端架构

```
                  ┌─────────────────────┐
                  │   HarmonyOS App     │ ← ArkTS (entry/src/main/ets)
                  │   5Tab 主框架         │   活动/任务/AI评估/结算/我的
                  └─────────┬───────────┘
                            │ HTTP (10.0.2.2:3000)
                  ┌─────────┴───────────┐
                  │   支付宝小程序        │ ← uni-app (frontend/src)
                  │   7页面轻量版         │   登录/活动/发布/看板/分享/预约/钱包
                  └─────────┬───────────┘
                            │ HTTP (localhost:3000)
                  ┌─────────┴───────────┐
│   Node.js API 后端   │ ← Express (src/index.js :3000)
│   17 路由模块 + JWT认证│   AI引擎 · 归因引擎 · 审核引擎
                  └─────────┬───────────┘
                            │ HTTP
                  ┌─────────┴───────────┐
                  │   Python 支付后端     │ ← FastAPI (server.py :8000)
                  │   龟钮印证支付中台     │   支付宝沙箱 · 微信 · 钱包
                  └─────────────────────┘
```

## 核心业务规则

### KOL 审核规则

| 条件 | 要求 | 说明 |
|------|------|------|
| **标准审核** | 粉丝 > 2000 | KOL 提交审核，平台验证粉丝数 |
| **B端授权** | 无粉丝门槛 | B 端商家通过龟钮印证认证后可直接授权 KOL |
| **B端邀请** | 无粉丝门槛 | B 端商家邀请的 KOL 免审核直接通过 |
| **同类平台基础** | 粉丝 > 1000 | 在同类平台有运营基础的可单独提交审核 |
| **OPC 创业支持** | 粉丝 > 1000 + 同类平台基础 | 可申请 OPC 创业支持计划 |

**审核执行逻辑**：
- 标准审核：系统自动验证粉丝数 > 2000，通过 AI 评分评估内容质量
- B端授权/邀请：需 B 端已完成龟钮印证企业认证，授权码/邀请码校验通过即自动通过
- 同类平台基础：需提供平台链接及粉丝证明，AI 自动审核
- OPC 申请：需已通过 KOL 审核且粉丝 > 1000 + 有同类平台运营记录

### B 端商家认证

- B 端需通过 **龟钮印证企业认证**（提交企业名称、统一信用代码、法人信息、联系方式等）
- 统一信用代码：18 位格式校验
- 认证通过后可：发布 KOL 任务、创建商家产品、在线分佣、授权/邀请 KOL
- AI 自动审核，快速通过
- 认证状态：未申请 → 审核中 → 已认证/已拒绝

### AI 加权评估体系

| 权重维度 | 说明 | 指标 | 计算方式 |
|----------|------|------|----------|
| **传播权重** | 内容传播广度 | 阅读量、分享数、覆盖面 | spreadWeight = min(views/1000, 1.0) * 0.3 |
| **转化权重** | KOC 转化能力 | 试驾预约率、成交率 | conversionWeight = bookings/views * 0.4 |
| **质量权重** | 内容质量评分 | AI 内容评分、用户反馈 | qualityWeight = aiScore/100 * 0.3 |
| **KOL 乘数** | 综合加权系数 | 加权乘数 = 传播 + 转化 + 质量 | multiplier = spread + conversion + quality |

**实时结算规则**：
- 每次转化（浏览/预约/成交）触发 AI 加权计算
- 加权乘数 × 基础单价 = 实际结算金额
- 手续费 0.6%，净额即时入账
- 每笔结算含 HASH 存证 + AI 验证，确保透明可追溯

### 微交易实时结算

- 基于 X402 微交易支付，KOL 收益 **实时结算**
- 结算类型：KOL 分佣、预约奖励、内容奖励、数据收益
- 每笔结算含：HASH 存证 + AI 验证，确保透明可追溯
- 手续费 0.6% 自动扣除，净额即时入账
- AI 风险验证：金额 >= 100 元触发 AI 风控，加权乘数 < 0.5 标记为高风险

### OPC 创业支持

- 享有平台基础 AI 免费功能
- 可申请 **折扣使用指定 AI 工具大模型**
- 免费额度：基础 AI 评估、内容优化建议
- 折扣工具：指定大模型 API（5 折）、高级数据分析（6 折）等
- OPC 专属 AI 工具：标注 `isFreeForOpc` 的工具可免费使用
- AI 额度管理：免费额度按月分配，用尽后按折扣价计费

### IP 存证体系

- 所有核心业务动作均触发 HASH 存证：内容发布、任务创建、结算执行、分佣记录
- 存证数据：SHA-256 摘要 + 原始数据摘要 + 业务元数据
- 双重存证：本地存证（hashStore）+ 龟钮印证远程存证
- 存证查询/验证：支持按 txId 查询，支持存证完整性验证

## 功能模块

| 模块 | 说明 | 页面 | 状态 |
|------|------|------|------|
| **登录** | 昵称登录，HarmonyOS 平台 | LoginPage | ✅ 已完成 |
| **活动推广** | 汽车品牌活动列表、详情、奖励 | ActivitiesPage / ActivityDetailPage | ✅ 已完成 |
| **试驾预约** | 用户提交试驾预约、核销 | BookingPage | ✅ 已完成 |
| **内容传播** | 发布推广内容、追踪浏览量 | PublishPage / SharePage | ✅ 已完成 |
| **分享裂变** | 推广链路追踪、奖励计算 | SharePage（归因引擎） | ✅ 已完成 |
| **KOL 任务** | B端任务加挂、在线分佣 | KolTaskPage | ✅ 已完成 |
| **AI 评估** | KOL 加权价值评估、洞察建议 | AiDashboardPage | ✅ 已完成 |
| **微交易结算** | 实时结算、分佣明细、HASH 存证 | SettlementPage | ✅ 已完成 |
| **推广钱包** | 余额查询、交易流水、提现 | WalletPage | ✅ 已完成 |
| **KOL 审核** | 粉丝验证、B端授权、OPC 申请 | KolAuditPage | ✅ 已完成 |
| **OPC 创业支持** | 免费额度、折扣工具、权益管理 | OpcSupportPage | ✅ 已完成 |
| **AI 工具市场** | 大模型折扣、OPC 免费工具 | AiToolsPage | ✅ 已完成 |
| **B端认证** | 企业认证、审核状态 | BizCertPage | ✅ 已完成 |
| **IP存证中心** | HASH 存证、验证、查询 | HashPage | ✅ 已完成 |
| **推广看板** | 推广数据概览 | DashboardPage | ✅ 已完成 |
| **消息通知** | 系统通知列表、已读标记 | NotificationsPage | ✅ 已完成 |
| **个人设置** | 昵称修改、退出登录 | ProfilePage | ✅ 已完成 |
| **CFS存储** | 腾讯CFS数据存储、一键申请 | CfsStoragePage | 🚧 开发中 |
| **MAAS广场** | 大模型选择、接入管理 | MaasPlazaPage | 🚧 开发中 |
| **视频流** | 视频上传、播放、管理 | VideoStreamPage | 🚧 开发中 |
| **AI视频制作** | AI剪辑、字幕、特效 | AiVideoMakerPage | 🚧 开发中 |
| **立体展示** | 3D车型展示、AR看车 | StereoDisplayPage | 🚧 开发中 |

## 目录结构

```
D:\X402-DEVECO\
├── entry/                          # HarmonyOS HAP 模块
│   └── src/main/ets/
│       ├── pages/                  #   ArkTS 页面
│       │   ├── Index.ets           #     主页 (5Tab: 活动/任务/AI评估/结算/我的)
│       │   ├── login/              #     登录页
│       │   ├── activities/         #     活动列表
│       │   ├── activitydetail/     #     活动详情
│       │   ├── publish/            #     发布推广
│       │   ├── share/              #     内容分享 (含预约)
│       │   ├── booking/            #     预约结果
│       │   ├── koltask/            #     KOL 任务中心
│       │   ├── kolaudit/           #     KOL 审核
│       │   ├── aidashboard/        #     AI 评估看板
│       │   ├── aitools/            #     AI 工具市场
│       │   ├── opcsupport/         #     OPC 创业支持
│       │   ├── settlement/         #     微交易结算
│       │   ├── wallet/             #     推广钱包
│       │   ├── dashboard/          #     推广看板
│       │   ├── bizcert/            #     B端商家认证
│       │   ├── hash/               #     IP 存证中心
│       │   ├── notifications/      #     消息通知
│       │   └── profile/            #     个人设置
│       ├── common/                 #   公共工具
│       │   ├── HttpClient.ets      #     HTTP 请求封装 (GET/POST/PUT + Token)
│       │   └── Constants.ets       #     配置常量 (API_BASE / SHARE_BASE_URL)
│       ├── model/                  #   数据模型
│       │   ├── DataModels.ets      #     全部数据模型 (30+ 模型类, 含NotificationItem)
│       │   └── RouterParams.ets    #     路由参数
│       └── entryability/           #   Ability 入口
│           └── EntryAbility.ets    #     应用生命周期
├── frontend/                       # 龟钮印信·支付宝小程序源码 (uni-app)
│   └── src/
│       ├── pages/                  #   login/activity/publish/dashboard/share/booking/wallet
│       ├── api/                    #   API 封装
│       └── stores/                 #   状态管理
├── mp-alipay/                      # 支付宝小程序构建产物
├── src/                            # Node.js API 后端（汽车资讯数据）
│   ├── routes/                     #   路由 (17 模块)
│   │   ├── auth.js                 #     认证 (登录/用户信息/资料修改)
│   │   ├── activity.js             #     活动 (列表/详情)
│   │   ├── content.js              #     内容 (发布/详情/追踪/归因)
│   │   ├── booking.js              #     预约 (提交/核销/查询)
│   │   ├── wallet.js               #     钱包 (余额/流水/提现)
│   │   ├── kolTask.js              #     KOL 任务 (创建/领取/提交/收益)
│   │   ├── kolAudit.js             #     KOL 审核 (提交/审核/OPC申请)
│   │   ├── ai.js                   #     AI 服务 (文案/推荐/洞察/助手/评估/看板)
│   │   ├── aiTools.js              #     AI 工具 (列表/订阅/使用)
│   │   ├── agentTools.js           #     Agent 工具 (目录/订阅/执行)
│   │   ├── llm.js                  #     LLM (模型/偏好/密钥/聊天)
│   │   ├── settlement.js           #     结算 (创建/执行/列表/统计)
│   │   ├── commission.js           #     分佣 (列表/统计)
│   │   ├── biz.js                  #     B端认证 (申请/状态/搜索)
│   │   ├── bizProduct.js           #     B端产品 (创建/列表/转化/下架)
│   │   ├── opc.js                  #     OPC 支持 (信息/申请/审核)
│   │   ├── hash.js                 #     IP 存证 (创建/查询/验证/统计)
│   │   ├── notification.js         #     通知 (列表/已读/全部已读)
│   │   └── upload.js               #     上传 (图片)
│   ├── models/                     #   数据存储 (dataStore.js — 集中式)
│   ├── middleware/                  #   中间件
│   │   └── auth.js                  #     JWT认证 (generateToken + authMiddleware)
│   ├── index.js                    #   Express 服务入口 (port 3000)
│   ├── attributionEngine.js        #   归因引擎 (链路追踪/分佣计算)
│   ├── aiValueEngine.js            #   AI 价值评估引擎 (加权计算)
│   ├── kolAuditEngine.js           #   KOL 审核引擎 (粉丝验证/OPC资格)
│   ├── opcSupportEngine.js         #   OPC 支持引擎 (额度/折扣)
│   ├── hashEngine.js               #   HASH 存证引擎 (SHA-256)
│   ├── glmClient.js                #   智谱 GLM API 客户端
│   ├── yinzhengClient.js           #   龟钮印证 API 客户端
│   └── workerClient.js             #   Cloudflare Worker 客户端
├── payment_backends/               # Python 支付宝支付后端
│   ├── base.py                     #   支付基类
│   ├── alipay.py                   #   支付宝沙箱支付
│   └── demo.py                     #   Demo 虚拟支付
├── server.py                       # FastAPI 支付服务入口 (port 8000)
├── worker/                         # Cloudflare Worker 边缘服务
│   └── src/worker.js               #   Worker 入口
├── Dockerfile                      # Python 支付 Docker 镜像
├── Dockerfile.harmony              # HarmonyOS 构建 Docker 镜像
├── docker-compose.yml              # Docker Compose 编排
├── build-profile.json5             # HarmonyOS 构建配置 (SDK 6.0.2)
├── oh-package.json5                # OH 包配置
└── CODING_STANDARDS.md             # 编码规范
```

## 数据归属

| 应用 | 数据类型 | 后端 | 端口 |
|------|---------|------|------|
| **龟钮印证** | 支付·收款·账单·钱包 | Python FastAPI（server.py） | 8000 |
| **龟钮印信** | 汽车资讯·活动·预约·内容·分享·KOL·AI·结算 | Node.js Express（src/index.js） | 3000 |

## API 接口一览

### 基础模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录（昵称/微信/支付宝/HarmonyOS） |
| `/api/auth/userinfo` | GET | 用户信息 |
| `/api/auth/profile` | PUT | 修改资料 |
| `/api/activity/list` | GET | 活动列表（品牌筛选/搜索/分页） |
| `/api/activity/:id` | GET | 活动详情 |
| `/api/content/publish` | POST | 发布内容（Agent 微支付 + IP 存证） |
| `/api/content/publish/confirm` | POST | 确认发布（Agent 支付回调） |
| `/api/content/:id` | GET | 内容详情 |
| `/api/content/stats/:id` | GET | AI 加权价值统计 |
| `/api/content/track/view` | POST | 浏览追踪 + AI 实时加权结算 |
| `/api/content/user/:userId` | GET | 用户内容列表 |
| `/api/booking/submit` | POST | 提交预约（归因链分佣） |
| `/api/booking/checkin` | POST | 到店核销 |
| `/api/booking/:id` | GET | 预约详情 |
| `/api/wallet/balance` | GET | 钱包余额 |
| `/api/wallet/transactions` | GET | 交易流水（分页） |
| `/api/wallet/withdraw` | POST | 提现（最低 10 元，T+3 到账） |
| `/api/notification/list` | GET | 通知列表 |
| `/api/notification/read` | POST | 标记已读 |
| `/api/notification/read-all` | POST | 全部已读 |
| `/api/upload/image` | POST | 图片上传（5MB 限制） |

### KOL · B端 · AI 模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/kol-task/types` | GET | 任务类型列表 |
| `/api/kol-task/create` | POST | 创建任务（B端认证 + IP 存证） |
| `/api/kol-task/open` | GET | 可领任务 |
| `/api/kol-task/list` | GET | 任务列表（B端/分页） |
| `/api/kol-task/:id` | GET | 任务详情 |
| `/api/kol-task/:id/submit` | POST | 领取/提交任务（AI 评分 + 钱包入账） |
| `/api/kol-task/:id/submissions` | GET | 任务提交列表 |
| `/api/kol-task/kol/:userId/earnings` | GET | KOL 收益统计 |
| `/api/kol-task/:id/close` | POST | 关闭任务 |
| `/api/kol-audit/profile` | GET | KOL 审核状态 |
| `/api/kol-audit/submit` | POST | 提交审核（AI 自动审核） |
| `/api/kol-audit/review` | POST | 人工审核（通过/拒绝） |
| `/api/kol-audit/list` | GET | 审核列表 |
| `/api/kol-audit/opc-apply` | POST | 申请 OPC 支持 |
| `/api/kol-audit/channels` | GET | 审核渠道列表 |
| `/api/biz/status` | GET | B端认证状态 |
| `/api/biz/apply` | POST | 提交认证（龟钮印证企业认证） |
| `/api/biz/search` | GET | 商家搜索 |
| `/api/biz-product/types` | GET | 产品类型 |
| `/api/biz-product/create` | POST | 创建产品（B端认证 + IP 存证） |
| `/api/biz-product/list` | GET | 产品列表 |
| `/api/biz-product/:id` | GET | 产品详情 |
| `/api/biz-product/:id/convert` | POST | 产品转化追踪 |
| `/api/ai/generate-copy` | POST | AI 文案生成（3 风格） |
| `/api/ai/recommend` | POST | AI 活动推荐 |
| `/api/ai/insight` | POST | AI 数据洞察 |
| `/api/ai/assistant` | POST | AI 客服助手 |
| `/api/ai/value-assess` | POST | AI 价值评估 |
| `/api/ai/value-dashboard` | GET | AI 价值看板 |
| `/api/ai-tools/list` | GET | AI 工具列表（OPC 状态过滤） |
| `/api/ai-tools/:id/subscribe` | POST | 订阅/使用 AI 工具 |
| `/api/ai-tools/usage` | GET | 工具使用记录 |
| `/api/agent-tools/catalog` | GET | Agent 工具目录 |
| `/api/agent-tools/categories` | GET | 工具分类 |
| `/api/agent-tools/:toolId/subscribe` | POST | 订阅 Agent 工具 |
| `/api/agent-tools/:toolId/execute` | POST | 执行 Agent 工具 |
| `/api/agent-tools/installed` | GET | 已安装工具 |
| `/api/agent-tools/logs` | GET | 执行日志 |
| `/api/agent-tools/stats` | GET | 使用统计 |
| `/api/llm/models` | GET | LLM 模型列表 |
| `/api/llm/providers` | GET | LLM 供应商 |
| `/api/llm/preference/:userId` | GET/POST | LLM 偏好设置 |
| `/api/llm/preference/:userId/model` | POST | 设置偏好模型 |
| `/api/llm/apikey/:userId` | POST | 管理 API 密钥 |
| `/api/llm/chat` | POST | LLM 聊天代理 |
| `/api/opc/info` | GET | OPC 支持信息 |
| `/api/opc/apply` | POST | 申请 OPC |
| `/api/opc/status` | GET | OPC 状态 |
| `/api/opc/review` | POST | OPC 审核 |
| `/api/settlement/create` | POST | 创建结算 |
| `/api/settlement/:id/execute` | POST | 执行结算（AI 风控验证） |
| `/api/settlement/list` | GET | 结算列表（筛选/分页） |
| `/api/settlement/stats` | GET | 结算统计 |
| `/api/settlement/:id` | GET | 结算详情 |
| `/api/commission/list` | GET | 分佣列表 |
| `/api/commission/stats` | GET | 分佣统计 |
| `/api/hash/create` | POST | IP 存证创建 |
| `/api/hash/query` | GET | 存证查询 |
| `/api/hash/verify` | POST | 存证验证 |
| `/api/hash/list` | GET | 存证列表 |
| `/api/hash/stats` | GET | 存证统计 |

### v3.3 新增模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/cfs/status` | GET | CFS存储状态 |
| `/api/cfs/apply` | POST | 申请CFS存储 |
| `/api/cfs/files` | GET | 文件列表 |
| `/api/cfs/upload` | POST | 上传文件 |
| `/api/cfs/files/:fileId` | DELETE | 删除文件 |
| `/api/maas/models` | GET | 大模型列表 |
| `/api/maas/models/:modelId` | GET | 模型详情 |
| `/api/maas/subscribe` | POST | 订阅模型 |
| `/api/maas/subscribe/:modelId` | DELETE | 取消订阅 |
| `/api/maas/subscriptions` | GET | 订阅列表 |
| `/api/maas/chat` | POST | 模型聊天 |
| `/api/video/list` | GET | 视频列表 |
| `/api/video/upload` | POST | 上传视频 |
| `/api/video/:videoId` | GET | 视频详情 |
| `/api/video/:videoId` | PUT | 更新视频信息 |
| `/api/video/:videoId` | DELETE | 删除视频 |
| `/api/video/:videoId/view` | POST | 播放记录 |
| `/api/video/:videoId/like` | POST | 点赞 |
| `/api/video/:videoId/share` | POST | 分享 |
| `/api/video/stream/:videoId` | GET | 视频流信息 |
| `/api/ai-video/templates` | GET | AI视频模板 |
| `/api/ai-video/create` | POST | 创建AI视频项目 |
| `/api/ai-video/projects` | GET | 项目列表 |
| `/api/ai-video/projects/:projectId/generate` | POST | 生成视频 |
| `/api/ai-video/projects/:projectId/progress` | GET | 生成进度 |
| `/api/ai-video/subtitle` | POST | AI字幕生成 |
| `/api/ai-video/effect` | POST | AI特效应用 |
| `/api/ai-video/edit` | POST | AI剪辑 |
| `/api/stereo/models` | GET | 3D模型列表 |
| `/api/stereo/models/:modelId` | GET | 模型详情 |
| `/api/stereo/view` | POST | 3D查看 |
| `/api/stereo/ar` | POST | AR展示 |
| `/api/stereo/compare` | POST | 模型对比 |
| `/api/stereo/customize` | POST | 模型定制 |
| `/api/stereo/brands` | GET | 品牌列表 |
| `/api/stereo/categories` | GET | 分类列表 |

## 启动方式

### 后端服务

```bash
# Node.js API 后端
cd D:\X402-DEVECO\src
npm install
node index.js                    # → localhost:3000

# Python 支付后端（支付宝沙箱）
cd D:\X402-DEVECO
docker compose up -d --build app # → localhost:8000
```

### HarmonyOS 构建

```bash
# DevEco Studio 直接构建
# 或本地 Docker 构建（需 6GB+ 内存）
cd D:\X402-DEVECO
docker build -f Dockerfile.harmony -t x402-harmony-builder .
```

### 支付宝小程序开发

```bash
cd D:\X402-DEVECO\frontend
npm install
npm run dev:mp-alipay          # → 构建产物至 frontend/dist/dev/mp-alipay
```

用支付宝小程序 IDE 打开 `D:\X402-DEVECO\frontend\dist\dev\mp-alipay`

API 地址配置：`http://localhost:3000`（龟钮印信后端，端口 3000）

## 调用龟钮印证（支付中台）

龟钮印信通过龟钮印证的以下 API 实现会员与支付能力打通：

| 能力 | 龟钮印证 API | 调用方 |
|------|-------------|--------|
| 用户登录 | `POST /api/auth/login` | 龟钮印信 |
| 钱包查询 | `GET /api/wallet/balance` | 龟钮印信 |
| 支付下单 | `POST /api/payment/create` | 龟钮印信 |
| 交易记录 | `GET /api/wallet/transactions` | 龟钮印信 |
| 数据存证 | `POST /api/hash/create` | 龟钮印信 |

会员数据统一存储于龟钮印证，共享同一用户体系。

## 服务器部署

| 服务 | 端口 | 状态 |
|------|------|------|
| Python 支付后端（支付宝沙箱） | 8000 | ✅ 运行中 (`pay_mode: real`) |
| Node.js API 后端 | 3000 | ✅ 运行中 |
| HarmonyOS App | - | ✅ 开发中 |
| 支付宝小程序 | - | ✅ 已发布 |

服务器：华为云 4C8G | 项目路径：`/home/developer/x402-alipay/`

## 问题与优化

### 后端问题

| 优先级 | 问题 | 位置 | 状态 |
|--------|------|------|------|
| **P0** | AI 推荐接口变量引用 | `ai.js /recommend` | ✅ 已修复 |
| **P0** | AI 洞察接口变量引用 | `ai.js /insight` | ✅ 已修复 |
| **P1** | 活动预算溢出 | `content.js`、`booking.js`、`kolTask.js` | ✅ 已修复 |
| **P1** | KOL 任务提交自动通过 | `kolTask.js` | ✅ 已修复 |
| **P1** | OPC 申请路径重复 | `kolAudit.js` + `opc.js` | ✅ 已修复 |
| **P2** | 结算 AI 风控异常默认通过 | `settlement.js` | ✅ 已修复 |
| **P2** | 数据存储不一致 | `kolTask.js`、`settlement.js` | ✅ 已修复 (迁移至 dataStore) |
| **P2** | 无认证中间件 | 全部路由 | ✅ 已修复 (JWT authMiddleware) |

### 前端问题

| 优先级 | 问题 | 位置 | 状态 |
|--------|------|------|------|
| **P1** | 分享链接未复制到剪贴板 | `SharePage.ets` | ✅ 已修复 |
| **P1** | 钱包交易金额方向错误 | `WalletPage.ets` | ✅ 已修复 |
| **P2** | 通知本地模型未复用 | `NotificationsPage.ets` | ✅ 已修复 (迁移至 DataModels.ets) |
| **P2** | 图片上传功能未实现 | `PublishPage.ets` | ✅ 已修复 (PhotoViewPicker + multipart upload) |
| **P2** | 用户头像未展示 | `Index.ets`、`ProfilePage.ets` | ✅ 已修复 (avatarUrl + Image组件) |

## 开发路线图

### v3.1.0 — 稳定性加固

- [x] 修复 P1 活动预算溢出（扣减前检查余额，useBudget返回校验结果）
- [x] 修复 P1 KOL 任务提交审核流程（AI分数<0.5或金额>50进入待审核状态）
- [x] 统一 OPC 申请路径（opc.js/apply增加KOL审核校验，与kolAudit.js逻辑一致）
- [x] 修复 P0 AI推荐/洞察接口变量引用（使用contentStore.getByUser/walletStore.get）
- [x] 修复 P2 结算AI风控异常默认通过（AI验证异常时aiVerified=false）
- [x] 修复 P1 分享链接复制到剪贴板（pasteboard API）
- [x] 修复 P1 钱包交易金额正负方向区分（withdraw/fee/expense显示-号）
- [x] kolTask / settlement 内存数据迁移至 dataStore（集中持久化）
- [x] 添加 JWT 认证中间件（jsonwebtoken，authMiddleware + optionalAuth）

### v3.2.0 — 前端完善

- [x] 用户头像展示（avatarUrl → Image组件 + Circle降级）
- [x] 图片上传功能（PhotoViewPicker + fileIo缓存 + multipart upload）
- [x] 通知模型迁移至 DataModels.ets（NotificationItem + NotificationList）

### v3.3.0 — KOL基础设施升级

- [ ] 腾讯CFS数据存储接入（为每个KOL提供免费数据存储）
- [ ] CFS一键申请方案（KOL自助申请存储空间）
- [ ] MAAS接入广场（接入国内主流大模型）
- [ ] KOL大模型选择使用功能
- [ ] 视频流功能（视频上传、播放、管理）
- [ ] AI视频制作功能（AI剪辑、AI字幕、AI特效）
- [ ] 立体展示技术方案（3D车型展示、AR看车）

### v4.0.0 — 平台升级

- [ ] 接入微信支付（龟钮印证层扩展）
- [ ] KOL 等级体系（铜/银/金/钻，影响加权乘数）
- [ ] 实时数据看板（WebSocket 推送）
- [ ] 多语言支持
- [ ] 暗色模式

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0.0 | - | 基础功能：活动、预约、分享、钱包 |
| v2.0.0 | - | KOL 任务中心、AI 评估、B端认证 |
| v3.0.0 | - | KOL 审核、OPC 创业支持、AI 工具市场、微交易实时结算、AI 加权评估体系 |
| v3.1.0 | 2026-07 | 稳定性加固：数据持久化、JWT认证、预算溢出修复 |
| v3.2.0 | 2026-07 | 前端完善：头像展示、图片上传、通知模型迁移 |
| v3.3.0 | 2026-07 | KOL基础设施升级：腾讯CFS存储、MAAS大模型广场、视频流AI制作、立体展示 |
| v4.0.0 | 远期 | 平台升级：微信支付、KOL等级、实时推送、多语言、暗色模式 |

---

> 龟钮印信 — 车讯传天下，印信通四方
