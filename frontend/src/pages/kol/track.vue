<script setup lang="ts">
import { ref, computed } from 'vue';
import { onMounted } from 'vue';
import { kolTrackApi } from '@/api';
import type { KolTrackDef, KolTrackResult, KolTrackDistribution, KolTrackConfig } from '@/api';
import { getUserId } from '@/api';

const loading = ref(true);
const trackDefs = ref<Record<string, KolTrackDef>>({});
const currentTrack = ref<KolTrackResult | null>(null);
const distribution = ref<KolTrackDistribution | null>(null);
const configs = ref<Record<string, KolTrackConfig>>({});

const reclassifyTrack = ref('');
const reclassifyReason = ref('');
const reclassifying = ref(false);

const trackList = computed(() => Object.values(trackDefs.value));
const trackEntries = computed(() => Object.entries(trackDefs.value));

const distBars = computed(() => {
  if (!distribution.value) return [];
  const d = distribution.value;
  const total = d.A + d.B + d.C;
  return [
    { track: 'A', count: d.A, pct: total ? (d.A / total * 100).toFixed(1) : '0' },
    { track: 'B', count: d.B, pct: total ? (d.B / total * 100).toFixed(1) : '0' },
    { track: 'C', count: d.C, pct: total ? (d.C / total * 100).toFixed(1) : '0' },
  ];
});

const trackColors: Record<string, string> = { A: '#C9A84C', B: '#0A1628', C: '#6b7280' };

onMounted(async () => {
  const userId = getUserId();
  try {
    const [defsRes, distRes] = await Promise.all([
      kolTrackApi.tracks(),
      kolTrackApi.distribution(),
    ]);
    if (defsRes.success) trackDefs.value = defsRes.data;
    if (distRes.success) distribution.value = distRes.data;

    if (userId) {
      try {
        const curRes = await kolTrackApi.getCurrent(userId);
        if (curRes.success) currentTrack.value = curRes.data;
      } catch (_) {}
    }

    const configPromises = ['A', 'B', 'C'].map(t =>
      kolTrackApi.config(t).then(r => ({ track: t, config: r.success ? r.data : null })).catch(() => ({ track: t, config: null }))
    );
    const configResults = await Promise.all(configPromises);
    configResults.forEach(cr => { if (cr.config) configs.value[cr.track] = cr.config; });
  } catch (e) {
    console.error('[KolTrack] load error:', e);
  } finally {
    loading.value = false;
  }
});

async function doReclassify() {
  if (!reclassifyTrack.value) {
    uni.showToast({ title: '请选择轨别', icon: 'none' });
    return;
  }
  if (!reclassifyReason.value.trim()) {
    uni.showToast({ title: '请输入原因', icon: 'none' });
    return;
  }
  const userId = getUserId();
  if (!userId) {
    uni.showToast({ title: '未登录', icon: 'none' });
    return;
  }
  reclassifying.value = true;
  try {
    const res = await kolTrackApi.reclassify({ userId, newTrack: reclassifyTrack.value, reason: reclassifyReason.value.trim() });
    if (res.success) {
      currentTrack.value = res.data;
      uni.showToast({ title: '重新分类成功', icon: 'success' });
      reclassifyTrack.value = '';
      reclassifyReason.value = '';
    }
  } catch (e) {
    console.error('[KolTrack] reclassify error:', e);
  } finally {
    reclassifying.value = false;
  }
}

function trackBadgeColor(t: string) {
  return trackColors[t] || '#6b7280';
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">KOL轨别管理</text>
        <text class="header-sub">身份分类 · 税务合规 · 自动适配</text>
      </view>
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <view class="section">
        <text class="section-title">轨别说明</text>
        <view class="track-cards">
          <view v-for="def in trackList" :key="def.key" class="track-def-card">
            <view class="track-badge" :style="{ background: trackBadgeColor(def.key) }">
              <text class="track-badge-text">{{ def.key }}</text>
            </view>
            <view class="track-def-info">
              <text class="track-def-label">{{ def.label }}</text>
              <text class="track-def-desc">{{ def.desc }}</text>
              <text class="track-def-tax">{{ def.taxType }} · {{ def.taxRange }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="currentTrack" class="section">
        <text class="section-title">当前轨别</text>
        <view class="card current-card">
          <view class="current-badge" :style="{ background: trackBadgeColor(currentTrack.track) }">
            <text class="current-badge-text">{{ currentTrack.track }}轨</text>
          </view>
          <view class="current-config">
            <text class="current-tax">税种: {{ currentTrack.taxConfig.taxType }}</text>
            <text class="current-rate">预扣率: {{ (currentTrack.taxConfig.withholdingRate * 100).toFixed(1) }}%</text>
            <text class="current-invoice">自开票: {{ currentTrack.taxConfig.selfInvoicing ? '是' : '否' }}</text>
          </view>
          <text class="current-auto">{{ currentTrack.autoClassified ? '自动分类' : '手动分类' }}</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">轨别分布</text>
        <view class="card">
          <view v-for="bar in distBars" :key="bar.track" class="dist-row">
            <text class="dist-label">{{ bar.track }}轨</text>
            <view class="dist-bar-bg">
              <view class="dist-bar-fill" :style="{ width: bar.pct + '%', background: trackBadgeColor(bar.track) }"></view>
            </view>
            <text class="dist-pct">{{ bar.count }}人 ({{ bar.pct }}%)</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">重新分类</text>
        <view class="card reclassify-card">
          <picker :range="['A', 'B', 'C']" @change="e => reclassifyTrack = ['A','B','C'][e.detail.value]">
            <view class="picker-row">
              <text class="picker-label">目标轨别</text>
              <text class="picker-val">{{ reclassifyTrack || '请选择' }}</text>
            </view>
          </picker>
          <input class="reason-input" v-model="reclassifyReason" placeholder="请输入变更原因" />
          <button class="reclassify-btn" :disabled="reclassifying" @tap="doReclassify">{{ reclassifying ? '提交中...' : '提交变更' }}</button>
        </view>
      </view>

      <view class="section">
        <text class="section-title">轨别配置</text>
        <view class="card">
          <view class="config-header">
            <text class="config-hd">轨别</text>
            <text class="config-hd">税种</text>
            <text class="config-hd">预扣率</text>
            <text class="config-hd">自开票</text>
            <text class="config-hd">开票模式</text>
          </view>
          <view v-for="(cfg, track) in configs" :key="track" class="config-row">
            <text class="config-cell accent">{{ track }}</text>
            <text class="config-cell">{{ cfg.taxType }}</text>
            <text class="config-cell">{{ (cfg.withholdingRate * 100).toFixed(1) }}%</text>
            <text class="config-cell">{{ cfg.selfInvoicing ? '是' : '否' }}</text>
            <text class="config-cell">{{ cfg.invoiceMode }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header-card { position: relative; overflow: hidden; }
.header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0A1628, #1a2744); }
.header-content { position: relative; z-index: 1; padding: 48rpx 32rpx 40rpx; }
.header-title { display: block; font-size: 44rpx; font-weight: 700; color: #C9A84C; }
.header-sub { display: block; font-size: 26rpx; color: rgba(201,168,76,0.7); margin-top: 8rpx; }

.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text { font-size: 28rpx; color: #9ca3af; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #1f2937; margin-bottom: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }

.track-cards { display: flex; flex-direction: column; gap: 16rpx; }
.track-def-card { display: flex; align-items: center; gap: 20rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.track-badge { width: 72rpx; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.track-badge-text { color: #fff; font-size: 32rpx; font-weight: 700; }
.track-def-info { flex: 1; }
.track-def-label { display: block; font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 4rpx; }
.track-def-desc { display: block; font-size: 24rpx; color: #6b7280; margin-bottom: 4rpx; }
.track-def-tax { display: block; font-size: 22rpx; color: #C9A84C; font-weight: 600; }

.current-card { display: flex; align-items: center; gap: 20rpx; flex-wrap: wrap; }
.current-badge { padding: 8rpx 24rpx; border-radius: 12rpx; }
.current-badge-text { color: #fff; font-size: 28rpx; font-weight: 700; }
.current-config { flex: 1; display: flex; gap: 16rpx; flex-wrap: wrap; }
.current-tax, .current-rate, .current-invoice { font-size: 24rpx; color: #4b5563; }
.current-auto { font-size: 22rpx; color: #9ca3af; }

.dist-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; &:last-child { margin-bottom: 0; } }
.dist-label { font-size: 26rpx; font-weight: 700; width: 60rpx; color: #1f2937; }
.dist-bar-bg { flex: 1; height: 16rpx; border-radius: 8rpx; background: #e5e7eb; overflow: hidden; }
.dist-bar-fill { height: 100%; border-radius: 8rpx; transition: width 0.3s; }
.dist-pct { font-size: 22rpx; color: #6b7280; width: 140rpx; text-align: right; }

.reclassify-card { display: flex; flex-direction: column; gap: 16rpx; }
.picker-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.picker-label { font-size: 26rpx; color: #6b7280; }
.picker-val { font-size: 26rpx; font-weight: 600; color: #0A1628; }
.reason-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.reclassify-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }

.config-header { display: flex; padding-bottom: 16rpx; border-bottom: 2rpx solid #f3f4f6; margin-bottom: 8rpx; }
.config-hd { flex: 1; font-size: 22rpx; color: #9ca3af; font-weight: 600; }
.config-row { display: flex; padding: 12rpx 0; border-bottom: 2rpx solid #f9fafb; &:last-child { border-bottom: none; } }
.config-cell { flex: 1; font-size: 24rpx; color: #4b5563; }
.config-cell.accent { color: #C9A84C; font-weight: 700; }
</style>
