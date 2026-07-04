# 华为云 4C8G AMDx86 Docker 构建指南

## 环境信息
- **服务器**: 华为云 ECS 4C8G
- **架构**: AMD x86_64
- **系统**: EulerOS / openEuler
- **构建方式**: Docker 容器

## 一键构建（推荐）

### 步骤 1: 上传项目到服务器

```bash
# 本地执行（Windows PowerShell）
scp -r C:\Users\HUAWEI\Desktop\x402-deveco root@服务器IP:~/
```

### 步骤 2: 检查环境

```bash
# SSH 登录服务器
ssh root@服务器IP

# 进入项目目录
cd ~/x402-deveco

# 检查环境
chmod +x check-env.sh
./check-env.sh
```

### 步骤 3: 一键构建

```bash
# 执行构建（自动下载 Command Line Tools）
chmod +x build-docker-x86.sh
./build-docker-x86.sh
```

构建脚本会自动：
1. ✅ 检查 Docker
2. ✅ 下载 Command Line Tools（如果没有）
3. ✅ 安装项目依赖
4. ✅ 构建 Docker 镜像
5. ✅ 编译 HAP 包

### 步骤 4: 下载 HAP

```powershell
# 本地下载（Windows PowerShell）
scp root@服务器IP:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
```

---

## 手动构建（详细步骤）

### 1. 安装 Docker（如果没有）

```bash
# EulerOS/openEuler
sudo dnf install -y docker

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker

# 验证
docker --version
```

### 2. 下载 Command Line Tools

#### 方式 A: 自动下载（脚本会自动执行）

#### 方式 B: 手动下载

1. 访问：https://developer.huawei.com/consumer/cn/deveco-studio/
2. 下载 **Command Line Tools (Linux x64)**
3. 上传并解压：

```bash
# 上传（本地执行）
scp commandline-tools-linux-x64-5.0.5.300.zip root@服务器IP:~/

# 解压（服务器执行）
mkdir -p ~/commandline-tools
unzip ~/commandline-tools-linux-x64-*.zip -d ~/commandline-tools/
rm ~/commandline-tools-linux-x64-*.zip

# 验证
ls ~/commandline-tools/sdk/openharmony
```

### 3. 构建项目

#### 方式 A: 使用构建脚本

```bash
chmod +x build-docker-x86.sh
./build-docker-x86.sh
```

#### 方式 B: 手动 Docker 命令

```bash
# 1. 安装依赖
npm install --registry=https://registry.npmmirror.com --legacy-peer-deps

# 2. 构建 Docker 镜像
docker build --network=host -f Dockerfile.harmony -t x402-harmony-builder .

# 3. 运行构建
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

---

## 性能优化（4C8G 配置）

### 内存配置

```bash
# 创建 Swap（如果没有）
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 验证
free -h
```

### Docker 镜像加速

```bash
# 配置华为云镜像加速
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://05b0abddc100423491c4c7f23dfe993c.mirror.swr.myhuaweicloud.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 构建参数优化

```bash
# Node.js 内存（已在脚本中配置）
export NODE_OPTIONS="--max-old-space-size=2048"

# JVM 内存（已在脚本中配置）
export JAVA_OPTS="-Xmx1536m -Xms512m"

# 并行编译（4核预留1核，使用3核）
# build-cloud.sh 已默认 --parallel=3
```

---

## 常见问题

### 1. Docker 镜像拉取失败

```bash
# 使用华为云镜像
docker pull swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03
docker tag swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03 openeuler/openeuler:22.03
```

### 2. 内存不足

```bash
# 检查内存
free -h

# 创建 Swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. Command Line Tools 下载失败

手动下载：
1. 访问：https://developer.huawei.com/consumer/cn/deveco-studio/
2. 下载 Linux x64 版本
3. 上传到服务器：`scp commandline-tools-linux-x64-*.zip root@服务器IP:~/`
4. 解压：`unzip ~/commandline-tools-linux-x64-*.zip -d ~/commandline-tools/`

### 4. 构建失败

查看日志：
```bash
# Hvigor 构建日志
ls -la entry/build/.hvigor/outputs/build-logs/

# Docker 容器日志（构建时）
docker logs <container_id>
```

---

## 构建产物

| 产物 | 路径 |
|------|------|
| HAP 包 | `entry/build/default/outputs/default/entry-default-unsigned.hap` |
| 构建日志 | `entry/build/.hvigor/outputs/build-logs/` |

---

## 完整示例

```bash
# 1. SSH 登录服务器
ssh root@服务器IP

# 2. 进入项目
cd ~/x402-deveco

# 3. 检查环境
chmod +x check-env.sh
./check-env.sh

# 4. 一键构建
chmod +x build-docker-x86.sh
./build-docker-x86.sh

# 5. 检查产物
ls -lh entry/build/default/outputs/default/entry-default-unsigned.hap

# 6. 退出
exit

# 7. 本地下载（Windows PowerShell）
scp root@服务器IP:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./
```

---

## 后续步骤

### 安装 HAP 到设备

```powershell
# 安装
hdc install entry-default-unsigned.hap

# 启动应用
hdc shell aa start -a EntryAbility -b com.x402.promodrive
```

### 启动后端服务

```bash
# 服务器端
cd ~/x402-deveco
cp .env.example .env
vi .env  # 配置 GLM_API_KEY 等环境变量
npm start

# 或使用 PM2
npm install -g pm2
pm2 start src/index.js --name x402-api
pm2 save
pm2 startup
```
