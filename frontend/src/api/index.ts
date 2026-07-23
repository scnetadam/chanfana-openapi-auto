/**
 * 龟钮自驭 API 封装
 * 后端：龟钮自驭汽车资讯后端 (Express :3000)
 */

const BASE_URL = import.meta.env.VITE_API_BASE || 'https://x402.chinaauto.ccwu.cc/api/deveco';

// 当前登录用户ID（导出供其他模块使用）
export function getUserId(): string {
  return uni.getStorageSync('userId') || '';
}

function getToken(): string {
  return uni.getStorageSync('token') || '';
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const showLoading = options.showLoading ?? true;
  const token = getToken();
  const fullUrl = `${BASE_URL}${url}`;

  console.log('[API] request:', options.method || 'GET', fullUrl);

  if (showLoading) {
    uni.showLoading({ title: options.loadingText || '加载中...', mask: true });
  }

  try {
    const res = await new Promise<any>((resolve, reject) => {
      uni.request({
        url: fullUrl,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 30000,
        success: (resp: any) => {
          console.log('[API] response:', resp.statusCode, fullUrl, JSON.stringify(resp.data).slice(0, 200));
          resolve(resp);
        },
        fail: (err: any) => {
          console.error('[API] fail:', fullUrl, JSON.stringify(err));
          reject(err);
        },
      });
    });

    if (res.statusCode === 404) {
      throw new Error('接口不存在 (404)');
    }
    if (res.statusCode >= 400) {
      const msg = (res.data && res.data.error) ? res.data.error : `HTTP ${res.statusCode}`;
      throw new Error(msg);
    }

    return res.data as T;
  } catch (err: any) {
    const msg = err.errMsg || err.message || '网络错误';
    console.error('[API] error:', msg, err);
    uni.showToast({ title: msg, icon: 'none', duration: 3000 });
    throw err;
  } finally {
    if (showLoading) {
      uni.hideLoading();
    }
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  showLoading?: boolean;
  loadingText?: string;
}

// ==================== Auth ====================
export const authApi = {
  /** 统一登录（微信/支付宝/H5） */
  login(code: string, nickName?: string, avatarUrl?: string, platform?: string) {
    return request<ApiResult<{ token: string; ssoTokens?: Record<string, string>; user: { id: string; nickName: string; avatarUrl: string; role?: string }; hasEarnings?: boolean; pendingEarnings?: number }>>('/auth/login', {
      method: 'POST',
      data: { code, nickName, avatarUrl, platform },
      showLoading: false,
    });
  },
  /** SSO跨项目验证 */
  ssoVerify(token: string, project: string) {
    return request<ApiResult<{ token: string; userId: string; nickName: string; role: string; project: string }>>('/auth/sso/verify', {
      method: 'POST',
      data: { token, project },
      showLoading: false,
    });
  },
  /** 验证token */
  verify(token: string) {
    return request<ApiResult<{ payload: Record<string, any> }>>('/auth/verify', {
      method: 'POST',
      data: { token },
      showLoading: false,
    });
  },
};

// ==================== Activity ====================
export const activityApi = {
  /** 活动列表 */
  list() {
    return request<ApiResult<ActivityItem[]>>('/activity/list', { showLoading: false });
  },
  /** 活动详情 */
  detail(id: string) {
    return request<ApiResult<ActivityItem>>(`/activity/${id}`, { showLoading: false });
  },
};

// ==================== Content ====================
export const contentApi = {
  /** 发布内容 */
  publish(data: { text: string; images: string[]; activityId: string; userId: string; nickName?: string }) {
    return request<ApiResult<{ id: string; trackId: string; shareUrl: string }>>('/content/publish', {
      method: 'POST',
      data,
    });
  },
  /** 内容详情 */
  detail(id: string) {
    return request<ApiResult<ContentDetail>>(`/content/${id}`, { showLoading: false });
  },
  /** 内容统计 */
  stats(id: string) {
    return request<ApiResult<any>>(`/content/stats/${id}`, { showLoading: false });
  },
  /** 用户的内容列表 */
  userContents(userId: string) {
    return request<ApiResult<ContentDetail[]>>(`/content/user/${userId}`, { showLoading: false });
  },
  /** 记录阅读追踪 */
  trackView(contentId: string, spreadUserId?: string) {
    return request<ApiResult<{ tracked: boolean; earnings: number }>>('/content/track/view', {
      method: 'POST',
      data: { contentId, spreadUserId },
      showLoading: false,
    });
  },
};

// ==================== Booking ====================
export const bookingApi = {
  /** 提交试驾预约 */
  submit(data: { contentId: string; name: string; phone: string; city?: string; dealerName?: string; refChain?: any[]; refUserId?: string; refNickName?: string }) {
    return request<ApiResult<{ bookingId: string; earnings: number; attribution: any[] }>>('/booking/submit', {
      method: 'POST',
      data: { ...data, userId: getUserId() },
    });
  },
};

// ==================== Wallet ====================
export const walletApi = {
  /** 钱包余额 */
  balance() {
    const userId = getUserId();
    return request<ApiResult<{ promotionBalance: number; reputationScore: number }>>(`/wallet/balance?userId=${userId}`, {
      showLoading: false,
    });
  },
  /** 交易流水 */
  transactions(page = 1) {
    const userId = getUserId();
    return request<ApiResult<{ list: TxItem[]; total: number }>>(`/wallet/transactions?userId=${userId}&page=${page}`, {
      showLoading: false,
    });
  },
};

// ==================== AI ====================
export const aiApi = {
  generateCopy(data: { activityId: string; brand: string; model: string; keywords?: string; style?: string }) {
    return request<ApiResult<{ drafts: AiCopyDraft[]; usage?: AiUsage; fallback?: boolean }>>('/ai/generate-copy', {
      method: 'POST',
      data: { ...data, userId: getUserId() },
      showLoading: false,
      loadingText: 'AI 生成中...',
    });
  },
  recommend(data: { userId: string }) {
    return request<ApiResult<{ recommendations: AiRecommendation[]; usage?: AiUsage; fallback?: boolean }>>('/ai/recommend', {
      method: 'POST',
      data,
      showLoading: false,
    });
  },
  insight(data: { userId: string }) {
    return request<ApiResult<{ insights: AiInsight[]; summary: string; usage?: AiUsage; fallback?: boolean }>>('/ai/insight', {
      method: 'POST',
      data,
      showLoading: false,
    });
  },
  assistant(data: { contentId: string; brand: string; model: string; question: string; chatHistory?: AiChatMessage[] }) {
    return request<ApiResult<{ answer: string; suggestedQuestions: string[]; fallback?: boolean }>>('/ai/assistant', {
      method: 'POST',
      data: { ...data, userId: getUserId() },
      showLoading: false,
    });
  },
  valueAssess(data: { contentId: string; conversionType?: string; userId?: string }) {
    return request<ApiResult<ValueAssessResult>>('/ai/value-assess', {
      method: 'POST',
      data,
      showLoading: false,
    });
  },
  valueDashboard(userId: string) {
    return request<ApiResult<ValueDashboardData>>(`/ai/value-dashboard?userId=${userId}`, { showLoading: false });
  },
};

// ==================== Biz Product ====================
export const bizProductApi = {
  types() {
    return request<ApiResult<BizProductType[]>>('/biz-product/types', { showLoading: false });
  },
  create(data: { bizUserId: string; type?: string; title: string; description?: string; price?: number; cover?: string; externalUrl?: string; contactInfo?: Record<string, string>; activityId?: string }) {
    return request<ApiResult<BizProductItem>>('/biz-product/create', { method: 'POST', data });
  },
  list(params?: { activityId?: string; bizUserId?: string; page?: number; pageSize?: number }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request<ApiResult<{ list: BizProductItem[]; total: number }>>(`/biz-product/list${query}`, { showLoading: false });
  },
  detail(id: string) {
    return request<ApiResult<BizProductItem>>(`/biz-product/${id}`, { showLoading: false });
  },
  convert(id: string, data: { userId: string; conversionData?: Record<string, string> }) {
    return request<ApiResult<{ productId: string; conversionValue: number; valueCalc: ValueCalcResult; redirectUrl: string }>>(`/biz-product/${id}/convert`, {
      method: 'POST', data, showLoading: false,
    });
  },
};

// ==================== KOL Task ====================
export const kolTaskApi = {
  types() {
    return request<ApiResult<KolTaskType[]>>('/kol-task/types', { showLoading: false });
  },
  openList() {
    return request<ApiResult<{ list: KolTaskItem[]; total: number }>>('/kol-task/open', { showLoading: false });
  },
  myList(bizUserId: string) {
    return request<ApiResult<{ list: KolTaskItem[]; total: number }>>(`/kol-task/list?bizUserId=${bizUserId}`, { showLoading: false });
  },
  detail(id: string) {
    return request<ApiResult<{ task: KolTaskItem; submissions: number }>>(`/kol-task/${id}`, { showLoading: false });
  },
  submit(taskId: string, data: { kolUserId: string; kolNickName?: string; contentId?: string; bookingId?: string; proofData?: Record<string, string> }) {
    return request<ApiResult<{ submission: KolSubmission; reward: number; aiScore: AiScoreData | null }>>(`/kol-task/${taskId}/submit`, {
      method: 'POST', data,
    });
  },
  earnings(kolUserId: string) {
    return request<ApiResult<KolEarnings>>(`/kol-task/kol/${kolUserId}/earnings`, { showLoading: false });
  },
};

// ==================== Biz Cert ====================
export const bizCertApi = {
  apply(data: { userId: string; companyName: string; creditCode?: string; legalPerson?: string; contactName: string; contactPhone: string; industry?: string; scale?: string }) {
    return request<ApiResult<BizCertResult>>('/biz/apply', { method: 'POST', data });
  },
  status(userId: string) {
    return request<ApiResult<BizCertResult>>(`/biz/status?userId=${userId}`, { showLoading: false });
  },
  search(q: string) {
    return request<ApiResult<BizSearchResult>>(`/biz/search?q=${encodeURIComponent(q)}`, { showLoading: false });
  },
};

// ==================== Settlement ====================
export const settlementApi = {
  create(data: { fromUserId: string; toUserId: string; amount: number; type?: string; refType?: string; refId?: string; description?: string; idempotencyKey?: string }) {
    return request<ApiResult<SettlementItem>>('/settlement/create', { method: 'POST', data });
  },
  /** 两阶段：准备结算（返回预览+存证） */
  prepare(data: { fromUserId: string; toUserId: string; amount: number; type?: string; refType?: string; refId?: string; description?: string; kolTrack?: string; monthlyAccumulated?: number; dailyCount?: number; idempotencyKey?: string }) {
    return request<ApiResult<SettlementPrepareResult>>('/settlement/prepare', { method: 'POST', data });
  },
  /** 两阶段：确认结算（第一次+第二次确认） */
  confirm(data: { settlementId: string; firstConsent: boolean; secondConsent?: boolean; consentMethod?: string }) {
    return request<ApiResult<SettlementItem>>('/settlement/confirm', { method: 'POST', data });
  },
  execute(id: string) {
    return request<ApiResult<SettlementItem>>(`/settlement/${id}/execute`, { method: 'POST', data: {} });
  },
  list(params?: { userId?: string; type?: string; status?: string; page?: number; pageSize?: number }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request<ApiResult<{ list: SettlementItem[]; total: number; page: number; pageSize: number }>>(`/settlement/list${query}`, { showLoading: false });
  },
  stats(userId: string) {
    return request<ApiResult<SettlementStatsData>>(`/settlement/stats?userId=${userId}`, { showLoading: false });
  },
  detail(id: string) {
    return request<ApiResult<{ settlement: SettlementItem; hashVerified: boolean; evidence?: any }>>(`/settlement/${id}`, { showLoading: false });
  },
  /** 税务计算 */
  taxCalculate(data: { amount: number; track: string; monthlyAccumulated?: number; dailyCount?: number }) {
    return request<ApiResult<TaxCalcResult>>('/settlement/tax/calculate', { method: 'POST', data, showLoading: false });
  },
  /** 税务状态转换 */
  taxTransition(data: { settlementId: string; targetState: string; reason?: string }) {
    return request<ApiResult<{ settlementId: string; state: string; history: any[] }>>('/settlement/tax/transition', { method: 'POST', data });
  },
  /** 税务阈值查询 */
  taxThresholds() {
    return request<ApiResult<{ thresholds: Record<string, number>; states: Record<string, string>; transitions: Record<string, string[]> }>>('/settlement/tax/thresholds', { showLoading: false });
  },
  /** 龟钮点阀值评估 */
  thresholdEvaluate(data: { currentPoints?: number; pointValue?: number; channelCost?: number; taxCost?: number; splitWeight?: number; userComplianceLevel?: string }) {
    return request<ApiResult<GuiniuPointEval>>('/settlement/threshold/evaluate', { method: 'POST', data, showLoading: false });
  },
};

// ==================== Types ====================
export interface AiCopyDraft {
  style: string;
  text: string;
}

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface AiRecommendation {
  activityId: string;
  reason: string;
  confidence: number;
  activity: ActivityItem | null;
}

export interface AiInsight {
  type: string;
  title: string;
  detail: string;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ValueCalcResult {
  baseValue: number;
  weightMultiplier: number;
  timeDecay: number;
  finalValue: number;
  platformFee: number;
  distributable: number;
  daysSincePublish: number;
  breakdown: {
    quality: number;
    spread: number;
    kol: number;
    conversion: number;
    avg: number;
    reason?: string;
  };
  source: string;
}

export interface ValueAssessResult {
  value: ValueCalcResult;
  attribution: AttributionNode[];
  totalPool: number;
  platformFee: number;
}

export interface AttributionNode {
  userId: string;
  role: string;
  nickName: string;
  share: number;
  weight: number;
  amount: number;
  conversionType: string;
}

export interface ValueDashboardData {
  totalEarned: number;
  avgWeightMultiplier: number;
  contentCount: number;
  kolScore: number;
  recentValues: Array<{
    contentId: string;
    carModel: string;
    views: number;
    bookings: number;
    finalValue: number;
    weightMultiplier: number;
    source: string;
  }>;
  breakdown: { quality: number; spread: number; kol: number; conversion: number };
}

export interface BizProductType {
  key: string;
  label: string;
  icon: string;
}

export interface BizProductItem {
  id: string;
  bizUserId: string;
  activityId: string;
  type: string;
  typeName: string;
  typeIcon: string;
  title: string;
  description: string;
  price: number;
  cover: string;
  externalUrl: string;
  contactInfo: Record<string, string>;
  status: string;
  stats: { views: number; conversions: number; revenue: number };
  hash: string;
  createdAt: string;
}

export interface KolTaskType {
  key: string;
  label: string;
  desc: string;
}

export interface KolTaskItem {
  id: string;
  bizUserId: string;
  activityId: string;
  type: string;
  typeName: string;
  title: string;
  description: string;
  rewardPerUnit: number;
  targetCount: number;
  completedCount: number;
  totalRewardPool: number;
  usedReward: number;
  status: string;
  deadline: string;
  hash?: string;
  createdAt: string;
}

export interface KolSubmission {
  id: string;
  taskId: string;
  kolUserId: string;
  kolNickName: string;
  type: string;
  contentId: string;
  bookingId: string;
  reward: number;
  aiScore: AiScoreData | null;
  status: string;
  createdAt: string;
}

export interface AiScoreData {
  quality: number;
  spread: number;
  kol: number;
  conversion: number;
  multiplier: number;
}

export interface KolEarnings {
  totalEarnings: number;
  completedTasks: number;
  totalSubmissions: number;
  pendingCount: number;
}

export interface BizCertResult {
  status: string;
  message?: string;
  app?: Record<string, any>;
  biz?: Record<string, any>;
  aiReview?: Record<string, any>;
}

export interface BizSearchResult {
  userId?: string;
  companyName?: string;
  creditRating?: string;
  industry?: string;
  scale?: string;
}

export interface SettlementItem {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  fee: number;
  netAmount: number;
  type: string;
  description: string;
  status: string;
  hashProof: string;
  aiVerified: boolean;
  createdAt: string;
}

export interface SettlementStatsData {
  totalIncome: number;
  totalExpense: number;
  totalFee: number;
  completedCount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface ActivityItem {
  id: string;
  brand: string;
  model: string;
  title: string;
  description: string;
  cover: string;
  rewardPerBooking: number;
  rewardPerView: number;
  status: string;
  totalBudget: number;
  usedBudget: number;
}

export interface ContentDetail {
  id: string;
  userId: string;
  activityId: string;
  images: string[];
  text: string;
  carModel: string;
  trackId: string;
  shareUrl: string;
  hash: string;
  hashTxId: string;
  trackChain: TrackNode[];
  stats: {
    views: number;
    bookings: number;
    shares: number;
    estimatedEarnings: number;
  };
  activity: ActivityItem;
  createdAt: string;
}

export interface TrackNode {
  userId: string;
  role: 'originator' | 'spreader' | 'converter';
  nickName: string;
  timestamp: string;
}

export interface TxItem {
  id: string;
  userId: string;
  type: string;
  amount: number;
  desc: string;
  contentId: string;
  balance: number;
  createdAt: string;
}

// ==================== Video ====================
export const videoApi = {
  /** 视频列表 */
  list() {
    return request<ApiResult<{ videos: VideoItem[]; total: number }>>('/video/list', { showLoading: false });
  },
  /** 上传视频 */
  upload(data: { title: string; description?: string; duration: number; fileSize: number; thumbnail?: string }) {
    return request<ApiResult<VideoItem>>('/video/upload', {
      method: 'POST',
      data,
    });
  },
  /** 视频详情 */
  detail(videoId: string) {
    return request<ApiResult<VideoItem>>(`/video/${videoId}`, { showLoading: false });
  },
  /** 更新视频信息 */
  update(videoId: string, data: { title?: string; description?: string }) {
    return request<ApiResult<VideoItem>>(`/video/${videoId}`, {
      method: 'PUT',
      data,
    });
  },
  /** 删除视频 */
  delete(videoId: string) {
    return request<ApiResult<void>>(`/video/${videoId}`, {
      method: 'DELETE',
    });
  },
  /** 记录观看 */
  view(videoId: string) {
    return request<ApiResult<{ views: number }>>(`/video/${videoId}/view`, {
      method: 'POST',
      showLoading: false,
    });
  },
  /** 点赞 */
  like(videoId: string) {
    return request<ApiResult<{ likes: number }>>(`/video/${videoId}/like`, {
      method: 'POST',
      showLoading: false,
    });
  },
  /** 分享 */
  share(videoId: string) {
    return request<ApiResult<{ shares: number; shareUrl: string }>>(`/video/${videoId}/share`, {
      method: 'POST',
      showLoading: false,
    });
  },
  /** 获取流信息 */
  stream(videoId: string) {
    return request<ApiResult<VideoStream>>(`/video/stream/${videoId}`, { showLoading: false });
  },
};

export interface VideoItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  duration: number;
  fileSize: number;
  thumbnail: string;
  status: 'processing' | 'ready' | 'failed';
  playUrl: string;
  createdAt: string;
  stats: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
}

export interface VideoStream {
  videoId: string;
  playUrl: string;
  quality: string[];
  format: string;
  codec: string;
}

// ==================== AI Video ====================
export const aiVideoApi = {
  /** 获取模板列表 */
  templates() {
    return request<ApiResult<{ templates: AiVideoTemplate[]; total: number }>>('/ai-video/templates', { showLoading: false });
  },
  /** 获取模板详情 */
  templateDetail(templateId: string) {
    return request<ApiResult<AiVideoTemplate>>(`/ai-video/templates/${templateId}`, { showLoading: false });
  },
  /** 创建AI视频项目 */
  create(data: { title: string; templateId: string; materials?: any[]; options?: any }) {
    return request<ApiResult<AiVideoProject>>('/ai-video/create', {
      method: 'POST',
      data,
    });
  },
  /** 获取项目列表 */
  projects() {
    return request<ApiResult<{ projects: AiVideoProject[]; total: number }>>('/ai-video/projects', { showLoading: false });
  },
  /** 获取项目详情 */
  projectDetail(projectId: string) {
    return request<ApiResult<AiVideoProject>>(`/ai-video/projects/${projectId}`, { showLoading: false });
  },
  /** 启动生成 */
  generate(projectId: string, tasks?: any[]) {
    return request<ApiResult<{ projectId: string; status: string; message: string }>>(`/ai-video/projects/${projectId}/generate`, {
      method: 'POST',
      data: { tasks },
    });
  },
  /** 查询进度 */
  progress(projectId: string) {
    return request<ApiResult<{ projectId: string; status: string; progress: number; result?: any }>>(`/ai-video/projects/${projectId}/progress`, { showLoading: false });
  },
  /** 生成字幕 */
  subtitle(videoUrl: string, language?: string) {
    return request<ApiResult<AiVideoSubtitle>>('/ai-video/subtitle', {
      method: 'POST',
      data: { videoUrl, language },
    });
  },
  /** 应用特效 */
  effect(videoUrl: string, effectType: string, params?: any) {
    return request<ApiResult<AiVideoEffect>>('/ai-video/effect', {
      method: 'POST',
      data: { videoUrl, effectType, params },
    });
  },
  /** AI剪辑 */
  edit(clips: any[], transitions?: any[], music?: any) {
    return request<ApiResult<AiVideoEdit>>('/ai-video/edit', {
      method: 'POST',
      data: { clips, transitions, music },
    });
  },
};

export interface AiVideoTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: number;
  scenes: number;
  features: string[];
}

export interface AiVideoProject {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  templateName: string;
  materials: any[];
  options: any;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  progress: number;
  result: any;
  createdAt: string;
  updatedAt: string;
}

export interface AiVideoSubtitle {
  id: string;
  videoUrl: string;
  language: string;
  format: string;
  content: string;
  createdAt: string;
}

export interface AiVideoEffect {
  id: string;
  videoUrl: string;
  effectType: string;
  params: any;
  resultUrl: string;
  createdAt: string;
}

export interface AiVideoEdit {
  id: string;
  clips: any[];
  transitions: any[];
  music: any;
  resultUrl: string;
  createdAt: string;
}

export const x402PayApi = {
  async requestAccess(tradeNo?: string): Promise<{ paid: boolean; data?: any; paymentRequired?: { tradeNo: string; amount: string; payUrl: string } }> {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tradeNo ? { 'x402-trade-no': tradeNo } : {}),
    };

    try {
      const res = await new Promise<any>((resolve, reject) => {
        uni.request({
          url: `${BASE_URL}/data`,
          method: 'GET',
          header: headers,
          timeout: 15000,
          success: (resp: any) => resolve(resp),
          fail: (err: any) => reject(err),
        });
      });

      if (res.statusCode === 200) {
        return { paid: true, data: res.data };
      }

      if (res.statusCode === 402) {
        const body = res.data;
        return {
          paid: false,
          paymentRequired: {
            tradeNo: body.trade_no || res.header['x402-trade-no'] || '',
            amount: body.amount || res.header['x402-amount'] || '0.01',
            payUrl: body.pay_url || res.header['x402-pay-url'] || '',
          },
        };
      }

      return { paid: false };
    } catch (e) {
      return { paid: false };
    }
  },

  async checkPayment(tradeNo: string): Promise<{ status: string }> {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        uni.request({
          url: `${BASE_URL}/orders/${tradeNo}/status`,
          method: 'GET',
          timeout: 10000,
          success: (resp: any) => resolve(resp),
          fail: (err: any) => reject(err),
        });
      });
      return res.data || { status: 'pending' };
    } catch (e) {
      return { status: 'pending' };
    }
  },

  getPaymentPageUrl(tradeNo: string): string {
    return `${BASE_URL}/pay/${tradeNo}`;
  },

  getDemoPayUrl(tradeNo: string): string {
    return `${BASE_URL}/pay/demo/${tradeNo}`;
  },
};

// OPC创业广场 API
export const opcApi = {
  // 获取统计数据
  stats() {
    return request('/opc/stats', { showLoading: false });
  },

  // 获取城市列表
  cities() {
    return request('/opc/cities', { showLoading: false });
  },

  // 获取城市详情
  cityDetail(id: number) {
    return request(`/opc/cities/${id}`, { showLoading: false });
  },

  // 获取政策列表
  policies(params?: { cityId?: number; type?: string }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request(`/opc/policies${query}`, { showLoading: false });
  },

  // 获取政策详情
  policyDetail(id: number) {
    return request(`/opc/policies/${id}`, { showLoading: false });
  },

  // 获取项目列表
  projects(params?: { filter?: string; cityId?: number }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request(`/opc/projects${query}`, { showLoading: false });
  },

  // 获取项目详情
  projectDetail(id: number) {
    return request(`/opc/projects/${id}`, { showLoading: false });
  },

  // 申请补贴
  applySubsidy(data: any) {
    return request('/opc/subsidies/apply', { method: 'POST', data });
  },

  // 申请入驻
  apply(data: any) {
    return request('/opc/apply', { method: 'POST', data });
  },

  // 获取申请状态
  status(userId: string) {
    return request(`/opc/status?userId=${userId}`, { showLoading: false });
  },

  // 获取OPC信息
  info(userId?: string) {
    const query = userId ? `?userId=${userId}` : '';
    return request(`/opc/info${query}`, { showLoading: false });
  },
};

// ==================== Lead (线索管理) ====================
export const leadApi = {
  /** 创建线索 */
  create(data: {
    name: string;
    phone: string;
    city?: string;
    source?: string;
    carModel?: string;
    carBrand?: string;
    budget?: string;
    remarks?: string;
  }) {
    return request<ApiResult<any>>('/lead/create', {
      method: 'POST',
      data,
    });
  },

  /** 线索列表 */
  list(params?: {
    status?: string;
    source?: string;
    priority?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.source) query.append('source', params.source);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    const queryString = query.toString();
    return request<ApiResult<{ list: any[]; total: number; page: number; pageSize: number }>>(
      `/lead/list${queryString ? '?' + queryString : ''}`,
      { showLoading: false }
    );
  },

  /** 线索详情 */
  detail(id: string) {
    return request<ApiResult<any>>(`/lead/${id}`, { showLoading: false });
  },

  /** 更新线索 */
  update(id: string, data: any) {
    return request<ApiResult<any>>(`/lead/${id}`, {
      method: 'PUT',
      data,
    });
  },

  /** 更新状态 */
  updateStatus(id: string, status: string, dealAmount?: number) {
    return request<ApiResult<any>>(`/lead/${id}/status`, {
      method: 'PUT',
      data: { status, dealAmount },
    });
  },

  /** 添加跟进记录 */
  addFollowup(id: string, data: { type?: string; result?: string; nextAction?: string }) {
    return request<ApiResult<any>>(`/lead/${id}/followup`, {
      method: 'POST',
      data,
    });
  },

  /** 线索统计 */
  stats() {
    return request<ApiResult<{
      total: number;
      new: number;
      following: number;
      testDrive: number;
      closed: number;
      lost: number;
      conversionRate: number;
    }>>('/lead/stats/summary', { showLoading: false });
  },

  /** AI线索分类 */
  classify(leadId: string) {
    return request<ApiResult<{
      leadType: string;
      carInterest: string[];
      purchaseStage: string;
      intentScore: number;
      tags: string[];
      suggestedActions: string[];
      estimatedPurchaseTime: string;
      confidence: number;
    }>>('/lead/classify', {
      method: 'POST',
      data: { leadId },
    });
  },

  /** AI质量评分 */
  score(leadId: string) {
    return request<ApiResult<{
      dimensions: {
        intentScore: number;
        budgetMatch: number;
        timingScore: number;
        sourceQuality: number;
        completeness: number;
      };
      totalScore: number;
      grade: string;
      priority: string;
      reasons: string[];
    }>>('/lead/score', {
      method: 'POST',
      data: { leadId },
    });
  },

  /** AI转化预测 */
  predict(leadId: string) {
    return request<ApiResult<{
      conversionProbability: number;
      estimatedCloseTime: string;
      estimatedDealAmount: number;
      riskFactors: string[];
      opportunityFactors: string[];
      suggestedActions: string[];
      timeline: Array<{ stage: string; deadline: string; status: string }>;
    }>>('/lead/predict', {
      method: 'POST',
      data: { leadId },
    });
  },

  /** 智能分配 */
  assign(leadId: string, salesList: any[]) {
    return request<ApiResult<{
      assignedTo: {
        salesId: string;
        salesName: string;
        matchScore: number;
        reasons: string[];
      };
      alternativeSales: Array<{ salesId: string; matchScore: number }>;
    }>>('/lead/assign', {
      method: 'POST',
      data: { leadId, salesList },
    });
  },

  /** 生成跟进话术 */
  generateScript(leadId: string, followupType: string = 'first_call') {
    return request<ApiResult<{
      script: string;
      keyPoints: string[];
      objectionHandlers: Record<string, string>;
      suggestedTiming: string;
    }>>('/lead/followup-script', {
      method: 'POST',
      data: { leadId, followupType },
    });
  },

  /** 数据洞察 */
  insights() {
    return request<ApiResult<{
      summary: {
        totalLeads: number;
        highIntent: number;
        converted: number;
        conversionRate: string;
      };
      insights: Array<{ type: string; title: string; detail: string }>;
      recommendations: string[];
    }>>('/lead/insights', { showLoading: false });
  },
};

// ==================== Compliance (合规监管) ====================
export const complianceApi = {
  dashboard() {
    return request<ApiResult<ComplianceDashboard>>('/compliance/dashboard', { showLoading: false });
  },
  threeFlows(params?: { matchStatus?: string; page?: number; pageSize?: number }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request<ApiResult<{ list: ComplianceCheck[]; total: number }>>(`/compliance/three-flows${query}`, { showLoading: false });
  },
  threeFlowDetail(checkId: string) {
    return request<ApiResult<ComplianceCheck>>(`/compliance/three-flows/${checkId}`, { showLoading: false });
  },
  verify(bizRef: string) {
    return request<ApiResult<ThreeFlowResult>>('/compliance/three-flows/verify', { method: 'POST', data: { bizRef } });
  },
  mismatches() {
    return request<ApiResult<ComplianceCheck[]>>('/compliance/mismatches', { showLoading: false });
  },
  trends() {
    return request<ApiResult<ComplianceTrend[]>>('/compliance/trends', { showLoading: false });
  },
};

// ==================== e-CNY (数字人民币) ====================
export const ecnyApi = {
  createWallet(data: { walletType: string; ownerId: string }) {
    return request<ApiResult<EcnyWallet>>('/ecny/wallet', { method: 'POST', data });
  },
  recharge(data: { walletId: string; amount: number }) {
    return request<ApiResult<EcnyRechargeResult>>('/ecny/recharge', { method: 'POST', data });
  },
  umbrellaSplit(data: { parentTradeNo: string; totalAmount: number; splits: EcnySplitItem[] }) {
    return request<ApiResult<EcnySplitResult>>('/ecny/umbrella-split', { method: 'POST', data });
  },
  flows(params?: { walletId?: string; direction?: string; bizType?: string; status?: string; page?: number; pageSize?: number }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request<ApiResult<{ list: EcnyFlow[]; total: number }>>(`/ecny/flows${query}`, { showLoading: false });
  },
  flowDetail(flowId: string) {
    return request<ApiResult<EcnyFlow>>(`/ecny/flows/${flowId}`, { showLoading: false });
  },
  walletBalance(walletId: string) {
    return request<ApiResult<{ walletId: string; balance: number }>>(`/ecny/wallet/${walletId}/balance`, { showLoading: false });
  },
  withhold(data: { amount: number; tipsAgreementId: string }) {
    return request<ApiResult<EcnyWithholdResult>>('/ecny/withhold', { method: 'POST', data });
  },
};

// ==================== Invoice (数电票) ====================
export const invoiceApi = {
  issue(data: InvoiceIssueParams) {
    return request<ApiResult<InvoiceItem>>('/invoice/issue', { method: 'POST', data });
  },
  batchIssue(items: InvoiceIssueParams[]) {
    return request<ApiResult<{ count: number; invoices: InvoiceItem[] }>>('/invoice/batch-issue', { method: 'POST', data: { items } });
  },
  list(params?: { issuerId?: string; recipientId?: string; recipientTrack?: string; status?: string; page?: number; pageSize?: number }) {
    const query = params ? '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return request<ApiResult<{ list: InvoiceItem[]; total: number }>>(`/invoice/list${query}`, { showLoading: false });
  },
  detail(invoiceId: string) {
    return request<ApiResult<InvoiceItem>>(`/invoice/${invoiceId}`, { showLoading: false });
  },
  deliver(invoiceId: string) {
    return request<ApiResult<InvoiceItem>>(`/invoice/deliver/${invoiceId}`, { method: 'POST', data: {} });
  },
  verify(invoiceId: string, ecnyFlowId?: string, bizHash?: string) {
    return request<ApiResult<InvoiceVerifyResult>>(`/invoice/verify/${invoiceId}?ecnyFlowId=${ecnyFlowId || ''}&bizHash=${bizHash || ''}`, { showLoading: false });
  },
  summary(recipientId: string, period: string) {
    return request<ApiResult<InvoiceSummary>>(`/invoice/summary/${recipientId}?period=${period}`, { showLoading: false });
  },
};

// ==================== TIPS (三方协议) ====================
export const tipsApi = {
  sign(data: { userId: string; bankAccount: string; bankName: string; taxBureauCode: string; autoDeductEnabled?: boolean }) {
    return request<ApiResult<TipsAgreement>>('/tips/sign', { method: 'POST', data });
  },
  agreement(agreementId: string) {
    return request<ApiResult<TipsAgreement>>(`/tips/agreement/${agreementId}`, { showLoading: false });
  },
  autoDeduct(data: { agreementId: string; amount: number; taxType?: string }) {
    return request<ApiResult<TipsDeductResult>>('/tips/auto-deduct', { method: 'POST', data });
  },
  suspend(agreementId: string, reason: string) {
    return request<ApiResult<TipsAgreement>>(`/tips/suspend/${agreementId}`, { method: 'POST', data: { reason } });
  },
  reactivate(agreementId: string) {
    return request<ApiResult<TipsAgreement>>(`/tips/reactivate/${agreementId}`, { method: 'POST', data: {} });
  },
  list(userId: string) {
    return request<ApiResult<TipsAgreement[]>>(`/tips/list/${userId}`, { showLoading: false });
  },
};

// ==================== KOL Track (身份轨别) ====================
export const kolTrackApi = {
  classify(userId: string) {
    return request<ApiResult<KolTrackResult>>(`/kol-track/classify/${userId}`, { method: 'POST', data: {} });
  },
  classifyManual(data: { userId: string; hasEmployment?: boolean; hasBusinessLicense?: boolean; monthlyIncomeRange?: string }) {
    return request<ApiResult<KolTrackResult>>('/kol-track/classify', { method: 'POST', data });
  },
  reclassify(data: { userId: string; newTrack: string; reason: string }) {
    return request<ApiResult<KolTrackResult>>('/kol-track/reclassify', { method: 'POST', data });
  },
  distribution() {
    return request<ApiResult<KolTrackDistribution>>('/kol-track/distribution', { showLoading: false });
  },
  config(track: string) {
    return request<ApiResult<KolTrackConfig>>(`/kol-track/config/${track}`, { showLoading: false });
  },
  tracks() {
    return request<ApiResult<Record<string, KolTrackDef>>>('/kol-track/tracks', { showLoading: false });
  },
  getCurrent(userId: string) {
    return request<ApiResult<KolTrackResult>>(`/kol-track/classify/${userId}`, { showLoading: false });
  },
};

// ==================== Contract Params (合约阈值) ====================
export const contractParamsApi = {
  list(scope?: string) {
    const query = scope ? `?scope=${scope}` : '';
    return request<ApiResult<ContractParam[]>>(`/contract-params${query}`, { showLoading: false });
  },
  get(paramKey: string, scope?: string) {
    const query = scope ? `?scope=${scope}` : '';
    return request<ApiResult<ContractParam>>(`/contract-params/${paramKey}${query}`, { showLoading: false });
  },
  update(paramKey: string, value: number, scope?: string) {
    return request<ApiResult<ContractParam>>(`/contract-params/${paramKey}`, { method: 'PUT', data: { value, scope } });
  },
  reset(paramKey?: string) {
    return request<ApiResult<ContractParam[]>>('/contract-params/reset', { method: 'POST', data: paramKey ? { paramKey } : {} });
  },
  check(userId: string, amount: number) {
    return request<ApiResult<ThresholdCheckResult>>(`/contract-params/check?userId=${userId}&amount=${amount}`, { showLoading: false });
  },
};

// ==================== Tax (税务管理) ====================
export const taxApi = {
  report(period: string) {
    return request<ApiResult<TaxReport[]>>(`/tax/report/${period}`, { showLoading: false });
  },
  generate(period: string, track?: string) {
    return request<ApiResult<TaxReport>>('/tax/report/generate', { method: 'POST', data: { period, track } });
  },
  jinshui4Query(creditCode: string, period: string) {
    return request<ApiResult<Jinshui4Result>>(`/tax/jinshui4/query?creditCode=${creditCode}&period=${period}`, { showLoading: false });
  },
  submit(reportId: string) {
    return request<ApiResult<TaxReport>>(`/tax/submit/${reportId}`, { method: 'POST', data: {} });
  },
  compliance(companyId: string) {
    return request<ApiResult<TaxComplianceResult>>(`/tax/compliance/${companyId}`, { showLoading: false });
  },
};

// ==================== Compliance Types ====================
export interface ComplianceDashboard {
  totalChecks: number;
  matchRate: number;
  mismatchRate: number;
  partialRate: number;
  matched: number;
  mismatched: number;
  partial: number;
  recentMismatches: ComplianceCheck[];
  kolTrackDistribution: KolTrackDistribution;
  contractParams: ContractParam[];
}

export interface ComplianceCheck {
  checkId: string;
  bizHash: string;
  ecnyFlowId: string;
  invoiceId: string;
  bizAmount: number;
  flowAmount: number;
  invoiceAmount: number;
  matchStatus: 'matched' | 'mismatch' | 'partial' | 'pending';
  mismatchDetail: string;
  checkTime: string;
  autoCheck: boolean;
}

export interface ThreeFlowResult {
  matchStatus: 'matched' | 'mismatch' | 'partial';
  details: {
    biz: Record<string, any>;
    flow: Record<string, any>;
    invoice: Record<string, any>;
    mismatches: string[];
  };
}

export interface ComplianceTrend {
  month: string;
  totalChecks: number;
  matched: number;
  mismatched: number;
}

export interface EcnyWallet {
  walletId: string;
  walletType: string;
  ownerId: string;
  balance: number;
  status: string;
}

export interface EcnyRechargeResult {
  flowId: string;
  walletId: string;
  newBalance: number;
}

export interface EcnySplitItem {
  partyId: string;
  partyType: string;
  amount: number;
  walletAddress: string;
}

export interface EcnySplitResult {
  batchNo: string;
  flowRecords: EcnyFlow[];
}

export interface EcnyFlow {
  flowId: string;
  walletId: string;
  walletType: string;
  amount: number;
  direction: string;
  bizRef: string;
  bizType: string;
  splitDetail: EcnySplitItem[];
  hashProof: string;
  umbrellaSplitRef: string;
  status: string;
  createdAt: string;
}

export interface EcnyWithholdResult {
  flowId: string;
  tipsRef: string;
  amount: number;
}

export interface InvoiceItem {
  invoiceId: string;
  invoiceNo: string;
  invoiceType: string;
  issuerId: string;
  recipientId: string;
  recipientTrack: string;
  amount: number;
  preTaxAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  bizRef: string;
  bizHash: string;
  ecnyFlowId: string;
  leqiRef: string;
  status: string;
  issueMode: string;
  createdAt: string;
}

export interface InvoiceIssueParams {
  issuerId: string;
  recipientId: string;
  recipientTrack: string;
  amount: number;
  taxRate?: number;
  bizRef?: string;
  bizHash?: string;
  issueMode?: string;
}

export interface InvoiceVerifyResult {
  verified: boolean;
  amountMatch: boolean;
  hashMatch: boolean;
  flowMatch: boolean;
}

export interface InvoiceSummary {
  totalAmount: number;
  totalTax: number;
  count: number;
  byTrack: Record<string, { count: number; amount: number }>;
}

export interface TipsAgreement {
  agreementId: string;
  userId: string;
  bankAccount: string;
  bankName: string;
  taxBureauCode: string;
  status: string;
  signDate: string;
  autoDeductEnabled: boolean;
}

export interface TipsDeductResult {
  deductRef: string;
  amount: number;
  taxType: string;
  status: string;
  timestamp: string;
}

export interface KolTrackResult {
  track: string;
  criteria: { hasEmployment: boolean; hasBusinessLicense: boolean; monthlyIncomeRange: string };
  taxConfig: { taxType: string; withholdingRate: number; selfInvoicing: boolean };
  autoClassified: boolean;
}

export interface KolTrackDistribution {
  A: number;
  B: number;
  C: number;
}

export interface KolTrackConfig {
  taxType: string;
  withholdingRate: number;
  selfInvoicing: boolean;
  invoiceMode: string;
  description: string;
}

export interface KolTrackDef {
  key: string;
  label: string;
  desc: string;
  taxType: string;
  taxRange: string;
}

export interface ContractParam {
  paramKey: string;
  paramValue: number;
  defaultValue: number;
  scope: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ThresholdCheckResult {
  track: string;
  thresholdResult: {
    action: string;
    triggered: string[];
    details: Record<string, any>;
  };
  withholdAmount: number;
  netAmount: number;
  needsInvoice: boolean;
  invoiceMode: string;
}

export interface TaxReport {
  reportId: string;
  period: string;
  track: string;
  totalAmount: number;
  taxableAmount: number;
  taxAmount: number;
  withholdingCount: number;
  batchInvoiceCount: number;
  status: string;
  jinshui4Ref: string;
  createdAt: string;
}

export interface Jinshui4Result {
  creditCode: string;
  period: string;
  incomeReport: { totalRevenue: number; kolPayments: number; commissionPaid: number };
  taxFiling: { filed: boolean; amount: number; status: string };
  riskScore: number;
  complianceLevel: string;
  dataSharing: { bankFlowVerified: boolean; platformDataConsistent: boolean; invoiceMatched: boolean };
}

export interface TaxComplianceResult {
  companyId: string;
  overallScore: number;
  threeFlowMatchRate: number;
  recentViolations: number;
  recommendation: string;
}

// ==================== Page Weighted Settle ====================
export const pageWeightedSettleApi = {
  reportEvent(data: { userId: string; page: string; project: string; visitCount?: number; frequency?: number; duration?: number; interaction?: number; contentDimension?: number; depthScore?: number; shareTrack?: number; sessionId?: string; referrer?: string }) {
    return request<ApiResult<{ eventId: string; userId: string; page: string; project: string; weight: number; dimensions: Record<string, number> }>>('/page-weighted-settle/event', {
      method: 'POST', data, showLoading: false,
    });
  },
  settle(data: { userId: string; project?: string; period?: string; baseRate?: number; channel?: string; kolTrack?: string }) {
    return request<ApiResult<{ userId: string; totalWeight: number; settleAmount: number; eventCount: number }>>('/page-weighted-settle/settle', {
      method: 'POST', data, showLoading: false,
    });
  },
  realtime(data: { userId: string; project?: string; page?: string; baseRate?: number; channel?: string }) {
    return request<ApiResult<{ userId: string; totalWeight: number; settleAmount: number; eventCount: number; aggregatedDimensions: Record<string, number> }>>('/page-weighted-settle/settle/realtime', {
      method: 'POST', data, showLoading: false,
    });
  },
  dimensions() {
    return request<ApiResult<Record<string, { label: string; weight: number; max: number; description: string }>>>('/page-weighted-settle/weight/dimensions', { showLoading: false });
  },
  calculate(data: Record<string, number>) {
    return request<ApiResult<{ totalWeight: number; dimensions: Record<string, number>; settleAmount: number }>>('/page-weighted-settle/weight/calculate', {
      method: 'POST', data, showLoading: false,
    });
  },
  dashboard(project?: string) {
    const query = project ? `?project=${project}` : '';
    return request<ApiResult<{ today: { events: number; uniqueUsers: number; totalWeight: number; estimatedSettlement: number }; topPages: Array<{ page: string; count: number }>; topUsers: Array<{ userId: string; weight: number }> }>>(`/page-weighted-settle/dashboard${query}`, { showLoading: false });
  },
};

// ==================== Contract Verify ====================
export const contractVerifyApi = {
  verify(data: { merchantId: string; kolUserId: string }) {
    return request<ApiResult<{ verified: boolean; contractId?: string; contractType?: string; commissionRate?: number; reason?: string; message?: string }>>('/contract-verify/verify', {
      method: 'POST', data, showLoading: false,
    });
  },
  settleWithContract(data: { merchantId: string; kolUserId: string; amount: number; subject?: string; channel?: string }) {
    return request<ApiResult<{ id: string; merchantId: string; kolUserId: string; amount: number; breakdown: { kolShare: number; merchantShare: number; platformFee: number; taxReserve: number }; weightUpdate: { oldWeight: number; newWeight: number; direction: string } | null; status: string }>>('/contract-verify/settle-with-contract', {
      method: 'POST', data,
    });
  },
  adjustWeight(data: { kolUserId: string; salesIncrement?: number; qualityDelta?: number; reason?: string }) {
    return request<ApiResult<{ kolUserId: string; oldWeight: number; newWeight: number; level: number; direction: string }>>('/contract-verify/kol/adjust-weight', {
      method: 'POST', data,
    });
  },
  checkContract(merchantId: string, kolUserId: string) {
    return request<ApiResult<{ verified: boolean; contractId?: string; reason?: string }>>(`/contract-verify/contracts/check?merchantId=${merchantId}&kolUserId=${kolUserId}`, { showLoading: false });
  },
};

// ==================== Weighted Valuation ====================
export const weightedValuationApi = {
  valuate(data: { evidenceId: string; userId?: string; metrics: { viewCount?: number; dwellTime?: number; purchaseCount?: number; shareCount?: number; commentCount?: number; bookmarkCount?: number; reportCount?: number; baseValue?: number } }) {
    return request<ApiResult<{ id: string; evidenceId: string; valuation: { totalWeight: number; estimatedValue: number; qualityGrade: string; dimensions: Record<string, number> } }>>('/weighted-valuation/valuate', {
      method: 'POST', data, showLoading: false,
    });
  },
  testPayment(data: { evidenceId: string; userId?: string; valuationAmount?: number; channel?: string }) {
    return request<ApiResult<{ id: string; evidenceId: string; amount: number; channel: string; type: string; status: string }>>('/weighted-valuation/test-payment', {
      method: 'POST', data, showLoading: false,
    });
  },
  evidence(evidenceId: string) {
    return request<ApiResult<{ evidenceId: string; latestValuation: any; historyCount: number }>>(`/weighted-valuation/evidence/${evidenceId}`, { showLoading: false });
  },
  dimensions() {
    return request<ApiResult<Record<string, { label: string; weight: number; max: number }>>>('/weighted-valuation/dimensions', { showLoading: false });
  },
  stats() {
    return request<ApiResult<{ total: number; byGrade: Record<string, number>; avgEstimatedValue: number }>>('/weighted-valuation/stats', { showLoading: false });
  },
};

// ==================== Notification ====================
export const notificationApi = {
  send(data: { userId: string; category: string; channel?: string; templateId?: string; variables?: Record<string, string>; customTitle?: string; customBody?: string; channels?: string[] }) {
    return request<ApiResult<any>>('/notification/send', {
      method: 'POST', data,
    });
  },
  earningsReminder(data: { userId: string; channels?: string[]; phone?: string; email?: string }) {
    return request<ApiResult<{ userId: string; hasEarnings: boolean; totalPending: number }>>('/notification/earnings-reminder', {
      method: 'POST', data,
    });
  },
  dailyReminder(data: { userId: string; phone?: string; email?: string }) {
    return request<ApiResult<{ userId: string; hasEarnings: boolean; totalPending: number }>>('/notification/daily-reminder', {
      method: 'POST', data,
    });
  },
  loginReminders(userId: string) {
    return request<ApiResult<{ reminders: any[]; count: number; hasEarningsReminder: boolean }>>(`/notification/login-reminders?userId=${userId}`, { showLoading: false });
  },
  list(params: { userId: string; category?: string; channel?: string; status?: string; page?: number; pageSize?: number }) {
    const query = '?' + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${v}`).join('&');
    return request<ApiResult<{ items: any[]; total: number; unreadCount: number }>>(`/notification/list${query}`, { showLoading: false });
  },
  unreadCount(userId: string) {
    return request<ApiResult<{ total: number; byCategory: Record<string, number>; hasEarningsReminder: boolean }>>(`/notification/unread-count?userId=${userId}`, { showLoading: false });
  },
  categories() {
    return request<ApiResult<{ categories: Array<{ key: string; label: string; description: string; priority: string }>; channels: Array<{ key: string; label: string; description: string }> }>>('/notification/categories', { showLoading: false });
  },
};

export default request;
