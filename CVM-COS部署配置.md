# 龟钮自驭 - 腾讯云CVM+COS部署配置

## 📅 部署时间
**2026年7月20日**

---

## 🏗️ 部署架构

### 云服务配置

#### 腾讯云CVM服务器
- **公网IP**：159.75.17.54
- **内网IP**：172.16.0.13
- **域名**：X402.CHINAAUTO.CCWU.CC
- **用户名**：root
- **密码**：X402@2026!
- **状态**：已设置远程开机，传输文件先开机

#### 腾讯云COS对象存储
- **Bucket名称**：x402-1454137396
- **SecretId**：${TENCENT_SECRET_ID}
- **SecretKey**：${TENCENT_SECRET_KEY}

#### Cloudflare CDN
- **账号**：13616007538@139.com
- **密码**：${CF_PASSWORD}
- **全功能TOKEN**：${CF_API_TOKEN_OLD}
- **新TOKEN**：${CF_API_TOKEN}

### 小程序配置

#### 支付宝小程序
- **龟钮印信 AppID**：2021006168648698
- **龟钮印证 AppID**：2021006169679884
- **龟钮自驭 AppID**：2021006176615040

#### 微信小程序
- **AppID**：wx85f61ef6c155f30d
- **AppSecret**：${WX_APP_SECRET}
- **商户号**：1618395446
- **CFS**：EAW4FOS9

### GitHub配置
- **新TOKEN**：${GIT_TOKEN}
- **旧TOKEN**：${GIT_TOKEN_OLD}

---

## 🔧 CVM远程控制

### 自动控制接口
| 操作 | 链接 |
|------|------|
| 查看状态 | https://x402.chinaauto.ccwu.cc/autocvm/status |
| 开机 | https://x402.chinaauto.ccwu.cc/autocvm/start?token=x402-autocvm-2026 |
| 关机 | https://x402.chinaauto.ccwu.cc/autocvm/stop?token=x402-autocvm-2026 |
| 自动切换 | https://x402.chinaauto.ccwu.cc/autocvm/toggle?token=x402-autocvm-2026 |

---

## 🚀 部署步骤

### 1. 服务器准备

#### 1.1 开机并连接
```bash
# 方式1：通过API开机
curl "https://x402.chinaauto.ccwu.cc/autocvm/start?token=x402-autocvm-2026"

# 方式2：SSH连接
ssh root@159.75.17.54
# 密码：X402@2026!
```

#### 1.2 安装环境
```bash
# 更新系统
yum update -y

# 安装Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装Nginx
sudo yum install -y nginx

# 安装PM2（进程管理）
npm install -g pm2

# 安装Python 3.9
sudo yum install -y python39
```

### 2. 部署后端

#### 2.1 上传代码
```bash
# 本地执行
scp -r D:/X402-DEVECO root@159.75.17.54:/root/
```

#### 2.2 安装依赖
```bash
# SSH连接服务器
ssh root@159.75.17.54

# 进入项目目录
cd /root/X402-DEVECO

# 安装Node.js依赖
npm install

# 安装Python依赖
pip3 install -r requirements.txt
```

#### 2.3 配置环境变量
创建 `.env` 文件：
```bash
# JWT配置
JWT_SECRET=x402-jwt-secret-2026

# 腾讯云COS配置
COS_SECRET_ID=${TENCENT_SECRET_ID}
COS_SECRET_KEY=${TENCENT_SECRET_KEY}
COS_BUCKET=x402-1454137396

# 智谱AI配置
GLM_API_KEY=${GLM_API_KEY}
GLM_API_BASE=https://open.bigmodel.cn/api/paas/v4

# 支付宝配置
ALIPAY_APPID=2021006176615040
ALIPAY_GATEWAY=https://openapi-sandbox.dl.alipaydev.com/gateway.do

# 微信配置
WECHAT_APPID=wx85f61ef6c155f30d
WECHAT_SECRET=${WX_APP_SECRET}
WECHAT_MCHID=1618395446
```

#### 2.4 启动服务
```bash
# 使用PM2启动Node.js服务
pm2 start src/index.js --name x402-node

# 启动Python服务
pm2 start "python3 server.py" --name x402-python

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

### 3. 配置Nginx

#### 3.1 创建配置文件
```bash
sudo vi /etc/nginx/conf.d/x402.conf
```

配置内容：
```nginx
server {
    listen 80;
    server_name x402.chinaauto.ccwu.cc 159.75.17.54;

    # Node.js API
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Python支付服务
    location /pay/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 订单查询
    location /orders/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # 静态文件
    location / {
        root /root/X402-DEVECO/frontend/dist/build/h5;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 3.2 启动Nginx
```bash
# 测试配置
sudo nginx -t

# 启动Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx
```

### 4. 配置HTTPS（可选）

#### 4.1 安装Certbot
```bash
sudo yum install -y certbot python3-certbot-nginx
```

#### 4.2 申请证书
```bash
sudo certbot --nginx -d x402.chinaauto.ccwu.cc
```

### 5. 部署前端

#### 5.1 构建支付宝小程序
```bash
# 本地执行
cd D:/X402-DEVECO/frontend
npm install
npm run build:mp-alipay
```

#### 5.2 上传小程序
使用支付宝小程序开发者工具：
1. 导入项目：`D:\x402-deveco\frontend\dist\build\mp-alipay`
2. 配置AppID：2021006176615040
3. 上传代码
4. 提交审核

---

## 📁 目录结构

```
/root/X402-DEVECO/
├── src/                    # Node.js后端
│   ├── index.js           # 主入口
│   ├── routes/            # API路由
│   └── models/            # 数据模型
├── server.py              # Python支付服务
├── requirements.txt       # Python依赖
├── frontend/              # 前端代码
│   └── dist/
│       └── build/
│           ├── mp-alipay/ # 支付宝小程序
│           └── h5/        # H5版本
├── .env                   # 环境变量
└── package.json           # Node.js依赖
```

---

## 🔐 安全配置

### 1. 防火墙配置
```bash
# 开放必要端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

### 2. 域名白名单
在支付宝开放平台配置：
- `x402.chinaauto.ccwu.cc`
- `159.75.17.54`

### 3. API密钥管理
- 所有密钥存储在 `.env` 文件
- `.env` 文件权限设置为 600
- 不要提交到Git仓库

---

## 📊 监控与日志

### 1. PM2监控
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 查看监控
pm2 monit
```

### 2. Nginx日志
```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

### 3. 应用日志
```bash
# Node.js日志
tail -f /root/X402-DEVECO/server.log

# Python日志
tail -f /root/X402-DEVECO/server-error.log
```

---

## 🔄 常用命令

### 服务管理
```bash
# 重启Node.js服务
pm2 restart x402-node

# 重启Python服务
pm2 restart x402-python

# 重启Nginx
sudo systemctl restart nginx

# 查看服务状态
pm2 status
```

### 更新部署
```bash
# 拉取最新代码
cd /root/X402-DEVECO
git pull

# 安装依赖
npm install

# 重启服务
pm2 restart all
```

### 备份数据
```bash
# 备份到COS
coscmd upload -r /root/X402-DEVECO/data/ /backup/
```

---

## ✅ 验证清单

- [ ] 服务器已开机
- [ ] SSH连接成功
- [ ] Node.js环境安装完成
- [ ] Python环境安装完成
- [ ] Nginx配置完成
- [ ] 环境变量配置完成
- [ ] 后端服务启动成功
- [ ] API接口响应正常
- [ ] 前端构建成功
- [ ] 小程序上传成功
- [ ] 域名解析正确
- [ ] HTTPS证书配置完成

---

## 🔗 相关链接

- **服务器控制台**：https://console.cloud.tencent.com/cvm
- **COS控制台**：https://console.cloud.tencent.com/cos
- **支付宝开放平台**：https://open.alipay.com
- **微信开放平台**：https://open.weixin.qq.com
- **域名**：http://x402.chinaauto.ccwu.cc

---

## 🆘 故障排查

### 1. 服务无法启动
```bash
# 检查端口占用
netstat -tlnp | grep 3000
netstat -tlnp | grep 8000

# 检查日志
pm2 logs
```

### 2. API返回404
```bash
# 检查Nginx配置
sudo nginx -t

# 检查路由
curl http://localhost:3000/health
```

### 3. 数据库连接失败
```bash
# 检查环境变量
cat .env

# 测试连接
curl http://localhost:3000/api/activity/list
```

---

**CVM+COS部署配置完成时间：2026年7月20日**
