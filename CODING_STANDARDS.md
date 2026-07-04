# X402-DEVECO 项目编码规范

> 适用于 HarmonyOS ArkTS 前端 + Node.js 后端 + Python 支付模块

---

## 通用规范

### 缩进与空白

- **缩进**: 2 空格（所有语言）
- **编码**: UTF-8
- **行尾**: LF（Unix 风格）
- **末尾空行**: 文件末尾保留一个空行
- **尾部空格**: 不允许（Markdown 除外）

已通过 `.editorconfig` 自动执行。

### 命名约定

| 元素 | 规范 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `activities-page.ets`, `data-store.js` |
| 类/接口/枚举 | PascalCase | `ActivityItem`, `ApiResponse` |
| 方法/函数 | camelCase | `loadActivities()`, `getById()` |
| 变量/参数 | camelCase | `item.id`, `errMsg` |
| 常量 | UPPER_SNAKE_CASE | `BASE_URL`, `CONVERSION_VALUES` |
| 枚举成员 | PascalCase | `ActivityStatus.Active` |
| 私有成员 | 前缀 `_` 或直接 camelCase | `_parseInternal()` |
| 类型别名 | PascalCase | `type ActivityMap = Record<string, ActivityItem>` |

### 文件组织

每个目录包含一个 `index.ts` / `index.js` 或统一导出入口：

```
src/
  models/          — 数据模型、状态管理
  pages/           — 页面组件（每页一个文件）
  common/          — 共享工具、常量、HttpClient
  entryability/    — Ability 生命周期
```

---

## ArkTS / HarmonyOS 前端规范

### 组件结构

```typescript
// 导入顺序: 内置 → 业务 → 资源
import { router } from '@kit.ArkUI';
import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { ActivityItem, ActivityItemList } from '../../model/DataModels';

@Component
export struct PageName {
  // 1. @State / @Prop / @Link / @StorageProp
  @State items: ItemType[] = [];
  @State loading: boolean = true;

  // 2. @Builder
  @Builder
  SomeBlock(data: DataType) { }

  // 3. 生命周期
  aboutToAppear() {
    this.loadData();
  }

  // 4. 私有方法
  private async loadData() { }

  // 5. build() 方法
  build() {
    Column() {
      // ... UI 树
    }
  }
}
```

### 类型安全

- 所有 API 返回必须指定泛型类型: `HttpClient.get<ContentItem[]>`
- 禁止使用 `any`；优先 `Record<string, Object>` + 显式转换
- JSON 反序列化通过 `fromJson()` 静态工厂方法
- 必须从 `DataModels.ets` 中定义所有业务模型

### 资源引用

- 颜色/尺寸/字符串必须使用 `$r('app.color.xxx')`、`$r('app.string.xxx')`
- 禁止硬编码颜色值（临时调试除外）
- 主题通过 `resource/base/element/color.json` 统一管理

### 布局约定

- 根组件：`Column` 或 `Row`，设置 `width('100%')`、`height('100%')`
- 弹性布局：`layoutWeight(1)` 控制剩余空间，`justifyContent` / `alignItems` 对齐
- 边距统一使用 `padding({ left: 16, right: 16, top: 12, bottom: 8 })` 等标准间距
- 卡片统一：`borderRadius(12)` + `backgroundColor($r('app.color.card_background'))` + `shadow()`

### 错误处理

- API 调用必须检查 `resp.success`
- 空数据状态必须展示占位 UI（"暂无活动" 等）
- 加载状态必须展示 `LoadingProgress`
- 使用 `try-catch` 包裹异步操作

### 代码格式

- 类型注解冒号前无空格，后跟空格：`resp: ApiResponse<T>`
- 箭头函数参数括号：`(item: ItemType) => item.id`
- 对象字面量最后一个属性加逗号
- 字符串统一使用单引号
- 行宽不超过 120 字符
- if/else/for 花括号不省略

---

## Node.js 后端规范

### 模块结构

```javascript
// 1. require
const express = require('express');
const router = express.Router();

// 2. 模块级常量
const DEFAULT_PAGE_SIZE = 20;

// 3. 路由定义
router.get('/list', (req, res) => { });

// 4. 导出
module.exports = router;
```

### 路由约定

- 路由路径使用 kebab-case: `/api/activity/list`
- 响应格式统一: `{ success: boolean, data?: T, error?: string }`
- 错误响应: `res.status(4xx).json({ success: false, error: '描述' })`
- 成功响应: `res.json({ success: true, data: ... })`
- 异步操作必须用 `try-catch` + `async/await`

### 命名

- 文件名：kebab-case（`data-store.js`, `glm-client.js`）
- 变量/函数：camelCase
- 类：PascalCase
- 常量：UPPER_SNAKE_CASE

### 错误处理

- 所有路由 handler 必须 try-catch 捕获异常
- 未捕获异常由全局错误中间件处理（`app.use((err, req, res, next) => { ... })`）
- 使用 `console.error` 记录错误，不吞异常

### 数据层

- 临时用内存存储，后期迁移数据库
- store 方法命名统一：`list()`, `getById(id)`, `create(data)`, `update(id, data)`
- 种子数据写在 store 文件顶部

---

## Python 支付模块规范

### 代码格式

- **缩进**: 4 空格
- **引号**: 双引号
- **行宽**: 不超过 100 字符
- 遵循 PEP 8

### 文件结构

```python
# 1. 导入
import hashlib
import json

from base import PaymentBase

# 2. 常量
API_URL = "https://openapi.alipay.com/gateway.do"

# 3. 类定义
class AlipayClient(PaymentBase):
    def create_payment(self, subject: str, total_amount: str) -> dict:
        pass
```

### 命名

- 文件名：snake_case（`alipay.py`, `wechat_pay.py`）
- 类名：PascalCase
- 方法/变量：snake_case
- 常量：UPPER_SNAKE_CASE

---

## Git 规范

### 分支策略

- `main` — 生产就绪
- `develop` — 开发主分支
- `feature/xxx` — 功能分支
- `fix/xxx` — 修复分支
- `release/x.x.x` — 发布分支

### 提交信息

```
<type>(<scope>): <简短描述>

<可选详细说明>
```

**type**: feat | fix | refactor | style | docs | test | chore
**scope**: api | pages | payment | build | config

示例:
```
feat(api): 添加活动列表分页接口
fix(pages): 修复活动卡片日期越界
refactor(api): 重构归因引擎计算逻辑
```

### 代码提交前

1. 运行 `build.sh` 确认无编译错误
2. 移除 `console.log` 调试代码（正式提交）
3. 确认 `.editorconfig` 格式已生效

---

## 目录结构标准

```
x402-deveco/
├── AppScope/                    # 应用配置
│   └── resources/
├── entry/                       # HarmonyOS 主入口
│   └── src/main/
│       ├── ets/
│       │   ├── common/          # 工具、常量、HttpClient
│       │   ├── entryability/    # Ability
│       │   ├── entrybackupability/
│       │   ├── model/           # 数据模型
│       │   └── pages/           # 页面组件
│       ├── resources/
│       └── module.json5
├── src/                         # Node.js 后端
│   ├── models/                  # 数据存储层
│   ├── routes/                  # 路由模块
│   ├── index.js                 # 入口
│   ├── glmClient.js             # GLM API 客户端
│   └── workerClient.js          # Worker 通信
├── payment_backends/            # Python 支付模块
├── worker/                      # Web Worker
│   └── src/worker.js
├── scripts/                     # 构建/部署脚本
├── .editorconfig                # 编辑器配置
├── build-profile.json5          # HarmonyOS 构建配置
└── package.json                 # 项目清单
```

---

## 一致性检查清单

- [ ] `.editorconfig` 已生效（IDE 自动加载）
- [ ] 所有文件末尾有空行
- [ ] 无尾部空格
- [ ] 缩进为 2 空格（Python 4 空格）
- [ ] 无 `any` 类型（ArkTS）
- [ ] API 响应格式统一
- [ ] 所有异步路由有 try-catch
- [ ] 资源引用使用 `$r()`
- [ ] 文件命名 kebab-case
- [ ] 无硬编码颜色/尺寸