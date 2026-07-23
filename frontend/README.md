# X402 前端 - 小程序/H5

## 技术栈
- uni-app (Vue 3 + Vite + TypeScript)
- Pinia 状态管理
- 目标平台: 微信小程序 / H5

## 目录结构

```
src/
├── api/          # 后端 API 封装
├── components/   # 通用组件
├── composables/  # Vue 组合式函数
├── pages/
│   ├── login/    # 登录页
│   ├── publish/  # 内容发布页
│   ├── dashboard/# 数据看板
│   ├── wallet/   # 钱包
│   ├── share/    # 内容详情/分享
│   ├── opc/      # OPC创业广场 ⭐ 新增
│   │   ├── index.vue      # 创业广场首页
│   │   ├── city.vue       # 城市详情
│   │   ├── policy.vue     # 政策详情
│   │   ├── subsidy.vue    # 补贴申请
│   │   ├── project.vue    # 项目展示
│   │   └── apply.vue      # 申请入驻
│   ├── biz/      # B端商家
│   ├── ai/       # AI应用
│   └── ...       # 其他页面
├── stores/       # Pinia 状态
├── utils/        # 工具函数
└── static/       # 静态资源
```

## 开发

```bash
npm install

# 开发 - 微信小程序
npm run dev:mp-weixin

# 开发 - H5
npm run dev:h5

# 构建 - 小程序
npm run build:mp-weixin
```

## 配置

- `manifest.json` — appid、小程序配置
- `vite.config.ts` — 代理到后端 x402-deveco (localhost:3000)

## 后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 微信登录 |
| POST | /api/glm/chat | GLM AI 对话 |
| POST | /api/content/publish | 发布内容 |
| GET | /api/content/:id | 内容详情 |
| GET | /api/content/stats/:trackId | 追踪统计 |
| POST | /api/payment/create | 创建支付订单 |
| GET | /api/payment/query | 查询订单 |
| GET | /api/wallet/balance | 钱包余额 |
| GET | /api/wallet/transactions | 交易流水 |

## Todo

- [ ] 准备 tabBar 图标 (放在 src/static/images/)
- [ ] 配置 manifest.json 中的微信 appid
- [ ] 后端补充 auth/login 接口
- [ ] 后端补充 content/publish 接口
- [ ] 海报自动生成功能
