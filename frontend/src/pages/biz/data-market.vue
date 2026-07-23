<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const loading = ref(true);
const dataMarket = ref<any[]>([]);
const activeTab = ref('content');

const tabs = [
  { key: 'content', label: '内容数据' },
  { key: 'leads', label: '线索数据' },
  { key: 'engagement', label: '互动数据' },
];

onShow(async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    dataMarket.value = [
      {
        id: 'data_001',
        kolName: '汽车达人小李',
        kolAvatar: 'https://cdn.x402.cn/avatar1.png',
        dataType: 'content',
        title: '小米SU7深度评测',
        quality: 85,
        price: 50,
        views: 12000,
        engagement: 1500,
        kolLevel: 'gold',
        kolWeight: 1.8,
      },
      {
        id: 'data_002',
        kolName: '新能源观察者',
        kolAvatar: 'https://cdn.x402.cn/avatar2.png',
        dataType: 'leads',
        title: '蔚来ET5试驾线索包',
        quality: 92,
        price: 200,
        leadsCount: 50,
        conversionRate: 15,
        kolLevel: 'platinum',
        kolWeight: 2.5,
      },
      {
        id: 'data_003',
        kolName: '车评人老王',
        kolAvatar: 'https://cdn.x402.cn/avatar3.png',
        dataType: 'engagement',
        title: '比亚迪海豹互动数据',
        quality: 78,
        price: 80,
        comments: 320,
        shares: 180,
        kolLevel: 'silver',
        kolWeight: 1.5,
      },
    ];
  } catch (e) {
    console.error('[DataMarket] load error:', e);
  } finally {
    loading.value = false;
  }
}

function filterData() {
  return dataMarket.value.filter(d => d.dataType === activeTab.value);
}

function getLevelColor(level: string) {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };
  return colors[level] || '#999';
}

function getLevelName(level: string) {
  const names: Record<string, string> = {
    bronze: '青铜',
    silver: '白银',
    gold: '黄金',
    platinum: '铂金',
  };
  return names[level] || level;
}

async function purchaseData(item: any) {
  uni.showModal({
    title: '确认购买',
    content: `确定购买 ${item.title} 吗？价格：¥${item.price}`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '购买中...' });
          await new Promise(resolve => setTimeout(resolve, 1000));
          uni.hideLoading();
          uni.showToast({ title: '购买成功', icon: 'success' });
        } catch (e) {
          uni.hideLoading();
          uni.showToast({ title: '购买失败', icon: 'none' });
        }
      }
    },
  });
}
</script>

<template>
  <view class="container">
    <view class="header">
      <text class="title">数据市场</text>
      <text class="subtitle">浏览并购买KOL/KOC优质数据</text>
    </view>

    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-item', activeTab === tab.key ? 'active' : '']"
        @click="activeTab = tab.key"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <view v-else class="data-list">
      <view
        v-for="item in filterData()"
        :key="item.id"
        class="data-card"
      >
        <view class="card-header">
          <image :src="item.kolAvatar" class="avatar" mode="aspectFill" />
          <view class="kol-info">
            <text class="kol-name">{{ item.kolName }}</text>
            <view class="level-badge" :style="{ backgroundColor: getLevelColor(item.kolLevel) }">
              <text class="level-text">{{ getLevelName(item.kolLevel) }}</text>
            </view>
          </view>
          <view class="weight-badge">
            <text class="weight-text">权重 {{ item.kolWeight.toFixed(1) }}</text>
          </view>
        </view>

        <view class="card-body">
          <text class="data-title">{{ item.title }}</text>
          <view class="quality-bar">
            <text class="quality-label">品质分</text>
            <view class="quality-progress">
              <view class="quality-fill" :style="{ width: item.quality + '%' }"></view>
            </view>
            <text class="quality-value">{{ item.quality }}</text>
          </view>

          <view v-if="item.dataType === 'content'" class="stats-row">
            <text>浏览 {{ item.views }}</text>
            <text>互动 {{ item.engagement }}</text>
          </view>
          <view v-else-if="item.dataType === 'leads'" class="stats-row">
            <text>线索 {{ item.leadsCount }}</text>
            <text>转化率 {{ item.conversionRate }}%</text>
          </view>
          <view v-else class="stats-row">
            <text>评论 {{ item.comments }}</text>
            <text>分享 {{ item.shares }}</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="price">¥{{ item.price }}</text>
          <button class="buy-btn" @click="purchaseData(item)">立即购买</button>
        </view>
      </view>

      <view v-if="filterData().length === 0" class="empty">
        <text>暂无数据</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}

.subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 10rpx;
  display: block;
}

.tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 10rpx;
  margin-bottom: 20rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666;
}

.tab-item.active {
  background: #667eea;
  color: #fff;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
}

.data-list {
  margin-top: 20rpx;
}

.data-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.kol-info {
  flex: 1;
}

.kol-name {
  font-size: 30rpx;
  font-weight: bold;
  display: block;
}

.level-badge {
  display: inline-block;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-top: 8rpx;
}

.level-text {
  font-size: 20rpx;
  color: #fff;
}

.weight-badge {
  background: #f0f0f0;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.weight-text {
  font-size: 24rpx;
  color: #666;
}

.card-body {
  margin-bottom: 20rpx;
}

.data-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}

.quality-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.quality-label {
  font-size: 24rpx;
  color: #666;
  margin-right: 16rpx;
}

.quality-progress {
  flex: 1;
  height: 16rpx;
  background: #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
}

.quality-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
}

.quality-value {
  font-size: 24rpx;
  color: #666;
  margin-left: 16rpx;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #999;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.price {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b6b;
}

.buy-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  padding: 16rpx 40rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}
</style>
