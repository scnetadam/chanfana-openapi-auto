<script setup lang="ts">
import { ref, computed } from 'vue';
import { onMounted } from 'vue';
import { complianceApi, kolTrackApi } from '@/api';
import type { ComplianceDashboard, ComplianceCheck, ComplianceTrend, KolTrackDistribution } from '@/api';

const loading = ref(true);
const dashboard = ref<ComplianceDashboard | null>(null);
const distribution = ref<KolTrackDistribution | null>(null);
const trends = ref<ComplianceTrend[]>([]);
const mismatches = ref<ComplianceCheck[]>([]);

const totalBizHash = computed(() => dashboard.value?.totalChecks ?? 0);
const matchRate = computed(() => dashboard.value?.matchRate ?? 0);
const mismatchRate = computed(() => dashboard.value?.mismatchRate ?? 0);
const partialRate = computed(() => dashboard.value?.partialRate ?? 0);
const jinshui4Score = computed(() => Math.round((1 - mismatchRate.value / 100) * 100));

const scoreLevel = computed(() => {
  const s = jinshui4Score.value;
  if (s >= 95) return { label: 'A 级', color: '#10b981' };
  if (s >= 85) return { label: 'B 级', color: '#3b82f6' };
  if (s >= 70) return { label: 'C 级', color: '#f59e0b' };
  return { label: 'D 级', color: '#ef4444' };
});

const trackBars = computed(() => {
  if (!distribution.value) return [];
  const d = distribution.value;
  const total = d.A + d.B + d.C;
  return [
    { track: 'A', label: 'A轨·工资薪金', count: d.A, pct: total ? (d.A / total * 100).toFixed(1) : '0', color: '#C9A84C' },
    { track: 'B', label: 'B轨·劳务报酬', count: d.B, pct: total ? (d.B / total * 100).toFixed(1) : '0', color: '#0A1628' },
    { track: 'C', label: 'C轨·经营所得', count: d.C, pct: total ? (d.C / total * 100).toFixed(1) : '0', color: '#6b7280' },
  ];
});

onMounted(async () => {
  try {
    const [dashRes, distRes, trendRes, misRes] = await Promise.all([
      complianceApi.dashboard(),
      kolTrackApi.distribution(),
      complianceApi.trends(),
      complianceApi.mismatches(),
    ]);
    if (dashRes.success) dashboard.value = dashRes.data;
    if (distRes.success) distribution.value = distRes.data;
    if (trendRes.success) trends.value = trendRes.data;
    if (misRes.success) mismatches.value = misRes.data;
  } catch (e) {
    console.error('[ComplianceDashboard] load error:', e);
  } finally {
    loading.value = false;
  }
});

function formatDate(d: string) {
  if (!d) return '';
  return d.slice(0, 16).replace('T', ' ');
}

function truncateHash(h: string) {
  return h ? h.slice(0, 8) + '...' : '--';
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">合规监管看板</text>
        <text class="header-sub">三流合一·金税四期·监管穿透</text>
      </view>
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>

    <template v-else>
      <view class="metrics-grid">
        <view class="metric-card">
          <text class="metric-val">{{ totalBizHash }}</text>
          <text class="metric-lbl">业务Hash数</text>
        </view>
        <view class="metric-card">
          <text class="metric-val">{{ dashboard?.totalChecks ?? 0 }}</text>
          <text class="metric-lbl">e-CNY流水数</text>
        </view>
        <view class="metric-card">
          <text class="metric-val">{{ dashboard?.totalChecks ?? 0 }}</text>
          <text class="metric-lbl">数电票数</text>
        </view>
        <view class="metric-card accent">
          <text class="metric-val">{{ matchRate.toFixed(1) }}%</text>
          <text class="metric-lbl">三流匹配率</text>
        </view>
      </view>

      <view class="section">
        <text class="section-title">KOL轨别分布</text>
        <view class="card track-section">
          <view v-for="bar in trackBars" :key="bar.track" class="track-bar-row">
            <view class="track-bar-info">
              <text class="track-bar-label">{{ bar.label }}</text>
              <text class="track-bar-count">{{ bar.count }}人 ({{ bar.pct }}%)</text>
            </view>
            <view class="track-bar-bg">
              <view class="track-bar-fill" :style="{ width: bar.pct + '%', background: bar.color }"></view>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">合约阈值触发趋势</text>
        <view class="card">
          <view v-if="trends.length === 0" class="empty-hint"><text>暂无触发记录</text></view>
          <view v-for="t in trends" :key="t.month" class="trend-row">
            <text class="trend-month">{{ t.month }}</text>
            <view class="trend-stats">
              <text class="trend-tag ok">匹配 {{ t.matched }}</text>
              <text class="trend-tag err">异常 {{ t.mismatched }}</text>
              <text class="trend-tag dim">总计 {{ t.totalChecks }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">异常预警</text>
        <view class="card">
          <view v-if="mismatches.length === 0" class="empty-hint"><text>暂无异常</text></view>
          <view v-for="m in mismatches" :key="m.checkId" class="alert-row">
            <view class="alert-hash">{{ truncateHash(m.bizHash) }}</view>
            <text class="alert-detail">{{ m.mismatchDetail || '三流不匹配' }}</text>
            <text class="alert-time">{{ formatDate(m.checkTime) }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <text class="section-title">金税四期合规评分</text>
        <view class="card score-card">
          <view class="score-ring" :style="{ borderColor: scoreLevel.color }">
            <text class="score-num" :style="{ color: scoreLevel.color }">{{ jinshui4Score }}</text>
          </view>
          <view class="score-info">
            <text class="score-level" :style="{ color: scoreLevel.color }">{{ scoreLevel.label }}</text>
            <text class="score-desc">合规评分 · 金税四期穿透</text>
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
.header-sub { display: block; font-size: 26rpx; color: rgba(201, 168, 76, 0.7); margin-top: 8rpx; }

.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text { font-size: 28rpx; color: #9ca3af; }

.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; padding: 24rpx; }
.metric-card { background: #fff; border-radius: 16rpx; padding: 28rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }
.metric-card.accent { background: linear-gradient(135deg, #0A1628, #1a2744); }
.metric-card.accent .metric-val { color: #C9A84C; }
.metric-card.accent .metric-lbl { color: rgba(201,168,76,0.7); }
.metric-val { display: block; font-size: 40rpx; font-weight: 700; color: #1f2937; margin-bottom: 8rpx; }
.metric-lbl { display: block; font-size: 22rpx; color: #9ca3af; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #1f2937; margin-bottom: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }

.track-bar-row { margin-bottom: 24rpx; &:last-child { margin-bottom: 0; } }
.track-bar-info { display: flex; justify-content: space-between; margin-bottom: 8rpx; }
.track-bar-label { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.track-bar-count { font-size: 24rpx; color: #6b7280; }
.track-bar-bg { height: 16rpx; border-radius: 8rpx; background: #e5e7eb; overflow: hidden; }
.track-bar-fill { height: 100%; border-radius: 8rpx; transition: width 0.3s; }

.trend-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.trend-month { font-size: 26rpx; color: #1f2937; font-weight: 600; }
.trend-stats { display: flex; gap: 12rpx; }
.trend-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.trend-tag.ok { color: #10b981; background: #ecfdf5; }
.trend-tag.err { color: #ef4444; background: #fef2f2; }
.trend-tag.dim { color: #6b7280; background: #f3f4f6; }

.alert-row { padding: 16rpx 0; border-bottom: 2rpx solid #fef2f2; &:last-child { border-bottom: none; } }
.alert-hash { font-size: 26rpx; font-weight: 700; color: #C9A84C; margin-bottom: 4rpx; }
.alert-detail { font-size: 24rpx; color: #ef4444; display: block; margin-bottom: 4rpx; }
.alert-time { font-size: 22rpx; color: #9ca3af; display: block; }

.empty-hint { text-align: center; padding: 32rpx 0; color: #9ca3af; font-size: 26rpx; }

.score-card { display: flex; align-items: center; gap: 32rpx; }
.score-ring { width: 120rpx; height: 120rpx; border-radius: 50%; border-width: 8rpx; border-style: solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.score-num { font-size: 40rpx; font-weight: 700; }
.score-info { flex: 1; }
.score-level { font-size: 36rpx; font-weight: 700; display: block; margin-bottom: 4rpx; }
.score-desc { font-size: 24rpx; color: #9ca3af; display: block; }
</style>
