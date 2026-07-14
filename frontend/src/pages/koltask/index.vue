<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { kolTaskApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();

const tasks = ref<any[]>([]);
const earnings = ref<any>(null);
const loading = ref(true);
const currentTab = ref(0);

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
    const [taskRes, earnRes] = await Promise.all([
      currentTab.value === 0 ? kolTaskApi.openList() : kolTaskApi.myList(userStore.userId),
      kolTaskApi.earnings(userStore.userId),
    ]);
    if (taskRes.success) tasks.value = taskRes.data.list;
    if (earnRes.success) earnings.value = earnRes.data;
  } catch (e: any) {
    console.error('[KOL Task] load error:', e.message);
  } finally {
    loading.value = false;
  }
}

async function acceptTask(task: any) {
  try {
    const res = await kolTaskApi.submit(task.id, {
      kolUserId: userStore.userId,
      kolNickName: userStore.userInfo?.nickName || '',
    });
    if (res.success) {
      uni.showToast({ title: '领取成功！奖励 ¥' + res.data.reward.toFixed(2), icon: 'none' });
      await loadData();
    } else {
      uni.showToast({ title: '领取失败', icon: 'none' });
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '领取失败', icon: 'none' });
  }
}

function switchTab(tab: number) {
  currentTab.value = tab;
  loadData();
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="header-title">KOL任务中心</text>
    </view>

    <view v-if="earnings" class="stats-row">
      <view class="stat-item">
        <text class="stat-val price">¥{{ earnings.totalEarnings.toFixed(2) }}</text>
        <text class="stat-lbl">累计收益</text>
      </view>
      <view class="stat-item">
        <text class="stat-val">{{ earnings.completedTasks }}</text>
        <text class="stat-lbl">完成任务</text>
      </view>
      <view class="stat-item">
        <text class="stat-val accent">{{ earnings.pendingCount }}</text>
        <text class="stat-lbl">待结算</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab', currentTab === 0 ? 'active' : '']" @tap="switchTab(0)">可领任务</text>
      <text :class="['tab', currentTab === 1 ? 'active' : '']" @tap="switchTab(1)">我发布的</text>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    <view v-else-if="tasks.length === 0" class="empty">
      <text>{{ currentTab === 0 ? '暂无可领任务' : '暂无发布任务' }}</text>
    </view>
    <scroll-view v-else scroll-y class="task-list">
      <view v-for="task in tasks" :key="task.id" class="task-card">
        <view class="task-header">
          <text class="task-type">{{ task.typeName }}</text>
          <text class="task-title">{{ task.title }}</text>
        </view>
        <text v-if="task.description" class="task-desc">{{ task.description }}</text>
        <view class="task-footer">
          <view class="task-reward">
            <text class="reward-val">¥{{ task.rewardPerUnit.toFixed(2) }}</text>
            <text class="reward-lbl">每单奖励</text>
          </view>
          <view class="task-progress-info">
            <text class="progress-text">{{ task.completedCount }}/{{ task.targetCount }}</text>
            <text class="progress-lbl">完成进度</text>
          </view>
          <view v-if="task.status === 'open' && currentTab === 0" class="task-action">
            <button class="accept-btn" @tap="acceptTask(task)">领取任务</button>
          </view>
          <view v-else class="task-status">
            <text>{{ task.status === 'completed' ? '已完成' : task.status === 'closed' ? '已关闭' : '进行中' }}</text>
          </view>
        </view>
        <progress :percent="task.targetCount > 0 ? (task.completedCount / task.targetCount * 100) : 0" stroke-width="4" activeColor="#10b981" backgroundColor="#e5e7eb" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header { padding: 32rpx 32rpx 16rpx; }
.header-title { font-size: 44rpx; font-weight: 700; color: #1f2937; }

.stats-row {
  display: flex; padding: 0 32rpx; margin-bottom: 24rpx;
  background: #fff; border-radius: 20rpx; margin-left: 24rpx; margin-right: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 24rpx 0; }
.stat-val { font-size: 40rpx; font-weight: 700; color: #1f2937; &.price { color: #10b981; } &.accent { color: #2563eb; } }
.stat-lbl { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; }

.tab-row { display: flex; padding: 0 32rpx; margin-bottom: 16rpx; }
.tab { font-size: 30rpx; color: #9ca3af; padding-bottom: 12rpx; margin-right: 32rpx; border-bottom: 4rpx solid transparent; &.active { color: #10b981; font-weight: 600; border-bottom-color: #10b981; } }

.loading, .empty { display: flex; justify-content: center; padding: 120rpx 0; color: #9ca3af; font-size: 28rpx; }

.task-list { padding: 0 24rpx; }
.task-card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.task-header { display: flex; align-items: center; margin-bottom: 8rpx; }
.task-type { font-size: 22rpx; color: #fff; background: #10b981; padding: 4rpx 12rpx; border-radius: 8rpx; margin-right: 12rpx; }
.task-title { font-size: 32rpx; font-weight: 600; color: #1f2937; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-desc { font-size: 26rpx; color: #6b7280; margin-bottom: 12rpx; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.task-footer { display: flex; align-items: center; margin-bottom: 12rpx; }
.task-reward, .task-progress-info { margin-right: 32rpx; }
.reward-val { font-size: 34rpx; font-weight: 700; color: #10b981; display: block; }
.reward-lbl, .progress-lbl { font-size: 20rpx; color: #9ca3af; }
.progress-text { font-size: 28rpx; font-weight: 500; color: #1f2937; display: block; }

.accept-btn { font-size: 26rpx; font-weight: 600; background: #10b981; color: #fff; padding: 8rpx 24rpx; border-radius: 24rpx; line-height: 1.4; &::after { border: none; } }
.task-status { font-size: 24rpx; color: #9ca3af; }
</style>
