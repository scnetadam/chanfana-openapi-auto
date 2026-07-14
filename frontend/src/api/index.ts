/**
 * 龟钮印信 API 封装
 * 后端：龟钮印信汽车资讯后端 (Express :3000)
 */

const BASE_URL = import.meta.env.VITE_API_BASE || '/api';

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
    return request<ApiResult<{ token: string; user: { id: string; nickName: string; avatarUrl: string } }>>('/auth/login', {
      method: 'POST',
      data: { code, nickName, avatarUrl, platform },
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
  create(data: { fromUserId: string; toUserId: string; amount: number; type?: string; refType?: string; refId?: string; description?: string }) {
    return request<ApiResult<SettlementItem>>('/settlement/create', { method: 'POST', data });
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
          url: `${BASE_URL}/api/data`,
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

export const apiResult = ApiResult;

export default request;
