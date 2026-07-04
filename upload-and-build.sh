#!/bin/bash
set -e

ECS_IP="${1}"
ECS_USER="${2:-root}"
CLT_ZIP="${3:-}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
REMOTE_DIR="/home/${ECS_USER}/${PROJECT_NAME}"

if [ -z "$ECS_IP" ]; then
  echo "Usage: ./upload-and-build.sh <ECS_IP> [ECS_USER=root] [CLT_ZIP_PATH]"
  echo ""
  echo "Example:"
  echo "  ./upload-and-build.sh 120.46.133.72"
  echo "  ./upload-and-build.sh 120.46.133.72 root ~/Downloads/commandline-tools-linux-x64-5.0.5.300.zip"
  exit 1
fi

echo "============================================"
echo " X402-DEVECO Upload & Build"
echo " Target: ${ECS_USER}@${ECS_IP} (EulerOS/openEuler)"
echo "============================================"

echo ""
echo "[1/6] Packaging project..."
cd "${PROJECT_DIR}/.."
tar czf /tmp/${PROJECT_NAME}.tar.gz \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='.hvigor' \
  --exclude='oh_modules' \
  --exclude='commandline-tools' \
  --exclude='.env' \
  ${PROJECT_NAME}
echo "  Package: $(du -h /tmp/${PROJECT_NAME}.tar.gz | cut -f1)"

echo ""
echo "[2/6] Uploading project to ECS..."
scp -o StrictHostKeyChecking=no /tmp/${PROJECT_NAME}.tar.gz ${ECS_USER}@${ECS_IP}:/tmp/
rm /tmp/${PROJECT_NAME}.tar.gz

if [ -n "$CLT_ZIP" ] && [ -f "$CLT_ZIP" ]; then
  echo "  Uploading Command Line Tools..."
  scp -o StrictHostKeyChecking=no "$CLT_ZIP" ${ECS_USER}@${ECS_IP}:/tmp/cmdline-tools.zip
  HAS_CLT=1
else
  HAS_CLT=0
fi

echo ""
echo "[3/6] Initializing EulerOS environment..."
ssh -o StrictHostKeyChecking=no ${ECS_USER}@${ECS_IP} << REMOTE_INIT
set -e
cd /home/${ECS_USER}

rm -rf ${PROJECT_NAME}
tar xzf /tmp/${PROJECT_NAME}.tar.gz
rm /tmp/${PROJECT_NAME}.tar.gz

chmod +x ${PROJECT_NAME}/fix-mirror.sh
sudo bash ${PROJECT_NAME}/fix-mirror.sh

if [ ! -f /swapfile ]; then
  echo "  Running euler-init.sh for first-time setup..."
  chmod +x ${PROJECT_NAME}/euler-init.sh
  cd ${PROJECT_NAME}
  sudo bash euler-init.sh
else
  echo "  Swap already exists, skipping init"
fi
REMOTE_INIT

echo ""
echo "[4/6] Building Docker image on ECS (openeuler:22.03 native arch)..."
ssh -o StrictHostKeyChecking=no ${ECS_USER}@${ECS_IP} << REMOTE_BUILD
set -e
cd /home/${ECS_USER}/${PROJECT_NAME}

if [ ${HAS_CLT} -eq 1 ]; then
  echo "  Building with Command Line Tools..."
  docker build \
    --network=host \
    --build-arg CLT_ZIP=/tmp/cmdline-tools.zip \
    -f Dockerfile.harmony \
    -t x402-harmony-builder \
    .
else
  echo "  Building without Command Line Tools..."
  docker build \
    --network=host \
    -f Dockerfile.harmony \
    -t x402-harmony-builder \
    .
fi
REMOTE_BUILD

echo ""
echo "[5/6] Running HAP build in container..."
ssh -o StrictHostKeyChecking=no ${ECS_USER}@${ECS_IP} << REMOTE_RUN
set -e
cd /home/${ECS_USER}/${PROJECT_NAME}

mkdir -p entry/build

if [ ${HAS_CLT} -eq 1 ]; then
    docker run --rm \
    --network=host \
    --dns 114.114.114.114 \
    --dns 223.5.5.5 \
    --dns 8.8.8.8 \
    -m 6g \
    -e NODE_OPTIONS="--max-old-space-size=2048" \
    -v \$(pwd)/entry/build:/home/build/project/entry/build \
    x402-harmony-builder \
    bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"
else
    docker run --rm \
    --network=host \
    --dns 114.114.114.114 \
    --dns 223.5.5.5 \
    --dns 8.8.8.8 \
    -m 6g \
    -e NODE_OPTIONS="--max-old-space-size=2048" \
    -v \$(pwd)/entry/build:/home/build/project/entry/build \
    -v /home/${ECS_USER}/commandline-tools:/home/tools/commandline-tools \
    x402-harmony-builder \
    bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"
fi

HAP_PATH="entry/build/default/outputs/default/entry-default-unsigned.hap"
if [ -f "\$HAP_PATH" ]; then
  echo ""
  echo "============================================"
  echo "  BUILD SUCCESSFUL!"
  echo "  HAP: \$HAP_PATH"
  echo "  Size: \$(du -h \$HAP_PATH | cut -f1)"
  echo "============================================"
fi
REMOTE_RUN

echo ""
echo "[6/6] Done! To download HAP:"
echo "  scp ${ECS_USER}@${ECS_IP}:${REMOTE_DIR}/entry/build/default/outputs/default/entry-default-unsigned.hap ./"
echo ""
echo "To start backend on ECS:"
echo "  ssh ${ECS_USER}@${ECS_IP}"
echo "  cd ${REMOTE_DIR} && cp .env.example .env && vi .env"
echo "  docker-compose up -d"
