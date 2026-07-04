#!/bin/bash

echo "============================================"
echo " X402-DEVECO Docker 构建测试"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${PROJECT_DIR}"

echo ""
echo "[1/6] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "✗ Docker 未安装"
    exit 1
fi
echo "✓ Docker: $(docker --version)"

echo ""
echo "[2/6] 检查 Docker daemon..."
if ! docker info &> /dev/null; then
    echo "✗ Docker daemon 未运行"
    echo "  请启动 Docker Desktop 或运行: sudo systemctl start docker"
    exit 1
fi
echo "✓ Docker daemon 正在运行"

echo ""
echo "[3/6] 验证必要文件..."
FILES_OK=true

if [ -f "scripts/docker-entrypoint.sh" ]; then
    echo "✓ scripts/docker-entrypoint.sh 存在"
    chmod +x scripts/docker-entrypoint.sh
else
    echo "✗ scripts/docker-entrypoint.sh 不存在"
    FILES_OK=false
fi

if [ -f ".npmrc" ]; then
    echo "✓ .npmrc 存在"
else
    echo "✗ .npmrc 不存在"
    FILES_OK=false
fi

if [ -f "oh-package.json5" ]; then
    echo "✓ oh-package.json5 存在"
else
    echo "✗ oh-package.json5 不存在"
    FILES_OK=false
fi

if [ -f "package.json" ]; then
    echo "✓ package.json 存在"
else
    echo "✗ package.json 不存在"
    FILES_OK=false
fi

if [ "$FILES_OK" = false ]; then
    echo ""
    echo "✗ 必要文件缺失，无法继续"
    exit 1
fi

echo ""
echo "[4/6] 检查依赖..."
if [ -d "node_modules" ]; then
    HVIGOR_VERSION=$(npm list @ohos/hvigor 2>/dev/null | grep @ohos/hvigor | cut -d@ -f3)
    echo "✓ hvigor 版本: ${HVIGOR_VERSION}"
else
    echo "⚠ node_modules 不存在，正在安装..."
    npm install --legacy-peer-deps
fi

echo ""
echo "[5/6] 清理 Docker 缓存..."
docker builder prune -af &> /dev/null
echo "✓ Docker 缓存已清理"

echo ""
echo "[6/6] 测试 Docker 构建..."
echo "  构建镜像: x402-harmony-builder-test"
echo "  Dockerfile: Dockerfile.harmony"
echo ""

docker build \
    --no-cache \
    --progress=plain \
    -f Dockerfile.harmony \
    -t x402-harmony-builder-test \
    . 2>&1 | tee docker-build-test.log

BUILD_EXIT=${PIPESTATUS[0]}

echo ""
if [ $BUILD_EXIT -eq 0 ]; then
    echo "============================================"
    echo " ✓ Docker 构建成功！"
    echo "============================================"
    echo ""
    echo "镜像信息:"
    docker images x402-harmony-builder-test
    echo ""
    echo "下一步:"
    echo "  1. 准备 commandline-tools"
    echo "  2. 运行完整构建: ./docker-build-harmony.sh"
else
    echo "============================================"
    echo " ✗ Docker 构建失败"
    echo "============================================"
    echo ""
    echo "请检查日志: docker-build-test.log"
    echo ""
    echo "常见问题:"
    echo "  - 文件权限: chmod +x scripts/docker-entrypoint.sh"
    echo "  - 网络问题: 检查 Docker 镜像源配置"
    echo "  - 磁盘空间: df -h"
    exit 1
fi
