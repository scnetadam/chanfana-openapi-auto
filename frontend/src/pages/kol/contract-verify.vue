<script setup lang="ts">
import { ref } from 'vue';
import { contractVerifyApi } from '@/api';
import { getUserId } from '@/api';

const activeTab = ref('verify');
const merchantId = ref('');
const kolUserId = ref('');
const settleAmount = ref('');
const verifyResult = ref<any>(null);
const settleResult = ref<any>(null);
const adjustKolId = ref('');
const adjustSalesInc = ref('');
const adjustQualityDelta = ref('');
const adjustResult = ref<any>(null);
const contractCheckResult = ref<any>(null);

async function doVerify() {
  if (!merchantId.value.trim() || !kolUserId.value.trim()) {
    uni.showToast({ title: '请填写商家ID和KOL ID', icon: 'none' });
    return;
  }
  try {
    const res = await contractVerifyApi.verify({ merchantId: merchantId.value.trim(), kolUserId: kolUserId.value.trim() });
    if (res.success) {
      verifyResult.value = res.data;
      uni.showToast({ title: res.data.verified ? '合同有效' : '无有效合同', icon: res.data.verified ? 'success' : 'none' });
    }
  } catch (e) {
    console.error('[ContractVerify] verify error:', e);
  }
}

async function doSettleWithContract() {
  if (!merchantId.value.trim() || !kolUserId.value.trim() || !settleAmount.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' });
    return;
  }
  try {
    const res = await contractVerifyApi.settleWithContract({
      merchantId: merchantId.value.trim(),
      kolUserId: kolUserId.value.trim(),
      amount: Number(settleAmount.value),
    });
    if (res.success) {
      settleResult.value = res.data;
      uni.showToast({ title: '合同结算成功', icon: 'success' });
    }
  } catch (e) {
    console.error('[ContractVerify] settle error:', e);
  }
}

async function doAdjustWeight() {
  if (!adjustKolId.value.trim()) {
    uni.showToast({ title: '请填写KOL ID', icon: 'none' });
    return;
  }
  try {
    const res = await contractVerifyApi.adjustWeight({
      kolUserId: adjustKolId.value.trim(),
      salesIncrement: adjustSalesInc.value ? Number(adjustSalesInc.value) : undefined,
      qualityDelta: adjustQualityDelta.value ? Number(adjustQualityDelta.value) : undefined,
    });
    if (res.success) {
      adjustResult.value = res.data;
      uni.showToast({ title: `权重调整: ${res.data.direction}`, icon: 'success' });
    }
  } catch (e) {
    console.error('[ContractVerify] adjust error:', e);
  }
}

async function doCheckContract() {
  if (!merchantId.value.trim() || !kolUserId.value.trim()) return;
  try {
    const res = await contractVerifyApi.checkContract(merchantId.value.trim(), kolUserId.value.trim());
    if (res.success) contractCheckResult.value = res.data;
  } catch (e) {
    console.error('[ContractVerify] check error:', e);
  }
}

function directionLabel(d: string) {
  const map: Record<string, string> = { up: '升权', down: '降权', unchanged: '不变' };
  return map[d] || d;
}

function directionColor(d: string) {
  const map: Record<string, string> = { up: '#10b981', down: '#ef4444', unchanged: '#9ca3af' };
  return map[d] || '#9ca3af';
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">雇佣合同验证</text>
        <text class="header-sub">合同验证 · 分账结算 · KOL升降权</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab', activeTab === 'verify' ? 'active' : '']" @tap="activeTab = 'verify'">验证</text>
      <text :class="['tab', activeTab === 'settle' ? 'active' : '']" @tap="activeTab = 'settle'">合同结算</text>
      <text :class="['tab', activeTab === 'adjust' ? 'active' : '']" @tap="activeTab = 'adjust'">升降权</text>
    </view>

    <view v-if="activeTab === 'verify'" class="section">
      <view class="card form-card">
        <text class="form-title">合同验证</text>
        <input class="form-input" v-model="merchantId" placeholder="商家ID" />
        <input class="form-input" v-model="kolUserId" placeholder="KOL用户ID" />
        <view class="btn-row">
          <button class="form-btn flex1" @tap="doVerify">验证合同</button>
          <button class="form-btn outline flex1" @tap="doCheckContract">查询合同</button>
        </view>
      </view>

      <view v-if="verifyResult" class="card result-card">
        <view class="result-row">
          <text class="result-lbl">验证结果</text>
          <text class="verify-badge" :style="{ background: verifyResult.verified ? '#10b981' : '#ef4444' }">{{ verifyResult.verified ? '有效' : '无效' }}</text>
        </view>
        <view v-if="verifyResult.contractId" class="result-row"><text class="result-lbl">合同ID</text><text class="result-val">{{ verifyResult.contractId }}</text></view>
        <view v-if="verifyResult.contractType" class="result-row"><text class="result-lbl">合同类型</text><text class="result-val">{{ verifyResult.contractType }}</text></view>
        <view v-if="verifyResult.commissionRate !== undefined" class="result-row"><text class="result-lbl">佣金比例</text><text class="result-val">{{ (verifyResult.commissionRate * 100).toFixed(1) }}%</text></view>
        <view v-if="verifyResult.reason" class="result-row"><text class="result-lbl">原因</text><text class="result-val">{{ verifyResult.reason }}</text></view>
      </view>

      <view v-if="contractCheckResult" class="card result-card">
        <view class="result-row">
          <text class="result-lbl">查询结果</text>
          <text class="verify-badge" :style="{ background: contractCheckResult.verified ? '#10b981' : '#ef4444' }">{{ contractCheckResult.verified ? '有合同' : '无合同' }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'settle'" class="section">
      <view class="card form-card">
        <text class="form-title">合同结算</text>
        <input class="form-input" v-model="merchantId" placeholder="商家ID" />
        <input class="form-input" v-model="kolUserId" placeholder="KOL用户ID" />
        <input class="form-input" type="digit" v-model="settleAmount" placeholder="结算金额" />
        <button class="form-btn" @tap="doSettleWithContract">合同结算</button>
      </view>

      <view v-if="settleResult" class="card result-card">
        <text class="card-title">结算详情</text>
        <view class="result-row"><text class="result-lbl">结算ID</text><text class="result-val">{{ settleResult.id }}</text></view>
        <view class="result-row"><text class="result-lbl">金额</text><text class="result-val green">¥{{ settleResult.amount.toFixed(2) }}</text></view>

        <view v-if="settleResult.breakdown" class="breakdown">
          <text class="dim-title">分账明细</text>
          <view class="result-row"><text class="result-lbl">KOL份额</text><text class="result-val">¥{{ settleResult.breakdown.kolShare.toFixed(2) }}</text></view>
          <view class="result-row"><text class="result-lbl">商家份额</text><text class="result-val">¥{{ settleResult.breakdown.merchantShare.toFixed(2) }}</text></view>
          <view class="result-row"><text class="result-lbl">平台费</text><text class="result-val">¥{{ settleResult.breakdown.platformFee.toFixed(4) }}</text></view>
          <view class="result-row"><text class="result-lbl">税务预留</text><text class="result-val">¥{{ settleResult.breakdown.taxReserve.toFixed(4) }}</text></view>
        </view>

        <view v-if="settleResult.weightUpdate" class="weight-update">
          <text class="dim-title">权重更新</text>
          <view class="result-row">
            <text class="result-lbl">方向</text>
            <text class="direction-badge" :style="{ color: directionColor(settleResult.weightUpdate.direction) }">{{ directionLabel(settleResult.weightUpdate.direction) }}</text>
          </view>
          <view class="result-row"><text class="result-lbl">旧权重</text><text class="result-val">{{ settleResult.weightUpdate.oldWeight.toFixed(2) }}</text></view>
          <view class="result-row"><text class="result-lbl">新权重</text><text class="result-val">{{ settleResult.weightUpdate.newWeight.toFixed(2) }}</text></view>
        </view>

        <view class="result-row"><text class="result-lbl">状态</text><text class="result-val">{{ settleResult.status }}</text></view>
      </view>
    </view>

    <view v-if="activeTab === 'adjust'" class="section">
      <view class="card form-card">
        <text class="form-title">KOL升降权</text>
        <input class="form-input" v-model="adjustKolId" placeholder="KOL用户ID" />
        <input class="form-input" type="digit" v-model="adjustSalesInc" placeholder="销售增量(选填)" />
        <input class="form-input" type="digit" v-model="adjustQualityDelta" placeholder="品质变化(-0.1~0.1)" />
        <button class="form-btn" @tap="doAdjustWeight">调整权重</button>
      </view>

      <view v-if="adjustResult" class="card result-card">
        <view class="result-row"><text class="result-lbl">KOL ID</text><text class="result-val">{{ adjustResult.kolUserId }}</text></view>
        <view class="result-row">
          <text class="result-lbl">调整方向</text>
          <text class="direction-badge" :style="{ color: directionColor(adjustResult.direction) }">{{ directionLabel(adjustResult.direction) }}</text>
        </view>
        <view class="result-row"><text class="result-lbl">旧权重</text><text class="result-val">{{ adjustResult.oldWeight.toFixed(2) }}</text></view>
        <view class="result-row"><text class="result-lbl">新权重</text><text class="result-val">{{ adjustResult.newWeight.toFixed(2) }}</text></view>
        <view class="result-row"><text class="result-lbl">等级</text><text class="result-val accent">Lv{{ adjustResult.level }}</text></view>
      </view>

      <view class="card info-card">
        <text class="info-title">升降权规则</text>
        <text class="info-text">品质变化范围: -0.1 ~ +0.1</text>
        <text class="info-text">权重范围: 0.1 ~ 10.0</text>
        <text class="info-text">等级范围: Lv1 ~ Lv11</text>
        <text class="info-text">数据品质挂钩: 品质↑则权重↑，品质↓则权重↓</text>
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

.form-card { display: flex; flex-direction: column; gap: 12rpx; }
.form-title { font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 4rpx; }
.form-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.form-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }
.form-btn.outline { background: transparent; color: #0A1628; border: 2rpx solid #0A1628; }
.flex1 { flex: 1; }

.btn-row { display: flex; gap: 12rpx; }

.result-card { margin-top: 16rpx; }
.result-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.result-lbl { font-size: 26rpx; color: #6b7280; }
.result-val { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.result-val.green { color: #10b981; }
.result-val.accent { color: #C9A84C; }

.verify-badge { font-size: 24rpx; font-weight: 700; color: #fff; padding: 4rpx 20rpx; border-radius: 8rpx; }
.direction-badge { font-size: 26rpx; font-weight: 700; }

.breakdown, .weight-update { margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid #f3f4f6; }
.dim-title { display: block; font-size: 24rpx; font-weight: 600; color: #9ca3af; margin-bottom: 12rpx; }

.info-card { background: #fefce8; border: 2rpx solid #fde68a; }
.info-title { display: block; font-size: 26rpx; font-weight: 700; color: #92400e; margin-bottom: 8rpx; }
.info-text { display: block; font-size: 22rpx; color: #a16207; margin-bottom: 4rpx; }
</style>
