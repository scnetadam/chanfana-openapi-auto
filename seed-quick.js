// 龟钮印信 DEVEVO — 快速初始化种子数据（纯 dataStore）
const path = require('path');
const store = require('./src/models/dataStore');

console.log('🌱 初始化种子数据...\n');

// 1. 活动
const activities = [
  { brand: '特斯拉', model: 'Model Y', name: 'Model Y 夏日试驾', description: '体验最新纯电SUV', rewardPerBooking: 50, rewardPerView: 1, totalBudget: 10000, publishFee: 1, cover: '', status: 'active' },
  { brand: '比亚迪', model: '海豹', name: '海豹 EV 深度体验', description: '感受刀片电池的魅力', rewardPerBooking: 30, rewardPerView: 0.5, totalBudget: 5000, publishFee: 1, cover: '', status: 'active' },
  { brand: '蔚来', model: 'ET5', name: 'ET5 城市探索之旅', description: '智能电动轿跑', rewardPerBooking: 40, rewardPerView: 0.8, totalBudget: 8000, publishFee: 1, cover: '', status: 'active' },
];
const createdActivities = [];
for (const a of activities) {
  let act = store.activityStore.getByName?.(a.name);
  if (!act) {
    act = store.activityStore.create(a);
  }
  createdActivities.push(act);
  console.log(`  ✅ 活动: ${act.name} (${act.id})`);
}

// 2. 用户
const users = [
  { id: 'demo_user', nickName: '演示用户', role: 'C', platform: 'alipay' },
  { id: 'demo_biz', nickName: '商家测试', role: 'B', platform: 'alipay' },
];
for (const u of users) {
  const existing = store.userStore.getById(u.id);
  if (!existing) {
    store.userStore.upsert(u);
  }
  console.log(`  ✅ 用户: ${u.nickName} (${u.id})`);
}

// 3. 钱包
for (const u of users) {
  let w = store.walletStore.getByUserId(u.id);
  if (!w) {
    w = store.walletStore.create(u.id);
  }
  console.log(`  ✅ 钱包: ${u.id} (余额: ${w?.balance || 0})`);
}

// 4. 测试内容
try {
  const existingContent = store.contentStore.getByUserId?.('demo_user');
  if (!existingContent || existingContent.length === 0) {
    const c = store.contentStore.create({
      userId: 'demo_user', activityId: createdActivities[0].id,
      images: [], text: '自动生成的测试内容，体验龟钮印信推广流程', carModel: 'Model Y',
      nickName: '演示用户',
    });
    console.log(`  ✅ 内容: ${c.id}`);
  } else {
    console.log(`  ℹ️  内容已存在: ${existingContent.length} 条`);
  }
} catch(e) {
  console.log(`  ⚠️ 内容创建跳过: ${e.message}`);
}

// 5. 预约
try {
  const contentId = store.contentStore.getAll?.()?.[0]?.id;
  if (contentId && store.bookingStore) {
    const b = store.bookingStore.create?.({
      contentId, userId: 'demo_user',
      name: '演示用户', phone: '13800138000',
      city: '北京', dealerName: '特斯拉北京体验店',
    });
    if (b) console.log(`  ✅ 预约: ${b.id}`);
  }
} catch(e) {
  console.log(`  ⚠️ 预约创建跳过: ${e.message}`);
}

console.log(`\n🌱 完成！共 ${createdActivities.length} 活动, ${users.length} 用户`);