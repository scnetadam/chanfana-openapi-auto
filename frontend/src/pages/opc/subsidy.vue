<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const policyId = ref('');
const cityName = ref('');
const policyInfo = ref<any>({});
const formData = ref({
  companyName: '',
  creditCode: '',
  legalPerson: '',
  phone: '',
  email: '',
  projectType: '',
  projectDesc: '',
  teamSize: '',
  funding: '',
  attachments: [] as string[],
});
const submitting = ref(false);

onLoad((options: any) => {
  policyId.value = options.policyId;
  cityName.value = options.city || '';
  loadPolicy();
});

function loadPolicy() {
  policyInfo.value = {
    title: 'AI产业专项扶持资金',
    type: '投资补贴',
    amount: '最高500万',
    city: cityName.value,
  };
}

function chooseFile() {
  uni.chooseMessageFile({
    count: 5,
    type: 'file',
    success: (res) => {
      const files = res.tempFiles.map((f: any) => f.path);
      formData.value.attachments = [...formData.value.attachments, ...files];
    },
  });
}

function removeFile(index: number) {
  formData.value.attachments.splice(index, 1);
}

async function submit() {
  if (!formData.value.companyName) {
    uni.showToast({ title: '请填写公司名称', icon: 'none' });
    return;
  }
  if (!formData.value.creditCode) {
    uni.showToast({ title: '请填写统一社会信用代码', icon: 'none' });
    return;
  }
  if (!formData.value.phone) {
    uni.showToast({ title: '请填写联系电话', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    uni.showModal({
      title: '提交成功',
      content: '您的申请已提交，我们将在3-5个工作日内审核',
      showCancel: false,
      success: () => {
        uni.navigateBack();
      },
    });
  } catch (err) {
    uni.showToast({ title: '提交失败，请重试', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="subsidy-page">
    <view class="policy-card">
      <text class="policy-title">{{ policyInfo.title }}</text>
      <view class="policy-tags">
        <text class="tag">{{ policyInfo.type }}</text>
        <text class="tag highlight">{{ policyInfo.amount }}</text>
        <text class="tag">{{ policyInfo.city }}</text>
      </view>
    </view>

    <view class="form-section">
      <text class="section-title">企业信息</text>
      
      <view class="form-item">
        <text class="label required">公司名称</text>
        <input class="input" v-model="formData.companyName" placeholder="请输入公司全称" />
      </view>

      <view class="form-item">
        <text class="label required">统一社会信用代码</text>
        <input class="input" v-model="formData.creditCode" placeholder="请输入18位信用代码" />
      </view>

      <view class="form-item">
        <text class="label required">法人代表</text>
        <input class="input" v-model="formData.legalPerson" placeholder="请输入法人姓名" />
      </view>

      <view class="form-item">
        <text class="label required">联系电话</text>
        <input class="input" v-model="formData.phone" placeholder="请输入手机号" type="number" />
      </view>

      <view class="form-item">
        <text class="label">联系邮箱</text>
        <input class="input" v-model="formData.email" placeholder="请输入邮箱地址" />
      </view>
    </view>

    <view class="form-section">
      <text class="section-title">项目信息</text>
      
      <view class="form-item">
        <text class="label required">项目类型</text>
        <picker mode="selector" :range="['AI技术研发', 'AI产品应用', 'AI解决方案', 'AI服务平台']" @change="(e: any) => formData.projectType = e.detail.value">
          <view class="picker">
            <text :class="formData.projectType ? 'has-value' : ''">
              {{ formData.projectType || '请选择项目类型' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">项目简介</text>
        <textarea class="textarea" v-model="formData.projectDesc" placeholder="请简要描述您的AI项目（200字以内）" maxlength="200" />
      </view>

      <view class="form-item">
        <text class="label required">团队规模</text>
        <picker mode="selector" :range="['1-10人', '11-50人', '51-100人', '100人以上']" @change="(e: any) => formData.teamSize = e.detail.value">
          <view class="picker">
            <text :class="formData.teamSize ? 'has-value' : ''">
              {{ formData.teamSize || '请选择团队规模' }}
            </text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">已获融资</text>
        <input class="input" v-model="formData.funding" placeholder="例如：天使轮500万" />
      </view>
    </view>

    <view class="form-section">
      <text class="section-title">附件材料</text>
      <text class="section-tip">请上传营业执照、项目计划书等相关材料（PDF/图片）</text>
      
      <view class="attachment-list">
        <view v-for="(file, index) in formData.attachments" :key="index" class="attachment-item">
          <text class="file-icon">📄</text>
          <text class="file-name">{{ file.split('/').pop() }}</text>
          <text class="remove-btn" @tap="removeFile(index)">✕</text>
        </view>
        <view class="add-attachment" @tap="chooseFile">
          <text class="add-icon">+</text>
          <text class="add-text">添加附件</text>
        </view>
      </view>
    </view>

    <view class="submit-bar">
      <button class="submit-btn" :loading="submitting" :disabled="submitting" @tap="submit">
        <text>提交申请</text>
      </button>
    </view>
  </view>
</template>

<style scoped>
.subsidy-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.policy-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  color: #fff;
}

.policy-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}

.policy-tags {
  display: flex;
  gap: 12rpx;
}

.tag {
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  font-size: 24rpx;
}

.tag.highlight {
  background: #fff;
  color: #667eea;
}

.form-section {
  background: #fff;
  margin: 24rpx 0;
  padding: 30rpx;
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

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.attachment-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.file-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.file-name {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.remove-btn {
  font-size: 32rpx;
  color: #999;
  padding: 0 10rpx;
}

.add-attachment {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx dashed #ddd;
}

.add-icon {
  font-size: 40rpx;
  color: #999;
  margin-right: 12rpx;
}

.add-text {
  font-size: 26rpx;
  color: #999;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  width: 100%;
  padding: 28rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: 500;
}
</style>
