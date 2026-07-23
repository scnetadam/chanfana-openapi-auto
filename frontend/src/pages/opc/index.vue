<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { opcApi } from '@/api';

const cities = ref<any[]>([]);
const hotPolicies = ref<any[]>([]);
const stats = ref({
  totalCities: 0,
  totalProjects: 0,
  totalSubsidy: 0,
  totalTokens: 0,
});
const loading = ref(false);

onLoad(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [statsRes, citiesRes, policiesRes] = await Promise.all([
      opcApi.stats(),
      opcApi.cities(),
      opcApi.policies(),
    ]);
    
    if (statsRes.success) {
      stats.value = statsRes.data;
    }
    
    if (citiesRes.success) {
      cities.value = citiesRes.data;
    }
    
    if (policiesRes.success) {
      hotPolicies.value = policiesRes.data.slice(0, 4);
    }
  } catch (error) {
    console.error('加载OPC数据失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goToCity(city: any) {
  uni.navigateTo({ url: `/pages/opc/city?id=${city.id}&name=${city.name}` });
}

function goToPolicy(policy: any) {
  uni.navigateTo({ url: `/pages/opc/policy?id=${policy.id}` });
}

function goToApply() {
  uni.navigateTo({ url: '/pages/opc/apply' });
}

function goToProjects() {
  uni.navigateTo({ url: '/pages/opc/project' });
}
</script>

<template>
  <view class="opc-page">
    <view class="header">
      <text class="title">OPC创业广场</text>
      <text class="subtitle">AI创业 · 政策扶持 · TOKEN补贴</text>
    </view>

    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalCities }}</text>
        <text class="stat-label">覆盖城市</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalProjects }}</text>
        <text class="stat-label">创业项目</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalSubsidy }}亿</text>
        <text class="stat-label">投资补贴</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.totalTokens }}万</text>
        <text class="stat-label">TOKEN池</text>
      </view>
    </view>

    <view class="action-bar">
      <button class="action-btn primary" @tap="goToApply">
        <text class="btn-icon">🚀</text>
        <text class="btn-text">申请入驻</text>
      </button>
      <button class="action-btn secondary" @tap="goToProjects">
        <text class="btn-icon">📊</text>
        <text class="btn-text">查看项目</text>
      </button>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">🔥 热门城市</text>
      </view>
      <view class="city-grid">
        <view
          v-for="city in cities.filter(c => c.hot)"
          :key="city.id"
          class="city-card hot"
          @tap="goToCity(city)"
        >
          <view class="city-header">
            <text class="city-name">{{ city.name }}</text>
            <text class="city-province">{{ city.province }}</text>
          </view>
          <view class="city-stats">
            <view class="city-stat">
              <text class="cs-value">{{ city.projects }}</text>
              <text class="cs-label">项目</text>
            </view>
            <view class="city-stat">
              <text class="cs-value">{{ city.subsidy }}</text>
              <text class="cs-label">补贴</text>
            </view>
            <view class="city-stat">
              <text class="cs-value">{{ city.tokens }}</text>
              <text class="cs-label">TOKEN</text>
            </view>
          </view>
          <view class="city-footer">
            <text class="policy-count">{{ city.policies }}项政策</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">📋 热门政策</text>
        <text class="section-more" @tap="goToProjects">查看全部 ›</text>
      </view>
      <view class="policy-list">
        <view
          v-for="policy in hotPolicies"
          :key="policy.id"
          class="policy-card"
          @tap="goToPolicy(policy)"
        >
          <view class="policy-main">
            <text class="policy-title">{{ policy.title }}</text>
            <view class="policy-tags">
              <text class="tag city">{{ policy.city }}</text>
              <text class="tag type">{{ policy.type }}</text>
            </view>
          </view>
          <view class="policy-info">
            <text class="subsidy">{{ policy.subsidy }}</text>
            <text class="deadline">截止: {{ policy.deadline }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">🗺️ 全部城市</text>
      </view>
      <view class="city-list">
        <view
          v-for="city in cities"
          :key="city.id"
          class="city-item"
          @tap="goToCity(city)"
        >
          <view class="ci-left">
            <text class="ci-name">{{ city.name }}</text>
            <text class="ci-province">{{ city.province }}</text>
          </view>
          <view class="ci-right">
            <text class="ci-projects">{{ city.projects }}项目</text>
            <text class="ci-subsidy">{{ city.subsidy }}</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.opc-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20rpx;
}

.header {
  text-align: center;
  padding: 40rpx 0;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.stats-card {
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.1);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.action-bar {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  border: none;
}

.action-btn.primary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.9);
}

.btn-icon {
  font-size: 32rpx;
}

.btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
}

.action-btn.secondary .btn-text {
  color: #667eea;
}

.section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.section-more {
  font-size: 24rpx;
  color: #667eea;
}

.city-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.city-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  color: #fff;
}

.city-header {
  margin-bottom: 16rpx;
}

.city-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 6rpx;
}

.city-province {
  display: block;
  font-size: 22rpx;
  opacity: 0.8;
}

.city-stats {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.city-stat {
  flex: 1;
  text-align: center;
}

.cs-value {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
}

.cs-label {
  display: block;
  font-size: 20rpx;
  opacity: 0.8;
}

.city-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.3);
}

.policy-count {
  font-size: 22rpx;
}

.arrow {
  font-size: 32rpx;
}

.policy-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.policy-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.policy-main {
  flex: 1;
}

.policy-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 12rpx;
}

.policy-tags {
  display: flex;
  gap: 12rpx;
}

.tag {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.tag.city {
  background: #e3f2fd;
  color: #1976d2;
}

.tag.type {
  background: #f3e5f5;
  color: #7b1fa2;
}

.policy-info {
  text-align: right;
}

.subsidy {
  display: block;
  font-size: 26rpx;
  font-weight: bold;
  color: #f5576c;
  margin-bottom: 6rpx;
}

.deadline {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.city-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.city-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.ci-left {
  display: flex;
  flex-direction: column;
}

.ci-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 6rpx;
}

.ci-province {
  font-size: 22rpx;
  color: #999;
}

.ci-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ci-projects {
  font-size: 22rpx;
  color: #666;
}

.ci-subsidy {
  font-size: 24rpx;
  font-weight: bold;
  color: #667eea;
}
</style>
