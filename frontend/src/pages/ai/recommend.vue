<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { aiApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const recommendations = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  await loadRecommendations();
});

async function loadRecommendations() {
  if (!userStore.userId) return;
  loading.value = true;
  try {
    const res = await aiApi.recommend({ userId: userStore.userId });
    if (res.success) {
      recommendations.value = res.data.recommendations || [];
    }
  } catch (e) {
    console.error('[AI Recommend] error:', e);
  } finally {
    loading.value = false;
  }
}

function goToActivity(activity: any) {
  uni.navigateTo({ url: `/pages/activity/detail?id=${activity.id}` });
}
</script>

<template>
  <view class="recommend-page">
    <view class="header">
      <text class="title">🎯 智能推荐</text>
      <text class="subtitle">活动KOL智能匹配</text>
    </view>

    <view v-if="loading" class="loading">
      <text>匹配中...</text>
    </view>

    <view v-else class="recommend-list">
      <view v-for="(rec, i) in recommendations" :key="i" class="recommend-card">
        <view class="rec-header">
          <text class="rec-brand">{{ rec.activity?.brand }}</text>
          <text class="rec-model">{{ rec.activity?.model }}</text>
        </view>
        <text class="rec-reason">{{ rec.reason }}</text>
        <view class="rec-footer">
          <view class="confidence">
            <text class="confidence-label">匹配度</text>
            <text class="confidence-value">{{ (rec.confidence * 100).toFixed(0) }}%</text>
          </view>
          <button class="rec-btn" @tap="goToActivity(rec.activity)">查看活动</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.recommend-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #f59e0b, #d97706);
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

.recommend-list {
  padding: 24rpx;
}

.recommend-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.rec-brand {
  padding: 6rpx 16rpx;
  background: #fef3c7;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #d97706;
}

.rec-model {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.rec-reason {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.rec-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.confidence {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.confidence-label {
  font-size: 24rpx;
  color: #9ca3af;
}

.confidence-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #f59e0b;
}

.rec-btn {
  padding: 0 24rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-radius: 32rpx;

  &::after {
    border: none;
  }
}
</style>
