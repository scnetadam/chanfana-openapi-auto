// 通过 API 初始化种子数据
const http = require('http');
const BASE = 'http://192.168.0.106:3000';

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const r = http.request({
      hostname: '192.168.0.106', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log('🌱 通过 API 初始化种子数据...\n');
  
  // 1. 登录拿 userId
  const login = await req('POST', '/api/auth/login', { code: 'test', nickName: '演示用户', platform: 'alipay' });
  const loginData = JSON.parse(login.body);
  const userId = loginData?.data?.user?.id || 'demo_user';
  console.log(`  ✅ 登录: ${userId}`);
  
  // 2. 查活动列表 — 如果为空，通过登录用户自动创建的活动
  const acts = await req('GET', '/api/activity/list');
  const actData = JSON.parse(acts.body);
  console.log(`  ℹ️  活动: ${actData?.data?.length || 0} 个`);
  
  // 3. 发布内容测试
  const actId = actData?.data?.[0]?.id;
  if (actId) {
    const pub = await req('POST', '/api/content/publish', {
      text: '自动生成的测试内容，龟钮自驭推广流程体验',
      images: [], activityId: actId, userId,
    });
    console.log(`  ℹ️  发布内容: ${pub.status} — ${pub.body.slice(0, 100)}`);
  }
  
  // 4. 提交预约
  const book = await req('POST', '/api/booking/submit', {
    contentId: 'demo', name: '演示用户', phone: '13800138000',
    city: '北京', dealerName: '特斯拉体验店', userId,
  });
  console.log(`  ℹ️  预约提交: ${book.status} — ${book.body.slice(0, 100)}`);
  
  // 5. 钱包
  const w = await req('GET', `/api/wallet/balance?userId=${userId}`);
  console.log(`  ℹ️  钱包: ${w.status} — ${w.body.slice(0, 100)}`);
  
  console.log(`\n🌱 完成！前端可访问 http://192.168.0.106:3000`);  
}

main().catch(e => console.error('Error:', e.message));