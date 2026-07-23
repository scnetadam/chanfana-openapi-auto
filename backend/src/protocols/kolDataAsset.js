/**
 * KolDataAssetService
 * KOL 权重指纹 → 数据产品入表，反哺 B 端车商财务报表
 * 支持 FileStore 持久化
 */
class KolDataAssetService {
  constructor(store = null) {
    this._store = store;
  }

  _getStore() {
    return this._store;
  }

  async createAsset(kolId, kolName, weightScore, contentMetrics = {}) {
    const { impressions = 0, engagement = 0, conversions = 0 } = contentMetrics;

    const baseValue = weightScore * 1000;
    const impressionValue = impressions * 0.01;
    const engagementValue = engagement * 0.05;
    const conversionValue = conversions * 0.1;
    const assetValue = baseValue + impressionValue + engagementValue + conversionValue;

    const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: assetId,
      assetId,
      kolId,
      kolName,
      weightScore,
      contentMetrics: { impressions, engagement, conversions },
      baseValue,
      impressionValue,
      engagementValue,
      conversionValue,
      assetValue,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const store = this._getStore();
    if (store) store.set(assetId, record);
    return record;
  }

  listAssets(kolId) {
    const store = this._getStore();
    const all = store ? store.getAll() : [];
    if (kolId) {
      return all.filter(a => a.kolId === kolId);
    }
    return all;
  }

  getAsset(assetId) {
    const store = this._getStore();
    return store ? store.get(assetId) : null;
  }

  calculateAssetValue(assetId) {
    const asset = this.getAsset(assetId);
    if (!asset) return null;

    const breakdown = {
      baseValue: asset.weightScore * 1000,
      impressionValue: asset.contentMetrics.impressions * 0.01,
      engagementValue: asset.contentMetrics.engagement * 0.05,
      conversionValue: asset.contentMetrics.conversions * 0.1,
    };

    const assetValue =
      breakdown.baseValue + breakdown.impressionValue + breakdown.engagementValue + breakdown.conversionValue;

    return { assetValue, breakdown };
  }

  getFinancialReport(kolId) {
    const assets = this.listAssets(kolId);
    const totalValue = assets.reduce((s, a) => s + a.assetValue, 0);
    return {
      kolId,
      kolName: assets.length > 0 ? assets[0].kolName : null,
      totalAssets: assets.length,
      totalValue,
      assets,
    };
  }

  getAllFinancialReports() {
    const store = this._getStore();
    const all = store ? store.getAll() : [];
    const byKol = new Map();
    for (const asset of all) {
      if (!byKol.has(asset.kolId)) {
        byKol.set(asset.kolId, { kolId: asset.kolId, kolName: asset.kolName, totalAssets: 0, totalValue: 0 });
      }
      const entry = byKol.get(asset.kolId);
      entry.totalAssets += 1;
      entry.totalValue += asset.assetValue;
    }
    return Array.from(byKol.values());
  }
}

module.exports = { KolDataAssetService };
