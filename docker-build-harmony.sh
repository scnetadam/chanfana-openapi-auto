#!/bin/bash

echo "============================================"
echo " X402-DEVECO Docker Build Script"
echo " Target: Huawei Cloud ECS (EulerOS)"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${PROJECT_DIR}"

echo ""
echo "[1/5] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker not found"
    echo "Please install Docker first:"
    echo "  sudo bash euler-init.sh"
    exit 1
fi
echo "Docker: $(docker --version)"

echo ""
echo "[2/5] Checking commandline-tools..."
CLT_DIR="$HOME/commandline-tools"
if [ ! -d "$CLT_DIR" ]; then
    echo "ERROR: commandline-tools not found at $CLT_DIR"
    echo ""
    echo "Please download and extract commandline-tools:"
    echo "  1. Download from: https://developer.huawei.com/consumer/cn/deveco-studio/"
    echo "  2. Upload to server: scp commandline-tools-linux-*.zip root@ECS_IP:~/"
    echo "  3. Extract: unzip commandline-tools-linux-*.zip -d ~/commandline-tools/"
    exit 1
fi
echo "Command Line Tools: $CLT_DIR"

echo ""
echo "[3/5] Building Docker image..."
docker build \
    --network=host \
    -f Dockerfile.harmony \
    -t x402-harmony-builder \
    . || {
    echo "ERROR: Docker build failed"
    exit 1
}

echo ""
echo "[4/5] Running build in container..."
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
echo "[5/5] Checking build result..."
HAP_FILE="$PROJECT_DIR/entry/build/default/outputs/default/entry-default-unsigned.hap"
if [ -f "$HAP_FILE" ]; then
    HAP_SIZE=$(du -h "$HAP_FILE" | cut -f1)
    echo "============================================"
    echo " BUILD SUCCESSFUL!"
    echo " HAP: $HAP_FILE"
    echo " Size: $HAP_SIZE"
    echo "============================================"
    echo ""
    echo "Next steps:"
    echo "  1. Download HAP: scp root@ECS_IP:$HAP_FILE ./"
    echo "  2. Install on device: hdc install $HAP_FILE"
else
    echo "============================================"
    echo " BUILD FAILED (exit code: $BUILD_EXIT)"
    echo "============================================"
    echo ""
    echo "Check logs above for errors"
    exit 1
fi
