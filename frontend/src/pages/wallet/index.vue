<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { walletApi, notificationApi } from '@/api';
import { useUserStore } from '@/stores';
import { usePayStore } from '@/stores/pay';

const userStore = useUserStore();
const payStore = usePayStore();

const balance = ref(0);
const reputationScore = ref(0);
const txList = ref<any[]>([]);
const loading = ref(true);
const myInviteCode = ref('');
const hasEarningsReminder = ref(false);
const earningsPending = ref(0);

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  myInviteCode.value = userStore.userId.slice(-6).toUpperCase();
  await loadWallet();
  await checkReminders();
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
    balance.value = 0;
    txList.value = [];
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
    showCancel: false,
  });
}

async function tryX402Pay() {
  const result = await payStore.requestPaidContent();
  if (result) {
    uni.showModal({ title: '支付已确认', content: JSON.stringify(result), showCancel: false });
  }
}

function copyInviteCode() {
  uni.setClipboardData({
    data: myInviteCode.value,
    showToast: true,
  });
}

function shareInviteCode() {
  uni.showActionSheet({
    itemList: ['复制邀请码', '分享到微信', '生成邀请海报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        copyInviteCode();
      } else if (res.tapIndex === 1) {
        uni.showToast({ title: '请在微信中分享', icon: 'none' });
      } else if (res.tapIndex === 2) {
        uni.showToast({ title: '海报功能开发中', icon: 'none' });
      }
    },
  });
}

async function checkReminders() {
  try {
    const res = await notificationApi.loginReminders(userStore.userId);
    if (res.success && res.data.hasEarningsReminder) {
      hasEarningsReminder.value = true;
      earningsPending.value = 0;
      try {
        const er = await notificationApi.earningsReminder({ userId: userStore.userId });
        if (er.success) earningsPending.value = er.data.totalPending;
      } catch (_) {}
    }
  } catch (_) {}
}

function dismissEarningsReminder() {
  hasEarningsReminder.value = false;
}
</script>

<template>
  <view class="wallet-page">
    <!-- Earnings Reminder Popup -->
    <view v-if="hasEarningsReminder" class="earnings-popup">
      <view class="popup-card">
        <text class="popup-title">收益提醒</text>
        <text class="popup-msg">您有 ¥{{ earningsPending.toFixed(2) }} 待结算收益</text>
        <view class="popup-actions">
          <button class="popup-btn" @tap="() => { hasEarningsReminder = false; uni.navigateTo({ url: '/pages/settlement/index' }) }">查看结算</button>
          <button class="popup-btn dismiss" @tap="dismissEarningsReminder">稍后</button>
        </view>
      </view>
    </view>

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

    <view class="invite-section">
      <view class="invite-header">
        <text class="invite-title">🎁 邀请好友</text>
        <text class="invite-subtitle">邀请好友注册，双方各得5元推广金</text>
      </view>
      <view class="invite-code-wrap">
        <view class="invite-code-box">
          <text class="invite-label">我的邀请码</text>
          <text class="invite-code">{{ myInviteCode }}</text>
        </view>
        <button class="invite-share-btn" @tap="shareInviteCode">
          <text class="btn-icon">📤</text>
          <text>分享邀请</text>
        </button>
      </view>
    </view>

    <view class="biz-entry" @tap="() => uni.navigateTo({ url: '/pages/biz/index' })">
      <view class="biz-icon">🏢</view>
      <view class="biz-info">
        <text class="biz-title">商家工作台</text>
        <text class="biz-desc">管理活动、任务、结算</text>
      </view>
      <text class="biz-arrow">›</text>
    </view>

    <view class="quick-nav-row">
      <view class="quick-nav-item" @tap="() => uni.navigateTo({ url: '/pages/settlement/weighted' })">
        <text class="qn-icon">📊</text>
        <text class="qn-label">加权结算</text>
      </view>
      <view class="quick-nav-item" @tap="() => uni.navigateTo({ url: '/pages/settlement/valuation' })">
        <text class="qn-icon">💎</text>
        <text class="qn-label">存证估值</text>
      </view>
      <view class="quick-nav-item" @tap="() => uni.navigateTo({ url: '/pages/kol/contract-verify' })">
        <text class="qn-icon">📜</text>
        <text class="qn-label">合同验证</text>
      </view>
      <view class="quick-nav-item" @tap="() => uni.navigateTo({ url: '/pages/compliance/dashboard' })">
        <text class="qn-icon">🛡️</text>
        <text class="qn-label">合规看板</text>
      </view>
    </view>

    <view class="section-header">
      <text class="section-title">交易明细</text>
    </view>
        </view>
      </view>
      <button class="withdraw-btn" @tap="handleWithdraw">
        <text>提现</text>
      </button>
    </view>

    <!-- x402 微支付 -->
    <view class="x402-section">
      <view class="x402-header">
        <text class="x402-title">x402 微支付</text>
        <text class="x402-badge">NEW</text>
      </view>
      <text class="x402-desc">按次付费访问内容，0.01元/次</text>
      <button class="x402-pay-btn" :loading="payStore.paying" :disabled="payStore.paying" @tap="tryX402Pay">
        <text>试一次微支付 (¥0.01)</text>
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
  background: linear-gradient(135deg, #0A1628 0%, #1A2D4A 50%, #0A1628 100%);
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

.invite-section {
  padding: 30rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
}

.invite-header {
  margin-bottom: 24rpx;
}

.invite-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.invite-subtitle {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
}

.invite-code-wrap {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.invite-code-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20rpx;
  background: #f9fafb;
  border-radius: 12rpx;
}

.invite-label {
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 8rpx;
}

.invite-code {
  font-size: 40rpx;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 4rpx;
}

.invite-share-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 30rpx;
  height: 88rpx;
  background: linear-gradient(135deg, #0A1628, #1A2D4A);
  border-radius: 12rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;

  &::after {
    border: none;
  }

  .btn-icon {
    font-size: 28rpx;
  }
}

.biz-entry {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 20rpx;
}

.biz-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.biz-info {
  flex: 1;
}

.biz-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 6rpx;
}

.biz-desc {
  font-size: 24rpx;
  color: #6b7280;
}

.biz-arrow {
  font-size: 40rpx;
  color: #2563eb;
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

/* x402 Section */
.x402-section {
  padding: 28rpx;
  background: #f0f4ff;
  border: 2rpx solid #dbeafe;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}

.x402-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.x402-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e40af;
}

.x402-badge {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 8rpx;
}

.x402-desc {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 16rpx;
}

.x402-pay-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #0A1628, #1A2D4A);
  border-radius: 40rpx;

  &::after { border: none; }
  &[disabled] { opacity: 0.5; }
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

.earnings-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center; }
.popup-card { background: #fff; border-radius: 24rpx; padding: 40rpx; width: 600rpx; text-align: center; }
.popup-title { display: block; font-size: 34rpx; font-weight: 700; color: #1f2937; margin-bottom: 16rpx; }
.popup-msg { display: block; font-size: 28rpx; color: #C9A84C; font-weight: 600; margin-bottom: 32rpx; }
.popup-actions { display: flex; gap: 16rpx; }
.popup-btn { flex: 1; height: 72rpx; line-height: 72rpx; font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; &::after { border: none; } }
.popup-btn.dismiss { background: #f3f4f6; color: #6b7280; }

.quick-nav-row { display: flex; gap: 12rpx; margin-bottom: 24rpx; }
.quick-nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; background: #fff; border-radius: 16rpx; padding: 20rpx 8rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.qn-icon { font-size: 36rpx; }
.qn-label { font-size: 20rpx; color: #4b5563; font-weight: 500; }
</style>
