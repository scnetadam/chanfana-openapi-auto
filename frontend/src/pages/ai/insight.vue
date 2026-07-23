<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { aiApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const insights = ref<any[]>([]);
const summary = ref('');
const loading = ref(true);

onMounted(async () => {
  await loadInsights();
});

async function loadInsights() {
  if (!userStore.userId) return;
  loading.value = true;
  try {
    const res = await aiApi.insight({ userId: userStore.userId });
    if (res.success) {
      insights.value = res.data.insights || [];
      summary.value = res.data.summary || '';
    }
  } catch (e) {
    console.error('[AI Insight] error:', e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="insight-page">
    <view class="header">
      <text class="title">📈 数据洞察</text>
      <text class="subtitle">推广趋势智能分析</text>
    </view>

    <view v-if="loading" class="loading">
      <text>分析中...</text>
    </view>

    <view v-else class="content">
      <view v-if="summary" class="summary-card">
        <text class="summary-icon">💡</text>
        <text class="summary-text">{{ summary }}</text>
      </view>

      <view class="insights-list">
        <view v-for="(item, i) in insights" :key="i" class="insight-item">
          <view class="insight-type">{{ item.type }}</view>
          <text class="insight-title">{{ item.title }}</text>
          <text class="insight-detail">{{ item.detail }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.insight-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: #fff;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 26rpx;
  opacity: 0.9;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx;
  color: #9ca3af;
}

.content {
  padding: 24rpx;
}

.summary-card {
  display: flex;
  gap: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.summary-icon {
  font-size: 40rpx;
}

.summary-text {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.6;
}

.insights-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.insight-item {
  padding: 30rpx;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.insight-type {
  display: inline-block;
  padding: 6rpx 16rpx;
  margin-bottom: 12rpx;
  background: #eff6ff;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #2563eb;
}

.insight-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.insight-detail {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.6;
}
</style>
