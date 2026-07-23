<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { aiVideoApi, type AiVideoTemplate, type AiVideoProject } from '@/api';

const templates = ref<AiVideoTemplate[]>([]);
const projects = ref<AiVideoProject[]>([]);
const loading = ref(true);
const activeTab = ref(0);
const selectedTemplate = ref<AiVideoTemplate | null>(null);
const showCreate = ref(false);

const form = ref({
  title: '',
  templateId: '',
});

onLoad(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [tmplRes, projRes] = await Promise.all([
      aiVideoApi.templates(),
      aiVideoApi.projects(),
    ]);
    
    if (tmplRes.success) {
      templates.value = tmplRes.data.templates;
    }
    if (projRes.success) {
      projects.value = projRes.data.projects;
    }
  } catch (e) {
    console.error('[AiVideo] load error:', e);
  } finally {
    loading.value = false;
  }
}

function selectTemplate(tmpl: AiVideoTemplate) {
  selectedTemplate.value = tmpl;
  form.value.templateId = tmpl.id;
  form.value.title = tmpl.name;
  showCreate.value = true;
}

function closeCreate() {
  showCreate.value = false;
  selectedTemplate.value = null;
}

async function handleCreate() {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' });
    return;
  }
  if (!form.value.templateId) {
    uni.showToast({ title: '请选择模板', icon: 'none' });
    return;
  }

  try {
    uni.showLoading({ title: '创建中...' });
    const res = await aiVideoApi.create({
      title: form.value.title,
      templateId: form.value.templateId,
    });
    
    if (res.success) {
      uni.hideLoading();
      uni.showToast({ title: '创建成功', icon: 'success' });
      showCreate.value = false;
      
      await aiVideoApi.generate(res.data.id);
      loadData();
    }
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e.message || '创建失败', icon: 'none' });
  }
}

async function checkProgress(project: AiVideoProject) {
  try {
    const res = await aiVideoApi.progress(project.id);
    if (res.success) {
      project.status = res.data.status;
      project.progress = res.data.progress;
      project.result = res.data.result;
      
      if (project.status === 'generating') {
        setTimeout(() => checkProgress(project), 2000);
      } else if (project.status === 'completed') {
        uni.showToast({ title: '生成完成', icon: 'success' });
      }
    }
  } catch (e) {
    console.error('[AiVideo] progress error:', e);
  }
}

function getStatusColor(status: string) {
  if (status === 'completed') return '#10b981';
  if (status === 'generating') return '#f59e0b';
  if (status === 'failed') return '#ef4444';
  return '#6b7280';
}

function getStatusText(status: string) {
  if (status === 'completed') return '已完成';
  if (status === 'generating') return '生成中';
  if (status === 'failed') return '失败';
  return '草稿';
}
</script>

<template>
  <view class="aivideo-page">
    <view class="header">
      <text class="title">🎬 AI视频生成</text>
      <text class="subtitle">一键生成专业汽车视频</text>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: activeTab === 0 }" @tap="activeTab = 0">
        <text>模板库</text>
      </view>
      <view class="tab" :class="{ active: activeTab === 1 }" @tap="activeTab = 1">
        <text>我的项目</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else-if="activeTab === 0" class="template-grid">
      <view
        v-for="tmpl in templates"
        :key="tmpl.id"
        class="template-card"
        @tap="selectTemplate(tmpl)"
      >
        <view class="tmpl-icon">{{ tmpl.category === '产品展示' ? '🎥' : tmpl.category === '体验分享' ? '📹' : '🎞️' }}</view>
        <text class="tmpl-name">{{ tmpl.name }}</text>
        <text class="tmpl-category">{{ tmpl.category }}</text>
        <text class="tmpl-desc">{{ tmpl.description }}</text>
        <view class="tmpl-meta">
          <text>{{ tmpl.duration }}秒</text>
          <text>{{ tmpl.scenes }}场景</text>
        </view>
        <view class="tmpl-features">
          <text v-for="(f, i) in tmpl.features.slice(0, 2)" :key="i" class="feature-tag">{{ f }}</text>
        </view>
      </view>
    </view>

    <view v-else class="project-list">
      <view v-if="projects.length === 0" class="empty">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无项目</text>
        <text class="empty-hint">选择模板创建第一个AI视频</text>
      </view>
      
      <view v-else v-for="proj in projects" :key="proj.id" class="project-card">
        <view class="proj-header">
          <text class="proj-title">{{ proj.title }}</text>
          <view class="status-tag" :style="{ background: getStatusColor(proj.status) + '15', color: getStatusColor(proj.status) }">
            {{ getStatusText(proj.status) }}
          </view>
        </view>
        
        <text class="proj-template">{{ proj.templateName }}</text>
        
        <view v-if="proj.status === 'generating'" class="progress-bar">
          <view class="progress-fill" :style="{ width: proj.progress + '%' }"></view>
        </view>
        <text v-if="proj.status === 'generating'" class="progress-text">{{ proj.progress }}%</text>
        
        <view v-if="proj.status === 'completed' && proj.result" class="proj-result">
          <text class="result-icon">✅</text>
          <text class="result-text">视频已生成，点击查看</text>
        </view>
      </view>
    </view>

    <view v-if="showCreate" class="create-modal">
      <view class="modal-mask" @tap="closeCreate"></view>
      <view class="modal-content">
        <view class="modal-header">
          <text class="modal-title">创建AI视频</text>
          <text class="modal-close" @tap="closeCreate">✕</text>
        </view>
        
        <view class="modal-body">
          <view v-if="selectedTemplate" class="selected-tmpl">
            <text class="tmpl-name">{{ selectedTemplate.name }}</text>
            <text class="tmpl-desc">{{ selectedTemplate.description }}</text>
          </view>
          
          <view class="form-group">
            <text class="form-label">视频标题</text>
            <input v-model="form.title" class="form-input" placeholder="请输入视频标题" />
          </view>
        </view>
        
        <view class="modal-footer">
          <button class="cancel-btn" @tap="closeCreate">取消</button>
          <button class="confirm-btn" @tap="handleCreate">开始生成</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.aivideo-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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

.tabs {
  display: flex;
  background: #fff;
  border-bottom: 2rpx solid #f3f4f6;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 28rpx;
  color: #6b7280;
  position: relative;

  &.active {
    color: #8b5cf6;
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background: #8b5cf6;
      border-radius: 2rpx;
    }
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx;
  color: #9ca3af;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 24rpx;
}

.template-card {
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.tmpl-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.tmpl-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8rpx;
}

.tmpl-category {
  display: block;
  font-size: 22rpx;
  color: #8b5cf6;
  margin-bottom: 8rpx;
}

.tmpl-desc {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.tmpl-meta {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.tmpl-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.feature-tag {
  padding: 4rpx 12rpx;
  background: #f3f4f6;
  border-radius: 6rpx;
  font-size: 20rpx;
  color: #6b7280;
}

.project-list {
  padding: 24rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
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

.project-card {
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 20rpx;
}

.proj-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.proj-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
}

.status-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.proj-template {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 16rpx;
}

.progress-bar {
  height: 8rpx;
  background: #f3f4f6;
  border-radius: 4rpx;
  margin-bottom: 8rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  border-radius: 4rpx;
  transition: width 0.3s;
}

.progress-text {
  font-size: 24rpx;
  color: #8b5cf6;
}

.proj-result {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  background: #ecfdf5;
  border-radius: 12rpx;
}

.result-icon {
  font-size: 28rpx;
}

.result-text {
  font-size: 26rpx;
  color: #10b981;
}

.create-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 2rpx solid #f3f4f6;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.modal-close {
  font-size: 40rpx;
  color: #9ca3af;
}

.modal-body {
  padding: 30rpx;
}

.selected-tmpl {
  padding: 20rpx;
  background: #f9fafb;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}

.form-group {
  margin-bottom: 24rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #1f2937;
  margin-bottom: 10rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx;
  border-top: 2rpx solid #f3f4f6;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 44rpx;

  &::after {
    border: none;
  }
}

.cancel-btn {
  background: #f3f4f6;
  color: #6b7280;
}

.confirm-btn {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
}
</style>
