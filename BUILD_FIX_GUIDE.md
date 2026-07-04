# 构建问题修复完整指南

## ✅ 已修复的问题

### 1. async aboutToAppear() 生命周期问题 ✅

**已修复文件**：
- `entry/src/main/ets/pages/activities/ActivitiesPage.ets`
- `entry/src/main/ets/pages/dashboard/DashboardPage.ets`
- `entry/src/main/ets/pages/wallet/WalletPage.ets`
- `entry/src/main/ets/pages/publish/PublishPage.ets`

**修复方式**：将异步逻辑移到独立的私有方法中

---

### 2. build-profile.json5 语法错误 ✅

**问题**：第 21 行多余逗号

**已修复**：移除多余逗号

---

### 3. 项目配置问题 ✅

**已修复**：
- ✅ 添加 `modelVersion: "5.0.3"` 到 `oh-package.json5`
- ✅ 修复 `module.json5` 中的 `srcEntrance`
- ✅ 创建 `hvigorw` 和 `hvigorw.bat` 脚本
- ✅ 修复 `hvigor-wrapper.js` 版本获取逻辑

---

## 🚀 构建步骤

### 步骤 1: 上传项目到服务器

```powershell
# Windows PowerShell
scp -r C:\Users\HUAWEI\Desktop\x402-deveco root@服务器IP:~/
```

---

### 步骤 2: 下载并安装 Command Line Tools

#### 2.1 下载

访问：https://developer.huawei.com/consumer/cn/deveco-studio/

下载 **Command Line Tools (Linux x64)**

#### 2.2 上传

```powershell
scp commandline-tools-linux-x64-*.zip root@服务器IP:~/
```

#### 2.3 解压

```bash
# SSH 登录服务器
ssh root@服务器IP

# 解压
mkdir -p ~/commandline-tools
unzip ~/commandline-tools-linux-x64-*.zip -d ~/commandline-tools/
rm ~/commandline-tools-linux-x64-*.zip

# 验证
ls ~/commandline-tools/sdk/openharmony
```

---

### 步骤 3: 运行修复脚本

```bash
# SSH 登录服务器
ssh root@服务器IP

# 进入项目目录
cd ~/x402-deveco

# 运行快速修复
chmod +x quick-fix.sh
./quick-fix.sh
```

**输出示例**：
```
============================================
 ✅ 修复完成！
============================================

下一步：
  1. 安装 Command Line Tools（如果还没有）
  2. 运行构建: ./build-docker-x86.sh
```

---

### 步骤 4: 运行构建

#### 方式 A: Docker 构建（推荐）

```bash
chmod +x build-docker-x86.sh
./build-docker-x86.sh
```

#### 方式 B: 裸机构建

```bash
chmod +x build-cloud.sh
./build-cloud.sh
```

---

### 步骤 5: 验证构建产物

```bash
# 检查 HAP 文件
ls -lh entry/build/default/outputs/default/entry-default-unsigned.hap

# 预期输出
-rw-r--r-- 1 root root 8.5M ... entry-default-unsigned.hap
```

---

## 🔧 快速修复脚本说明

### quick-fix.sh

快速修复所有已知配置问题：

```bash
./quick-fix.sh
```

**修复内容**：
1. ✅ build-profile.json5 语法错误
2. ✅ oh-package.json5 缺少 modelVersion
3. ✅ module.json5 srcEntrance 字段
4. ✅ 创建构建脚本
5. ✅ 清理构建缓存

---

### fix-build-issues.sh

完整检查和修复：

```bash
./fix-build-issues.sh
```

**检查内容**：
1. 项目结构完整性
2. 配置文件语法
3. ArkTS 代码问题
4. npm 依赖
5. 构建脚本
6. 构建缓存

---

## 📋 完整构建流程

```bash
# ========== 服务器端 ==========

# 1. SSH 登录
ssh root@服务器IP

# 2. 进入项目目录
cd ~/x402-deveco

# 3. 运行快速修复
chmod +x quick-fix.sh
./quick-fix.sh

# 4. 检查 Command Line Tools
ls ~/commandline-tools/sdk/openharmony

# 5. 如果没有，按照提示安装
# （参考上面的步骤 2）

# 6. 运行构建
chmod +x build-docker-x86.sh
./build-docker-x86.sh

# 7. 验证产物
ls -lh entry/build/default/outputs/default/entry-default-unsigned.hap
```

---

## ⚠️ 可能遇到的问题

### 问题 1: Command Line Tools 未安装

**症状**：
```
❌ Command Line Tools 未安装
```

**解决**：按照步骤 2 安装

---

### 问题 2: npm 依赖安装失败

**症状**：
```
npm install 失败
```

**解决**：
```bash
# 清理并重试
rm -rf node_modules package-lock.json
npm install --registry=https://registry.npmmirror.com --legacy-peer-deps
```

---

### 问题 3: Docker 镜像拉取失败

**症状**：
```
docker pull 失败
```

**解决**：
```bash
# 使用华为云镜像
docker pull swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03
docker tag swr.cn-north-1.myhuaweicloud.com/openeuler/openeuler:22.03 openeuler/openeuler:22.03
```

---

### 问题 4: 内存不足

**症状**：
```
构建过程中内存不足
```

**解决**：
```bash
# 创建 Swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📊 预期构建时间

| 步骤 | 时间 |
|------|------|
| 上传项目 | 5-10 分钟 |
| 安装 CLT | 10-20 分钟 |
| 运行修复脚本 | < 1 分钟 |
| Docker 构建 | 10-20 分钟 |
| **总计** | **25-50 分钟** |

---

## 🎯 成功标志

构建成功的标志：

```
============================================
 ✅ 构建成功！
============================================

HAP 文件: entry/build/default/outputs/default/entry-default-unsigned.hap
文件大小: 8.5M
MD5: xxxxxxxxxxxxxxxxxxxx

后续步骤：
  1. 下载 HAP:
     scp root@服务器IP:~/x402-deveco/entry/build/default/outputs/default/entry-default-unsigned.hap ./

  2. 安装到设备:
     hdc install entry-default-unsigned.hap
```

---

## 📝 检查清单

构建前检查：

- [ ] 项目已上传到服务器
- [ ] Command Line Tools 已安装
- [ ] 运行了 quick-fix.sh
- [ ] Docker 正常运行
- [ ] 有足够的内存（6GB+）

构建后检查：

- [ ] HAP 文件存在
- [ ] HAP 文件大小正常（5-15MB）
- [ ] 无构建错误

---

## 🆘 获取帮助

如果遇到问题：

1. 查看构建日志：`entry/build/.hvigor/outputs/build-logs/`
2. 运行检查脚本：`./check-env.sh`
3. 查看问题文档：`ISSUES_FOUND.md`
4. 查看修复文档：`FIXES_APPLIED.md`

---

## 💡 提示

1. **优先使用 Docker 构建**：更稳定，环境隔离
2. **确保网络稳定**：下载依赖需要网络
3. **监控内存使用**：构建需要大量内存
4. **保存构建日志**：方便排查问题
