<script setup lang="ts">
import { ref, computed } from 'vue';
import { onMounted } from 'vue';
import { pageWeightedSettleApi } from '@/api';
import { getUserId } from '@/api';

const activeTab = ref('dashboard');
const loading = ref(true);

const dashboardData = ref<any>(null);
const dimensions = ref<Record<string, { label: string; weight: number; max: number; description: string }>>({});
const realtimeResult = ref<any>(null);
const settleResult = ref<any>(null);

const eventPage = ref('');
const eventProject = ref('deveco');
const realtimeBaseRate = ref(0.01);

const dimEntries = computed(() => Object.entries(dimensions.value));

onMounted(async () => {
  await Promise.all([loadDashboard(), loadDimensions()]);
  loading.value = false;
});

async function loadDashboard() {
  try {
    const res = await pageWeightedSettleApi.dashboard('deveco');
    if (res.success) dashboardData.value = res.data;
  } catch (_) {}
}

async function loadDimensions() {
  try {
    const res = await pageWeightedSettleApi.dimensions();
    if (res.success) dimensions.value = res.data;
  } catch (_) {}
}

async function reportEvent() {
  const userId = getUserId();
  if (!userId || !eventPage.value.trim()) {
    uni.showToast({ title: '请填写页面路径', icon: 'none' });
    return;
  }
  try {
    const res = await pageWeightedSettleApi.reportEvent({
      userId,
      page: eventPage.value.trim(),
      project: eventProject.value,
      visitCount: 1,
      frequency: 1,
      duration: 30,
      interaction: 0.5,
      contentDimension: 0.6,
      depthScore: 0.4,
      shareTrack: 0,
    });
    if (res.success) {
      uni.showToast({ title: `上报成功 权重: ${res.data.weight.toFixed(3)}`, icon: 'none' });
      eventPage.value = '';
      await loadDashboard();
    }
  } catch (e) {
    console.error('[WeightedSettle] report error:', e);
  }
}

async function doRealtime() {
  const userId = getUserId();
  if (!userId) return;
  try {
    const res = await pageWeightedSettleApi.realtime({
      userId,
      project: 'deveco',
      baseRate: realtimeBaseRate.value,
    });
    if (res.success) {
      realtimeResult.value = res.data;
    }
  } catch (e) {
    console.error('[WeightedSettle] realtime error:', e);
  }
}

async function doSettle() {
  const userId = getUserId();
  if (!userId) return;
  try {
    const res = await pageWeightedSettleApi.settle({
      userId,
      project: 'deveco',
      baseRate: realtimeBaseRate.value,
    });
    if (res.success) {
      settleResult.value = res.data;
      uni.showToast({ title: `结算 ¥${res.data.settleAmount.toFixed(4)}`, icon: 'success' });
      await loadDashboard();
    }
  } catch (e) {
    console.error('[WeightedSettle] settle error:', e);
  }
}

function fmtNum(n: number, digits = 2) {
  return n.toFixed(digits);
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">页面加权结算</text>
        <text class="header-sub">7维加权 · 实时结算 · 龟钮点累积</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab', activeTab === 'dashboard' ? 'active' : '']" @tap="activeTab = 'dashboard'">看板</text>
      <text :class="['tab', activeTab === 'report' ? 'active' : '']" @tap="activeTab = 'report'">上报</text>
      <text :class="['tab', activeTab === 'realtime' ? 'active' : '']" @tap="activeTab = 'realtime'">实时</text>
      <text :class="['tab', activeTab === 'settle' ? 'active' : '']" @tap="activeTab = 'settle'">结算</text>
      <text :class="['tab', activeTab === 'weights' ? 'active' : '']" @tap="activeTab = 'weights'">权重</text>
    </view>

    <view v-if="activeTab === 'dashboard'" class="section">
      <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
      <view v-else-if="!dashboardData" class="card empty-hint"><text>暂无数据</text></view>
      <template v-else>
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-val gold">{{ dashboardData.today.events }}</text>
            <text class="stat-lbl">今日事件</text>
          </view>
          <view class="stat-item">
            <text class="stat-val blue">{{ dashboardData.today.uniqueUsers }}</text>
            <text class="stat-lbl">独立用户</text>
          </view>
          <view class="stat-item">
            <text class="stat-val">{{ fmtNum(dashboardData.today.totalWeight, 3) }}</text>
            <text class="stat-lbl">总权重</text>
          </view>
          <view class="stat-item">
            <text class="stat-val green">¥{{ fmtNum(dashboardData.today.estimatedSettlement, 4) }}</text>
            <text class="stat-lbl">预估结算</text>
          </view>
        </view>

        <view class="card" v-if="dashboardData.topPages && dashboardData.topPages.length">
          <text class="card-title">热门页面</text>
          <view v-for="p in dashboardData.topPages" :key="p.page" class="top-row">
            <text class="top-page">{{ p.page }}</text>
            <text class="top-count">{{ p.count }}次</text>
          </view>
        </view>

        <view class="card" v-if="dashboardData.topUsers && dashboardData.topUsers.length">
          <text class="card-title">活跃用户</text>
          <view v-for="u in dashboardData.topUsers" :key="u.userId" class="top-row">
            <text class="top-page">{{ u.userId.slice(0, 8) }}...</text>
            <text class="top-count">{{ fmtNum(u.weight, 3) }}</text>
          </view>
        </view>
      </template>
    </view>

    <view v-if="activeTab === 'report'" class="section">
      <view class="card form-card">
        <text class="form-title">上报页面事件</text>
        <input class="form-input" v-model="eventPage" placeholder="页面路径 (如 /pages/activity/index)" />
        <picker :range="['deveco','seal','guiniu']" @change="e => eventProject = ['deveco','seal','guiniu'][e.detail.value]">
          <view class="picker-row"><text class="picker-label">项目</text><text class="picker-val">{{ eventProject }}</text></view>
        </picker>
        <button class="form-btn" @tap="reportEvent">上报事件</button>
      </view>
    </view>

    <view v-if="activeTab === 'realtime'" class="section">
      <view class="card form-card">
        <text class="form-title">实时结算预览</text>
        <input class="form-input" type="digit" v-model="realtimeBaseRate" placeholder="基础费率" />
        <button class="form-btn" @tap="doRealtime">查询实时</button>
      </view>
      <view v-if="realtimeResult" class="card result-card">
        <view class="result-row"><text class="result-lbl">总权重</text><text class="result-val">{{ fmtNum(realtimeResult.totalWeight, 3) }}</text></view>
        <view class="result-row"><text class="result-lbl">结算金额</text><text class="result-val green">¥{{ fmtNum(realtimeResult.settleAmount, 4) }}</text></view>
        <view class="result-row"><text class="result-lbl">事件数</text><text class="result-val">{{ realtimeResult.eventCount }}</text></view>
        <view v-if="realtimeResult.aggregatedDimensions" class="dim-breakdown">
          <text class="dim-title">维度汇总</text>
          <view v-for="(val, key) in realtimeResult.aggregatedDimensions" :key="key" class="dim-row">
            <text class="dim-key">{{ key }}</text>
            <text class="dim-val">{{ fmtNum(val, 3) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'settle'" class="section">
      <view class="card form-card">
        <text class="form-title">执行结算</text>
        <input class="form-input" type="digit" v-model="realtimeBaseRate" placeholder="基础费率" />
        <button class="form-btn" @tap="doSettle">结算</button>
      </view>
      <view v-if="settleResult" class="card result-card">
        <view class="result-row"><text class="result-lbl">总权重</text><text class="result-val">{{ fmtNum(settleResult.totalWeight, 3) }}</text></view>
        <view class="result-row"><text class="result-lbl">结算金额</text><text class="result-val green">¥{{ fmtNum(settleResult.settleAmount, 4) }}</text></view>
        <view class="result-row"><text class="result-lbl">事件数</text><text class="result-val">{{ settleResult.eventCount }}</text></view>
      </view>
    </view>

    <view v-if="activeTab === 'weights'" class="section">
      <view v-if="dimEntries.length === 0" class="card empty-hint"><text>暂无权重配置</text></view>
      <view v-for="[key, dim] in dimEntries" :key="key" class="card dim-card">
        <view class="dim-header">
          <text class="dim-key-label">{{ dim.label }}</text>
          <text class="dim-weight">{{ (dim.weight * 100).toFixed(0) }}%</text>
        </view>
        <text class="dim-desc">{{ dim.description }}</text>
        <view class="dim-bar-bg">
          <view class="dim-bar-fill" :style="{ width: (dim.weight / dim.max * 100) + '%' }"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header-card { position: relative; overflow: hidden; }
.header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0A1628, #1a2744); }
.header-content { position: relative; z-index: 1; padding: 48rpx 32rpx 40rpx; }
.header-title { display: block; font-size: 44rpx; font-weight: 700; color: #C9A84C; }
.header-sub { display: block; font-size: 26rpx; color: rgba(201,168,76,0.7); margin-top: 8rpx; }

.tab-row { display: flex; padding: 16rpx 24rpx; gap: 8rpx; overflow-x: auto; }
.tab { font-size: 24rpx; color: #9ca3af; padding: 8rpx 20rpx; border-radius: 24rpx; background: #fff; white-space: nowrap; }
.tab.active { color: #C9A84C; font-weight: 600; background: #0A1628; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); margin-bottom: 16rpx; }
.card-title { display: block; font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 16rpx; }
.empty-hint { text-align: center; padding: 32rpx 0; color: #9ca3af; font-size: 26rpx; }
.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text { font-size: 28rpx; color: #9ca3af; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-bottom: 16rpx; }
.stat-item { background: #fff; border-radius: 16rpx; padding: 20rpx; text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.stat-val { display: block; font-size: 32rpx; font-weight: 700; color: #1f2937; }
.stat-val.gold { color: #C9A84C; }
.stat-val.blue { color: #2563eb; }
.stat-val.green { color: #10b981; }
.stat-lbl { display: block; font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; }

.top-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.top-page { font-size: 26rpx; color: #4b5563; }
.top-count { font-size: 26rpx; font-weight: 600; color: #1f2937; }

.form-card { display: flex; flex-direction: column; gap: 12rpx; }
.form-title { font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 4rpx; }
.form-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.form-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }

.picker-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.picker-label { font-size: 26rpx; color: #6b7280; }
.picker-val { font-size: 26rpx; font-weight: 600; color: #0A1628; }

.result-card { margin-top: 16rpx; }
.result-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.result-lbl { font-size: 26rpx; color: #6b7280; }
.result-val { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.result-val.green { color: #10b981; }

.dim-breakdown { margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid #f3f4f6; }
.dim-title { display: block; font-size: 24rpx; font-weight: 600; color: #9ca3af; margin-bottom: 12rpx; }
.dim-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.dim-key { font-size: 24rpx; color: #6b7280; }
.dim-val { font-size: 24rpx; font-weight: 600; color: #1f2937; }

.dim-card { margin-bottom: 12rpx; }
.dim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.dim-key-label { font-size: 28rpx; font-weight: 700; color: #1f2937; }
.dim-weight { font-size: 28rpx; font-weight: 700; color: #C9A84C; }
.dim-desc { display: block; font-size: 24rpx; color: #6b7280; margin-bottom: 12rpx; }
.dim-bar-bg { height: 12rpx; border-radius: 6rpx; background: #e5e7eb; overflow: hidden; }
.dim-bar-fill { height: 100%; border-radius: 6rpx; background: #C9A84C; transition: width 0.3s; }
</style>
