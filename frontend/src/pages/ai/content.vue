<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { aiApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const loading = ref(false);
const generated = ref(false);

const form = ref({
  brand: '',
  model: '',
  keywords: '',
  style: 'professional',
});

const drafts = ref<any[]>([]);

const styles = [
  { key: 'professional', label: '专业评测', icon: '📊' },
  { key: 'casual', label: '轻松分享', icon: '😊' },
  { key: 'story', label: '故事叙述', icon: '📖' },
  { key: 'comparison', label: '对比分析', icon: '⚖️' },
];

onLoad(() => {
  form.value.brand = '小米汽车';
  form.value.model = 'SU7';
});

async function handleGenerate() {
  if (!form.value.brand || !form.value.model) {
    uni.showToast({ title: '请填写品牌和车型', icon: 'none' });
    return;
  }

  loading.value = true;
  drafts.value = [];

  try {
    const res = await aiApi.generateCopy({
      activityId: 'gen',
      brand: form.value.brand,
      model: form.value.model,
      keywords: form.value.keywords,
      style: form.value.style,
    });

    if (res.success && res.data.drafts) {
      drafts.value = res.data.drafts;
      generated.value = true;
    } else {
      uni.showToast({ title: '生成失败', icon: 'none' });
    }
  } catch (e) {
    console.error('[AI Content] error:', e);
    uni.showToast({ title: '生成失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function useDraft(draft: any) {
  uni.setStorageSync('ai_draft', draft);
  uni.navigateTo({ url: '/pages/publish/index?from=ai' });
}

function copyDraft(draft: any) {
  uni.setClipboardData({
    data: draft.text,
    showToast: true,
  });
}

function selectStyle(key: string) {
  form.value.style = key;
}
</script>

<template>
  <view class="content-gen-page">
    <view class="header">
      <text class="title">✍️ 智能内容生成</text>
      <text class="subtitle">AI生成多风格汽车文案</text>
    </view>

    <view class="form-section">
      <view class="form-group">
        <text class="form-label required">品牌</text>
        <input
          v-model="form.brand"
          class="form-input"
          placeholder="如：小米汽车"
        />
      </view>

      <view class="form-group">
        <text class="form-label required">车型</text>
        <input
          v-model="form.model"
          class="form-input"
          placeholder="如：SU7"
        />
      </view>

      <view class="form-group">
        <text class="form-label">关键词</text>
        <input
          v-model="form.keywords"
          class="form-input"
          placeholder="如：续航、智能、性能（可选）"
        />
      </view>

      <view class="form-group">
        <text class="form-label">文案风格</text>
        <view class="style-grid">
          <view
            v-for="s in styles"
            :key="s.key"
            class="style-item"
            :class="{ active: form.style === s.key }"
            @tap="selectStyle(s.key)"
          >
            <text class="style-icon">{{ s.icon }}</text>
            <text class="style-label">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <button
        class="generate-btn"
        :loading="loading"
        :disabled="loading"
        @tap="handleGenerate"
      >
        <text class="btn-icon">✨</text>
        <text>AI生成</text>
      </button>
    </view>

    <view v-if="drafts.length > 0" class="result-section">
      <text class="section-title">生成结果（{{ drafts.length }}个版本）</text>

      <view
        v-for="(draft, i) in drafts"
        :key="i"
        class="draft-card"
      >
        <view class="draft-header">
          <text class="draft-style">{{ draft.style }}</text>
          <text class="draft-num">版本 {{ i + 1 }}</text>
        </view>
        <text class="draft-text">{{ draft.text }}</text>
        <view class="draft-actions">
          <button class="action-btn copy" @tap="copyDraft(draft)">
            <text>复制</text>
          </button>
          <button class="action-btn use" @tap="useDraft(draft)">
            <text>使用</text>
          </button>
        </view>
      </view>
    </view>

    <view v-else-if="generated" class="empty-result">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无生成结果</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.content-gen-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40rpx;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 26rpx;
  opacity: 0.9;
}

.form-section {
  padding: 24rpx;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  margin-bottom: 12rpx;

  &.required::before {
    content: '*';
    color: #ef4444;
    margin-right: 4rpx;
  }
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.style-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;

  &.active {
    background: #eff6ff;
    border-color: #2563eb;
  }
}

.style-icon {
  font-size: 32rpx;
  margin-bottom: 8rpx;
}

.style-label {
  font-size: 22rpx;
  color: #6b7280;
}

.generate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 48rpx;
  margin-top: 20rpx;

  &::after {
    border: none;
  }

  .btn-icon {
    font-size: 32rpx;
  }
}

.result-section {
  padding: 0 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.draft-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.draft-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.draft-style {
  padding: 6rpx 16rpx;
  background: #eff6ff;
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #2563eb;
}

.draft-num {
  font-size: 22rpx;
  color: #9ca3af;
}

.draft-text {
  display: block;
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.8;
  margin-bottom: 20rpx;
}

.draft-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border-radius: 36rpx;

  &::after {
    border: none;
  }

  &.copy {
    background: #f3f4f6;
    color: #6b7280;
  }

  &.use {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
  }
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}
</style>
