<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { contractParamsApi } from '@/api';
import type { ContractParam, ThresholdCheckResult } from '@/api';

const loading = ref(true);
const params = ref<ContractParam[]>([]);
const scopeFilter = ref('global');
const editingKey = ref('');
const editValue = ref('');

const simUserId = ref('');
const simAmount = ref('');
const simResult = ref<ThresholdCheckResult | null>(null);
const simLoading = ref(false);

onMounted(async () => {
  await loadParams();
});

async function loadParams() {
  loading.value = true;
  try {
    const res = await contractParamsApi.list(scopeFilter.value || undefined);
    if (res.success) params.value = res.data;
  } catch (e) {
    console.error('[ContractParams] load error:', e);
  } finally {
    loading.value = false;
  }
}

function setScope(s: string) {
  scopeFilter.value = s;
  loadParams();
}

function startEdit(p: ContractParam) {
  editingKey.value = p.paramKey;
  editValue.value = String(p.paramValue);
}

function cancelEdit() {
  editingKey.value = '';
  editValue.value = '';
}

async function saveEdit(p: ContractParam) {
  const val = Number(editValue.value);
  if (isNaN(val)) {
    uni.showToast({ title: '请输入有效数值', icon: 'none' });
    return;
  }
  try {
    const res = await contractParamsApi.update(p.paramKey, val, scopeFilter.value !== 'global' ? scopeFilter.value : undefined);
    if (res.success) {
      uni.showToast({ title: '保存成功', icon: 'success' });
      cancelEdit();
      await loadParams();
    }
  } catch (e) {
    console.error('[ContractParams] save error:', e);
  }
}

async function doReset() {
  uni.showModal({
    title: '确认重置',
    content: '将恢复所有参数为默认值，是否继续？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const r = await contractParamsApi.reset();
          if (r.success) {
            uni.showToast({ title: '已重置', icon: 'success' });
            await loadParams();
          }
        } catch (e) {
          console.error('[ContractParams] reset error:', e);
        }
      }
    },
  });
}

async function doSimulate() {
  if (!simUserId.value.trim() || !simAmount.value) {
    uni.showToast({ title: '请填写用户ID和金额', icon: 'none' });
    return;
  }
  simLoading.value = true;
  simResult.value = null;
  try {
    const res = await contractParamsApi.check(simUserId.value.trim(), Number(simAmount.value));
    if (res.success) simResult.value = res.data;
  } catch (e) {
    console.error('[ContractParams] simulate error:', e);
  } finally {
    simLoading.value = false;
  }
}

function scopeLabel(s: string) {
  if (s === 'global') return '全局';
  return s.replace('track_', '').toUpperCase() + '轨';
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">合约阈值配置</text>
        <text class="header-sub">B端管理 · 阈值触发 · 合约参数</text>
      </view>
    </view>

    <view class="scope-row">
      <text :class="['scope-tab', scopeFilter === 'global' ? 'active' : '']" @tap="setScope('global')">全局</text>
      <text :class="['scope-tab', scopeFilter === 'track_A' ? 'active' : '']" @tap="setScope('track_A')">A轨</text>
      <text :class="['scope-tab', scopeFilter === 'track_B' ? 'active' : '']" @tap="setScope('track_B')">B轨</text>
      <text :class="['scope-tab', scopeFilter === 'track_C' ? 'active' : '']" @tap="setScope('track_C')">C轨</text>
    </view>

    <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
    <template v-else>
      <view class="section">
        <view class="card param-table">
          <view class="table-header">
            <text class="th flex2">参数</text>
            <text class="th flex1">当前值</text>
            <text class="th flex1">默认值</text>
            <text class="th flex1">范围</text>
            <text class="th flex1">操作</text>
          </view>
          <view v-for="p in params" :key="p.paramKey" class="table-row">
            <view class="td flex2">
              <text class="param-key">{{ p.paramKey }}</text>
              <text class="param-desc">{{ p.description }}</text>
            </view>
            <template v-if="editingKey === p.paramKey">
              <view class="td flex1 edit-cell">
                <input class="edit-input" type="digit" v-model="editValue" />
              </view>
              <view class="td flex1"><text class="dim-text">{{ p.defaultValue }}</text></view>
              <view class="td flex1"><text class="dim-text">{{ scopeLabel(p.scope) }}</text></view>
              <view class="td flex1 edit-actions">
                <text class="action-link ok" @tap="saveEdit(p)">保存</text>
                <text class="action-link cancel" @tap="cancelEdit">取消</text>
              </view>
            </template>
            <template v-else>
              <view class="td flex1"><text class="val-text">{{ p.paramValue }}</text></view>
              <view class="td flex1"><text class="dim-text">{{ p.defaultValue }}</text></view>
              <view class="td flex1"><text class="dim-text">{{ scopeLabel(p.scope) }}</text></view>
              <view class="td flex1"><text class="action-link edit" @tap="startEdit(p)">编辑</text></view>
            </template>
          </view>
        </view>

        <button class="reset-btn" @tap="doReset">重置为默认值</button>
      </view>

      <view class="section">
        <text class="section-title">阈值模拟器</text>
        <view class="card sim-card">
          <input class="sim-input" v-model="simUserId" placeholder="用户ID" />
          <input class="sim-input" type="digit" v-model="simAmount" placeholder="金额" />
          <button class="sim-btn" :disabled="simLoading" @tap="doSimulate">{{ simLoading ? '计算中...' : '模拟检查' }}</button>
        </view>

        <view v-if="simResult" class="card sim-result">
          <view class="result-row">
            <text class="result-label">轨别</text>
            <text class="result-val accent">{{ simResult.track }}</text>
          </view>
          <view class="result-row">
            <text class="result-label">动作</text>
            <text class="result-val">{{ simResult.thresholdResult.action }}</text>
          </view>
          <view class="result-row">
            <text class="result-label">触发项</text>
            <text class="result-val warn">{{ simResult.thresholdResult.triggered.join(', ') || '无' }}</text>
          </view>
          <view class="result-row">
            <text class="result-label">预扣金额</text>
            <text class="result-val">¥{{ simResult.withholdAmount.toFixed(2) }}</text>
          </view>
          <view class="result-row">
            <text class="result-label">净额</text>
            <text class="result-val ok">¥{{ simResult.netAmount.toFixed(2) }}</text>
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

.scope-row { display: flex; padding: 16rpx 24rpx; gap: 12rpx; }
.scope-tab { font-size: 26rpx; color: #9ca3af; padding: 10rpx 28rpx; border-radius: 24rpx; background: #fff; }
.scope-tab.active { color: #C9A84C; font-weight: 600; background: #0A1628; }

.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text { font-size: 28rpx; color: #9ca3af; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #1f2937; margin-bottom: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); }

.table-header { display: flex; padding-bottom: 16rpx; border-bottom: 2rpx solid #f3f4f6; margin-bottom: 8rpx; }
.th { font-size: 22rpx; color: #9ca3af; font-weight: 600; }
.table-row { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f9fafb; &:last-child { border-bottom: none; } }
.td { font-size: 24rpx; }
.flex1 { flex: 1; }
.flex2 { flex: 2; }

.param-key { display: block; font-size: 24rpx; font-weight: 600; color: #1f2937; }
.param-desc { display: block; font-size: 20rpx; color: #9ca3af; margin-top: 4rpx; }
.val-text { font-weight: 600; color: #0A1628; }
.dim-text { color: #9ca3af; font-size: 22rpx; }
.edit-cell { padding-right: 8rpx; }
.edit-input { width: 100%; height: 48rpx; font-size: 24rpx; padding: 0 12rpx; border: 2rpx solid #C9A84C; border-radius: 8rpx; }
.edit-actions { display: flex; gap: 8rpx; }
.action-link { font-size: 22rpx; font-weight: 600; }
.action-link.edit { color: #3b82f6; }
.action-link.ok { color: #10b981; }
.action-link.cancel { color: #9ca3af; }

.reset-btn { margin-top: 16rpx; font-size: 26rpx; font-weight: 600; background: #fef2f2; color: #ef4444; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }

.sim-card { display: flex; flex-direction: column; gap: 12rpx; }
.sim-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.sim-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }

.sim-result { margin-top: 16rpx; }
.result-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.result-label { font-size: 26rpx; color: #6b7280; }
.result-val { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.result-val.accent { color: #C9A84C; }
.result-val.warn { color: #f59e0b; }
.result-val.ok { color: #10b981; }
</style>
