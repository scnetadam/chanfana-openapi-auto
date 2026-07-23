# OPC创业广场模块

## 模块概述

OPC创业广场是一个AI创业扶持平台，按地区城市划分，为AI创业者提供政策扶持、投资补贴、TOKEN补贴等支持。

## 功能特性

### 1. 城市划分
- 支持全国主要城市
- 每个城市独立政策
- 城市数据统计
- 热门城市推荐

### 2. 政策扶持
- AI产业专项扶持
- 投资补贴政策
- 人才引进补贴
- 场地租金补贴
- TOKEN生态激励

### 3. 补贴申请
- 在线申请流程
- 多步骤表单
- 材料上传
- 进度跟踪

### 4. 项目展示
- 创业项目列表
- 项目详情展示
- 融资信息
- 团队介绍
- 创始人背景

### 5. 入驻申请
- 企业信息填写
- 项目信息提交
- 联系方式验证
- 期望支持选择

## 页面结构

```
pages/opc/
├── index.vue       # 创业广场首页
├── city.vue        # 城市详情页
├── policy.vue      # 政策详情页
├── subsidy.vue     # 补贴申请页
├── project.vue     # 项目展示页
└── apply.vue       # 申请入驻页
```

## 页面说明

### 1. 首页 (index.vue)

**功能**:
- 展示统计数据（城市数、项目数、补贴金额、TOKEN池）
- 热门城市卡片
- 热门政策列表
- 全部城市列表
- 快速申请入口

**关键数据**:
```typescript
stats: {
  totalCities: 28,      // 覆盖城市
  totalProjects: 1247,  // 创业项目
  totalSubsidy: 25.6,   // 投资补贴（亿）
  totalTokens: 5200,    // TOKEN池（万）
}
```

### 2. 城市详情 (city.vue)

**功能**:
- 城市基本信息
- 扶持政策列表
- 创业项目列表
- 政策申请入口

**标签页**:
- 扶持政策
- 创业项目

### 3. 政策详情 (policy.vue)

**功能**:
- 政策基本信息
- 扶持内容详情
- 申请条件
- 申请材料
- 办理流程
- 成功案例

**扶持内容**:
- 研发补贴
- 场地补贴
- 人才补贴
- 市场推广

### 4. 补贴申请 (subsidy.vue)

**功能**:
- 企业信息填写
- 项目信息提交
- 附件材料上传
- 在线提交申请

**表单字段**:
- 公司名称
- 统一社会信用代码
- 法人代表
- 联系电话
- 项目类型
- 项目简介
- 团队规模
- 已获融资

### 5. 项目展示 (project.vue)

**功能**:
- 项目搜索
- 分类筛选
- 项目卡片展示
- 联系合作

**筛选条件**:
- 全部
- 热门
- 最新
- 融资中

**项目信息**:
- 项目名称
- 公司名称
- 融资阶段
- 融资金额
- 团队规模
- 创始人背景
- 增长指标

### 6. 申请入驻 (apply.vue)

**功能**:
- 多步骤表单
- 企业信息
- 项目信息
- 联系方式
- 期望支持
- 提交申请

**步骤**:
1. 企业信息
2. 项目信息
3. 联系方式
4. 提交申请

**期望支持**:
- 投资补贴
- 场地支持
- 人才引进
- TOKEN激励
- 政策咨询
- 资源对接

## 数据结构

### 城市数据

```typescript
interface City {
  id: number;
  name: string;          // 城市名称
  province: string;      // 所属省份
  projects: number;      // 项目数量
  subsidy: string;       // 补贴金额
  tokens: string;        // TOKEN数量
  policies: number;      // 政策数量
  hot: boolean;          // 是否热门
}
```

### 政策数据

```typescript
interface Policy {
  id: number;
  title: string;         // 政策标题
  type: string;          // 政策类型
  amount: string;        // 补贴金额
  status: string;        // 申请状态
  deadline: string;      // 截止日期
  description: string;   // 政策说明
  requirements: string[];// 申请条件
}
```

### 项目数据

```typescript
interface Project {
  id: number;
  name: string;          // 项目名称
  company: string;       // 公司名称
  city: string;          // 所在城市
  stage: string;         // 融资阶段
  funding: string;       // 融资金额
  valuation: string;     // 估值
  team: string;          // 团队规模
  founded: string;       // 成立时间
  description: string;   // 项目简介
  tags: string[];        // 标签
  metrics: {             // 指标
    users: string;
    revenue: string;
    growth: string;
  };
  founder: {             // 创始人
    name: string;
    background: string;
  };
}
```

## API接口

### 获取城市列表
```
GET /api/opc/cities
```

### 获取城市详情
```
GET /api/opc/cities/:id
```

### 获取政策列表
```
GET /api/opc/policies?city=:cityId
```

### 获取政策详情
```
GET /api/opc/policies/:id
```

### 获取项目列表
```
GET /api/opc/projects?filter=:filter
```

### 申请补贴
```
POST /api/opc/subsidies/apply
```

### 申请入驻
```
POST /api/opc/apply
```

## 样式规范

### 主题色

```css
/* 主色调 */
--primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 强调色 */
--highlight-color: #f5576c;

/* 标签色 */
--tag-city: #e3f2fd;
--tag-type: #f3e5f5;
--tag-amount: #fce4ec;
```

### 组件样式

- 卡片圆角: 16-20rpx
- 内边距: 30rpx
- 卡片阴影: 0 4rpx 12rpx rgba(0, 0, 0, 0.05)
- 按钮圆角: 16-20rpx

## 使用示例

### 访问首页

```javascript
uni.navigateTo({ url: '/pages/opc/index' });
```

### 查看城市详情

```javascript
uni.navigateTo({ url: '/pages/opc/city?id=1&name=北京' });
```

### 查看政策详情

```javascript
uni.navigateTo({ url: '/pages/opc/policy?id=1' });
```

### 申请补贴

```javascript
uni.navigateTo({ url: '/pages/opc/subsidy?policyId=1&city=北京' });
```

## 注意事项

1. **数据加载**: 所有页面使用`onLoad`生命周期加载初始数据
2. **表单验证**: 提交前进行必填项验证
3. **文件上传**: 支持5个附件，格式为PDF或图片
4. **多步骤表单**: 使用`currentStep`控制步骤切换
5. **状态管理**: 使用Vue 3 Composition API的`ref`管理状态

## 后续优化

### 1. 数据持久化
- 接入后端API
- 实现数据缓存
- 添加下拉刷新

### 2. 功能增强
- 添加地图展示
- 实现在线咨询
- 支持视频介绍
- 添加评价系统

### 3. 用户体验
- 添加骨架屏
- 优化加载动画
- 完善错误提示
- 添加分享功能

### 4. 性能优化
- 图片懒加载
- 列表虚拟滚动
- 数据预加载
- 代码分包

## 相关链接

- [项目主页](./README.md)
- [系统架构](./ARCHITECTURE.md)
- [开发指南](./开发完成报告.md)

---

**OPC创业广场 - AI创业者的首选平台！** 🚀
