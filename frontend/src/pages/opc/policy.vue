<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const policyId = ref('');
const cityName = ref('');
const policy = ref<any>({});

onLoad((options: any) => {
  policyId.value = options.id;
  cityName.value = options.city || '';
  loadPolicy();
});

function loadPolicy() {
  policy.value = {
    id: policyId.value,
    title: 'AI产业专项扶持资金',
    city: cityName.value,
    type: '投资补贴',
    amount: '最高500万',
    status: '开放申请',
    deadline: '2026-12-31',
    department: '市科技局',
    contact: '010-12345678',
    email: 'policy@example.gov.cn',
    description: '为加快推进人工智能产业发展，培育一批具有核心竞争力的AI企业，特设立AI产业专项扶持资金。支持AI技术研发、产品创新、市场推广等环节，助力企业快速成长。',
    support: [
      { title: '研发补贴', content: '按研发投入的30%给予补贴，最高200万' },
      { title: '场地补贴', content: '提供AI产业园办公场地，3年免租' },
      { title: '人才补贴', content: '引进高端人才，给予住房补贴和生活补贴' },
      { title: '市场推广', content: '支持产品推广，补贴营销费用的20%' },
    ],
    requirements: [
      '在本地注册满1年以上的AI相关企业',
      '年营业收入达到500万元以上',
      '拥有自主知识产权或核心技术',
      '研发人员占比不低于30%',
      '无不良信用记录',
    ],
    materials: [
      '企业营业执照复印件',
      '近两年财务审计报告',
      '研发项目计划书',
      '知识产权证明材料',
      '团队成员学历证明',
      '其他支撑材料',
    ],
    process: [
      { step: 1, title: '在线申请', desc: '填写申请表，上传材料' },
      { step: 2, title: '形式审查', desc: '5个工作日' },
      { step: 3, title: '专家评审', desc: '15个工作日' },
      { step: 4, title: '现场考察', desc: '10个工作日' },
      { step: 5, title: '公示公告', desc: '7个工作日' },
      { step: 6, title: '资金拨付', desc: '30个工作日' },
    ],
    cases: [
      { company: '智言科技', amount: '450万', year: '2025', effect: '研发投入增长200%' },
      { company: '视界智能', amount: '380万', year: '2025', effect: '团队规模翻倍' },
    ],
  };
}

function apply() {
  uni.navigateTo({ url: `/pages/opc/subsidy?policyId=${policyId.value}&city=${cityName.value}` });
}

function contact() {
  uni.showModal({
    title: '联系咨询',
    content: `电话: ${policy.value.contact}\n邮箱: ${policy.value.email}`,
    showCancel: false,
  });
}
</script>

<template>
  <view class="policy-page">
    <view class="header-card">
      <text class="policy-title">{{ policy.title }}</text>
      <view class="policy-tags">
        <text class="tag city">{{ policy.city }}</text>
        <text class="tag type">{{ policy.type }}</text>
        <text class="tag amount">{{ policy.amount }}</text>
        <text :class="['tag status', policy.status === '开放申请' ? 'open' : 'pending']">{{ policy.status }}</text>
      </view>
    </view>

    <view class="info-card">
      <view class="info-row">
        <text class="info-label">发布部门:</text>
        <text class="info-value">{{ policy.department }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">申请截止:</text>
        <text class="info-value highlight">{{ policy.deadline }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">联系电话:</text>
        <text class="info-value link" @tap="contact">{{ policy.contact }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">📋 政策说明</text>
      <text class="section-content">{{ policy.description }}</text>
    </view>

    <view class="section">
      <text class="section-title">💰 扶持内容</text>
      <view class="support-list">
        <view v-for="item in policy.support" :key="item.title" class="support-item">
          <text class="support-title">{{ item.title }}</text>
          <text class="support-content">{{ item.content }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">✅ 申请条件</text>
      <view class="requirement-list">
        <view v-for="(req, index) in policy.requirements" :key="index" class="requirement-item">
          <text class="req-num">{{ index + 1 }}</text>
          <text class="req-text">{{ req }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">📄 申请材料</text>
      <view class="material-list">
        <view v-for="(mat, index) in policy.materials" :key="index" class="material-item">
          <text class="mat-icon">📄</text>
          <text class="mat-text">{{ mat }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">🔄 办理流程</text>
      <view class="process-list">
        <view v-for="item in policy.process" :key="item.step" class="process-item">
          <view class="process-left">
            <text class="process-num">{{ item.step }}</text>
            <view v-if="item.step < policy.process.length" class="process-line" />
          </view>
          <view class="process-right">
            <text class="process-title">{{ item.title }}</text>
            <text class="process-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">🏆 成功案例</text>
      <view class="case-list">
        <view v-for="caseItem in policy.cases" :key="caseItem.company" class="case-item">
          <view class="case-header">
            <text class="case-company">{{ caseItem.company }}</text>
            <text class="case-year">{{ caseItem.year }}年</text>
          </view>
          <view class="case-info">
            <text class="case-amount">获得补贴: {{ caseItem.amount }}</text>
            <text class="case-effect">{{ caseItem.effect }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="action-bar">
      <button class="contact-btn" @tap="contact">
        <text class="btn-icon">📞</text>
        <text class="btn-text">咨询</text>
      </button>
      <button class="apply-btn" @tap="apply">
        <text class="btn-icon">🚀</text>
        <text class="btn-text">立即申请</text>
      </button>
    </view>
  </view>
</template>

<style scoped>
.policy-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  color: #fff;
}

.policy-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  line-height: 1.4;
}

.policy-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  padding: 8rpx 20rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  font-size: 24rpx;
}

.tag.amount {
  background: #fff;
  color: #667eea;
  font-weight: bold;
}

.tag.status.open {
  background: #4caf50;
}

.tag.status.pending {
  background: #ff9800;
}

.info-card {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  margin-bottom: 16rpx;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 26rpx;
  color: #999;
  width: 160rpx;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}

.info-value.highlight {
  color: #f5576c;
  font-weight: 500;
}

.info-value.link {
  color: #667eea;
}

.section {
  background: #fff;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.section-content {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}

.support-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.support-item {
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.support-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 12rpx;
}

.support-content {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.requirement-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.requirement-item {
  display: flex;
  align-items: flex-start;
}

.req-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.req-text {
  flex: 1;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.material-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.material-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.mat-icon {
  font-size: 28rpx;
  margin-right: 16rpx;
}

.mat-text {
  font-size: 26rpx;
  color: #333;
}

.process-list {
  display: flex;
  flex-direction: column;
}

.process-item {
  display: flex;
  margin-bottom: 20rpx;
}

.process-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20rpx;
}

.process-num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
}

.process-line {
  width: 4rpx;
  height: 40rpx;
  background: #ddd;
  margin-top: 8rpx;
}

.process-right {
  flex: 1;
  padding-top: 8rpx;
}

.process-title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
}

.process-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.case-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.case-item {
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.case-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.case-company {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.case-year {
  font-size: 24rpx;
  color: #999;
}

.case-info {
  display: flex;
  gap: 24rpx;
}

.case-amount {
  font-size: 26rpx;
  color: #f5576c;
  font-weight: 500;
}

.case-effect {
  font-size: 26rpx;
  color: #666;
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

.contact-btn,
.apply-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 28rpx;
  border-radius: 16rpx;
  border: none;
  font-size: 30rpx;
}

.contact-btn {
  background: #f5f5f5;
  color: #666;
}

.apply-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-icon {
  font-size: 32rpx;
}
</style>
