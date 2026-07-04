#!/bin/bash
set -e

echo "============================================"
echo " X402-DEVECO EulerOS 4C8G One-Click Init"
echo " Supports: aarch64 (Kunpeng) / x86_64"
echo "============================================"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: Please run as root (sudo ./euler-init.sh)"
  exit 1
fi

ARCH=$(uname -m)
echo "Architecture: ${ARCH}"

echo ""
echo "[1/8] Detecting OS..."
if [ -f /etc/euleros-release ]; then
  OS_NAME="EulerOS"
  cat /etc/euleros-release
elif [ -f /etc/openEuler-release ]; then
  OS_NAME="openEuler"
  cat /etc/openEuler-release
else
  OS_NAME="Unknown"
  echo "WARN: Not EulerOS/openEuler, proceeding anyway..."
fi

echo ""
echo "[2/8] Adding swap (8GB for 4C8G build safety)..."
if [ -f /swapfile ]; then
  echo "  Swap already exists, checking size..."
  SWAP_SIZE=$(du -h /swapfile | cut -f1)
  echo "  Current: ${SWAP_SIZE}"
else
  echo "  Creating 8GB swap..."
  fallocate -l 8G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=8192
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  Swap created and enabled"
fi
free -h | grep -i swap

echo ""
echo "[3/8] Configuring Docker mirror..."
mkdir -p /etc/docker
if [ -f /etc/docker/daemon.json ]; then
  echo "  daemon.json exists, backing up..."
  cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
fi
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://docker.m.daocloud.io"
  ],
  "max-concurrent-downloads": 2,
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
echo "  Docker mirror configured (163 + Baidu + DaoCloud)"

echo ""
echo "[4/8] Installing Docker (if not present)..."
if command -v docker &> /dev/null; then
  echo "  Docker already installed: $(docker --version)"
else
  echo "  Installing Docker via dnf..."
  if [ "${ARCH}" = "aarch64" ] || [ "${ARCH}" = "arm64" ]; then
    dnf install -y docker
  else
    dnf install -y docker
  fi
  systemctl enable docker
  systemctl start docker
  echo "  Docker installed and started"
fi

echo ""
echo "[5/8] Installing JDK 17..."
if java -version 2>&1 | grep -q "17"; then
  echo "  JDK 17 already installed"
else
  echo "  Installing JDK 17 for ${ARCH}..."
  if [ "${ARCH}" = "aarch64" ] || [ "${ARCH}" = "arm64" ]; then
    dnf install -y java-17-openjdk java-17-openjdk-headless.aarch64
  else
    dnf install -y java-17-openjdk java-17-openjdk-headless
  fi
  echo "  JDK 17 installed"
fi

JAVA_HOME=""
for jh in /usr/lib/jvm/java-17-openjdk-${ARCH} /usr/lib/jvm/java-17-openjdk-aarch64 /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-17-openjdk; do
  if [ -d "$jh" ]; then
    JAVA_HOME="$jh"
    break
  fi
done
if [ -z "$JAVA_HOME" ]; then
  JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java) 2>/dev/null || echo "/usr/lib/jvm/java-17-openjdk/bin/java") 2>/dev/null))
fi
echo "  JAVA_HOME=${JAVA_HOME}"
echo "JAVA_HOME=${JAVA_HOME}" > /etc/profile.d/x402-env.sh
echo "export JAVA_HOME" >> /etc/profile.d/x402-env.sh

echo ""
echo "[6/8] Installing Node.js 18..."
if node --version 2>&1 | grep -q "v18"; then
  echo "  Node.js 18 already installed: $(node --version)"
else
  echo "  Installing Node.js 18 for ${ARCH}..."
  if [ "${ARCH}" = "aarch64" ] || [ "${ARCH}" = "arm64" ]; then
    NODE_ARCH=arm64
  else
    NODE_ARCH=x64
  fi
  NODE_URL="v18.20.4/node-v18.20.4-linux-${NODE_ARCH}.tar.xz" && \
  curl -fsSL --retry 5 --retry-delay 10 --connect-timeout 30 \
    "https://repo.huaweicloud.com/nodejs/${NODE_URL}" \
    -o /tmp/node.tar.xz || \
  curl -fsSL --retry 5 --retry-delay 10 --connect-timeout 30 \
    "https://nodejs.org/dist/${NODE_URL}" \
    -o /tmp/node.tar.xz && \
  mkdir -p /usr/local/node && \
  tar -xJf /tmp/node.tar.xz -C /usr/local/node --strip-components=1 && \
  rm -f /tmp/node.tar.xz && \
  ln -sf /usr/local/node/bin/node /usr/bin/node && \
  ln -sf /usr/local/node/bin/npm /usr/bin/npm && \
  ln -sf /usr/local/node/bin/npx /usr/bin/npx && \
  echo "  Node.js installed: $(node --version)"
fi

echo ""
echo "[7/8] Installing PM2 (process manager)..."
if command -v pm2 &> /dev/null; then
  echo "  PM2 already installed"
else
  npm install -g pm2 --registry=https://repo.huaweicloud.com/repository/npm/
  ln -sf /usr/local/node/bin/pm2 /usr/bin/pm2 2>/dev/null || true
  echo "  PM2 installed"
fi

echo ""
echo "[8/8] Configuring environment variables..."
cat > /etc/profile.d/x402-env.sh << ENVEOF
export JAVA_HOME=${JAVA_HOME}
export NODEJS_HOME=/usr/local/node
export PATH=/usr/local/node/bin:\$PATH
export NODE_OPTIONS="--max-old-space-size=2048"
export JAVA_OPTS="-Xmx1536m -Xms512m"
ENVEOF

source /etc/profile.d/x402-env.sh

echo ""
echo "============================================"
echo " ${OS_NAME} Init Complete!"
echo ""
echo " CPU: $(nproc) cores"
echo " Arch: ${ARCH}"
echo " RAM: $(free -h | awk '/^Mem:/{print $2}')"
echo " Swap: $(free -h | awk '/^Swap:/{print $2}')"
echo " Docker: $(docker --version 2>/dev/null || echo 'N/A')"
echo " Java: $(java -version 2>&1 | head -1)"
echo " Node: $(node --version 2>/dev/null || echo 'N/A')"
echo " PM2: $(pm2 --version 2>/dev/null || echo 'N/A')"
echo ""
echo " Next steps:"
echo "   1. Upload project: tar xzf x402-deveco.tar.gz"
echo "   2. Install CLT: unzip commandline-tools-linux-*.zip -d ~/commandline-tools/"
echo "   3. Build HAP: cd x402-deveco && chmod +x build-cloud.sh && ./build-cloud.sh"
echo "   4. Start backend: pm2 start src/index.js --name x402-api"
echo "============================================"
