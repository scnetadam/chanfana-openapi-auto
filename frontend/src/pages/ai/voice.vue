<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const isRecording = ref(false);
const recordingTime = ref(0);
const recordingTimer = ref<any>(null);
const audioText = ref('');
const synthesizedText = ref('');
const isPlaying = ref(false);
const history = ref<any[]>([]);

const modes = [
  { key: 'recognition', label: '语音识别', icon: '🎤', desc: '实时语音转文字' },
  { key: 'synthesis', label: '语音合成', icon: '🔊', desc: '文字转语音播报' },
  { key: 'translation', label: '语音翻译', icon: '🌐', desc: '多语言实时翻译' },
];

const activeMode = ref('recognition');

onLoad(() => {
  loadHistory();
});

function loadHistory() {
  history.value = [
    { type: 'recognition', text: '今天试驾了小米SU7，续航表现非常出色', time: '10:30' },
    { type: 'synthesis', text: '欢迎体验龟钮自驭，汽车资讯自主价值引擎', time: '09:15' },
  ];
}

function startRecording() {
  if (isRecording.value) return;
  
  isRecording.value = true;
  recordingTime.value = 0;
  
  recordingTimer.value = setInterval(() => {
    recordingTime.value++;
    if (recordingTime.value >= 60) {
      stopRecording();
    }
  }, 1000);
  
  uni.showToast({ title: '开始录音', icon: 'none' });
  
  // 模拟语音识别
  setTimeout(() => {
    if (isRecording.value) {
      audioText.value = '今天试驾了小米SU7，加速非常线性，底盘质感超出预期，智能化水平是目前国产天花板';
    }
  }, 2000);
}

function stopRecording() {
  if (!isRecording.value) return;
  
  isRecording.value = false;
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }
  
  uni.showToast({ title: '录音结束', icon: 'success' });
}

function playAudio() {
  if (!synthesizedText.value.trim()) {
    uni.showToast({ title: '请先输入文字', icon: 'none' });
    return;
  }
  
  isPlaying.value = true;
  uni.showToast({ title: '开始播放', icon: 'none' });
  
  setTimeout(() => {
    isPlaying.value = false;
    uni.showToast({ title: '播放结束', icon: 'success' });
  }, 3000);
}

function copyText() {
  if (!audioText.value) {
    uni.showToast({ title: '暂无识别结果', icon: 'none' });
    return;
  }
  
  uni.setClipboardData({
    data: audioText.value,
    showToast: true,
  });
}

function useText() {
  if (!audioText.value) {
    uni.showToast({ title: '暂无识别结果', icon: 'none' });
    return;
  }
  
  uni.setStorageSync('ai_voice_text', audioText.value);
  uni.navigateTo({ url: '/pages/publish/index?from=voice' });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function switchMode(key: string) {
  activeMode.value = key;
  audioText.value = '';
  synthesizedText.value = '';
}
</script>

<template>
  <view class="voice-page">
    <view class="header">
      <text class="title">🎙️ AI语音</text>
      <text class="subtitle">语音识别 · 语音合成 · 实时翻译</text>
    </view>

    <view class="mode-tabs">
      <view
        v-for="mode in modes"
        :key="mode.key"
        class="mode-tab"
        :class="{ active: activeMode === mode.key }"
        @tap="switchMode(mode.key)"
      >
        <text class="mode-icon">{{ mode.icon }}</text>
        <text class="mode-label">{{ mode.label }}</text>
      </view>
    </view>

    <view v-if="activeMode === 'recognition'" class="recognition-section">
      <view class="record-area">
        <view
          class="record-btn"
          :class="{ recording: isRecording }"
          @touchstart="startRecording"
          @touchend="stopRecording"
        >
          <text class="record-icon">{{ isRecording ? '⏸️' : '🎤' }}</text>
        </view>
        <text class="record-time">{{ formatTime(recordingTime) }}</text>
        <text class="record-hint">{{ isRecording ? '松开结束录音' : '长按开始录音' }}</text>
      </view>

      <view v-if="audioText" class="result-area">
        <text class="result-title">识别结果</text>
        <text class="result-text">{{ audioText }}</text>
        <view class="result-actions">
          <button class="action-btn" @tap="copyText">
            <text>复制</text>
          </button>
          <button class="action-btn primary" @tap="useText">
            <text>使用</text>
          </button>
        </view>
      </view>
    </view>

    <view v-else-if="activeMode === 'synthesis'" class="synthesis-section">
      <view class="input-area">
        <textarea
          v-model="synthesizedText"
          class="text-input"
          placeholder="请输入要合成的文字..."
          maxlength="200"
        />
        <text class="char-count">{{ synthesizedText.length }}/200</text>
      </view>

      <button
        class="play-btn"
        :class="{ playing: isPlaying }"
        :disabled="isPlaying"
        @tap="playAudio"
      >
        <text class="play-icon">{{ isPlaying ? '⏸️' : '▶️' }}</text>
        <text>{{ isPlaying ? '播放中...' : '播放语音' }}</text>
      </button>

      <view class="voice-options">
        <text class="option-title">语音选项</text>
        <view class="option-grid">
          <view class="option-item active">
            <text>👩 女声</text>
          </view>
          <view class="option-item">
            <text>👨 男声</text>
          </view>
          <view class="option-item">
            <text>👧 童声</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="translation-section">
      <view class="trans-input">
        <textarea
          v-model="audioText"
          class="text-input"
          placeholder="请输入或录音..."
        />
      </view>
      
      <view class="lang-select">
        <view class="lang-item active">
          <text>中文</text>
        </view>
        <text class="arrow">→</text>
        <view class="lang-item">
          <text>英文</text>
        </view>
      </view>

      <button class="trans-btn">
        <text>开始翻译</text>
      </button>
    </view>

    <view class="history-section">
      <text class="section-title">历史记录</text>
      <view class="history-list">
        <view v-for="(item, i) in history" :key="i" class="history-item">
          <text class="history-icon">{{ item.type === 'recognition' ? '🎤' : '🔊' }}</text>
          <text class="history-text">{{ item.text }}</text>
          <text class="history-time">{{ item.time }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.voice-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40rpx;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #ec4899, #db2777);
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

.mode-tabs {
  display: flex;
  background: #fff;
  border-bottom: 2rpx solid #f3f4f6;
}

.mode-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  position: relative;

  &.active {
    .mode-label {
      color: #ec4899;
      font-weight: 600;
    }

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background: #ec4899;
      border-radius: 2rpx;
    }
  }
}

.mode-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}

.mode-label {
  font-size: 24rpx;
  color: #6b7280;
}

.recognition-section {
  padding: 40rpx 24rpx;
}

.record-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.record-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200rpx;
  height: 200rpx;
  background: linear-gradient(135deg, #ec4899, #db2777);
  border-radius: 50%;
  box-shadow: 0 8rpx 32rpx rgba(236, 72, 153, 0.4);
  margin-bottom: 30rpx;
  transition: all 0.3s;

  &.recording {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 8rpx 32rpx rgba(239, 68, 68, 0.4);
    transform: scale(1.1);
  }
}

.record-icon {
  font-size: 80rpx;
  color: #fff;
}

.record-time {
  font-size: 48rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.record-hint {
  font-size: 26rpx;
  color: #9ca3af;
}

.result-area {
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-top: 30rpx;
}

.result-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.result-text {
  display: block;
  font-size: 30rpx;
  color: #1f2937;
  line-height: 1.8;
  margin-bottom: 20rpx;
}

.result-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  border-radius: 36rpx;
  background: #f3f4f6;
  color: #6b7280;

  &.primary {
    background: linear-gradient(135deg, #ec4899, #db2777);
    color: #fff;
  }

  &::after {
    border: none;
  }
}

.synthesis-section {
  padding: 24rpx;
}

.input-area {
  position: relative;
  margin-bottom: 24rpx;
}

.text-input {
  width: 100%;
  height: 240rpx;
  padding: 20rpx;
  font-size: 28rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
}

.char-count {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ec4899, #db2777);
  border-radius: 48rpx;
  margin-bottom: 30rpx;

  &::after {
    border: none;
  }

  &.playing {
    background: linear-gradient(135deg, #9ca3af, #6b7280);
  }

  .play-icon {
    font-size: 32rpx;
  }
}

.voice-options {
  padding: 30rpx;
  background: #fff;
  border-radius: 20rpx;
}

.option-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  background: #f3f4f6;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #6b7280;

  &.active {
    background: #fce7f3;
    color: #ec4899;
  }
}

.translation-section {
  padding: 24rpx;
}

.trans-input {
  margin-bottom: 24rpx;
}

.lang-select {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.lang-item {
  padding: 16rpx 30rpx;
  background: #f3f4f6;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #6b7280;

  &.active {
    background: #fce7f3;
    color: #ec4899;
  }
}

.arrow {
  font-size: 32rpx;
  color: #9ca3af;
}

.trans-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ec4899, #db2777);
  border-radius: 48rpx;

  &::after {
    border: none;
  }
}

.history-section {
  padding: 0 24rpx;
  margin-top: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 20rpx;
}

.history-list {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 2rpx solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
}

.history-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.history-text {
  flex: 1;
  font-size: 26rpx;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
