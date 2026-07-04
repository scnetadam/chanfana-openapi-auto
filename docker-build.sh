#!/bin/bash

echo "============================================"
echo " X402-DEVECO Docker Cloud Build (4C8G)"
echo " Target: EulerOS / openEuler (aarch64/x86_64)"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="x402-harmony-builder"
CLT_ZIP="${1:-}"

ARCH=$(uname -m)
echo "  Host architecture: ${ARCH}"

echo ""
echo "[1/4] Checking prerequisites..."
docker --version || { echo "ERROR: Docker not installed"; exit 1; }

if [ -n "$CLT_ZIP" ] && [ -f "$CLT_ZIP" ]; then
  echo "  Command Line Tools: $CLT_ZIP"
else
  echo "  Command Line Tools: NOT provided (will mount at runtime)"
fi

echo ""
echo "[2/4] Building Docker image (openeuler:22.03 base, native ${ARCH})..."
docker build \
  --network=host \
  -f Dockerfile.harmony \
  -t ${IMAGE_NAME} \
  "${PROJECT_DIR}"

if [ $? -ne 0 ]; then
  echo "[WARN] First build attempt failed, retrying with no cache..."
  docker build \
    --network=host \
    --no-cache \
    -f Dockerfile.harmony \
    -t ${IMAGE_NAME} \
    "${PROJECT_DIR}"

  if [ $? -ne 0 ]; then
    echo "ERROR: Docker build failed after retry"
    exit 1
  fi
fi

echo ""
echo "[3/4] Running HAP build in container..."
mkdir -p "${PROJECT_DIR}/entry/build"

CLT_MOUNT=""
if [ -d "$HOME/commandline-tools" ]; then
  CLT_MOUNT="-v $HOME/commandline-tools:/home/tools/commandline-tools"
  echo "  Mounting commandline-tools from $HOME/commandline-tools"
elif [ -d "/home/tools/commandline-tools" ]; then
  CLT_MOUNT=""
  echo "  Using in-image commandline-tools"
else
  echo "  WARN: No commandline-tools found, build may fail"
  echo "  Install to $HOME/commandline-tools/ for best results"
fi

docker run --rm \
  --network=host \
  --dns 114.114.114.114 \
  --dns 223.5.5.5 \
  --dns 8.8.8.8 \
  -m 6g \
  -e NODE_OPTIONS="--max-old-space-size=2048" \
  -e JAVA_OPTS="-Xmx1536m -Xms512m" \
  -e ARCH="${ARCH}" \
  ${CLT_MOUNT} \
  -v "${PROJECT_DIR}/entry/build:/home/build/project/entry/build" \
  ${IMAGE_NAME} \
  bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"

BUILD_EXIT=$?

echo ""
echo "[4/4] Checking output..."
HAP_PATH="${PROJECT_DIR}/entry/build/default/outputs/default/entry-default-unsigned.hap"
if [ -f "$HAP_PATH" ]; then
  HAP_SIZE=$(du -h "$HAP_PATH" | cut -f1)
  echo "============================================"
  echo " BUILD SUCCESSFUL!"
  echo " HAP: $HAP_PATH"
  echo " Size: $HAP_SIZE"
  echo "============================================"
else
  echo "Searching for HAP files..."
  find "${PROJECT_DIR}/entry/build" -name "*.hap" 2>/dev/null || echo "No HAP found"
  if [ $BUILD_EXIT -ne 0 ]; then
    echo "============================================"
    echo " BUILD FAILED (container exit code: ${BUILD_EXIT})"
    echo "============================================"
    exit 1
  fi
fi
