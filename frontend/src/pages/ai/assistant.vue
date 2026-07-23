<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { aiApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([]);
const inputText = ref('');
const loading = ref(false);
const scrollIntoView = ref('');

const quickQuestions = [
  '小米SU7续航里程是多少？',
  '比亚迪海豹和特斯拉Model 3怎么选？',
  '新能源汽车保养需要注意什么？',
  '试驾体验应该关注哪些方面？',
];

onLoad(() => {
  messages.value = [
    {
      role: 'assistant',
      content: '您好！我是AI汽车顾问，可以为您解答汽车相关问题。请问有什么可以帮您的？',
    },
  ];
});

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  loading.value = true;

  await nextTick();
  scrollIntoView.value = 'msg-' + (messages.value.length - 1);

  try {
    const res = await aiApi.assistant({
      contentId: 'chat',
      brand: '通用',
      model: '问答',
      question: text,
      chatHistory: messages.value.slice(-6),
    });

    if (res.success) {
      messages.value.push({
        role: 'assistant',
        content: res.data.answer,
      });
    } else {
      messages.value.push({
        role: 'assistant',
        content: '抱歉，我暂时无法回答这个问题，请稍后再试。',
      });
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '网络异常，请稍后再试。',
    });
  } finally {
    loading.value = false;
    await nextTick();
    scrollIntoView.value = 'msg-' + (messages.value.length - 1);
  }
}

function askQuick(q: string) {
  inputText.value = q;
  sendMessage();
}

function clearChat() {
  messages.value = [
    {
      role: 'assistant',
      content: '对话已清空。请问有什么可以帮您的？',
    },
  ];
}
</script>

<template>
  <view class="assistant-page">
    <view class="header">
      <text class="title">🤖 AI智能助手</text>
      <text class="subtitle">汽车知识问答顾问</text>
      <button class="clear-btn" @tap="clearChat">清空对话</button>
    </view>

    <scroll-view
      class="chat-area"
      scroll-y
      :scroll-into-view="scrollIntoView"
      scroll-with-animation
    >
      <view
        v-for="(msg, i) in messages"
        :key="i"
        :id="'msg-' + i"
        class="message"
        :class="msg.role"
      >
        <view class="msg-avatar">
          <text>{{ msg.role === 'user' ? '👤' : '🤖' }}</text>
        </view>
        <view class="msg-content">
          <text class="msg-text">{{ msg.content }}</text>
        </view>
      </view>

      <view v-if="loading" class="message assistant">
        <view class="msg-avatar">
          <text>🤖</text>
        </view>
        <view class="msg-content">
          <text class="msg-text typing">正在思考中...</text>
        </view>
      </view>
    </scroll-view>

    <view class="quick-questions">
      <text class="quick-title">快捷问题</text>
      <scroll-view class="quick-list" scroll-x>
        <view
          v-for="(q, i) in quickQuestions"
          :key="i"
          class="quick-item"
          @tap="askQuick(q)"
        >
          <text>{{ q }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="input-area">
      <input
        v-model="inputText"
        class="msg-input"
        placeholder="输入您的问题..."
        :disabled="loading"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <button
        class="send-btn"
        :disabled="loading || !inputText.trim()"
        @tap="sendMessage"
      >
        <text>发送</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.assistant-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
}

.header {
  position: relative;
  padding: 30rpx;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.subtitle {
  font-size: 24rpx;
  opacity: 0.9;
}

.clear-btn {
  position: absolute;
  top: 30rpx;
  right: 30rpx;
  padding: 0 20rpx;
  height: 56rpx;
  line-height: 56rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 28rpx;
  color: #fff;

  &::after {
    border: none;
  }
}

.chat-area {
  flex: 1;
  padding: 20rpx;
  overflow-y: auto;
}

.message {
  display: flex;
  margin-bottom: 24rpx;

  &.user {
    flex-direction: row-reverse;

    .msg-content {
      background: #2563eb;
      color: #fff;
    }
  }

  &.assistant {
    .msg-content {
      background: #fff;
      color: #1f2937;
    }
  }
}

.msg-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  font-size: 32rpx;
  flex-shrink: 0;
}

.msg-content {
  max-width: 70%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.msg-text {
  font-size: 28rpx;
  line-height: 1.6;
  word-break: break-all;

  &.typing {
    opacity: 0.6;
  }
}

.quick-questions {
  padding: 20rpx;
  background: #fff;
  border-top: 2rpx solid #f3f4f6;
}

.quick-title {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 12rpx;
}

.quick-list {
  white-space: nowrap;
}

.quick-item {
  display: inline-block;
  padding: 12rpx 20rpx;
  margin-right: 12rpx;
  background: #f3f4f6;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.input-area {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: #fff;
  border-top: 2rpx solid #f3f4f6;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.msg-input {
  flex: 1;
  height: 80rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  border-radius: 40rpx;
}

.send-btn {
  width: 140rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 40rpx;

  &::after {
    border: none;
  }

  &[disabled] {
    opacity: 0.5;
  }
}
</style>
