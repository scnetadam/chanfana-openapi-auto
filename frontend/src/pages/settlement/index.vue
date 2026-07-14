<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { settlementApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();

const stats = ref<any>(null);
const settlements = ref<any[]>([]);
const loading = ref(true);
const currentFilter = ref('all');

onShow(async () => {
  if (!userStore.isLoggedIn) return;
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const params: any = { userId: userStore.userId, page: 1, pageSize: 50 };
    if (currentFilter.value !== 'all') params.status = currentFilter.value;
    const [statsRes, listRes] = await Promise.all([
      settlementApi.stats(userStore.userId),
      settlementApi.list(params),
    ]);
    if (statsRes.success) stats.value = statsRes.data;
    if (listRes.success) settlements.value = listRes.data.list;
  } catch (e: any) {
    console.error('[Settlement] load error:', e.message);
  } finally {
    loading.value = false;
  }
}

function switchFilter(filter: string) {
  currentFilter.value = filter;
  loadData();
}

async function executeSettlement(item: any) {
  try {
    const res = await settlementApi.execute(item.id);
    if (res.success) {
      uni.showToast({ title: '结算成功！', icon: 'success' });
      await loadData();
    } else {
      uni.showToast({ title: '结算失败', icon: 'none' });
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '结算失败', icon: 'none' });
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = { pending: '待结算', completed: '已完成', failed: '失败', cancelled: '已取消' };
  return map[status] || status;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = { pending: '#f59e0b', completed: '#10b981', failed: '#ef4444', cancelled: '#9ca3af' };
  return map[status] || '#9ca3af';
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="header-title">结算中心</text>
      <text class="header-sub">龟钮印证微交易结算</text>
    </view>

    <view v-if="stats" class="stats-grid">
      <view class="stat-card income">
        <text class="stat-val">¥{{ stats.totalIncome.toFixed(2) }}</text>
        <text class="stat-lbl">总收入</text>
      </view>
      <view class="stat-card expense">
        <text class="stat-val">¥{{ stats.totalExpense.toFixed(2) }}</text>
        <text class="stat-lbl">总支出</text>
      </view>
      <view class="stat-card fee">
        <text class="stat-val">¥{{ stats.totalFee.toFixed(2) }}</text>
        <text class="stat-lbl">手续费(0.6%)</text>
      </view>
      <view class="stat-card pending">
        <text class="stat-val">{{ stats.pendingCount }}</text>
        <text class="stat-lbl">待结算</text>
      </view>
    </view>

    <view class="filter-row">
      <text :class="['filter', currentFilter === 'all' ? 'active' : '']" @tap="switchFilter('all')">全部</text>
      <text :class="['filter', currentFilter === 'pending' ? 'active' : '']" @tap="switchFilter('pending')">待结算</text>
      <text :class="['filter', currentFilter === 'completed' ? 'active' : '']" @tap="switchFilter('completed')">已完成</text>
    </view>

    <view v-if="loading" class="loading"><text>加载中...</text></view>
    <view v-else-if="settlements.length === 0" class="empty"><text>暂无结算记录</text></view>
    <scroll-view v-else scroll-y class="settlement-list">
      <view v-for="item in settlements" :key="item.id" class="settlement-card">
        <view class="settlement-top">
          <view class="settlement-info">
            <text class="settlement-type">{{ item.type || '任务分佣' }}</text>
            <text v-if="item.description" class="settlement-desc">{{ item.description }}</text>
          </view>
          <view class="settlement-amount-row">
            <text :class="['settlement-amount', item.fromUserId === userStore.userId ? 'expense' : 'income']">
              {{ item.fromUserId === userStore.userId ? '-' : '+' }}¥{{ item.netAmount.toFixed(2) }}
            </text>
          </view>
        </view>
        <view class="settlement-bottom">
          <view class="settlement-meta">
            <text class="meta-text">{{ formatDate(item.createdAt) }}</text>
            <text v-if="item.fee > 0" class="meta-fee">手续费 ¥{{ item.fee.toFixed(2) }}</text>
          </view>
          <view class="settlement-right">
            <text v-if="item.hashProof" class="hash-badge">HASH存证</text>
            <text v-if="item.aiVerified" class="ai-badge">AI验证</text>
            <text class="status-badge" :style="{ color: getStatusColor(item.status), borderColor: getStatusColor(item.status) }">{{ getStatusLabel(item.status) }}</text>
            <button v-if="item.status === 'pending' && item.toUserId === userStore.userId" class="exec-btn" @tap="executeSettlement(item)">结算</button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header { padding: 32rpx 32rpx 8rpx; }
.header-title { font-size: 44rpx; font-weight: 700; color: #1f2937; display: block; }
.header-sub { font-size: 24rpx; color: #9ca3af; margin-top: 4rpx; display: block; }

.stats-grid { display: flex; flex-wrap: wrap; padding: 0 24rpx; margin-bottom: 16rpx; gap: 12rpx; }
.stat-card { flex: 1; min-width: 45%; background: #fff; border-radius: 16rpx; padding: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02); }
.stat-card .stat-val { font-size: 34rpx; font-weight: 700; display: block; }
.stat-card .stat-lbl { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; display: block; }
.stat-card.income .stat-val { color: #10b981; }
.stat-card.expense .stat-val { color: #ef4444; }
.stat-card.fee .stat-val { color: #f59e0b; }
.stat-card.pending .stat-val { color: #2563eb; }

.filter-row { display: flex; padding: 0 32rpx; margin-bottom: 16rpx; }
.filter { font-size: 28rpx; color: #9ca3af; padding: 8rpx 24rpx; margin-right: 16rpx; border-radius: 24rpx; background: #fff; &.active { color: #10b981; font-weight: 600; background: #ecfdf5; } }

.loading, .empty { display: flex; justify-content: center; padding: 120rpx 0; color: #9ca3af; font-size: 28rpx; }

.settlement-list { padding: 0 24rpx; }
.settlement-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02); }
.settlement-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12rpx; }
.settlement-info { flex: 1; }
.settlement-type { font-size: 28rpx; font-weight: 600; color: #1f2937; display: block; }
.settlement-desc { font-size: 24rpx; color: #6b7280; margin-top: 4rpx; display: block; }
.settlement-amount { font-size: 36rpx; font-weight: 700; &.income { color: #10b981; } &.expense { color: #ef4444; } }

.settlement-bottom { display: flex; justify-content: space-between; align-items: center; }
.settlement-meta { display: flex; gap: 16rpx; }
.meta-text { font-size: 22rpx; color: #9ca3af; }
.meta-fee { font-size: 22rpx; color: #f59e0b; }
.settlement-right { display: flex; align-items: center; gap: 8rpx; }
.hash-badge { font-size: 20rpx; color: #8b5cf6; background: #f5f3ff; padding: 4rpx 12rpx; border-radius: 8rpx; }
.ai-badge { font-size: 20rpx; color: #2563eb; background: #eff6ff; padding: 4rpx 12rpx; border-radius: 8rpx; }
.status-badge { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; border-width: 2rpx; border-style: solid; }
.exec-btn { font-size: 24rpx; font-weight: 600; background: #10b981; color: #fff; padding: 4rpx 20rpx; border-radius: 20rpx; line-height: 1.6; &::after { border: none; } }
</style>
