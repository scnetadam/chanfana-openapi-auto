@echo off
chcp 65001 >nul
echo ======================================
echo 龟钮自驭 - 腾讯云CVM部署脚本
echo ======================================
echo.

echo 步骤1: 检查服务器状态...
curl -s "https://x402.chinaauto.ccwu.cc/autocvm/status"
echo.

echo 步骤2: 开机...
curl -s "https://x402.chinaauto.ccwu.cc/autocvm/start?token=x402-autocvm-2026"
echo 开机命令已发送
echo.

echo 步骤3: 等待服务器启动（30秒）...
timeout /t 30 /nobreak
echo.

echo 步骤4: 构建前端...
cd /d D:\X402-DEVECO\frontend
call npm run build:mp-alipay
echo 前端构建完成
echo.

echo 步骤5: 准备上传...
echo 请使用以下命令上传项目到服务器：
echo scp -r D:\X402-DEVECO root@159.75.17.54:/root/
echo.
echo 或者使用WinSCP、FileZilla等工具上传
echo.

echo ======================================
echo 部署准备完成！
echo ======================================
echo.
echo 下一步操作：
echo 1. 使用SSH工具连接服务器：ssh root@159.75.17.54
echo 2. 密码：X402@2026!
echo 3. 执行服务器端部署脚本：bash /root/X402-DEVECO/server-deploy.sh
echo.
echo 访问地址：
echo   - API: https://x402.chinaauto.ccwu.cc/api
echo   - 健康检查: https://x402.chinaauto.ccwu.cc/api/health
echo.
echo 小程序：
echo   - 支付宝: AppID 2021006176615040
echo   - 微信: AppID wx85f61ef6c155f30d
echo.
pause
