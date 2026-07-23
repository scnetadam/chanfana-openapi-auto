<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { aiApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const loading = ref(false);
const result = ref<any>(null);

const form = ref({
  contentId: '',
  conversionType: 'view',
});

onLoad(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  if (!userStore.userId) return;
  try {
    const res = await aiApi.valueDashboard(userStore.userId);
    if (res.success) {
      result.value = res.data;
    }
  } catch (e) {
    console.error('[AI Value] error:', e);
  }
}

async function handleAssess() {
  if (!form.value.contentId) {
    uni.showToast({ title: '请输入内容ID', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const res = await aiApi.valueAssess({
      contentId: form.value.contentId,
      conversionType: form.value.conversionType,
      userId: userStore.userId,
    });

    if (res.success) {
      result.value = res.data;
    }
  } catch (e) {
    uni.showToast({ title: '评估失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="value-page">
    <view class="header">
      <text class="title">📊 价值评估</text>
      <text class="subtitle">KOL内容价值分析</text>
    </view>

    <view v-if="result" class="dashboard">
      <view class="overview-card">
        <text class="overview-value">¥{{ (result.totalEarned || 0).toFixed(2) }}</text>
        <text class="overview-label">总收益</text>
      </view>

      <view class="metrics-grid">
        <view class="metric-item">
          <text class="metric-value">{{ result.contentCount || 0 }}</text>
          <text class="metric-label">内容数</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ (result.avgWeightMultiplier || 0).toFixed(1) }}</text>
          <text class="metric-label">平均权重</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ (result.kolScore || 0).toFixed(1) }}</text>
          <text class="metric-label">KOL评分</text>
        </view>
      </view>

      <view class="breakdown">
        <text class="breakdown-title">价值构成</text>
        <view class="breakdown-item">
          <text class="breakdown-label">质量分</text>
          <view class="breakdown-bar">
            <view class="breakdown-fill" :style="{ width: ((result.breakdown?.quality || 0) / 10 * 100) + '%' }"></view>
          </view>
          <text class="breakdown-value">{{ (result.breakdown?.quality || 0).toFixed(1) }}</text>
        </view>
        <view class="breakdown-item">
          <text class="breakdown-label">传播分</text>
          <view class="breakdown-bar">
            <view class="breakdown-fill" :style="{ width: ((result.breakdown?.spread || 0) / 10 * 100) + '%' }"></view>
          </view>
          <text class="breakdown-value">{{ (result.breakdown?.spread || 0).toFixed(1) }}</text>
        </view>
        <view class="breakdown-item">
          <text class="breakdown-label">KOL分</text>
          <view class="breakdown-bar">
            <view class="breakdown-fill" :style="{ width: ((result.breakdown?.kol || 0) / 10 * 100) + '%' }"></view>
          </view>
          <text class="breakdown-value">{{ (result.breakdown?.kol || 0).toFixed(1) }}</text>
        </view>
        <view class="breakdown-item">
          <text class="breakdown-label">转化分</text>
          <view class="breakdown-bar">
            <view class="breakdown-fill" :style="{ width: ((result.breakdown?.conversion || 0) / 10 * 100) + '%' }"></view>
          </view>
          <text class="breakdown-value">{{ (result.breakdown?.conversion || 0).toFixed(1) }}</text>
        </view>
      </view>
    </view>

    <view class="assess-section">
      <text class="section-title">评估单个内容</text>
      <view class="form-group">
        <text class="form-label">内容ID</text>
        <input
          v-model="form.contentId"
          class="form-input"
          placeholder="请输入内容ID"
        />
      </view>
      <button
        class="assess-btn"
        :loading="loading"
        :disabled="loading"
        @tap="handleAssess"
      >
        开始评估
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.value-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40rpx;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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

.dashboard {
  padding: 24rpx;
}

.overview-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.overview-value {
  font-size: 64rpx;
  font-weight: 700;
  color: #8b5cf6;
  margin-bottom: 8rpx;
}

.overview-label {
  font-size: 26rpx;
  color: #6b7280;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.metric-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.metric-label {
  font-size: 22rpx;
  color: #6b7280;
}

.breakdown {
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
}

.breakdown-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.breakdown-item {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.breakdown-label {
  width: 120rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.breakdown-bar {
  flex: 1;
  height: 8rpx;
  background: #f3f4f6;
  border-radius: 4rpx;
  margin: 0 16rpx;
}

.breakdown-fill {
  height: 100%;
  background: #8b5cf6;
  border-radius: 4rpx;
}

.breakdown-value {
  width: 60rpx;
  text-align: right;
  font-size: 24rpx;
  color: #1f2937;
}

.assess-section {
  padding: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.assess-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-radius: 48rpx;

  &::after {
    border: none;
  }
}
</style>
