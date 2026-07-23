# 龟钮印信 Brand CI 规范

> 版本: v3.3.0 | 更新: 2026-07-17
>
> 源码: `entry/src/main/ets/common/BrandCI.ets` · `frontend/src/styles/theme.scss`

---

## 一、品牌核心理念

**龟钮印信** — 基于区块链存证的KOL实时加权交易系统

品牌视觉三要素:
- **龟钮** — 古代印信旋钮，象征权威与可信 → 朱砂红 `#C94040`
- **印信** — 不可篡改的存证承诺 → 区块链/哈希标识
- **赛博** — 数字时代的技术感 → 暗色底+霓虹绿 `#00E5A0`

口号: **车讯传天下 · 印信通四方**

---

## 二、色彩体系

### 2.1 品牌色 (Brand Palette)

| 色彩 | Hex | 用途 | 变量名 |
|------|-----|------|--------|
| **霓虹绿** | `#00E5A0` | 主色·CTA·活跃态·品牌标识 | `PRIMARY` |
| 霓虹绿深 | `#00C98A` | 按压态·渐变终止 | `PRIMARY_DARK` |
| 霓虹绿亮 | `#33FFBE` | Hover·高亮 | `PRIMARY_LIGHT` |
| **赛博青** | `#00B4D8` | 辅色·渐变过渡 | `SECONDARY` |
| **星辰紫** | `#8B5CF6` | AI模块·数据洞察 | `ACCENT` |
| **赛博金** | `#F0B90B` | 金额·佣金·收益 | `GOLD` |
| 赛博金亮 | `#FFD54F` | 金色Hover | `GOLD_LIGHT` |
| **危险红** | `#FF3D71` | 错误·警告·转化权重 | `CYBER_RED` |
| **霓虹蓝** | `#00D4FF` | 信息·待结算·链接 | `NEON_BLUE` |
| **朱砂红** | `#C94040` | 印章·存证·品牌标志 | `SEAL_RED` |
| 朱砂红深 | `#8B2020` | 印章渐变·按压态 | `SEAL_RED_DARK` |
| **翡翠绿** | `#2D8B56` | OPC·合规·成功认证 | `JADE` |
| 翡翠绿深 | `#1A5E38` | 翡翠渐变·按压态 | `JADE_DARK` |

### 2.2 中性色 (Neutrals)

| 色彩 | Hex | 用途 | 变量名 |
|------|-----|------|--------|
| **深渊黑** | `#0A0E1A` | 页面底色·最深背景 | `DEEP_BG` |
| 卡片黑 | `#131929` | 卡片背景 | `CARD_BG` |
| 卡片Hover | `#1A2340` | 卡片按下 | `CARD_BG_HOVER` |
| 表面蓝 | `#1E2A4A` | 输入框·凹陷区域 | `SURFACE` |
| 分割线 | `#1C2E4A` | 分隔·边框 | `DIVIDER` |
| **正文白** | `#E8ECF1` | 标题·主要文字 | `TEXT_PRIMARY` |
| 辅助灰 | `#8899AA` | 说明·次要文字 | `TEXT_SECONDARY` |
| 静默灰 | `#5A6B7F` | 时间戳·极次要 | `TEXT_MUTED` |

### 2.3 徽章色 (Badge)

| 语义 | 背景 | 文字 | 用途 |
|------|------|------|------|
| 成功/内容 | `#0D2D22` | `#00E5A0` | 已完成·内容类 |
| 危险/失败 | `#2D0D16` | `#FF3D71` | 失败·直播类 |
| AI/视频 | `#1D0D2D` | `#8B5CF6` | AI模块·视频类 |
| 金额/预约 | `#2D2A0D` | `#F0B90B` | 佣金·预约类 |
| 信息/分享 | `#0D1A2D` | `#00D4FF` | 链接·分享类 |
| 基础/结算 | `#0D2D2D` | `#00B4D8` | 通用·结算类 |

---

## 三、印章系统 (Seal System)

龟钮印信的核心品牌识别，源自古代龟钮铜印。

### 3.1 印章色彩

| 元素 | Hex | 说明 |
|------|-----|------|
| 印章背景 | `#C9404020` (12%透明) | 印章底色 |
| 印章边框 | `#C9404066` (40%透明) | 方印边线 |
| 印章文字 | `#C94040` | 龟/印字 |
| 龟钮高光 | `#C9A86C` | 旋钮金色高光 |
| 龟钮本体 | `#8B6B3E` | 铜质本色 |
| 龟钮暗部 | `#5A4428` | 阴影 |

### 3.2 印章布局参数

```
┌──────────────┐  ← STAMP_SIZE: 64
│  ┌────────┐  │  ← STAMP_BORDER_WIDTH: 2
│  │        │  │
│  │   龟   │  │  ← SEAL_TITLE: 28px
│  │        │  │  ← STAMP_LETTER_SPACING: 4
│  └────────┘  │
└──────────────┘  ← SEAL_RADIUS: 12
     ● ○         ← KNOB (龟钮旋钮, offset y: -38)
```

### 3.3 使用规则

- **登录页**: 大尺寸印章(88px) + 龟钮旋钮 + 朱砂分隔线
- **我的页**: 头像框改朱砂红边框 + 龟/印字
- **存证相关**: 印章符号 `龟` + HASH标签 + 朱砂红背景条
- **结算卡片**: `⛓ 印信存证 N 笔` 提示行

---

## 四、排版体系 (Typography)

### 4.1 字号阶梯

| 级别 | px | 用途 | ArkTS变量 |
|------|-----|------|-----------|
| Hero | 36 | 登录页标题 | `HERO_TITLE` |
| 印章 | 28 | 印章内文字 | `SEAL_TITLE` |
| 页面 | 24 | 页面标题 | `PAGE_TITLE` |
| 章节 | 18 | 章节标题·统计数字 | `SECTION_TITLE` |
| 卡片 | 16 | 卡片标题·金额 | `CARD_TITLE` |
| 正文 | 14 | 正文·描述 | `BODY` |
| 辅助 | 12 | 标签·说明 | `CAPTION` |
| 微型 | 10 | 英文标识·状态 | `MICRO` |

### 4.2 字间距

| 场景 | px | 变量 |
|------|-----|------|
| Hero标题 | 6 | `LETTER_SPACING_HERO` |
| 页面标题 | 2 | `LETTER_SPACING_TITLE` |
| 英文标识 | 2-3 | 内联 `.letterSpacing(2)` |

### 4.3 英文标识规范

页面右上角统一格式:
```
[龟] PROMO    活动页
[龟] TASKS    任务页
[龟] SETTLE   结算页
 AI · VOICE   AI评估页
```
字号 10px，letterSpacing 2，颜色取对应模块主色。

---

## 五、圆角体系 (Radius)

| 级别 | px | 用途 | 变量 |
|------|-----|------|------|
| SM | 6 | 徽章·小标签 | `SM` |
| MD | 10 | 菜单项·交易行 | `MD` |
| CARD | 14 | 卡片·列表项 | `CARD` |
| LG | 16 | 输入框·按钮 | `LG` |
| SEAL | 12 | 印章容器 | `SEAL` |
| KNOB | 8 | 龟钮旋钮 | `KNOB` |
| PILL | 999 | 胶囊按钮·筛选标签 | `PILL` |

---

## 六、渐变体系 (Gradient)

| 名称 | 方向 | 色值 | 用途 |
|------|------|------|------|
| **Hero** | ↓ Bottom | `#0A0E1A → #0D0A1A → #131929` | 登录头部·我的页头部 |
| **Value** | → Right | `#8B5CF6 → #6366F1 → #00B4D8` | AI评估看板·数据卡片 |
| **Wallet** | → Right | `#00E5A0 → #00B4D8 → #00D4FF` | 钱包余额卡·主CTA渐变 |
| **Seal** | → Right | `#C94040 → #8B2020 → #5A1010` | 印章卡片·存证区域 |
| **Jade** | → Right | `#2D8B56 → #1A5E38` | OPC区域·认证通过 |
| **Gold** | → Right | `#F0B90B → #FFD54F` | 金印等级·高阶权益 |

---

## 七、阴影体系 (Shadow)

| 名称 | 参数 | 用途 |
|------|------|------|
| PRIMARY GLOW | r:20, `#00E5A044`, y:4 | 主按钮·霓虹绿光晕 |
| ACCENT GLOW | r:16, `#8B5CF633`, y:4 | AI卡片·紫色光晕 |
| GOLD GLOW | r:16, `#F0B90B33`, y:4 | 金额卡片·金色光晕 |
| SEAL GLOW | r:24, `#C9404044`, y:4 | 印章·朱砂红光晕 |
| KNOB GLOW | r:16, `#C9A86C44`, y:2 | 龟钮·铜金色光晕 |
| CARD | r:8, `#0A0E1A66`, y:2 | 普通卡片 |

---

## 八、品牌符号 (Icon)

| 符号 | Unicode | 含义 | 使用场景 |
|------|---------|------|----------|
| 龟 | `\u9F9F` | 品牌核心·龟钮 | 标题旁标识·空状态·头像 |
| 印 | `\u5370` | 印信·存证 | 头像上方·存证标签 |
| ✓ | `\u2713` | 已验证·AI审核 | 结算卡AI✓标签 |
| ⛓ | `\u26D3` | 区块链·追踪链 | 存证提示·结算统计 |
| ¥ | `\u00A5` | 人民币·金额 | 所有金额展示 |
| ✨ | `\u2728` | AI能力 | AI入口·生成结果 |
| ☑ | `\u2611` | 任务·完成 | 任务卡·提交成功 |

---

## 九、动效规范 (Animation)

| 参数 | 值 | 用途 |
|------|-----|------|
| DURATION_FAST | 150ms | 按钮按下·颜色切换 |
| DURATION_NORMAL | 300ms | 页面转场·卡片展开 |
| DURATION_SLOW | 500ms | 大面积动画 |
| CURVE_SPRING | `spring(1,1,0.5,1)` | 弹性回弹 |
| CURVE_EASE | `ease-in-out` | 通用缓动 |
| PULSE_SCALE | 1.05 | 印章呼吸 |
| PRESSED_SCALE | 0.97 | 按钮按压 |
| GLOW_DURATION | 2000ms | 光晕呼吸周期 |

---

## 十、组件规范

### 10.1 卡片 (Card)

```
基础卡片:
  background: CARD_BG (#131929)
  border: 0.5px DIVIDER (#1C2E4A)
  radius: CARD (14)
  shadow: r:8 #0A0E1A66 y:2
  padding: 16

渐变卡片:
  linearGradient: 按场景选渐变
  radius: CARD (14)
  shadow: 对应GLOW
  padding: 16-20
```

### 10.2 按钮 (Button)

```
主按钮:
  background: PRIMARY (#00E5A0)
  fontColor: DEEP_BG (#0A0E1A)
  radius: PILL (26)
  height: 52
  shadow: PRIMARY GLOW

描边按钮:
  background: Transparent
  fontColor: PRIMARY
  borderWidth: 1
  borderColor: PRIMARY
  radius: PILL (15)
  height: 30

印章按钮:
  background: SEAL渐变
  fontColor: #FFF
  radius: PILL
  shadow: SEAL GLOW
```

### 10.3 徽章 (Badge)

```
类型徽章:
  fontSize: 11
  padding: { l:6 r:6 t:2 b:2 }
  radius: 4
  backgroundColor: 对应BADGE_BG
  fontColor: 对应BADGE_TEXT

状态徽章:
  同上，按status映射颜色

品牌徽章 (龟钮印信):
  backgroundColor: #C9404018
  fontColor: SEAL_RED
  radius: 4
```

### 10.4 输入框 (TextInput)

```
  backgroundColor: SURFACE (#1E2A4A)
  fontColor: TEXT_PRIMARY
  placeholderColor: TEXT_MUTED
  radius: LG (16)
  height: 50 (登录) / 44 (详情页)
```

### 10.5 分隔线 (Divider)

```
  height: 0.5
  backgroundColor: DIVIDER (#1C2E4A)
  margin: { l:16 r:16 }
```

### 10.6 分组标题 (Section Label)

```
  fontSize: 11
  letterSpacing: 2
  opacity: 0.8
  padding: { l:16 b:4 }
  fontColor: 按模块
    KOL服务 → PRIMARY (#00E5A0)
    AI能力 → ACCENT (#8B5CF6)
    商业服务 → GOLD (#F0B90B)
    存证存储 → SEAL_RED (#C94040)
    更多 → NEON_BLUE (#00D4FF)
```

---

## 十一、页面模板

### 11.1 列表页标准结构

```
Column {
  ┌─ 标题栏 ──────────────────────────────┐
  │ [页面标题]              [龟] ENGLISH   │
  └───────────────────────────────────────┘
  ┌─ 统计卡片 (可选) ─────────────────────┐
  │  统计1  │  统计2  │  统计3  │  统计4   │
  └───────────────────────────────────────┘
  ┌─ Tab/筛选 (可选) ─────────────────────┐
  │  全部  │  已完成  │  待执行             │
  └───────────────────────────────────────┘
  ┌─ 列表区 ─────────────────────────────┐
  │  Refresh > List > ForEach > Card      │
  └───────────────────────────────────────┘
}
背景: DEEP_BG
```

### 11.2 详情页标准结构

```
Column {
  ┌─ 导航栏 ──────────────────────────────┐
  │  < 返回    页面标题     [操作按钮]      │
  └───────────────────────────────────────┘
  ┌─ 主内容区 ─────────────────────────────┐
  │  Scroll > Column                       │
  │    Hero区 (品牌/车型/封面)              │
  │    统计行                               │
  │    存证追踪条 (如有trackId)             │
  │    表单/详情                            │
  │    操作按钮                             │
  └───────────────────────────────────────┘
}
背景: DEEP_BG
```

---

## 十二、跨平台一致性

### HarmonyOS (ArkTS) ↔ 小程序 (SCSS) 映射

| ArkTS | SCSS | 值 |
|-------|------|-----|
| `BrandPalette.PRIMARY` | `var(--primary)` | `#00E5A0` |
| `BrandPalette.SEAL_RED` | `var(--seal-red)` | `#C94040` |
| `BrandPalette.GOLD` | `var(--warning)` | `#F0B90B` |
| `BrandPalette.ACCENT` | `var(--info)` | `#8B5CF6` |
| `BrandPalette.NEON_BLUE` | `var(--neon-blue)` | `#00D4FF` |
| `BrandPalette.DEEP_BG` | `var(--deep-bg)` | `#0A0E1A` |
| `BrandPalette.CARD_BG` | `var(--card-bg)` | `#131929` |
| `BrandPalette.SURFACE` | `var(--surface)` | `#1E2A4A` |
| `BrandRadius.CARD` | `var(--radius-card)` | 14 / 28rpx |
| `BrandRadius.PILL` | `var(--radius-pill)` | 999 / 999rpx |

### 小程序端专属类名

| 类名 | 用途 | 对应ArkTS写法 |
|------|------|---------------|
| `.seal-badge` | 印章徽章 | `Text().backgroundColor(BrandSeal.SEAL_BG).fontColor(BrandSeal.SEAL_TEXT)` |
| `.seal-stamp` | 印章图 | Stack+Column+Text 组合 |
| `.btn-primary` | 主按钮 | `Button().backgroundColor(BrandPalette.PRIMARY)` |
| `.btn-seal` | 印章按钮 | `Button().linearGradient(SEAL_COLORS)` |
| `.btn-outline` | 描边按钮 | `Button().backgroundColor(Transparent).border()` |
| `.card` | 基础卡片 | `Column().backgroundColor(CARD_BG).borderRadius(CARD)` |
| `.card-gradient` | 渐变卡片 | `Column().linearGradient(VALUE_COLORS)` |
| `.card-seal` | 印章卡片 | `Column().linearGradient(SEAL_COLORS)` |
| `.hero-header` | Hero区 | `Column().linearGradient(HERO_COLORS)` |
| `.brand-separator` | 品牌分隔线 | Row + Column(width:24, height:1) + Text + Column |

---

## 十三、禁忌

| 禁止 | 原因 | 正确做法 |
|------|------|----------|
| 页面中使用 `$r()` 资源引用颜色 | 无法统一管控品牌色 | 使用 `BrandPalette.*` |
| 页面中硬编码 `#xxxxxx` | 绕过品牌系统 | 使用 `BrandPalette/BrandSeal/BrandBadge` |
| 使用 `any` / `as any` | ArkTS禁止 | 显式类型标注 |
| 使用亮色背景(白/浅灰) | 破坏暗色赛博风 | 使用 `DEEP_BG/CARD_BG/SURFACE` |
| 印章元素使用绿色/蓝色 | 印章必须朱砂红系 | 使用 `SEAL_RED/KNOB_*` |
| 金额使用绿色 | 金额统一金色 | 使用 `BrandPalette.GOLD` |
| 页面无品牌标识(龟/印) | 降低辨识度 | 标题栏加 `[龟]` + EN标识 |
| 首屏无渐变元素 | 视觉平淡 | Hero区/Card至少一处渐变 |
