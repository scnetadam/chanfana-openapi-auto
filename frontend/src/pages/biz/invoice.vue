<script setup lang="ts">
import { ref } from 'vue';
import { onMounted } from 'vue';
import { invoiceApi } from '@/api';
import type { InvoiceItem, InvoiceSummary } from '@/api';

const activeTab = ref('list');
const loading = ref(true);
const invoices = ref<InvoiceItem[]>([]);
const invoiceTotal = ref(0);

const listStatus = ref('');
const listTrack = ref('');

const issueForm = ref({
  issuerId: '',
  recipientId: '',
  recipientTrack: 'A',
  amount: '',
  taxRate: '6',
  bizRef: '',
  issueMode: 'auto',
});

const summaryRecipientId = ref('');
const summaryPeriod = ref('');
const summary = ref<InvoiceSummary | null>(null);

const detailVisible = ref(false);
const detailItem = ref<InvoiceItem | null>(null);
const detailVerify = ref<any>(null);

const batchItems = ref<InvoiceItem[]>([]);

onMounted(async () => {
  await loadInvoices();
});

async function loadInvoices() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: 1, pageSize: 50 };
    if (listStatus.value) params.status = listStatus.value;
    if (listTrack.value) params.recipientTrack = listTrack.value;
    const res = await invoiceApi.list(params);
    if (res.success) {
      invoices.value = res.data.list;
      invoiceTotal.value = res.data.total;
    }
  } catch (e) {
    console.error('[Invoice] load error:', e);
  } finally {
    loading.value = false;
  }
}

function setListFilter(status: string) {
  listStatus.value = status;
  loadInvoices();
}

async function doIssue() {
  const f = issueForm.value;
  if (!f.issuerId || !f.recipientId || !f.amount) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }
  try {
    const res = await invoiceApi.issue({
      issuerId: f.issuerId,
      recipientId: f.recipientId,
      recipientTrack: f.recipientTrack,
      amount: Number(f.amount),
      taxRate: f.taxRate ? Number(f.taxRate) / 100 : undefined,
      bizRef: f.bizRef || undefined,
      issueMode: f.issueMode,
    });
    if (res.success) {
      uni.showToast({ title: '开票成功', icon: 'success' });
      issueForm.value = { issuerId: '', recipientId: '', recipientTrack: 'A', amount: '', taxRate: '6', bizRef: '', issueMode: 'auto' };
      await loadInvoices();
    }
  } catch (e) {
    console.error('[Invoice] issue error:', e);
  }
}

async function showDetail(item: InvoiceItem) {
  detailItem.value = item;
  detailVisible.value = true;
  detailVerify.value = null;
  try {
    const res = await invoiceApi.verify(item.invoiceId);
    if (res.success) detailVerify.value = res.data;
  } catch (_) {}
}

function closeDetail() {
  detailVisible.value = false;
  detailItem.value = null;
  detailVerify.value = null;
}

async function doBatchIssue() {
  if (batchItems.value.length === 0) {
    uni.showToast({ title: '无批量开票项', icon: 'none' });
    return;
  }
  try {
    const items = batchItems.value.map(i => ({
      issuerId: i.issuerId,
      recipientId: i.recipientId,
      recipientTrack: i.recipientTrack,
      amount: i.amount,
    }));
    const res = await invoiceApi.batchIssue(items as any);
    if (res.success) {
      uni.showToast({ title: `批量开票${res.data.count}张`, icon: 'success' });
      batchItems.value = [];
      await loadInvoices();
    }
  } catch (e) {
    console.error('[Invoice] batch issue error:', e);
  }
}

async function loadSummary() {
  if (!summaryRecipientId.value.trim() || !summaryPeriod.value.trim()) {
    uni.showToast({ title: '请填写收票方和期间', icon: 'none' });
    return;
  }
  try {
    const res = await invoiceApi.summary(summaryRecipientId.value.trim(), summaryPeriod.value.trim());
    if (res.success) summary.value = res.data;
  } catch (e) {
    console.error('[Invoice] summary error:', e);
  }
}

function formatDate(d: string) {
  if (!d) return '';
  return d.slice(0, 10);
}

function statusLabel(s: string) {
  const m: Record<string, string> = { issued: '已开具', delivered: '已交付', verified: '已验真', cancelled: '已作废' };
  return m[s] || s;
}

function statusColor(s: string) {
  const m: Record<string, string> = { issued: '#3b82f6', delivered: '#10b981', verified: '#C9A84C', cancelled: '#ef4444' };
  return m[s] || '#9ca3af';
}

function trackLabel(t: string) {
  return t + '轨';
}
</script>

<template>
  <view class="page">
    <view class="header-card">
      <view class="header-bg"></view>
      <view class="header-content">
        <text class="header-title">数电票管理</text>
        <text class="header-sub">数字发票 · 三流验证 · 批量开具</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab', activeTab === 'list' ? 'active' : '']" @tap="activeTab = 'list'">发票列表</text>
      <text :class="['tab', activeTab === 'issue' ? 'active' : '']" @tap="activeTab = 'issue'">开票</text>
      <text :class="['tab', activeTab === 'batch' ? 'active' : '']" @tap="activeTab = 'batch'">批量</text>
      <text :class="['tab', activeTab === 'summary' ? 'active' : '']" @tap="activeTab = 'summary'">月度汇总</text>
    </view>

    <view v-if="activeTab === 'list'" class="section">
      <view class="filter-row">
        <text :class="['filter', listStatus === '' ? 'active' : '']" @tap="setListFilter('')">全部</text>
        <text :class="['filter', listStatus === 'issued' ? 'active' : '']" @tap="setListFilter('issued')">已开具</text>
        <text :class="['filter', listStatus === 'delivered' ? 'active' : '']" @tap="setListFilter('delivered')">已交付</text>
        <text :class="['filter', listStatus === 'verified' ? 'active' : '']" @tap="setListFilter('verified')">已验真</text>
      </view>
      <view v-if="loading" class="loading-wrap"><text class="loading-text">加载中...</text></view>
      <view v-else-if="invoices.length === 0" class="card empty-hint"><text>暂无发票</text></view>
      <view v-for="inv in invoices" :key="inv.invoiceId" class="card invoice-card" @tap="showDetail(inv)">
        <view class="inv-top">
          <text class="inv-no">{{ inv.invoiceNo }}</text>
          <text class="inv-status" :style="{ color: statusColor(inv.status), borderColor: statusColor(inv.status) }">{{ statusLabel(inv.status) }}</text>
        </view>
        <view class="inv-amounts">
          <text class="inv-amount-val">¥{{ inv.totalAmount.toFixed(2) }}</text>
          <text class="inv-tax">税额 ¥{{ inv.taxAmount.toFixed(2) }}</text>
        </view>
        <view class="inv-meta">
          <text class="inv-track">{{ trackLabel(inv.recipientTrack) }}</text>
          <text class="inv-date">{{ formatDate(inv.createdAt) }}</text>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'issue'" class="section">
      <view class="card form-card">
        <text class="form-title">开具发票</text>
        <input class="form-input" v-model="issueForm.issuerId" placeholder="开票方ID" />
        <input class="form-input" v-model="issueForm.recipientId" placeholder="收票方ID" />
        <picker :range="['A','B','C']" @change="e => issueForm.recipientTrack = ['A','B','C'][e.detail.value]">
          <view class="picker-row"><text class="picker-label">收票方轨别</text><text class="picker-val">{{ issueForm.recipientTrack }}轨</text></view>
        </picker>
        <input class="form-input" type="digit" v-model="issueForm.amount" placeholder="金额" />
        <input class="form-input" type="digit" v-model="issueForm.taxRate" placeholder="税率%(如6)" />
        <input class="form-input" v-model="issueForm.bizRef" placeholder="业务编号(选填)" />
        <picker :range="['auto','manual']" @change="e => issueForm.issueMode = ['auto','manual'][e.detail.value]">
          <view class="picker-row"><text class="picker-label">开票模式</text><text class="picker-val">{{ issueForm.issueMode }}</text></view>
        </picker>
        <button class="form-btn" @tap="doIssue">开具</button>
      </view>
    </view>

    <view v-if="activeTab === 'batch'" class="section">
      <view class="card form-card">
        <text class="form-title">批量开票</text>
        <view v-if="batchItems.length === 0" class="empty-hint"><text>从列表中选择发票加入批量</text></view>
        <view v-for="(bi, idx) in batchItems" :key="idx" class="batch-item">
          <text class="batch-info">{{ bi.recipientId }} · ¥{{ bi.amount.toFixed(2) }}</text>
          <text class="batch-remove" @tap="batchItems.splice(idx, 1)">移除</text>
        </view>
        <button v-if="batchItems.length > 0" class="form-btn" @tap="doBatchIssue">批量开具 ({{ batchItems.length }})</button>
      </view>
    </view>

    <view v-if="activeTab === 'summary'" class="section">
      <view class="card form-card">
        <text class="form-title">月度汇总</text>
        <input class="form-input" v-model="summaryRecipientId" placeholder="收票方ID" />
        <input class="form-input" v-model="summaryPeriod" placeholder="期间(如2026-01)" />
        <button class="form-btn" @tap="loadSummary">查询</button>
      </view>
      <view v-if="summary" class="card summary-card">
        <view class="summary-row">
          <text class="summary-label">总金额</text>
          <text class="summary-val accent">¥{{ summary.totalAmount.toFixed(2) }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">总税额</text>
          <text class="summary-val">¥{{ summary.totalTax.toFixed(2) }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">发票数</text>
          <text class="summary-val">{{ summary.count }}</text>
        </view>
        <view class="summary-breakdown">
          <text class="breakdown-title">按轨别</text>
          <view v-for="(val, track) in summary.byTrack" :key="track" class="breakdown-row">
            <text class="breakdown-track">{{ track }}轨</text>
            <text class="breakdown-count">{{ val.count }}张</text>
            <text class="breakdown-amount">¥{{ val.amount.toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="detailVisible && detailItem" class="detail-mask" @tap="closeDetail">
      <view class="detail-panel" @tap.stop>
        <view class="detail-header">
          <text class="detail-title">发票详情</text>
          <text class="detail-close" @tap="closeDetail">关闭</text>
        </view>
        <scroll-view scroll-y class="detail-body">
          <view class="detail-row"><text class="dl">发票号</text><text class="dv">{{ detailItem.invoiceNo }}</text></view>
          <view class="detail-row"><text class="dl">类型</text><text class="dv">{{ detailItem.invoiceType }}</text></view>
          <view class="detail-row"><text class="dl">开票方</text><text class="dv">{{ detailItem.issuerId }}</text></view>
          <view class="detail-row"><text class="dl">收票方</text><text class="dv">{{ detailItem.recipientId }}</text></view>
          <view class="detail-row"><text class="dl">轨别</text><text class="dv accent">{{ detailItem.recipientTrack }}轨</text></view>
          <view class="detail-row"><text class="dl">金额</text><text class="dv">¥{{ detailItem.amount.toFixed(2) }}</text></view>
          <view class="detail-row"><text class="dl">税额</text><text class="dv">¥{{ detailItem.taxAmount.toFixed(2) }}</text></view>
          <view class="detail-row"><text class="dl">价税合计</text><text class="dv">¥{{ detailItem.totalAmount.toFixed(2) }}</text></view>
          <view class="detail-row"><text class="dl">税率</text><text class="dv">{{ (detailItem.taxRate * 100).toFixed(1) }}%</text></view>
          <view class="detail-row"><text class="dl">状态</text><text class="dv" :style="{ color: statusColor(detailItem.status) }">{{ statusLabel(detailItem.status) }}</text></view>
          <view class="detail-row"><text class="dl">业务编号</text><text class="dv">{{ detailItem.bizRef || '--' }}</text></view>
          <view class="detail-row"><text class="dl">e-CNY流水</text><text class="dv">{{ detailItem.ecnyFlowId || '--' }}</text></view>
          <view v-if="detailVerify" class="verify-section">
            <text class="verify-title">三流验证</text>
            <view class="verify-row"><text class="vl">金额匹配</text><text :class="['vv', detailVerify.amountMatch ? 'ok' : 'err']">{{ detailVerify.amountMatch ? '通过' : '不匹配' }}</text></view>
            <view class="verify-row"><text class="vl">Hash匹配</text><text :class="['vv', detailVerify.hashMatch ? 'ok' : 'err']">{{ detailVerify.hashMatch ? '通过' : '不匹配' }}</text></view>
            <view class="verify-row"><text class="vl">流水匹配</text><text :class="['vv', detailVerify.flowMatch ? 'ok' : 'err']">{{ detailVerify.flowMatch ? '通过' : '不匹配' }}</text></view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page { min-height: 100vh; background: #f0f2f5; padding-bottom: 120rpx; }
.header-card { position: relative; overflow: hidden; }
.header-bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0A1628, #1a2744); }
.header-content { position: relative; z-index: 1; padding: 48rpx 32rpx 40rpx; }
.header-title { display: block; font-size: 44rpx; font-weight: 700; color: #C9A84C; }
.header-sub { display: block; font-size: 26rpx; color: rgba(201,168,76,0.7); margin-top: 8rpx; }

.tab-row { display: flex; padding: 16rpx 24rpx; gap: 8rpx; }
.tab { font-size: 24rpx; color: #9ca3af; padding: 8rpx 20rpx; border-radius: 24rpx; background: #fff; }
.tab.active { color: #C9A84C; font-weight: 600; background: #0A1628; }

.section { padding: 0 24rpx; margin-bottom: 24rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); margin-bottom: 16rpx; }
.loading-wrap { display: flex; justify-content: center; padding: 120rpx 0; }
.loading-text { font-size: 28rpx; color: #9ca3af; }
.empty-hint { text-align: center; padding: 32rpx 0; color: #9ca3af; font-size: 26rpx; }

.filter-row { display: flex; padding: 0 24rpx; margin-bottom: 16rpx; gap: 12rpx; }
.filter { font-size: 26rpx; color: #9ca3af; padding: 8rpx 24rpx; border-radius: 24rpx; background: #fff; }
.filter.active { color: #C9A84C; font-weight: 600; background: #0A1628; }

.invoice-card { margin-bottom: 12rpx; }
.inv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.inv-no { font-size: 28rpx; font-weight: 700; color: #1f2937; }
.inv-status { font-size: 22rpx; font-weight: 600; padding: 4rpx 12rpx; border-radius: 8rpx; border-width: 2rpx; border-style: solid; }
.inv-amounts { margin-bottom: 8rpx; }
.inv-amount-val { font-size: 34rpx; font-weight: 700; color: #0A1628; margin-right: 16rpx; }
.inv-tax { font-size: 24rpx; color: #6b7280; }
.inv-meta { display: flex; gap: 16rpx; }
.inv-track { font-size: 22rpx; color: #C9A84C; font-weight: 600; background: #0A1628; padding: 4rpx 12rpx; border-radius: 8rpx; }
.inv-date { font-size: 22rpx; color: #9ca3af; }

.form-card { display: flex; flex-direction: column; gap: 12rpx; }
.form-title { font-size: 28rpx; font-weight: 700; color: #1f2937; margin-bottom: 4rpx; }
.form-input { height: 64rpx; font-size: 26rpx; padding: 0 20rpx; border: 2rpx solid #e5e7eb; border-radius: 12rpx; background: #f9fafb; }
.form-btn { font-size: 28rpx; font-weight: 600; background: #0A1628; color: #C9A84C; border-radius: 12rpx; height: 72rpx; line-height: 72rpx; &::after { border: none; } }
.picker-row { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.picker-label { font-size: 26rpx; color: #6b7280; }
.picker-val { font-size: 26rpx; font-weight: 600; color: #0A1628; }

.batch-item { display: flex; justify-content: space-between; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid #f9fafb; }
.batch-info { font-size: 24rpx; color: #4b5563; }
.batch-remove { font-size: 22rpx; color: #ef4444; font-weight: 600; }

.summary-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f3f4f6; }
.summary-label { font-size: 26rpx; color: #6b7280; }
.summary-val { font-size: 26rpx; font-weight: 700; color: #1f2937; }
.summary-val.accent { color: #C9A84C; }
.summary-breakdown { margin-top: 16rpx; }
.breakdown-title { font-size: 24rpx; font-weight: 600; color: #9ca3af; margin-bottom: 8rpx; display: block; }
.breakdown-row { display: flex; gap: 16rpx; padding: 8rpx 0; }
.breakdown-track { font-size: 24rpx; font-weight: 600; color: #C9A84C; width: 80rpx; }
.breakdown-count { font-size: 24rpx; color: #6b7280; flex: 1; }
.breakdown-amount { font-size: 24rpx; font-weight: 600; color: #1f2937; }

.detail-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: flex-end; }
.detail-panel { width: 100%; max-height: 80vh; background: #fff; border-radius: 32rpx 32rpx 0 0; overflow: hidden; }
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 32rpx; border-bottom: 2rpx solid #f3f4f6; }
.detail-title { font-size: 32rpx; font-weight: 700; color: #1f2937; }
.detail-close { font-size: 28rpx; color: #9ca3af; }
.detail-body { padding: 24rpx 32rpx; }
.detail-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 2rpx solid #f9fafb; }
.dl { font-size: 26rpx; color: #6b7280; }
.dv { font-size: 26rpx; font-weight: 600; color: #1f2937; }
.dv.accent { color: #C9A84C; }

.verify-section { margin-top: 24rpx; padding-top: 16rpx; border-top: 2rpx solid #f3f4f6; }
.verify-title { font-size: 28rpx; font-weight: 700; color: #0A1628; margin-bottom: 12rpx; display: block; }
.verify-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.vl { font-size: 26rpx; color: #6b7280; }
.vv { font-size: 26rpx; font-weight: 600; }
.vv.ok { color: #10b981; }
.vv.err { color: #ef4444; }
</style>
