export interface SettlementRequest {
  channel: 'alipay' | 'wechat' | 'ecny';
  totalAmount: number;
  subject: string;
  payerId: string;
  payeeId: string;
  splits?: SplitRule[];
  ruleId?: string;
  agentId?: string;
  payMode?: 'page' | 'qrcode' | 'app' | 'jsapi';
  kolTrack?: 'A' | 'B' | 'C';
  monthlyAccumulated?: number;
  dailyCount?: number;
}

export interface PrepareResponse {
  paymentId: string;
  channel: string;
  totalAmount: number;
  subject: string;
  payerId: string;
  payeeId: string;
  splits: SplitResult[];
  taxResult: TaxResult | null;
  walletCheck: WalletCheckResult;
  channelProfile: ChannelProfile;
  thresholdEval: ThresholdEvaluation;
  guiniuEval: GuiniuPointEvaluation;
  evidence: EvidenceSummary;
  hash: string;
  status: 'prepared';
  nextStep: 'confirm';
  confirmUrl: '/api/settle/confirm';
}

export interface ConfirmRequest {
  paymentId: string;
  firstConsent: boolean;
  secondConsent?: boolean;
  consentMethod?: 'api' | 'passkey' | 'face' | 'password';
  channel?: string;
  payMode?: string;
}

export interface SplitRule {
  partyId: string;
  weight: number;
  wallet?: string;
  memo?: string;
}

export interface SplitResult {
  partyId: string;
  amount: number;
  weight: number;
  wallet?: string;
  memo: string;
}

export interface TaxResult {
  netAmount: number;
  taxWithheld: number;
  needInvoice: boolean;
  riskTags: string[];
  track: 'A' | 'B' | 'C';
  detail: string;
}

export interface TaxRecord {
  id: string;
  userId: string;
  orderId: string | null;
  amount: number;
  track: string;
  taxWithheld: number;
  netAmount: number;
  state: 'pending' | 'withheld' | 'declared' | 'remitted' | 'verified' | 'incentivized' | 'penalized' | 'void';
  stateHistory: TaxStateTransition[];
  complianceWeight: number;
  externalVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxStateTransition {
  state: string;
  at: string;
  by: string;
  note?: string;
}

export interface L1BalanceProbeResult {
  available: number;
  requested: number;
  channel: string;
  probeMethod: string;
  canReserve: boolean;
  reason: string | null;
  estimatedHold: number;
  probeNote?: string;
  l1Strategy?: string;
  probeAction?: string;
  probeAmount?: number;
}

export interface DualConsentResult {
  passed: boolean;
  evidenceId: string;
  consentType: 'firstConsent' | 'secondConsent';
  error?: string;
  message?: string;
  status?: string;
}

export interface FourFlowCollectResult {
  collected: boolean;
  collectionId?: string;
  streams: CollectorEvent;
  compliance: { passed: boolean; results: Record<string, boolean>; failedStreams: string[] };
  hashBeforeNotary: boolean;
  timestamp: string;
  reason?: string;
  missing?: string[];
  blockedBeforeHash?: boolean;
}

export interface WalletReconcileResult {
  success: boolean;
  userId: string;
  bookBalance: number;
  calculatedBalance: number;
  bookReserved: number;
  calculatedReserved: number;
  balanceMatch: boolean;
  reservedMatch: boolean;
  alert: boolean;
  transactionCount: number;
}

export interface EvidenceSummary {
  evidenceId: string;
  digest: string;
  status: string;
  timestamp: string;
  fundFlowSnapshot?: FundFlowSnapshot;
}

export interface FundFlowSnapshot {
  totalAmount: number;
  splits: Array<{ partyId: string; amount: number; memo: string }>;
  taxWithheld: number;
  netAmount: number;
  taxTrack: string | null;
  taxRiskTags: string[];
}

export interface WalletCheckResult {
  available: number;
  requested: number;
  channel: string;
  probeMethod: string;
  canReserve: boolean;
  reason: string | null;
  estimatedHold: number;
  probeNote?: string;
}

export interface WalletReserveResult {
  reserved: boolean;
  orderId: string;
  amount: number;
  channel: string;
  reservedAt: string;
  expiresAt: string;
  reason?: string;
}

export interface ChannelProfile {
  id: string;
  name: string;
  modes: string[];
  balanceProbe: string;
  reserveMethod: string;
  executeMethod: string;
  costPerTx: number;
  supportsSplit: boolean;
  supportsUmbrella: boolean;
  kycRequired: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
}

export interface ThresholdEvaluation {
  action: 'direct_settle' | 'accumulate_guiniu_point';
  reason: string;
  amount: number;
  channel: string;
  pointsAdded?: number;
  costSaving?: boolean;
}

export interface GuiniuPointEvaluation {
  currentPoints: number;
  pointValue: number;
  totalValue: number;
  threshold: number;
  canTrigger: boolean;
  netAfterCost: number;
  costBreakdown: { channelCost: number; taxCost: number };
  remainingToThreshold: number;
  complianceLevel: string;
  recommendation: string;
}

export interface CollectorEvent {
  orderFlow: { orderId: string; payerId: string; payeeId: string; subject: string; status: string };
  fundFlow: { amount: number; channel: string; splits: SplitResult[]; status: string };
  taxFlow: { status: string };
  notaryFlow: { provider: string; evidenceId: string; status: string };
}

export interface CollectorResult {
  accepted: boolean;
  collectionId?: string;
  queueDepth?: number;
  reason?: string;
  blockedStreams?: string[];
}

export interface NotificationRequest {
  userId: string;
  category: string;
  channel: 'sms' | 'email' | 'login' | 'in_app';
  templateId?: string;
  variables?: Record<string, string>;
  customTitle?: string;
  customBody?: string;
  channels?: string[];
}

export interface SsoTokenSet {
  seal: string;
  deveco: string;
  verify: string;
  guiniu: string;
}

export interface LoginResponse {
  token: string;
  ssoTokens: SsoTokenSet;
  user: { id: string; nickName: string; avatarUrl: string; role: string };
  hasEarnings: boolean;
  pendingEarnings: number;
}

export interface IdempotencyCheck {
  isDuplicate: boolean;
  result?: unknown;
}

export interface DeadLetterEntry {
  id: string;
  type: string;
  source: string;
  target: string;
  payload: unknown;
  status: 'dead';
  retries: number;
  maxRetries: number;
  deadReason: string;
  deadAt: string;
}

export interface PageWeightedSettleEvent {
  userId: string;
  page: string;
  project: 'seal' | 'deveco' | 'verify' | 'guiniu';
  visitCount: number;
  frequency: number;
  duration: number;
  interaction: number;
  contentDimension: number;
  depthScore: number;
  shareTrack: number;
  sessionId?: string;
  referrer?: string;
}

export interface PageWeightResult {
  totalWeight: number;
  dimensions: Record<string, number>;
  raw: Record<string, number>;
}

export interface PageWeightedSettleResult {
  userId: string;
  project: string;
  period: string;
  eventCount: number;
  totalWeight: number;
  settleAmount: number;
  baseRate: number;
  channel: string;
}

export interface EvidenceValuationMetrics {
  viewCount: number;
  dwellTime: number;
  purchaseCount: number;
  shareCount: number;
  commentCount: number;
  bookmarkCount: number;
  reportCount: number;
  baseValue?: number;
}

export interface EvidenceValuationResult {
  totalWeight: number;
  estimatedValue: number;
  positiveContribution: number;
  negativeContribution: number;
  dimensions: Record<string, number>;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface ContractVerifyResult {
  verified: boolean;
  reason?: string;
  message?: string;
  contractId?: string;
  contractType?: string;
  commissionRate?: number;
  signedAt?: string;
  expiredAt?: string;
}

export interface ContractSettleResult {
  id: string;
  merchantId: string;
  kolUserId: string;
  amount: number;
  subject: string;
  channel: string;
  contractId: string;
  contractType: string;
  commissionRate: number;
  breakdown: {
    kolShare: number;
    merchantShare: number;
    platformFee: number;
    taxReserve: number;
  };
  weightUpdate: KolWeightAdjustResult | null;
  status: string;
}

export interface KolWeightAdjustResult {
  kolUserId: string;
  oldWeight: number;
  newWeight: number;
  level: number;
  salesCount: number;
  dataQuality: number;
  direction: 'up' | 'down' | 'stable';
}

// ========== pay.txt 20260719+20260720 新增类型 ==========

export interface RedisSimulatorStats {
  totalKeys: number;
  keys: string[];
}

export interface SupervisoryAccount {
  accountId: string;
  userId: string;
  accountType: 'escrow' | 'settlement' | 'reserve' | 'collection';
  provider: string;
  bankAccount: string | null;
  balance: number;
  frozenAmount: number;
  status: 'active' | 'frozen' | 'closed';
  riskFlags: Array<{ type: string; amount?: number; reason?: string; courtRef?: string; targetAccount?: string; at: string }>;
  judicialFreeze: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisoryAccountDepositResult {
  success: boolean;
  accountId: string;
  newBalance: number;
  amount: number;
  orderId: string;
  error?: string;
}

export interface SupervisoryAccountFreezeResult {
  success: boolean;
  accountId: string;
  frozenAmount: number;
  availableBalance: number;
  error?: string;
}

export interface SupervisoryAccountJudicialResult {
  success: boolean;
  accountId: string;
  judicialFreeze: boolean;
  frozenAmount?: number;
  error?: string;
}

export interface SupervisoryAccountEmergencyCollectResult {
  success: boolean;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  reason: string;
  error?: string;
}

export interface RiskCheckResult {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskTags: string[];
  shouldBlock: boolean;
  shouldFreeze: boolean;
  checkedAt: string;
}

export interface RiskAlert {
  alertId: string;
  userId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskTags: string[];
  shouldBlock: boolean;
  shouldFreeze: boolean;
  checkedAt: string;
}

export interface BudgetForecastResult {
  currentBudget: number;
  dailySpendRate: number;
  daysRemaining: number;
  projectedSpend: number;
  projectedDataRevenue: number;
  projectedRemaining: number;
  willExhaust: boolean;
  exhaustionDate: string | null;
  recommendation: string;
  timeline: BudgetTimelinePoint[];
  pendingOrdersCount: number;
  forecastAt: string;
}

export interface BudgetTimelinePoint {
  day: number;
  date: string;
  projectedRemaining: number;
  status: 'healthy' | 'warning' | 'exhausted';
  riskAlerts?: number;
  riskLevel?: 'normal' | 'elevated';
}

export interface DualClearanceResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  payerId: string;
  payeeId: string;
  amount: number;
  channel: string;
  checkedAt: string;
}

export interface DirtyWriteCheckResult {
  storeName: string;
  totalChecked: number;
  issues: DirtyWriteIssue[];
  issueCount: number;
  checkedAt: string;
}

export interface DirtyWriteIssue {
  id: string;
  type: 'balance_mismatch' | 'reserved_mismatch';
  bookBalance?: number;
  calculatedBalance?: number;
  bookReserved?: number;
  calculatedReserved?: number;
}

export interface DirtyWriteRepairResult {
  repaired: Array<{ id: string; field: string; from: number; to: number }>;
  count: number;
  repairedAt: string;
}

export interface ConsentAuthFirstResult {
  passed: boolean;
  error?: string;
  message?: string;
  requiredMethods?: string[];
  providedMethod?: string;
  containerType?: string;
  biometricVerified?: boolean;
  passkeyVerified?: boolean;
}

export interface ConsentAuthSecondResult {
  passed: boolean;
  error?: string;
  message?: string;
  mandatoryMethods?: string[];
  providedMethod?: string;
  containerType?: string;
  biometricVerified?: boolean;
  passkeyVerified?: boolean;
  notaryCommit?: boolean;
  taxDirectClear?: boolean;
  irrevocable?: boolean;
}

export interface EvidenceValuationEvaluateResult {
  totalWeight: number;
  estimatedValue: number;
  positiveContribution: number;
  negativeContribution: number;
  dimensions: Record<string, number>;
  raw: Record<string, number>;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface EvidenceValuationTestPayResult {
  testPayable: boolean;
  evidenceId: string;
  estimatedValue: number;
  qualityGrade: string;
  channel: string;
  microEval?: unknown;
  testPayAt: string;
  reason?: string;
}

export interface CollectorEmitResult {
  emittedAt: string;
  eventType: string;
  [key: string]: unknown;
}

export interface BudgetAlertResult {
  alert: {
    userId: string;
    alertLevel: 'normal' | 'warning' | 'critical';
    forecast: BudgetForecastResult;
    alertAt: string;
  };
  forecast: BudgetForecastResult;
}

export interface TimelineForecastResult {
  userId: string;
  budgetForecast: BudgetForecastResult;
  timeline: BudgetTimelinePoint[];
  riskSummary: { totalAlerts: number; highRisk: number };
  recommendation: string;
  forecastAt: string;
}
