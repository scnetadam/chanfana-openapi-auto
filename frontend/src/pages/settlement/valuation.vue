<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { weightedValuationApi } from '@/api';
import { getUserId } from '@/api';

const activeTab = ref('valuate');
const loading = ref(true);

const valuateEvidenceId = ref('');
const valuateResult = ref<any>(null);
const testPayResult = ref<any>(null);
const evidenceDetail = ref<any>(null);
const statsData = ref<any>(null);
const wDimensions = ref<Record<string, { label: string; weight: number; max: number }>>({});

const metrics = ref({
  viewCount: 100,
  dwellTime: 120,
  purchaseCount: 0,
  shareCount: 5,
  commentCount: 10,
  bookmarkCount: 3,
  reportCount: 0,
  baseValue: 0.01,
});

onMounted(async () => {
  await Promise.all([loadDimensions(), loadStats()]);
  loading.value = false;
});

async function loadDimensions() {
  try {
    const res = await weightedValuationApi.dimensions();
    if (res.success) wDimensions.value = res.data;
  } catch (_) {}
}

async function loadStats() {
  try {
    const res = await weightedValuationApi.stats();
    if (res.success) statsData.value = res.data;
  } catch (_) {}
}

async function doValuate() {
  if (!valuateEvidenceId.value.trim()) {
    uni.showToast({ title: '请输入存证ID', icon: 'none' });
    return;
  }
  try {
    const res = await weightedValuationApi.valuate({
      evidenceId: valuateEvidenceId.value.trim(),
      userId: getUserId() || undefined,
      metrics: { ...metrics.value },
    });
    if (res.success) {
      valuateResult.value = res.data;
      uni.showToast({ title: `估值完成 ¥${res.data.valuation.estimatedValue.toFixed(4)}`, icon: 'none' });
    }
  } catch (e) {
    console.error('[Valuation] valuate error:', e);
  }
}

async function doTestPayment() {
  if (!valuateEvidenceId.value.trim()) {
    uni.showToast({ title: '请输入存证ID', icon: 'none' });
    return;
  }
  try {
    const res = await weightedValuationApi.testPayment({
      evidenceId: valuateEvidenceId.value.trim(),
      userId: getUserId() || undefined,
      valuationAmount: valuateResult.value?.valuation?.estimatedValue,
    });
    if (res.success) {
      testPayResult.value = res.data;
      uni.showToast({ title: '测试支付成功', icon: 'success' });
    }
  } catch (e) {
    console.error('[Valuation] test pay error:', e);
  }
}

async function loadEvidence() {
  if (!valuateEvidenceId.value.trim()) return;
  try {
    const res = await weightedValuationApi.evidence(valuateEvidenceId.value.trim());
    if (res.success) evidenceDetail.value = res.data;
  } catch (_) {}
}

function fmtNum(n: number, d = 2) { return n.toFixed(d); }

const gradeColors: Record<string, string> = { A: '#10b981', B: '#2563eb', C: '#f59e0b', D: '#ef4444', E: '#9ca3af' };
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">存证加权估值</text>
        <text class="header-sub">7维估值 · 品质评级 · 测试支付</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab', activeTab === 'valuate' ? 'active' : '']" @tap="activeTab = 'valuate'">估值</text>
      <text :class="['tab', activeTab === 'testpay' ? 'active' : '']" @tap="activeTab = 'testpay'">测试支付</text>
      <text :class="['tab', activeTab === 'evidence' ? 'active' : '']" @tap="activeTab = 'evidence'">存证查询</text>
      <text :class="['tab', activeTab === 'stats' ? 'active' : '']" @tap="activeTab = 'stats'">统计</text>
    </view>

    <view v-if="activeTab === 'valuate'" class="section">
      <view class="card form-card">
        <text class="form-title">存证估值</text>
        <input class="form-input" v-model="valuateEvidenceId" placeholder="存证ID" />
        <view class="metrics-grid">
          <view class="metric-item">
            <text class="metric-lbl">浏览量</text>
            <input class="metric-input" type="number" v-model="metrics.viewCount" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">停留时长(s)</text>
            <input class="metric-input" type="number" v-model="metrics.dwellTime" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">购买次数</text>
            <input class="metric-input" type="number" v-model="metrics.purchaseCount" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">分享次数</text>
            <input class="metric-input" type="number" v-model="metrics.shareCount" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">评论数</text>
            <input class="metric-input" type="number" v-model="metrics.commentCount" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">收藏数</text>
            <input class="metric-input" type="number" v-model="metrics.bookmarkCount" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">举报数(负)</text>
            <input class="metric-input" type="number" v-model="metrics.reportCount" />
          </view>
          <view class="metric-item">
            <text class="metric-lbl">基础价值</text>
            <input class="metric-input" type="digit" v-model="metrics.baseValue" />
          </view>
        </view>
        <button class="form-btn" @tap="doValuate">估值</button>
      </view>

      <view v-if="valuateResult" class="card result-card">
        <text class="card-title">估值结果</text>
        <view class="result-row">
          <text class="result-lbl">品质评级</text>
          <text class="grade-badge" :style="{ background: gradeColors[valuateResult.valuation.qualityGrade] || '#6b7280' }">{{ valuateResult.valuation.qualityGrade }}</text>
        </view>
        <view class="result-row"><text class="result-lbl">总权重</text><text class="result-val">{{ fmtNum(valuateResult.valuation.totalWeight, 3) }}</text></view>
        <view class="result-row"><text class="result-lbl">估值金额</text><text class="result-val green">¥{{ fmtNum(valuateResult.valuation.estimatedValue, 4) }}</text></view>
        <view v-if="valuateResult.valuation.dimensions" class="dim-breakdown">
          <text class="dim-title">维度权重</text>
          <view v-for="(val, key) in valuateResult.valuation.dimensions" :key="key" class="dim-row">
            <text class="dim-key">{{ key }}</text>
            <text class="dim-val">{{ fmtNum(val, 3) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'testpay'" class="section">
      <view class="card form-card">
        <text class="form-title">测试支付</text>
        <input class="form-input" v-model="valuateEvidenceId" placeholder="存证ID" />
        <button class="form-btn" @tap="doTestPayment">测试支付</button>
      </view>
      <view v-if="testPayResult" class="card result-card">
        <view class="result-row"><text class="result-lbl">支付金额</text><text class="result-val green">¥{{ fmtNum(testPayResult.amount, 4) }}</text></view>
        <view class="result-row"><text class="result-lbl">支付通道</text><text class="result-val">{{ testPayResult.channel }}</text></view>
        <view class="result-row"><text class="result-lbl">类型</text><text class="result-val">{{ testPayResult.type }}</text></view>
        <view class="result-row"><text class="result-lbl">状态</text><text class="result-val">{{ testPayResult.status }}</text></view>
      </view>
    </view>

    <view v-if="activeTab === 'evidence'" class="section">
      <view class="card form-card">
        <text class="form-title">存证查询</text>
        <input class="form-input" v-model="valuateEvidenceId" placeholder="存证ID" />
        <button class="form-btn" @tap="loadEvidence">查询</button>
      </view>
      <view v-if="evidenceDetail" class="card result-card">
        <view class="result-row"><text class="result-lbl">存证ID</text><text class="result-val">{{ evidenceDetail.evidenceId }}</text></view>
        <view class="result-row"><text class="result-lbl">历史估值次数</text><text class="result-val">{{ evidenceDetail.historyCount }}</text></view>
      </view>
    </view>

    <view v-if="activeTab === 'stats'" class="section">
      <view v-if="!statsData" class="card empty-hint"><text>暂无统计</text></view>
      <view v-else class="card">
        <view class="result-row"><text class="result-lbl">总估值次数</text><text class="result-val">{{ statsData.total }}</text></view>
        <view class="result-row"><text class="result-lbl">平均估值</text><text class="result-val green">¥{{ fmtNum(statsData.avgEstimatedValue, 4) }}</text></view>
        <view v-if="statsData.byGrade" class="grade-breakdown">
          <text class="dim-title">品质分布</text>
          <view v-for="(count, grade) in statsData.byGrade" :key="grade" class="grade-row">
            <text class="grade-badge sm" :style="{ background: gradeColors[grade] || '#6b7280' }">{{ grade }}</text>
            <text class="grade-count">{{ count }}次</text>
          </view>
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

.form-card { display: flex; flex-direction: column; gap: 12rpx; }
.form-title { font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 4rpx; }
.form-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.form-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }

.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.metric-item { display: flex; flex-direction: column; gap: 4rpx; }
.metric-lbl { font-size: 22rpx; color: #6b7280; }
.metric-input { height: 56rpx; font-size: 24rpx; padding: 0 16rpx; border: 2rpx solid #e5e7eb; border-radius: 8rpx; background: #f9fafb; }

.result-card { margin-top: 16rpx; }
.result-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.result-lbl { font-size: 26rpx; color: #6b7280; }
.result-val { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.result-val.green { color: #10b981; }

.grade-badge { font-size: 28rpx; font-weight: 700; color: #fff; padding: 4rpx 20rpx; border-radius: 8rpx; }
.grade-badge.sm { font-size: 22rpx; padding: 4rpx 14rpx; }

.dim-breakdown { margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid #f3f4f6; }
.dim-title { display: block; font-size: 24rpx; font-weight: 600; color: #9ca3af; margin-bottom: 12rpx; }
.dim-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.dim-key { font-size: 24rpx; color: #6b7280; }
.dim-val { font-size: 24rpx; font-weight: 600; color: #1f2937; }

.grade-breakdown { margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid #f3f4f6; }
.grade-row { display: flex; align-items: center; gap: 12rpx; padding: 8rpx 0; }
.grade-count { font-size: 24rpx; color: #4b5563; }
</style>
