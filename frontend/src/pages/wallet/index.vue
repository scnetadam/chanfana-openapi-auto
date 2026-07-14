<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { walletApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();

const balance = ref(0);
const reputationScore = ref(0);
const txList = ref<any[]>([]);
const loading = ref(true);

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  await loadWallet();
});

async function loadWallet() {
  loading.value = true;
  try {
    const [balRes, txRes] = await Promise.all([
      walletApi.balance(),
      walletApi.transactions(),
    ]);
    if (balRes.success) {
      balance.value = balRes.data.promotionBalance;
      reputationScore.value = balRes.data.reputationScore;
    }
    if (txRes.success) {
      txList.value = txRes.data.list;
    }
  } catch (e) {
    balance.value = 4.51;
    txList.value = [
      { amount: 0.01, desc: '阅读收益 · 小米SU7', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { amount: 5.00, desc: '试驾预约分成 · 小米SU7', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ];
  } finally {
    loading.value = false;
  }
}

function handleWithdraw() {
  if (balance.value <= 0) {
    uni.showToast({ title: '暂无可用余额', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '提现',
    content: `可提现 ¥${balance.value.toFixed(2)}（v1.0 暂为演示，结算后提现到支付宝）`,
    confirmText: '知道了',
    showCancel: false,
  });
}
</script>

<template>
  <view class="wallet-page">
    <!-- 余额卡片 -->
    <view class="balance-card">
      <view class="bc-bg-pattern"></view>
      <view class="bc-content">
        <text class="bc-label">推广金余额</text>
        <text class="bc-amount">¥{{ balance.toFixed(2) }}</text>
        <view class="bc-meta">
          <view class="bc-meta-item">
            <text class="bc-meta-icon">⭐</text>
            <text class="bc-meta-val">{{ reputationScore }}</text>
            <text class="bc-meta-lbl">口碑值</text>
          </view>
          <view class="bc-meta-divider"></view>
          <view class="bc-meta-item">
            <text class="bc-meta-icon">📊</text>
            <text class="bc-meta-val">{{ txList.length }}</text>
            <text class="bc-meta-lbl">交易笔数</text>
          </view>
        </view>
      </view>
      <button class="withdraw-btn" @tap="handleWithdraw">
        <text>提现</text>
      </button>
    </view>

    <!-- 收益概况 -->
    <view class="summary">
      <text class="summary-title">收益概况</text>
      <view class="summary-grid">
        <view class="summary-item">
          <view class="si-icon blue"><text>👁️</text></view>
          <text class="si-label">阅读收益</text>
          <text class="si-value">¥0.01/次</text>
        </view>
        <view class="summary-item">
          <view class="si-icon gold"><text>📋</text></view>
          <text class="si-label">试驾预约</text>
          <text class="si-value accent">¥5.00/次</text>
        </view>
        <view class="summary-item">
          <view class="si-icon gray"><text>💰</text></view>
          <text class="si-label">提现门槛</text>
          <text class="si-value">¥10.00</text>
        </view>
        <view class="summary-item">
          <view class="si-icon gray"><text>⏱️</text></view>
          <text class="si-label">结算周期</text>
          <text class="si-value">T+3</text>
        </view>
      </view>
    </view>

    <!-- 交易明细 -->
    <view class="tx-section">
      <view class="tx-header">
        <text class="tx-title">交易明细</text>
        <text class="tx-count" v-if="txList.length">共 {{ txList.length }} 条</text>
      </view>

      <view v-if="txList.length === 0" class="empty-tx">
        <text class="empty-icon">📭</text>
        <text>暂无交易记录</text>
      </view>

      <view v-for="(tx, i) in txList" :key="i" class="tx-item">
        <view class="tx-left">
          <text class="tx-desc">{{ tx.desc }}</text>
          <text class="tx-time">{{ (tx.createdAt || '').slice(0, 16).replace('T', ' ') }}</text>
        </view>
        <view class="tx-right">
          <text :class="['tx-amount', tx.amount > 0 ? 'income' : 'outcome']">
            {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toFixed(2) }}
          </text>
          <text class="tx-unit">CNY</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.wallet-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 40rpx;
  background: #f0f2f5;
}

/* Balance Card */
.balance-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 40rpx 30rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e3a8a 100%);
  border-radius: 24rpx;
  color: #fff;
  overflow: hidden;
}

.bc-bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 0%, transparent 50%);
}

.bc-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30rpx;
}

.bc-label {
  font-size: 26rpx;
  opacity: 0.8;
  margin-bottom: 8rpx;
}

.bc-amount {
  font-size: 80rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  margin-bottom: 24rpx;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.bc-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.bc-meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.bc-meta-icon { font-size: 28rpx; opacity: 0.7; }

.bc-meta-val {
  font-size: 26rpx;
  font-weight: 600;
}

.bc-meta-lbl {
  font-size: 22rpx;
  opacity: 0.6;
}

.bc-meta-divider {
  width: 2rpx;
  height: 28rpx;
  background: rgba(255,255,255,0.2);
}

.withdraw-btn {
  position: relative;
  z-index: 1;
  width: 300rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  font-weight: 500;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);

  &::after { border: none; }
}

/* Summary */
.summary {
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.summary-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
  background: #f9fafb;
  border-radius: 14rpx;
}

.si-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  font-size: 30rpx;
  margin-bottom: 12rpx;

  &.blue { background: #eff6ff; }
  &.gold { background: #fefce8; }
  &.gray { background: #f3f4f6; }
}

.si-label {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 4rpx;
}

.si-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2937;

  &.accent { color: #d97706; }
}

/* Transactions */
.tx-section {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

.tx-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.tx-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
}

.tx-count {
  font-size: 24rpx;
  color: #9ca3af;
}

.tx-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child { border-bottom: none; }
}

.tx-left { flex: 1; margin-right: 20rpx; }

.tx-desc {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  margin-bottom: 6rpx;
}

.tx-time {
  font-size: 22rpx;
  color: #d1d5db;
}

.tx-right {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.tx-amount {
  font-size: 34rpx;
  font-weight: 700;

  &.income { color: #10b981; }
  &.outcome { color: #ef4444; }
}

.tx-unit {
  font-size: 20rpx;
  color: #9ca3af;
}

.empty-tx {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  font-size: 26rpx;
  color: #d1d5db;
  gap: 12rpx;

  .empty-icon { font-size: 60rpx; }
}
</style>
