// 龟钮 Seed Engine — COS 上传模块
// 负责将种子数据同步到腾讯云对象存储（COS）

const fs = require('fs');
const path = require('path');
const { COS_CONFIG } = require('./config');

/**
 * 上传单个文件到 COS
 * @param {string} localPath - 本地文件路径
 * @param {string} cosKey - COS 对象键
 * @returns {Promise<boolean>}
 */
async function uploadFile(localPath, cosKey) {
  // 如果 COS 未启用或凭证未配置，则跳过
  if (!COS_CONFIG.enabled) {
    return false;
  }
  if (!COS_CONFIG.secretId || !COS_CONFIG.secretKey) {
    console.warn('[COS] 未配置凭证，跳过上传');
    return false;
  }

  try {
    // 动态加载 COS SDK（按需加载，避免未安装时崩溃）
    const COS = require('cos-nodejs-sdk-v5');
    const client = new COS({
      SecretId: COS_CONFIG.secretId,
      SecretKey: COS_CONFIG.secretKey,
    });

    await new Promise((resolve, reject) => {
      client.uploadFile({
        Bucket: COS_CONFIG.bucket,
        Region: COS_CONFIG.region,
        Key: cosKey,
        FilePath: localPath,
        onProgress: () => {},
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    return true;
  } catch (err) {
    console.error(`[COS] 上传失败: ${cosKey} - ${err.message}`);
    return false;
  }
}

/**
 * 上传项目 data 目录到 COS
 * @param {string} projectName - 项目名（seal/verify/deveco）
 * @param {string} dataDir - 本地 data 目录
 * @param {string[]} files - 需要上传的文件名列表
 * @returns {Promise<{success: number, fail: number, skipped: boolean}>}
 */
async function uploadProjectData(projectName, dataDir, files) {
  if (!COS_CONFIG.enabled) {
    return { success: 0, fail: 0, skipped: true };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const prefix = `${COS_CONFIG.prefix}/${projectName}/${timestamp}`;
  let success = 0;
  let fail = 0;

  console.log(`[COS] 上传 ${projectName} 数据到 ${prefix}/`);

  for (const file of files) {
    const localPath = path.join(dataDir, file);
    if (!fs.existsSync(localPath)) {
      console.log(`  SKIP: ${file} (不存在)`);
      continue;
    }
    const cosKey = `${prefix}/${file}`;
    const ok = await uploadFile(localPath, cosKey);
    if (ok) {
      success++;
      console.log(`  OK: ${file}`);
    } else {
      fail++;
    }
  }

  console.log(`[COS] ${projectName}: ${success} 成功, ${fail} 失败`);
  return { success, fail, skipped: false };
}

/**
 * 上传所有项目数据到 COS
 * @param {object} projects - PROJECTS 配置
 * @param {object} results - 各项目的写入结果
 */
async function uploadAll(projects, results) {
  for (const [key, project] of Object.entries(projects)) {
    const result = results[key];
    if (result && result.written) {
      await uploadProjectData(key, project.dataDir, project.files);
    } else {
      console.log(`[COS] 跳过 ${project.name}（未写入新数据）`);
    }
  }
}

module.exports = { uploadFile, uploadProjectData, uploadAll, uploadByStream };

async function uploadByStream(projects, results) {
  for (const [key, project] of Object.entries(projects)) {
    const result = results[key];
    if (!result || !result.written || !project.dataStreams) continue;

    for (const [streamName, streamConfig] of Object.entries(project.dataStreams)) {
      if (!streamConfig.files || streamConfig.files.length === 0) continue;

      console.log(`[COS] ${project.name} → ${streamName}:`);
      for (const file of streamConfig.files) {
        const localPath = path.join(project.dataDir, file);
        if (!fs.existsSync(localPath)) continue;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const cosKey = `${COS_CONFIG.prefix}/${streamConfig.cosPrefix}/${key}/${timestamp}/${file}`;
        const ok = await uploadFile(localPath, cosKey);
        console.log(`  ${ok ? 'OK' : 'FAIL'}: ${file} → ${cosKey}`);
      }
    }
  }
}