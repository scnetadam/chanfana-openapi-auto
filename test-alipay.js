// 支付宝小程序连通性测试
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
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, raw: d }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log('=== 支付宝小程序后端连通性测试 ===\n');
  
  // 1. Health
  const h = await req('GET', '/health');
  console.log('Health:', h.status, h.data?.status || '');
  
  // 2. Auth login
  const login = await req('POST', '/api/auth/login', { code: 'test', nickName: '测试', platform: 'alipay' });
  console.log('Auth login:', login.status, login.data?.success ? '✅' : '❌');
  
  // 3. Activity list
  const act = await req('GET', '/api/activity/list');
  console.log('Activity list:', act.status, act.data?.success ? '✅' : '❌');
  
  // 4. Booking submit
  const book = await req('POST', '/api/booking/submit', { contentId: 'demo', name: '测试', phone: '13800138000', userId: 'demo_user' });
  console.log('Booking submit:', book.status, book.data?.success ? '✅' : '❌');
  
  // 5. Wallet balance
  const w = await req('GET', '/api/wallet/balance?userId=demo_user');
  console.log('Wallet balance:', w.status, w.data?.success ? '✅' : '❌');
  
  // 6. AI generate
  const ai = await req('POST', '/api/ai/generate-copy', { activityId: 'demo', brand: '测试', model: 'Model3', userId: 'demo_user' });
  console.log('AI generate:', ai.status, ai.data?.success ? '✅' : '❌');
  
  // 7. Content publish
  const pub = await req('POST', '/api/content/publish', { text: '测试内容', images: [], activityId: 'demo', userId: 'demo_user' });
  console.log('Content publish:', pub.status, pub.data?.success ? '✅' : '❌');
  
  console.log('\n=== 测试完成 ===');
}

main().catch(e => console.error('Fatal:', e.message));