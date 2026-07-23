<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const aiApps = ref([
  {
    id: 'content-gen',
    icon: '✍️',
    name: '智能内容生成',
    desc: 'AI生成多风格汽车文案',
    color: '#2563eb',
    stats: '已生成 1,258 条',
    path: '/pages/ai/content',
  },
  {
    id: 'assistant',
    icon: '🤖',
    name: 'AI智能助手',
    desc: '汽车知识问答顾问',
    color: '#10b981',
    stats: '已回答 3,892 次',
    path: '/pages/ai/assistant',
  },
  {
    id: 'value-assess',
    icon: '📊',
    name: '价值评估',
    desc: 'KOL内容价值分析',
    color: '#8b5cf6',
    stats: '已评估 856 份',
    path: '/pages/ai/value',
  },
  {
    id: 'recommend',
    icon: '🎯',
    name: '智能推荐',
    desc: '活动KOL智能匹配',
    color: '#f59e0b',
    stats: '匹配成功 423 次',
    path: '/pages/ai/recommend',
  },
  {
    id: 'video-gen',
    icon: '🎬',
    name: 'AI视频生成',
    desc: '模板化视频自动生成',
    color: '#ec4899',
    stats: '已生成 234 个',
    path: '/pages/aivideo/index',
  },
  {
    id: 'voice',
    icon: '🎙️',
    name: 'AI语音',
    desc: '语音识别与语音合成',
    color: '#f97316',
    stats: '已处理 567 次',
    path: '/pages/ai/voice',
  },
  {
    id: 'insight',
    icon: '📈',
    name: '数据洞察',
    desc: '推广趋势智能分析',
    color: '#06b6d4',
    stats: '分析报告 156 份',
    path: '/pages/ai/insight',
  },
]);

const recentUsage = ref([
  { time: '刚刚', action: '生成文案', result: '小米SU7试驾体验' },
  { time: '5分钟前', action: '价值评估', result: '内容评分 8.5' },
  { time: '1小时前', action: 'AI问答', result: '续航里程咨询' },
]);

function goToApp(app: any) {
  uni.navigateTo({ url: app.path });
}

function quickAction(type: string) {
  if (type === 'content') {
    uni.navigateTo({ url: '/pages/ai/content' });
  } else if (type === 'assistant') {
    uni.navigateTo({ url: '/pages/ai/assistant' });
  }
}
</script>

<template>
  <view class="ai-app-page">
    <view class="header">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="title">🤖 AI应用中心</text>
        <text class="subtitle">智能赋能 · 效率倍增</text>
      </view>
    </view>

    <view class="quick-actions">
      <view class="quick-item" @tap="quickAction('content')">
        <view class="quick-icon" style="background: linear-gradient(135deg, #2563eb, #1d4ed8);">
          <text>✍️</text>
        </view>
        <text class="quick-text">快速生成</text>
      </view>
      <view class="quick-item" @tap="quickAction('assistant')">
        <view class="quick-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
          <text>🤖</text>
        </view>
        <text class="quick-text">AI助手</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">AI应用</text>
      <view class="app-grid">
        <view
          v-for="app in aiApps"
          :key="app.id"
          class="app-card"
          @tap="goToApp(app)"
        >
          <view class="app-icon" :style="{ background: app.color + '15' }">
            <text>{{ app.icon }}</text>
          </view>
          <text class="app-name">{{ app.name }}</text>
          <text class="app-desc">{{ app.desc }}</text>
          <text class="app-stats">{{ app.stats }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">最近使用</text>
      <view class="usage-list">
        <view v-for="(item, i) in recentUsage" :key="i" class="usage-item">
          <text class="usage-time">{{ item.time }}</text>
          <text class="usage-action">{{ item.action }}</text>
          <text class="usage-result">{{ item.result }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">AI能力统计</text>
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-value">6,640</text>
          <text class="stat-label">总调用次数</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">98.5%</text>
          <text class="stat-label">成功率</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">1.2s</text>
          <text class="stat-label">平均响应</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.ai-app-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40rpx;
}

.header {
  position: relative;
  height: 320rpx;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9);
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 60rpx 30rpx;
  color: #fff;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  opacity: 0.9;
}

.quick-actions {
  display: flex;
  gap: 20rpx;
  padding: 0 24rpx;
  margin: -40rpx 0 24rpx;
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.quick-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  font-size: 36rpx;
  margin-bottom: 12rpx;
}

.quick-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2937;
}

.section {
  padding: 0 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.app-card {
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  font-size: 36rpx;
  margin-bottom: 16rpx;
}

.app-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.app-desc {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
}

.app-stats {
  font-size: 22rpx;
  color: #9ca3af;
}

.usage-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.usage-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.usage-time {
  width: 120rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.usage-action {
  flex: 1;
  font-size: 28rpx;
  color: #1f2937;
}

.usage-result {
  font-size: 24rpx;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30rpx;
  background: #fff;
  border-radius: 16rpx;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #8b5cf6;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #6b7280;
}
</style>
