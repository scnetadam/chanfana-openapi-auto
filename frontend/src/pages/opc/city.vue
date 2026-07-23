<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { opcApi } from '@/api';

const cityId = ref('');
const cityName = ref('');
const cityInfo = ref<any>({});
const policies = ref<any[]>([]);
const projects = ref<any[]>([]);
const activeTab = ref('policy');
const loading = ref(false);

onLoad((options: any) => {
  cityId.value = options.id;
  cityName.value = options.name || '城市';
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const res = await opcApi.cityDetail(parseInt(cityId.value));
    if (res.success) {
      cityInfo.value = res.data;
      policies.value = res.data.policies || [];
      projects.value = res.data.projects || [];
    }
  } catch (error) {
    console.error('加载城市数据失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goToPolicy(policy: any) {
  uni.navigateTo({ url: `/pages/opc/policy?id=${policy.id}&city=${cityName.value}` });
}

function goToProject(project: any) {
  uni.navigateTo({ url: `/pages/opc/project?id=${project.id}` });
}

function applySubsidy(policy: any) {
  uni.navigateTo({ url: `/pages/opc/subsidy?policyId=${policy.id}&city=${cityName.value}` });
}

function switchTab(tab: string) {
  activeTab.value = tab;
}
</script>

<template>
  <view class="city-page">
    <view class="header-card">
      <view class="city-header">
        <text class="city-name">{{ cityInfo.name }}</text>
        <text class="city-province">{{ cityInfo.province }}</text>
      </view>
      <text class="city-desc">{{ cityInfo.description }}</text>
      <view class="city-stats">
        <view class="stat-item">
          <text class="stat-value">{{ cityInfo.totalProjects }}</text>
          <text class="stat-label">创业项目</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ cityInfo.totalSubsidy }}</text>
          <text class="stat-label">投资补贴</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ cityInfo.totalTokens }}</text>
          <text class="stat-label">TOKEN池</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ cityInfo.totalPolicies }}</text>
          <text class="stat-label">扶持政策</text>
        </view>
      </view>
      <view class="feature-tags">
        <text v-for="feature in cityInfo.features" :key="feature" class="feature-tag">{{ feature }}</text>
      </view>
    </view>

    <view class="tabs">
      <view :class="['tab', activeTab === 'policy' ? 'active' : '']" @tap="switchTab('policy')">
        <text>扶持政策</text>
      </view>
      <view :class="['tab', activeTab === 'project' ? 'active' : '']" @tap="switchTab('project')">
        <text>创业项目</text>
      </view>
    </view>

    <view v-if="activeTab === 'policy'" class="policy-section">
      <view v-for="policy in policies" :key="policy.id" class="policy-card">
        <view class="policy-header" @tap="goToPolicy(policy)">
          <view class="policy-title-row">
            <text class="policy-title">{{ policy.title }}</text>
            <text :class="['status', policy.status === '开放申请' ? 'open' : 'pending']">{{ policy.status }}</text>
          </view>
          <view class="policy-tags">
            <text class="tag type">{{ policy.type }}</text>
            <text class="tag amount">{{ policy.amount }}</text>
          </view>
        </view>
        <text class="policy-desc">{{ policy.description }}</text>
        <view class="policy-requirements">
          <text class="req-label">申请条件:</text>
          <text v-for="req in policy.requirements" :key="req" class="req-item">{{ req }}</text>
        </view>
        <view class="policy-footer">
          <text class="deadline">截止: {{ policy.deadline }}</text>
          <button class="apply-btn" @tap="applySubsidy(policy)">立即申请</button>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'project'" class="project-section">
      <view v-for="project in projects" :key="project.id" class="project-card" @tap="goToProject(project)">
        <view class="project-header">
          <text class="project-name">{{ project.name }}</text>
          <text class="project-stage">{{ project.stage }}</text>
        </view>
        <text class="project-company">{{ project.company }}</text>
        <view class="project-info">
          <text class="funding">融资: {{ project.funding }}</text>
          <view class="project-tags">
            <text v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.city-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

.header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  color: #fff;
}

.city-header {
  margin-bottom: 20rpx;
}

.city-name {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.city-province {
  display: block;
  font-size: 28rpx;
  opacity: 0.8;
}

.city-desc {
  display: block;
  font-size: 26rpx;
  opacity: 0.9;
  margin-bottom: 30rpx;
  line-height: 1.6;
}

.city-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  opacity: 0.8;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.feature-tag {
  padding: 10rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  font-size: 24rpx;
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 30rpx 0;
  font-size: 30rpx;
  color: #666;
  position: relative;
}

.tab.active {
  color: #667eea;
  font-weight: bold;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background: #667eea;
  border-radius: 2rpx;
}

.policy-section,
.project-section {
  padding: 30rpx;
}

.policy-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.policy-header {
  margin-bottom: 16rpx;
}

.policy-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.policy-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.status {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.status.open {
  background: #e8f5e9;
  color: #2e7d32;
}

.status.pending {
  background: #fff3e0;
  color: #f57c00;
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

.tag.type {
  background: #e3f2fd;
  color: #1976d2;
}

.tag.amount {
  background: #fce4ec;
  color: #c2185b;
}

.policy-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.policy-requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.req-label {
  font-size: 24rpx;
  color: #999;
}

.req-item {
  padding: 6rpx 16rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #666;
}

.policy-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

.deadline {
  font-size: 24rpx;
  color: #999;
}

.apply-btn {
  padding: 12rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 20rpx;
  font-size: 26rpx;
}

.project-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.project-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.project-stage {
  padding: 6rpx 16rpx;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.project-company {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.project-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.funding {
  font-size: 24rpx;
  color: #f5576c;
  font-weight: 500;
}

.project-tags {
  display: flex;
  gap: 12rpx;
}

.project-tags .tag {
  background: #f5f5f5;
  color: #666;
}
</style>
