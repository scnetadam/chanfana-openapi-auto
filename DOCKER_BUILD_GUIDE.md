# Docker 构建指南（华为云服务器）

## 前置条件

1. **华为云 ECS 服务器**（EulerOS/openEuler，4C8G 或更高配置）
2. **Command Line Tools**（HarmonyOS SDK）
3. **SSH 访问权限**

## 步骤一：准备 Command Line Tools

### 下载（本地 Windows）

1. 访问：https://developer.huawei.com/consumer/cn/deveco-studio/
2. 下载 **Command Line Tools**（选择 Linux 版本，对应服务器架构）
   - x86_64 服务器：`commandline-tools-linux-x64-5.0.5.300.zip`
   - aarch64 服务器：`commandline-tools-linux-arm64-5.0.5.300.zip`

### 上传到服务器

```powershell
# Windows PowerShell
scp commandline-tools-linux-*.zip root@你的服务器IP:~/
```

### 解压（服务器端）

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 解压
mkdir -p ~/commandline-tools
unzip ~/commandline-tools-linux-*.zip -d ~/commandline-tools/
rm ~/commandline-tools-linux-*.zip

# 验证
ls ~/commandline-tools/sdk/openharmony
```

## 步骤二：初始化服务器环境

### 方式 A：一键初始化（推荐）

```bash
# SSH 登录服务器后执行
cd ~/x402-deveco
sudo bash euler-init.sh
```

`euler-init.sh` 会自动：
- 创建 8GB Swap
- 安装 Docker + 镜像加速
- 安装 JDK 17
- 安装 Node.js 18
- 配置环境变量

### 方式 B：仅安装 Docker

```bash
# EulerOS/openEuler
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker

# 配置镜像加速（可选）
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 步骤三：执行构建

### 方式 A：远程构建（Windows 本地执行）

```powershell
# 在项目目录执行
.\docker-build-remote.bat
# 输入服务器 IP，脚本会自动上传并构建
```

### 方式 B：服务器端构建

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 进入项目目录
cd ~/x402-deveco

# 执行 Docker 构建
chmod +x docker-build-harmony.sh
./docker-build-harmony.sh
```

### 方式 C：手动 Docker 命令

```bash
# 1. 构建镜像
docker build --network=host -f Dockerfile.harmony -t x402-harmony-builder .

# 2. 运行构建
docker run --rm \
  --network=host \
  -m 6g \
  -e NODE_OPTIONS="--max-old-space-size=2048" \
  -e JAVA_OPTS="-Xmx1536m -Xms512m" \
  -v ~/commandline-tools:/home/tools/commandline-tools:ro \
  -v $(pwd)/entry/build:/home/build/project/entry/build \
  x402-harmony-builder \
  bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"
```

## 步骤四：获取构建产物

### 下载 HAP（Windows 本地）

```powershell
scp root@你的服务器IP:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
```

### 安装到设备

```powershell
hdc install entry-default-unsigned.hap
```

## 常见问题

### 1. Docker 镜像拉取失败

```bash
# 使用华为云 SWR 镜像
docker pull swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03
docker tag swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03 openeuler/openeuler:22.03
```

### 2. 内存不足

```bash
# 创建 Swap（如果还没有）
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. 架构不匹配

```bash
# 检查服务器架构
uname -m
# x86_64 -> 使用 x64 版本的 commandline-tools
# aarch64 -> 使用 arm64 版本的 commandline-tools
```

### 4. commandline-tools 找不到

确保路径正确：
```bash
ls ~/commandline-tools/sdk/openharmony
# 应该能看到 SDK 内容
```

## 构建日志位置

- Docker 构建日志：控制台输出
- Hvigor 构建日志：`entry/build/.hvigor/outputs/build-logs/`

## 性能优化

### 4C8G 服务器推荐配置

```bash
# Node.js 内存
export NODE_OPTIONS="--max-old-space-size=2048"

# JVM 内存
export JAVA_OPTS="-Xmx1536m -Xms512m"

# 并行编译（4核预留1核）
# build-cloud.sh 已默认 --parallel=3
```

## 完整示例（从零开始）

```bash
# 1. 本地上传项目
scp -r x402-deveco root@服务器IP:~/

# 2. 本地上传 commandline-tools
scp commandline-tools-linux-x64-5.0.5.300.zip root@服务器IP:~/

# 3. SSH 登录服务器
ssh root@服务器IP

# 4. 解压 commandline-tools
mkdir -p ~/commandline-tools
unzip ~/commandline-tools-linux-*.zip -d ~/commandline-tools/

# 5. 初始化环境
cd ~/x402-deveco
sudo bash euler-init.sh

# 6. Docker 构建
chmod +x docker-build-harmony.sh
./docker-build-harmony.sh

# 7. 检查产物
ls -lh ~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap

# 8. 退出 SSH
exit

# 9. 本地下载 HAP
scp root@服务器IP:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
```
