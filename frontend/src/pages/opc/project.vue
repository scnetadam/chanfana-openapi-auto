<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { opcApi } from '@/api';

const projects = ref<any[]>([]);
const activeFilter = ref('all');
const searchKeyword = ref('');
const loading = ref(false);

onLoad(() => {
  loadProjects();
});

async function loadProjects() {
  loading.value = true;
  try {
    const res = await opcApi.projects({ filter: activeFilter.value === 'all' ? undefined : activeFilter.value });
    if (res.success) {
      projects.value = res.data;
    }
  } catch (error) {
    console.error('加载项目失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function filterProjects(filter: string) {
  activeFilter.value = filter;
  await loadProjects();
}

function goToDetail(project: any) {
  uni.navigateTo({ url: `/pages/opc/project?id=${project.id}` });
}

function contactProject(project: any) {
  uni.showModal({
    title: '联系项目方',
    content: `是否要联系 ${project.company}？`,
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已发送合作意向', icon: 'success' });
      }
    },
  });
}
</script>

<template>
  <view class="project-page">
    <view class="search-bar">
      <input class="search-input" v-model="searchKeyword" placeholder="搜索项目、公司、标签..." />
    </view>

    <view class="filter-bar">
      <view :class="['filter-item', activeFilter === 'all' ? 'active' : '']" @tap="filterProjects('all')">
        <text>全部</text>
      </view>
      <view :class="['filter-item', activeFilter === 'hot' ? 'active' : '']" @tap="filterProjects('hot')">
        <text>🔥 热门</text>
      </view>
      <view :class="['filter-item', activeFilter === 'new' ? 'active' : '']" @tap="filterProjects('new')">
        <text>✨ 最新</text>
      </view>
      <view :class="['filter-item', activeFilter === 'funding' ? 'active' : '']" @tap="filterProjects('funding')">
        <text>💰 融资中</text>
      </view>
    </view>

    <view class="project-list">
      <view v-for="project in projects" :key="project.id" class="project-card" @tap="goToDetail(project)">
        <view class="project-header">
          <view class="project-title-row">
            <text class="project-name">{{ project.name }}</text>
            <text class="project-stage">{{ project.stage }}</text>
          </view>
          <text class="project-company">{{ project.company }}</text>
          <view class="project-tags">
            <text class="tag city">{{ project.city }}</text>
            <text v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</text>
          </view>
        </view>

        <text class="project-desc">{{ project.description }}</text>

        <view class="project-metrics">
          <view class="metric-item">
            <text class="metric-label">用户规模</text>
            <text class="metric-value">{{ project.metrics.users }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">年营收</text>
            <text class="metric-value">{{ project.metrics.revenue }}</text>
          </view>
          <view class="metric-item">
            <text class="metric-label">增长率</text>
            <text class="metric-value highlight">{{ project.metrics.growth }}</text>
          </view>
        </view>

        <view class="project-info">
          <view class="info-item">
            <text class="info-label">融资:</text>
            <text class="info-value">{{ project.funding }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">估值:</text>
            <text class="info-value">{{ project.valuation }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">团队:</text>
            <text class="info-value">{{ project.team }}</text>
          </view>
        </view>

        <view class="founder-info">
          <text class="founder-label">创始人:</text>
          <text class="founder-name">{{ project.founder.name }}</text>
          <text class="founder-bg">{{ project.founder.background }}</text>
        </view>

        <view class="project-footer">
          <text class="founded-time">成立于 {{ project.founded }}</text>
          <button class="contact-btn" @tap.stop="contactProject(project)">联系合作</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.project-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

.search-bar {
  padding: 20rpx 30rpx;
  background: #fff;
}

.search-input {
  width: 100%;
  padding: 24rpx 30rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  overflow-x: auto;
}

.filter-item {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #666;
}

.filter-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.project-list {
  padding: 30rpx;
}

.project-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.project-header {
  margin-bottom: 20rpx;
}

.project-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.project-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.project-stage {
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.project-company {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  padding: 6rpx 16rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #666;
}

.tag.city {
  background: #e3f2fd;
  color: #1976d2;
}

.project-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.project-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.metric-item {
  text-align: center;
}

.metric-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.metric-value {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.metric-value.highlight {
  color: #f5576c;
}

.project-info {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.info-item {
  font-size: 24rpx;
}

.info-label {
  color: #999;
}

.info-value {
  color: #333;
  font-weight: 500;
}

.founder-info {
  padding: 16rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  line-height: 1.6;
}

.founder-label {
  color: #999;
}

.founder-name {
  color: #333;
  font-weight: 500;
  margin: 0 8rpx;
}

.founder-bg {
  color: #666;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #eee;
}

.founded-time {
  font-size: 24rpx;
  color: #999;
}

.contact-btn {
  padding: 12rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 20rpx;
  font-size: 26rpx;
}
</style>
