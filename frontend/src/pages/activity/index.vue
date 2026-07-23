<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { activityApi, aiApi } from '@/api';
import { useActivityStore } from '@/stores';
import { useUserStore } from '@/stores';

const activityStore = useActivityStore();
const userStore = useUserStore();

const loading = ref(true);
const refreshing = ref(false);
const aiRecommendations = ref<any[]>([]);
const aiRecommendLoading = ref(false);
const aiRecommendLoaded = ref(false);

const banners = ref([
  {
    id: 1,
    title: '新人专享福利',
    desc: '首次发布内容即送10元推广金',
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    icon: '🎁',
    action: '/pages/publish/index',
  },
  {
    id: 2,
    title: 'KOL招募计划',
    desc: '成为认证KOL，享受专属权益',
    bg: 'linear-gradient(135deg, #f093fb, #f5576c)',
    icon: '⭐',
    action: '/pages/koltask/index',
  },
  {
    id: 3,
    title: 'AI智能创作',
    desc: '一键生成专业汽车评测文案',
    bg: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    icon: '🤖',
    action: '/pages/publish/index',
  },
]);

onShow(async () => {
  await checkLogin();
  await loadActivities();
  loadAIRecommend();
});

async function checkLogin() {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return false;
  }
  return true;
}

async function loadActivities() {
  loading.value = true;
  try {
    const res = await activityApi.list();
    if (res.success) {
      activityStore.setActivities(res.data);
    }
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function loadAIRecommend() {
  if (aiRecommendLoaded.value || !userStore.userId) return;
  aiRecommendLoading.value = true;
  try {
    const res = await aiApi.recommend({ userId: userStore.userId });
    if (res.success && res.data.recommendations) {
      aiRecommendations.value = res.data.recommendations;
    }
  } catch (e) {
    // silent fail
  } finally {
    aiRecommendLoading.value = false;
    aiRecommendLoaded.value = true;
  }
}

function onRefresh() {
  refreshing.value = true;
  loadActivities();
  aiRecommendLoaded.value = false;
  loadAIRecommend();
}

function goToDetail(act: any) {
  activityStore.setCurrent(act);
  uni.navigateTo({ url: `/pages/activity/detail?id=${act.id}` });
}

function getBudgetPercent(act: any) {
  return Math.min(100, ((act.usedBudget || 0) / (act.totalBudget || 1)) * 100);
}

function getBudgetColor(pct: number) {
  if (pct > 80) return '#ef4444';
  if (pct > 50) return '#f59e0b';
  return '#10b981';
}

function handleBannerTap(banner: any) {
  if (banner.action) {
    uni.navigateTo({ url: banner.action });
  }
}
</script>

<template>
  <view class="activity-page">
    <view class="hero">
      <view class="hero-content">
        <text class="hero-title">🚗 汽车资讯</text>
        <text class="hero-desc">执信购万物，分享真实体验让每次传播产生价值</text>
      </view>
      <view class="hero-illustration">
        <text class="hero-emoji">🏎️</text>
      </view>
    </view>

    <view class="quick-entry">
      <view class="entry-item" @tap="() => uni.navigateTo({ url: '/pages/biz/index' })">
        <view class="entry-icon" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
          <text>🏢</text>
        </view>
        <text class="entry-text">商家后台</text>
      </view>
      <view class="entry-item" @tap="() => uni.navigateTo({ url: '/pages/ai/index' })">
        <view class="entry-icon" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
          <text>🤖</text>
        </view>
        <text class="entry-text">AI应用</text>
      </view>
      <view class="entry-item" @tap="() => uni.navigateTo({ url: '/pages/aivideo/index' })">
        <view class="entry-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">
          <text>🎬</text>
        </view>
        <text class="entry-text">AI视频</text>
      </view>
      <view class="entry-item" @tap="() => uni.navigateTo({ url: '/pages/publish/index' })">
        <view class="entry-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
          <text>📝</text>
        </view>
        <text class="entry-text">发布内容</text>
      </view>
    </view>

    <view class="banner-section">
      <swiper
        class="banner-swiper"
        indicator-dots
        autoplay
        circular
        interval="4000"
        duration="500"
        indicator-color="rgba(255,255,255,0.5)"
        indicator-active-color="#fff"
      >
        <swiper-item v-for="banner in banners" :key="banner.id" @tap="handleBannerTap(banner)">
          <view class="banner-item" :style="{ background: banner.bg }">
            <view class="banner-content">
              <text class="banner-icon">{{ banner.icon }}</text>
              <view class="banner-text">
                <text class="banner-title">{{ banner.title }}</text>
                <text class="banner-desc">{{ banner.desc }}</text>
              </view>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view v-if="loading" class="skeleton-list">
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="sk-cover"></view>
        <view class="sk-body">
          <view class="sk-line w-60"></view>
          <view class="sk-line w-90"></view>
          <view class="sk-line w-40"></view>
        </view>
      </view>
    </view>

    <!-- AI 推荐 -->
    <view v-if="!loading && aiRecommendations.length > 0" class="ai-recommend-section">
      <view class="ai-rec-header">
        <text class="ai-rec-title">✨ AI 为你推荐</text>
        <text class="ai-rec-sub">基于你的推广表现智能匹配</text>
      </view>
      <view
        v-for="rec in aiRecommendations"
        :key="rec.activityId"
        class="ai-rec-card"
        @tap="goToDetail(rec.activity)"
        hover-class="card-hover"
      >
        <view class="arc-top">
          <view class="arc-brand-tag">{{ rec.activity?.brand }}</view>
          <text class="arc-model">{{ rec.activity?.model }}</text>
        </view>
        <text class="arc-reason">{{ rec.reason }}</text>
        <view class="arc-footer">
          <text class="arc-reward">试驾¥{{ rec.activity?.rewardPerBooking }}</text>
          <text class="arc-go">立即参与 ›</text>
        </view>
      </view>
    </view>

    <view v-else-if="!loading && aiRecommendLoading" class="ai-recommend-section">
      <view class="ai-rec-loading">
        <text>✨ AI 推荐生成中...</text>
      </view>
    </view>

    <template v-else>
      <view
        v-for="act in activityStore.list"
        :key="act.id"
        class="activity-card"
        @tap="goToDetail(act)"
        hover-class="card-hover"
      >
        <view class="card-cover" style="background:linear-gradient(135deg,#1e40af,#3b82f6)">
          <view class="cover-badge">{{ act.brand }}</view>
          <text class="cover-model">{{ act.model }}</text>
          <view class="cover-status" :class="act.status === 'ending' ? 'hot' : ''">
            {{ act.status === 'ending' ? '🔥 即将结束' : '进行中' }}
          </view>
        </view>

        <view class="card-body">
          <text class="card-title">{{ act.title }}</text>
          <text class="card-desc">{{ act.description }}</text>

          <view class="reward-row">
            <view class="reward-tag view">
              <text class="rt-icon">👁️</text>
              <text class="rt-label">阅读</text>
              <text class="rt-value">¥{{ act.rewardPerView }}</text>
            </view>
            <view class="reward-tag booking">
              <text class="rt-icon">📋</text>
              <text class="rt-label">试驾预约</text>
              <text class="rt-value">¥{{ act.rewardPerBooking }}</text>
            </view>
          </view>

          <view class="budget-row">
            <text class="budget-label">预算池</text>
            <view class="budget-bar">
              <view
                class="budget-fill"
                :style="{
                  width: getBudgetPercent(act) + '%',
                  backgroundColor: getBudgetColor(getBudgetPercent(act))
                }"
              />
            </view>
            <text class="budget-text" :style="{ color: getBudgetColor(getBudgetPercent(act)) }">
              {{ getBudgetPercent(act).toFixed(0) }}%
            </text>
          </view>
        </view>

        <view class="card-footer">
          <text class="participate-btn">立即参与 ›</text>
        </view>
      </view>
    </template>

    <view v-if="!loading && activityStore.list.length === 0" class="empty-state">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无推广活动</text>
      <text class="empty-hint">敬请期待</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.activity-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background: #f0f2f5;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #060D18, #0A1628, #1A2D4A);
  color: #fff;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: -60rpx;
    right: -40rpx;
    width: 280rpx;
    height: 280rpx;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
  }
}

.hero-content {
  flex: 1;
  z-index: 1;
}

.hero-title {
  font-size: 44rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 12rpx;
}

.quick-entry {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.entry-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
}

.entry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  font-size: 36rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.entry-text {
  font-size: 24rpx;
  color: #1f2937;
  font-weight: 500;
}

.banner-section {
  padding: 20rpx 24rpx;
}

.banner-swiper {
  height: 240rpx;
  border-radius: 20rpx;
  overflow: hidden;
}

.banner-item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 40rpx;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.banner-icon {
  font-size: 80rpx;
  filter: drop-shadow(0 4rpx 12rpx rgba(0, 0, 0, 0.2));
}

.banner-text {
  flex: 1;
}

.banner-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.banner-desc {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}


.hero-desc {
  font-size: 26rpx;
  opacity: 0.85;
  line-height: 1.5;
}

.hero-illustration {
  z-index: 1;
  margin-left: 20rpx;
}

.hero-emoji {
  font-size: 80rpx;
  opacity: 0.6;
}

.skeleton-list {
  padding: 24rpx;
}

.skeleton-card {
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;

  .sk-cover {
    height: 180rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .sk-body {
    padding: 24rpx;
  }

  .sk-line {
    height: 24rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6rpx;
    margin-bottom: 12rpx;

    &.w-60 { width: 60%; }
    &.w-90 { width: 90%; }
    &.w-40 { width: 40%; }
    &:last-child { margin-bottom: 0; }
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.activity-card {
  margin: 20rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;

  &.card-hover {
    transform: scale(0.98);
  }
}

.card-cover {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 220rpx;
  color: #fff;
  overflow: hidden;
}

.cover-badge {
  position: absolute;
  top: 20rpx;
  left: 24rpx;
  padding: 6rpx 18rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 20rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.cover-model {
  font-size: 64rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.2);
}

.cover-status {
  position: absolute;
  bottom: 20rpx;
  right: 24rpx;
  font-size: 22rpx;
  opacity: 0.8;

  &.hot {
    color: #fbbf24;
    opacity: 1;
  }
}

.card-body {
  padding: 24rpx;
}

.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6rpx;
}

.card-desc {
  display: block;
  font-size: 26rpx;
  color: #9ca3af;
  margin-bottom: 20rpx;
  line-height: 1.5;
}

.reward-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.reward-tag {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  border-radius: 12rpx;
  gap: 8rpx;
  font-weight: 500;

  &.view {
    background: #f0f9ff;
    .rt-value { color: #2563eb; }
  }

  &.booking {
    background: #fefce8;
    .rt-value { color: #d97706; }
  }
}

.rt-icon { font-size: 24rpx; }
.rt-label { font-size: 22rpx; color: #6b7280; }
.rt-value { font-size: 28rpx; font-weight: 700; }

.budget-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.budget-label {
  font-size: 22rpx;
  color: #9ca3af;
  white-space: nowrap;
}

.budget-bar {
  flex: 1;
  height: 10rpx;
  background: #e5e7eb;
  border-radius: 5rpx;
  overflow: hidden;
}

.budget-fill {
  height: 100%;
  border-radius: 5rpx;
  transition: width 0.5s ease;
}

.budget-text {
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
}

.card-footer {
  padding: 16rpx 24rpx;
  border-top: 2rpx solid #f3f4f6;
}

.participate-btn {
  display: block;
  text-align: right;
  font-size: 28rpx;
  font-weight: 600;
  color: #2563eb;
}

/* AI Recommend */
.ai-recommend-section {
  padding: 0 24rpx;
  margin-bottom: 12rpx;
}

.ai-rec-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.ai-rec-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e40af;
}

.ai-rec-sub {
  font-size: 22rpx;
  color: #9ca3af;
}

.ai-rec-loading {
  padding: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #9ca3af;
}

.ai-rec-card {
  padding: 24rpx;
  margin-bottom: 12rpx;
  background: #fff;
  border: 2rpx solid #dbeafe;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.08);
  transition: transform 0.2s;

  &.card-hover {
    transform: scale(0.98);
  }
}

.arc-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.arc-brand-tag {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 8rpx;
}

.arc-model {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
}

.arc-reason {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.arc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.arc-reward {
  font-size: 28rpx;
  font-weight: 700;
  color: #d97706;
}

.arc-go {
  font-size: 26rpx;
  font-weight: 600;
  color: #2563eb;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #d1d5db;
}
</style>
