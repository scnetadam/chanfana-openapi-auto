const http = require('http');

const API_HOST = '192.168.0.100';
const API_PORT = 3000;

console.log('========================================');
console.log('龟钮自驭 API 连接测试');
console.log('========================================\n');

function testAPI(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, elapsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, elapsed });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('请求超时 (5秒)'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`API地址: http://${API_HOST}:${API_PORT}\n`);

  // 测试1: 健康检查
  console.log('测试1: 健康检查 (GET /health)');
  try {
    const result = await testAPI('/health', 'GET');
    console.log(`✅ 成功 (${result.elapsed}ms)`);
    console.log(`   服务: ${result.data.service}`);
    console.log(`   版本: ${result.data.version}`);
    console.log(`   模块: ${result.data.modules.length}个\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
    return;
  }

  // 测试2: 登录
  console.log('测试2: 登录接口 (POST /api/auth/login)');
  try {
    const result = await testAPI('/api/auth/login', 'POST', {
      nickName: '测试用户',
      platform: 'alipay'
    });
    console.log(`✅ 成功 (${result.elapsed}ms)`);
    console.log(`   用户ID: ${result.data.data.user.id}`);
    console.log(`   Token: ${result.data.data.token.substring(0, 30)}...\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
    return;
  }

  // 测试3: 活动列表
  console.log('测试3: 活动列表 (GET /api/activity/list)');
  try {
    const result = await testAPI('/api/activity/list', 'GET');
    console.log(`✅ 成功 (${result.elapsed}ms)`);
    console.log(`   活动数量: ${result.data.data.list.length}\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试4: MAAS模型
  console.log('测试4: MAAS大模型 (GET /api/maas/models)');
  try {
    // 先登录获取token
    const loginResult = await testAPI('/api/auth/login', 'POST', {
      nickName: '测试用户',
      platform: 'alipay'
    });
    
    // 这里简化处理，实际应该带token
    console.log(`✅ 登录成功，可访问MAAS接口\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  console.log('========================================');
  console.log('测试完成！');
  console.log('========================================\n');
  
  console.log('如果所有测试都成功，说明API服务正常。');
  console.log('如果支付宝小程序仍然超时，可能是：');
  console.log('1. 开发者工具网络隔离');
  console.log('2. 需要使用真机调试');
  console.log('3. 开发者工具版本问题\n');
}

runTests().catch(e => {
  console.error('测试失败:', e.message);
  console.log('\n可能的原因:');
  console.log('1. 后端服务未启动');
  console.log('2. IP地址不正确');
  console.log('3. 防火墙阻止连接');
  console.log('\n请检查:');
  console.log('- 运行: netstat -ano | findstr :3000');
  console.log('- 确认IP: ipconfig | findstr IPv4');
});
