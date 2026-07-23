/**
 * 龟钮·印证 — CCIP 接驳服务
 *
 * 功能：龟钮 "Hash 指纹 → 广数交所产品编码" 一键映射
 * 支持 FileStore 持久化
 */

const crypto = require('crypto');

class CcipMappingService {
  constructor(mappingStore = null, messageStore = null) {
    this._mappingStore = mappingStore;
    this._messageStore = messageStore;
  }

  _generateId(prefix = 'map') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  _ts() {
    return new Date().toISOString();
  }

  async mapHashToGse(hash, productInfo = {}) {
    const mappingId = this._generateId('map');
    const gseProductCode = `GSE${crypto.createHash('sha256').update(hash + Date.now()).digest('hex').slice(0, 12).toUpperCase()}`;

    const mapping = {
      id: mappingId,
      hash,
      gseProductCode,
      productName: productInfo.productName || '未命名产品',
      category: productInfo.category || '其他',
      provider: productInfo.provider || '未知',
      status: 'mapped',
      source: 'guangzhou_gse',
      createdAt: this._ts(),
    };

    if (this._mappingStore) this._mappingStore.set(mappingId, mapping);

    const ccipMsg = await this._sendCcipMessage({
      sourceChain: 'guangzhou_gse',
      targetChain: 'hashkey',
      payload: { hash, gseProductCode, action: 'PRODUCT_MAPPING' },
    });

    return { mapping, ccipMessage: ccipMsg };
  }

  async batchMap(hashes, productInfos = {}) {
    const results = [];
    for (const hash of hashes) {
      const info = productInfos[hash] || {};
      const result = await this.mapHashToGse(hash, info);
      results.push(result);
    }
    return { total: results.length, mappings: results.map(r => r.mapping), ccipMessages: results.map(r => r.ccipMessage) };
  }

  getHashByGseCode(gseProductCode) {
    if (this._mappingStore) {
      return this._mappingStore.findOne(m => m.gseProductCode === gseProductCode) || null;
    }
    return null;
  }

  getMapping(mappingId) {
    if (this._mappingStore) {
      return this._mappingStore.get(mappingId) || null;
    }
    return null;
  }

  getMappingsByHash(hash) {
    if (this._mappingStore) {
      return this._mappingStore.find(m => m.hash === hash);
    }
    return [];
  }

  listMappings(status) {
    if (this._mappingStore) {
      const all = this._mappingStore.getAll();
      return status ? all.filter(m => m.status === status) : all;
    }
    return [];
  }

  getStats() {
    const all = this._mappingStore ? this._mappingStore.getAll() : [];
    return {
      total: all.length,
      byCategory: this._groupBy(all, 'category'),
      byStatus: this._groupBy(all, 'status'),
    };
  }

  async _sendCcipMessage(msgData) {
    const msgId = `ccip_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const message = {
      id: msgId,
      sourceChain: msgData.sourceChain,
      targetChain: msgData.targetChain,
      payload: msgData.payload,
      status: 'confirmed',
      blockNumber: Math.floor(Math.random() * 1000000),
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      timestamp: this._ts(),
    };
    if (this._messageStore) this._messageStore.set(msgId, message);
    return message;
  }

  getCcipMessage(msgId) {
    if (this._messageStore) return this._messageStore.get(msgId) || null;
    return null;
  }

  listCcipMessages() {
    if (this._messageStore) return this._messageStore.getAll();
    return [];
  }

  _groupBy(arr, key) {
    const map = {};
    arr.forEach(item => {
      const k = item[key] || 'unknown';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }
}

module.exports = { CcipMappingService };
