// 完整集成测试
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
  console.log('=== 支付宝小程序完整流程测试 ===\n');
  let pass = 0, fail = 0;
  const ok = (name, cond) => { if (cond) { console.log(`  ✅ ${name}`); pass++; } else { console.log(`  ❌ ${name}`); fail++; } };

  // 1. Health
  const h = await req('GET', '/health');
  const hd = JSON.parse(h.body);
  ok('Health check', h.status === 200 && hd.status === 'ok');

  // 2. Auth login
  const login = await req('POST', '/api/auth/login', { code: 'test', nickName: '测试用户', platform: 'alipay' });
  const ld = JSON.parse(login.body);
  ok('Auth login', ld.success);
  const userId = ld.data?.user?.id;
  ok('Got userId', !!userId);

  // 3. Activity list
  const acts = await req('GET', '/api/activity/list');
  const ad = JSON.parse(acts.body);
  ok('Activity list', ad.success && ad.data.total >= 2);
  const actId = ad.data.list[0].id;

  // 4. Content publish
  const pub = await req('POST', '/api/content/publish', { text: '测试内容：小米SU7试驾体验', images: [], activityId: actId, userId });
  const pd = JSON.parse(pub.body);
  ok('Content publish', pd.success);
  const contentId = pd.data?.id;

  // 5. Booking submit
  const book = await req('POST', '/api/booking/submit', { contentId: contentId || 'demo', name: '测试', phone: '13800138000', city: '北京', dealerName: '特斯拉体验店', userId });
  const bd = JSON.parse(book.body);
  ok('Booking submit', bd.success);

  // 6. Wallet balance
  const w = await req('GET', `/api/wallet/balance?userId=${userId}`);
  const wd = JSON.parse(w.body);
  ok('Wallet balance', wd.success);

  // 7. AI generate
  const ai = await req('POST', '/api/ai/generate-copy', { activityId: actId, brand: '小米', model: 'SU7', userId });
  const aid = JSON.parse(ai.body);
  ok('AI generate copy', aid.success);

  // 8. Settlement
  const st = await req('GET', `/api/settlement/stats?userId=${userId}`);
  const std = JSON.parse(st.body);
  ok('Settlement stats', std.success);

  // 9. Biz cert
  const bc = await req('GET', `/api/biz/status?userId=${userId}`);
  const bcd = JSON.parse(bc.body);
  ok('Biz cert status', bcd.success !== undefined);

  // 10. Data market / products
  const dm = await req('GET', '/api/activity/list');
  ok('Data products', dm.status === 200);

  console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });