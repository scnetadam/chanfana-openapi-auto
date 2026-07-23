<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { videoApi, type VideoItem } from '@/api';

const videos = ref<VideoItem[]>([]);
const loading = ref(true);

onMounted(async () => {
  await loadVideos();
});

async function loadVideos() {
  try {
    loading.value = true;
    const res = await videoApi.list();
    if (res.success) {
      videos.value = res.data.videos;
    }
  } catch (err: any) {
    console.error('[Video] load error:', err);
  } finally {
    loading.value = false;
  }
}

function goDetail(video: VideoItem) {
  uni.navigateTo({ url: `/pages/video/detail?id=${video.id}` });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
</script>

<template>
  <view class="video-page">
    <view class="header">
      <text class="title">视频中心</text>
      <text class="subtitle">汽车资讯 · 专业评测 · 用车分享</text>
    </view>

    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="videos.length === 0" class="empty-wrap">
      <text class="empty-icon">📹</text>
      <text class="empty-text">暂无视频</text>
      <text class="empty-hint">发布您的第一个视频内容</text>
    </view>

    <view v-else class="video-grid">
      <view
        v-for="video in videos"
        :key="video.id"
        class="video-card"
        @tap="goDetail(video)"
      >
        <view class="video-cover">
          <image
            v-if="video.thumbnail"
            :src="video.thumbnail"
            mode="aspectFill"
            class="cover-image"
          />
          <view v-else class="cover-placeholder">
            <text>🎬</text>
          </view>
          <view class="duration-badge">{{ formatDuration(video.duration) }}</view>
          <view v-if="video.status === 'processing'" class="status-badge processing">处理中</view>
        </view>

        <view class="video-info">
          <text class="video-title">{{ video.title }}</text>
          <view class="video-meta">
            <text class="meta-item">👁️ {{ video.stats.views }}</text>
            <text class="meta-item">❤️ {{ video.stats.likes }}</text>
            <text class="meta-item">{{ formatFileSize(video.fileSize) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.video-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 120rpx;
}

.header {
  padding: 40rpx 30rpx 30rpx;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  opacity: 0.9;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 10rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #9ca3af;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 20rpx;
}

.video-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.video-cover {
  position: relative;
  width: 100%;
  height: 280rpx;
  background: #e5e7eb;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 60rpx;
}

.duration-badge {
  position: absolute;
  bottom: 10rpx;
  right: 10rpx;
  padding: 4rpx 12rpx;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 22rpx;
  border-radius: 6rpx;
}

.status-badge {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  padding: 4rpx 12rpx;
  background: rgba(245, 158, 11, 0.9);
  color: #fff;
  font-size: 22rpx;
  border-radius: 6rpx;

  &.processing {
    background: rgba(245, 158, 11, 0.9);
  }
}

.video-info {
  padding: 16rpx;
}

.video-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-meta {
  display: flex;
  gap: 16rpx;
}

.meta-item {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
