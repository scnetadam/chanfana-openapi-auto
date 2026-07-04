@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  Command Line Tools 上传助手
echo ============================================
echo.

set CLT_FILE=
set SERVER_IP=
set SERVER_USER=root

echo 请确保已经下载了 Command Line Tools:
echo   https://developer.huawei.com/consumer/cn/deveco-studio/
echo.
echo 选择 Linux x64 版本
echo.

set /p CLT_FILE="输入 Command Line Tools 文件路径: "
if "%CLT_FILE%"=="" (
    echo 错误: 文件路径不能为空
    pause
    exit /b 1
)

if not exist "%CLT_FILE%" (
    echo 错误: 文件不存在: %CLT_FILE%
    pause
    exit /b 1
)

echo.
echo 文件: %CLT_FILE%
echo 大小: 
for %%A in ("%CLT_FILE%") do echo   %%~zA 字节
echo.

set /p SERVER_IP="输入服务器 IP 地址: "
if "%SERVER_IP%"=="" (
    echo 错误: 服务器 IP 不能为空
    pause
    exit /b 1
)

echo.
echo ============================================
echo  准备上传
echo ============================================
echo.
echo 源文件: %CLT_FILE%
echo 目标: %SERVER_USER%@%SERVER_IP%:~/
echo.
echo 这可能需要几分钟，请耐心等待...
echo.

scp "%CLT_FILE%" %SERVER_USER%@%SERVER_IP%:~/

if errorlevel 1 (
    echo.
    echo ============================================
    echo  上传失败
    echo ============================================
    echo.
    echo 请检查:
    echo   1. 服务器 IP 是否正确
    echo   2. SSH 服务是否运行
    echo   3. 网络连接是否正常
    echo   4. 是否有 SSH 密钥或密码
    pause
    exit /b 1
)

echo.
echo ============================================
echo  上传成功！
echo ============================================
echo.
echo 下一步操作:
echo.
echo 1. SSH 登录服务器:
echo    ssh %SERVER_USER%@%SERVER_IP%
echo.
echo 2. 解压文件:
echo    mkdir -p ~/commandline-tools
echo    unzip ~/commandLine-tools-linux-x64-*.zip -d ~/commandline-tools/
echo    rm ~/commandline-tools-linux-x64-*.zip
echo.
echo 3. 验证安装:
echo    ls ~/commandline-tools/sdk/openharmony
echo.
echo 4. 运行构建:
echo    cd ~/x402-deveco
echo    ./build-docker-x86.sh
echo.
pause
