/**
 * 线索API自动化测试脚本
 * 运行: node scripts/test-lead-api.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}[${timestamp}] ${message}${reset}`);
}

async function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(TEST_TOKEN ? { 'Authorization': `Bearer ${TEST_TOKEN}` } : {})
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test(name, fn) {
  try {
    log(`Testing: ${name}`, 'info');
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'passed' });
    log(`✓ ${name}`, 'success');
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'failed', error: error.message });
    log(`✗ ${name}: ${error.message}`, 'error');
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTests() {
  log('====================================', 'info');
  log('线索API自动化测试', 'info');
  log('====================================', 'info');
  log(`Base URL: ${BASE_URL}`, 'info');
  log(`Token: ${TEST_TOKEN ? '已设置' : '未设置'}`, 'info');
  log('', 'info');

  let testLeadId = null;

  await test('健康检查', async () => {
    const res = await request('GET', '/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === 'ok', 'Health check failed');
    assert(res.data.modules.includes('lead'), 'Lead module not registered');
  });

  await test('创建线索', async () => {
    const res = await request('POST', '/api/lead/create', {
      name: '测试用户',
      phone: '13800138000',
      city: '北京',
      source: 'form',
      carModel: '小米SU7',
      carBrand: '小米汽车',
      budget: '25-30万',
      remarks: '测试线索，想了解智能驾驶功能'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Create lead failed');
    assert(res.data.data.id, 'Lead ID missing');
    testLeadId = res.data.data.id;
    log(`Created lead: ${testLeadId}`, 'info');
  });

  await test('线索列表', async () => {
    const res = await request('GET', '/api/lead/list');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'List leads failed');
    assert(Array.isArray(res.data.data.list), 'List should be array');
    assert(res.data.data.total >= 1, 'Should have at least 1 lead');
  });

  await test('线索详情', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('GET', `/api/lead/${testLeadId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Get lead detail failed');
    assert(res.data.data.id === testLeadId, 'Lead ID mismatch');
    assert(res.data.data.name === '测试用户', 'Lead name mismatch');
  });

  await test('线索统计', async () => {
    const res = await request('GET', '/api/lead/stats/summary');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Get stats failed');
    assert(typeof res.data.data.total === 'number', 'Total should be number');
    assert(typeof res.data.data.conversionRate === 'number', 'Conversion rate should be number');
  });

  await test('AI线索分类', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('POST', '/api/lead/classify', {
      leadId: testLeadId
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Classify lead failed');
    assert(res.data.data.leadType, 'Lead type missing');
    assert(res.data.data.intentScore !== undefined, 'Intent score missing');
    assert(Array.isArray(res.data.data.tags), 'Tags should be array');
    log(`Classification: ${res.data.data.leadType}, Score: ${res.data.data.intentScore}`, 'info');
  });

  await test('AI质量评分', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('POST', '/api/lead/score', {
      leadId: testLeadId
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Score lead failed');
    assert(res.data.data.totalScore !== undefined, 'Total score missing');
    assert(res.data.data.grade, 'Grade missing');
    assert(res.data.data.priority, 'Priority missing');
    log(`Quality: ${res.data.data.grade}级, Score: ${res.data.data.totalScore}`, 'info');
  });

  await test('AI转化预测', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('POST', '/api/lead/predict', {
      leadId: testLeadId
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Predict lead failed');
    assert(res.data.data.conversionProbability !== undefined, 'Conversion probability missing');
    assert(res.data.data.estimatedCloseTime, 'Estimated close time missing');
    log(`Prediction: ${(res.data.data.conversionProbability * 100).toFixed(0)}%`, 'info');
  });

  await test('生成跟进话术', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('POST', '/api/lead/followup-script', {
      leadId: testLeadId,
      followupType: 'first_call'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Generate script failed');
    assert(res.data.data.script, 'Script missing');
    assert(Array.isArray(res.data.data.keyPoints), 'Key points should be array');
    log(`Script generated: ${res.data.data.script.substring(0, 50)}...`, 'info');
  });

  await test('更新线索状态', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('PUT', `/api/lead/${testLeadId}/status`, {
      status: 'following'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Update status failed');
    assert(res.data.data.status === 'following', 'Status not updated');
  });

  await test('添加跟进记录', async () => {
    assert(testLeadId, 'No test lead ID');
    const res = await request('POST', `/api/lead/${testLeadId}/followup`, {
      type: 'call',
      result: '已联系，意向确认',
      nextAction: '发送车型资料'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Add followup failed');
    assert(res.data.data.followups.length > 0, 'Followup not added');
  });

  await test('数据洞察', async () => {
    const res = await request('GET', '/api/lead/insights');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Get insights failed');
    assert(res.data.data.summary, 'Summary missing');
    assert(Array.isArray(res.data.data.insights), 'Insights should be array');
    log(`Insights: ${res.data.data.insights.length} items`, 'info');
  });

  await test('线索筛选', async () => {
    const res = await request('GET', '/api/lead/list?status=following&page=1&pageSize=10');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success, 'Filter leads failed');
    assert(res.data.data.list.every(l => l.status === 'following'), 'Filter not working');
  });

  log('', 'info');
  log('====================================', 'info');
  log('测试结果汇总', 'info');
  log('====================================', 'info');
  log(`通过: ${testResults.passed}`, 'success');
  log(`失败: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`总计: ${testResults.passed + testResults.failed}`, 'info');
  log('', 'info');

  if (testResults.failed > 0) {
    log('失败的测试:', 'error');
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => log(`  - ${t.name}: ${t.error}`, 'error'));
    process.exit(1);
  } else {
    log('所有测试通过！✓', 'success');
    process.exit(0);
  }
}

runTests().catch(error => {
  log(`测试运行失败: ${error.message}`, 'error');
  process.exit(1);
});
