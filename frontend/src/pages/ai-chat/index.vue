<template>
  <view class="page">
    <view class="page-header">
      <view class="back-btn" @tap="goBack">&larr;</view>
      <view class="header-center">
        <text class="page-header-text">{{ title }}</text>
        <text class="page-header-sub">{{ subtitle }}</text>
      </view>
      <view class="header-actions">
        <view class="mode-toggle" @tap="toggleMode">
          <text>{{ isVoiceMode ? '⌨️' : '🎤' }}</text>
        </view>
      </view>
    </view>

    <template v-if="!isVoiceMode">
      <scroll-view class="chat-area" scroll-y :scroll-into-view="scrollToId" scroll-with-animation>
        <view class="welcome" v-if="messages.length === 0">
          <text class="welcome-icon">{{ avatar }}</text>
          <text class="welcome-text">{{ welcomeText }}</text>
          <text class="welcome-sub">快捷提问</text>
          <view class="quick-questions">
            <view v-for="(q, i) in quickQuestions" :key="i" class="quick-item" @tap="sendQuick(q)">{{ q }}</view>
          </view>
          <view class="quick-questions" style="margin-top: 16rpx;">
            <view class="quick-item quick-item-intro" @tap="generateIntro">📢 自动介绍</view>
          </view>
        </view>
        <view v-for="(msg, i) in messages" :key="i" :id="'msg_' + i">
          <view class="msg-row msg-user" v-if="msg.role === 'user'">
            <view class="msg-bubble user-bubble">
              <text>{{ msg.content }}</text>
              <text v-if="msg.fromVoice" class="voice-tag">🎤</text>
            </view>
          </view>
          <view class="msg-row msg-ai" v-else>
            <text class="ai-avatar">{{ avatar }}</text>
            <view class="msg-bubble ai-bubble">
              <text>{{ msg.content }}</text>
              <view v-if="msg.content && !loading" class="ai-actions">
                <text class="ai-action-btn" @tap="speakText(msg.content)">🔊 朗读</text>
              </view>
            </view>
          </view>
        </view>
        <view class="msg-row msg-ai" v-if="loading">
          <text class="ai-avatar">{{ avatar }}</text>
          <view class="msg-bubble ai-bubble"><text class="loading-text">思考中...</text></view>
        </view>
        <view id="scroll_bottom" style="height:1px"></view>
      </scroll-view>
      <view class="input-area">
        <view class="voice-btn" :class="isRecording ? 'recording' : ''" @tap="startVoiceInput">
          <text>{{ isRecording ? '⏹️' : '🎤' }}</text>
        </view>
        <input class="input-box" v-model="inputText" :placeholder="placeholderText" @confirm="sendMessage" :disabled="loading" />
        <view class="send-btn" :class="{ 'send-disabled': !inputText.trim() || loading }" @tap="sendMessage">{{ loading ? '...' : '发送' }}</view>
      </view>
    </template>

    <template v-else>
      <scroll-view class="voice-area" scroll-y>
        <view class="voice-wake">
          <view class="voice-wake-btn" :class="{ recording: isRecording }" @touchstart="startVoiceInput" @touchend="stopVoiceInput">
            <text class="voice-wake-icon">{{ isRecording ? '⏹️' : '🎤' }}</text>
          </view>
          <text class="voice-wake-hint">{{ isRecording ? '松开结束' : '长按说话' }}</text>
          <text class="voice-wake-time" v-if="isRecording">{{ formatTime(recordingTime) }}</text>
        </view>
        <view class="voice-feedback" v-if="lastVoiceReply">
          <view class="voice-reply-card">
            <text class="voice-reply-icon">{{ avatar }}</text>
            <view class="voice-reply-content">
              <text class="voice-reply-text">{{ lastVoiceReply }}</text>
              <text class="voice-reply-action" @tap="speakText(lastVoiceReply)">🔊 再听一遍</text>
            </view>
          </view>
        </view>
        <view class="voice-commands">
          <text class="commands-title">语音指令</text>
          <view class="commands-grid">
            <view v-for="(cmd, i) in voiceCommands" :key="i" class="command-item" @tap="executeVoiceCommand(cmd.text)">
              <text class="command-icon">{{ cmd.icon }}</text>
              <text class="command-text">{{ cmd.label }}</text>
            </view>
          </view>
        </view>
        <view class="voice-history" v-if="voiceHistory.length > 0">
          <text class="history-title">语音记录</text>
          <view class="history-list">
            <view v-for="(item, i) in voiceHistory" :key="i" class="history-item">
              <text class="history-icon">🎤</text>
              <view class="history-content">
                <text class="history-text">{{ item.input }}</text>
                <text class="history-reply">{{ item.reply }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
      <view class="voice-bottom-bar">
        <view class="mode-toggle-btn" @tap="toggleMode"><text>⌨️ 文字模式</text></view>
        <view class="voice-status" v-if="isRecording"><text class="status-dot"></text><text>聆听中...</text></view>
      </view>
    </template>
    <view class="voice-hint" v-if="showVoiceHint">
      <text class="voice-hint-icon">🎤</text>
      <text class="voice-hint-text">正在聆听...</text>
    </view>
  </view>
</template>
<script>
import { api } from '../../api';

export default {
  props: {
    project: { type: String, default: 'seal' },
  },
  data() {
    return {
      messages: [], inputText: '', loading: false, scrollToId: 'scroll_bottom',
      userId: uni.getStorageSync('userId') || '',
      isVoiceMode: false, isRecording: false, recordingTime: 0, recordingTimer: null,
      showVoiceHint: false, _lastFromVoice: false, lastVoiceReply: '', voiceHistory: [],
    };
  },
  computed: {
    config() {
      const configs = {
        seal: {
          title: '龟钮·印信', subtitle: 'X402 支付助手', avatar: '🏛️',
          welcomeText: '你好！我是印信 AI 支付助手',
          placeholderText: '输入支付问题...',
          quickQuestions: ['平台有哪些功能？', '我的交易情况？', '如何设置Agent额度？', '怎么收款？'],
          voiceCommands: [
            { icon: '💰', label: '查余额', text: '我的钱包余额是多少？' },
            { icon: '📋', label: '查账单', text: '查看最近交易记录' },
            { icon: '🤖', label: 'Agent支付', text: 'Agent支付怎么用？' },
            { icon: '📢', label: '自动介绍', text: '给我介绍一下这个平台' },
          ],
        },
        verify: {
          title: '龟钮·印证', subtitle: '数据市场助手', avatar: '📊',
          welcomeText: '你好！我是印证 AI 数据助手',
          placeholderText: '输入数据问题...',
          quickQuestions: ['数据市场有哪些数据？', '我的数据收益如何？', '怎么存证？', '数据授权怎么用？'],
          voiceCommands: [
            { icon: '📊', label: '数据市场', text: '数据市场有哪些商品？' },
            { icon: '💰', label: '数据收益', text: '查看我的数据收益' },
            { icon: '🔒', label: '数据存证', text: '怎么进行数据存证？' },
            { icon: '📢', label: '自动介绍', text: '给我介绍一下这个平台' },
          ],
        },
        auto: {
          title: '龟钮·自驭', subtitle: '汽车 AI 顾问', avatar: '🚗',
          welcomeText: '你好！我是自驭 AI 汽车顾问',
          placeholderText: '输入汽车问题...',
          quickQuestions: ['小米SU7续航多少？', '比亚迪海豹vs Model 3', '新能源保养注意什么？', '试驾关注哪些方面？'],
          voiceCommands: [
            { icon: '🚗', label: '车型对比', text: '对比小米SU7和特斯拉Model 3' },
            { icon: '🔍', label: '查参数', text: '比亚迪海豹的续航参数' },
            { icon: '📝', label: '内容生成', text: '帮我写一篇小米SU7的评测' },
            { icon: '📢', label: '自动介绍', text: '给我介绍一下这个平台' },
          ],
        },
      };
      return configs[this.project] || configs.seal;
    },
    title() { return this.config.title; },
    subtitle() { return this.config.subtitle; },
    avatar() { return this.config.avatar; },
    welcomeText() { return this.config.welcomeText; },
    placeholderText() { return this.config.placeholderText; },
    quickQuestions() { return this.config.quickQuestions; },
    voiceCommands() { return this.config.voiceCommands; },
  },
  methods: {
    goBack() { uni.navigateBack(); },
    sendQuick(text) { this.inputText = text; this.sendMessage(); },
    async sendMessage() {
      const text = this.inputText.trim();
      if (!text || this.loading) return;
      this.inputText = '';
      this.messages.push({ role: 'user', content: text, fromVoice: this._lastFromVoice });
      this._lastFromVoice = false;
      this.scrollToBottom();
      this.loading = true;
      try {
        const res = await api.post('/ai/chat', { project: this.project, userId: this.userId, message: text });
        this.messages.push({ role: 'ai', content: res.success ? res.data.reply : '抱歉，服务暂时不可用，请稍后再试。' });
      } catch (e) {
        this.messages.push({ role: 'ai', content: '网络异常，请检查连接后重试。' });
      }
      this.loading = false;
      this.scrollToBottom();
    },
    async generateIntro() {
      this.loading = true;
      try {
        const res = await api.get('/ai/intro', { project: this.project });
        if (res.success) {
          const d = res.data;
          const text = '欢迎使用' + d.title + '！' + d.brief + '核心功能包括：' + d.features.join('；') + '。请问有什么可以帮您？';
          this.messages.push({ role: 'ai', content: text, intro: true });
        }
      } catch (e) {
        this.messages.push({ role: 'ai', content: '介绍生成失败，请稍后再试。' });
      }
      this.loading = false;
      this.scrollToBottom();
    },
    toggleMode() {
      this.isVoiceMode = !this.isVoiceMode;
      if (this.isVoiceMode && !this.lastVoiceReply) this.generateVoiceIntro();
    },
    async generateVoiceIntro() {
      try {
        const res = await api.get('/ai/intro', { project: this.project });
        this.lastVoiceReply = res.success ? (res.data.shortIntro || res.data.welcome) : '欢迎使用，请长按语音按钮开始提问。';
      } catch (e) { this.lastVoiceReply = '欢迎使用，请长按语音按钮开始提问。'; }
    },
    startVoiceInput() {
      if (this.isRecording) return;
      this.isRecording = true; this.recordingTime = 0; this.showVoiceHint = true;
      this.recordingTimer = setInterval(() => {
        this.recordingTime++;
        if (this.recordingTime >= 30) this.stopVoiceInput();
      }, 1000);
    },
    stopVoiceInput() {
      if (!this.isRecording) return;
      this.isRecording = false; this.showVoiceHint = false;
      if (this.recordingTimer) { clearInterval(this.recordingTimer); this.recordingTimer = null; }
      const mockText = this.voiceCommands[Math.floor(Math.random() * this.voiceCommands.length)].text;
      this.executeVoiceCommand(mockText);
    },
    async executeVoiceCommand(text) {
      this.isRecording = false; this.showVoiceHint = false; this.loading = true;
      try {
        await api.post('/ai/voice-command', { project: this.project, text });
        const res = await api.post('/ai/chat', { project: this.project, userId: this.userId, message: text, voiceMode: true });
        if (res.success) {
          const reply = res.data.reply;
          this.lastVoiceReply = reply;
          this.voiceHistory.unshift({ input: text, reply });
          if (this.voiceHistory.length > 10) this.voiceHistory.pop();
        }
      } catch (e) { this.lastVoiceReply = '抱歉，我没听清，请再说一遍。'; }
      this.loading = false;
    },
    speakText(text) {
      if (!text) return;
      try { const platform = require('../../utils/platform'); platform.speakText(text); } catch (e) {}
    },
    scrollToBottom() { setTimeout(() => { this.scrollToId = 'scroll_bottom'; }, 100); },
    formatTime(seconds) { const m = Math.floor(seconds / 60); const s = seconds % 60; return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0'); },
  },
};
</script>
<style scoped lang="scss">
.page { display: flex; flex-direction: column; height: 100vh; background: var(--gn-bg, #f0f2f5); }
.page-header { display: flex; align-items: center; padding: 24rpx 32rpx; background: var(--gn-card, #fff); border-bottom: 2rpx solid var(--gn-border, #e5e7eb); flex-shrink: 0; }
.back-btn { font-size: 30rpx; color: var(--gn-primary, #2563eb); padding: 4rpx 8rpx; }
.header-center { flex: 1; text-align: center; }
.page-header-text { font-size: 34rpx; font-weight: 700; color: var(--gn-text, #1f2937); display: block; }
.page-header-sub { font-size: 22rpx; color: var(--gn-text-secondary, #6b7280); display: block; }
.header-actions { display: flex; gap: 16rpx; }
.mode-toggle { font-size: 32rpx; padding: 8rpx; }
.chat-area { flex: 1; overflow-y: auto; padding: 32rpx; }
.welcome { display: flex; flex-direction: column; align-items: center; padding: 64rpx 32rpx; }
.welcome-icon { font-size: 96rpx; margin-bottom: 24rpx; }
.welcome-text { font-size: 32rpx; color: var(--gn-text, #1f2937); font-weight: 500; margin-bottom: 16rpx; }
.welcome-sub { font-size: 28rpx; color: var(--gn-text-secondary, #6b7280); margin-bottom: 32rpx; }
.quick-questions { display: flex; flex-wrap: wrap; gap: 16rpx; justify-content: center; }
.quick-item { background: var(--gn-primary-light, #dbeafe); color: var(--gn-primary, #2563eb); font-size: 26rpx; padding: 16rpx 32rpx; border-radius: 40rpx; border: 2rpx solid var(--gn-primary, #2563eb); }
.quick-item-intro { background: #fef3c7; color: #d97706; border-color: #d97706; }
.msg-row { display: flex; margin-bottom: 24rpx; }
.msg-user { justify-content: flex-end; }
.msg-ai { justify-content: flex-start; align-items: flex-start; }
.ai-avatar { font-size: 56rpx; margin-right: 16rpx; flex-shrink: 0; margin-top: 8rpx; }
.msg-bubble { max-width: 75%; padding: 20rpx 28rpx; border-radius: 16rpx; font-size: 30rpx; line-height: 1.5; word-break: break-word; }
.user-bubble { background: var(--gn-primary, #2563eb); color: #fff; border-bottom-right-radius: 8rpx; }
.ai-bubble { background: var(--gn-card, #fff); color: var(--gn-text, #1f2937); border-bottom-left-radius: 8rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.voice-tag { font-size: 20rpx; margin-left: 8rpx; }
.ai-actions { margin-top: 12rpx; padding-top: 12rpx; border-top: 2rpx solid #f3f4f6; }
.ai-action-btn { font-size: 22rpx; color: var(--gn-primary, #2563eb); padding: 4rpx 12rpx; }
.input-area { display: flex; align-items: center; padding: 24rpx 32rpx; background: var(--gn-card, #fff); border-top: 2rpx solid var(--gn-border, #e5e7eb); flex-shrink: 0; gap: 16rpx; }
.voice-btn { width: 72rpx; height: 72rpx; border-radius: 50%; background: var(--gn-bg-muted, #f3f4f6); display: flex; align-items: center; justify-content: center; font-size: 32rpx; flex-shrink: 0; transition: all 0.2s; }
.voice-btn.recording { background: #ef4444; transform: scale(1.1); box-shadow: 0 0 20rpx rgba(239,68,68,0.4); }
.input-box { flex: 1; height: 72rpx; background: var(--gn-bg-muted, #f3f4f6); border-radius: 40rpx; padding: 0 28rpx; font-size: 28rpx; border: none; outline: none; }
.send-btn { background: var(--gn-primary, #2563eb); color: #fff; padding: 14rpx 36rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 500; flex-shrink: 0; }
.send-disabled { background: #9ca3af; }
.voice-area { flex: 1; overflow-y: auto; padding: 32rpx; }
.voice-wake { display: flex; flex-direction: column; align-items: center; padding: 60rpx 0; }
.voice-wake-btn { display: flex; align-items: center; justify-content: center; width: 200rpx; height: 200rpx; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 50%; box-shadow: 0 8rpx 32rpx rgba(37,99,235,0.4); margin-bottom: 30rpx; transition: all 0.3s; }
.voice-wake-btn.recording { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 8rpx 32rpx rgba(239,68,68,0.4); transform: scale(1.1); }
.voice-wake-icon { font-size: 80rpx; color: #fff; }
.voice-wake-hint { font-size: 26rpx; color: #9ca3af; }
.voice-wake-time { font-size: 48rpx; font-weight: 700; color: #1f2937; margin-top: 16rpx; }
.voice-reply-card { display: flex; padding: 30rpx; background: #fff; border-radius: 20rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08); margin-bottom: 30rpx; }
.voice-reply-icon { font-size: 48rpx; margin-right: 20rpx; }
.voice-reply-content { flex: 1; }
.voice-reply-text { font-size: 28rpx; color: #1f2937; line-height: 1.6; display: block; margin-bottom: 12rpx; }
.voice-reply-action { font-size: 24rpx; color: #2563eb; }
.voice-commands { margin-bottom: 30rpx; }
.commands-title { display: block; font-size: 28rpx; font-weight: 600; color: #1f2937; margin-bottom: 16rpx; }
.commands-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.command-item { display: flex; flex-direction: column; align-items: center; padding: 24rpx; background: #fff; border-radius: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05); }
.command-icon { font-size: 40rpx; margin-bottom: 8rpx; }
.command-text { font-size: 24rpx; color: #6b7280; }
.voice-history { margin-bottom: 30rpx; }
.history-title { display: block; font-size: 28rpx; font-weight: 600; color: #1f2937; margin-bottom: 16rpx; }
.history-list { background: #fff; border-radius: 16rpx; overflow: hidden; }
.history-item { display: flex; padding: 20rpx 24rpx; border-bottom: 2rpx solid #f3f4f6; }
.history-icon { font-size: 28rpx; margin-right: 12rpx; }
.history-content { flex: 1; }
.history-text { font-size: 24rpx; color: #6b7280; display: block; margin-bottom: 4rpx; }
.history-reply { font-size: 26rpx; color: #1f2937; display: block; }
.voice-bottom-bar { display: flex; align-items: center; justify-content: center; padding: 20rpx 32rpx; background: #fff; border-top: 2rpx solid #e5e7eb; gap: 16rpx; }
.mode-toggle-btn { padding: 12rpx 24rpx; background: #f3f4f6; border-radius: 20rpx; font-size: 24rpx; color: #6b7280; }
.voice-status { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: #ef4444; }
.status-dot { width: 12rpx; height: 12rpx; background: #ef4444; border-radius: 50%; animation: pulse-dot 1s infinite; }
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.voice-hint { position: fixed; bottom: 200rpx; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; padding: 32rpx 64rpx; border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; z-index: 100; animation: pulse 1.5s ease-in-out infinite; }
.voice-hint-icon { font-size: 64rpx; margin-bottom: 12rpx; }
.voice-hint-text { font-size: 28rpx; }
@keyframes pulse { 0%,100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
</style>
