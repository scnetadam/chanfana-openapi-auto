<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';
import { leadApi } from '@/api';

const userStore = useUserStore();
const loading = ref(true);
const leads = ref<any[]>([]);
const stats = ref<any>(null);
const insights = ref<any>(null);

const filters = ref({
  status: '',
  source: '',
  priority: '',
});
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const hasMore = ref(true);

const statusOptions = [
  { label: '全部', value: '' },
  { label: '新线索', value: 'new' },
  { label: '跟进中', value: 'following' },
  { label: '已试驾', value: 'test_drive' },
  { label: '已成交', value: 'closed' },
  { label: '已流失', value: 'lost' },
];

const sourceOptions = [
  { label: '全部', value: '' },
  { label: '试驾预约', value: 'booking' },
  { label: '表单留资', value: 'form' },
  { label: '在线咨询', value: 'chat' },
  { label: '电话线索', value: 'phone' },
];

const priorityOptions = [
  { label: '全部', value: '' },
  { label: '高优先级', value: 'high' },
  { label: '中优先级', value: 'medium' },
  { label: '低优先级', value: 'low' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: '新线索', color: '#3b82f6' },
  following: { label: '跟进中', color: '#10b981' },
  test_drive: { label: '已试驾', color: '#8b5cf6' },
  negotiating: { label: '谈判中', color: '#f59e0b' },
  closed: { label: '已成交', color: '#22c55e' },
  lost: { label: '已流失', color: '#ef4444' },
};

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  await loadData();
});

onPullDownRefresh(async () => {
  page.value = 1;
  hasMore.value = true;
  await loadData();
  uni.stopPullDownRefresh();
});

onReachBottom(async () => {
  if (hasMore.value && !loading.value) {
    page.value++;
    await loadLeads();
  }
});

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([
      loadLeads(),
      loadStats(),
      loadInsights(),
    ]);
  } catch (e) {
    console.error('[Lead List] load error:', e);
  } finally {
    loading.value = false;
  }
}

async function loadLeads() {
  try {
    const res = await leadApi.list({
      ...filters.value,
      page: page.value,
      pageSize,
    });
    
    if (res.success) {
      if (page.value === 1) {
        leads.value = res.data.list;
      } else {
        leads.value.push(...res.data.list);
      }
      total.value = res.data.total;
      hasMore.value = leads.value.length < total.value;
    }
  } catch (e) {
    console.error('[Lead List] load leads error:', e);
  }
}

async function loadStats() {
  try {
    const res = await leadApi.stats();
    if (res.success) {
      stats.value = res.data;
    }
  } catch (e) {
    console.error('[Lead List] load stats error:', e);
  }
}

async function loadInsights() {
  try {
    const res = await leadApi.insights();
    if (res.success) {
      insights.value = res.data;
    }
  } catch (e) {
    console.error('[Lead List] load insights error:', e);
  }
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/biz/lead-detail?id=${id}` });
}

function goToCreate() {
  uni.navigateTo({ url: '/pages/biz/lead-create' });
}

async function quickAnalyze(leadId: string) {
  uni.showLoading({ title: 'AI分析中...' });
  try {
    const [classifyRes, scoreRes] = await Promise.all([
      leadApi.classify(leadId),
      leadApi.score(leadId),
    ]);
    
    if (classifyRes.success && scoreRes.success) {
      uni.showToast({ title: '分析完成', icon: 'success' });
      await loadLeads();
    }
  } catch (e) {
    console.error('[Lead] quick analyze error:', e);
    uni.showToast({ title: '分析失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

function formatTime(time: string) {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function onFilterChange() {
  page.value = 1;
  hasMore.value = true;
  loadLeads();
}
</script>

<template>
  <view class="lead-page">
    <view class="header">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="title">线索管理</text>
        <text class="subtitle">B端销售线索</text>
      </view>
      <button class="create-btn" @tap="goToCreate">+ 新建线索</button>
    </view>

    <view v-if="stats" class="stats-grid">
      <view class="stat-card">
        <text class="stat-value">{{ stats.total }}</text>
        <text class="stat-label">总线索</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.new }}</text>
        <text class="stat-label">新线索</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.closed }}</text>
        <text class="stat-label">已成交</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.conversionRate }}%</text>
        <text class="stat-label">转化率</text>
      </view>
    </view>

    <view v-if="insights && insights.insights && insights.insights.length > 0" class="insights-section">
      <view class="section-title">
        <text class="title-text">AI洞察</text>
      </view>
      <view class="insights-list">
        <view v-for="(insight, index) in insights.insights.slice(0, 2)" :key="index" class="insight-card">
          <text class="insight-title">{{ insight.title }}</text>
          <text class="insight-detail">{{ insight.detail }}</text>
        </view>
      </view>
    </view>

    <view class="filters-section">
      <view class="filter-row">
        <picker :value="statusOptions.findIndex(o => o.value === filters.status)" @change="(e: any) => { filters.status = statusOptions[e.detail.value].value; onFilterChange(); }">
          <view class="filter-picker">
            <text>{{ statusOptions.find(o => o.value === filters.status)?.label || '状态' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        
        <picker :value="sourceOptions.findIndex(o => o.value === filters.source)" @change="(e: any) => { filters.source = sourceOptions[e.detail.value].value; onFilterChange(); }">
          <view class="filter-picker">
            <text>{{ sourceOptions.find(o => o.value === filters.source)?.label || '来源' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        
        <picker :value="priorityOptions.findIndex(o => o.value === filters.priority)" @change="(e: any) => { filters.priority = priorityOptions[e.detail.value].value; onFilterChange(); }">
          <view class="filter-picker">
            <text>{{ priorityOptions.find(o => o.value === filters.priority)?.label || '优先级' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="lead-list">
      <view v-if="loading && leads.length === 0" class="empty-state">
        <text class="empty-text">加载中...</text>
      </view>
      
      <view v-else-if="leads.length === 0" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无线索</text>
        <button class="empty-btn" @tap="goToCreate">创建第一个线索</button>
      </view>
      
      <view v-else>
        <view v-for="lead in leads" :key="lead.id" class="lead-card" @tap="goToDetail(lead.id)">
          <view class="lead-header">
            <view class="lead-info">
              <text class="lead-name">{{ lead.name }}</text>
              <text class="lead-phone">{{ lead.phone }}</text>
            </view>
            <view class="lead-status" :style="{ backgroundColor: statusMap[lead.status]?.color || '#999' }">
              <text>{{ statusMap[lead.status]?.label || lead.status }}</text>
            </view>
          </view>
          
          <view class="lead-content">
            <view v-if="lead.carModel" class="lead-row">
              <text class="label">车型：</text>
              <text class="value">{{ lead.carModel }}</text>
            </view>
            <view v-if="lead.city" class="lead-row">
              <text class="label">地区：</text>
              <text class="value">{{ lead.city }}</text>
            </view>
            <view v-if="lead.remarks" class="lead-row">
              <text class="label">备注：</text>
              <text class="value remarks">{{ lead.remarks }}</text>
            </view>
          </view>
          
          <view v-if="lead.classification" class="lead-ai-tags">
            <view v-for="tag in lead.classification.tags?.slice(0, 3)" :key="tag" class="ai-tag">
              <text>{{ tag }}</text>
            </view>
            <view v-if="lead.qualityScore" class="ai-score">
              <text>{{ lead.qualityScore.grade }}级</text>
            </view>
          </view>
          
          <view class="lead-footer">
            <text class="lead-time">{{ formatTime(lead.createdAt) }}</text>
            <view class="lead-actions">
              <button v-if="!lead.classification" class="action-btn" @tap.stop="quickAnalyze(lead.id)">AI分析</button>
              <button class="action-btn primary" @tap.stop="goToDetail(lead.id)">查看详情</button>
            </view>
          </view>
        </view>
        
        <view v-if="loading" class="loading-more">
          <text>加载更多...</text>
        </view>
        
        <view v-else-if="!hasMore" class="no-more">
          <text>已加载全部 {{ total }} 条线索</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.lead-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.header {
  position: relative;
  padding: 60rpx 30rpx 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.1)"/></svg>');
  background-size: 200rpx;
  opacity: 0.3;
}

.header-content {
  position: relative;
  z-index: 1;
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

.create-btn {
  position: absolute;
  right: 30rpx;
  top: 60rpx;
  padding: 16rpx 32rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
}

.stats-grid {
  display: flex;
  padding: 30rpx;
  background: #fff;
  margin: -20rpx 30rpx 30rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.stat-card {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.insights-section {
  padding: 0 30rpx;
  margin-bottom: 30rpx;
}

.section-title {
  margin-bottom: 20rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.insight-card {
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border-left: 6rpx solid #667eea;
}

.insight-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.insight-detail {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}

.filters-section {
  padding: 20rpx 30rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.filter-row {
  display: flex;
  gap: 20rpx;
}

.filter-picker {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.arrow {
  font-size: 20rpx;
  color: #999;
}

.lead-list {
  padding: 0 30rpx 30rpx;
}

.lead-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.lead-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.lead-info {
  flex: 1;
}

.lead-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.lead-phone {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.lead-status {
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #fff;
}

.lead-content {
  margin-bottom: 16rpx;
}

.lead-row {
  display: flex;
  margin-bottom: 8rpx;
  font-size: 26rpx;
}

.label {
  color: #999;
  margin-right: 8rpx;
}

.value {
  flex: 1;
  color: #333;
}

.remarks {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lead-ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.ai-tag {
  padding: 6rpx 16rpx;
  background: #f0f9ff;
  border: 1rpx solid #bae6fd;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #0ea5e9;
}

.ai-score {
  padding: 6rpx 16rpx;
  background: #fef3c7;
  border: 1rpx solid #fde68a;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #f59e0b;
  font-weight: bold;
}

.lead-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.lead-time {
  font-size: 24rpx;
  color: #999;
}

.lead-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 10rpx 24rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  background: #f5f5f5;
  color: #666;
}

.action-btn.primary {
  background: #667eea;
  color: #fff;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
}

.empty-icon {
  display: block;
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.empty-btn {
  padding: 20rpx 60rpx;
  background: #667eea;
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
}

.loading-more,
.no-more {
  text-align: center;
  padding: 30rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
