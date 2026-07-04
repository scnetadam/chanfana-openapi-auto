@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  X402-DEVECO 一键构建助手
echo  华为云 4C8G AMDx86
echo ============================================
echo.

set SERVER_IP=
set SERVER_USER=root
set PROJECT_DIR=C:\Users\HUAWEI\Desktop\x402-deveco

echo 此脚本将自动完成以下操作：
echo   1. 上传项目到服务器
echo   2. 运行修复脚本
echo   3. 执行 Docker 构建
echo   4. 下载构建产物
echo.

set /p SERVER_IP="输入服务器 IP 地址: "
if "%SERVER_IP%"=="" (
    echo 错误: 服务器 IP 不能为空
    pause
    exit /b 1
)

echo.
echo 服务器: %SERVER_USER%@%SERVER_IP%
echo.

REM 步骤 1: 检查 Command Line Tools
echo [步骤 1/5] 检查 Command Line Tools...
echo.

ssh %SERVER_USER%@%SERVER_IP% "test -d ~/commandline-tools && echo '已安装' || echo '未安装'" 2>nul | findstr "已安装" >nul

if errorlevel 1 (
    echo.
    echo ============================================
    echo  Command Line Tools 未安装
    echo ============================================
    echo.
    echo 请先安装 Command Line Tools:
    echo   1. 下载: https://developer.huawei.com/consumer/cn/deveco-studio/
    echo   2. 选择 Linux x64 版本
    echo   3. 运行 upload-clt.bat 上传
    echo   4. 在服务器解压: unzip ~/commandline-tools-linux-x64-*.zip -d ~/commandline-tools/
    echo.
    pause
    exit /b 1
)

echo ✅ Command Line Tools 已安装

REM 步骤 2: 上传项目
echo.
echo [步骤 2/5] 上传项目到服务器...
echo 这可能需要几分钟...
echo.

scp -r "%PROJECT_DIR%." %SERVER_USER%@%SERVER_IP%:~/x402-deveco/

if errorlevel 1 (
    echo ❌ 上传失败
    pause
    exit /b 1
)

echo ✅ 项目上传完成

REM 步骤 3: 运行修复脚本
echo.
echo [步骤 3/5] 运行修复脚本...
echo.

ssh %SERVER_USER%@%SERVER_IP% "cd ~/x402-deveco && chmod +x quick-fix.sh && ./quick-fix.sh"

if errorlevel 1 (
    echo ⚠️  修复脚本执行失败，但继续尝试构建
)

REM 步骤 4: 执行构建
echo.
echo [步骤 4/5] 执行 Docker 构建...
echo 这需要 10-20 分钟，请耐心等待...
echo.

ssh -t %SERVER_USER%@%SERVER_IP% "cd ~/x402-deveco && chmod +x build-docker-x86.sh && ./build-docker-x86.sh"

if errorlevel 1 (
    echo.
    echo ============================================
    echo  构建失败
    echo ============================================
    echo.
    echo 请检查:
    echo   1. Command Line Tools 是否正确安装
    echo   2. Docker 是否正常运行
    echo   3. 内存是否充足（需要 6GB+）
    echo.
    echo 查看详细日志:
    echo   ssh %SERVER_USER%@%SERVER_IP%
    echo   cat ~/x402-deveco/entry/build/.hvigor/outputs/build-logs/*.log
    echo.
    pause
    exit /b 1
)

REM 步骤 5: 下载 HAP
echo.
echo [步骤 5/5] 下载构建产物...
echo.

scp %SERVER_USER%@%SERVER_IP%:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./

if errorlevel 1 (
    echo ⚠️  下载失败，但构建可能已成功
    echo    请手动下载:
    echo    scp %SERVER_USER%@%SERVER_IP%:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
) else (
    echo ✅ HAP 文件已下载到当前目录
)

echo.
echo ============================================
echo  构建完成！
echo ============================================
echo.
echo HAP 文件: entry-default-unsigned.hap
echo.
echo 下一步:
echo   1. 安装到设备: hdc install entry-default-unsigned.hap
echo   2. 启动应用: hdc shell aa start -a EntryAbility -b com.x402.promodrive
echo.
pause
