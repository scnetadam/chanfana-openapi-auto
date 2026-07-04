# Command Line Tools 手动下载指南

## 📋 概述

Command Line Tools 包含 HarmonyOS SDK，是构建 HarmonyOS 应用的必需工具。

**大小**: 约 500MB  
**版本**: 5.0.5.300 或更高  
**架构**: Linux x64（华为云 AMDx86 服务器）

---

## 🌐 下载方式

### 方式 A: 浏览器下载（推荐）

#### 步骤 1: 访问华为开发者网站

在**本地电脑**打开浏览器，访问：

```
https://developer.huawei.com/consumer/cn/deveco-studio/
```

#### 步骤 2: 找到下载区域

1. 页面向下滚动，找到 **"Command Line Tools"** 区域
2. 或直接搜索 "Command Line Tools"

#### 步骤 3: 选择版本

选择以下选项：
- **操作系统**: Linux
- **架构**: x64（不是 arm64）
- **版本**: 5.0.5.300 或最新版本

#### 步骤 4: 下载

点击下载按钮，文件名类似：
```
commandline-tools-linux-x64-5.0.5.300.zip
```

下载位置：本地电脑的下载文件夹

---

### 方式 B: 使用 curl 直接下载（如果服务器有网络）

#### 步骤 1: 获取下载链接

1. 访问华为开发者网站
2. 找到 Command Line Tools 下载链接
3. 右键复制下载链接

#### 步骤 2: 在服务器下载

```bash
# SSH 登录服务器
ssh root@服务器IP

# 下载
cd ~
curl -L -o commandline-tools-linux-x64.zip '复制的下载链接'
```

**注意**: 下载链接可能很长，包含认证信息

---

## 📤 上传到服务器

### 方式 A: 使用 scp（推荐）

在**本地电脑**执行：

```powershell
# Windows PowerShell
scp C:\Users\你的用户名\Downloads\commandline-tools-linux-x64-*.zip root@服务器IP:~/
```

**示例**：
```powershell
scp C:\Users\HUAWEI\Downloads\commandline-tools-linux-x64-5.0.5.300.zip root@192.168.1.100:~/
```

### 方式 B: 使用 SFTP 工具

1. 使用 FileZilla、WinSCP 等 SFTP 工具
2. 连接到服务器
3. 上传文件到 `/root/` 目录

### 方式 C: 使用华为云控制台

1. 登录华为云控制台
2. 找到 ECS 实例
3. 点击"远程登录" → CloudShell
4. 使用 CloudShell 的上传功能

---

## 📦 解压安装

### 步骤 1: SSH 登录服务器

```bash
ssh root@服务器IP
```

### 步骤 2: 创建目录

```bash
mkdir -p ~/commandline-tools
```

### 步骤 3: 解压

```bash
unzip ~/commandline-tools-linux-x64-*.zip -d ~/commandline-tools/
```

**预期输出**：
```
Archive:  ~/commandline-tools-linux-x64-5.0.5.300.zip
  inflating: ~/commandline-tools/sdk/openharmony/...
  inflating: ~/commandline-tools/bin/ohpm
  ...
```

### 步骤 4: 清理压缩包

```bash
rm ~/commandline-tools-linux-x64-*.zip
```

---

## ✅ 验证安装

### 检查目录结构

```bash
ls ~/commandline-tools/
```

**预期输出**：
```
bin  sdk
```

### 检查 SDK

```bash
ls ~/commandline-tools/sdk/openharmony
```

**预期输出**：
```
api  build-tools  native  ni  toolchains  ...
```

### 检查 ohpm

```bash
~/commandline-tools/bin/ohpm --version
```

**预期输出**：
```
5.0.5
```

---

## 🚀 继续构建

安装完成后，重新运行构建脚本：

```bash
cd ~/x402-deveco
./build-docker-x86.sh
```

---

## 🔧 完整示例

### 示例 1: 从 Windows 上传并安装

```powershell
# 1. 本地下载（浏览器）
# 访问 https://developer.huawei.com/consumer/cn/deveco-studio/
# 下载 commandline-tools-linux-x64-5.0.5.300.zip

# 2. 上传到服务器（Windows PowerShell）
scp C:\Users\HUAWEI\Downloads\commandline-tools-linux-x64-5.0.5.300.zip root@192.168.1.100:~/

# 3. SSH 登录
ssh root@192.168.1.100

# 4. 解压
mkdir -p ~/commandline-tools
unzip ~/commandline-tools-linux-x64-5.0.5.300.zip -d ~/commandline-tools/
rm ~/commandline-tools-linux-x64-5.0.5.300.zip

# 5. 验证
ls ~/commandline-tools/sdk/openharmony

# 6. 构建
cd ~/x402-deveco
./build-docker-x86.sh
```

### 示例 2: 服务器直接下载（如果有网络）

```bash
# 1. SSH 登录
ssh root@服务器IP

# 2. 下载（需要从华为网站获取实际链接）
cd ~
curl -L -o commandline-tools.zip '实际下载链接'

# 3. 解压
mkdir -p ~/commandline-tools
unzip commandline-tools.zip -d ~/commandline-tools/
rm commandline-tools.zip

# 4. 验证
ls ~/commandline-tools/sdk/openharmony

# 5. 构建
cd ~/x402-deveco
./build-docker-x86.sh
```

---

## ❓ 常见问题

### Q1: 下载链接在哪里？

**A**: 访问 https://developer.huawei.com/consumer/cn/deveco-studio/，找到 Command Line Tools 下载区域，选择 Linux x64 版本。

### Q2: 需要登录吗？

**A**: 可能需要华为开发者账号登录才能下载。

### Q3: 文件太大，上传很慢怎么办？

**A**: 
- 使用华为云内网传输（如果在同一区域）
- 使用压缩工具压缩后再上传
- 使用华为云 OBS 作为中转

### Q4: 解压失败怎么办？

**A**: 
```bash
# 检查文件是否完整
ls -lh ~/commandline-tools-linux-x64-*.zip

# 尝试重新下载
# 确保有足够的磁盘空间
df -h ~
```

### Q5: 找不到 unzip 命令？

**A**: 
```bash
# EulerOS/openEuler
sudo dnf install -y unzip

# Ubuntu/Debian
sudo apt install -y unzip
```

---

## 📊 预期时间

| 步骤 | 预期时间 |
|------|---------|
| 下载（本地） | 5-10 分钟 |
| 上传到服务器 | 5-15 分钟 |
| 解压 | 1-2 分钟 |
| 验证 | < 1 分钟 |
| **总计** | **10-30 分钟** |

---

## 🎯 检查清单

- [ ] 已下载 Command Line Tools（Linux x64）
- [ ] 已上传到服务器 `~/` 目录
- [ ] 已解压到 `~/commandline-tools/`
- [ ] 已验证 SDK 目录存在
- [ ] 准备好运行构建脚本

---

## 💡 提示

1. **确保下载正确架构**：Linux x64（不是 arm64）
2. **确保文件完整**：下载后检查文件大小
3. **确保路径正确**：必须解压到 `~/commandline-tools/`
4. **确保权限正确**：使用 root 用户或确保有写权限

---

## 🆘 需要帮助？

如果遇到问题：

1. 检查服务器架构：`uname -m`（应该是 x86_64）
2. 检查磁盘空间：`df -h ~`
3. 检查文件完整性：`ls -lh ~/commandline-tools-linux-x64-*.zip`
4. 查看详细错误：运行 `./install-clt.sh`
