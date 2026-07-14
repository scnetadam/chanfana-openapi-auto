<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';
import { aiApi } from '@/api';

const userStore = useUserStore();

const insights = ref<any[]>([]);
const overallScore = ref(0);
const kolScore = ref(0);
const spreadScore = ref(0);
const qualityScore = ref(0);
const conversionScore = ref(0);
const totalEarned = ref(0);
const contentCount = ref(0);
const loading = ref(true);

onShow(async () => {
  if (!userStore.isLoggedIn) return;
  await loadDashboard();
});

async function loadDashboard() {
  loading.value = true;
  try {
    const res = await aiApi.valueDashboard(userStore.userId);
    if (res.success && res.data) {
      const d = res.data;
      overallScore.value = d.kolScore || 0;
      kolScore.value = d.kolScore || 0;
      totalEarned.value = d.totalEarned || 0;
      contentCount.value = d.contentCount || 0;
      const b = d.breakdown || {};
      qualityScore.value = b.quality || 0;
      spreadScore.value = b.spread || 0;
      conversionScore.value = b.conversion || 0;
    }
    insights.value = [
      { title: '内容质量', desc: qualityScore.value > 0 ? `质量加权分 ${qualityScore.value}，保持原创提升评分` : '暂无数据，完成任务后将生成AI评估报告', score: qualityScore.value, icon: 'Q', color: '#10b981' },
      { title: '传播力', desc: spreadScore.value > 0 ? `传播加权分 ${spreadScore.value}，互动率越高乘数越大` : '暂无数据', score: spreadScore.value, icon: 'S', color: '#2563eb' },
      { title: 'KOL影响力', desc: kolScore.value > 0 ? `KOL评分 ${kolScore.value}，影响推广金乘数` : '暂无数据', score: kolScore.value, icon: 'K', color: '#f59e0b' },
      { title: '转化率', desc: conversionScore.value > 0 ? `转化加权分 ${conversionScore.value}，试驾预约带动收益` : '暂无数据', score: conversionScore.value, icon: 'C', color: '#ef4444' },
    ];
  } catch (e: any) {
    console.error('[AiDashboard] load error:', e.message);
    insights.value = [
      { title: '内容质量', desc: '暂无数据，完成任务后将生成AI评估报告', score: 0, icon: 'Q', color: '#10b981' },
      { title: '传播力', desc: '暂无数据', score: 0, icon: 'S', color: '#2563eb' },
      { title: 'KOL影响力', desc: '暂无数据', score: 0, icon: 'K', color: '#f59e0b' },
      { title: '转化率', desc: '暂无数据', score: 0, icon: 'C', color: '#ef4444' },
    ];
  } finally {
    loading.value = false;
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="header-title">AI运营评估</text>
      <text class="header-sub">龟钮印证实时加权值引擎</text>
    </view>

    <view v-if="loading" class="loading"><text>分析中...</text></view>

    <view v-else>
      <view class="quick-stats">
        <view class="qs-item">
          <text class="qs-val gold">¥{{ totalEarned.toFixed(2) }}</text>
          <text class="qs-lbl">累计收益</text>
        </view>
        <view class="qs-item">
          <text class="qs-val">{{ contentCount }}</text>
          <text class="qs-lbl">内容数</text>
        </view>
        <view class="qs-item">
          <text class="qs-val accent">{{ kolScore }}</text>
          <text class="qs-lbl">KOL评分</text>
        </view>
      </view>

      <view class="score-ring">
        <text class="score-val" :style="{ color: getScoreColor(overallScore) }">{{ overallScore }}</text>
        <text class="score-lbl">综合评分</text>
      </view>

      <view class="insight-list">
        <view v-for="(item, idx) in insights" :key="idx" class="insight-card">
          <view class="insight-left">
            <view class="insight-icon" :style="{ background: item.color }">
              <text class="icon-text">{{ item.icon }}</text>
            </view>
          </view>
          <view class="insight-right">
            <view class="insight-top">
              <text class="insight-title">{{ item.title }}</text>
              <text class="insight-score" :style="{ color: getScoreColor(item.score) }">{{ item.score }}分</text>
            </view>
            <text class="insight-desc">{{ item.desc }}</text>
            <progress :percent="item.score" stroke-width="4" :activeColor="item.color" backgroundColor="#e5e7eb" />
          </view>
        </view>
      </view>

      <view class="tips-section">
        <text class="tips-title">AI运营建议</text>
        <view class="tip-card">
          <text class="tip-text">1. 保持每日至少1条原创内容发布，提升内容质量分</text>
        </view>
        <view class="tip-card">
          <text class="tip-text">2. 增加与粉丝互动频次，提升传播力加权值</text>
        </view>
        <view class="tip-card">
          <text class="tip-text">3. 选择与个人品牌契合的KOL任务，转化率更高</text>
        </view>
        <view class="tip-card">
          <text class="tip-text">4. 龟钮印证存证内容可提升0.15x乘数奖励</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header { padding: 32rpx 32rpx 8rpx; }
.header-title { font-size: 44rpx; font-weight: 700; color: #1f2937; display: block; }
.header-sub { font-size: 24rpx; color: #9ca3af; margin-top: 4rpx; display: block; }

.loading { display: flex; justify-content: center; padding: 120rpx 0; color: #9ca3af; }

.quick-stats { display: flex; padding: 0 24rpx; margin-bottom: 16rpx; gap: 12rpx; }
.qs-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 24rpx 0; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02); }
.qs-val { font-size: 34rpx; font-weight: 700; color: #1f2937; &.gold { color: #d97706; } &.accent { color: #2563eb; } }
.qs-lbl { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; }

.score-ring { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0; margin: 0 24rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.score-val { font-size: 96rpx; font-weight: 800; }
.score-lbl { font-size: 26rpx; color: #9ca3af; margin-top: 8rpx; }

.insight-list { padding: 24rpx; }
.insight-card { display: flex; padding: 24rpx; background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.02); }
.insight-left { margin-right: 20rpx; }
.insight-icon { width: 72rpx; height: 72rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.icon-text { color: #fff; font-size: 32rpx; font-weight: 700; }
.insight-right { flex: 1; }
.insight-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.insight-title { font-size: 30rpx; font-weight: 600; color: #1f2937; }
.insight-score { font-size: 28rpx; font-weight: 700; }
.insight-desc { font-size: 24rpx; color: #6b7280; margin-bottom: 12rpx; line-height: 1.4; }

.tips-section { padding: 0 24rpx; }
.tips-title { font-size: 32rpx; font-weight: 600; color: #1f2937; margin-bottom: 16rpx; display: block; }
.tip-card { background: #fff; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 12rpx; }
.tip-text { font-size: 26rpx; color: #4b5563; line-height: 1.5; }
</style>
