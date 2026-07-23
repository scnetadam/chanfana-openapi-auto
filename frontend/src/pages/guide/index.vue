<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const currentIndex = ref(0);

const guidePages = [
  {
    icon: '🚗',
    title: '万物自驭',
    desc: '当资讯开始自我定价\n当价值开始自主流转',
    bg: 'linear-gradient(135deg, #0A1628, #1A2D4A)',
  },
  {
    icon: '💰',
    title: '龟钮铸规',
    desc: '执印行权 · 自驭成道\n价值双螺旋自动流转',
    bg: 'linear-gradient(135deg, #00E5A0, #00C98A)',
  },
  {
    icon: '🤖',
    title: '道法自驭',
    desc: 'AI智能体自动执行\nKOL价值精准评估',
    bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  },
];

onLoad(() => {
  const hasShownGuide = uni.getStorageSync('hasShownGuide');
  if (hasShownGuide) {
    const token = uni.getStorageSync('token');
    if (token) {
      uni.switchTab({ url: '/pages/activity/index' });
    } else {
      uni.redirectTo({ url: '/pages/login/index' });
    }
  }
});

function handleNext() {
  if (currentIndex.value < guidePages.length - 1) {
    currentIndex.value += 1;
  } else {
    handleStart();
  }
}

function handleSkip() {
  handleStart();
}

function handleStart() {
  uni.setStorageSync('hasShownGuide', true);
  uni.redirectTo({ url: '/pages/login/index' });
}
</script>

<template>
  <view class="guide-page">
    <swiper
      class="guide-swiper"
      :current="currentIndex"
      :indicator-dots="false"
      :autoplay="false"
      :circular="false"
      @change="(e: any) => currentIndex = e.detail.current"
    >
      <swiper-item v-for="(page, index) in guidePages" :key="index">
        <view class="guide-item" :style="{ background: page.bg }">
          <view class="guide-content">
            <text class="guide-icon">{{ page.icon }}</text>
            <text class="guide-title">{{ page.title }}</text>
            <text class="guide-desc">{{ page.desc }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <view class="guide-dots">
      <view
        v-for="(page, index) in guidePages"
        :key="index"
        class="dot"
        :class="{ active: index === currentIndex }"
      />
    </view>

    <view class="guide-actions">
      <text class="skip-btn" @tap="handleSkip">跳过</text>
      <button class="next-btn" @tap="handleNext">
        {{ currentIndex === guidePages.length - 1 ? '立即体验' : '下一步' }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.guide-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.guide-swiper {
  width: 100%;
  height: 100%;
}

.guide-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.guide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx;
}

.guide-icon {
  font-size: 160rpx;
  margin-bottom: 60rpx;
  filter: drop-shadow(0 8rpx 24rpx rgba(0, 0, 0, 0.2));
}

.guide-title {
  font-size: 56rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 30rpx;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.guide-desc {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  line-height: 1.8;
  white-space: pre-line;
}

.guide-dots {
  position: absolute;
  bottom: 200rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16rpx;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transition: all 0.3s;

  &.active {
    width: 48rpx;
    background: #fff;
    border-radius: 8rpx;
  }
}

.guide-actions {
  position: absolute;
  bottom: 60rpx;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 60rpx;
}

.skip-btn {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.8);
  padding: 20rpx 30rpx;
}

.next-btn {
  min-width: 240rpx;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #0A1628;
  background: #fff;
  border-radius: 44rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);

  &::after {
    border: none;
  }
}
</style>
