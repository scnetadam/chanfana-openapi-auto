<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { complianceApi } from '@/api';
import type { ComplianceCheck } from '@/api';

const loading = ref(true);
const checks = ref<ComplianceCheck[]>([]);
const total = ref(0);
const matchFilter = ref('');
const expandedId = ref('');
const verifyBizRef = ref('');
const verifying = ref(false);

onMounted(async () => {
  await loadChecks();
});

async function loadChecks() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: 1, pageSize: 50 };
    if (matchFilter.value) params.matchStatus = matchFilter.value;
    const res = await complianceApi.threeFlows(params);
    if (res.success) {
      checks.value = res.data.list;
      total.value = res.data.total;
    }
  } catch (e) {
    console.error('[ThreeFlows] load error:', e);
  } finally {
    loading.value = false;
  }
}

function setFilter(v: string) {
  matchFilter.value = v;
  loadChecks();
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? '' : id;
}

async function doVerify() {
  if (!verifyBizRef.value.trim()) {
    uni.showToast({ title: '请输入业务编号', icon: 'none' });
    return;
  }
  verifying.value = true;
  try {
    const res = await complianceApi.verify(verifyBizRef.value.trim());
    if (res.success) {
      const r = res.data;
      const statusMap: Record<string, string> = { matched: '匹配', mismatch: '不匹配', partial: '部分匹配' };
      uni.showToast({ title: `验证结果: ${statusMap[r.matchStatus] || r.matchStatus}`, icon: 'none', duration: 3000 });
      await loadChecks();
    }
  } catch (e) {
    console.error('[ThreeFlows] verify error:', e);
  } finally {
    verifying.value = false;
  }
}

function truncateHash(h: string) {
  return h ? h.slice(0, 10) + '...' : '--';
}

function statusLabel(s: string) {
  const m: Record<string, string> = { matched: '匹配', mismatch: '不匹配', partial: '部分', pending: '待验' };
  return m[s] || s;
}

function statusColor(s: string) {
  const m: Record<string, string> = { matched: '#10b981', mismatch: '#ef4444', partial: '#f59e0b', pending: '#9ca3af' };
  return m[s] || '#9ca3af';
}

function statusBg(s: string) {
  const m: Record<string, string> = { matched: '#ecfdf5', mismatch: '#fef2f2', partial: '#fffbeb', pending: '#f3f4f6' };
  return m[s] || '#f3f4f6';
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">三流合一验证</text>
        <text class="header-sub">业务流 · 资金流 · 票据流</text>
      </view>
    </view>

    <view class="verify-bar card">
      <input class="verify-input" v-model="verifyBizRef" placeholder="输入业务编号(bizRef)" />
      <button class="verify-btn" :disabled="verifying" @tap="doVerify">{{ verifying ? '验证中...' : '手动验证' }}</button>
    </view>

    <view class="filter-row">
      <text :class="['filter', matchFilter === '' ? 'active' : '']" @tap="setFilter('')">全部</text>
      <text :class="['filter', matchFilter === 'matched' ? 'active' : '']" @tap="setFilter('matched')">匹配</text>
      <text :class="['filter', matchFilter === 'mismatch' ? 'active' : '']" @tap="setFilter('mismatch')">不匹配</text>
      <text :class="['filter', matchFilter === 'partial' ? 'active' : '']" @tap="setFilter('partial')">部分</text>
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
    <view v-else-if="checks.length === 0" class="empty-wrap"><text class="empty-text">暂无验证记录</text></view>
    <scroll-view v-else scroll-y class="check-list">
      <view v-for="item in checks" :key="item.checkId" class="check-card card" @tap="toggleExpand(item.checkId)">
        <view class="check-top">
          <view class="check-ids">
            <text class="check-hash">{{ truncateHash(item.bizHash) }}</text>
            <text class="check-flow-id">{{ item.ecnyFlowId ? item.ecnyFlowId.slice(0, 8) + '...' : '--' }}</text>
          </view>
          <view class="check-status" :style="{ color: statusColor(item.matchStatus), background: statusBg(item.matchStatus) }">
            {{ statusLabel(item.matchStatus) }}
          </view>
        </view>
        <view v-if="expandedId === item.checkId" class="check-detail">
          <view class="three-col">
            <view class="flow-col">
              <text class="flow-col-title">业务流</text>
              <text class="flow-col-val">¥{{ item.bizAmount.toFixed(2) }}</text>
            </view>
            <view class="flow-col">
              <text class="flow-col-title">资金流</text>
              <text class="flow-col-val">¥{{ item.flowAmount.toFixed(2) }}</text>
            </view>
            <view class="flow-col">
              <text class="flow-col-title">票据流</text>
              <text class="flow-col-val">¥{{ item.invoiceAmount.toFixed(2) }}</text>
            </view>
          </view>
          <text v-if="item.mismatchDetail" class="mismatch-detail">{{ item.mismatchDetail }}</text>
          <text class="check-time">{{ item.checkTime }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header-card { position: relative; overflow: hidden; }
.header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0A1628, #1a2744); }
.header-content { position: relative; z-index: 1; padding: 48rpx 32rpx 40rpx; }
.header-title { display: block; font-size: 44rpx; font-weight: 700; color: #C9A84C; }
.header-sub { display: block; font-size: 26rpx; color: rgba(201,168,76,0.7); margin-top: 8rpx; }

.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }

.verify-bar { margin: 16rpx 24rpx; display: flex; gap: 16rpx; align-items: center; }
.verify-input { flex: 1; height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.verify-btn { font-size: 26rpx; font-weight: 600; background: #0A1628; color: #C9A84C; padding: 0 28rpx; height: 64rpx; line-height: 64rpx; border-radius: 12rpx; white-space: nowrap; &::after { border: none; } }

.filter-row { display: flex; padding: 0 24rpx; margin-bottom: 16rpx; gap: 12rpx; }
.filter { font-size: 26rpx; color: #9ca3af; padding: 8rpx 24rpx; border-radius: 24rpx; background: #fff; }
.filter.active { color: #C9A84C; font-weight: 600; background: #0A1628; }

.loading-wrap, .empty-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text, .empty-text { font-size: 28rpx; color: #9ca3af; }

.check-list { padding: 0 24rpx; }
.check-card { margin-bottom: 12rpx; }
.check-top { display: flex; justify-content: space-between; align-items: center; }
.check-ids { display: flex; gap: 16rpx; align-items: center; }
.check-hash { font-size: 28rpx; font-weight: 700; color: #0A1628; }
.check-flow-id { font-size: 24rpx; color: #6b7280; }
.check-status { font-size: 22rpx; font-weight: 600; padding: 6rpx 16rpx; border-radius: 8rpx; }

.check-detail { margin-top: 20rpx; padding-top: 20rpx; border-top: 2rpx solid #f3f4f6; }
.three-col { display: flex; gap: 12rpx; }
.flow-col { flex: 1; text-align: center; padding: 16rpx 8rpx; background: #f9fafb; border-radius: 12rpx; }
.flow-col-title { display: block; font-size: 22rpx; color: #9ca3af; margin-bottom: 8rpx; }
.flow-col-val { display: block; font-size: 28rpx; font-weight: 700; color: #1f2937; }
.mismatch-detail { display: block; font-size: 24rpx; color: #ef4444; margin-top: 12rpx; }
.check-time { display: block; font-size: 22rpx; color: #9ca3af; margin-top: 8rpx; }
</style>
