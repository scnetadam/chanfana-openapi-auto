<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { contentApi, aiApi } from '@/api';
import { useUserStore, useContentStore, useActivityStore } from '@/stores';

const userStore = useUserStore();
const contentStore = useContentStore();
const activityStore = useActivityStore();

const text = ref('');
const images = ref<string[]>([]);
const publishing = ref(false);
const aiGenerating = ref(false);
const aiDrafts = ref<{ style: string; text: string }[]>([]);
const aiSelectedStyle = ref('');
const aiKeywords = ref('');

onShow(() => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  if (!activityStore.currentActivity) {
    uni.switchTab({ url: '/pages/activity/index' });
  }
});

function chooseImage() {
  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths].slice(0, 9);
    },
  });
}

function removeImage(index: number) {
  images.value.splice(index, 1);
}

async function generateAICopy() {
  const act = activityStore.currentActivity;
  if (!act) {
    uni.showToast({ title: '请先选择活动', icon: 'none' });
    return;
  }
  aiGenerating.value = true;
  aiDrafts.value = [];
  try {
    const res = await aiApi.generateCopy({
      activityId: act.id,
      brand: act.brand,
      model: act.model,
      keywords: aiKeywords.value || undefined,
    });
    if (res.success && res.data.drafts) {
      aiDrafts.value = res.data.drafts;
      if (res.data.drafts.length > 0) {
        aiSelectedStyle.value = res.data.drafts[0].style;
      }
    } else {
      uni.showToast({ title: res.error || 'AI 生成失败', icon: 'none' });
    }
  } catch (err) {
    uni.showToast({ title: 'AI 生成失败，请重试', icon: 'none' });
  } finally {
    aiGenerating.value = false;
  }
}

function selectDraft(draft: { style: string; text: string }) {
  text.value = draft.text;
  aiSelectedStyle.value = draft.style;
  aiDrafts.value = [];
}

async function handlePublish() {
  if (!text.value.trim()) {
    uni.showToast({ title: '请填写内容', icon: 'none' });
    return;
  }
  publishing.value = true;
  try {
    const res = await contentApi.publish({
      text: text.value,
      images: images.value,
      activityId: activityStore.currentActivity!.id,
      userId: userStore.userId,
      nickName: userStore.userInfo?.nickName,
    });
    if (res.success) {
      uni.showToast({ title: '发布成功 🎉', icon: 'success' });
      uni.showModal({
        title: '发布成功',
        content: '立即分享，让好友看到你的内容吧！',
        confirmText: '去分享',
        cancelText: '稍后',
        success: (r) => {
          if (r.confirm) {
            uni.navigateTo({ url: `/pages/share/index?id=${res.data.id}` });
          } else {
            uni.switchTab({ url: '/pages/dashboard/index' });
          }
        },
      });
    }
  } catch (err) {
    uni.showToast({ title: '发布失败，请重试', icon: 'none' });
  } finally {
    publishing.value = false;
  }
}

function switchActivity() {
  uni.switchTab({ url: '/pages/activity/index' });
}
</script>

<template>
  <view class="publish-page">
    <!-- 活动信息 -->
    <view class="activity-banner" @tap="switchActivity">
      <view class="ab-info" v-if="activityStore.currentActivity">
        <text class="ab-label">推广活动</text>
        <view class="ab-name-row">
          <text class="ab-brand">{{ activityStore.currentActivity.brand }}</text>
          <text class="ab-model">{{ activityStore.currentActivity.model }}</text>
        </view>
      </view>
      <view class="ab-switch">
        <text class="ab-switch-text">切换</text>
        <text class="ab-arrow">›</text>
      </view>
    </view>

    <!-- 上传图片 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">上传图片</text>
        <text class="section-sub">({{ images.length }}/9，可选)</text>
      </view>
      <view class="image-grid">
        <view v-for="(img, i) in images" :key="i" class="image-item">
          <image :src="img" mode="aspectFill" />
          <view class="remove-btn" @tap="removeImage(i)">
            <text>✕</text>
          </view>
        </view>
        <view v-if="images.length < 9" class="image-upload" @tap="chooseImage">
          <text class="upload-icon">+</text>
          <text class="upload-text">添加图片</text>
        </view>
      </view>
    </view>

    <!-- 内容编辑 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">内容</text>
        <text class="section-sub">{{ text.length }}/2000</text>
      </view>
      <textarea
        v-model="text"
        class="text-input"
        placeholder="分享你的真实用车体验…

例如：今天试驾了小米SU7，加速太猛了！底盘很整，智能化水平是国产天花板..."
        maxlength="2000"
        :auto-height="true"
      />
    </view>

    <!-- AI 文案生成 -->
    <view class="ai-section">
      <view class="ai-header">
        <view class="ai-title-row">
          <text class="ai-title">✨ AI 智能文案</text>
          <text class="ai-badge">NEW</text>
        </view>
        <text class="ai-desc">输入关键词，AI 为你生成3套风格推广文案</text>
      </view>
      <view class="ai-input-row">
        <input
          v-model="aiKeywords"
          class="ai-keywords-input"
          placeholder="关键词（如：续航、加速、智能）"
        />
        <button
          class="ai-gen-btn"
          :loading="aiGenerating"
          :disabled="aiGenerating || !activityStore.currentActivity"
          @tap="generateAICopy"
        >
          <text>{{ aiGenerating ? '生成中...' : '生成文案' }}</text>
        </button>
      </view>
      <view v-if="aiDrafts.length > 0" class="ai-drafts">
        <view
          v-for="(draft, i) in aiDrafts"
          :key="i"
          class="ai-draft-card"
          :class="{ active: aiSelectedStyle === draft.style }"
          @tap="selectDraft(draft)"
        >
          <view class="ad-style-tag">{{ draft.style }}</view>
          <text class="ad-text">{{ draft.text }}</text>
          <view class="ad-action">
            <text class="ad-use">使用此文案 ›</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 技巧提示 -->
    <view class="tips-card">
      <view class="tips-top">
        <text class="tips-emoji">💡</text>
        <text class="tips-title">分享技巧</text>
      </view>
      <view class="tips-body">
        <text class="tips-line">• 真实体验 + 细节描述 = 更高转化</text>
        <text class="tips-line">• 配3张以上清晰图片，阅读率提升 60%</text>
        <text class="tips-line">• 分享到车主群/朋友圈效果最佳</text>
      </view>
    </view>

    <!-- 发布按钮 -->
    <view class="publish-footer">
      <button
        class="publish-btn"
        :loading="publishing"
        :disabled="publishing || !text.trim()"
        @tap="handlePublish"
      >
        <text class="pb-icon">🚀</text>
        <text>发布内容 · 开启追踪</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.publish-page {
  padding: 24rpx;
  padding-bottom: 140rpx;
  min-height: 100vh;
  background: #f0f2f5;
}

/* Activity Banner */
.activity-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 16rpx;
}

.ab-label {
  display: block;
  font-size: 22rpx;
  color: #2563eb;
  margin-bottom: 6rpx;
}

.ab-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.ab-brand {
  font-size: 30rpx;
  font-weight: 700;
  color: #1e40af;
}

.ab-model {
  font-size: 28rpx;
  font-weight: 600;
  color: #3b82f6;
}

.ab-switch {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.ab-switch-text {
  font-size: 26rpx;
  color: #2563eb;
}

.ab-arrow {
  font-size: 32rpx;
  color: #2563eb;
}

/* Section */
.section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.section-sub {
  font-size: 24rpx;
  color: #9ca3af;
}

/* Image Grid */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: 216rpx;
  height: 216rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #e5e7eb;

  image {
    width: 100%;
    height: 100%;
  }
}

.remove-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  font-size: 24rpx;

  text { color: #fff; }
}

.image-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 216rpx;
  height: 216rpx;
  background: #f9fafb;
  border: 2rpx dashed #d1d5db;
  border-radius: 16rpx;
}

.upload-icon {
  font-size: 56rpx;
  color: #9ca3af;
  line-height: 1;
  margin-bottom: 8rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #9ca3af;
}

/* Text Input */
.text-input {
  width: 100%;
  min-height: 280rpx;
  padding: 24rpx;
  font-size: 30rpx;
  line-height: 1.8;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03);
}

/* Tips */
.tips-card {
  padding: 24rpx;
  background: #fefce8;
  border: 2rpx solid #fde68a;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}

.tips-top {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.tips-emoji { font-size: 28rpx; }

.tips-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #92400e;
}

.tips-body { padding-left: 4rpx; }

.tips-line {
  display: block;
  font-size: 24rpx;
  color: #a16207;
  line-height: 1.6;
  margin-bottom: 6rpx;

  &:last-child { margin-bottom: 0; }
}

/* AI Section */
.ai-section {
  padding: 24rpx;
  margin-bottom: 24rpx;
  background: #f0f4ff;
  border: 2rpx solid #dbeafe;
  border-radius: 16rpx;
}

.ai-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}

.ai-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1e40af;
}

.ai-badge {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 8rpx;
}

.ai-desc {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 16rpx;
}

.ai-input-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.ai-keywords-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.ai-gen-btn {
  width: 180rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 12rpx;
  padding: 0;
  text-align: center;

  &::after { border: none; }
  &[disabled] { opacity: 0.5; }
}

.ai-drafts {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.ai-draft-card {
  padding: 20rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  transition: border-color 0.2s;

  &.active {
    border-color: #6366f1;
    box-shadow: 0 2rpx 12rpx rgba(99, 102, 241, 0.15);
  }
}

.ad-style-tag {
  display: inline-block;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.ad-text {
  display: block;
  font-size: 26rpx;
  color: #374151;
  line-height: 1.7;
  margin-bottom: 10rpx;
}

.ad-action {
  text-align: right;
}

.ad-use {
  font-size: 24rpx;
  font-weight: 600;
  color: #6366f1;
}

/* Footer */
.publish-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(0,0,0,0.05);
}

.publish-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.3);

  &::after { border: none; }

  .pb-icon { font-size: 30rpx; }

  &[disabled] {
    opacity: 0.4;
  }
}
</style>
