# 龟钮体系 — 腾讯云CVM 部署指南

三项目共用腾讯云CVM (159.75.17.54)，Nginx + Cloudflare SSL 统一对外。

## 架构总览

```
                         Cloudflare CDN (SSL/TLS: Full Strict)
                                  │
                                  ▼
                         ┌─────────────────────────────────┐
                         │     Nginx (443/80)              │
                         │  x402.chinaauto.ccwu.cc         │
                         │  Cloudflare Origin CA 证书       │
                         └──────────┬──────────┬───────────┘
                                    │          │
               ┌────────────────────┘          └────────────────────┐
               ▼                                                    ▼
     ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
     │ 龟钮·印信        │    │ 龟钮·印证        │    │ 龟钮·自驭        │
     │ X402 支付        │    │ 数据存证集市      │    │ 汽车 AI 智能体    │
     │ Port 3000        │    │ Port 3001        │    │ Port 3003        │
     │ API: /api/x402/  │    │ API: /api/verify/│    │ API: /api/deveco/│
     └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                           │
                                                     ┌─────┴──────┐
                                                     │  GLM 大模型 │
                                                     │  (AI 能力)  │
                                                     └────────────┘
```

## AI 调用链路

```
印信/自驭前端 → Nginx → 自驭后端 AI 路由 → GLM API
         ↑                              ↑
         └── 内网 localhost:3003 ────────┘
```

## 端口规划

| 项目 | 后端端口 | Nginx 路径 | 说明 |
|------|---------|-----------|------|
| 龟钮·印信 (X402) | 3000 | `/api/x402/` | 开源支付协议 |
| 龟钮·印证 (GUINIU) | 3001 | `/api/verify/` | 数据存证集市 |
| 龟钮·自驭 (DEVECO) | 3003 | `/api/deveco/` | AI 主体，内网调用 localhost:3003 |
| CVM 控制 | 8080 | `/autocvm/` | 自动开关机 |

## 服务器信息

| 项目 | 值 |
|------|-----|
| 腾讯云CVM公网 | 159.75.17.54 |
| 内网IP | 172.16.0.13 |
| 域名 | x402.chinaauto.ccwu.cc |
| SSL | Cloudflare Origin CA (2026-07-21 ~ 2041-07-17) |
| 腾讯云COS | x402-1454137396 (ap-guangzhou) |

## 一键部署

```bash
# 在服务器上执行
cd /opt/guiniu
bash deploy/server-setup.sh
```

## 手动部署步骤

### 1. 部署 SSL 证书

```bash
bash deploy/setup-ssl.sh
# 证书: /etc/nginx/ssl/cloudflare-origin.pem
# 私钥: /etc/nginx/ssl/cloudflare-origin.key
```

### 2. 配置 Nginx

```bash
cp deploy/nginx-guiniu.conf /etc/nginx/conf.d/guiniu.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 3. 安装后端依赖

```bash
# 龟钮·印信 (X402)
cd /opt/guiniu/seal && npm install

# 龟钮·自驭 (DEVECO)
cd /opt/guiniu/deveco && npm install
```

### 4. 启动服务

```bash
# PM2 进程管理
npm install -g pm2

pm2 start /opt/guiniu/seal/src/index.js --name guiniu-seal
pm2 start /opt/guiniu/deveco/src/index.js --name guiniu-deveco
pm2 save
pm2 startup
```

### 5. 验证

```bash
# 本地健康检查
curl http://127.0.0.1/health

# HTTPS (需 Cloudflare DNS 已指向)
curl https://x402.chinaauto.ccwu.cc/health

# 各项目API
curl https://x402.chinaauto.ccwu.cc/api/x402/health
curl https://x402.chinaauto.ccwu.cc/api/deveco/health

# CVM控制
curl https://x402.chinaauto.ccwu.cc/autocvm/status
```

## Cloudflare 配置

1. **DNS 记录**
   - A记录: `x402` → `159.75.17.54` (Proxy 开启, 橙云)
   - A记录: `*.x402` → `159.75.17.54` (Proxy 开启)

2. **SSL/TLS 设置**
   - 加密模式: **Full (Strict)** ← 必须！Origin CA 需要此模式
   - 最低TLS版本: TLS 1.2
   - 启用 Always Use HTTPS
   - 启用 Automatic HTTPS Rewrites

3. **安全设置**
   - Browser Integrity Check: 开启
   - Security Level: Medium

## 前端构建配置

### 龟钮·自驭 (DEVECO) - 支付宝小程序

```bash
cd D:\x402-deveco\frontend
# .env.production 已配置:
# VITE_API_BASE=https://x402.chinaauto.ccwu.cc/api/deveco
npm run build:mp-alipay
# 构建产物: dist/build/mp-alipay/
# AppID: 2021006168648698
```

### 龟钮·印信 (X402) - 支付宝小程序

```bash
cd D:\X402\x402-frontend
# 构建产物: dist/build/mp-alipay/
# AppID: 2021006168648698
```

## CVM 自动控制

| 操作 | 链接 |
|------|------|
| 查看状态 | https://x402.chinaauto.ccwu.cc/autocvm/status |
| 开机 | https://x402.chinaauto.ccwu.cc/autocvm/start?token=x402-autocvm-2026 |
| 关机 | https://x402.chinaauto.ccwu.cc/autocvm/stop?token=x402-autocvm-2026 |
| 自动切换 | https://x402.chinaauto.ccwu.cc/autocvm/toggle?token=x402-autocvm-2026 |

## 防火墙

只开放 80/443，后端端口仅监听 127.0.0.1:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
