# X402-DEVECO 华为云端构建指南 (EulerOS 4C8G 适配版)

## 架构概览

```
┌───────────────────────────────────────────┐
│  华为云 ECS 4C8G (EulerOS / openEuler)       │
│  架构: aarch64 (Kunpeng) 或 x86_64          │
│                                              │
│  ┌─────────────────┐  ┌───────────────────┐  │
│  │ Docker          │  │ 裸机 (推荐)       │  │
│  │ HAP编译容器     │  │ JDK17 + Node18    │  │
│  │ openeuler:22.03 │  │ Command Line Tools│  │
│  │ (原生架构)      │  │ npm + hvigor      │  │
│  └─────────────────┘  │ HAP编译输出       │  │
│                        └──────────────────┘  │
│  ┌────────────────┐                         │
│  │ Docker          │  PM2 方式 (裸机)       │
│  │ 后端服务        │  pm2 start src/index.js │
│  │ Node.js API     │                         │
│  └─────────────────┘                         │
│                                              │
│  8GB Swap + Docker 镜像加速                  │
└────────────────────────────────────────────┘
```

## 关键变更说明 (aarch64 适配)

| 原问题 | 原因 | 修复 |
|--------|------|------|
| EXEC FORMAT ERROR | Dockerfile 指定 `--platform=linux/amd64`，但 ECS 是 aarch64 | 移除平台指定，使用 `openeuler/openeuler:22.03` 原生镜像 |
| sed 修改 APT 源失败 (exit code 1) | EulerOS 使用 `dnf`，无 `/etc/apt/sources.list` | 改用 `dnf`，移除所有 APT/sed 相关操作 |
| Node.js 安装失败 | nodesource 仅有 x86 RPM | 改用 npmmirror 下载对应架构 Node.js tar.xz |
| JDK 路径错误 | aarch64 上 JDK 路径含 `-aarch64` 后缀 | 动态检测 `uname -m` 选择正确路径 |

## 资源需求评估 (4C8G EulerOS)

| 组件 | 内存占用 | 磁盘占用 |
|------|----------|----------|
| EulerOS 基础系统 | ~300MB | ~2GB |
| JDK 17 | ~300MB | ~400MB |
| Node.js 18 | ~50MB | ~100MB |
| HarmonyOS SDK (API 22) | ~200MB | ~1.5GB |
| Command Line Tools | ~100MB | ~500MB |
| npm/ohpm dependencies | ~150MB | ~300MB |
| **HAP 编译峰值** | **~2GB** | ~300MB (产物) |
| Docker daemon (可选) | ~200MB | ~1GB |
| **总计(裸机)** | **~3.1GB** | **~5.1GB** |
| **总计(Docker)** | **~3.3GB** | **~6.1GB** |

> 8GB 内存 + 8GB Swap: 系统 ~1.5GB, 编译峰值 ~2GB, 剩余 ~4.5GB + 8GB Swap 缓冲
> 磁盘建议 >= 40GB (EulerOS 系统 ~2GB + 工具 + 产物)

---

## 方案一：ECS 裸机构建 (推荐，4C8G 最优)

### 1. 一键初始化 EulerOS 环境

```bash
# 上传项目后，在 ECS 上执行
cd x402-deveco
sudo bash euler-init.sh
```

euler-init.sh 自动完成:
- 架构检测 (aarch64 / x86_64)
- 8GB Swap 创建
- Docker 安装 + 镜像加速
- JDK 17 安装 (自动选择 aarch64/amd64)
- Node.js 18 安装 (npmmirror 对应架构二进制)
- PM2 进程管理器安装
- 环境变量配置

### 2. 安装 Command Line Tools

```bash
# 上传到 ECS (本地执行)
scp commandline-tools-linux-*.zip root@ECS_IP:~/

# ECS 上解压 (注意: 选择对应架构版本)
mkdir -p ~/commandline-tools
unzip ~/commandline-tools-linux-*.zip -d ~/commandline-tools/
rm ~/commandline-tools-linux-*.zip

# 配置环境变量
ARCH=$(uname -m)
cat >> ~/.bashrc << EOF
export OHOS_SDK_HOME=\$HOME/commandline-tools/sdk
export OHOS_BASE_SDK_HOME=\$HOME/commandline-tools/sdk/openharmony
export PATH=\$HOME/commandline-tools/bin:\$HOME/commandline-tools/sdk/openharmony/ni/toolchain/linux:\$HOME/commandline-tools/sdk/openharmony/ni/toolchain/linux-\${ARCH}:\$PATH
EOF
source ~/.bashrc

# 验证
ohpm --version
```

### 3. 上传项目并构建

```bash
# 上传 (本地执行)
scp -r ./x402-deveco root@ECS_IP:/root/

# SSH 登录 ECS
ssh root@ECS_IP

# 构建
cd ~/x402-deveco
chmod +x build-cloud.sh
./build-cloud.sh
```

### 4. 启动后端 (与 HAP 共存同一台 ECS)

```bash
# 配置环境变量
cp .env.example .env
vi .env

# 启动后端
pm2 start src/index.js --name x402-api
pm2 save
pm2 startup

# 验证
curl http://localhost:3000/health
```

### 5. 下载 HAP 产物

```bash
# 本地执行
scp root@ECS_IP:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
```

---

## 方案二：Docker 容器化构建 (4C8G 可选)

> Docker 方案使用 openeuler/openeuler:22.03 原生架构镜像，无需平台指定
> 额外消耗 ~500MB 内存，建议先确保 Swap 已配置

### 预备：euler-init.sh 已自动配置 Swap + Docker 镜像加速

### 构建

```bash
# 方式 A: Docker 内编译 (CLT 内嵌镜像)
docker build \
  --network=host \
  --build-arg CLT_ZIP=/home/user/commandline-tools-linux-5.0.5.300.zip \
  -f Dockerfile.harmony \
  -t x402-harmony-builder .

# 方式 B: Docker 内编译 (运行时挂载 CLT)
docker build \
  --network=host \
  -f Dockerfile.harmony \
  -t x402-harmony-builder .

docker run --rm \
  --network=host \
  -m 6g \
  -e NODE_OPTIONS="--max-old-space-size=2048" \
  -v ~/commandline-tools:/home/tools/commandline-tools \
  -v $(pwd)/entry/build:/home/build/project/entry/build \
  x402-harmony-builder \
  bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"

# 构建后启动后端
docker-compose up -d
```

### Docker 镜像说明

| 镜像 | 来源 | 用途 |
|------|------|------|
| `openeuler/openeuler:22.03` | Docker Hub / 华为云 SWR | HAP编译容器 + 后端服务 |
| 自动匹配宿主架构 (aarch64/x86_64) | 无需 `--platform` 指定 | |

---

## 方案三：无公网IP (CloudShell 上传)

```bash
# 1. 本地打包
#    Windows: pack-for-upload.bat
#    Linux/Mac: tar czf x402-deveco.tar.gz --exclude=node_modules --exclude=build --exclude=.hvigor --exclude=oh_modules x402-deveco

# 2. 华为云控制台 → ECS → 远程登录 → CloudShell

# 3. CloudShell 工具栏 ↑ 上传 x402-deveco.tar.gz

# 4. CloudShell 中执行:
cd /root
tar xzf x402-deveco.tar.gz
cd x402-deveco
sudo bash euler-init.sh
chmod +x build-cloud.sh
./build-cloud.sh
```

---

## 常见问题排查

### EXEC FORMAT ERROR

**原因**: Dockerfile 指定了 `--platform=linux/amd64`，但华为鲲鹏服务器是 aarch64 架构

**解决**: 已在新版 Dockerfile 中移除 `--platform` 指定，使用 `openeuler/openeuler:22.03` 原生镜像

### sed 修改 APT 源失败 (exit code 1)

**原因**: EulerOS/openEuler 使用 `dnf` 包管理器，不存在 `/etc/apt/sources.list`

**解决**: 已在新版脚本中移除所有 APT/sed 操作，改用 `dnf` 安装依赖

### Node.js 安装失败 (nodesource 无 aarch64 RPM)

**原因**: nodesource 官方仅提供 x86_64 的 RPM 仓库

**解决**: 新版使用 npmmirror 直接下载对应架构的 Node.js tar.xz 包:
- aarch64: `node-v18.20.4-linux-arm64.tar.xz`
- x86_64: `node-v18.20.4-linux-x64.tar.xz`

### Docker 镜像拉取失败

1. **确认 Docker 镜像加速配置**
```bash
cat /etc/docker/daemon.json
# 应包含: "registry-mirrors": [...]
```

2. **重启 Docker**
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

3. **手动测试拉取**
```bash
docker pull openeuler/openeuler:22.03
```

4. **华为云 SWR 备选**
```bash
docker pull swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03
```

5. **使用 --network=host**
```bash
docker build --network=host -f Dockerfile.harmony -t x402-harmony-builder .
```

6. **裸机方案绕过 Docker**
```bash
sudo bash euler-init.sh
chmod +x build-cloud.sh
./build-cloud.sh
```

---

## 4C8G EulerOS 性能调优

### JVM 参数 (编译时)
```bash
export NODE_OPTIONS="--max-old-space-size=2048"
export JAVA_OPTS="-Xmx1536m -Xms512m"
```

### 并行度控制
```bash
# 4核: 预留1核给系统, 使用3核编译
# build-cloud.sh 已默认 --parallel=3
```

### 内存保护
```bash
# euler-init.sh 已创建 8GB swap
# Docker 方案: docker run -m 6g 限制容器内存
```

---

## 产物路径

| 产物 | 路径 |
|------|------|
| HAP 包 | `entry/build/default/outputs/default/entry-default-unsigned.hap` |
| APP 包 | `build/outputs/defaults/x402-deveco-default-signed.app` |

## 环境变量清单

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 后端端口 | 3000 |
| GLM_API_BASE | GLM API 地址 | https://open.bigmodel.cn/api/paas/v4 |
| GLM_API_KEY | GLM API 密钥 | - |
| GLM_DEFAULT_MODEL | 默认模型 | glm-4 |
| WORKER_BASE_URL | 支付Worker地址 | - |
| WORKER_AUTH_TOKEN | Worker认证Token | - |
| OHOS_SDK_HOME | HarmonyOS SDK路径 | ~/commandline-tools/sdk |
| JAVA_HOME | JDK 17路径 | /usr/lib/jvm/java-17-openjdk-{arch} |
| NODE_OPTIONS | Node内存限制 | --max-old-space-size=2048 |
| JAVA_OPTS | JVM内存限制 | -Xmx1536m -Xms512m |
