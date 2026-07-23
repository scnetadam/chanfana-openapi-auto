#!/usr/bin/env node
// 龟钮 Seed Engine — CLI 入口
// 命令行一键操作：检测、写入、COS 上传
// 
// 用法：
//   node src/seed-engine/cli.js              # 写入所有（含确认提示）
//   node src/seed-engine/cli.js --force       # 强制覆盖所有
//   node src/seed-engine/cli.js --project=seal  # 仅印信
//   node src/seed-engine/cli.js --check       # 仅检测
//   node src/seed-engine/cli.js --cos         # 写入 + COS 上传
//   node src/seed-engine/cli.js --cos-only    # 仅 COS 上传

const { checkAll, runAll, runProject } = require('./engine');
const { PROJECTS, ENGINE_CONFIG } = require('./config');
const { uploadProjectData, uploadAll } = require('./cos');

// 解析命令行参数
const args = process.argv.slice(2);
const flags = {
  force: args.includes('--force'),
  check: args.includes('--check'),
  cos: args.includes('--cos'),
  cosOnly: args.includes('--cos-only'),
  project: null,
};

// 提取 --project=xxx
const projectArg = args.find(a => a.startsWith('--project='));
if (projectArg) {
  flags.project = projectArg.split('=')[1];
}

// 提取 --cos-key=xxx
const cosKeyArg = args.find(a => a.startsWith('--cos-key='));
if (cosKeyArg) {
  process.env.COS_SECRET_ID = cosKeyArg.split('=')[1];
}

(async function main() {
  // --check: 仅检测
  if (flags.check) {
    checkAll();
    return;
  }

  // --cos-only: 仅上传 COS
  if (flags.cosOnly) {
    console.log('=== 龟钮 Seed Engine — 仅 COS 上传 ===\n');
    // 读取现数据上传
    for (const [key, project] of Object.entries(PROJECTS)) {
      await uploadProjectData(key, project.dataDir, project.files);
    }
    return;
  }

  // --project=xxx: 仅写入指定项目
  if (flags.project) {
    if (!PROJECTS[flags.project]) {
      console.error(`未知项目: ${flags.project}，可用: ${Object.keys(PROJECTS).join(', ')}`);
      process.exit(1);
    }
    const result = runProject(flags.project, { force: flags.force });
    if (flags.cos && result.written) {
      const proj = PROJECTS[flags.project];
      await uploadProjectData(flags.project, proj.dataDir, proj.files);
    }
    return;
  }

  // 写入所有项目
  const results = runAll({ force: flags.force, cos: flags.cos });

  // 输出汇总
  console.log('\n=== 汇总 ===');
  for (const [key, result] of Object.entries(results)) {
    const status = result.success ? (result.written ? '✅ 已写入' : '⏭️ 跳过') : '❌ 失败';
    console.log(`${PROJECTS[key].name}: ${status}`);
    if (result.files && result.files.length > 0) {
      console.log(`   文件: ${result.files.join(', ')}`);
    }
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  }
})();