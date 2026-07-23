<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { ecnyApi } from '@/api';
import type { EcnyWallet, EcnyFlow, EcnySplitItem } from '@/api';
import { getUserId } from '@/api';

const activeTab = ref('wallet');

const wallets = ref<EcnyWallet[]>([]);
const flows = ref<EcnyFlow[]>([]);
const flowTotal = ref(0);
const loading = ref(true);

const createType = ref('personal');
const createOwnerId = ref('');
const rechargeWalletId = ref('');
const rechargeAmount = ref('');
const withholdAmount = ref('');
const withholdTipsId = ref('');

const splitParentTradeNo = ref('');
const splitTotalAmount = ref('');
const splitItems = ref<EcnySplitItem[]>([]);
const splitNewParty = ref({ partyId: '', partyType: 'kol', amount: '', walletAddress: '' });

const flowDirection = ref('');
const flowBizType = ref('');

onMounted(async () => {
  await loadWallets();
  await loadFlows();
});

async function loadWallets() {
  try {
    const res = await ecnyApi.flows({ page: 1, pageSize: 1 });
    if (res.success) flowTotal.value = res.data.total;
  } catch (_) {}
  const userId = getUserId();
  if (userId) {
    try {
      const balRes = await ecnyApi.walletBalance(userId);
      if (balRes.success) {
        wallets.value = [{ walletId: balRes.data.walletId, walletType: 'personal', ownerId: userId, balance: balRes.data.balance, status: 'active' }];
      }
    } catch (_) {
      wallets.value = [];
    }
  }
  loading.value = false;
}

async function loadFlows() {
  try {
    const params: Record<string, any> = { page: 1, pageSize: 50 };
    if (flowDirection.value) params.direction = flowDirection.value;
    if (flowBizType.value) params.bizType = flowBizType.value;
    const res = await ecnyApi.flows(params);
    if (res.success) {
      flows.value = res.data.list;
      flowTotal.value = res.data.total;
    }
  } catch (e) {
    console.error('[Ecny] load flows error:', e);
  }
}

async function createWallet() {
  if (!createOwnerId.value.trim()) {
    uni.showToast({ title: '请输入持有者ID', icon: 'none' });
    return;
  }
  try {
    const res = await ecnyApi.createWallet({ walletType: createType.value, ownerId: createOwnerId.value.trim() });
    if (res.success) {
      uni.showToast({ title: '创建成功', icon: 'success' });
      wallets.value.push(res.data);
      createOwnerId.value = '';
    }
  } catch (e) {
    console.error('[Ecny] create error:', e);
  }
}

async function recharge() {
  if (!rechargeWalletId.value.trim() || !rechargeAmount.value) {
    uni.showToast({ title: '请填写钱包ID和金额', icon: 'none' });
    return;
  }
  try {
    const res = await ecnyApi.recharge({ walletId: rechargeWalletId.value.trim(), amount: Number(rechargeAmount.value) });
    if (res.success) {
      uni.showToast({ title: `充值成功 余额: ${res.data.newBalance}`, icon: 'none' });
      rechargeWalletId.value = '';
      rechargeAmount.value = '';
    }
  } catch (e) {
    console.error('[Ecny] recharge error:', e);
  }
}

async function withhold() {
  if (!withholdAmount.value || !withholdTipsId.value.trim()) {
    uni.showToast({ title: '请填写金额和协议ID', icon: 'none' });
    return;
  }
  try {
    const res = await ecnyApi.withhold({ amount: Number(withholdAmount.value), tipsAgreementId: withholdTipsId.value.trim() });
    if (res.success) {
      uni.showToast({ title: `代扣成功 ¥${res.data.amount}`, icon: 'success' });
      withholdAmount.value = '';
      withholdTipsId.value = '';
      await loadFlows();
    }
  } catch (e) {
    console.error('[Ecny] withhold error:', e);
  }
}

function addSplitItem() {
  const n = splitNew.value;
  if (!n.partyId || !n.amount) {
    uni.showToast({ title: '请填写分账方信息', icon: 'none' });
    return;
  }
  splitItems.value.push({ partyId: n.partyId, partyType: n.partyType, amount: Number(n.amount), walletAddress: n.walletAddress });
  splitNew.value = { partyId: '', partyType: 'kol', amount: '', walletAddress: '' };
}

function removeSplitItem(idx: number) {
  splitItems.value.splice(idx, 1);
}

async function doUmbrellaSplit() {
  if (!splitParentTradeNo.value.trim() || !splitTotalAmount.value || splitItems.value.length === 0) {
    uni.showToast({ title: '请完善伞形分账信息', icon: 'none' });
    return;
  }
  try {
    const res = await ecnyApi.umbrellaSplit({
      parentTradeNo: splitParentTradeNo.value.trim(),
      totalAmount: Number(splitTotalAmount.value),
      splits: splitItems.value,
    });
    if (res.success) {
      uni.showToast({ title: `分账成功 ${res.data.flowRecords.length}笔`, icon: 'success' });
      splitParentTradeNo.value = '';
      splitTotalAmount.value = '';
      splitItems.value = [];
      await loadFlows();
    }
  } catch (e) {
    console.error('[Ecny] umbrella split error:', e);
  }
}

function setFlowFilter(dir: string) {
  flowDirection.value = dir;
  loadFlows();
}

function formatDate(d: string) {
  if (!d) return '';
  return d.slice(0, 16).replace('T', ' ');
}

function directionLabel(d: string) {
  return d === 'in' ? '收入' : d === 'out' ? '支出' : d;
}

function directionColor(d: string) {
  return d === 'in' ? '#10b981' : '#ef4444';
}

const splitNew = splitNewParty;
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">e-CNY管理</text>
        <text class="header-sub">数字人民币 · 伞形分账 · 代扣协议</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab', activeTab === 'wallet' ? 'active' : '']" @tap="activeTab = 'wallet'">钱包</text>
      <text :class="['tab', activeTab === 'recharge' ? 'active' : '']" @tap="activeTab = 'recharge'">充值</text>
      <text :class="['tab', activeTab === 'split' ? 'active' : '']" @tap="activeTab = 'split'">伞形分账</text>
      <text :class="['tab', activeTab === 'flows' ? 'active' : '']" @tap="activeTab = 'flows'">流水</text>
      <text :class="['tab', activeTab === 'withhold' ? 'active' : '']" @tap="activeTab = 'withhold'">代扣</text>
    </view>

    <view v-if="activeTab === 'wallet'" class="section">
      <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
      <view v-else-if="wallets.length === 0" class="card empty-hint"><text>暂无钱包</text></view>
      <view v-for="w in wallets" :key="w.walletId" class="card wallet-card">
        <view class="wallet-type-badge">{{ w.walletType }}</view>
        <view class="wallet-info">
          <text class="wallet-balance">¥{{ w.balance.toFixed(2) }}</text>
          <text class="wallet-id">{{ w.walletId }}</text>
        </view>
      </view>

      <view class="card form-card">
        <text class="form-title">创建钱包</text>
        <picker :range="['umbrella_top','umbrella_bottom','personal']" @change="e => createType = ['umbrella_top','umbrella_bottom','personal'][e.detail.value]">
          <view class="picker-row"><text class="picker-label">类型</text><text class="picker-val">{{ createType }}</text></view>
        </picker>
        <input class="form-input" v-model="createOwnerId" placeholder="持有者ID" />
        <button class="form-btn" @tap="createWallet">创建</button>
      </view>
    </view>

    <view v-if="activeTab === 'recharge'" class="section">
      <view class="card form-card">
        <text class="form-title">充值</text>
        <input class="form-input" v-model="rechargeWalletId" placeholder="钱包ID" />
        <input class="form-input" type="digit" v-model="rechargeAmount" placeholder="金额" />
        <button class="form-btn" @tap="recharge">充值</button>
      </view>
    </view>

    <view v-if="activeTab === 'split'" class="section">
      <view class="card form-card">
        <text class="form-title">伞形分账</text>
        <input class="form-input" v-model="splitParentTradeNo" placeholder="父交易号" />
        <input class="form-input" type="digit" v-model="splitTotalAmount" placeholder="总金额" />

        <view class="split-list">
          <view v-for="(s, idx) in splitItems" :key="idx" class="split-item">
            <text class="split-item-info">{{ s.partyId }} · {{ s.partyType }} · ¥{{ s.amount }}</text>
            <text class="split-remove" @tap="removeSplitItem(idx)">移除</text>
          </view>
        </view>

        <view class="split-add-row">
          <input class="form-input sm" v-model="splitNew.partyId" placeholder="分账方ID" />
          <picker :range="['kol','biz','platform']" @change="e => splitNew.partyType = ['kol','biz','platform'][e.detail.value]">
            <view class="mini-picker">{{ splitNew.partyType }}</view>
          </picker>
          <input class="form-input sm" type="digit" v-model="splitNew.amount" placeholder="金额" />
        </view>
        <input class="form-input" v-model="splitNew.walletAddress" placeholder="钱包地址(选填)" />
        <view class="split-actions">
          <button class="form-btn outline" @tap="addSplitItem">添加分账项</button>
          <button class="form-btn" @tap="doUmbrellaSplit">执行分账</button>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'flows'" class="section">
      <view class="filter-row">
        <text :class="['filter', flowDirection === '' ? 'active' : '']" @tap="setFlowFilter('')">全部</text>
        <text :class="['filter', flowDirection === 'in' ? 'active' : '']" @tap="setFlowFilter('in')">收入</text>
        <text :class="['filter', flowDirection === 'out' ? 'active' : '']" @tap="setFlowFilter('out')">支出</text>
      </view>
      <view v-if="flows.length === 0" class="card empty-hint"><text>暂无流水</text></view>
      <view v-for="f in flows" :key="f.flowId" class="card flow-card">
        <view class="flow-top">
          <text class="flow-id">{{ f.flowId.slice(0, 12) }}...</text>
          <text class="flow-amount" :style="{ color: directionColor(f.direction) }">
            {{ f.direction === 'in' ? '+' : '-' }}¥{{ f.amount.toFixed(2) }}
          </text>
        </view>
        <view class="flow-meta">
          <text class="flow-dir">{{ directionLabel(f.direction) }}</text>
          <text class="flow-biz">{{ f.bizType }}</text>
          <text class="flow-status">{{ f.status }}</text>
          <text class="flow-time">{{ formatDate(f.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'withhold'" class="section">
      <view class="card form-card">
        <text class="form-title">代扣</text>
        <input class="form-input" type="digit" v-model="withholdAmount" placeholder="代扣金额" />
        <input class="form-input" v-model="withholdTipsId" placeholder="TIPS协议ID" />
        <button class="form-btn" @tap="withhold">执行代扣</button>
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

.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text { font-size: 28rpx; color: #9ca3af; }
.empty-hint { text-align: center; padding: 32rpx 0; color: #9ca3af; font-size: 26rpx; }

.wallet-card { display: flex; align-items: center; gap: 20rpx; }
.wallet-type-badge { font-size: 22rpx; font-weight: 600; color: #C9A84C; background: #0A1628; padding: 8rpx 20rpx; border-radius: 8rpx; }
.wallet-info { flex: 1; }
.wallet-balance { display: block; font-size: 36rpx; font-weight: 700; color: #1f2937; }
.wallet-id { display: block; font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; }

.form-card { display: flex; flex-direction: column; gap: 12rpx; }
.form-title { font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 4rpx; }
.form-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.form-input.sm { flex: 1; }
.form-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }
.form-btn.outline { background: transparent; color: #0A1628; border: 2rpx solid #0A1628; }

.picker-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.picker-label { font-size: 26rpx; color: #6b7280; }
.picker-val { font-size: 26rpx; font-weight: 600; color: #0A1628; }
.mini-picker { font-size: 24rpx; color: #0A1628; padding: 12rpx 16rpx; background: #f9fafb; border-radius: 8rpx; border: 2rpx solid #e5e7eb; }

.split-list { margin-bottom: 8rpx; }
.split-item { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f9fafb; }
.split-item-info { font-size: 24rpx; color: #4b5563; }
.split-remove { font-size: 22rpx; color: #ef4444; font-weight: 600; }
.split-add-row { display: flex; gap: 8rpx; align-items: center; }
.split-actions { display: flex; gap: 12rpx; margin-top: 8rpx; }

.filter-row { display: flex; padding: 0 24rpx; margin-bottom: 16rpx; gap: 12rpx; }
.filter { font-size: 26rpx; color: #9ca3af; padding: 8rpx 24rpx; border-radius: 24rpx; background: #fff; }
.filter.active { color: #C9A84C; font-weight: 600; background: #0A1628; }

.flow-card { margin-bottom: 12rpx; }
.flow-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.flow-id { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.flow-amount { font-size: 32rpx; font-weight: 700; }
.flow-meta { display: flex; gap: 12rpx; flex-wrap: wrap; }
.flow-dir, .flow-biz, .flow-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; background: #f3f4f6; color: #6b7280; }
.flow-time { font-size: 22rpx; color: #9ca3af; }
</style>
