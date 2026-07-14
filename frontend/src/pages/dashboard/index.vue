  <script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { contentApi, aiApi } from '@/api';
import { useUserStore, useContentStore, useActivityStore } from '@/stores';

const userStore = useUserStore();
const contentStore = useContentStore();

const loading = ref(true);
const aiInsights = ref<{ type: string; title: string; detail: string }[]>([]);
const aiSummary = ref('');
const aiInsightLoading = ref(false);
const aiInsightLoaded = ref(false);

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  await loadContents();
  loadAIInsight();
});

async function loadContents() {
  loading.value = true;
  try {
    const res = await contentApi.userContents(userStore.userId);
    if (res.success) {
      contentStore.setContents(res.data);
    }
  } finally {
    loading.value = false;
  }
}

async function loadAIInsight() {
  if (aiInsightLoaded.value || !userStore.userId) return;
  aiInsightLoading.value = true;
  try {
    const res = await aiApi.insight({ userId: userStore.userId });
    if (res.success && res.data.insights) {
      aiInsights.value = res.data.insights;
      aiSummary.value = res.data.summary || '';
    }
  } catch (e) {
    // silent fail
  } finally {
    aiInsightLoading.value = false;
    aiInsightLoaded.value = true;
  }
}

function goToDetail(item: any) {
  uni.navigateTo({ url: `/pages/share/index?id=${item.id}` });
}

function goPublish() {
  uni.switchTab({ url: '/pages/activity/index' });
}
</script>

<template>
  <view class="dashboard-page">
    <!-- 用户头部 -->
    <view class="user-header">
      <view class="uh-left">
        <view class="uh-avatar">
          <image
            class="avatar-img"
            :src="userStore.userInfo?.avatarUrl || '/static/images/default-avatar.png'"
            mode="aspectFill"
          />
        </view>
        <view class="uh-info">
          <text class="uh-name">{{ userStore.userInfo?.nickName || '用户' }}</text>
          <text class="uh-role">🚗 推广员 · X402</text>
        </view>
      </view>
      <view class="uh-right">
        <button class="publish-mini-btn" @tap="goPublish">
          <text>➕</text>
        </button>
      </view>
    </view>

    <!-- 统计概览 -->
    <view class="stats-row">
      <view class="stats-card">
        <text class="st-value">{{ contentStore.myContents.length }}</text>
        <text class="st-label">发布内容</text>
      </view>
      <view class="stats-card">
        <text class="st-value">{{ contentStore.myContents.reduce((s: number, c: any) => s + (c.stats?.views || 0), 0) }}</text>
        <text class="st-label">总阅读</text>
      </view>
      <view class="stats-card">
        <text class="st-value accent">{{ contentStore.myContents.reduce((s: number, c: any) => s + (c.stats?.bookings || 0), 0) }}</text>
        <text class="st-label">总预约</text>
      </view>
      <view class="stats-card">
        <text class="st-value gold">¥{{ contentStore.myContents.reduce((s: number, c: any) => s + (c.stats?.estimatedEarnings || 0), 0).toFixed(2) }}</text>
        <text class="st-label">总收益</text>
      </view>
    </view>

    <!-- AI 洞察 -->
    <view v-if="aiInsightLoading" class="ai-insight-section">
      <view class="ai-insight-loading">
        <text>✨ AI 洞察分析中...</text>
      </view>
    </view>
    <view v-else-if="aiInsights.length > 0" class="ai-insight-section">
      <view class="ai-insight-header">
        <text class="ai-insight-title">✨ AI 数据洞察</text>
        <text class="ai-insight-badge">NEW</text>
      </view>
      <text v-if="aiSummary" class="ai-insight-summary">{{ aiSummary }}</text>
      <view v-for="(insight, i) in aiInsights" :key="i" class="ai-insight-card">
        <view class="aic-icon-wrap">
          <text class="aic-icon">{{ insight.type === 'timing' ? '⏰' : insight.type === 'content' ? '📝' : '🎯' }}</text>
        </view>
        <view class="aic-body">
          <text class="aic-title">{{ insight.title }}</text>
          <text class="aic-detail">{{ insight.detail }}</text>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空态 -->
    <view v-else-if="contentStore.myContents.length === 0" class="empty-state">
      <text class="empty-icon">📝</text>
      <text class="empty-text">还没有发布过内容</text>
      <text class="empty-hint">去活动页选择一个推广活动开始发布吧</text>
      <button class="empty-btn" @tap="goPublish">去发布</button>
    </view>

    <!-- 内容列表 -->
    <view v-else class="content-list">
      <view class="list-header">
        <text class="list-title">我的内容</text>
      </view>

      <view v-for="item in contentStore.myContents" :key="item.id" class="content-card" @tap="goToDetail(item)">
        <view class="cc-top">
          <view class="cc-tags">
            <text class="cc-tag">{{ item.carModel || '车型' }}</text>
            <text class="cc-time">{{ (item.createdAt || '').slice(0, 10) }}</text>
          </view>
          <text class="cc-arrow">›</text>
        </view>

        <text class="cc-text">{{ (item.text || '').slice(0, 80) }}{{ (item.text || '').length > 80 ? '...' : '' }}</text>

        <view v-if="item.images?.length" class="cc-images">
          <image
            v-for="(img, i) in item.images.slice(0, 3)"
            :key="i"
            :src="img"
            mode="aspectFill"
            class="cc-thumb"
          />
          <text v-if="item.images.length > 3" class="cc-more">+{{ item.images.length - 3 }}</text>
        </view>

        <view class="cc-stats">
          <view class="cc-stat">
            <text class="cs-num">{{ item.stats?.views || 0 }}</text>
            <text class="cs-lbl">阅读</text>
          </view>
          <view class="cc-stat">
            <text class="cs-num">{{ item.stats?.bookings || 0 }}</text>
            <text class="cs-lbl">预约</text>
          </view>
          <view class="cc-stat accent">
            <text class="cs-num">¥{{ (item.stats?.estimatedEarnings || 0).toFixed(2) }}</text>
            <text class="cs-lbl">收益</text>
          </view>
          <view class="cc-stat">
            <text class="cs-num track">{{ item.trackId }}</text>
            <text class="cs-lbl">追踪码</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.dashboard-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 40rpx;
  background: #f0f2f5;
}

/* User Header */
.user-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.uh-left {
  display: flex;
  align-items: center;
}

.uh-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #e5e7eb;
  margin-right: 20rpx;
  border: 3rpx solid #dbeafe;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.uh-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.uh-role {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

.publish-mini-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  font-size: 36rpx;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 50%;
  box-shadow: 0 2rpx 12rpx rgba(37, 99, 235, 0.25);

  &::after { border: none; }
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.stats-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 8rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03);
}

.st-value {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4rpx;

  &.accent { color: #2563eb; }
  &.gold { color: #d97706; }
}

.st-label {
  font-size: 20rpx;
  color: #9ca3af;
}

/* AI Insight */
.ai-insight-section {
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #f0fdf4;
  border: 2rpx solid #bbf7d0;
  border-radius: 20rpx;
}

.ai-insight-loading {
  padding: 16rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #9ca3af;
}

.ai-insight-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.ai-insight-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #166534;
}

.ai-insight-badge {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 8rpx;
}

.ai-insight-summary {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.ai-insight-card {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #dcfce7;

  &:last-child { border-bottom: none; }
}

.aic-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: #ecfdf5;
  flex-shrink: 0;
}

.aic-icon { font-size: 28rpx; }

.aic-body { flex: 1; }

.aic-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4rpx;
}

.aic-detail {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
}

/* Loading & Empty */
.loading-state {
  text-align: center;
  padding: 100rpx 0;
}

.loading-text { font-size: 28rpx; color: #9ca3af; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 30rpx; color: #6b7280; margin-bottom: 8rpx; }
.empty-hint { font-size: 26rpx; color: #d1d5db; margin-bottom: 40rpx; text-align: center; }

.empty-btn {
  padding: 20rpx 60rpx;
  font-size: 30rpx;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.25);

  &::after { border: none; }
}

/* Content List */
.content-list { }

.list-header {
  margin-bottom: 16rpx;
}

.list-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
}

.content-card {
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.cc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.cc-tags {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.cc-tag {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 8rpx;
}

.cc-time {
  font-size: 22rpx;
  color: #d1d5db;
}

.cc-arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.cc-text {
  display: block;
  font-size: 28rpx;
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.cc-images {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}

.cc-thumb {
  width: 200rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #e5e7eb;
}

.cc-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 140rpx;
  font-size: 32rpx;
  color: #9ca3af;
  background: #f3f4f6;
  border-radius: 12rpx;
}

.cc-stats {
  display: flex;
  gap: 8rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f3f4f6;
}

.cc-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.accent .cs-num { color: #d97706; }
}

.cs-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2937;

  &.track {
    font-size: 18rpx;
    color: #d1d5db;
    font-weight: 400;
  }
}

.cs-lbl {
  font-size: 20rpx;
  color: #9ca3af;
  margin-top: 2rpx;
}
</style>
