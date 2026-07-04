@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  X402-DEVECO Docker 构建测试 (Windows)
echo ============================================

cd /d "%~dp0"

echo.
echo [1/6] 检查 Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo X Docker 未安装
    exit /b 1
)
for /f "tokens=*" %%i in ('docker --version') do echo + Docker: %%i

echo.
echo [2/6] 检查 Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
    echo X Docker daemon 未运行
    echo   请启动 Docker Desktop
    exit /b 1
)
echo + Docker daemon 正在运行

echo.
echo [3/6] 验证必要文件...
set FILES_OK=1

if exist "scripts\docker-entrypoint.sh" (
    echo + scripts/docker-entrypoint.sh 存在
) else (
    echo X scripts/docker-entrypoint.sh 不存在
    set FILES_OK=0
)

if exist ".npmrc" (
    echo + .npmrc 存在
) else (
    echo X .npmrc 不存在
    set FILES_OK=0
)

if exist "oh-package.json5" (
    echo + oh-package.json5 存在
) else (
    echo X oh-package.json5 不存在
    set FILES_OK=0
)

if exist "package.json" (
    echo + package.json 存在
) else (
    echo X package.json 不存在
    set FILES_OK=0
)

if "%FILES_OK%"=="0" (
    echo.
    echo X 必要文件缺失，无法继续
    exit /b 1
)

echo.
echo [4/6] 检查依赖...
if exist "node_modules" (
    echo + node_modules 存在
) else (
    echo ! node_modules 不存在，正在安装...
    call npm install --legacy-peer-deps
)

echo.
echo [5/6] 清理 Docker 缓存...
docker builder prune -af >nul 2>&1
echo + Docker 缓存已清理

echo.
echo [6/6] 测试 Docker 构建...
echo   构建镜像: x402-harmony-builder-test
echo   Dockerfile: Dockerfile.harmony
echo.

docker build --no-cache --progress=plain -f Dockerfile.harmony -t x402-harmony-builder-test . 2>&1 | tee docker-build-test.log

if errorlevel 1 (
    echo.
    echo ============================================
    echo  X Docker 构建失败
    echo ============================================
    echo.
    echo 请检查日志: docker-build-test.log
    exit /b 1
) else (
    echo.
    echo ============================================
    echo  + Docker 构建成功！
    echo ============================================
    echo.
    echo 镜像信息:
    docker images x402-harmony-builder-test
    echo.
    echo 下一步:
    echo   1. 准备 commandline-tools
    echo   2. 运行完整构建: docker-build-harmony.sh
)

endlocal
