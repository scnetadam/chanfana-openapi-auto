<script setup lang="ts">
import { ref } from 'vue';
import { opcApi } from '@/api';
import { getUserId } from '@/api';

const currentStep = ref(1);
const formData = ref({
  companyName: '',
  creditCode: '',
  city: '',
  projectType: '',
  projectName: '',
  projectDesc: '',
  teamSize: '',
  funding: '',
  founderName: '',
  founderPhone: '',
  founderEmail: '',
  founderBackground: '',
  businessPlan: '',
  expectations: [] as string[],
  agreeTerms: false,
});
const submitting = ref(false);

const cities = ['北京', '上海', '深圳', '杭州', '广州', '成都', '武汉', '南京', '苏州', '西安'];
const projectTypes = ['AI技术研发', 'AI产品应用', 'AI解决方案', 'AI服务平台', 'AI硬件', '其他'];
const expectationOptions = ['投资补贴', '场地支持', '人才引进', 'TOKEN激励', '政策咨询', '资源对接'];

function nextStep() {
  if (currentStep.value === 1) {
    if (!formData.value.companyName || !formData.value.creditCode || !formData.value.city) {
      uni.showToast({ title: '请完善企业信息', icon: 'none' });
      return;
    }
  } else if (currentStep.value === 2) {
    if (!formData.value.projectName || !formData.value.projectDesc || !formData.value.projectType) {
      uni.showToast({ title: '请完善项目信息', icon: 'none' });
      return;
    }
  } else if (currentStep.value === 3) {
    if (!formData.value.founderName || !formData.value.founderPhone) {
      uni.showToast({ title: '请完善联系人信息', icon: 'none' });
      return;
    }
  }
  currentStep.value++;
}

function prevStep() {
  currentStep.value--;
}

function toggleExpectation(item: string) {
  const index = formData.value.expectations.indexOf(item);
  if (index > -1) {
    formData.value.expectations.splice(index, 1);
  } else {
    formData.value.expectations.push(item);
  }
}

async function submit() {
  if (!formData.value.agreeTerms) {
    uni.showToast({ title: '请同意入驻协议', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    const userId = getUserId();
    const res = await opcApi.apply({
      userId,
      nickName: formData.value.founderName,
      followers: 0,
      crossPlatformProof: '',
      businessPlan: JSON.stringify(formData.value),
    });
    
    if (res.success) {
      uni.showModal({
        title: '申请提交成功',
        content: '我们将在5个工作日内联系您，请保持电话畅通',
        showCancel: false,
        success: () => {
          uni.navigateBack();
        },
      });
    } else {
      uni.showToast({ title: res.error || '提交失败', icon: 'none' });
    }
  } catch (err) {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="apply-page">
    <view class="progress-bar">
      <view :class="['progress-step', currentStep >= 1 ? 'active' : '']">
        <text class="step-num">1</text>
        <text class="step-label">企业信息</text>
      </view>
      <view class="progress-line" :style="{ background: currentStep >= 2 ? '#667eea' : '#ddd' }" />
      <view :class="['progress-step', currentStep >= 2 ? 'active' : '']">
        <text class="step-num">2</text>
        <text class="step-label">项目信息</text>
      </view>
      <view class="progress-line" :style="{ background: currentStep >= 3 ? '#667eea' : '#ddd' }" />
      <view :class="['progress-step', currentStep >= 3 ? 'active' : '']">
        <text class="step-num">3</text>
        <text class="step-label">联系方式</text>
      </view>
      <view class="progress-line" :style="{ background: currentStep >= 4 ? '#667eea' : '#ddd' }" />
      <view :class="['progress-step', currentStep >= 4 ? 'active' : '']">
        <text class="step-num">4</text>
        <text class="step-label">提交申请</text>
      </view>
    </view>

    <view v-if="currentStep === 1" class="step-content">
      <view class="form-section">
        <text class="section-title">企业基本信息</text>
        
        <view class="form-item">
          <text class="label required">公司名称</text>
          <input class="input" v-model="formData.companyName" placeholder="请输入公司全称" />
        </view>

        <view class="form-item">
          <text class="label required">统一社会信用代码</text>
          <input class="input" v-model="formData.creditCode" placeholder="请输入18位信用代码" />
        </view>

        <view class="form-item">
          <text class="label required">入驻城市</text>
          <picker mode="selector" :range="cities" @change="(e: any) => formData.city = cities[e.detail.value]">
            <view class="picker">
              <text :class="formData.city ? 'has-value' : ''">{{ formData.city || '请选择城市' }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <view v-if="currentStep === 2" class="step-content">
      <view class="form-section">
        <text class="section-title">项目信息</text>
        
        <view class="form-item">
          <text class="label required">项目类型</text>
          <picker mode="selector" :range="projectTypes" @change="(e: any) => formData.projectType = projectTypes[e.detail.value]">
            <view class="picker">
              <text :class="formData.projectType ? 'has-value' : ''">{{ formData.projectType || '请选择项目类型' }}</text>
              <text class="arrow">›</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label required">项目名称</text>
          <input class="input" v-model="formData.projectName" placeholder="请输入项目名称" />
        </view>

        <view class="form-item">
          <text class="label required">项目简介</text>
          <textarea class="textarea" v-model="formData.projectDesc" placeholder="请详细描述您的AI项目（技术方向、应用场景、商业模式等）" maxlength="500" />
        </view>

        <view class="form-item">
          <text class="label">团队规模</text>
          <input class="input" v-model="formData.teamSize" placeholder="例如：35人" />
        </view>

        <view class="form-item">
          <text class="label">已获融资</text>
          <input class="input" v-model="formData.funding" placeholder="例如：A轮2000万" />
        </view>
      </view>
    </view>

    <view v-if="currentStep === 3" class="step-content">
      <view class="form-section">
        <text class="section-title">创始人信息</text>
        
        <view class="form-item">
          <text class="label required">创始人姓名</text>
          <input class="input" v-model="formData.founderName" placeholder="请输入创始人姓名" />
        </view>

        <view class="form-item">
          <text class="label required">联系电话</text>
          <input class="input" v-model="formData.founderPhone" placeholder="请输入手机号" type="number" />
        </view>

        <view class="form-item">
          <text class="label">联系邮箱</text>
          <input class="input" v-model="formData.founderEmail" placeholder="请输入邮箱" />
        </view>

        <view class="form-item">
          <text class="label">创始人背景</text>
          <textarea class="textarea" v-model="formData.founderBackground" placeholder="学历、工作经历、创业经历等" maxlength="300" />
        </view>
      </view>
    </view>

    <view v-if="currentStep === 4" class="step-content">
      <view class="form-section">
        <text class="section-title">期望支持</text>
        <text class="section-tip">请选择您希望获得的支持类型（可多选）</text>
        
        <view class="expectation-grid">
          <view
            v-for="item in expectationOptions"
            :key="item"
            :class="['expectation-item', formData.expectations.includes(item) ? 'active' : '']"
            @tap="toggleExpectation(item)"
          >
            <text class="check-icon">{{ formData.expectations.includes(item) ? '✓' : '' }}</text>
            <text class="item-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">商业计划</text>
        <textarea class="textarea" v-model="formData.businessPlan" placeholder="请简要描述您的商业计划和发展规划（选填）" maxlength="500" />
      </view>

      <view class="terms-section">
        <view class="terms-checkbox" @tap="formData.agreeTerms = !formData.agreeTerms">
          <text class="checkbox">{{ formData.agreeTerms ? '✓' : '' }}</text>
          <text class="terms-text">我已阅读并同意《OPC创业广场入驻协议》</text>
        </view>
      </view>
    </view>

    <view class="action-bar">
      <button v-if="currentStep > 1" class="action-btn secondary" @tap="prevStep">上一步</button>
      <button v-if="currentStep < 4" class="action-btn primary" @tap="nextStep">下一步</button>
      <button v-if="currentStep === 4" class="action-btn primary" :loading="submitting" :disabled="submitting" @tap="submit">提交申请</button>
    </view>
  </view>
</template>

<style scoped>
.apply-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.progress-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx;
  background: #fff;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #ddd;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.progress-step.active .step-num {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.step-label {
  font-size: 22rpx;
  color: #999;
}

.progress-step.active .step-label {
  color: #667eea;
  font-weight: 500;
}

.progress-line {
  width: 60rpx;
  height: 4rpx;
  margin: 0 10rpx 30rpx;
}

.step-content {
  padding: 30rpx;
}

.form-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.section-tip {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
}

.label.required::before {
  content: '*';
  color: #f5576c;
  margin-right: 4rpx;
}

.input,
.textarea,
.picker {
  width: 100%;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.textarea {
  min-height: 200rpx;
}

.picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.picker text:not(.arrow) {
  flex: 1;
  color: #999;
}

.picker text.has-value {
  color: #333;
}

.arrow {
  font-size: 32rpx;
  color: #999;
}

.expectation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.expectation-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.expectation-item.active {
  background: #e3f2fd;
  border-color: #667eea;
}

.check-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #ddd;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  margin-right: 16rpx;
}

.expectation-item.active .check-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.item-text {
  font-size: 26rpx;
  color: #333;
}

.terms-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.terms-checkbox {
  display: flex;
  align-items: center;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border-radius: 6rpx;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #667eea;
  margin-right: 16rpx;
}

.terms-text {
  font-size: 26rpx;
  color: #333;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.action-btn {
  flex: 1;
  padding: 28rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #666;
}
</style>
