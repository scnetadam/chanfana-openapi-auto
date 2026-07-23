<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const tasks = ref<any[]>([]);
const loading = ref(true);
const activeTab = ref(0);

onShow(async () => {
  await loadTasks();
});

async function loadTasks() {
  loading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 500));
  tasks.value = [
    {
      id: 'task_1',
      title: 'SU7试驾体验分享',
      type: 'content',
      reward: 100,
      completedCount: 45,
      targetCount: 100,
      status: 'active',
      submissions: [
        { id: 's1', kolName: '车评人小王', status: 'pending', createdAt: '2026-07-15' },
        { id: 's2', kolName: '汽车达人', status: 'pending', createdAt: '2026-07-14' },
      ],
    },
    {
      id: 'task_2',
      title: '海豹车型对比评测',
      type: 'video',
      reward: 200,
      completedCount: 28,
      targetCount: 50,
      status: 'active',
      submissions: [
        { id: 's3', kolName: '新能源评测', status: 'approved', createdAt: '2026-07-13' },
      ],
    },
  ];
  loading.value = false;
}

function reviewSubmission(task: any, submission: any) {
  uni.showActionSheet({
    itemList: ['通过', '拒绝', '查看详情'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: '已通过', icon: 'success' });
      } else if (res.tapIndex === 1) {
        uni.showToast({ title: '已拒绝', icon: 'none' });
      }
    },
  });
}

function createTask() {
  uni.showToast({ title: '创建任务功能开发中', icon: 'none' });
}
</script>

<template>
  <view class="task-page">
    <view class="header">
      <text class="title">KOL任务管理</text>
      <button class="create-btn" @tap="createTask">
        <text>+ 发布任务</text>
      </button>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: activeTab === 0 }" @tap="activeTab = 0">
        <text>进行中</text>
      </view>
      <view class="tab" :class="{ active: activeTab === 1 }" @tap="activeTab = 1">
        <text>待审核</text>
      </view>
      <view class="tab" :class="{ active: activeTab === 2 }" @tap="activeTab = 2">
        <text>已完成</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else class="task-list">
      <view v-for="task in tasks" :key="task.id" class="task-card">
        <view class="task-header">
          <view class="task-type">{{ task.type === 'content' ? '📝 内容' : '🎬 视频' }}</view>
          <view class="task-reward">¥{{ task.reward }}/单</view>
        </view>

        <text class="task-title">{{ task.title }}</text>

        <view class="progress-row">
          <text class="progress-label">完成进度</text>
          <view class="progress-bar">
            <view
              class="progress-fill"
              :style="{ width: ((task.completedCount / task.targetCount) * 100) + '%' }"
            />
          </view>
          <text class="progress-text">{{ task.completedCount }}/{{ task.targetCount }}</text>
        </view>

        <view v-if="task.submissions && task.submissions.length > 0" class="submissions">
          <text class="submissions-title">待审核提交</text>
          <view
            v-for="sub in task.submissions.filter((s: any) => s.status === 'pending')"
            :key="sub.id"
            class="submission-item"
            @tap="reviewSubmission(task, sub)"
          >
            <text class="sub-name">{{ sub.kolName }}</text>
            <text class="sub-time">{{ sub.createdAt }}</text>
            <text class="sub-action">审核 ›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.task-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: #fff;
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
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 32rpx;

  &::after {
    border: none;
  }
}

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 2rpx solid #f3f4f6;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 28rpx;
  color: #6b7280;
  position: relative;

  &.active {
    color: #2563eb;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background: #2563eb;
      border-radius: 2rpx;
    }
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx;
  color: #9ca3af;
}

.task-list {
  padding: 24rpx;
}

.task-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.task-type {
  padding: 6rpx 16rpx;
  background: #f3f4f6;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.task-reward {
  font-size: 28rpx;
  font-weight: 700;
  color: #f59e0b;
}

.task-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.progress-label {
  font-size: 24rpx;
  color: #6b7280;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  background: #f3f4f6;
  border-radius: 4rpx;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  border-radius: 4rpx;
}

.progress-text {
  font-size: 24rpx;
  color: #6b7280;
}

.submissions {
  padding-top: 20rpx;
  border-top: 2rpx solid #f3f4f6;
}

.submissions-title {
  display: block;
  font-size: 26rpx;
  color: #9ca3af;
  margin-bottom: 16rpx;
}

.submission-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f9fafb;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.sub-name {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.sub-time {
  font-size: 24rpx;
  color: #9ca3af;
  margin-right: 20rpx;
}

.sub-action {
  font-size: 26rpx;
  color: #2563eb;
}
</style>
