#!/bin/bash

echo "============================================"
echo " X402-DEVECO 一键构建脚本"
echo " 华为云 4C8G AMDx86 + Docker"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${PROJECT_DIR}"

ARCH=$(uname -m)
echo "架构: ${ARCH}"

echo ""
echo "[1/6] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "错误: 未找到 Docker"
    echo "请先安装 Docker: sudo dnf install -y docker"
    exit 1
fi
echo "Docker 版本: $(docker --version)"

echo ""
echo "[2/6] 检查 Command Line Tools..."
CLT_DIR="$HOME/commandline-tools"
if [ ! -d "$CLT_DIR" ]; then
    echo ""
    echo "未找到 Command Line Tools"
    echo ""
    
    CLT_VERSION="5.0.5.300"
    CLT_FILE="commandline-tools-linux-x64-${CLT_VERSION}.zip"
    
    echo "============================================"
    echo " 需要手动下载 Command Line Tools"
    echo "============================================"
    echo ""
    echo "下载步骤："
    echo ""
    echo "1. 访问华为开发者网站："
    echo "   https://developer.huawei.com/consumer/cn/deveco-studio/"
    echo ""
    echo "2. 找到并下载："
    echo "   Command Line Tools (Linux x64)"
    echo "   文件名类似: commandline-tools-linux-x64-*.zip"
    echo ""
    echo "3. 上传到服务器："
    echo "   scp commandline-tools-linux-x64-*.zip root@服务器IP:~/"
    echo ""
    echo "4. 解压到正确位置："
    echo "   mkdir -p ~/commandline-tools"
    echo "   unzip ~/commandline-tools-linux-x64-*.zip -d ~/commandline-tools/"
    echo "   rm ~/commandline-tools-linux-x64-*.zip"
    echo ""
    echo "5. 验证安装："
    echo "   ls ~/commandline-tools/sdk/openharmony"
    echo ""
    echo "6. 重新运行此脚本："
    echo "   ./build-docker-x86.sh"
    echo ""
    echo "============================================"
    exit 1
fi

echo "Command Line Tools: $CLT_DIR"
ls -la "$CLT_DIR/sdk/openharmony" 2>/dev/null || {
    echo "错误: SDK 目录结构不正确"
    echo "请重新解压 Command Line Tools"
    exit 1
}

echo ""
echo "[3/6] 检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装 npm 依赖..."
    npm install --registry=https://repo.huaweicloud.com/repository/npm/ --legacy-peer-deps || {
        echo "npm 安装失败，重试..."
        npm install --legacy-peer-deps
    }
fi
echo "依赖: $(ls node_modules/@ohos 2>/dev/null | wc -l) 个 @ohos 包"

echo ""
echo "[4/6] 构建 Docker 镜像..."
docker build \
    --network=host \
    -f Dockerfile.harmony \
    -t x402-harmony-builder \
    . || {
    echo "错误: Docker 镜像构建失败"
    exit 1
}
echo "镜像构建完成: x402-harmony-builder"

echo ""
echo "[5/6] 在容器中编译 HAP..."
echo "内存限制: 6GB"
echo "并行编译: 3 核心"
echo ""

mkdir -p entry/build

docker run --rm \
    --network=host \
    --dns 114.114.114.114 \
    --dns 223.5.5.5 \
    --dns 8.8.8.8 \
    -m 6g \
    -e NODE_OPTIONS="--max-old-space-size=2048" \
    -e JAVA_OPTS="-Xmx1536m -Xms512m" \
    -v "$CLT_DIR:/home/tools/commandline-tools:ro" \
    -v "$PROJECT_DIR/entry/build:/home/build/project/entry/build" \
    x402-harmony-builder \
    bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"

BUILD_EXIT=$?

echo ""
echo "[6/6] 检查构建结果..."
HAP_FILE="$PROJECT_DIR/entry/build/default/outputs/default/entry-default-unsigned.hap"

if [ -f "$HAP_FILE" ]; then
    HAP_SIZE=$(du -h "$HAP_FILE" | cut -f1)
    HAP_MD5=$(md5sum "$HAP_FILE" | cut -d' ' -f1)
    
    echo ""
    echo "============================================"
    echo " ✅ 构建成功！"
    echo "============================================"
    echo ""
    echo "HAP 文件: $HAP_FILE"
    echo "文件大小: $HAP_SIZE"
    echo "MD5: $HAP_MD5"
    echo ""
    echo "后续步骤："
    echo "  1. 下载 HAP:"
    echo "     scp root@服务器IP:$HAP_FILE ./"
    echo ""
    echo "  2. 安装到设备:"
    echo "     hdc install $HAP_FILE"
    echo ""
    echo "  3. 启动后端服务:"
    echo "     cd $PROJECT_DIR"
    echo "     cp .env.example .env"
    echo "     vi .env  # 配置 API 密钥"
    echo "     npm start"
    echo ""
else
    echo ""
    echo "============================================"
    echo " ❌ 构建失败 (退出码: $BUILD_EXIT)"
    echo "============================================"
    echo ""
    echo "调试信息："
    echo "  - 架构: $ARCH"
    echo "  - Docker: $(docker --version)"
    echo "  - CLT: $CLT_DIR"
    echo "  - 构建目录: $PROJECT_DIR/entry/build"
    echo ""
    echo "请检查："
    echo "  1. Command Line Tools 是否正确安装"
    echo "  2. Docker 内存是否足够 (需要 6GB+)"
    echo "  3. 查看构建日志: ls -la entry/build/.hvigor/outputs/build-logs/"
    echo ""
    
    if [ -d "entry/build" ]; then
        echo "构建目录内容:"
        find entry/build -name "*.hap" -o -name "*.log" 2>/dev/null | head -20
    fi
    
    exit 1
fi
