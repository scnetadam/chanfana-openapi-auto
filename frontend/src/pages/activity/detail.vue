  <script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useActivityStore } from '@/stores';

const activityStore = useActivityStore();
const activity = ref<any>(null);

onLoad(() => {
  activity.value = activityStore.currentActivity;
  if (!activity.value) {
    uni.showToast({ title: '活动不存在', icon: 'none' });
    uni.navigateBack();
  }
});

function goPublish() {
  uni.navigateTo({ url: '/pages/publish/index' });
}

function shareActivity() {
  uni.showActionSheet({
    itemList: ['复制活动链接', '保存活动海报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.setClipboardData({ data: `https://x402.app/activity/${activity.value?.id}`, showToast: true });
      }
    },
  });
}
</script>

<template>
  <view class="detail-page" v-if="activity">
    <!-- 头部 -->
    <view class="header">
      <view class="header-cover">
        <view class="hc-label">{{ activity.brand }}</view>
        <text class="hc-model">{{ activity.model }}</text>
        <view class="hc-badge" v-if="activity.status === 'active'">进行中</view>
      </view>
      <view class="header-info">
        <text class="hi-title">{{ activity.title }}</text>
        <text class="hi-desc">{{ activity.description }}</text>
      </view>
    </view>

    <!-- 奖励规则 -->
    <view class="section-card">
      <view class="section-title-row">
        <text class="section-title">💰 奖励规则</text>
      </view>

      <view class="reward-item">
        <view class="ri-icon-wrap blue"><text>👁️</text></view>
        <view class="ri-info">
          <text class="ri-label">阅读/浏览</text>
          <text class="ri-desc">好友点开你的内容即可获得</text>
        </view>
        <text class="ri-amount">¥{{ activity.rewardPerView }}</text>
      </view>

      <view class="reward-item">
        <view class="ri-icon-wrap gold"><text>📋</text></view>
        <view class="ri-info">
          <text class="ri-label">试驾预约 <text class="ri-hot">🔥 高收益</text></text>
          <text class="ri-desc">用户通过你的链接预约试驾</text>
        </view>
        <text class="ri-amount accent">¥{{ activity.rewardPerBooking }}</text>
      </view>
    </view>

    <!-- 参与方式 -->
    <view class="section-card">
      <view class="section-title-row">
        <text class="section-title">📝 参与方式</text>
      </view>
      <view class="step-list">
        <view class="step-item">
          <view class="step-num">1</view>
          <view class="step-body">
            <text class="step-title">发布用车体验</text>
            <text class="step-desc">从活动页进入，发布真实用车感受，系统自动生成追踪海报</text>
          </view>
        </view>
        <view class="step-item">
          <view class="step-num">2</view>
          <view class="step-body">
            <text class="step-title">分享到微信</text>
            <text class="step-desc">发到朋友圈、微信群，好友点击链接即算阅读 ¥0.01</text>
          </view>
        </view>
        <view class="step-item">
          <view class="step-num">3</view>
          <view class="step-body">
            <text class="step-title">好友试驾你获奖</text>
            <text class="step-desc">好友通过你的链接预约并完成试驾，你获得 ¥{{ activity.rewardPerBooking }} 推广金</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 活动信息 -->
    <view class="section-card meta">
      <view class="meta-row">
        <text class="meta-key">活动周期</text>
        <text class="meta-val">{{ activity.startDate }} ~ {{ activity.endDate }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-key">预算总额</text>
        <text class="meta-val">¥{{ activity.totalBudget?.toLocaleString() }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-key">已消耗</text>
        <text class="meta-val accent">{{ ((activity.usedBudget / activity.totalBudget) * 100).toFixed(1) }}%</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="action-bar">
      <button class="action-btn" @tap="goPublish">
        <text class="ab-icon">📝</text>
        <text>我要参与 · 发布内容</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  padding-bottom: 160rpx;
  background: #f0f2f5;
}

/* Header */
.header-cover {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320rpx;
  background: linear-gradient(135deg, #1e40af, #3b82f6, #60a5fa);
  color: #fff;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: -80rpx;
    right: -60rpx;
    width: 400rpx;
    height: 400rpx;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }
}

.hc-label {
  position: absolute;
  top: 24rpx;
  left: 30rpx;
  padding: 6rpx 18rpx;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(4px);
  border-radius: 20rpx;
  font-size: 24rpx;
  z-index: 1;
}

.hc-model {
  font-size: 80rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  text-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15);
  z-index: 1;
}

.hc-badge {
  position: absolute;
  bottom: 24rpx;
  right: 30rpx;
  padding: 6rpx 20rpx;
  background: rgba(16, 185, 129, 0.8);
  border-radius: 20rpx;
  font-size: 22rpx;
  z-index: 1;
}

.header-info {
  padding: 30rpx;
  background: #fff;
  margin: 0 0 20rpx 0;
}

.hi-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 10rpx;
}

.hi-desc {
  display: block;
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.6;
}

/* Section Card */
.section-card {
  margin: 0 24rpx 20rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.section-title-row {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.reward-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child { border-bottom: none; }
}

.ri-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  margin-right: 20rpx;

  &.blue { background: #eff6ff; }
  &.gold { background: #fefce8; }
}

.ri-info { flex: 1; }

.ri-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.ri-hot {
  font-size: 22rpx;
  color: #d97706;
  background: #fef3c7;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  margin-left: 8rpx;
}

.ri-desc {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

.ri-amount {
  font-size: 36rpx;
  font-weight: 700;
  color: #6b7280;

  &.accent { color: #d97706; }
}

/* Steps */
.step-list { padding: 0; }

.step-item {
  display: flex;
  margin-bottom: 28rpx;

  &:last-child { margin-bottom: 0; }
}

.step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  min-width: 48rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 50%;
  margin-right: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.25);
}

.step-body { flex: 1; }

.step-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6rpx;
}

.step-desc {
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* Meta */
.meta {
  .meta-row {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    border-bottom: 2rpx solid #f3f4f6;

    &:last-child { border-bottom: none; }
  }

  .meta-key { font-size: 28rpx; color: #6b7280; }
  .meta-val { font-size: 28rpx; font-weight: 600; color: #1f2937; }
  .meta-val.accent { color: #d97706; }
}

/* Action Bar */
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(0,0,0,0.05);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 48rpx;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.3);

  &::after { border: none; }

  .ab-icon { font-size: 32rpx; }
}
</style>
