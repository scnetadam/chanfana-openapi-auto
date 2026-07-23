<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores';
import { getLoginCode, getUserProfile } from '@/utils/auth';
import { isAlipay } from '@/utils/alipay';

const userStore = useUserStore();
const loading = ref(false);
const nickName = ref('');
const inviteCode = ref('');
const platformName = isAlipay() ? '支付宝' : '微信';

async function handleLogin() {
  if (loading.value) return;
  loading.value = true;
  try {
    const code = await getLoginCode();
    let name = nickName.value.trim();
    let avatar = '';
    try {
      const profile = await getUserProfile();
      if (!name) name = profile.nickName;
      avatar = profile.avatarUrl;
    } catch {}
    if (!name) name = '用户' + Date.now().toString().slice(-4);
    
    const loginData: any = { code, nickName: name, avatarUrl: avatar, platform: isAlipay() ? 'alipay' : 'wechat' };
    if (inviteCode.value.trim()) {
      loginData.inviteCode = inviteCode.value.trim();
    }
    
    await userStore.login(code, name, avatar, isAlipay() ? 'alipay' : 'wechat');
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => uni.switchTab({ url: '/pages/activity/index' }), 500);
  } catch (err: any) {
    console.error('[Login] error:', err);
    uni.showToast({ title: err.errMsg || err.message || '登录失败', icon: 'none', duration: 3000 });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="login-page">
    <view class="bg-arc"></view>

    <view class="login-card">
      <view class="logo-section">
        <image class="logo-image" src="/src/static/images/logo.jpg" mode="aspectFit"></image>
        <text class="app-name">龟钮自驭</text>
        <text class="slogan">汽车资讯 AI · 自主价值引擎</text>
      </view>

      <view class="feature-list">
        <view class="feature-item">
          <view class="fi-icon-wrap" style="background:#eff6ff;">
            <text class="fi-icon">📝</text>
          </view>
          <text class="fi-text">发布真实用车体验</text>
        </view>
        <view class="feature-item">
          <view class="fi-icon-wrap" style="background:#fefce8;">
            <text class="fi-icon">📤</text>
          </view>
          <text class="fi-text">分享赚推广金</text>
        </view>
        <view class="feature-item">
          <view class="fi-icon-wrap" style="background:#ecfdf5;">
            <text class="fi-icon">💰</text>
          </view>
          <text class="fi-text">好友预约试驾你获奖</text>
        </view>
      </view>

      <view class="nickname-section">
        <input
          v-model="nickName"
          class="nickname-input"
          placeholder="昵称（可选，默认使用平台昵称）"
          maxlength="20"
        />
        <input
          v-model="inviteCode"
          class="nickname-input"
          placeholder="邀请码（可选）"
          maxlength="20"
        />
        <button
          class="login-btn"
          :loading="loading"
          :disabled="loading"
          @tap="handleLogin"
        >
          {{ platformName }}授权登录
        </button>
      </view>

      <text class="agreement">
        登录即表示同意
        <text class="link">《用户协议》</text> 和 <text class="link">《隐私政策》</text>
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 60rpx 40rpx;
  background: #ffffff;
  overflow: hidden;
}

.bg-arc {
  position: absolute;
  top: -200rpx;
  left: -100rpx;
  right: -100rpx;
  height: 520rpx;
  background: linear-gradient(135deg, #0A1628, #1A2D4A);
  border-radius: 0 0 50% 50%;
  opacity: 0.95;
}

.login-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600rpx;
  padding: 60rpx 40rpx 50rpx;
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 48rpx rgba(0, 0, 0, 0.08);
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50rpx;
}

.logo-image {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 20rpx;
  border-radius: 24rpx;
}

.app-name {
  font-size: 48rpx;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 4rpx;
  margin-bottom: 12rpx;
}

.slogan {
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.5;
}

.feature-list {
  width: 100%;
  margin-bottom: 50rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f3f4f6;
  &:last-child { border-bottom: none; }
}

.fi-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  margin-right: 20rpx;
}

.fi-icon { font-size: 32rpx; }
.fi-text { font-size: 28rpx; color: #4b5563; font-weight: 500; }

.nickname-section {
  width: 100%;
  margin-bottom: 24rpx;
}

.nickname-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  margin-bottom: 24rpx;
  font-size: 32rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  background: #f9fafb;
}

.login-btn {
  width: 100%;
  height: 100rpx;
  line-height: 100rpx;
  font-size: 34rpx;
  font-weight: 600;
  border-radius: 50rpx;
  background: linear-gradient(135deg, #0A1628, #1A2D4A);
  color: #C9A84C;
  box-shadow: 0 4rpx 16rpx rgba(10, 22, 40, 0.4);
  &::after { border: none; }
}

.agreement {
  font-size: 24rpx;
  color: #d1d5db;
  .link { color: #C9A84C; }
}
</style>
