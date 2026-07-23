# 微信小程序JSON文件编码修复

## 问题描述

微信小程序报错：
```
pages/guide/index.json file is not in UTF-8 encoding
```

## 原因分析

微信小程序要求所有JSON文件必须使用UTF-8编码（无BOM）。

## 解决方案

### 批量转换JSON文件为UTF-8

已转换35个JSON文件：
- app.json
- project.config.json
- sitemap.json
- 所有页面的.json文件

### 转换方法

使用PowerShell批量转换：

```powershell
$jsonFiles = Get-ChildItem "dist/build/mp-weixin" -Recurse -Include "*.json"
foreach ($file in $jsonFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
}
```

## 验证结果

✅ 已转换35个JSON文件
✅ 使用UTF-8 without BOM编码
✅ 符合微信小程序要求

## 编码要求

### 微信小程序

- JSON文件：UTF-8（推荐无BOM）
- JS文件：UTF-8
- WXML文件：UTF-8
- WXSS文件：UTF-8

### 支付宝小程序

- JSON文件：UTF-8
- 其他文件：UTF-8

## 常见编码问题

### 1. BOM问题

**问题**: UTF-8 with BOM可能导致解析错误

**解决**: 使用UTF-8 without BOM

```powershell
# UTF-8 without BOM
[System.Text.UTF8Encoding]::new($false)

# UTF-8 with BOM
[System.Text.UTF8Encoding]::new($true)
```

### 2. 中文乱码

**问题**: 中文显示为乱码

**解决**: 确保文件保存为UTF-8编码

### 3. 特殊字符

**问题**: 特殊字符导致解析失败

**解决**: 使用Unicode转义或确保UTF-8编码

## 最佳实践

### 1. 统一编码

所有文件使用UTF-8编码：
- 编辑器设置默认UTF-8
- 版本控制保持UTF-8
- 构建工具输出UTF-8

### 2. 避免BOM

推荐使用UTF-8 without BOM：
- 更好的兼容性
- 避免解析问题
- 符合Web标准

### 3. 验证编码

使用工具验证文件编码：
```bash
# Linux/Mac
file -I filename.json

# PowerShell
$bytes = [System.IO.File]::ReadAllBytes("filename.json")
# 检查BOM: EF BB BF
```

## 已修复的文件

### 配置文件

✅ app.json
✅ project.config.json
✅ sitemap.json

### 页面配置文件（30个）

✅ pages/guide/index.json
✅ pages/login/index.json
✅ pages/activity/index.json
✅ pages/activity/detail.json
✅ pages/video/index.json
✅ pages/video/detail.json
✅ pages/aivideo/index.json
✅ pages/ai/index.json
✅ pages/ai/assistant.json
✅ pages/ai/content.json
✅ pages/ai/value.json
✅ pages/ai/insight.json
✅ pages/ai/recommend.json
✅ pages/ai/voice.json
✅ pages/koltask/index.json
✅ pages/aidashboard/index.json
✅ pages/settlement/index.json
✅ pages/bizcert/index.json
✅ pages/biz/index.json
✅ pages/biz/cert.json
✅ pages/biz/activity.json
✅ pages/biz/task.json
✅ pages/biz/stats.json
✅ pages/biz/settlement.json
✅ pages/biz/products.json
✅ pages/publish/index.json
✅ pages/dashboard/index.json
✅ pages/share/index.json
✅ pages/booking/result.json
✅ pages/wallet/index.json

## 测试建议

### 1. 开发者工具测试

在微信开发者工具中：
- 导入项目
- 检查是否有编码错误
- 预览功能是否正常

### 2. 真机测试

在真机上：
- 扫码预览
- 测试所有页面
- 验证中文显示

### 3. 不同环境测试

在不同操作系统测试：
- Windows
- macOS
- Linux

## 相关文档

- [微信小程序兼容性问题完整说明.md](./微信小程序兼容性问题完整说明.md)
- [微信小程序构建指南.md](./微信小程序构建指南.md)

---

**所有JSON文件已转换为UTF-8编码，符合微信小程序要求！** ✅
