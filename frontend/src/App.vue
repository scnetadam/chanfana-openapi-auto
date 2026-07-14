<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('[龟钮印信] App Launch');
});
onShow(() => {
  console.log('[龟钮印信] App Show');
});
onHide(() => {
  console.log('[龟钮印信] App Hide');
});
</script>

<template>
  <view></view>
</template>

<style>
/* ============================
   龟钮印信 全局样式
   品牌色: #10b981 翡翠绿（汽车环保·活力感）
   点缀色: #2563eb 科技蓝
   背景色: #f0f2f5
   ============================ */

:root,
page {
  --gn-primary: #10b981;
  --gn-primary-dark: #059669;
  --gn-primary-light: #ecfdf5;
  --gn-accent: #2563eb;
  --gn-accent-light: #fefce8;
  --gn-success: #10b981;
  --gn-success-light: #ecfdf5;
  --gn-danger: #ef4444;
  --gn-warning: #f59e0b;

  --gn-text: #1f2937;
  --gn-text-secondary: #6b7280;
  --gn-text-tertiary: #9ca3af;

  --gn-bg: #f0f2f5;
  --gn-card: #ffffff;
  --gn-bg-muted: #f9fafb;
  --gn-border: #e5e7eb;
  --gn-border-light: #f3f4f6;
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.3s ease-out; }
</style>