<script setup lang="ts">
import { ref } from 'vue';

const products = ref([
  { id: 'p1', title: 'SU7试驾优惠券', type: 'coupon', price: 0, conversions: 156 },
  { id: 'p2', title: '海豹购车抵扣券', type: 'coupon', price: 500, conversions: 89 },
  { id: 'p3', title: 'Model Y专属礼包', type: 'package', price: 1000, conversions: 67 },
]);
</script>

<template>
  <view class="products-page">
    <view class="header">
      <text class="title">商品管理</text>
      <button class="create-btn">
        <text>+ 添加商品</text>
      </button>
    </view>

    <view class="product-list">
      <view v-for="item in products" :key="item.id" class="product-card">
        <view class="product-type">
          {{ item.type === 'coupon' ? '🎫 优惠券' : '📦 礼包' }}
        </view>
        <text class="product-title">{{ item.title }}</text>
        <view class="product-stats">
          <text class="price">{{ item.price > 0 ? `¥${item.price}` : '免费' }}</text>
          <text class="conversions">{{ item.conversions }}次转化</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.products-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: #fff;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
}

.create-btn {
  padding: 0 24rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-radius: 32rpx;

  &::after {
    border: none;
  }
}

.product-list {
  padding: 24rpx;
}

.product-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
}

.product-type {
  display: inline-block;
  padding: 6rpx 16rpx;
  background: #f3f4f6;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 16rpx;
}

.product-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.product-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: 28rpx;
  font-weight: 700;
  color: #f59e0b;
}

.conversions {
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
