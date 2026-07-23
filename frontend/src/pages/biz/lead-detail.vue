<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';
import { leadApi } from '@/api';

const userStore = useUserStore();
const leadId = ref('');
const lead = ref<any>(null);
const loading = ref(true);
const activeTab = ref('info');

const scriptType = ref('first_call');
const generatedScript = ref<any>(null);

const statusOptions = [
  { label: '新线索', value: 'new' },
  { label: '跟进中', value: 'following' },
  { label: '已试驾', value: 'test_drive' },
  { label: '谈判中', value: 'negotiating' },
  { label: '已成交', value: 'closed' },
  { label: '已流失', value: 'lost' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: '新线索', color: '#3b82f6' },
  following: { label: '跟进中', color: '#10b981' },
  test_drive: { label: '已试驾', color: '#8b5cf6' },
  negotiating: { label: '谈判中', color: '#f59e0b' },
  closed: { label: '已成交', color: '#22c55e' },
  lost: { label: '已流失', color: '#ef4444' },
};

onLoad(async (options: any) => {
  leadId.value = options.id;
  await loadLead();
});

async function loadLead() {
  loading.value = true;
  try {
    const res = await leadApi.detail(leadId.value);
    if (res.success) {
      lead.value = res.data;
    }
  } catch (e) {
    console.error('[Lead Detail] load error:', e);
  } finally {
    loading.value = false;
  }
}

async function runClassify() {
  uni.showLoading({ title: 'AI分类中...' });
  try {
    const res = await leadApi.classify(leadId.value);
    if (res.success) {
      lead.value.classification = res.data;
      uni.showToast({ title: '分类完成', icon: 'success' });
    }
  } catch (e) {
    console.error('[Lead] classify error:', e);
    uni.showToast({ title: '分类失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

async function runScore() {
  uni.showLoading({ title: 'AI评分中...' });
  try {
    const res = await leadApi.score(leadId.value);
    if (res.success) {
      lead.value.qualityScore = res.data;
      uni.showToast({ title: '评分完成', icon: 'success' });
    }
  } catch (e) {
    console.error('[Lead] score error:', e);
    uni.showToast({ title: '评分失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

async function runPredict() {
  uni.showLoading({ title: 'AI预测中...' });
  try {
    const res = await leadApi.predict(leadId.value);
    if (res.success) {
      lead.value.prediction = res.data;
      uni.showToast({ title: '预测完成', icon: 'success' });
    }
  } catch (e) {
    console.error('[Lead] predict error:', e);
    uni.showToast({ title: '预测失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

async function runAllAI() {
  uni.showLoading({ title: 'AI全量分析中...' });
  try {
    const [classifyRes, scoreRes, predictRes] = await Promise.all([
      leadApi.classify(leadId.value),
      leadApi.score(leadId.value),
      leadApi.predict(leadId.value),
    ]);
    
    if (classifyRes.success) lead.value.classification = classifyRes.data;
    if (scoreRes.success) lead.value.qualityScore = scoreRes.data;
    if (predictRes.success) lead.value.prediction = predictRes.data;
    
    uni.showToast({ title: '分析完成', icon: 'success' });
  } catch (e) {
    console.error('[Lead] AI all error:', e);
    uni.showToast({ title: '分析失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

async function updateStatus(status: string) {
  try {
    const res = await leadApi.updateStatus(leadId.value, status);
    if (res.success) {
      lead.value.status = status;
      uni.showToast({ title: '状态已更新', icon: 'success' });
    }
  } catch (e) {
    console.error('[Lead] update status error:', e);
    uni.showToast({ title: '更新失败', icon: 'none' });
  }
}

async function generateScript() {
  uni.showLoading({ title: '生成话术中...' });
  try {
    const res = await leadApi.generateScript(leadId.value, scriptType.value);
    if (res.success) {
      generatedScript.value = res.data;
      uni.showToast({ title: '生成完成', icon: 'success' });
    }
  } catch (e) {
    console.error('[Lead] generate script error:', e);
    uni.showToast({ title: '生成失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
}

function copyScript() {
  if (generatedScript.value?.script) {
    uni.setClipboardData({
      data: generatedScript.value.script,
      success: () => {
        uni.showToast({ title: '已复制', icon: 'success' });
      }
    });
  }
}

function formatTime(time: string) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>
    
    <view v-else-if="!lead" class="empty-state">
      <text>线索不存在</text>
    </view>
    
    <view v-else class="content">
      <view class="header-card">
        <view class="header-top">
          <view class="lead-basic">
            <text class="lead-name">{{ lead.name }}</text>
            <text class="lead-phone">{{ lead.phone }}</text>
          </view>
          <view class="lead-status" :style="{ backgroundColor: statusMap[lead.status]?.color || '#999' }">
            <text>{{ statusMap[lead.status]?.label || lead.status }}</text>
          </view>
        </view>
        
        <view class="lead-meta">
          <view v-if="lead.carModel" class="meta-item">
            <text class="meta-label">车型</text>
            <text class="meta-value">{{ lead.carModel }}</text>
          </view>
          <view v-if="lead.city" class="meta-item">
            <text class="meta-label">地区</text>
            <text class="meta-value">{{ lead.city }}</text>
          </view>
          <view v-if="lead.budget" class="meta-item">
            <text class="meta-label">预算</text>
            <text class="meta-value">{{ lead.budget }}</text>
          </view>
          <view v-if="lead.source" class="meta-item">
            <text class="meta-label">来源</text>
            <text class="meta-value">{{ lead.source }}</text>
          </view>
        </view>
        
        <view v-if="lead.remarks" class="lead-remarks">
          <text class="remarks-label">备注</text>
          <text class="remarks-text">{{ lead.remarks }}</text>
        </view>
        
        <view class="header-actions">
          <button class="action-btn ai-btn" @tap="runAllAI">
            <text>🤖 AI全量分析</text>
          </button>
          <picker :value="statusOptions.findIndex(o => o.value === lead.status)" @change="(e: any) => updateStatus(statusOptions[e.detail.value].value)">
            <view class="action-btn status-btn">
              <text>更新状态 ▼</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="tabs">
        <view class="tab" :class="{ active: activeTab === 'info' }" @tap="activeTab = 'info'">
          <text>基本信息</text>
        </view>
        <view class="tab" :class="{ active: activeTab === 'ai' }" @tap="activeTab = 'ai'">
          <text>AI分析</text>
        </view>
        <view class="tab" :class="{ active: activeTab === 'script' }" @tap="activeTab = 'script'">
          <text>话术辅助</text>
        </view>
        <view class="tab" :class="{ active: activeTab === 'followup' }" @tap="activeTab = 'followup'">
          <text>跟进记录</text>
        </view>
      </view>

      <view v-if="activeTab === 'info'" class="tab-content">
        <view class="info-section">
          <text class="section-title">基础信息</text>
          <view class="info-grid">
            <view class="info-item">
              <text class="info-label">姓名</text>
              <text class="info-value">{{ lead.name }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">电话</text>
              <text class="info-value">{{ lead.phone }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">城市</text>
              <text class="info-value">{{ lead.city || '-' }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">关注车型</text>
              <text class="info-value">{{ lead.carModel || '-' }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">品牌</text>
              <text class="info-value">{{ lead.carBrand || '-' }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">预算</text>
              <text class="info-value">{{ lead.budget || '-' }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">来源</text>
              <text class="info-value">{{ lead.source }}</text>
            </view>
            <view class="info-item">
              <text class="info-label">创建时间</text>
              <text class="info-value">{{ formatTime(lead.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activeTab === 'ai'" class="tab-content">
        <view class="ai-section">
          <view class="ai-header">
            <text class="section-title">AI智能分析</text>
            <view class="ai-actions">
              <button class="mini-btn" @tap="runClassify">分类</button>
              <button class="mini-btn" @tap="runScore">评分</button>
              <button class="mini-btn" @tap="runPredict">预测</button>
            </view>
          </view>
          
          <view v-if="lead.classification" class="ai-card">
            <text class="ai-card-title">📊 线索分类</text>
            <view class="ai-card-content">
              <view class="ai-row">
                <text class="ai-label">线索类型：</text>
                <text class="ai-value">{{ lead.classification.leadType }}</text>
              </view>
              <view class="ai-row">
                <text class="ai-label">购车阶段：</text>
                <text class="ai-value">{{ lead.classification.purchaseStage }}</text>
              </view>
              <view class="ai-row">
                <text class="ai-label">意向评分：</text>
                <text class="ai-value">{{ lead.classification.intentScore }}分</text>
              </view>
              <view class="ai-row">
                <text class="ai-label">预估购车：</text>
                <text class="ai-value">{{ lead.classification.estimatedPurchaseTime }}</text>
              </view>
              <view class="ai-tags">
                <text class="ai-label">标签：</text>
                <view v-for="tag in lead.classification.tags" :key="tag" class="tag">
                  <text>{{ tag }}</text>
                </view>
              </view>
              <view class="ai-actions-list">
                <text class="ai-label">建议动作：</text>
                <view v-for="(action, i) in lead.classification.suggestedActions" :key="i" class="action-item">
                  <text>{{ i + 1 }}. {{ action }}</text>
                </view>
              </view>
            </view>
          </view>
          
          <view v-if="lead.qualityScore" class="ai-card">
            <text class="ai-card-title">⭐ 质量评分</text>
            <view class="ai-card-content">
              <view class="score-header">
                <text class="score-grade">{{ lead.qualityScore.grade }}级</text>
                <text class="score-total">{{ lead.qualityScore.totalScore }}分</text>
                <text class="score-priority">{{ lead.qualityScore.priority }}优先级</text>
              </view>
              <view class="score-dimensions">
                <view class="dimension-item">
                  <text class="dimension-label">意向度</text>
                  <view class="dimension-bar">
                    <view class="dimension-fill" :style="{ width: lead.qualityScore.dimensions.intentScore + '%' }"></view>
                  </view>
                  <text class="dimension-value">{{ lead.qualityScore.dimensions.intentScore }}</text>
                </view>
                <view class="dimension-item">
                  <text class="dimension-label">预算匹配</text>
                  <view class="dimension-bar">
                    <view class="dimension-fill" :style="{ width: lead.qualityScore.dimensions.budgetMatch + '%' }"></view>
                  </view>
                  <text class="dimension-value">{{ lead.qualityScore.dimensions.budgetMatch }}</text>
                </view>
                <view class="dimension-item">
                  <text class="dimension-label">购车时机</text>
                  <view class="dimension-bar">
                    <view class="dimension-fill" :style="{ width: lead.qualityScore.dimensions.timingScore + '%' }"></view>
                  </view>
                  <text class="dimension-value">{{ lead.qualityScore.dimensions.timingScore }}</text>
                </view>
              </view>
              <view class="score-reasons">
                <text v-for="reason in lead.qualityScore.reasons" :key="reason" class="reason-tag">✓ {{ reason }}</text>
              </view>
            </view>
          </view>
          
          <view v-if="lead.prediction" class="ai-card">
            <text class="ai-card-title">🎯 转化预测</text>
            <view class="ai-card-content">
              <view class="prediction-header">
                <text class="prediction-prob">{{ (lead.prediction.conversionProbability * 100).toFixed(0) }}%</text>
                <text class="prediction-label">转化概率</text>
              </view>
              <view class="ai-row">
                <text class="ai-label">预估成交：</text>
                <text class="ai-value">{{ lead.prediction.estimatedCloseTime }}</text>
              </view>
              <view class="ai-row">
                <text class="ai-label">预估金额：</text>
                <text class="ai-value">¥{{ lead.prediction.estimatedDealAmount?.toLocaleString() }}</text>
              </view>
              <view class="prediction-factors">
                <view class="factors-section">
                  <text class="factors-title">⚠️ 风险因素</text>
                  <view v-for="risk in lead.prediction.riskFactors" :key="risk" class="factor-item risk">
                    <text>{{ risk }}</text>
                  </view>
                </view>
                <view class="factors-section">
                  <text class="factors-title">✅ 机会因素</text>
                  <view v-for="opp in lead.prediction.opportunityFactors" :key="opp" class="factor-item opportunity">
                    <text>{{ opp }}</text>
                  </view>
                </view>
              </view>
              <view v-if="lead.prediction.timeline" class="timeline">
                <text class="timeline-title">转化时间线</text>
                <view v-for="(item, i) in lead.prediction.timeline" :key="i" class="timeline-item">
                  <view class="timeline-dot"></view>
                  <view class="timeline-content">
                    <text class="timeline-stage">{{ item.stage }}</text>
                    <text class="timeline-deadline">{{ item.deadline }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          
          <view v-if="!lead.classification && !lead.qualityScore && !lead.prediction" class="ai-empty">
            <text class="empty-icon">🤖</text>
            <text class="empty-text">尚未进行AI分析</text>
            <button class="empty-btn" @tap="runAllAI">开始AI分析</button>
          </view>
        </view>
      </view>

      <view v-if="activeTab === 'script'" class="tab-content">
        <view class="script-section">
          <text class="section-title">跟进话术生成</text>
          
          <view class="script-type-selector">
            <view 
              v-for="type in [{ label: '首次电话', value: 'first_call' }, { label: '微信跟进', value: 'wechat' }, { label: '短信跟进', value: 'sms' }, { label: '二次跟进', value: 'second_followup' }]" 
              :key="type.value"
              class="type-option"
              :class="{ active: scriptType === type.value }"
              @tap="scriptType = type.value"
            >
              <text>{{ type.label }}</text>
            </view>
          </view>
          
          <button class="generate-btn" @tap="generateScript">生成话术</button>
          
          <view v-if="generatedScript" class="script-result">
            <view class="script-header">
              <text class="script-title">生成的话术</text>
              <button class="copy-btn" @tap="copyScript">复制</button>
            </view>
            <view class="script-content">
              <text class="script-text">{{ generatedScript.script }}</text>
            </view>
            <view class="script-points">
              <text class="points-title">关键要点：</text>
              <view v-for="(point, i) in generatedScript.keyPoints" :key="i" class="point-item">
                <text>• {{ point }}</text>
              </view>
            </view>
            <view class="script-timing">
              <text class="timing-label">建议跟进时间：</text>
              <text class="timing-value">{{ generatedScript.suggestedTiming }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activeTab === 'followup'" class="tab-content">
        <view class="followup-section">
          <text class="section-title">跟进记录</text>
          
          <view v-if="lead.followups && lead.followups.length > 0" class="followup-list">
            <view v-for="(item, i) in lead.followups" :key="i" class="followup-item">
              <view class="followup-header">
                <text class="followup-type">{{ item.type }}</text>
                <text class="followup-time">{{ formatTime(item.createdAt) }}</text>
              </view>
              <view v-if="item.result" class="followup-result">
                <text>{{ item.result }}</text>
              </view>
              <view v-if="item.nextAction" class="followup-next">
                <text class="next-label">下一步：</text>
                <text>{{ item.nextAction }}</text>
              </view>
            </view>
          </view>
          
          <view v-else class="followup-empty">
            <text class="empty-text">暂无跟进记录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 28rpx;
  color: #999;
}

.content {
  padding: 30rpx;
}

.header-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.lead-basic {
  flex: 1;
}

.lead-name {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.lead-phone {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.lead-status {
  padding: 10rpx 24rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #fff;
}

.lead-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.meta-item {
  flex: 1;
  min-width: 140rpx;
}

.meta-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.meta-value {
  display: block;
  font-size: 26rpx;
  color: #333;
}

.lead-remarks {
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.remarks-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.remarks-text {
  display: block;
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
}

.ai-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.status-btn {
  background: #f5f5f5;
  color: #666;
}

.tabs {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  padding: 10rpx;
  margin-bottom: 30rpx;
}

.tab {
  flex: 1;
  padding: 20rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  border-radius: 16rpx;
}

.tab.active {
  background: #667eea;
  color: #fff;
}

.tab-content {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.info-item {
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.info-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.info-value {
  display: block;
  font-size: 26rpx;
  color: #333;
}

.ai-section {
  padding: 0;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.ai-actions {
  display: flex;
  gap: 12rpx;
}

.mini-btn {
  padding: 10rpx 20rpx;
  background: #667eea;
  border-radius: 12rpx;
  color: #fff;
  font-size: 24rpx;
}

.ai-card {
  background: #f9f9f9;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.ai-card-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.ai-card-content {
  font-size: 26rpx;
}

.ai-row {
  display: flex;
  margin-bottom: 12rpx;
}

.ai-label {
  color: #666;
  margin-right: 12rpx;
}

.ai-value {
  flex: 1;
  color: #333;
  font-weight: bold;
}

.ai-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.tag {
  padding: 6rpx 16rpx;
  background: #e0f2fe;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #0ea5e9;
}

.ai-actions-list {
  margin-top: 12rpx;
}

.action-item {
  padding: 8rpx 0;
  color: #333;
}

.score-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.score-grade {
  font-size: 48rpx;
  font-weight: bold;
  color: #f59e0b;
}

.score-total {
  font-size: 32rpx;
  color: #333;
}

.score-priority {
  padding: 6rpx 16rpx;
  background: #fef3c7;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #f59e0b;
}

.score-dimensions {
  margin-bottom: 20rpx;
}

.dimension-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.dimension-label {
  width: 140rpx;
  font-size: 24rpx;
  color: #666;
}

.dimension-bar {
  flex: 1;
  height: 16rpx;
  background: #e5e5e5;
  border-radius: 8rpx;
  overflow: hidden;
}

.dimension-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 8rpx;
}

.dimension-value {
  width: 60rpx;
  text-align: right;
  font-size: 24rpx;
  color: #333;
}

.score-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.reason-tag {
  padding: 6rpx 16rpx;
  background: #dcfce7;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #22c55e;
}

.prediction-header {
  text-align: center;
  margin-bottom: 20rpx;
}

.prediction-prob {
  display: block;
  font-size: 64rpx;
  font-weight: bold;
  color: #667eea;
}

.prediction-label {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.prediction-factors {
  display: flex;
  gap: 30rpx;
  margin: 20rpx 0;
}

.factors-section {
  flex: 1;
}

.factors-title {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.factor-item {
  padding: 10rpx 16rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
  font-size: 24rpx;
}

.factor-item.risk {
  background: #fee2e2;
  color: #ef4444;
}

.factor-item.opportunity {
  background: #dcfce7;
  color: #22c55e;
}

.timeline {
  margin-top: 20rpx;
}

.timeline-title {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.timeline-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.timeline-dot {
  width: 16rpx;
  height: 16rpx;
  background: #667eea;
  border-radius: 50%;
  margin-top: 6rpx;
}

.timeline-content {
  flex: 1;
}

.timeline-stage {
  display: block;
  font-size: 26rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.timeline-deadline {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.ai-empty {
  text-align: center;
  padding: 60rpx 0;
}

.empty-icon {
  display: block;
  font-size: 100rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.empty-btn {
  padding: 20rpx 60rpx;
  background: #667eea;
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
}

.script-section {
  padding: 0;
}

.script-type-selector {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.type-option {
  flex: 1;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
  font-size: 24rpx;
  color: #666;
}

.type-option.active {
  background: #667eea;
  color: #fff;
}

.generate-btn {
  width: 100%;
  padding: 24rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  color: #fff;
  font-size: 28rpx;
  margin-bottom: 30rpx;
}

.script-result {
  background: #f9f9f9;
  border-radius: 16rpx;
  padding: 24rpx;
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.script-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.copy-btn {
  padding: 10rpx 24rpx;
  background: #667eea;
  border-radius: 12rpx;
  color: #fff;
  font-size: 24rpx;
}

.script-content {
  padding: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.script-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

.script-points {
  margin-bottom: 20rpx;
}

.points-title {
  display: block;
  font-size: 24rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.point-item {
  padding: 8rpx 0;
  font-size: 24rpx;
  color: #333;
}

.script-timing {
  padding: 16rpx;
  background: #fff;
  border-radius: 12rpx;
}

.timing-label {
  font-size: 24rpx;
  color: #666;
  margin-right: 12rpx;
}

.timing-value {
  font-size: 24rpx;
  color: #333;
}

.followup-section {
  padding: 0;
}

.followup-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.followup-item {
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.followup-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.followup-type {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.followup-time {
  font-size: 22rpx;
  color: #999;
}

.followup-result {
  font-size: 24rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.followup-next {
  font-size: 24rpx;
  color: #666;
}

.next-label {
  color: #999;
  margin-right: 8rpx;
}

.followup-empty {
  text-align: center;
  padding: 60rpx 0;
}
</style>
