/**
 * DualAnchorService
 * 国内 Hash 上广数交所 + 跨境需求走 HashKey
 * 双锚机制
 * 支持 FileStore 持久化
 */
class DualAnchorService {
  constructor(store = null) {
    this._store = store;
  }

  async anchorDomestic(hash, productId) {
    const anchorId = `dom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: anchorId,
      anchorId,
      hash,
      productId,
      gseTxId: `sim_gse_tx_${Date.now()}`,
      status: 'anchored',
      chains: ['guangzhou'],
      type: 'domestic',
      createdAt: new Date().toISOString(),
    };
    if (this._store) this._store.set(anchorId, record);
    return { anchorId: record.anchorId, gseTxId: record.gseTxId, status: record.status, chains: record.chains };
  }

  async anchorCrossBorder(hash, productId) {
    const anchorId = `cross_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: anchorId,
      anchorId,
      hash,
      productId,
      hashkeyTxId: `sim_hashkey_tx_${Date.now()}`,
      status: 'anchored',
      chains: ['hashkey'],
      type: 'cross_border',
      createdAt: new Date().toISOString(),
    };
    if (this._store) this._store.set(anchorId, record);
    return { anchorId: record.anchorId, hashkeyTxId: record.hashkeyTxId, status: record.status, chains: record.chains };
  }

  async anchorDual(hash, productId) {
    const [domestic, crossBorder] = await Promise.all([
      this.anchorDomestic(hash, productId),
      this.anchorCrossBorder(hash, productId),
    ]);
    return { domestic, crossBorder };
  }

  getAnchor(anchorId) {
    if (this._store) return this._store.get(anchorId) || null;
    return null;
  }

  listAnchors() {
    if (this._store) return this._store.getAll();
    return [];
  }

  getStats() {
    const all = this._store ? this._store.getAll() : [];
    const total = all.length;
    const domestic = all.filter(r => r.chains.includes('guangzhou') && !r.chains.includes('hashkey')).length;
    const crossBorder = all.filter(r => r.chains.includes('hashkey') && !r.chains.includes('guangzhou')).length;
    const dual = all.filter(r => r.chains.length > 1).length;
    return { total, domestic, crossBorder, dual };
  }
}

module.exports = { DualAnchorService };
