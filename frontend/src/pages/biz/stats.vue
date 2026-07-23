<script setup lang="ts">
import { ref } from 'vue';

const stats = ref({
  totalViews: 125680,
  totalBookings: 892,
  totalRevenue: 45680,
  conversionRate: 7.1,
  topActivities: [
    { name: '小米SU7', views: 45600, bookings: 320, revenue: 16000 },
    { name: '比亚迪海豹', views: 38200, bookings: 280, revenue: 11200 },
    { name: '特斯拉Model Y', views: 41880, bookings: 292, revenue: 18480 },
  ],
});
</script>

<template>
  <view class="stats-page">
    <view class="header">
      <text class="title">数据统计</text>
    </view>

    <view class="overview">
      <view class="stat-card large">
        <text class="stat-value">¥{{ (stats.totalRevenue / 100).toFixed(0) }}</text>
        <text class="stat-label">总收益</text>
      </view>
      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-value">{{ stats.totalViews }}</text>
          <text class="stat-label">总浏览</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.totalBookings }}</text>
          <text class="stat-label">总预约</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ stats.conversionRate }}%</text>
          <text class="stat-label">转化率</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">活动排行</text>
      <view class="rank-list">
        <view v-for="(act, i) in stats.topActivities" :key="i" class="rank-item">
          <view class="rank-num">{{ i + 1 }}</view>
          <text class="rank-name">{{ act.name }}</text>
          <view class="rank-stats">
            <text>{{ act.views }}浏览</text>
            <text>{{ act.bookings }}预约</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.stats-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40rpx;
}

.header {
  padding: 30rpx;
  background: #fff;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
}

.overview {
  padding: 24rpx;
}

.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;

  &.large {
    margin-bottom: 16rpx;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
  }
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  opacity: 0.8;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.section {
  padding: 0 24rpx;
  margin-top: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.rank-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.rank-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.rank-num {
  width: 48rpx;
  height: 48rpx;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #2563eb;
  margin-right: 16rpx;
}

.rank-name {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.rank-stats {
  display: flex;
  gap: 16rpx;
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
