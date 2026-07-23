<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { contentApi, bookingApi, aiApi } from '@/api';
import { useUserStore } from '@/stores';
import { generateSharePoster, sharePoster } from '@/utils/poster';

const userStore = useUserStore();

const contentId = ref('');
const content = ref<any>(null);
const loading = ref(true);
const spreadRef = ref('');
const posterImage = ref('');

const bookingName = ref('');
const bookingPhone = ref('');
const bookingCity = ref('');
const submitting = ref(false);
const submitted = ref(false);

const showShareSheet = ref(false);

const showAIChat = ref(false);
const aiChatMessages = ref<{ role: 'user' | 'assistant'; content: string }[]>([]);
const aiChatInput = ref('');
const aiChatLoading = ref(false);
const aiSuggestedQuestions = ref<string[]>([]);

const shareUrl = computed(() => {
  const base = content.value?.shareUrl || '';
  if (!base) return '';
  const sep = base.includes('?') ? '&' : '?';
  if (userStore.userId && userStore.userId !== content.value?.userId) {
    return `${base}${sep}ref=${userStore.userId}`;
  }
  return base;
});

onLoad(async (query) => {
  contentId.value = query.id || '';
  spreadRef.value = query.ref || '';

  if (!contentId.value) {
    uni.showToast({ title: '内容不存在', icon: 'none' });
    uni.navigateBack();
    return;
  }

  await loadDetail();

  if (spreadRef.value) {
    contentApi.trackView(contentId.value, spreadRef.value).catch(() => {});
  } else {
    contentApi.trackView(contentId.value).catch(() => {});
  }

  initAIChat();
});

onShareAppMessage(() => ({
  title: content.value?.text?.slice(0, 30) + '...' || 'X402 内容分享',
  path: `/pages/share/index?id=${contentId.value}${spreadRef.value ? `&ref=${spreadRef.value}` : ''}`,
}));

async function loadDetail() {
  try {
    const res = await contentApi.detail(contentId.value);
    if (res.success) content.value = res.data;
  } catch (e) {
    content.value = {
      id: contentId.value,
      text: '今天试驾了小米SU7，加速非常线性，底盘质感超出预期，智能化水平是目前国产天花板...',
      carModel: '小米 SU7',
      images: [],
      shareUrl: `https://x402.app/s/${contentId.value}`,
      stats: { views: 0, bookings: 0, estimatedEarnings: 0 },
      activity: { brand: '小米汽车', model: 'SU7' },
      trackChain: [{ nickName: '发起人' }],
      trackId: 'TRACK_' + contentId.value,
      createdAt: new Date().toISOString(),
    };
  } finally {
    loading.value = false;
  }
}

function initAIChat() {
  if (!content.value) return;
  const brand = content.value.activity?.brand || content.value.carModel?.split(' ')[0] || '';
  const model = content.value.activity?.model || content.value.carModel || '';
  aiChatMessages.value = [{
    role: 'assistant',
    content: `你好！我是${brand} ${model}的专属顾问🤖，有任何关于这款车或试驾的问题都可以问我哦！`,
  }];
  aiSuggestedQuestions.value = [
    `${model}续航多少？`,
    '试驾需要带什么？',
    '附近有4S店吗？',
  ];
}

function toggleAIChat() {
  showAIChat.value = !showAIChat.value;
}

async function sendAIMessage(question?: string) {
  const q = question || aiChatInput.value.trim();
  if (!q || aiChatLoading.value) return;

  aiChatMessages.value.push({ role: 'user', content: q });
  aiChatInput.value = '';
  aiChatLoading.value = true;

  try {
    const brand = content.value?.activity?.brand || content.value?.carModel?.split(' ')[0] || '';
    const model = content.value?.activity?.model || content.value?.carModel || '';
    const history = aiChatMessages.value.slice(-6, -1);

    const res = await aiApi.assistant({
      contentId: contentId.value,
      brand,
      model,
      question: q,
      chatHistory: history,
    });

    if (res.success && res.data.answer) {
      aiChatMessages.value.push({ role: 'assistant', content: res.data.answer });
      if (res.data.suggestedQuestions && res.data.suggestedQuestions.length > 0) {
        aiSuggestedQuestions.value = res.data.suggestedQuestions;
      }
    } else {
      aiChatMessages.value.push({ role: 'assistant', content: '抱歉，我暂时无法回答这个问题，建议您直接预约试驾体验实车！' });
    }
  } catch (e) {
    aiChatMessages.value.push({ role: 'assistant', content: '网络异常，请稍后再试。也可以直接点击上方「提交预约」哦！' });
  } finally {
    aiChatLoading.value = false;
  }
}

async function submitBooking() {
  if (!bookingName.value.trim()) { uni.showToast({ title: '请填写姓名', icon: 'none' }); return; }
  if (!/^1\d{10}$/.test(bookingPhone.value)) { uni.showToast({ title: '请填写正确手机号', icon: 'none' }); return; }

  submitting.value = true;
  try {
    const res = await bookingApi.submit({
      contentId: contentId.value,
      name: bookingName.value,
      phone: bookingPhone.value,
      city: bookingCity.value,
      refUserId: spreadRef.value || undefined,
      refNickName: spreadRef.value ? (userStore.userInfo?.nickName || '传播者') : undefined,
    });
    if (res.success) {
      submitted.value = true;
      uni.showToast({ title: '预约成功', icon: 'success' });
    }
  } catch (err) {
    uni.showToast({ title: '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function onShare() { showShareSheet.value = true; }

function copyLink() {
  uni.setClipboardData({ data: shareUrl.value, showToast: true });
  showShareSheet.value = false;
}

async function generatePoster() {
  if (!content.value) return;
  try {
    uni.showLoading({ title: '生成中...' });
    const tempFilePath = await generateSharePoster({
      title: content.value.text?.slice(0, 30) || '汽车推广',
      desc: content.value.carModel || '',
      brand: content.value.activity?.brand,
      model: content.value.activity?.model,
      reward: `试驾奖励 ¥${content.value.activity?.rewardPerBooking || 0}`,
      inviteCode: userStore.userId ? userStore.userId.slice(-6).toUpperCase() : undefined,
    });
    posterImage.value = tempFilePath;
    uni.hideLoading();
    sharePoster(tempFilePath);
  } catch (err: any) {
    uni.hideLoading();
    uni.showToast({ title: '生成失败', icon: 'none' });
    console.error('[Poster] error:', err);
  }
}
</script>

<template>
  <view class="share-page">
    <view v-if="loading" class="loading">
      <text class="load-text">加载中...</text>
    </view>

    <template v-else-if="content">
      <view class="content-card">
        <view class="cc-header">
          <text class="cc-badge">{{ content.carModel }}</text>
        </view>
        <text class="cc-activity" v-if="content.activity">
          {{ content.activity.brand }}
        </text>
        <text class="cc-text">{{ content.text }}</text>
      </view>

      <view class="stats-bar">
        <view class="stats-item">
          <text class="stats-icon">👁️</text>
          <text class="stats-value">{{ content.stats.views }}</text>
          <text class="stats-label">阅读</text>
        </view>
        <view class="stats-item">
          <text class="stats-icon">📋</text>
          <text class="stats-value accent">{{ content.stats.bookings }}</text>
          <text class="stats-label">预约</text>
        </view>
        <view class="stats-item earnings">
          <text class="stats-icon">💰</text>
          <text class="stats-value gold">¥{{ content.stats.estimatedEarnings.toFixed(2) }}</text>
          <text class="stats-label">收益</text>
        </view>
      </view>

      <view v-if="!submitted" class="booking-section">
        <text class="bs-title">📋 预约试驾 {{ content.carModel }}</text>
        <view class="form-group">
          <text class="form-label">姓名</text>
          <input v-model="bookingName" class="form-input" placeholder="请输入姓名" />
        </view>
        <view class="form-group">
          <text class="form-label">手机号</text>
          <input v-model="bookingPhone" class="form-input" placeholder="请输入手机号" type="tel" maxlength="11" />
        </view>
        <button class="submit-btn" :loading="submitting" :disabled="submitting" @tap="submitBooking">
          <text>提交预约</text>
        </button>
      </view>

      <view v-else class="success-section">
        <text class="success-title">预约成功！</text>
        <text class="success-desc">4S店顾问将在24小时内联系你</text>
      </view>

      <view class="action-bar">
        <button class="action-btn share" @tap="onShare"><text>🔗 分享</text></button>
        <button class="action-btn copy" @tap="copyLink"><text>📎 复制链接</text></button>
        <button class="action-btn poster" @tap="generatePoster"><text>🖼️ 海报</text></button>
      </view>
    </template>

    <view v-else class="loading"><text>内容不存在</text></view>

    <!-- AI 客服悬浮按钮 -->
    <view v-if="content && !showAIChat" class="ai-fab" @tap="toggleAIChat">
      <text class="ai-fab-icon">🤖</text>
      <text class="ai-fab-label">AI顾问</text>
    </view>

    <!-- AI 客服对话面板 -->
    <view v-if="showAIChat" class="ai-chat-panel">
      <view class="acp-header">
        <view class="acp-title-row">
          <text class="acp-icon">🤖</text>
          <text class="acp-title">AI 汽车顾问</text>
          <text class="acp-badge">NEW</text>
        </view>
        <view class="acp-close" @tap="toggleAIChat">
          <text>✕</text>
        </view>
      </view>

      <scroll-view class="acp-messages" scroll-y :scroll-into-view="'msg-' + (aiChatMessages.length - 1)">
        <view
          v-for="(msg, i) in aiChatMessages"
          :key="i"
          :id="'msg-' + i"
          class="acp-msg"
          :class="msg.role"
        >
          <text class="acp-msg-text">{{ msg.content }}</text>
        </view>
        <view v-if="aiChatLoading" class="acp-msg assistant">
          <text class="acp-msg-text acp-typing">思考中...</text>
        </view>
      </scroll-view>

      <view v-if="aiSuggestedQuestions.length > 0 && !aiChatLoading" class="acp-suggestions">
        <view
          v-for="(sq, i) in aiSuggestedQuestions"
          :key="i"
          class="acp-sq-btn"
          @tap="sendAIMessage(sq)"
        >
          <text>{{ sq }}</text>
        </view>
      </view>

      <view class="acp-input-bar">
        <input
          v-model="aiChatInput"
          class="acp-input"
          placeholder="问点关于这款车的问题..."
          @confirm="sendAIMessage()"
        />
        <button class="acp-send-btn" @tap="sendAIMessage()" :disabled="!aiChatInput.trim() || aiChatLoading">
          <text>发送</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.share-page { min-height: 100vh; padding: 24rpx; padding-bottom: 140rpx; background: #f0f2f5; }
.loading { display: flex; align-items: center; justify-content: center; padding: 300rpx 0; }
.content-card { padding: 30rpx; background: #fff; border-radius: 20rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.cc-header { display: flex; align-items: center; justify-content: space-between; }
.cc-badge { padding: 6rpx 18rpx; background: #eff6ff; border-radius: 8rpx; font-size: 24rpx; color: #2563eb; }
.cc-activity { display: block; font-size: 24rpx; color: #6b7280; margin-bottom: 12rpx; }
.cc-text { display: block; font-size: 32rpx; color: #1f2937; line-height: 1.8; margin-bottom: 20rpx; }
.stats-bar { display: flex; gap: 8rpx; margin-bottom: 20rpx; }
.stats-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20rpx; background: #fff; border-radius: 16rpx; }
.stats-icon { font-size: 28rpx; margin-bottom: 8rpx; }
.stats-value { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.stats-label { font-size: 20rpx; color: #9ca3af; }
.accent { color: #d97706; }
.gold { color: #b45309; }
.booking-section { padding: 28rpx; background: #fff; border-radius: 20rpx; margin-bottom: 20rpx; }
.bs-title { font-size: 32rpx; font-weight: 700; color: #1f2937; margin-bottom: 20rpx; }
.form-group { margin-bottom: 20rpx; }
.form-label { font-size: 26rpx; color: #4b5563; margin-bottom: 8rpx; }
.form-input { height: 80rpx; padding: 0 20rpx; font-size: 28rpx; background: #f9fafb; border: 2rpx solid #e5e7eb; border-radius: 12rpx; }
.submit-btn { width: 100%; height: 88rpx; line-height: 88rpx; font-size: 32rpx; font-weight: 600; color: #fff; background: linear-gradient(135deg,#2563eb,#1d4ed8); border-radius: 44rpx; margin-top: 12rpx; }
.success-section { display: flex; flex-direction: column; align-items: center; padding: 60rpx; margin-bottom: 20rpx; background: #fff; border-radius: 20rpx; }
.success-title { font-size: 34rpx; font-weight: 700; color: #1f2937; margin-bottom: 12rpx; }
.success-desc { font-size: 26rpx; color: #6b7280; }
.action-bar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 16rpx; padding: 20rpx 24rpx; background: #fff; box-shadow: 0 -4rpx 24rpx rgba(0,0,0,0.05); z-index: 50; }
.action-btn { flex: 1; height: 88rpx; line-height: 88rpx; font-size: 30rpx; font-weight: 600; border-radius: 44rpx; text-align: center; &.share { color: #fff; background: linear-gradient(135deg,#2563eb,#1d4ed8); } &.copy { color: #2563eb; background: #eff6ff; } &.poster { color: #10b981; background: #ecfdf5; } }

/* AI FAB */
.ai-fab {
  position: fixed;
  right: 30rpx;
  bottom: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  z-index: 100;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 50rpx;
  box-shadow: 0 6rpx 24rpx rgba(99, 102, 241, 0.4);
}

.ai-fab-icon { font-size: 36rpx; }
.ai-fab-label { font-size: 20rpx; color: #fff; font-weight: 500; }

/* AI Chat Panel */
.ai-chat-panel {
  position: fixed;
  right: 20rpx;
  bottom: 140rpx;
  width: 620rpx;
  max-height: 700rpx;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 48rpx rgba(0, 0, 0, 0.15);
  z-index: 200;
  overflow: hidden;
}

.acp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
}

.acp-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.acp-icon { font-size: 32rpx; }
.acp-title { font-size: 28rpx; font-weight: 700; }
.acp-badge {
  padding: 2rpx 10rpx;
  font-size: 18rpx;
  font-weight: 600;
  color: #6366f1;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6rpx;
}

.acp-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #fff;
  opacity: 0.8;
}

.acp-messages {
  flex: 1;
  max-height: 380rpx;
  padding: 20rpx 24rpx;
  overflow-y: auto;
}

.acp-msg {
  margin-bottom: 16rpx;

  &.user {
    text-align: right;
    .acp-msg-text {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: #fff;
    }
  }

  &.assistant {
    text-align: left;
    .acp-msg-text {
      background: #f3f4f6;
      color: #1f2937;
    }
  }
}

.acp-msg-text {
  display: inline-block;
  max-width: 80%;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  line-height: 1.6;
  border-radius: 16rpx;
  word-break: break-all;
}

.acp-typing {
  opacity: 0.6;
  font-style: italic;
}

.acp-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  padding: 8rpx 24rpx 12rpx;
  border-top: 2rpx solid #f3f4f6;
}

.acp-sq-btn {
  padding: 10rpx 20rpx;
  font-size: 22rpx;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 20rpx;
  white-space: nowrap;
}

.acp-input-bar {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-top: 2rpx solid #f3f4f6;
  background: #fafafa;
}

.acp-input {
  flex: 1;
  height: 64rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 32rpx;
}

.acp-send-btn {
  width: 120rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 32rpx;
  padding: 0;
  text-align: center;

  &::after { border: none; }
  &[disabled] { opacity: 0.4; }
}
</style>
