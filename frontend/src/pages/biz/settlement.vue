<script setup lang="ts">
import { ref } from 'vue';

const settlements = ref([
  { id: 's1', toUser: 'KOL小王', amount: 500, status: 'pending', createdAt: '2026-07-15' },
  { id: 's2', toUser: '车评达人', amount: 320, status: 'pending', createdAt: '2026-07-14' },
  { id: 's3', toUser: '新能源评测', amount: 200, status: 'completed', createdAt: '2026-07-13' },
]);

function approveSettlement(item: any) {
  uni.showModal({
    title: '确认结算',
    content: `确认向${item.toUser}支付¥${item.amount}？`,
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '已确认', icon: 'success' });
      }
    },
  });
}
</script>

<template>
  <view class="settlement-page">
    <view class="header">
      <text class="title">结算管理</text>
    </view>

    <view class="settlement-list">
      <view v-for="item in settlements" :key="item.id" class="settlement-card">
        <view class="card-header">
          <text class="user-name">{{ item.toUser }}</text>
          <view class="status-tag" :class="item.status">
            {{ item.status === 'pending' ? '待结算' : '已完成' }}
          </view>
        </view>
        <view class="card-body">
          <text class="amount">¥{{ item.amount }}</text>
          <text class="time">{{ item.createdAt }}</text>
        </view>
        <button
          v-if="item.status === 'pending'"
          class="action-btn"
          @tap="approveSettlement(item)"
        >
          确认结算
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settlement-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  padding: 30rpx;
  background: #fff;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
}

.settlement-list {
  padding: 24rpx;
}

.settlement-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;

  &.pending {
    background: #fef3c7;
    color: #d97706;
  }

  &.completed {
    background: #ecfdf5;
    color: #10b981;
  }
}

.card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.amount {
  font-size: 36rpx;
  font-weight: 700;
  color: #f59e0b;
}

.time {
  font-size: 24rpx;
  color: #9ca3af;
}

.action-btn {
  width: 100%;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 36rpx;

  &::after {
    border: none;
  }
}
</style>
