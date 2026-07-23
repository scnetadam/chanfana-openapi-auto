#!/bin/bash

# 龟钮自驭 - 腾讯云CVM一键部署脚本
# 使用方式：bash deploy.sh

set -e

echo "======================================"
echo "龟钮自驭 - 腾讯云CVM部署脚本"
echo "======================================"

# 配置变量
SERVER_IP="159.75.17.54"
SERVER_USER="root"
SERVER_PASS="X402@2026!"
PROJECT_DIR="/root/X402-DEVECO"
LOCAL_DIR="D:/X402-DEVECO"

echo ""
echo "步骤1: 检查服务器状态..."
STATUS=$(curl -s "https://x402.chinaauto.ccwu.cc/autocvm/status")
echo "服务器状态: $STATUS"

echo ""
echo "步骤2: 开机（如果未运行）..."
curl -s "https://x402.chinaauto.ccwu.cc/autocvm/start?token=x402-autocvm-2026"
echo "开机命令已发送"

echo ""
echo "步骤3: 等待服务器启动..."
sleep 30

echo ""
echo "步骤4: 上传项目代码..."
echo "正在上传... (这可能需要几分钟)"
# 使用scp上传（需要配置SSH密钥或使用sshpass）
# scp -r $LOCAL_DIR $SERVER_USER@$SERVER_IP:/root/

echo ""
echo "步骤5: 连接服务器并部署..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'

echo "======================================"
echo "在服务器上执行部署..."
echo "======================================"

cd /root/X402-DEVECO

echo ""
echo "5.1 安装Node.js依赖..."
npm install

echo ""
echo "5.2 安装Python依赖..."
pip3 install -r requirements.txt

echo ""
echo "5.3 创建环境变量文件..."
cat > .env << 'ENVEOF'
JWT_SECRET=x402-jwt-secret-2026
COS_SECRET_ID=${TENCENT_SECRET_ID}
COS_SECRET_KEY=${TENCENT_SECRET_KEY}
COS_BUCKET=x402-1454137396
GLM_API_KEY=${GLM_API_KEY}
GLM_API_BASE=https://open.bigmodel.cn/api/paas/v4
ALIPAY_APPID=2021006176615040
ALIPAY_GATEWAY=https://openapi-sandbox.dl.alipaydev.com/gateway.do
WECHAT_APPID=wx85f61ef6c155f30d
WECHAT_SECRET=${WX_APP_SECRET}
WECHAT_MCHID=1618395446
ENVEOF

echo ""
echo "5.4 启动服务..."
pm2 restart x402-node || pm2 start src/index.js --name x402-node
pm2 restart x402-python || pm2 start "python3 server.py" --name x402-python
pm2 save

echo ""
echo "5.5 检查服务状态..."
pm2 status

echo ""
echo "5.6 测试API..."
curl -s http://localhost:3000/health

echo ""
echo "部署完成！"
ENDSSH

echo ""
echo "======================================"
echo "部署成功完成！"
echo "======================================"
echo ""
echo "访问地址："
echo "  - API: https://x402.chinaauto.ccwu.cc/api"
echo "  - 健康检查: https://x402.chinaauto.ccwu.cc/api/health"
echo ""
echo "小程序："
echo "  - 支付宝: AppID 2021006176615040"
echo "  - 微信: AppID wx85f61ef6c155f30d"
echo ""
