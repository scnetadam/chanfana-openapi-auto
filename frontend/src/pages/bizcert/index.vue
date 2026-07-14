<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { bizCertApi } from '@/api';
import { useUserStore } from '@/stores';

const userStore = useUserStore();

const companyName = ref('');
const creditCode = ref('');
const legalPerson = ref('');
const contactName = ref('');
const contactPhone = ref('');
const industry = ref('');
const scale = ref('');
const loading = ref(true);
const submitting = ref(false);
const certStatus = ref<any>(null);
const isBizUser = ref(false);

onShow(async () => {
  if (!userStore.isLoggedIn) return;
  await loadCertStatus();
});

async function loadCertStatus() {
  loading.value = true;
  try {
    const res = await bizCertApi.status(userStore.userId);
    if (res.success && res.data) {
      certStatus.value = res.data;
      if (res.data.status === 'approved') isBizUser.value = true;
    }
  } catch (e: any) {
    console.error('[BizCert] status error:', e.message);
  } finally {
    loading.value = false;
  }
}

async function submitCert() {
  if (!companyName.value.trim()) { uni.showToast({ title: '请输入企业名称', icon: 'none' }); return; }
  if (!contactName.value.trim()) { uni.showToast({ title: '请输入联系人', icon: 'none' }); return; }
  if (!contactPhone.value.trim()) { uni.showToast({ title: '请输入联系电话', icon: 'none' }); return; }

  submitting.value = true;
  try {
    const res = await bizCertApi.apply({
      userId: userStore.userId,
      companyName: companyName.value.trim(),
      creditCode: creditCode.value.trim(),
      legalPerson: legalPerson.value.trim(),
      contactName: contactName.value.trim(),
      contactPhone: contactPhone.value.trim(),
      industry: industry.value.trim(),
      scale: scale.value.trim(),
    });
    if (res.success && res.data) {
      certStatus.value = res.data;
      if (res.data.status === 'approved') {
        isBizUser.value = true;
        uni.showToast({ title: '认证通过！', icon: 'success' });
      } else {
        uni.showToast({ title: res.data.message || '已提交，审核中', icon: 'none' });
      }
    } else {
      uni.showToast({ title: '认证失败', icon: 'none' });
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '认证失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view v-if="loading" class="loading"><text>加载中...</text></view>

    <view v-else-if="isBizUser" class="cert-approved">
      <text class="approved-icon">&#x2713;</text>
      <text class="approved-title">认证已通过</text>
      <text class="approved-desc">您已通过龟钮印证商家认证，可发布KOL任务和商家产品</text>
      <view class="menu-list">
        <view class="menu-item" @tap="uni.navigateTo({ url: '/pages/koltask/index' })">
          <text class="menu-label">KOL任务中心</text>
          <text class="menu-arrow">></text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @tap="uni.navigateTo({ url: '/pages/settlement/index' })">
          <text class="menu-label">结算中心</text>
          <text class="menu-arrow">></text>
        </view>
      </view>
    </view>

    <view v-else-if="certStatus && certStatus.status === 'pending_review'" class="cert-pending">
      <text class="pending-icon">&#x23F3;</text>
      <text class="pending-title">审核中</text>
      <text class="pending-desc">您的认证申请正在AI审核中，请稍候</text>
    </view>

    <scroll-view v-else scroll-y class="cert-form">
      <view class="form-header">
        <text class="form-title">入驻龟钮印证</text>
        <text class="form-desc">完成商家认证后，可发布KOL任务、创建商家产品、通过龟钮印证实现微交易结算</text>
      </view>

      <view class="form-section">
        <view class="form-item">
          <text class="form-label">企业名称 *</text>
          <input class="form-input" v-model="companyName" placeholder="请输入企业全称" />
        </view>
        <view class="form-item">
          <text class="form-label">统一社会信用代码</text>
          <input class="form-input" v-model="creditCode" placeholder="18位信用代码 (选填)" />
        </view>
        <view class="form-item">
          <text class="form-label">法人代表</text>
          <input class="form-input" v-model="legalPerson" placeholder="法人姓名 (选填)" />
        </view>
        <view class="form-item">
          <text class="form-label">联系人 *</text>
          <input class="form-input" v-model="contactName" placeholder="联系人姓名" />
        </view>
        <view class="form-item">
          <text class="form-label">联系电话 *</text>
          <input class="form-input" v-model="contactPhone" placeholder="手机号码" type="number" />
        </view>
        <view class="form-item">
          <text class="form-label">所属行业</text>
          <input class="form-input" v-model="industry" placeholder="如: 汽车/科技/零售" />
        </view>
        <view class="form-item">
          <text class="form-label">企业规模</text>
          <input class="form-input" v-model="scale" placeholder="如: 小型/中型/大型" />
        </view>
      </view>

      <button class="submit-btn" :disabled="submitting" @tap="submitCert">
        {{ submitting ? '提交中...' : '提交认证' }}
      </button>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; }
.loading { display: flex; justify-content: center; padding: 120rpx 0; color: #9ca3af; }

.cert-approved, .cert-pending { display: flex; flex-direction: column; align-items: center; padding: 80rpx 40rpx; }
.approved-icon { font-size: 80rpx; color: #10b981; }
.pending-icon { font-size: 80rpx; }
.approved-title, .pending-title { font-size: 40rpx; font-weight: 700; margin-top: 24rpx; color: #1f2937; }
.approved-desc, .pending-desc { font-size: 28rpx; color: #6b7280; margin-top: 12rpx; text-align: center; }

.menu-list { width: 100%; margin-top: 40rpx; background: #fff; border-radius: 20rpx; padding: 0 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.menu-item { display: flex; justify-content: space-between; align-items: center; height: 96rpx; }
.menu-label { font-size: 30rpx; color: #1f2937; }
.menu-arrow { font-size: 32rpx; color: #d1d5db; }
.menu-divider { height: 2rpx; background: #f3f4f6; }

.cert-form { padding: 0 24rpx 40rpx; }
.form-header { padding: 32rpx; }
.form-title { font-size: 36rpx; font-weight: 700; color: #1f2937; display: block; }
.form-desc { font-size: 26rpx; color: #6b7280; margin-top: 12rpx; display: block; line-height: 1.5; }

.form-section { background: #fff; border-radius: 20rpx; padding: 8rpx 32rpx; margin: 0 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.03); }
.form-item { padding: 20rpx 0; border-bottom: 2rpx solid #f3f4f6; &:last-child { border-bottom: none; } }
.form-label { font-size: 28rpx; font-weight: 500; color: #1f2937; display: block; margin-bottom: 12rpx; }
.form-input { font-size: 28rpx; color: #1f2937; padding: 16rpx 20rpx; background: #f9fafb; border-radius: 12rpx; width: 100%; box-sizing: border-box; }

.submit-btn {
  margin: 40rpx auto 0; width: 80%; height: 88rpx; line-height: 88rpx;
  font-size: 34rpx; font-weight: 600; background: #10b981; color: #fff;
  border-radius: 44rpx; border: none;
  &::after { border: none; }
  &[disabled] { opacity: 0.6; }
}
</style>
