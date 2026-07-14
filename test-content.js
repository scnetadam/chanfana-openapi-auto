const http = require('http');
const BASE = 'http://192.168.0.106:3000';

function req(method, path, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const r = http.request({
      hostname: '192.168.0.106', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', e => resolve({ error: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  // 先登录拿 userId
  const login = await req('POST', '/api/auth/login', { code: 'test', nickName: '测试用户', platform: 'alipay' });
  const loginData = JSON.parse(login.body);
  const userId = loginData?.data?.user?.id || 'demo_user';
  console.log('Login OK, userId:', userId);
  
  // 查活动
  const act = await req('GET', '/api/activity/list');
  const acts = JSON.parse(act.body);
  const actId = acts?.data?.[0]?.id || 'demo_act';
  console.log('Activity:', actId);
  
  // 发布内容
  const pub = await req('POST', '/api/content/publish', { text: '测试内容发布', images: [], activityId: actId, userId });
  console.log('Publish:', pub.status, pub.body.slice(0, 200));
}

main();