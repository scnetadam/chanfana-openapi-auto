<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { initErrorMonitor } from '@/utils/errorMonitor';

onLaunch(() => {
  console.log('[龟钮自驭] App Launch');
  initErrorMonitor();
});
onShow(() => {
  console.log('[龟钮自驭] App Show');
});
onHide(() => {
  console.log('[龟钮自驭] App Hide');
});
</script>

<template>
  <view></view>
</template>

<style>
/* ============================
   龟钮自驭 全局样式
   主色: #0A1628 玄青（科技深邃·龟甲厚重）
   辅色: #C9A84C 赤金（价值流转·印章金光）
   强调: #00E5A0 翡翠绿（活力·可信）
   背景色: #0A0E1A
   ============================ */

:root,
page {
  --gn-primary: #0A1628;
  --gn-primary-dark: #060D18;
  --gn-primary-light: #1A2D4A;
  --gn-primary-bg: #0A162810;
  
  --gn-accent: #C9A84C;
  --gn-accent-dark: #A88A3A;
  --gn-accent-light: #2D2510;
  
  --gn-success: #10b981;
  --gn-warning: #f59e0b;
  --gn-danger: #ef4444;
  --gn-info: #8b5cf6;

  --gn-text: #1f2937;
  --gn-text-secondary: #6b7280;
  --gn-text-tertiary: #9ca3af;
  --gn-text-light: #d1d5db;

  --gn-bg: #f0f2f5;
  --gn-card: #ffffff;
  --gn-bg-muted: #f9fafb;
  --gn-bg-tertiary: #f3f4f6;
  
  --gn-border: #e5e7eb;
  --gn-border-light: #f3f4f6;
  
  --gn-shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  --gn-shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  --gn-shadow-lg: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  
  --gn-radius-sm: 8rpx;
  --gn-radius-md: 16rpx;
  --gn-radius-lg: 24rpx;
  --gn-radius-xl: 32rpx;
}

page {
  background-color: var(--gn-bg);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  color: var(--gn-text);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  font-size: 28rpx;
}

view, scroll-view, swiper { box-sizing: border-box; }

button { margin: 0; padding: 0; font-size: inherit; border: none; background: transparent; }
button::after { border: none; }

input, textarea { font-size: inherit; color: inherit; outline: none; }

::-webkit-scrollbar { width: 0; height: 0; }

.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

.divider { height: 2rpx; background: var(--gn-border-light); margin: 0; }

.text-primary { color: var(--gn-primary); }
.text-accent { color: var(--gn-accent); }
.text-success { color: var(--gn-success); }
.text-warning { color: var(--gn-warning); }
.text-danger { color: var(--gn-danger); }

.bg-primary { background-color: var(--gn-primary); }
.bg-accent { background-color: var(--gn-accent); }
.bg-card { background-color: var(--gn-card); }

.card {
  background: var(--gn-card);
  border-radius: var(--gn-radius-lg);
  box-shadow: var(--gn-shadow-sm);
  padding: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--gn-text);
  margin-bottom: 20rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--gn-text-secondary);
  margin-bottom: 10rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: var(--gn-text-tertiary);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.3s ease-out; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(40rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.slide-up { animation: slideUp 0.4s ease-out; }
</style>