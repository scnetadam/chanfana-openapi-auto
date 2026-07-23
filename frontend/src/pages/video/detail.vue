<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { videoApi, type VideoItem } from '@/api';

const video = ref<VideoItem | null>(null);
const videoId = ref('');
const isPlaying = ref(false);
const liked = ref(false);

onLoad((query: any) => {
  videoId.value = query.id;
  loadVideo();
});

async function loadVideo() {
  if (!videoId.value) return;
  try {
    const res = await videoApi.detail(videoId.value);
    if (res.success) {
      video.value = res.data;
      await videoApi.view(videoId.value);
    }
  } catch (err: any) {
    console.error('[Video Detail] load error:', err);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
}

function togglePlay() {
  if (!video.value || video.value.status !== 'ready') {
    uni.showToast({ title: '视频未就绪', icon: 'none' });
    return;
  }
  isPlaying.value = !isPlaying.value;
}

async function handleLike() {
  if (!video.value || liked.value) return;
  try {
    const res = await videoApi.like(video.value.id);
    if (res.success && video.value) {
      video.value.stats.likes = res.data.likes;
      liked.value = true;
      uni.showToast({ title: '已点赞', icon: 'success' });
    }
  } catch (err: any) {
    console.error('[Video] like error:', err);
  }
}

async function handleShare() {
  if (!video.value) return;
  try {
    const res = await videoApi.share(video.value.id);
    if (res.success) {
      uni.setClipboardData({
        data: res.data.shareUrl,
        showToast: true,
      });
    }
  } catch (err: any) {
    console.error('[Video] share error:', err);
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleString('zh-CN');
}
</script>

<template>
  <view class="detail-page" v-if="video">
    <view class="video-player">
      <view class="player-wrap" @tap="togglePlay">
        <image
          v-if="video.thumbnail && !isPlaying"
          :src="video.thumbnail"
          mode="aspectFill"
          class="thumbnail"
        />
        <view v-if="!isPlaying" class="play-button">
          <text class="play-icon">▶</text>
        </view>
        <video
          v-if="isPlaying && video.playUrl"
          :src="video.playUrl"
          class="video-element"
          controls
          autoplay
          @error="() => uni.showToast({ title: '播放失败', icon: 'none' })"
        />
        <view class="duration-overlay">{{ formatDuration(video.duration) }}</view>
      </view>
    </view>

    <view class="video-info-section">
      <text class="video-title">{{ video.title }}</text>
      <text class="video-desc">{{ video.description || '暂无描述' }}</text>
      <view class="video-stats">
        <text class="stat-item">👁️ {{ video.stats.views }} 次观看</text>
        <text class="stat-item">❤️ {{ video.stats.likes }} 点赞</text>
        <text class="stat-item">📤 {{ video.stats.shares }} 分享</text>
      </view>
      <text class="video-time">发布于 {{ formatTime(video.createdAt) }}</text>
    </view>

    <view class="action-section">
      <button class="action-btn like" :class="{ active: liked }" @tap="handleLike">
        <text class="btn-icon">{{ liked ? '❤️' : '🤍' }}</text>
        <text class="btn-text">点赞</text>
      </button>
      <button class="action-btn share" @tap="handleShare">
        <text class="btn-icon">📤</text>
        <text class="btn-text">分享</text>
      </button>
    </view>

    <view v-if="video.status === 'processing'" class="status-banner">
      <text class="status-icon">⏳</text>
      <text class="status-text">视频处理中，请稍后再试</text>
    </view>
  </view>

  <view v-else class="loading-page">
    <text class="loading-text">加载中...</text>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.video-player {
  width: 100%;
  background: #000;
}

.player-wrap {
  position: relative;
  width: 100%;
  height: 500rpx;
}

.thumbnail {
  width: 100%;
  height: 100%;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.3);
}

.play-icon {
  font-size: 48rpx;
  color: #2563eb;
  margin-left: 8rpx;
}

.video-element {
  width: 100%;
  height: 100%;
}

.duration-overlay {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  padding: 6rpx 16rpx;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 24rpx;
  border-radius: 8rpx;
}

.video-info-section {
  padding: 30rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.video-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.video-desc {
  display: block;
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.video-stats {
  display: flex;
  gap: 30rpx;
  margin-bottom: 16rpx;
}

.stat-item {
  font-size: 26rpx;
  color: #9ca3af;
}

.video-time {
  font-size: 24rpx;
  color: #d1d5db;
}

.action-section {
  display: flex;
  gap: 20rpx;
  padding: 0 30rpx 30rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 88rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  &::after {
    border: none;
  }

  &.like.active {
    background: #fef2f2;
  }

  .btn-icon {
    font-size: 32rpx;
  }

  .btn-text {
    font-size: 28rpx;
    font-weight: 600;
    color: #1f2937;
  }
}

.status-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 30rpx;
  background: #fef3c7;
  margin: 0 30rpx;
  border-radius: 16rpx;
}

.status-icon {
  font-size: 36rpx;
}

.status-text {
  font-size: 28rpx;
  color: #92400e;
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.loading-text {
  font-size: 28rpx;
  color: #9ca3af;
}
</style>
