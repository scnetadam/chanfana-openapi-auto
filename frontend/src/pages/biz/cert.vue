<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { bizCertApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const loading = ref(false);
const certStatus = ref<any>(null);

const form = ref({
  companyName: '',
  creditCode: '',
  legalPerson: '',
  contactName: '',
  contactPhone: '',
  industry: '',
  scale: '',
});

const industries = [
  '汽车整车制造',
  '汽车零部件',
  '汽车销售',
  '汽车服务',
  '新能源汽车',
  '其他',
];

const scales = ['1-50人', '51-200人', '201-500人', '501-1000人', '1000人以上'];

onShow(async () => {
  await loadStatus();
});

async function loadStatus() {
  try {
    const res = await bizCertApi.status(userStore.userId);
    if (res.success) {
      certStatus.value = res.data;
    }
  } catch (e) {
    console.error('[BizCert] load status error:', e);
  }
}

async function handleSubmit() {
  if (!form.value.companyName.trim()) {
    uni.showToast({ title: '请填写公司名称', icon: 'none' });
    return;
  }
  if (!form.value.contactName.trim()) {
    uni.showToast({ title: '请填写联系人', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(form.value.contactPhone)) {
    uni.showToast({ title: '请填写正确的手机号', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const res = await bizCertApi.apply({
      userId: userStore.userId,
      companyName: form.value.companyName,
      creditCode: form.value.creditCode,
      legalPerson: form.value.legalPerson,
      contactName: form.value.contactName,
      contactPhone: form.value.contactPhone,
      industry: form.value.industry,
      scale: form.value.scale,
    });

    if (res.success) {
      uni.showToast({ title: '提交成功', icon: 'success' });
      certStatus.value = res.data;
    } else {
      uni.showToast({ title: res.error || '提交失败', icon: 'none' });
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function reApply() {
  certStatus.value = null;
}
</script>

<template>
  <view class="cert-page">
    <view class="header">
      <text class="title">商家认证</text>
      <text class="subtitle">完成认证解锁全部商家功能</text>
    </view>

    <view v-if="certStatus?.status === 'pending'" class="status-card pending">
      <text class="status-icon">⏳</text>
      <text class="status-title">审核中</text>
      <text class="status-desc">您的认证申请正在审核中，预计1-3个工作日完成</text>
    </view>

    <view v-else-if="certStatus?.status === 'approved'" class="status-card approved">
      <text class="status-icon">✅</text>
      <text class="status-title">认证通过</text>
      <text class="status-desc">您已成为认证商家，可使用全部商家功能</text>
      <button class="action-btn" @tap="() => uni.navigateBack()">返回工作台</button>
    </view>

    <view v-else-if="certStatus?.status === 'rejected'" class="status-card rejected">
      <text class="status-icon">❌</text>
      <text class="status-title">认证失败</text>
      <text class="status-desc">{{ certStatus.message || '认证信息有误，请重新提交' }}</text>
      <button class="action-btn" @tap="reApply">重新申请</button>
    </view>

    <view v-else class="form-section">
      <view class="form-group">
        <text class="form-label required">公司名称</text>
        <input
          v-model="form.companyName"
          class="form-input"
          placeholder="请输入公司全称"
        />
      </view>

      <view class="form-group">
        <text class="form-label">统一社会信用代码</text>
        <input
          v-model="form.creditCode"
          class="form-input"
          placeholder="请输入18位信用代码"
          maxlength="18"
        />
      </view>

      <view class="form-group">
        <text class="form-label">法人代表</text>
        <input
          v-model="form.legalPerson"
          class="form-input"
          placeholder="请输入法人姓名"
        />
      </view>

      <view class="form-group">
        <text class="form-label required">联系人</text>
        <input
          v-model="form.contactName"
          class="form-input"
          placeholder="请输入联系人姓名"
        />
      </view>

      <view class="form-group">
        <text class="form-label required">联系电话</text>
        <input
          v-model="form.contactPhone"
          class="form-input"
          placeholder="请输入手机号"
          type="tel"
          maxlength="11"
        />
      </view>

      <view class="form-group">
        <text class="form-label">所属行业</text>
        <picker
          :value="industries.indexOf(form.industry)"
          :range="industries"
          @change="(e: any) => form.industry = industries[e.detail.value]"
        >
          <view class="form-picker">
            <text :class="{ placeholder: !form.industry }">
              {{ form.industry || '请选择行业' }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-group">
        <text class="form-label">企业规模</text>
        <picker
          :value="scales.indexOf(form.scale)"
          :range="scales"
          @change="(e: any) => form.scale = scales[e.detail.value]"
        >
          <view class="form-picker">
            <text :class="{ placeholder: !form.scale }">
              {{ form.scale || '请选择规模' }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <button
        class="submit-btn"
        :loading="loading"
        :disabled="loading"
        @tap="handleSubmit"
      >
        提交认证
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.cert-page {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  padding: 60rpx 30rpx 40rpx;
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

.status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
  margin: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  &.pending {
    .status-icon {
      color: #f59e0b;
    }
  }

  &.approved {
    .status-icon {
      color: #10b981;
    }
  }

  &.rejected {
    .status-icon {
      color: #ef4444;
    }
  }
}

.status-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16rpx;
}

.status-desc {
  font-size: 28rpx;
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 30rpx;
}

.action-btn {
  padding: 0 60rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 40rpx;

  &::after {
    border: none;
  }
}

.form-section {
  padding: 24rpx;
}

.form-group {
  margin-bottom: 30rpx;
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
  color: #1f2937;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
}

.form-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: #fff;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;

  .placeholder {
    color: #9ca3af;
  }

  .picker-arrow {
    font-size: 32rpx;
    color: #d1d5db;
  }
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-radius: 48rpx;
  margin-top: 40rpx;

  &::after {
    border: none;
  }
}
</style>
