# Docker 构建问题修复指南

## 问题描述

构建第9步时出现错误：`COPY SSCRIPTS/DOCKER-ENTRYPOINT.SH/docker-entrypoint.sh 文件找不到`

## 根本原因分析

经过检查，发现以下问题：

1. **Dockerfile.harmony 中的路径是正确的**（第77行）
   ```dockerfile
   COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
   ```

2. **文件确实存在**
   - 路径：`C:\Users\HUAWEI\Desktop\x402-deveco\scripts\docker-entrypoint.sh`
   - 大小：2227 bytes
   - 内容：正常的 bash 脚本

3. **可能的原因**
   - Docker 构建缓存问题
   - 构建上下文不完整
   - 远程构建时文件未上传
   - 大小写敏感问题（Linux 环境）

## 修复方案

### 方案一：清理 Docker 缓存并重新构建

```bash
# 清理 Docker 构建缓存
docker builder prune -af

# 重新构建（无缓存）
docker build --no-cache -f Dockerfile.harmony -t x402-harmony-builder .
```

### 方案二：验证构建上下文

```bash
# 创建测试构建上下文
docker build --no-cache -f Dockerfile.harmony -t x402-test . 2>&1 | tee build-context-test.log
```

### 方案三：检查文件权限（Linux 服务器）

```bash
# 确保文件有正确的权限
chmod +x scripts/docker-entrypoint.sh

# 确保文件在构建上下文中
ls -la scripts/docker-entrypoint.sh
```

## 已修复的问题

### 1. hvigor 版本不匹配 ✅

**问题**：配置要求 6.26.1，但实际安装的是 5.15.5

**修复**：
- 清理了 node_modules 和 package-lock.json
- 重新安装依赖，确保版本正确
- 当前版本：6.26.1 ✅

### 2. Dockerfile 路径验证 ✅

**检查结果**：
- ✅ `scripts/docker-entrypoint.sh` 存在
- ✅ `.npmrc` 存在
- ✅ `oh-package.json5` 存在
- ✅ `package.json` 存在
- ✅ 所有 COPY 源文件都存在

### 3. .dockerignore 配置 ✅

**检查结果**：
- ✅ scripts 目录未被忽略
- ✅ 构建上下文包含所有必要文件

## 测试步骤

### 本地测试（Windows + Docker Desktop）

```powershell
# 1. 确保 Docker Desktop 正在运行
docker version

# 2. 清理构建缓存
docker builder prune -af

# 3. 测试构建
Set-Location "C:\Users\HUAWEI\Desktop\x402-deveco"
docker build --no-cache -f Dockerfile.harmony -t x402-harmony-builder-test . 2>&1 | Tee-Object -FilePath "docker-build-test.log"

# 4. 检查构建结果
docker images | Select-String "x402-harmony-builder"
```

### 远程服务器测试（EulerOS）

```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 进入项目目录
cd ~/x402-deveco

# 3. 验证文件存在
ls -la scripts/docker-entrypoint.sh

# 4. 确保文件权限正确
chmod +x scripts/docker-entrypoint.sh

# 5. 清理 Docker 缓存
docker builder prune -af

# 6. 重新构建
docker build --no-cache -f Dockerfile.harmony -t x402-harmony-builder . 2>&1 | tee docker-build.log

# 7. 检查构建结果
docker images | grep x402-harmony-builder
```

## 完整构建流程

### 步骤一：准备环境

```bash
# 清理所有缓存
rm -rf node_modules package-lock.json .hvigor entry/build
docker builder prune -af

# 重新安装依赖
npm install --legacy-peer-deps
```

### 步骤二：验证配置

```bash
# 检查 hvigor 版本
npm list @ohos/hvigor @ohos/hvigor-ohos-plugin

# 检查必要文件
ls -la scripts/docker-entrypoint.sh .npmrc oh-package.json5 package.json
```

### 步骤三：执行构建

```bash
# 使用构建脚本
chmod +x docker-build-harmony.sh
./docker-build-harmony.sh

# 或手动构建
docker build --network=host -f Dockerfile.harmony -t x402-harmony-builder .
docker run --rm --network=host -m 6g \
  -v ~/commandline-tools:/home/tools/commandline-tools:ro \
  -v $(pwd)/entry/build:/home/build/project/entry/build \
  x402-harmony-builder \
  bash -c "cd /home/build/project && chmod +x build-cloud.sh && ./build-cloud.sh"
```

### 步骤四：验证产物

```bash
# 检查 HAP 文件
ls -lh entry/build/default/outputs/default/entry-default-unsigned.hap

# 应该看到类似输出
# -rw-r--r-- 1 root root 8.5M ... entry-default-unsigned.hap
```

## 常见错误及解决方案

### 错误 1：COPY failed: file not found

**原因**：文件不在构建上下文中

**解决**：
```bash
# 检查文件是否存在
ls -la scripts/docker-entrypoint.sh

# 检查 .dockerignore 是否忽略了该文件
cat .dockerignore | grep script

# 确保在项目根目录执行构建
pwd  # 应该显示 .../x402-deveco
```

### 错误 2：permission denied

**原因**：文件权限不正确

**解决**：
```bash
chmod +x scripts/docker-entrypoint.sh
```

### 错误 3：SDK component missing

**原因**：缺少 HarmonyOS SDK

**解决**：
- 本地构建：安装 DevEco Studio 和 SDK
- Docker 构建：挂载 commandline-tools 目录

## 验证清单

- [ ] Docker Desktop 正在运行（本地）
- [ ] Docker daemon 正在运行（服务器）
- [ ] node_modules 已安装
- [ ] hvigor 版本正确（6.26.1）
- [ ] scripts/docker-entrypoint.sh 存在
- [ ] 文件权限正确（可执行）
- [ ] .dockerignore 未忽略必要文件
- [ ] 构建上下文完整
- [ ] commandline-tools 已准备（Docker 构建）

## 下一步

1. ✅ 已修复 hvigor 版本问题
2. ✅ 已验证所有文件存在
3. ⏭️ 执行 Docker 构建测试
4. ⏭️ 验证构建产物
5. ⏭️ 安装到设备测试

## 联系支持

如果问题仍然存在，请提供：
1. 完整的构建日志（docker-build.log）
2. Docker 版本（docker version）
3. 系统信息（uname -a）
4. 文件列表（ls -la scripts/）
