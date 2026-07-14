function safeGetString(data: Record<string, Object>, key: string, defaultVal: string = ''): string {
  const val: Object | undefined = data[key];
  if (val !== null && val !== undefined) {
    return String(val);
  }
  return defaultVal;
}

function safeGetNumber(data: Record<string, Object>, key: string, defaultVal: number = 0): number {
  const val: Object | undefined = data[key];
  if (val !== null && val !== undefined) {
    return Number(val);
  }
  return defaultVal;
}

function safeGetRecordArray(data: Record<string, Object>, key: string): Record<string, Object>[] {
  const val: Object | undefined = data[key];
  if (val !== null && val !== undefined && Array.isArray(val)) {
    const arr: Object[] = val;
    const result: Record<string, Object>[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item: Object = arr[i];
      if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
        result.push(item as Record<string, Object>);
      }
    }
    return result;
  }
  return [];
}

function safeGetRecord(data: Record<string, Object>, key: string): Record<string, Object> | null {
  const val: Object | undefined = data[key];
  if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, Object>;
  }
  return null;
}

export class ActivityItem {
  id: string = '';
  brand: string = '';
  model: string = '';
  title: string = '';
  description: string = '';
  cover: string = '';
  startDate: string = '';
  endDate: string = '';
  rewardPerBooking: number = 0;
  rewardPerView: number = 0;
  status: string = '';
  totalBudget: number = 0;
  usedBudget: number = 0;
  hasActivity: boolean = false;

  static fromJson(data: Record<string, Object>): ActivityItem {
    const item: ActivityItem = new ActivityItem();
    item.id = safeGetString(data, 'id');
    item.brand = safeGetString(data, 'brand');
    item.model = safeGetString(data, 'model');
    item.title = safeGetString(data, 'title');
    item.description = safeGetString(data, 'description');
    item.cover = safeGetString(data, 'cover');
    item.startDate = safeGetString(data, 'startDate');
    item.endDate = safeGetString(data, 'endDate');
    item.rewardPerBooking = safeGetNumber(data, 'rewardPerBooking');
    item.rewardPerView = safeGetNumber(data, 'rewardPerView');
    item.status = safeGetString(data, 'status');
    item.totalBudget = safeGetNumber(data, 'totalBudget');
    item.usedBudget = safeGetNumber(data, 'usedBudget');
    const activityObj: Record<string, Object> | null = safeGetRecord(data, 'activity');
    item.hasActivity = activityObj !== null;
    return item;
  }
}

export class ActivityItemList {
  list: ActivityItem[] = [];

  static fromJson(data: Record<string, Object>): ActivityItemList {
    const item: ActivityItemList = new ActivityItemList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(ActivityItem.fromJson(arr[i]));
    }
    return item;
  }
}

export class TrackNode {
  userId: string = '';
  role: string = '';
  nickName: string = '';
  timestamp: string = '';
}

export class ContentStats {
  views: number = 0;
  bookings: number = 0;
  shares: number = 0;
  estimatedEarnings: number = 0;

  static fromJson(data: Record<string, Object>): ContentStats {
    const s: ContentStats = new ContentStats();
    s.views = safeGetNumber(data, 'views');
    s.bookings = safeGetNumber(data, 'bookings');
    s.shares = safeGetNumber(data, 'shares');
    s.estimatedEarnings = safeGetNumber(data, 'estimatedEarnings');
    return s;
  }
}

export class ContentItem {
  id: string = '';
  userId: string = '';
  activityId: string = '';
  images: string[] = [];
  text: string = '';
  carModel: string = '';
  trackId: string = '';
  shareUrl: string = '';
  trackChain: TrackNode[] = [];
  stats: ContentStats = new ContentStats();
  createdAt: string = '';
  activity: ActivityItem = new ActivityItem();
  hasActivity: boolean = false;

  static fromJson(data: Record<string, Object>): ContentItem {
    const item: ContentItem = new ContentItem();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.activityId = safeGetString(data, 'activityId');
    item.text = safeGetString(data, 'text');
    item.carModel = safeGetString(data, 'carModel');
    item.trackId = safeGetString(data, 'trackId');
    item.shareUrl = safeGetString(data, 'shareUrl');
    item.createdAt = safeGetString(data, 'createdAt');
    const activityObj: Record<string, Object> | null = safeGetRecord(data, 'activity');
    item.hasActivity = activityObj !== null;
    if (item.hasActivity && activityObj !== null) {
      item.activity = ActivityItem.fromJson(activityObj);
    }
    const statsObj: Record<string, Object> | null = safeGetRecord(data, 'stats');
    if (statsObj !== null) {
      item.stats = ContentStats.fromJson(statsObj);
    }
    const imgArr: Record<string, Object>[] = safeGetRecordArray(data, 'images');
    const imgResult: string[] = [];
    for (let i = 0; i < imgArr.length; i++) {
      imgResult.push(String(imgArr[i]));
    }
    item.images = imgResult;
    return item;
  }
}

export class ContentItemList {
  list: ContentItem[] = [];

  static fromJson(data: Record<string, Object>): ContentItemList {
    const item: ContentItemList = new ContentItemList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(ContentItem.fromJson(arr[i]));
    }
    return item;
  }
}

export class BookingItem {
  id: string = '';
  contentId: string = '';
  userId: string = '';
  name: string = '';
  phone: string = '';
  city: string = '';
  dealerName: string = '';
  status: string = '';
  refChain: string[] = [];
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): BookingItem {
    const item: BookingItem = new BookingItem();
    item.id = safeGetString(data, 'id');
    item.contentId = safeGetString(data, 'contentId');
    item.userId = safeGetString(data, 'userId');
    item.name = safeGetString(data, 'name');
    item.phone = safeGetString(data, 'phone');
    item.city = safeGetString(data, 'city');
    item.dealerName = safeGetString(data, 'dealerName');
    item.status = safeGetString(data, 'status');
    item.createdAt = safeGetString(data, 'createdAt');
    const refArr: Record<string, Object>[] = safeGetRecordArray(data, 'refChain');
    const refResult: string[] = [];
    for (let i = 0; i < refArr.length; i++) {
      refResult.push(String(refArr[i]));
    }
    item.refChain = refResult;
    return item;
  }
}

export class BookingItemList {
  list: BookingItem[] = [];

  static fromJson(data: Record<string, Object>): BookingItemList {
    const item: BookingItemList = new BookingItemList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(BookingItem.fromJson(arr[i]));
    }
    return item;
  }
}

export class WalletData {
  userId: string = '';
  promotionBalance: number = 0;
  reputationScore: number = 0;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): WalletData {
    const item: WalletData = new WalletData();
    item.userId = safeGetString(data, 'userId');
    item.promotionBalance = safeGetNumber(data, 'promotionBalance');
    item.reputationScore = safeGetNumber(data, 'reputationScore');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class TransactionItem {
  id: string = '';
  userId: string = '';
  type: string = '';
  amount: number = 0;
  desc: string = '';
  contentId: string = '';
  balance: number = 0;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): TransactionItem {
    const item: TransactionItem = new TransactionItem();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.type = safeGetString(data, 'type');
    item.amount = safeGetNumber(data, 'amount');
    item.desc = safeGetString(data, 'desc');
    item.contentId = safeGetString(data, 'contentId');
    item.balance = safeGetNumber(data, 'balance');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class TransactionListData {
  list: TransactionItem[] = [];
  total: number = 0;
  page: number = 0;
  pageSize: number = 0;

  static fromJson(data: Record<string, Object>): TransactionListData {
    const item: TransactionListData = new TransactionListData();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(TransactionItem.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    item.page = safeGetNumber(data, 'page');
    item.pageSize = safeGetNumber(data, 'pageSize');
    return item;
  }
}

export class UserInfo {
  id: string = '';
  openId: string = '';
  nickName: string = '';
  avatarUrl: string = '';
  platform: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): UserInfo {
    const item: UserInfo = new UserInfo();
    item.id = safeGetString(data, 'id');
    item.openId = safeGetString(data, 'openId');
    item.nickName = safeGetString(data, 'nickName');
    item.avatarUrl = safeGetString(data, 'avatarUrl');
    item.platform = safeGetString(data, 'platform');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class AttributionNode {
  userId: string = '';
  role: string = '';
  nickName: string = '';
  share: number = 0;
  weight: number = 0;
  amount: number = 0;
  conversionType: string = '';
}

export class PublishResult {
  id: string = '';
  trackId: string = '';
  shareUrl: string = '';
  activity: ActivityItem = new ActivityItem();
  hasActivity: boolean = false;

  static fromJson(data: Record<string, Object>): PublishResult {
    const item: PublishResult = new PublishResult();
    item.id = safeGetString(data, 'id');
    item.trackId = safeGetString(data, 'trackId');
    item.shareUrl = safeGetString(data, 'shareUrl');
    const activityObj: Record<string, Object> | null = safeGetRecord(data, 'activity');
    item.hasActivity = activityObj !== null;
    if (item.hasActivity && activityObj !== null) {
      item.activity = ActivityItem.fromJson(activityObj);
    }
    return item;
  }
}

export class BookingResult {
  bookingId: string = '';
  earnings: number = 0;
  attribution: AttributionNode[] = [];

  static fromJson(data: Record<string, Object>): BookingResult {
    const item: BookingResult = new BookingResult();
    item.bookingId = safeGetString(data, 'bookingId');
    item.earnings = safeGetNumber(data, 'earnings');
    const attrArr: Record<string, Object>[] = safeGetRecordArray(data, 'attribution');
    const attrResult: AttributionNode[] = [];
    for (let i = 0; i < attrArr.length; i++) {
      const attrRecord: Record<string, Object> = attrArr[i];
      const node: AttributionNode = new AttributionNode();
      node.userId = safeGetString(attrRecord, 'userId');
      node.role = safeGetString(attrRecord, 'role');
      node.nickName = safeGetString(attrRecord, 'nickName');
      node.share = safeGetNumber(attrRecord, 'share');
      node.weight = safeGetNumber(attrRecord, 'weight');
      node.amount = safeGetNumber(attrRecord, 'amount');
      node.conversionType = safeGetString(attrRecord, 'conversionType');
      attrResult.push(node);
    }
    item.attribution = attrResult;
    return item;
  }
}

export class KolTaskItem {
  id: string = '';
  bizUserId: string = '';
  activityId: string = '';
  type: string = '';
  typeName: string = '';
  title: string = '';
  description: string = '';
  rewardPerUnit: number = 0;
  targetCount: number = 0;
  completedCount: number = 0;
  totalRewardPool: number = 0;
  usedReward: number = 0;
  status: string = '';
  deadline: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): KolTaskItem {
    const item: KolTaskItem = new KolTaskItem();
    item.id = safeGetString(data, 'id');
    item.bizUserId = safeGetString(data, 'bizUserId');
    item.activityId = safeGetString(data, 'activityId');
    item.type = safeGetString(data, 'type');
    item.typeName = safeGetString(data, 'typeName');
    item.title = safeGetString(data, 'title');
    item.description = safeGetString(data, 'description');
    item.rewardPerUnit = safeGetNumber(data, 'rewardPerUnit');
    item.targetCount = safeGetNumber(data, 'targetCount');
    item.completedCount = safeGetNumber(data, 'completedCount');
    item.totalRewardPool = safeGetNumber(data, 'totalRewardPool');
    item.usedReward = safeGetNumber(data, 'usedReward');
    item.status = safeGetString(data, 'status');
    item.deadline = safeGetString(data, 'deadline');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class KolTaskList {
  list: KolTaskItem[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): KolTaskList {
    const item: KolTaskList = new KolTaskList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(KolTaskItem.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class KolSubmissionResult {
  submissionId: string = '';
  reward: number = 0;
  aiScore: AiScoreData | null = null;

  static fromJson(data: Record<string, Object>): KolSubmissionResult {
    const item: KolSubmissionResult = new KolSubmissionResult();
    const subObj: Record<string, Object> | null = safeGetRecord(data, 'submission');
    if (subObj !== null) {
      item.submissionId = safeGetString(subObj, 'id');
    }
    item.reward = safeGetNumber(data, 'reward');
    const scoreObj: Record<string, Object> | null = safeGetRecord(data, 'aiScore');
    if (scoreObj !== null) {
      item.aiScore = AiScoreData.fromJson(scoreObj);
    }
    return item;
  }
}

export class AiScoreData {
  quality: number = 0;
  spread: number = 0;
  kol: number = 0;
  conversion: number = 0;
  multiplier: number = 0;

  static fromJson(data: Record<string, Object>): AiScoreData {
    const item: AiScoreData = new AiScoreData();
    item.quality = safeGetNumber(data, 'quality');
    item.spread = safeGetNumber(data, 'spread');
    item.kol = safeGetNumber(data, 'kol');
    item.conversion = safeGetNumber(data, 'conversion');
    item.multiplier = safeGetNumber(data, 'multiplier');
    return item;
  }
}

export class KolEarningsData {
  totalEarnings: number = 0;
  completedTasks: number = 0;
  totalSubmissions: number = 0;
  pendingCount: number = 0;

  static fromJson(data: Record<string, Object>): KolEarningsData {
    const item: KolEarningsData = new KolEarningsData();
    item.totalEarnings = safeGetNumber(data, 'totalEarnings');
    item.completedTasks = safeGetNumber(data, 'completedTasks');
    item.totalSubmissions = safeGetNumber(data, 'totalSubmissions');
    item.pendingCount = safeGetNumber(data, 'pendingCount');
    return item;
  }
}

export class BizCertStatus {
  status: string = '';
  message: string = '';

  static fromJson(data: Record<string, Object>): BizCertStatus {
    const item: BizCertStatus = new BizCertStatus();
    item.status = safeGetString(data, 'status');
    item.message = safeGetString(data, 'message');
    return item;
  }
}

export class SettlementItem {
  id: string = '';
  fromUserId: string = '';
  toUserId: string = '';
  amount: number = 0;
  fee: number = 0;
  netAmount: number = 0;
  type: string = '';
  description: string = '';
  status: string = '';
  hashProof: string = '';
  aiVerified: boolean = false;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): SettlementItem {
    const item: SettlementItem = new SettlementItem();
    item.id = safeGetString(data, 'id');
    item.fromUserId = safeGetString(data, 'fromUserId');
    item.toUserId = safeGetString(data, 'toUserId');
    item.amount = safeGetNumber(data, 'amount');
    item.fee = safeGetNumber(data, 'fee');
    item.netAmount = safeGetNumber(data, 'netAmount');
    item.type = safeGetString(data, 'type');
    item.description = safeGetString(data, 'description');
    item.status = safeGetString(data, 'status');
    item.hashProof = safeGetString(data, 'hashProof');
    const aiVal: number = safeGetNumber(data, 'aiVerified');
    item.aiVerified = aiVal === 1;
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class SettlementList {
  list: SettlementItem[] = [];
  total: number = 0;
  page: number = 0;
  pageSize: number = 0;

  static fromJson(data: Record<string, Object>): SettlementList {
    const item: SettlementList = new SettlementList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(SettlementItem.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    item.page = safeGetNumber(data, 'page');
    item.pageSize = safeGetNumber(data, 'pageSize');
    return item;
  }
}

export class SettlementStats {
  totalIncome: number = 0;
  totalExpense: number = 0;
  totalFee: number = 0;
  completedCount: number = 0;
  pendingCount: number = 0;
  pendingAmount: number = 0;

  static fromJson(data: Record<string, Object>): SettlementStats {
    const item: SettlementStats = new SettlementStats();
    item.totalIncome = safeGetNumber(data, 'totalIncome');
    item.totalExpense = safeGetNumber(data, 'totalExpense');
    item.totalFee = safeGetNumber(data, 'totalFee');
    item.completedCount = safeGetNumber(data, 'completedCount');
    item.pendingCount = safeGetNumber(data, 'pendingCount');
    item.pendingAmount = safeGetNumber(data, 'pendingAmount');
    return item;
  }
}

export class AiInsightItem {
  type: string = '';
  title: string = '';
  detail: string = '';

  static fromJson(data: Record<string, Object>): AiInsightItem {
    const item: AiInsightItem = new AiInsightItem();
    item.type = safeGetString(data, 'type');
    item.title = safeGetString(data, 'title');
    item.detail = safeGetString(data, 'detail');
    return item;
  }
}

export class AiInsightList {
  insights: AiInsightItem[] = [];
  summary: string = '';

  static fromJson(data: Record<string, Object>): AiInsightList {
    const item: AiInsightList = new AiInsightList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'insights');
    for (let i = 0; i < arr.length; i++) {
      item.insights.push(AiInsightItem.fromJson(arr[i]));
    }
    item.summary = safeGetString(data, 'summary');
    return item;
  }
}

export class AiValueDashboard {
  totalEarned: number = 0;
  avgWeightMultiplier: number = 0;
  contentCount: number = 0;
  kolScore: number = 0;
  kolValue: number = 0;
  conversionWeight: number = 0;
  spreadWeight: number = 0;
  qualityWeight: number = 0;
  realTimeSettlements: number = 0;
  pendingSettlementAmount: number = 0;

  static fromJson(data: Record<string, Object>): AiValueDashboard {
    const item: AiValueDashboard = new AiValueDashboard();
    item.totalEarned = safeGetNumber(data, 'totalEarned');
    item.avgWeightMultiplier = safeGetNumber(data, 'avgWeightMultiplier');
    item.contentCount = safeGetNumber(data, 'contentCount');
    item.kolScore = safeGetNumber(data, 'kolScore');
    item.kolValue = safeGetNumber(data, 'kolValue');
    item.conversionWeight = safeGetNumber(data, 'conversionWeight');
    item.spreadWeight = safeGetNumber(data, 'spreadWeight');
    item.qualityWeight = safeGetNumber(data, 'qualityWeight');
    item.realTimeSettlements = safeGetNumber(data, 'realTimeSettlements');
    item.pendingSettlementAmount = safeGetNumber(data, 'pendingSettlementAmount');
    return item;
  }
}

export class KolAuditProfile {
  userId: string = '';
  nickName: string = '';
  kolStatus: string = '';
  channel: string = '';
  followers: number = 0;
  opcEligible: boolean = false;
  lastAudit: KolAuditRecord | null = null;
  followerCount: number = 0;
  platform: string = '';
  platformUrl: string = '';
  kolScore: number = 0;
  status: string = '';
  reason: string = '';
  isApproved: boolean = false;
  isBizInvited: boolean = false;
  isBizAuthorized: boolean = false;
  hasOtherPlatform: boolean = false;
  otherPlatformFollowers: number = 0;
  canApplyOpc: boolean = false;

  static fromJson(data: Record<string, Object>): KolAuditProfile {
    const item: KolAuditProfile = new KolAuditProfile();
    item.userId = safeGetString(data, 'userId');
    item.nickName = safeGetString(data, 'nickName');
    item.kolStatus = safeGetString(data, 'kolStatus');
    item.channel = safeGetString(data, 'channel');
    item.followers = safeGetNumber(data, 'followers');
    const opcVal: number = safeGetNumber(data, 'opcEligible');
    item.opcEligible = opcVal === 1 || opcVal > 0;
    item.followerCount = safeGetNumber(data, 'followerCount');
    if (item.followerCount === 0 && item.followers > 0) {
      item.followerCount = item.followers;
    }
    item.platform = safeGetString(data, 'platform');
    item.platformUrl = safeGetString(data, 'platformUrl');
    item.kolScore = safeGetNumber(data, 'kolScore');
    item.status = safeGetString(data, 'status');
    if (item.status.length === 0 && item.kolStatus.length > 0) {
      item.status = item.kolStatus;
    }
    item.reason = safeGetString(data, 'reason');
    const approvedVal: number = safeGetNumber(data, 'isApproved');
    item.isApproved = approvedVal === 1 || item.kolStatus === 'approved';
    const invitedVal: number = safeGetNumber(data, 'isBizInvited');
    item.isBizInvited = invitedVal === 1;
    const authVal: number = safeGetNumber(data, 'isBizAuthorized');
    item.isBizAuthorized = authVal === 1;
    const hasOtherVal: number = safeGetNumber(data, 'hasOtherPlatform');
    item.hasOtherPlatform = hasOtherVal === 1;
    item.otherPlatformFollowers = safeGetNumber(data, 'otherPlatformFollowers');
    const canOpcVal: number = safeGetNumber(data, 'canApplyOpc');
    item.canApplyOpc = canOpcVal === 1 || item.opcEligible;
    const lastAuditObj: Record<string, Object> | null = safeGetRecord(data, 'lastAudit');
    if (lastAuditObj !== null) {
      item.lastAudit = KolAuditRecord.fromJson(lastAuditObj);
    }
    return item;
  }
}

export class KolAuditRecord {
  id: string = '';
  userId: string = '';
  nickName: string = '';
  channel: string = '';
  followers: number = 0;
  status: string = '';
  reason: string = '';
  opcEligible: boolean = false;
  aiScore: number = 0;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): KolAuditRecord {
    const item: KolAuditRecord = new KolAuditRecord();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.nickName = safeGetString(data, 'nickName');
    item.channel = safeGetString(data, 'channel');
    item.followers = safeGetNumber(data, 'followers');
    item.status = safeGetString(data, 'status');
    item.reason = safeGetString(data, 'reason');
    const opcVal: number = safeGetNumber(data, 'opcEligible');
    item.opcEligible = opcVal === 1 || opcVal > 0;
    item.aiScore = safeGetNumber(data, 'aiScore');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class KolAuditSubmitResult {
  success: boolean = false;
  status: string = '';
  message: string = '';

  static fromJson(data: Record<string, Object>): KolAuditSubmitResult {
    const item: KolAuditSubmitResult = new KolAuditSubmitResult();
    const successVal: number = safeGetNumber(data, 'success');
    item.success = successVal === 1;
    item.status = safeGetString(data, 'status');
    item.message = safeGetString(data, 'message');
    return item;
  }
}

export class OpcSupportInfo {
  userId: string = '';
  eligible: boolean = false;
  reason: string = '';
  benefits: OpcBenefit[] = [];
  freeAiQuota: number = 0;
  usedAiQuota: number = 0;
  discountRate: number = 0;
  status: string = '';

  static fromJson(data: Record<string, Object>): OpcSupportInfo {
    const item: OpcSupportInfo = new OpcSupportInfo();
    item.userId = safeGetString(data, 'userId');
    const eligibleVal: number = safeGetNumber(data, 'eligible');
    item.eligible = eligibleVal === 1;
    item.reason = safeGetString(data, 'reason');
    item.freeAiQuota = safeGetNumber(data, 'freeAiQuota');
    item.usedAiQuota = safeGetNumber(data, 'usedAiQuota');
    item.discountRate = safeGetNumber(data, 'discountRate');
    item.status = safeGetString(data, 'status');
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'benefits');
    const result: OpcBenefit[] = [];
    for (let i = 0; i < arr.length; i++) {
      result.push(OpcBenefit.fromJson(arr[i]));
    }
    item.benefits = result;
    return item;
  }
}

export class OpcBenefit {
  name: string = '';
  description: string = '';
  type: string = '';

  static fromJson(data: Record<string, Object>): OpcBenefit {
    const item: OpcBenefit = new OpcBenefit();
    item.name = safeGetString(data, 'name');
    item.description = safeGetString(data, 'description');
    item.type = safeGetString(data, 'type');
    return item;
  }
}

export class AiToolItem {
  id: string = '';
  name: string = '';
  description: string = '';
  category: string = '';
  originalPrice: number = 0;
  discountPrice: number = 0;
  discountRate: number = 0;
  isFreeForOpc: boolean = false;
  icon: string = '';
  provider: string = '';

  static fromJson(data: Record<string, Object>): AiToolItem {
    const item: AiToolItem = new AiToolItem();
    item.id = safeGetString(data, 'id');
    item.name = safeGetString(data, 'name');
    item.description = safeGetString(data, 'description');
    item.category = safeGetString(data, 'category');
    item.originalPrice = safeGetNumber(data, 'originalPrice');
    item.discountPrice = safeGetNumber(data, 'discountPrice');
    item.discountRate = safeGetNumber(data, 'discountRate');
    const freeVal: number = safeGetNumber(data, 'isFreeForOpc');
    item.isFreeForOpc = freeVal === 1;
    item.icon = safeGetString(data, 'icon');
    item.provider = safeGetString(data, 'provider');
    return item;
  }
}

export class AiToolList {
  list: AiToolItem[] = [];

  static fromJson(data: Record<string, Object>): AiToolList {
    const item: AiToolList = new AiToolList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(AiToolItem.fromJson(arr[i]));
    }
    return item;
  }
}

export class BizCommissionItem {
  id: string = '';
  bizUserId: string = '';
  kolUserId: string = '';
  taskId: string = '';
  taskTitle: string = '';
  commissionRate: number = 0;
  commissionAmount: number = 0;
  status: string = '';
  settlementTime: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): BizCommissionItem {
    const item: BizCommissionItem = new BizCommissionItem();
    item.id = safeGetString(data, 'id');
    item.bizUserId = safeGetString(data, 'bizUserId');
    item.kolUserId = safeGetString(data, 'kolUserId');
    item.taskId = safeGetString(data, 'taskId');
    item.taskTitle = safeGetString(data, 'taskTitle');
    item.commissionRate = safeGetNumber(data, 'commissionRate');
    item.commissionAmount = safeGetNumber(data, 'commissionAmount');
    item.status = safeGetString(data, 'status');
    item.settlementTime = safeGetString(data, 'settlementTime');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class BizCommissionList {
  list: BizCommissionItem[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): BizCommissionList {
    const item: BizCommissionList = new BizCommissionList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(BizCommissionItem.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class CommissionStats {
  totalIncome: number = 0;
  totalFee: number = 0;
  count: number = 0;
  walletBalance: number = 0;
  reputationScore: number = 0;

  static fromJson(data: Record<string, Object>): CommissionStats {
    const item: CommissionStats = new CommissionStats();
    item.totalIncome = safeGetNumber(data, 'totalIncome');
    item.totalFee = safeGetNumber(data, 'totalFee');
    item.count = safeGetNumber(data, 'count');
    item.walletBalance = safeGetNumber(data, 'walletBalance');
    item.reputationScore = safeGetNumber(data, 'reputationScore');
    return item;
  }
}

export class HashRecord {
  id: string = '';
  txId: string = '';
  hash: string = '';
  dataDigest: string = '';
  dataType: string = '';
  metadata: Record<string, Object> = {};
  source: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): HashRecord {
    const item: HashRecord = new HashRecord();
    item.id = safeGetString(data, 'id');
    item.txId = safeGetString(data, 'txId');
    item.hash = safeGetString(data, 'hash');
    item.dataDigest = safeGetString(data, 'dataDigest');
    item.dataType = safeGetString(data, 'dataType');
    item.source = safeGetString(data, 'source');
    item.createdAt = safeGetString(data, 'createdAt');
    const metaObj: Record<string, Object> | null = safeGetRecord(data, 'metadata');
    if (metaObj !== null) {
      item.metadata = metaObj;
    }
    return item;
  }
}

export class HashRecordList {
  list: HashRecord[] = [];
  total: number = 0;
  page: number = 0;
  pageSize: number = 0;

  static fromJson(data: Record<string, Object>): HashRecordList {
    const item: HashRecordList = new HashRecordList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(HashRecord.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    item.page = safeGetNumber(data, 'page');
    item.pageSize = safeGetNumber(data, 'pageSize');
    return item;
  }
}

export class HashStats {
  total: number = 0;
  byType: Record<string, Object> = {};

  static fromJson(data: Record<string, Object>): HashStats {
    const item: HashStats = new HashStats();
    item.total = safeGetNumber(data, 'total');
    const byTypeObj: Record<string, Object> | null = safeGetRecord(data, 'byType');
    if (byTypeObj !== null) {
      item.byType = byTypeObj;
    }
    return item;
  }
}

export class RealTimeSettlementResult {
  settlementId: string = '';
  amount: number = 0;
  fee: number = 0;
  netAmount: number = 0;
  hashProof: string = '';
  aiVerified: boolean = false;
  status: string = '';
  settledAt: string = '';

  static fromJson(data: Record<string, Object>): RealTimeSettlementResult {
    const item: RealTimeSettlementResult = new RealTimeSettlementResult();
    item.settlementId = safeGetString(data, 'settlementId');
    item.amount = safeGetNumber(data, 'amount');
    item.fee = safeGetNumber(data, 'fee');
    item.netAmount = safeGetNumber(data, 'netAmount');
    item.hashProof = safeGetString(data, 'hashProof');
    const aiVal: number = safeGetNumber(data, 'aiVerified');
    item.aiVerified = aiVal === 1;
    item.status = safeGetString(data, 'status');
    item.settledAt = safeGetString(data, 'settledAt');
    return item;
  }
}

export class NotificationItem {
  id: string = '';
  userId: string = '';
  type: string = '';
  title: string = '';
  content: string = '';
  read: boolean = false;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): NotificationItem {
    const item: NotificationItem = new NotificationItem();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.type = safeGetString(data, 'type');
    item.title = safeGetString(data, 'title');
    item.content = safeGetString(data, 'content');
    const readVal: number = safeGetNumber(data, 'read');
    item.read = readVal === 1 || data['read'] === true;
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class NotificationList {
  list: NotificationItem[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): NotificationList {
    const item: NotificationList = new NotificationList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(NotificationItem.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class CfsStorage {
  id: string = '';
  userId: string = '';
  region: string = '';
  bucketName: string = '';
  freeSpace: string = '10GB';
  usedSpace: string = '0GB';
  status: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): CfsStorage {
    const item: CfsStorage = new CfsStorage();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.region = safeGetString(data, 'region');
    item.bucketName = safeGetString(data, 'bucketName');
    item.freeSpace = safeGetString(data, 'freeSpace');
    item.usedSpace = safeGetString(data, 'usedSpace');
    item.status = safeGetString(data, 'status');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class MaasModel {
  id: string = '';
  name: string = '';
  provider: string = '';
  type: string = '';
  description: string = '';
  pricing: Record<string, Object> = {};
  features: string[] = [];
  status: string = '';
  isFreeForOpc: boolean = false;
  subscribed: boolean = false;

  static fromJson(data: Record<string, Object>): MaasModel {
    const item: MaasModel = new MaasModel();
    item.id = safeGetString(data, 'id');
    item.name = safeGetString(data, 'name');
    item.provider = safeGetString(data, 'provider');
    item.type = safeGetString(data, 'type');
    item.description = safeGetString(data, 'description');
    const pricingVal: Record<string, Object> | null = safeGetRecord(data, 'pricing');
    if (pricingVal !== null) {
      item.pricing = pricingVal;
    }
    const featuresArr: Record<string, Object>[] = safeGetRecordArray(data, 'features');
    for (let i = 0; i < featuresArr.length; i++) {
      item.features.push(String(featuresArr[i]));
    }
    item.status = safeGetString(data, 'status');
    item.isFreeForOpc = data['isFreeForOpc'] === true;
    item.subscribed = data['subscribed'] === true;
    return item;
  }
}

export class VideoItem {
  id: string = '';
  userId: string = '';
  title: string = '';
  description: string = '';
  duration: number = 0;
  fileSize: string = '';
  thumbnail: string = '';
  status: string = '';
  playUrl: string = '';
  createdAt: string = '';
  stats: Record<string, Object> = {};

  static fromJson(data: Record<string, Object>): VideoItem {
    const item: VideoItem = new VideoItem();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.title = safeGetString(data, 'title');
    item.description = safeGetString(data, 'description');
    item.duration = safeGetNumber(data, 'duration');
    item.fileSize = safeGetString(data, 'fileSize');
    item.thumbnail = safeGetString(data, 'thumbnail');
    item.status = safeGetString(data, 'status');
    item.playUrl = safeGetString(data, 'playUrl');
    item.createdAt = safeGetString(data, 'createdAt');
    const statsVal: Record<string, Object> | null = safeGetRecord(data, 'stats');
    if (statsVal !== null) {
      item.stats = statsVal;
    }
    return item;
  }
}

export class AiVideoProject {
  id: string = '';
  userId: string = '';
  title: string = '';
  templateId: string = '';
  templateName: string = '';
  status: string = '';
  progress: number = 0;
  result: Record<string, Object> | null = null;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): AiVideoProject {
    const item: AiVideoProject = new AiVideoProject();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.title = safeGetString(data, 'title');
    item.templateId = safeGetString(data, 'templateId');
    item.templateName = safeGetString(data, 'templateName');
    item.status = safeGetString(data, 'status');
    item.progress = safeGetNumber(data, 'progress');
    const resultVal: Record<string, Object> | null = safeGetRecord(data, 'result');
    item.result = resultVal;
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class StereoModel {
  id: string = '';
  name: string = '';
  brand: string = '';
  category: string = '';
  format: string = '';
  features: string[] = [];
  fileSize: string = '';
  status: string = '';
  modelUrl: string = '';

  static fromJson(data: Record<string, Object>): StereoModel {
    const item: StereoModel = new StereoModel();
    item.id = safeGetString(data, 'id');
    item.name = safeGetString(data, 'name');
    item.brand = safeGetString(data, 'brand');
    item.category = safeGetString(data, 'category');
    item.format = safeGetString(data, 'format');
    const featuresArr: Record<string, Object>[] = safeGetRecordArray(data, 'features');
    for (let i = 0; i < featuresArr.length; i++) {
      item.features.push(String(featuresArr[i]));
    }
    item.fileSize = safeGetString(data, 'fileSize');
    item.status = safeGetString(data, 'status');
    item.modelUrl = safeGetString(data, 'modelUrl');
    return item;
  }
}
