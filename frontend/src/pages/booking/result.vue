  <script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
const bookingId = ref('');

onLoad((query) => {
  bookingId.value = query.id || '';
});

function goHome() {
  uni.switchTab({ url: '/pages/activity/index' });
}

function goDashboard() {
  uni.switchTab({ url: '/pages/dashboard/index' });
}
</script>

<template>
  <view class="result-page">
    <view class="result-card">
      <view class="success-circle">
        <view class="check-mark">✓</view>
      </view>

      <text class="result-title">预约成功 🎉</text>
      <text class="result-desc">您的试驾申请已提交，4S店顾问将在24小时内与您联系</text>

      <view class="info-card">
        <view class="info-row">
          <text class="info-key">预约编号</text>
          <text class="info-val">{{ bookingId || 'X402' + Date.now().toString().slice(-6) }}</text>
        </view>
        <view class="info-row">
          <text class="info-key">预计联系</text>
          <text class="info-val">24小时内</text>
        </view>
        <view class="info-row">
          <text class="info-key">服务提醒</text>
          <text class="info-val accent">关注微信消息通知</text>
        </view>
      </view>

      <!-- 推荐行动 -->
      <view class="action-tips">
        <text class="at-title">💡 接下来可以</text>
        <view class="at-item" @tap="goHome">
          <text class="at-icon">🚗</text>
          <view class="at-info">
            <text class="at-name">查看更多推广活动</text>
            <text class="at-desc">选感兴趣的车，发布体验赚推广金</text>
          </view>
          <text class="at-arrow">›</text>
        </view>
        <view class="at-item" @tap="goDashboard">
          <text class="at-icon">📊</text>
          <view class="at-info">
            <text class="at-name">查看我的内容</text>
            <text class="at-desc">管理发布内容，追踪传播收益</text>
          </view>
          <text class="at-arrow">›</text>
        </view>
      </view>

      <view class="bottom-actions">
        <button class="ba-btn primary" @tap="goHome">返回首页</button>
        <button class="ba-btn outline" @tap="goDashboard">我的内容</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.result-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40rpx 24rpx;
  background: linear-gradient(135deg, #f0f9ff, #ecfdf5);
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600rpx;
  padding: 60rpx 36rpx 40rpx;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 48rpx rgba(0, 0, 0, 0.06);
}

.success-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  height: 140rpx;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 50%;
  margin-bottom: 28rpx;
  box-shadow: 0 4rpx 24rpx rgba(16, 185, 129, 0.3);
}

.check-mark {
  font-size: 72rpx;
  color: #fff;
  font-weight: 700;
}

.result-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12rpx;
}

.result-desc {
  font-size: 26rpx;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.info-card {
  width: 100%;
  padding: 24rpx;
  background: #f9fafb;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child { border-bottom: none; }
}

.info-key {
  font-size: 26rpx;
  color: #6b7280;
}

.info-val {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;

  &.accent { color: #2563eb; }
}

.action-tips {
  width: 100%;
  margin-bottom: 32rpx;
}

.at-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.at-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f9fafb;
  border-radius: 14rpx;
  margin-bottom: 12rpx;
}

.at-icon {
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 32rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-right: 16rpx;
}

.at-info {
  flex: 1;
}

.at-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4rpx;
}

.at-desc {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
}

.at-arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.bottom-actions {
  display: flex;
  gap: 16rpx;
  width: 100%;
}

.ba-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 40rpx;

  &.primary {
    color: #fff;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.25);
  }

  &.outline {
    color: #2563eb;
    background: #eff6ff;
  }

  &::after { border: none; }
}
</style>
