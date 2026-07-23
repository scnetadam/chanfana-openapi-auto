<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const loading = ref(true);
const budgetAccount = ref<any>(null);
const rechargeAmount = ref('');
const showRecharge = ref(false);
const autoRecharge = ref(false);
const rechargeThreshold = ref(100);

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  await loadBudget();
});

async function loadBudget() {
  loading.value = true;
  try {
    budgetAccount.value = {
      id: 'budget_001',
      totalBudget: 10000,
      usedBudget: 3500,
      remainingBudget: 6500,
      status: 'active',
      autoRecharge: false,
      rechargeThreshold: 1000,
      createdAt: '2026-07-01',
    };
  } catch (e) {
    console.error('[BudgetManage] load error:', e);
  } finally {
    loading.value = false;
  }
}

function getUsagePercent() {
  if (!budgetAccount.value) return 0;
  return (budgetAccount.value.usedBudget / budgetAccount.value.totalBudget) * 100;
}

function getStatusColor() {
  const percent = getUsagePercent();
  if (percent >= 80) return '#ff6b6b';
  if (percent >= 50) return '#ffa726';
  return '#4caf50';
}

async function handleRecharge() {
  const amount = parseFloat(rechargeAmount.value);
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }

  try {
    uni.showLoading({ title: '充值中...' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    budgetAccount.value.totalBudget += amount;
    budgetAccount.value.remainingBudget += amount;
    budgetAccount.value.status = 'active';
    
    showRecharge.value = false;
    rechargeAmount.value = '';
    uni.hideLoading();
    uni.showToast({ title: '充值成功', icon: 'success' });
  } catch (e) {
    uni.hideLoading();
    uni.showToast({ title: '充值失败', icon: 'none' });
  }
}

async function configAutoRecharge() {
  try {
    uni.showLoading({ title: '保存中...' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    budgetAccount.value.autoRecharge = autoRecharge.value;
    budgetAccount.value.rechargeThreshold = rechargeThreshold.value;
    
    uni.hideLoading();
    uni.showToast({ title: '配置成功', icon: 'success' });
  } catch (e) {
    uni.hideLoading();
    uni.showToast({ title: '配置失败', icon: 'none' });
  }
}

function formatMoney(amount: number) {
  return amount.toFixed(2);
}
</script>

<template>
  <view class="container">
    <view class="header">
      <text class="title">预算管理</text>
      <text class="subtitle">管理您的数据购买预算</text>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="!budgetAccount" class="empty">
      <text>暂无预算账户</text>
      <button class="create-btn">创建预算账户</button>
    </view>

    <view v-else class="budget-content">
      <view class="budget-card">
        <view class="budget-header">
          <text class="budget-title">预算概览</text>
          <view :class="['status-badge', budgetAccount.status]">
            <text>{{ budgetAccount.status === 'active' ? '正常' : '已耗尽' }}</text>
          </view>
        </view>

        <view class="budget-stats">
          <view class="stat-item">
            <text class="stat-label">总预算</text>
            <text class="stat-value">¥{{ formatMoney(budgetAccount.totalBudget) }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">已使用</text>
            <text class="stat-value used">¥{{ formatMoney(budgetAccount.usedBudget) }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">剩余</text>
            <text class="stat-value remaining">¥{{ formatMoney(budgetAccount.remainingBudget) }}</text>
          </view>
        </view>

        <view class="usage-bar">
          <view class="usage-label">
            <text>使用进度</text>
            <text class="usage-percent">{{ getUsagePercent().toFixed(1) }}%</text>
          </view>
          <view class="progress-bar">
            <view 
              class="progress-fill" 
              :style="{ 
                width: getUsagePercent() + '%',
                backgroundColor: getStatusColor()
              }"
            ></view>
          </view>
        </view>
      </view>

      <view class="action-card">
        <button class="action-btn recharge" @click="showRecharge = true">
          <text class="btn-icon">💰</text>
          <text class="btn-text">充值预算</text>
        </button>
        <button class="action-btn history">
          <text class="btn-icon">📊</text>
          <text class="btn-text">使用记录</text>
        </button>
      </view>

      <view class="config-card">
        <text class="config-title">自动充值配置</text>
        
        <view class="config-item">
          <text class="config-label">启用自动充值</text>
          <switch 
            :checked="autoRecharge" 
            @change="autoRecharge = $event.detail.value"
            color="#667eea"
          />
        </view>

        <view v-if="autoRecharge" class="config-item">
          <text class="config-label">充值阈值（元）</text>
          <input 
            v-model="rechargeThreshold"
            type="number"
            class="config-input"
            placeholder="当剩余预算低于此值时自动充值"
          />
        </view>

        <button class="save-btn" @click="configAutoRecharge">保存配置</button>
      </view>

      <view class="tips-card">
        <text class="tips-title">💡 温馨提示</text>
        <text class="tips-text">• 预算耗尽前1小时会发送提醒</text>
        <text class="tips-text">• 开启自动充值可避免服务中断</text>
        <text class="tips-text">• 预算暂停后数据将停止实时支付</text>
      </view>
    </view>

    <view v-if="showRecharge" class="modal-mask" @click="showRecharge = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">充值预算</text>
        
        <view class="recharge-options">
          <view 
            v-for="amount in [100, 500, 1000, 5000]" 
            :key="amount"
            :class="['recharge-option', rechargeAmount === String(amount) ? 'active' : '']"
            @click="rechargeAmount = String(amount)"
          >
            <text>¥{{ amount }}</text>
          </view>
        </view>

        <input 
          v-model="rechargeAmount"
          type="number"
          class="recharge-input"
          placeholder="或输入自定义金额"
        />

        <view class="modal-actions">
          <button class="cancel-btn" @click="showRecharge = false">取消</button>
          <button class="confirm-btn" @click="handleRecharge">确认充值</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}

.subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 10rpx;
  display: block;
}

.loading, .empty {
  text-align: center;
  padding: 100rpx 0;
}

.create-btn {
  margin-top: 40rpx;
  background: #667eea;
  color: #fff;
}

.budget-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.budget-title {
  font-size: 32rpx;
  font-weight: bold;
}

.status-badge {
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
}

.status-badge.active {
  background: #e8f5e9;
  color: #4caf50;
}

.status-badge.exhausted {
  background: #ffebee;
  color: #f44336;
}

.budget-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30rpx;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 10rpx;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.stat-value.used {
  color: #ffa726;
}

.stat-value.remaining {
  color: #4caf50;
}

.usage-bar {
  margin-top: 20rpx;
}

.usage-label {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.progress-bar {
  height: 20rpx;
  background: #e0e0e0;
  border-radius: 10rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s;
}

.action-card {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.action-btn {
  flex: 1;
  background: #fff;
  border: none;
  padding: 30rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.btn-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.btn-text {
  font-size: 28rpx;
  color: #333;
}

.config-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.config-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 20rpx;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.config-label {
  font-size: 28rpx;
  color: #333;
}

.config-input {
  width: 300rpx;
  padding: 16rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.save-btn {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  width: 100%;
  margin-top: 20rpx;
}

.tips-card {
  background: #fff3e0;
  border-radius: 16rpx;
  padding: 30rpx;
}

.tips-title {
  font-size: 28rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}

.tips-text {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
  width: 600rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
  text-align: center;
  margin-bottom: 30rpx;
}

.recharge-options {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.recharge-option {
  flex: 1;
  min-width: 120rpx;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
}

.recharge-option.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}

.recharge-input {
  width: 100%;
  padding: 20rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  margin-bottom: 30rpx;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.cancel-btn, .confirm-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background: #667eea;
  color: #fff;
}
</style>
