<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';
import { bizCertApi, kolTaskApi, settlementApi } from '@/api';

const userStore = useUserStore();
const loading = ref(true);
const bizStatus = ref<any>(null);
const stats = ref({
  activeActivities: 0,
  totalTasks: 0,
  pendingSettlements: 0,
  totalRevenue: 0,
});

const isBizCertified = computed(() => bizStatus.value?.status === 'approved');

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [certRes] = await Promise.all([
      bizCertApi.status(userStore.userId),
    ]);
    
    if (certRes.success) {
      bizStatus.value = certRes.data;
    }
    
    stats.value = {
      activeActivities: 3,
      totalTasks: 12,
      pendingSettlements: 5,
      totalRevenue: 12580,
    };
  } catch (e) {
    console.error('[BizWorkbench] load error:', e);
  } finally {
    loading.value = false;
  }
}

function goToCert() {
  uni.navigateTo({ url: '/pages/biz/cert' });
}

function goToActivityManage() {
  uni.navigateTo({ url: '/pages/biz/activity' });
}

function goToTaskManage() {
  uni.navigateTo({ url: '/pages/biz/task' });
}

function goToStats() {
  uni.navigateTo({ url: '/pages/biz/stats' });
}

function goToSettlement() {
  uni.navigateTo({ url: '/pages/biz/settlement' });
}

function goToProducts() {
  uni.navigateTo({ url: '/pages/biz/products' });
}

function goToLead() {
  uni.navigateTo({ url: '/pages/biz/lead' });
}

const quickActions = [
  { icon: '📢', title: '活动管理', desc: '创建推广活动', action: goToActivityManage, color: '#2563eb' },
  { icon: '📋', title: '任务管理', desc: '发布KOL任务', action: goToTaskManage, color: '#10b981' },
  { icon: '🎯', title: '线索管理', desc: 'AI智能线索', action: goToLead, color: '#f59e0b' },
  { icon: '📊', title: '数据统计', desc: '查看推广效果', action: goToStats, color: '#8b5cf6' },
  { icon: '💰', title: '结算管理', desc: '处理待结算', action: goToSettlement, color: '#ef4444' },
];
</script>

<template>
  <view class="biz-page">
    <view class="header">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="title">商家工作台</text>
        <text class="subtitle">B端管理中心</text>
      </view>
    </view>

    <view v-if="!isBizCertified" class="cert-banner">
      <view class="cert-icon">🏢</view>
      <view class="cert-info">
        <text class="cert-title">商家认证</text>
        <text class="cert-desc">完成认证解锁全部商家功能</text>
      </view>
      <button class="cert-btn" @tap="goToCert">立即认证</button>
    </view>

    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ stats.activeActivities }}</text>
        <text class="stat-label">进行中活动</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalTasks }}</text>
        <text class="stat-label">KOL任务</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.pendingSettlements }}</text>
        <text class="stat-label">待结算</text>
      </view>
      <view class="stat-card highlight">
        <text class="stat-value">¥{{ (stats.totalRevenue / 100).toFixed(0) }}</text>
        <text class="stat-label">总收益</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">快捷入口</text>
      <view class="action-grid">
        <view
          v-for="(item, index) in quickActions"
          :key="index"
          class="action-card"
          @tap="item.action"
        >
          <view class="action-icon" :style="{ background: item.color + '15' }">
            <text>{{ item.icon }}</text>
          </view>
          <text class="action-title">{{ item.title }}</text>
          <text class="action-desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">待办事项</text>
      <view class="todo-list">
        <view class="todo-item">
          <view class="todo-badge urgent">紧急</view>
          <text class="todo-text">3个KOL任务待审核</text>
          <text class="todo-arrow">›</text>
        </view>
        <view class="todo-item">
          <view class="todo-badge normal">待处理</view>
          <text class="todo-text">5笔结算待确认</text>
          <text class="todo-arrow">›</text>
        </view>
        <view class="todo-item">
          <view class="todo-badge info">提醒</view>
          <text class="todo-text">2个活动即将结束</text>
          <text class="todo-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">更多功能</text>
      <view class="more-list">
        <view class="more-item" @tap="goToProducts">
          <text class="more-icon">📦</text>
          <text class="more-text">商品管理</text>
          <text class="more-arrow">›</text>
        </view>
        <view class="more-item">
          <text class="more-icon">📈</text>
          <text class="more-text">推广分析</text>
          <text class="more-arrow">›</text>
        </view>
        <view class="more-item">
          <text class="more-icon">⚙️</text>
          <text class="more-text">账户设置</text>
          <text class="more-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.biz-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 120rpx;
}

.header {
  position: relative;
  height: 280rpx;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1e40af, #2563eb, #3b82f6);
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 60rpx 30rpx;
  color: #fff;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  opacity: 0.9;
}

.cert-banner {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: -40rpx 24rpx 24rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.cert-icon {
  font-size: 60rpx;
}

.cert-info {
  flex: 1;
}

.cert-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6rpx;
}

.cert-desc {
  font-size: 24rpx;
  color: #6b7280;
}

.cert-btn {
  padding: 0 30rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 32rpx;

  &::after {
    border: none;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx 16rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &.highlight {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
  }
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #6b7280;
}

.section {
  padding: 0 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 20rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  font-size: 40rpx;
  margin-bottom: 16rpx;
}

.action-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6rpx;
}

.action-desc {
  font-size: 24rpx;
  color: #9ca3af;
}

.todo-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.todo-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  margin-right: 16rpx;

  &.urgent {
    background: #fef2f2;
    color: #ef4444;
  }

  &.normal {
    background: #fef3c7;
    color: #d97706;
  }

  &.info {
    background: #eff6ff;
    color: #2563eb;
  }
}

.todo-text {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.todo-arrow {
  font-size: 32rpx;
  color: #d1d5db;
}

.more-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.more-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.more-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.more-text {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.more-arrow {
  font-size: 32rpx;
  color: #d1d5db;
}
</style>
