#!/bin/bash

# 服务器端部署脚本
# 在服务器上执行：bash /root/X402-DEVECO/server-deploy.sh

set -e

echo "======================================"
echo "龟钮自驭 - 服务器端部署"
echo "======================================"

cd /root/X402-DEVECO

echo ""
echo "步骤1: 安装Node.js依赖..."
npm install --production

echo ""
echo "步骤2: 安装Python依赖..."
pip3 install -r requirements.txt

echo ""
echo "步骤3: 创建环境变量文件..."
cat > .env << 'EOF'
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
EOF

echo ""
echo "步骤4: 停止旧服务..."
pm2 stop x402-node 2>/dev/null || true
pm2 stop x402-python 2>/dev/null || true

echo ""
echo "步骤5: 启动Node.js服务..."
pm2 start src/index.js --name x402-node

echo ""
echo "步骤6: 启动Python服务..."
pm2 start "python3 server.py" --name x402-python

echo ""
echo "步骤7: 保存PM2配置..."
pm2 save

echo ""
echo "步骤8: 检查服务状态..."
pm2 status

echo ""
echo "步骤9: 测试API..."
echo "测试健康检查接口..."
curl -s http://localhost:3000/health | head -20

echo ""
echo "步骤10: 测试活动列表..."
curl -s http://localhost:3000/api/activity/list | head -20

echo ""
echo "======================================"
echo "部署完成！"
echo "======================================"
echo ""
echo "服务地址："
echo "  - Node.js API: http://localhost:3000"
echo "  - Python Pay: http://localhost:8000"
echo "  - 外部访问: https://x402.chinaauto.ccwu.cc/api"
echo ""
echo "日志查看："
echo "  - pm2 logs x402-node"
echo "  - pm2 logs x402-python"
echo ""
