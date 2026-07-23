const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const PROJECTS = {
  seal: {
    name: '龟钮·印信',
    dir: ROOT,
    dataDir: path.join(ROOT, 'data'),
    files: ['users.json', 'wallets.json', 'payments.json', 'contracts.json', 'transactions.json', 'opRegistry.json', 'deadLetterOps.json', 'taxRecords.json'],
    preset: './presets/seal',
    dataStreams: {
      orderFlow: { files: ['payments.json', 'contracts.json', 'transactions.json'], cosPrefix: 'order-flow' },
      fundFlow: { files: ['wallets.json'], cosPrefix: 'fund-flow' },
      taxFlow: { files: ['taxRecords.json'], cosPrefix: 'tax-flow' },
      notaryFlow: { files: ['opRegistry.json', 'deadLetterOps.json'], cosPrefix: 'notary-flow' },
      supervisoryFlow: { files: ['supervisoryAccounts.json'], cosPrefix: 'supervisory-flow' },
      riskFlow: { files: ['riskAlerts.json'], cosPrefix: 'risk-flow' },
      budgetFlow: { files: ['budgetForecasts.json'], cosPrefix: 'budget-flow' },
      valuationFlow: { files: ['valuationRecords.json'], cosPrefix: 'valuation-flow' },
      collectorEventFlow: { files: ['collectorEvents.json'], cosPrefix: 'collector-event-flow' },
    },
  },
  verify: {
    name: '龟钮·印证',
    dir: path.resolve('D:\\X402-GUINIU\\backend'),
    dataDir: path.resolve('D:\\X402-GUINIU\\backend\\data'),
    files: ['dataProducts.json', 'kolWeights.json', 'notaryRecords.json', 'governanceRecords.json', 'dataConsentRecords.json', 'earningsRecords.json'],
    preset: './presets/verify',
    dataStreams: {
      orderFlow: { files: ['dataProducts.json'], cosPrefix: 'order-flow' },
      fundFlow: { files: ['earningsRecords.json'], cosPrefix: 'fund-flow' },
      taxFlow: { files: [], cosPrefix: 'tax-flow' },
      notaryFlow: { files: ['notaryRecords.json', 'governanceRecords.json'], cosPrefix: 'notary-flow' },
      valuationFlow: { files: ['valuationRecords.json', 'valuationMetrics.json'], cosPrefix: 'valuation-flow' },
    },
  },
  deveco: {
    name: '龟钮·自驭',
    dir: path.resolve('D:\\X402-DEVECO\\backend'),
    dataDir: path.resolve('D:\\X402-DEVECO\\data'),
    files: ['agents.json', 'contents.json', 'tasks.json', 'weightRecords.json'],
    preset: './presets/deveco',
    dataStreams: {
      orderFlow: { files: ['tasks.json'], cosPrefix: 'order-flow' },
      fundFlow: { files: ['weightRecords.json'], cosPrefix: 'fund-flow' },
      taxFlow: { files: [], cosPrefix: 'tax-flow' },
      notaryFlow: { files: [], cosPrefix: 'notary-flow' },
    },
  },
};

const COS_CONFIG = {
  enabled: process.env.COS_ENABLED === 'true' || false,
  secretId: process.env.COS_SECRET_ID || '',
  secretKey: process.env.COS_SECRET_KEY || '',
  region: process.env.COS_REGION || 'ap-guangzhou',
  bucket: process.env.COS_BUCKET || 'x402-1454137396',
  prefix: process.env.COS_PREFIX || 'seed-engine',
};

const ENGINE_CONFIG = {
  autoSeedOnStartup: process.env.AUTO_SEED === 'true' || false,
  cosOnSeed: process.env.COS_ON_SEED === 'true' || false,
  requireConfirm: process.env.SEED_CONFIRM !== 'false',
  aiAutomation: process.env.AI_AUTOMATION === 'true' || false,
  dataStreamSeparation: process.env.DATA_STREAM_SEPARATION !== 'false',
};

const PERMISSION_GATES = {
  seed_read: { autoAllowed: true, requireManual: false },
  seed_check: { autoAllowed: true, requireManual: false },
  seed_status: { autoAllowed: true, requireManual: false },
  seed_force: { autoAllowed: false, requireManual: true, manualReason: '强制覆盖种子数据需要手动确认', requireRole: ['admin', 'operator'] },
  seed_delete: { autoAllowed: false, requireManual: true, manualReason: '删除种子数据需要手动确认', requireRole: ['admin'] },
  cos_upload: { autoAllowed: true, requireManual: false },
  cos_delete: { autoAllowed: false, requireManual: true, manualReason: '删除COS数据需要手动确认', requireRole: ['admin'] },
  kyc_override: { autoAllowed: false, requireManual: true, manualReason: 'KYC/CDD/AML合规验证需手动确认' },
  tax_track_change: { autoAllowed: false, requireManual: true, manualReason: '税务轨选择需用户指定' },
  fund_authorize: { autoAllowed: false, requireManual: true, manualReason: '资金授权需用户二次确认', maxAmount: 50000 },
  supervisory_freeze: { autoAllowed: false, requireManual: true, manualReason: '监管账户冻结需手动确认', requireRole: ['admin', 'risk_officer'] },
  judicial_freeze: { autoAllowed: false, requireManual: true, manualReason: '司法冻结需手动确认', requireRole: ['admin'] },
  consent_second: { autoAllowed: false, requireManual: true, manualReason: '二次同意必须通过Passkey/人脸验证' },
  budget_override: { autoAllowed: false, requireManual: true, manualReason: '预算调整需手动确认', requireRole: ['admin', 'finance'] },
};

module.exports = { PROJECTS, COS_CONFIG, ENGINE_CONFIG, PERMISSION_GATES, ROOT };
