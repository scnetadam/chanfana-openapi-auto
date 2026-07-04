#!/bin/bash

echo "============================================"
echo " X402-DEVECO HarmonyOS Cloud Build Script"
echo " Target: Huawei Cloud ECS 4C8G (EulerOS/openEuler)"
echo "============================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"

ARCH=$(uname -m)
echo "Architecture: ${ARCH}"

detect_os() {
  if [ -f /etc/euleros-release ] || [ -f /etc/openEuler-release ]; then
    echo "euler"
  elif [ -f /etc/centos-release ] || [ -f /etc/redhat-release ]; then
    echo "rhel"
  elif [ -f /etc/lsb-release ] || [ -f /etc/debian_version ]; then
    echo "debian"
  else
    echo "unknown"
  fi
}

OS_TYPE=$(detect_os)
echo "OS: ${OS_TYPE}"

JAVA_HOME=""
for jh in /usr/lib/jvm/java-17-current /usr/lib/jvm/java-17-openjdk-${ARCH} /usr/lib/jvm/java-17-openjdk-aarch64 /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-17-openjdk; do
  if [ -d "$jh" ]; then
    JAVA_HOME="$jh"
    break
  fi
done
export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk}

TOOLS_DIR="${OHOS_SDK_HOME:-/home/tools/commandline-tools/sdk}"
TOOLS_DIR="$(cd "$(dirname "$TOOLS_DIR")" 2>/dev/null && pwd)/$(basename "$TOOLS_DIR")" 2>/dev/null || true

if [ ! -d "${TOOLS_DIR}" ]; then
  HOME_TOOLS="$HOME/commandline-tools/sdk"
  if [ -d "$HOME_TOOLS" ]; then
    TOOLS_DIR="$HOME_TOOLS"
  else
    TOOLS_DIR="/home/tools/commandline-tools/sdk"
  fi
fi

export OHOS_SDK_HOME="${TOOLS_DIR}"
export OHOS_BASE_SDK_HOME="${TOOLS_DIR}/openharmony"

TOOLCHAIN_SUFFIX="${ARCH}"
if [ "$ARCH" = "aarch64" ]; then
  TOOLCHAIN_SUFFIX="arm64"
fi

TOOLCHAIN_PATH="${TOOLS_DIR}/openharmony/ni/toolchain/linux:${TOOLS_DIR}/openharmony/ni/toolchain/linux-${TOOLCHAIN_SUFFIX}"
if [ -d "${TOOLS_DIR}/openharmony/ni/toolchain/linux-arch" ]; then
  TOOLCHAIN_PATH="${TOOLS_DIR}/openharmony/ni/toolchain/linux:${TOOLS_DIR}/openharmony/ni/toolchain/linux-arch"
fi

export PATH="${TOOLS_DIR}/../bin:${TOOLS_DIR}/openharmony/ni/toolchain/linux:${TOOLS_DIR}/openharmony/ni/toolchain/linux-${TOOLCHAIN_SUFFIX}:${TOOLS_DIR}/openharmony/native/build-tools/cmake/bin:${PATH}"
export NODEJS_HOME=${NODEJS_HOME:-/usr/local/node}
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"

echo ""
echo "[1/9] Checking environment..."
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | awk '/^Mem:/{print $2}')"
echo "Disk: $(df -h . | awk 'NR==2{print $4}')"
echo "OS Type: ${OS_TYPE}"
echo "Arch: ${ARCH} (toolchain: linux-${TOOLCHAIN_SUFFIX})"
echo ""
node --version || { echo "ERROR: Node.js not found"; exit 1; }
java -version 2>&1 | head -1 || { echo "WARN: JDK not found, build may fail"; }
echo "JAVA_HOME=$JAVA_HOME"
echo "OHOS_SDK_HOME=$OHOS_SDK_HOME"

if [ ! -d "${OHOS_SDK_HOME}" ]; then
  echo "WARN: OHOS_SDK_HOME directory not found: ${OHOS_SDK_HOME}"
  echo "  If running in Docker, ensure commandline-tools is mounted at /home/tools/commandline-tools"
  echo "  If running bare metal, install commandline-tools and set OHOS_SDK_HOME"
fi

echo ""
echo "[2/9] Checking/Installing essential tools..."
if [ "${OS_TYPE}" = "euler" ] || [ "${OS_TYPE}" = "rhel" ]; then
  if ! command -v unzip &> /dev/null; then
    echo "  Installing unzip via dnf..."
    dnf install -y unzip 2>/dev/null || echo "  WARN: dnf install failed, continuing..."
  fi
elif [ "${OS_TYPE}" = "debian" ]; then
  if ! command -v unzip &> /dev/null; then
    echo "  Installing unzip via apt..."
    apt-get update 2>/dev/null
    apt-get install -y unzip 2>/dev/null || echo "  WARN: apt install failed, continuing..."
  fi
fi

echo ""
echo "[3/9] Installing npm dependencies..."
cd "${PROJECT_DIR}"

npm config set @ohos:registry https://repo.harmonyos.com/npm/ 2>/dev/null
npm config set registry https://repo.huaweicloud.com/repository/npm/ 2>/dev/null
npm config set strict-ssl false 2>/dev/null

if [ ! -d "node_modules/@ohos" ]; then
  echo "  @ohos packages not found, running npm install..."
  npm install --legacy-peer-deps 2>&1
  if [ $? -ne 0 ]; then
    echo "  First npm install failed, retrying with harmonyos repo..."
    npm install --registry=https://repo.harmonyos.com/npm/ --legacy-peer-deps 2>&1
    if [ $? -ne 0 ]; then
      echo "  Second npm install failed, retrying with nodejs.org..."
      npm install --registry=https://repo.huaweicloud.com/repository/npm/ --legacy-peer-deps 2>&1
      if [ $? -ne 0 ]; then
        echo "  WARN: npm install had issues, will try to continue..."
      fi
    fi
  fi
else
  echo "  @ohos packages already installed, skipping npm install"
fi

echo ""
echo "[4/9] Installing ohpm dependencies..."
if command -v ohpm &> /dev/null; then
  ohpm install --all --registry https://ohpm.openharmony.cn/ohpm/ 2>&1 || echo "  WARN: ohpm install failed, hvigor may handle deps"
else
  echo "  ohpm not found, skipping (hvigor will handle deps via npm)"
fi

echo ""
echo "[5/9] Syncing project resources..."
SYNC_OK=0
if [ -f "hvigorw" ]; then
  chmod +x hvigorw
  ./hvigorw --mode project -p product=default --no-daemon SyncProjectResourceToHvigor 2>&1 || echo "  WARN: SyncProjectResourceToHvigor failed (non-fatal)"
  ./hvigorw --mode module -p module=entry@default --no-daemon SyncModuleResourceToHvigor 2>&1 || echo "  WARN: SyncModuleResourceToHvigor failed (non-fatal)"
  SYNC_OK=1
elif [ -f "hvigor/hvigor-wrapper.js" ]; then
  node hvigor/hvigor-wrapper.js --mode project -p product=default --no-daemon SyncProjectResourceToHvigor 2>&1 || echo "  WARN: SyncProjectResourceToHvigor via wrapper failed"
  node hvigor/hvigor-wrapper.js --mode module -p module=entry@default --no-daemon SyncModuleResourceToHvigor 2>&1 || echo "  WARN: SyncModuleResourceToHvigor via wrapper failed"
  SYNC_OK=1
else
  echo "  WARN: No hvigor wrapper found, skipping sync"
fi

echo ""
echo "[6/9] Building HAP (assembleHap)..."
PARALLEL_JOBS=$(($(nproc) - 1))
if [ "$PARALLEL_JOBS" -lt 1 ]; then
  PARALLEL_JOBS=1
fi
echo "  Using --parallel=${PARALLEL_JOBS} ($(nproc) cores - 1 reserved)"

BUILD_SUCCESS=0
if [ -f "hvigorw" ]; then
  chmod +x hvigorw
  echo "  Running: ./hvigorw --mode module -p module=entry@default -p product=default --no-daemon assembleHap --parallel=${PARALLEL_JOBS}"
  ./hvigorw --mode module -p module=entry@default -p product=default \
    --no-daemon assembleHap --parallel=${PARALLEL_JOBS} 2>&1
  BUILD_SUCCESS=$?
elif [ -f "hvigor/hvigor-wrapper.js" ]; then
  echo "  Running: node hvigor/hvigor-wrapper.js assembleHap"
  node hvigor/hvigor-wrapper.js --mode module -p module=entry@default -p product=default \
    --no-daemon assembleHap --parallel=${PARALLEL_JOBS} 2>&1
  BUILD_SUCCESS=$?
else
  echo "ERROR: No build tool found (hvigorw or hvigor-wrapper.js)"
  BUILD_SUCCESS=1
fi

if [ $BUILD_SUCCESS -ne 0 ]; then
  echo ""
  echo "============================================"
  echo " BUILD FAILED (exit code: ${BUILD_SUCCESS})"
  echo "============================================"
  echo ""
  echo "Debugging info:"
  echo "  JAVA_HOME: ${JAVA_HOME}"
  echo "  OHOS_SDK_HOME: ${OHOS_SDK_HOME}"
  echo "  Node: $(node --version 2>/dev/null)"
  echo "  ls OHOS_SDK_HOME: $(ls -la "${OHOS_SDK_HOME}" 2>/dev/null || echo 'NOT FOUND')"
  echo "  ls node_modules/@ohos: $(ls node_modules/@ohos 2>/dev/null || echo 'NOT FOUND')"
  echo "  ls hvigor: $(ls -la hvigor/ 2>/dev/null || echo 'NOT FOUND')"
  exit 1
fi

echo ""
echo "[7/9] Checking build output..."
HAP_PATH="${PROJECT_DIR}/entry/build/default/outputs/default/entry-default-unsigned.hap"
if [ -f "$HAP_PATH" ]; then
  HAP_SIZE=$(du -h "$HAP_PATH" | cut -f1)
  echo "============================================"
  echo " BUILD SUCCESSFUL!"
  echo " HAP: $HAP_PATH"
  echo " Size: $HAP_SIZE"
  echo "============================================"
else
  echo "WARN: HAP not found at expected path, searching..."
  find "${PROJECT_DIR}/entry/build" -name "*.hap" -type f 2>/dev/null || echo "No HAP files found"
  echo ""
  echo "Build directory listing:"
  find "${PROJECT_DIR}/entry/build" -maxdepth 4 -type d 2>/dev/null || echo "No build directory"
fi

echo ""
echo "[8/9] Starting backend service..."
echo "  Config: cp .env.example .env && edit .env"
echo "  Start:  npm start"
echo "  Or PM2: pm2 start src/index.js --name x402-api"

echo ""
echo "[9/9] Done. Build log complete."
echo "============================================"
