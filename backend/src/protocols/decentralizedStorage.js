/**
 * 龟钮印证 - 去中心化存储服务 (DecentralizedStorageService)
 * 场景2：IPFS/Arweave 数据源存储协议层
 *
 * 支持 IPFS 和 Arweave 两种去中心化存储协议。
 * 沙箱模式下使用本地文件系统模拟存储在 data/decentralized/ 目录。
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const STORAGE_DIR = path.resolve(process.cwd(), 'data', 'decentralized');
const RECORDS_FILE = path.join(STORAGE_DIR, 'records.json');

/** 生成随机4位数字字符串 */
function random4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * 确保存储目录和记录文件存在
 */
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * 读取所有已存储记录
 * @returns {Array<Object>}
 */
function readRecords() {
  ensureStorageDir();
  try {
    const raw = fs.readFileSync(RECORDS_FILE, 'utf-8');
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

/**
 * 覆写记录文件
 * @param {Array<Object>} records
 */
function writeRecords(records) {
  ensureStorageDir();
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

class DecentralizedStorageService {
  /**
   * 上传数据到去中心化存储
   * @param {string|Buffer} data - 要存储的数据
   * @param {'ipfs'|'arweave'} storageType - 存储协议类型
   * @returns {{ uri: string, cid: string, storageType: string, size: number }}
   */
  upload(data, storageType = 'ipfs') {
    if (!['ipfs', 'arweave'].includes(storageType)) {
      throw new Error(`不支持的存储类型: ${storageType}，仅支持 ipfs 或 arweave`);
    }

    const dataStr = typeof data === 'string' ? data : data.toString('utf-8');
    const size = Buffer.byteLength(dataStr, 'utf-8');
    const timestamp = Date.now();
    const rand = random4();

    let uri;
    let cid;

    if (storageType === 'ipfs') {
      cid = `sim_cid_${timestamp}_${rand}`;
      uri = `ipfs://${cid}`;
    } else {
      // arweave
      cid = `sim_tx_${timestamp}`;
      uri = `ar://${cid}`;
    }

    // 计算数据的 SHA-256 哈希作为完整性校验
    const hash = crypto.createHash('sha256').update(dataStr).digest('hex');

    // 存储到本地沙箱文件
    ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, cid);
    fs.writeFileSync(filePath, dataStr, 'utf-8');

    // 写入记录
    const record = { uri, cid, storageType, size, hash, createdAt: new Date().toISOString() };
    const records = readRecords();
    records.push(record);
    writeRecords(records);

    return { uri, cid, storageType, size };
  }

  /**
   * 从去中心化存储获取数据
   * @param {string} uri - 存储 URI（如 ipfs://<cid> 或 ar://<txid>）
   * @returns {string} 原始数据
   */
  get(uri) {
    if (typeof uri !== 'string' || !uri) {
      throw new Error('无效的 URI');
    }

    // 从 URI 中解析出 CID/txid
    let cid;
    if (uri.startsWith('ipfs://')) {
      cid = uri.slice('ipfs://'.length);
    } else if (uri.startsWith('ar://')) {
      cid = uri.slice('ar://'.length);
    } else {
      throw new Error(`无法识别的 URI 格式: ${uri}`);
    }

    if (!cid) {
      throw new Error(`URI 中缺少标识符: ${uri}`);
    }

    const filePath = path.join(STORAGE_DIR, cid);
    if (!fs.existsSync(filePath)) {
      throw new Error(`存储数据不存在: ${uri} (${filePath})`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * 验证数据的完整性
   * @param {string} uri - 存储 URI
   * @param {string} expectedHash - 期望的 SHA-256 哈希值
   * @returns {{ valid: boolean, actualHash: string }}
   */
  verify(uri, expectedHash) {
    const data = this.get(uri);
    const actualHash = crypto.createHash('sha256').update(data).digest('hex');
    return { valid: actualHash === expectedHash, actualHash };
  }

  /**
   * 列出所有已存储记录
   * @returns {Array<{ uri: string, cid: string, storageType: string, size: number, hash: string, createdAt: string }>}
   */
  list() {
    return readRecords();
  }
}

module.exports = { DecentralizedStorageService };
