<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const activities = ref<any[]>([]);
const loading = ref(true);
const showCreate = ref(false);

const form = ref({
  brand: '',
  model: '',
  title: '',
  description: '',
  rewardPerView: 0.01,
  rewardPerBooking: 50,
  totalBudget: 10000,
  startDate: '',
  endDate: '',
});

onShow(async () => {
  await loadActivities();
});

async function loadActivities() {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 500));
  activities.value = [
    {
      id: 'act_1',
      brand: '小米汽车',
      model: 'SU7',
      title: '小米SU7全国试驾体验活动',
      status: 'active',
      usedBudget: 3500,
      totalBudget: 10000,
      views: 12580,
      bookings: 89,
      rewardPerBooking: 50,
    },
    {
      id: 'act_2',
      brand: '比亚迪',
      model: '海豹',
      title: '比亚迪海豹城市巡展',
      status: 'active',
      usedBudget: 2800,
      totalBudget: 8000,
      views: 8960,
      bookings: 56,
      rewardPerBooking: 40,
    },
    {
      id: 'act_3',
      brand: '特斯拉',
      model: 'Model Y',
      title: 'Model Y焕新版体验',
      status: 'ending',
      usedBudget: 7500,
      totalBudget: 8000,
      views: 20150,
      bookings: 142,
      rewardPerBooking: 60,
    },
  ];
  loading.value = false;
}

function openCreate() {
  showCreate.value = true;
}

function closeCreate() {
  showCreate.value = false;
}

async function handleCreate() {
  if (!form.value.brand || !form.value.model || !form.value.title) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '创建中...' });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  uni.hideLoading();
  uni.showToast({ title: '创建成功', icon: 'success' });
  showCreate.value = false;
  loadActivities();
}

function editActivity(act: any) {
  uni.showToast({ title: '编辑功能开发中', icon: 'none' });
}

function viewStats(act: any) {
  uni.navigateTo({ url: `/pages/biz/stats?activityId=${act.id}` });
}

function getStatusColor(status: string) {
  if (status === 'active') return '#10b981';
  if (status === 'ending') return '#f59e0b';
  return '#6b7280';
}

function getStatusText(status: string) {
  if (status === 'active') return '进行中';
  if (status === 'ending') return '即将结束';
  return '已结束';
}
</script>

<template>
  <view class="activity-page">
    <view class="header">
      <text class="title">活动管理</text>
      <button class="create-btn" @tap="openCreate">
        <text>+ 创建活动</text>
      </button>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else class="activity-list">
      <view v-for="act in activities" :key="act.id" class="activity-card">
        <view class="card-header">
          <view class="brand-tag">{{ act.brand }}</view>
          <view class="status-tag" :style="{ background: getStatusColor(act.status) + '15', color: getStatusColor(act.status) }">
            {{ getStatusText(act.status) }}
          </view>
        </view>

        <text class="model">{{ act.model }}</text>
        <text class="title">{{ act.title }}</text>

        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ act.views }}</text>
            <text class="stat-label">浏览</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ act.bookings }}</text>
            <text class="stat-label">预约</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">¥{{ act.rewardPerBooking }}</text>
            <text class="stat-label">奖励</text>
          </view>
        </view>

        <view class="budget-row">
          <text class="budget-label">预算消耗</text>
          <view class="budget-bar">
            <view
              class="budget-fill"
              :style="{ width: ((act.usedBudget / act.totalBudget) * 100) + '%' }"
            />
          </view>
          <text class="budget-text">
            ¥{{ act.usedBudget.toLocaleString() }} / ¥{{ act.totalBudget.toLocaleString() }}
          </text>
        </view>

        <view class="card-actions">
          <button class="action-btn" @tap="editActivity(act)">编辑</button>
          <button class="action-btn primary" @tap="viewStats(act)">查看数据</button>
        </view>
      </view>
    </view>

    <view v-if="showCreate" class="create-modal">
      <view class="modal-mask" @tap="closeCreate"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">创建推广活动</text>
          <text class="modal-close" @tap="closeCreate">✕</text>
        </view>

        <scroll-view class="modal-body" scroll-y>
          <view class="form-group">
            <text class="form-label required">品牌</text>
            <input v-model="form.brand" class="form-input" placeholder="如：小米汽车" />
          </view>

          <view class="form-group">
            <text class="form-label required">车型</text>
            <input v-model="form.model" class="form-input" placeholder="如：SU7" />
          </view>

          <view class="form-group">
            <text class="form-label required">活动标题</text>
            <input v-model="form.title" class="form-input" placeholder="请输入活动标题" />
          </view>

          <view class="form-group">
            <text class="form-label">活动描述</text>
            <textarea
              v-model="form.description"
              class="form-textarea"
              placeholder="请输入活动描述"
            />
          </view>

          <view class="form-group">
            <text class="form-label required">浏览奖励（元）</text>
            <input
              v-model="form.rewardPerView"
              class="form-input"
              type="digit"
              placeholder="0.01"
            />
          </view>

          <view class="form-group">
            <text class="form-label required">试驾奖励（元）</text>
            <input
              v-model="form.rewardPerBooking"
              class="form-input"
              type="number"
              placeholder="50"
            />
          </view>

          <view class="form-group">
            <text class="form-label required">预算总额（元）</text>
            <input
              v-model="form.totalBudget"
              class="form-input"
              type="number"
              placeholder="10000"
            />
          </view>
        </scroll-view>

        <view class="modal-footer">
          <button class="cancel-btn" @tap="closeCreate">取消</button>
          <button class="confirm-btn" @tap="handleCreate">创建</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.activity-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: #fff;
  border-bottom: 2rpx solid #f3f4f6;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
}

.create-btn {
  padding: 0 24rpx;
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

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx;
  color: #9ca3af;
}

.activity-list {
  padding: 24rpx;
}

.activity-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.brand-tag {
  padding: 6rpx 16rpx;
  background: #eff6ff;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #2563eb;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.model {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.title {
  display: block;
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 20rpx;
}

.stats-row {
  display: flex;
  gap: 30rpx;
  margin-bottom: 20rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.budget-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.budget-label {
  font-size: 24rpx;
  color: #6b7280;
}

.budget-bar {
  flex: 1;
  height: 8rpx;
  background: #f3f4f6;
  border-radius: 4rpx;
}

.budget-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 4rpx;
}

.budget-text {
  font-size: 24rpx;
  color: #6b7280;
}

.card-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border-radius: 12rpx;
  background: #f3f4f6;
  color: #6b7280;

  &.primary {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
  }

  &::after {
    border: none;
  }
}

.create-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 2rpx solid #f3f4f6;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.modal-close {
  font-size: 40rpx;
  color: #9ca3af;
}

.modal-body {
  flex: 1;
  padding: 30rpx;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #1f2937;
  margin-bottom: 10rpx;

  &.required::before {
    content: '*';
    color: #ef4444;
    margin-right: 4rpx;
  }
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  font-size: 28rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 2rpx solid #f3f4f6;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;

  &::after {
    border: none;
  }
}

.cancel-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.confirm-btn {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
}
</style>
