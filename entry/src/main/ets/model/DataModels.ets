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

function safeGetBool(data: Record<string, Object>, key: string, defaultVal: boolean = false): boolean {
  const val: Object | undefined = data[key];
  if (val !== null && val !== undefined) {
    return val === true || val === 1 || String(val) === 'true';
  }
  return defaultVal;
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
  chainTxId: string = '';
  chainTimestamp: string = '';
  chainBlock: string = '';
  chainExplorer: string = '';
  chainSource: string = '';
  notaryId: string = '';
  notaryUrl: string = '';
  notaryTimestamp: string = '';
  notarySource: string = '';
  notaryPrice: number = 0;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): HashRecord {
    const item: HashRecord = new HashRecord();
    item.id = safeGetString(data, 'id');
    item.txId = safeGetString(data, 'txId');
    item.hash = safeGetString(data, 'hash');
    item.dataDigest = safeGetString(data, 'dataDigest');
    item.dataType = safeGetString(data, 'dataType');
    item.source = safeGetString(data, 'source');
    item.chainTxId = safeGetString(data, 'chainTxId');
    item.chainTimestamp = safeGetString(data, 'chainTimestamp');
    item.chainBlock = safeGetString(data, 'chainBlock');
    item.chainExplorer = safeGetString(data, 'chainExplorer');
    item.chainSource = safeGetString(data, 'chainSource');
    item.notaryId = safeGetString(data, 'notaryId');
    item.notaryUrl = safeGetString(data, 'notaryUrl');
    item.notaryTimestamp = safeGetString(data, 'notaryTimestamp');
    item.notarySource = safeGetString(data, 'notarySource');
    item.notaryPrice = safeGetNumber(data, 'notaryPrice');
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
  chainCount: number = 0;
  notaryCount: number = 0;

  static fromJson(data: Record<string, Object>): HashStats {
    const item: HashStats = new HashStats();
    item.total = safeGetNumber(data, 'total');
    item.chainCount = safeGetNumber(data, 'chainCount');
    item.notaryCount = safeGetNumber(data, 'notaryCount');
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

export class CosStorage {
  id: string = '';
  userId: string = '';
  mode: string = 'platform';
  region: string = '';
  bucketName: string = '';
  cloudPath: string = '';
  roleArn: string = '';
  freeSpace: string = '50GB';
  usedSpace: string = '0B';
  fileCount: number = 0;
  status: string = '';
  provider: string = 'tencent-cos';
  storageClass: string = 'STANDARD';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): CosStorage {
    const item: CosStorage = new CosStorage();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.mode = safeGetString(data, 'mode');
    item.region = safeGetString(data, 'region');
    item.bucketName = safeGetString(data, 'bucketName');
    item.cloudPath = safeGetString(data, 'cloudPath');
    item.roleArn = safeGetString(data, 'roleArn');
    item.freeSpace = safeGetString(data, 'freeSpace');
    item.usedSpace = safeGetString(data, 'usedSpace');
    item.fileCount = safeGetNumber(data, 'fileCount');
    item.status = safeGetString(data, 'status');
    item.provider = safeGetString(data, 'provider');
    item.storageClass = safeGetString(data, 'storageClass');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class CamRoleGuide {
  id: string = '';
  userId: string = '';
  roleArn: string = '';
  roleName: string = '';
  status: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): CamRoleGuide {
    const item: CamRoleGuide = new CamRoleGuide();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.roleArn = safeGetString(data, 'roleArn');
    item.roleName = safeGetString(data, 'roleName');
    item.status = safeGetString(data, 'status');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class CamGuideStep {
  step: number = 0;
  title: string = '';
  description: string = '';
  action: string = '';

  static fromJson(data: Record<string, Object>): CamGuideStep {
    const item: CamGuideStep = new CamGuideStep();
    item.step = safeGetNumber(data, 'step');
    item.title = safeGetString(data, 'title');
    item.description = safeGetString(data, 'description');
    item.action = safeGetString(data, 'action');
    return item;
  }
}

export class ContentAuditRecord {
  id: string = '';
  contentId: string = '';
  userId: string = '';
  status: string = '';
  score: number = 0;
  violations: Record<string, Object>[] = [];
  reason: string = '';
  needsTencentModeration: boolean = false;
  tencentModerated: boolean = false;
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): ContentAuditRecord {
    const item: ContentAuditRecord = new ContentAuditRecord();
    item.id = safeGetString(data, 'id');
    item.contentId = safeGetString(data, 'contentId');
    item.userId = safeGetString(data, 'userId');
    item.status = safeGetString(data, 'status');
    item.score = safeGetNumber(data, 'score');
    item.reason = safeGetString(data, 'reason');
    item.needsTencentModeration = safeGetBool(data, 'needsTencentModeration');
    item.tencentModerated = safeGetBool(data, 'tencentModerated');
    item.createdAt = safeGetString(data, 'createdAt');
    const violationsArr: Record<string, Object>[] = safeGetRecordArray(data, 'violations');
    item.violations = violationsArr;
    return item;
  }
}

export class ContentAuditStats {
  total: number = 0;
  pass: number = 0;
  pending: number = 0;
  reject: number = 0;
  tencentModerated: number = 0;

  static fromJson(data: Record<string, Object>): ContentAuditStats {
    const item: ContentAuditStats = new ContentAuditStats();
    item.total = safeGetNumber(data, 'total');
    item.pass = safeGetNumber(data, 'pass');
    item.pending = safeGetNumber(data, 'pending');
    item.reject = safeGetNumber(data, 'reject');
    item.tencentModerated = safeGetNumber(data, 'tencentModerated');
    return item;
  }
}

export class OpcCitySubsidy {
  id: string = '';
  city: string = '';
  province: string = '';
  cityLevel: string = '';
  promoSubsidyRate: number = 0;
  promoSubsidyCap: number = 0;
  aiInvestSubsidyRate: number = 0;
  aiInvestSubsidyCap: number = 0;
  tokenBonusRate: number = 0;
  tokenBonusCap: number = 0;
  opcCount: number = 0;
  activePolicies: number = 0;
  totalSubsidyIssued: number = 0;
  status: string = '';
  startDate: string = '';
  endDate: string = '';
  description: string = '';
  highlights: string[] = [];

  static fromJson(data: Record<string, Object>): OpcCitySubsidy {
    const item: OpcCitySubsidy = new OpcCitySubsidy();
    item.id = safeGetString(data, 'id');
    item.city = safeGetString(data, 'city');
    item.province = safeGetString(data, 'province');
    item.cityLevel = safeGetString(data, 'cityLevel');
    item.promoSubsidyRate = safeGetNumber(data, 'promoSubsidyRate');
    item.promoSubsidyCap = safeGetNumber(data, 'promoSubsidyCap');
    item.aiInvestSubsidyRate = safeGetNumber(data, 'aiInvestSubsidyRate');
    item.aiInvestSubsidyCap = safeGetNumber(data, 'aiInvestSubsidyCap');
    item.tokenBonusRate = safeGetNumber(data, 'tokenBonusRate');
    item.tokenBonusCap = safeGetNumber(data, 'tokenBonusCap');
    item.opcCount = safeGetNumber(data, 'opcCount');
    item.activePolicies = safeGetNumber(data, 'activePolicies');
    item.totalSubsidyIssued = safeGetNumber(data, 'totalSubsidyIssued');
    item.status = safeGetString(data, 'status');
    item.startDate = safeGetString(data, 'startDate');
    item.endDate = safeGetString(data, 'endDate');
    item.description = safeGetString(data, 'description');
    const hlArr: Record<string, Object>[] = safeGetRecordArray(data, 'highlights');
    const hlResult: string[] = [];
    for (let i = 0; i < hlArr.length; i++) {
      hlResult.push(String(hlArr[i]));
    }
    item.highlights = hlResult;
    return item;
  }
}

export class OpcCitySubsidyList {
  list: OpcCitySubsidy[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): OpcCitySubsidyList {
    const item: OpcCitySubsidyList = new OpcCitySubsidyList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(OpcCitySubsidy.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class OpcSubsidyRecord {
  id: string = '';
  userId: string = '';
  subsidyType: string = '';
  city: string = '';
  amount: number = 0;
  tokenAmount: number = 0;
  bizSource: string = '';
  status: string = '';
  auditNote: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): OpcSubsidyRecord {
    const item: OpcSubsidyRecord = new OpcSubsidyRecord();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.subsidyType = safeGetString(data, 'subsidyType');
    item.city = safeGetString(data, 'city');
    item.amount = safeGetNumber(data, 'amount');
    item.tokenAmount = safeGetNumber(data, 'tokenAmount');
    item.bizSource = safeGetString(data, 'bizSource');
    item.status = safeGetString(data, 'status');
    item.auditNote = safeGetString(data, 'auditNote');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class OpcSubsidyRecordList {
  list: OpcSubsidyRecord[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): OpcSubsidyRecordList {
    const item: OpcSubsidyRecordList = new OpcSubsidyRecordList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(OpcSubsidyRecord.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class OpcTokenAccount {
  userId: string = '';
  totalTokens: number = 0;
  availableTokens: number = 0;
  lockedTokens: number = 0;
  earnedTokens: number = 0;
  spentTokens: number = 0;
  subsidyTokens: number = 0;
  exchangeRate: number = 0;
  lastUpdated: string = '';

  static fromJson(data: Record<string, Object>): OpcTokenAccount {
    const item: OpcTokenAccount = new OpcTokenAccount();
    item.userId = safeGetString(data, 'userId');
    item.totalTokens = safeGetNumber(data, 'totalTokens');
    item.availableTokens = safeGetNumber(data, 'availableTokens');
    item.lockedTokens = safeGetNumber(data, 'lockedTokens');
    item.earnedTokens = safeGetNumber(data, 'earnedTokens');
    item.spentTokens = safeGetNumber(data, 'spentTokens');
    item.subsidyTokens = safeGetNumber(data, 'subsidyTokens');
    item.exchangeRate = safeGetNumber(data, 'exchangeRate');
    item.lastUpdated = safeGetString(data, 'lastUpdated');
    return item;
  }
}

export class OpcAiInvestProject {
  id: string = '';
  userId: string = '';
  projectName: string = '';
  aiModelType: string = '';
  investAmount: number = 0;
  subsidyRate: number = 0;
  subsidyAmount: number = 0;
  actualReturn: number = 0;
  status: string = '';
  city: string = '';
  startDate: string = '';
  endDate: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): OpcAiInvestProject {
    const item: OpcAiInvestProject = new OpcAiInvestProject();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.projectName = safeGetString(data, 'projectName');
    item.aiModelType = safeGetString(data, 'aiModelType');
    item.investAmount = safeGetNumber(data, 'investAmount');
    item.subsidyRate = safeGetNumber(data, 'subsidyRate');
    item.subsidyAmount = safeGetNumber(data, 'subsidyAmount');
    item.actualReturn = safeGetNumber(data, 'actualReturn');
    item.status = safeGetString(data, 'status');
    item.city = safeGetString(data, 'city');
    item.startDate = safeGetString(data, 'startDate');
    item.endDate = safeGetString(data, 'endDate');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class OpcAiInvestList {
  list: OpcAiInvestProject[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): OpcAiInvestList {
    const item: OpcAiInvestList = new OpcAiInvestList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(OpcAiInvestProject.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class KolAcceptedTask {
  id: string = '';
  taskId: string = '';
  kolUserId: string = '';
  kolNickName: string = '';
  taskTitle: string = '';
  taskType: string = '';
  typeName: string = '';
  rewardPerUnit: number = 0;
  status: string = '';
  acceptedAt: string = '';
  deadline: string = '';
  description: string = '';
  bizUserId: string = '';
  bizNickName: string = '';
  submissionCount: number = 0;
  maxSubmissions: number = 0;
  earnedReward: number = 0;
  activityId: string = '';

  static fromJson(data: Record<string, Object>): KolAcceptedTask {
    const item: KolAcceptedTask = new KolAcceptedTask();
    item.id = safeGetString(data, 'id');
    item.taskId = safeGetString(data, 'taskId');
    item.kolUserId = safeGetString(data, 'kolUserId');
    item.kolNickName = safeGetString(data, 'kolNickName');
    item.taskTitle = safeGetString(data, 'taskTitle');
    item.taskType = safeGetString(data, 'taskType');
    item.typeName = safeGetString(data, 'typeName');
    item.rewardPerUnit = safeGetNumber(data, 'rewardPerUnit');
    item.status = safeGetString(data, 'status');
    item.acceptedAt = safeGetString(data, 'acceptedAt');
    item.deadline = safeGetString(data, 'deadline');
    item.description = safeGetString(data, 'description');
    item.bizUserId = safeGetString(data, 'bizUserId');
    item.bizNickName = safeGetString(data, 'bizNickName');
    item.submissionCount = safeGetNumber(data, 'submissionCount');
    item.maxSubmissions = safeGetNumber(data, 'maxSubmissions');
    item.earnedReward = safeGetNumber(data, 'earnedReward');
    item.activityId = safeGetString(data, 'activityId');
    return item;
  }
}

export class KolAcceptedTaskList {
  list: KolAcceptedTask[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): KolAcceptedTaskList {
    const item: KolAcceptedTaskList = new KolAcceptedTaskList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(KolAcceptedTask.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class KolTaskSubmissionRecord {
  id: string = '';
  acceptanceId: string = '';
  taskId: string = '';
  kolUserId: string = '';
  proofType: string = '';
  proofUrl: string = '';
  proofText: string = '';
  reward: number = 0;
  aiScore: AiScoreData | null = null;
  status: string = '';
  reviewNote: string = '';
  submittedAt: string = '';

  static fromJson(data: Record<string, Object>): KolTaskSubmissionRecord {
    const item: KolTaskSubmissionRecord = new KolTaskSubmissionRecord();
    item.id = safeGetString(data, 'id');
    item.acceptanceId = safeGetString(data, 'acceptanceId');
    item.taskId = safeGetString(data, 'taskId');
    item.kolUserId = safeGetString(data, 'kolUserId');
    item.proofType = safeGetString(data, 'proofType');
    item.proofUrl = safeGetString(data, 'proofUrl');
    item.proofText = safeGetString(data, 'proofText');
    item.reward = safeGetNumber(data, 'reward');
    const scoreObj: Record<string, Object> | null = safeGetRecord(data, 'aiScore');
    if (scoreObj !== null) {
      item.aiScore = AiScoreData.fromJson(scoreObj);
    }
    item.status = safeGetString(data, 'status');
    item.reviewNote = safeGetString(data, 'reviewNote');
    item.submittedAt = safeGetString(data, 'submittedAt');
    return item;
  }
}

export class KolTaskSubmissionList {
  list: KolTaskSubmissionRecord[] = [];
  total: number = 0;

  static fromJson(data: Record<string, Object>): KolTaskSubmissionList {
    const item: KolTaskSubmissionList = new KolTaskSubmissionList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'list');
    for (let i = 0; i < arr.length; i++) {
      item.list.push(KolTaskSubmissionRecord.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    return item;
  }
}

export class KolTaskDetail {
  task: KolTaskItem = new KolTaskItem();
  acceptance: KolAcceptedTask | null = null;
  submissions: KolTaskSubmissionRecord[] = [];
  bizNickName: string = '';
  activityTitle: string = '';
  canAccept: boolean = false;
  canSubmit: boolean = false;
  remainSlots: number = 0;

  static fromJson(data: Record<string, Object>): KolTaskDetail {
    const item: KolTaskDetail = new KolTaskDetail();
    const taskObj: Record<string, Object> | null = safeGetRecord(data, 'task');
    if (taskObj !== null) {
      item.task = KolTaskItem.fromJson(taskObj);
    }
    const accObj: Record<string, Object> | null = safeGetRecord(data, 'acceptance');
    if (accObj !== null) {
      item.acceptance = KolAcceptedTask.fromJson(accObj);
    }
    const subArr: Record<string, Object>[] = safeGetRecordArray(data, 'submissions');
    for (let i = 0; i < subArr.length; i++) {
      item.submissions.push(KolTaskSubmissionRecord.fromJson(subArr[i]));
    }
    item.bizNickName = safeGetString(data, 'bizNickName');
    item.activityTitle = safeGetString(data, 'activityTitle');
    const canAccVal: number = safeGetNumber(data, 'canAccept');
    item.canAccept = canAccVal === 1 || data['canAccept'] === true;
    const canSubVal: number = safeGetNumber(data, 'canSubmit');
    item.canSubmit = canSubVal === 1 || data['canSubmit'] === true;
    item.remainSlots = safeGetNumber(data, 'remainSlots');
    return item;
  }
}

export class OpcPlazaStats {
  totalCities: number = 0;
  activeCities: number = 0;
  totalOpcUsers: number = 0;
  totalSubsidyPool: number = 0;
  totalSubsidyIssued: number = 0;
  totalAiInvest: number = 0;
  totalAiSubsidy: number = 0;
  totalTokenIssued: number = 0;
  myPromoSubsidy: number = 0;
  myAiSubsidy: number = 0;
  myTokenSubsidy: number = 0;
  myCity: string = '';
  myOpcStatus: string = '';

  static fromJson(data: Record<string, Object>): OpcPlazaStats {
    const item: OpcPlazaStats = new OpcPlazaStats();
    item.totalCities = safeGetNumber(data, 'totalCities');
    item.activeCities = safeGetNumber(data, 'activeCities');
    item.totalOpcUsers = safeGetNumber(data, 'totalOpcUsers');
    item.totalSubsidyPool = safeGetNumber(data, 'totalSubsidyPool');
    item.totalSubsidyIssued = safeGetNumber(data, 'totalSubsidyIssued');
    item.totalAiInvest = safeGetNumber(data, 'totalAiInvest');
    item.totalAiSubsidy = safeGetNumber(data, 'totalAiSubsidy');
    item.totalTokenIssued = safeGetNumber(data, 'totalTokenIssued');
    item.myPromoSubsidy = safeGetNumber(data, 'myPromoSubsidy');
    item.myAiSubsidy = safeGetNumber(data, 'myAiSubsidy');
    item.myTokenSubsidy = safeGetNumber(data, 'myTokenSubsidy');
    item.myCity = safeGetString(data, 'myCity');
    item.myOpcStatus = safeGetString(data, 'myOpcStatus');
    return item;
  }
}

export class AiChatMessage {
  id: string = '';
  role: string = '';
  content: string = '';
  voiceText: string = '';
  intent: string = '';
  timestamp: string = '';
  isPlaying: boolean = false;

  static fromJson(data: Record<string, Object>): AiChatMessage {
    const item: AiChatMessage = new AiChatMessage();
    item.id = safeGetString(data, 'id');
    item.role = safeGetString(data, 'role');
    item.content = safeGetString(data, 'content');
    item.voiceText = safeGetString(data, 'voiceText');
    item.intent = safeGetString(data, 'intent');
    item.timestamp = safeGetString(data, 'timestamp');
    item.isPlaying = safeGetBool(data, 'isPlaying');
    return item;
  }
}

export class AiIntentResult {
  intent: string = '';
  entities: Record<string, string> = {};
  responseText: string = '';
  actionRoute: string = '';
  actionParams: Record<string, Object> = {};
  confidence: number = 0;

  static fromJson(data: Record<string, Object>): AiIntentResult {
    const item: AiIntentResult = new AiIntentResult();
    item.intent = safeGetString(data, 'intent');
    const entVal: Record<string, Object> | null = safeGetRecord(data, 'entities');
    if (entVal !== null) {
      const keys: string[] = Object.keys(entVal);
      const entMap: Record<string, string> = {};
      for (let i = 0; i < keys.length; i++) {
        const v: Object | undefined = entVal[keys[i]];
        if (v !== null && v !== undefined) {
          entMap[keys[i]] = String(v);
        }
      }
      item.entities = entMap;
    }
    item.responseText = safeGetString(data, 'responseText');
    item.actionRoute = safeGetString(data, 'actionRoute');
    const paramsVal: Record<string, Object> | null = safeGetRecord(data, 'actionParams');
    if (paramsVal !== null) {
      item.actionParams = paramsVal;
    }
    item.confidence = safeGetNumber(data, 'confidence');
    return item;
  }
}

export class AiIntentDef {
  static readonly QUERY_BALANCE: string = 'query_balance';
  static readonly QUERY_EARNINGS: string = 'query_earnings';
  static readonly QUERY_TASKS: string = 'query_tasks';
  static readonly ACCEPT_TASK: string = 'accept_task';
  static readonly SUBMIT_PROOF: string = 'submit_proof';
  static readonly QUERY_SETTLEMENT: string = 'query_settlement';
  static readonly CHECK_CERT: string = 'check_cert';
  static readonly CHECK_AUDIT: string = 'check_audit';
  static readonly BOOK_TEST_DRIVE: string = 'book_test_drive';
  static readonly NAVIGATE: string = 'navigate';
  static readonly HELP: string = 'help';
  static readonly UNKNOWN: string = 'unknown';
}

export class AiCopyAlternative {
  style: string = '';
  text: string = '';
  characterCount: number = 0;

  static fromJson(data: Record<string, Object>): AiCopyAlternative {
    const item: AiCopyAlternative = new AiCopyAlternative();
    item.style = safeGetString(data, 'style');
    item.text = safeGetString(data, 'text');
    item.characterCount = safeGetNumber(data, 'characterCount');
    return item;
  }
}

export class AiCopyOptimizeResult {
  originalText: string = '';
  optimizedCopy: string = '';
  style: string = '';
  alternatives: AiCopyAlternative[] = [];
  tags: string[] = [];
  fingerprint: string = '';

  static fromJson(data: Record<string, Object>): AiCopyOptimizeResult {
    const item: AiCopyOptimizeResult = new AiCopyOptimizeResult();
    item.originalText = safeGetString(data, 'originalText');
    item.optimizedCopy = safeGetString(data, 'optimizedCopy');
    item.style = safeGetString(data, 'style');
    const altArr: Record<string, Object>[] = safeGetRecordArray(data, 'alternatives');
    for (let i = 0; i < altArr.length; i++) {
      item.alternatives.push(AiCopyAlternative.fromJson(altArr[i]));
    }
    const tagsArr: Record<string, Object>[] = safeGetRecordArray(data, 'tags');
    const tagList: string[] = [];
    for (let i = 0; i < tagsArr.length; i++) {
      tagList.push(String(tagsArr[i]));
    }
    if (tagList.length > 0) {
      item.tags = tagList;
    }
    item.fingerprint = safeGetString(data, 'fingerprint');
    return item;
  }
}

export class AiGeneratedCopy {
  text: string = '';
  style: string = '';
  sourceType: string = '';
  tags: string[] = [];
  fingerprint: string = '';

  static fromJson(data: Record<string, Object>): AiGeneratedCopy {
    const item: AiGeneratedCopy = new AiGeneratedCopy();
    item.text = safeGetString(data, 'text');
    item.style = safeGetString(data, 'style');
    item.sourceType = safeGetString(data, 'sourceType');
    const tagsArr: Record<string, Object>[] = safeGetRecordArray(data, 'tags');
    const tagList: string[] = [];
    for (let i = 0; i < tagsArr.length; i++) {
      tagList.push(String(tagsArr[i]));
    }
    if (tagList.length > 0) {
      item.tags = tagList;
    }
    item.fingerprint = safeGetString(data, 'fingerprint');
    return item;
  }
}

export class AiTopicRecommendation {
  id: string = '';
  title: string = '';
  summary: string = '';
  hotScore: number = 0;
  category: string = '';
  resourcePackUrl: string = '';
  suggestedAngles: string[] = [];
  carModels: string[] = [];
  isOriginal: boolean = false;
  publishDeadline: string = '';

  static fromJson(data: Record<string, Object>): AiTopicRecommendation {
    const item: AiTopicRecommendation = new AiTopicRecommendation();
    item.id = safeGetString(data, 'id');
    item.title = safeGetString(data, 'title');
    item.summary = safeGetString(data, 'summary');
    item.hotScore = safeGetNumber(data, 'hotScore');
    item.category = safeGetString(data, 'category');
    item.resourcePackUrl = safeGetString(data, 'resourcePackUrl');
    const anglesArr: Record<string, Object>[] = safeGetRecordArray(data, 'suggestedAngles');
    const angleList: string[] = [];
    for (let i = 0; i < anglesArr.length; i++) {
      angleList.push(String(anglesArr[i]));
    }
    if (angleList.length > 0) {
      item.suggestedAngles = angleList;
    }
    const modelsArr: Record<string, Object>[] = safeGetRecordArray(data, 'carModels');
    const modelList: string[] = [];
    for (let i = 0; i < modelsArr.length; i++) {
      modelList.push(String(modelsArr[i]));
    }
    if (modelList.length > 0) {
      item.carModels = modelList;
    }
    item.isOriginal = safeGetBool(data, 'isOriginal');
    item.publishDeadline = safeGetString(data, 'publishDeadline');
    return item;
  }
}

export class AiCarMatchItem {
  brand: string = '';
  model: string = '';
  matchScore: number = 0;
  priceRange: string = '';
  highlights: string[] = [];
  imageTag: string = '';

  static fromJson(data: Record<string, Object>): AiCarMatchItem {
    const item: AiCarMatchItem = new AiCarMatchItem();
    item.brand = safeGetString(data, 'brand');
    item.model = safeGetString(data, 'model');
    item.matchScore = safeGetNumber(data, 'matchScore');
    item.priceRange = safeGetString(data, 'priceRange');
    const hlArr: Record<string, Object>[] = safeGetRecordArray(data, 'highlights');
    const hlList: string[] = [];
    for (let i = 0; i < hlArr.length; i++) {
      hlList.push(String(hlArr[i]));
    }
    if (hlList.length > 0) {
      item.highlights = hlList;
    }
    item.imageTag = safeGetString(data, 'imageTag');
    return item;
  }
}

export class AiCarMatchResult {
  matchedModels: AiCarMatchItem[] = [];
  interestTags: string[] = [];
  recommendedActivities: string[] = [];

  static fromJson(data: Record<string, Object>): AiCarMatchResult {
    const item: AiCarMatchResult = new AiCarMatchResult();
    const modelArr: Record<string, Object>[] = safeGetRecordArray(data, 'matchedModels');
    for (let i = 0; i < modelArr.length; i++) {
      item.matchedModels.push(AiCarMatchItem.fromJson(modelArr[i]));
    }
    const tagArr: Record<string, Object>[] = safeGetRecordArray(data, 'interestTags');
    const tagList: string[] = [];
    for (let i = 0; i < tagArr.length; i++) {
      tagList.push(String(tagArr[i]));
    }
    if (tagList.length > 0) {
      item.interestTags = tagList;
    }
    const actArr: Record<string, Object>[] = safeGetRecordArray(data, 'recommendedActivities');
    const actList: string[] = [];
    for (let i = 0; i < actArr.length; i++) {
      actList.push(String(actArr[i]));
    }
    if (actList.length > 0) {
      item.recommendedActivities = actList;
    }
    return item;
  }
}

export class AiBookingSuggestion {
  bestTimeSlot: string = '';
  recommendedDealer: string = '';
  reminderScript: string = '';
  preparationTips: string[] = [];
  voiceReminderEnabled: boolean = true;

  static fromJson(data: Record<string, Object>): AiBookingSuggestion {
    const item: AiBookingSuggestion = new AiBookingSuggestion();
    item.bestTimeSlot = safeGetString(data, 'bestTimeSlot');
    item.recommendedDealer = safeGetString(data, 'recommendedDealer');
    item.reminderScript = safeGetString(data, 'reminderScript');
    const tipsArr: Record<string, Object>[] = safeGetRecordArray(data, 'preparationTips');
    const tipsList: string[] = [];
    for (let i = 0; i < tipsArr.length; i++) {
      tipsList.push(String(tipsArr[i]));
    }
    if (tipsList.length > 0) {
      item.preparationTips = tipsList;
    }
    item.voiceReminderEnabled = safeGetBool(data, 'voiceReminderEnabled', true);
    return item;
  }
}

export class AiKnowledgeQA {
  id: string = '';
  question: string = '';
  answer: string = '';
  category: string = '';
  carBrand: string = '';
  carModel: string = '';
  viewCount: number = 0;
  helpfulCount: number = 0;
  sourceType: string = '';
  fingerprint: string = '';
  hashTxId: string = '';

  static fromJson(data: Record<string, Object>): AiKnowledgeQA {
    const item: AiKnowledgeQA = new AiKnowledgeQA();
    item.id = safeGetString(data, 'id');
    item.question = safeGetString(data, 'question');
    item.answer = safeGetString(data, 'answer');
    item.category = safeGetString(data, 'category');
    item.carBrand = safeGetString(data, 'carBrand');
    item.carModel = safeGetString(data, 'carModel');
    item.viewCount = safeGetNumber(data, 'viewCount');
    item.helpfulCount = safeGetNumber(data, 'helpfulCount');
    item.sourceType = safeGetString(data, 'sourceType');
    item.fingerprint = safeGetString(data, 'fingerprint');
    item.hashTxId = safeGetString(data, 'hashTxId');
    return item;
  }
}

export class AiKnowledgeAnswer {
  question: string = '';
  answer: string = '';
  relatedQA: AiKnowledgeQA[] = [];
  confidence: number = 0;
  sourceReferences: string[] = [];

  static fromJson(data: Record<string, Object>): AiKnowledgeAnswer {
    const item: AiKnowledgeAnswer = new AiKnowledgeAnswer();
    item.question = safeGetString(data, 'question');
    item.answer = safeGetString(data, 'answer');
    const relArr: Record<string, Object>[] = safeGetRecordArray(data, 'relatedQA');
    for (let i = 0; i < relArr.length; i++) {
      item.relatedQA.push(AiKnowledgeQA.fromJson(relArr[i]));
    }
    item.confidence = safeGetNumber(data, 'confidence');
    const refArr: Record<string, Object>[] = safeGetRecordArray(data, 'sourceReferences');
    const refList: string[] = [];
    for (let i = 0; i < refArr.length; i++) {
      refList.push(String(refArr[i]));
    }
    if (refList.length > 0) {
      item.sourceReferences = refList;
    }
    return item;
  }
}

export class AiSecurityLabel {
  type: string = '';
  level: string = '';
  description: string = '';
  autoApplied: boolean = false;

  static fromJson(data: Record<string, Object>): AiSecurityLabel {
    const item: AiSecurityLabel = new AiSecurityLabel();
    item.type = safeGetString(data, 'type');
    item.level = safeGetString(data, 'level');
    item.description = safeGetString(data, 'description');
    item.autoApplied = safeGetBool(data, 'autoApplied');
    return item;
  }
}

export class AiComplianceResult {
  contentId: string = '';
  compliant: boolean = true;
  labels: AiSecurityLabel[] = [];
  riskScore: number = 0;
  downloadable: boolean = true;
  shareableExternally: boolean = true;
  fingerprint: string = '';
  hashTxId: string = '';

  static fromJson(data: Record<string, Object>): AiComplianceResult {
    const item: AiComplianceResult = new AiComplianceResult();
    item.contentId = safeGetString(data, 'contentId');
    item.compliant = safeGetBool(data, 'compliant', true);
    const lblArr: Record<string, Object>[] = safeGetRecordArray(data, 'labels');
    for (let i = 0; i < lblArr.length; i++) {
      item.labels.push(AiSecurityLabel.fromJson(lblArr[i]));
    }
    item.riskScore = safeGetNumber(data, 'riskScore');
    item.downloadable = safeGetBool(data, 'downloadable', true);
    item.shareableExternally = safeGetBool(data, 'shareableExternally', true);
    item.fingerprint = safeGetString(data, 'fingerprint');
    item.hashTxId = safeGetString(data, 'hashTxId');
    return item;
  }
}

export class ComplianceDashboardData {
  totalChecks: number = 0;
  matchRate: number = 0;
  mismatchRate: number = 0;
  matched: number = 0;
  mismatched: number = 0;
  partial: number = 0;
  recentMismatches: ComplianceCheckItem[] = [];
  static fromJson(data: Record<string, Object>): ComplianceDashboardData {
    const d: ComplianceDashboardData = new ComplianceDashboardData();
    d.totalChecks = safeGetNumber(data, 'totalChecks');
    d.matchRate = safeGetNumber(data, 'matchRate');
    d.mismatchRate = safeGetNumber(data, 'mismatchRate');
    d.matched = safeGetNumber(data, 'matched');
    d.mismatched = safeGetNumber(data, 'mismatched');
    d.partial = safeGetNumber(data, 'partial');
    d.recentMismatches = ComplianceCheckList.fromJsonArr(safeGetRecordArray(data, 'recentMismatches'));
    return d;
  }
}

export class ComplianceCheckItem {
  checkId: string = '';
  bizHash: string = '';
  ecnyFlowId: string = '';
  invoiceId: string = '';
  bizAmount: number = 0;
  flowAmount: number = 0;
  invoiceAmount: number = 0;
  matchStatus: string = 'pending';
  mismatchDetail: string = '';
  checkTime: string = '';
  autoCheck: boolean = false;
  static fromJson(data: Record<string, Object>): ComplianceCheckItem {
    const c: ComplianceCheckItem = new ComplianceCheckItem();
    c.checkId = safeGetString(data, 'checkId');
    c.bizHash = safeGetString(data, 'bizHash');
    c.ecnyFlowId = safeGetString(data, 'ecnyFlowId');
    c.invoiceId = safeGetString(data, 'invoiceId');
    c.bizAmount = safeGetNumber(data, 'bizAmount');
    c.flowAmount = safeGetNumber(data, 'flowAmount');
    c.invoiceAmount = safeGetNumber(data, 'invoiceAmount');
    c.matchStatus = safeGetString(data, 'matchStatus');
    c.mismatchDetail = safeGetString(data, 'mismatchDetail');
    c.checkTime = safeGetString(data, 'checkTime');
    c.autoCheck = safeGetBool(data, 'autoCheck');
    return c;
  }
}

export class ComplianceCheckList {
  list: ComplianceCheckItem[] = [];
  total: number = 0;
  static fromJson(data: Record<string, Object>): ComplianceCheckList {
    const l: ComplianceCheckList = new ComplianceCheckList();
    l.list = ComplianceCheckList.fromJsonArr(safeGetRecordArray(data, 'list'));
    l.total = safeGetNumber(data, 'total');
    return l;
  }
  static fromJsonArr(arr: Record<string, Object>[]): ComplianceCheckItem[] {
    const result: ComplianceCheckItem[] = [];
    for (let i = 0; i < arr.length; i++) {
      result.push(ComplianceCheckItem.fromJson(arr[i]));
    }
    return result;
  }
}

export class KolTrackData {
  track: string = 'B';
  taxType: string = '';
  withholdingRate: number = 0;
  selfInvoicing: boolean = false;
  autoClassified: boolean = true;
  static fromJson(data: Record<string, Object>): KolTrackData {
    const t: KolTrackData = new KolTrackData();
    t.track = safeGetString(data, 'track');
    t.taxType = safeGetString(data, 'taxType');
    t.withholdingRate = safeGetNumber(data, 'withholdingRate');
    t.selfInvoicing = safeGetBool(data, 'selfInvoicing');
    t.autoClassified = safeGetBool(data, 'autoClassified');
    return t;
  }
}

export class KolTrackDistribution {
  A: number = 0;
  B: number = 0;
  C: number = 0;
  static fromJson(data: Record<string, Object>): KolTrackDistribution {
    const d: KolTrackDistribution = new KolTrackDistribution();
    d.A = safeGetNumber(data, 'A');
    d.B = safeGetNumber(data, 'B');
    d.C = safeGetNumber(data, 'C');
    return d;
  }
}

export class ContractParamItem {
  paramKey: string = '';
  paramValue: number = 0;
  defaultValue: number = 0;
  scope: string = 'global';
  description: string = '';
  static fromJson(data: Record<string, Object>): ContractParamItem {
    const p: ContractParamItem = new ContractParamItem();
    p.paramKey = safeGetString(data, 'paramKey');
    p.paramValue = safeGetNumber(data, 'paramValue');
    p.defaultValue = safeGetNumber(data, 'defaultValue');
    p.scope = safeGetString(data, 'scope');
    p.description = safeGetString(data, 'description');
    return p;
  }
}

export class EcnyWalletData {
  walletId: string = '';
  walletType: string = 'personal';
  balance: number = 0;
  status: string = 'active';
  static fromJson(data: Record<string, Object>): EcnyWalletData {
    const w: EcnyWalletData = new EcnyWalletData();
    w.walletId = safeGetString(data, 'walletId');
    w.walletType = safeGetString(data, 'walletType');
    w.balance = safeGetNumber(data, 'balance');
    w.status = safeGetString(data, 'status');
    return w;
  }
}

export class EcnyFlowItem {
  flowId: string = '';
  amount: number = 0;
  direction: string = '';
  bizType: string = '';
  status: string = '';
  createdAt: string = '';
  static fromJson(data: Record<string, Object>): EcnyFlowItem {
    const f: EcnyFlowItem = new EcnyFlowItem();
    f.flowId = safeGetString(data, 'flowId');
    f.amount = safeGetNumber(data, 'amount');
    f.direction = safeGetString(data, 'direction');
    f.bizType = safeGetString(data, 'bizType');
    f.status = safeGetString(data, 'status');
    f.createdAt = safeGetString(data, 'createdAt');
    return f;
  }
}

export class InvoiceItem {
  invoiceId: string = '';
  invoiceNo: string = '';
  invoiceType: string = '';
  recipientTrack: string = 'B';
  amount: number = 0;
  taxAmount: number = 0;
  totalAmount: number = 0;
  status: string = 'draft';
  createdAt: string = '';
  static fromJson(data: Record<string, Object>): InvoiceItem {
    const i: InvoiceItem = new InvoiceItem();
    i.invoiceId = safeGetString(data, 'invoiceId');
    i.invoiceNo = safeGetString(data, 'invoiceNo');
    i.invoiceType = safeGetString(data, 'invoiceType');
    i.recipientTrack = safeGetString(data, 'recipientTrack');
    i.amount = safeGetNumber(data, 'amount');
    i.taxAmount = safeGetNumber(data, 'taxAmount');
    i.totalAmount = safeGetNumber(data, 'totalAmount');
    i.status = safeGetString(data, 'status');
    i.createdAt = safeGetString(data, 'createdAt');
    return i;
  }
}

export class RegulatoryOverview {
  tipsEnabled: boolean = false;
  tipsAccountId: string = '';
  ecnyTraceable: boolean = false;
  goldenTaxLinked: boolean = false;
  goldenTaxSyncCount: number = 0;
  lastSyncTime: string = '';
  fourFlowMatchRate: number = 0;
  whitelistStatus: string = '';
  riskLevel: string = '';
  totalVerifiedTransactions: number = 0;
  totalVerifiedAmount: number = 0;
  pendingAlerts: number = 0;

  static fromJson(data: Record<string, Object>): RegulatoryOverview {
    const r: RegulatoryOverview = new RegulatoryOverview();
    r.tipsEnabled = safeGetBool(data, 'tipsEnabled');
    r.tipsAccountId = safeGetString(data, 'tipsAccountId');
    r.ecnyTraceable = safeGetBool(data, 'ecnyTraceable');
    r.goldenTaxLinked = safeGetBool(data, 'goldenTaxLinked');
    r.goldenTaxSyncCount = safeGetNumber(data, 'goldenTaxSyncCount');
    r.lastSyncTime = safeGetString(data, 'lastSyncTime');
    r.fourFlowMatchRate = safeGetNumber(data, 'fourFlowMatchRate');
    r.whitelistStatus = safeGetString(data, 'whitelistStatus');
    r.riskLevel = safeGetString(data, 'riskLevel');
    r.totalVerifiedTransactions = safeGetNumber(data, 'totalVerifiedTransactions');
    r.totalVerifiedAmount = safeGetNumber(data, 'totalVerifiedAmount');
    r.pendingAlerts = safeGetNumber(data, 'pendingAlerts');
    return r;
  }
}

export class RegulatoryAlert {
  id: string = '';
  type: string = '';
  severity: string = '';
  title: string = '';
  detail: string = '';
  relatedFlowId: string = '';
  relatedHash: string = '';
  timestamp: string = '';
  resolved: boolean = false;

  static fromJson(data: Record<string, Object>): RegulatoryAlert {
    const a: RegulatoryAlert = new RegulatoryAlert();
    a.id = safeGetString(data, 'id');
    a.type = safeGetString(data, 'type');
    a.severity = safeGetString(data, 'severity');
    a.title = safeGetString(data, 'title');
    a.detail = safeGetString(data, 'detail');
    a.relatedFlowId = safeGetString(data, 'relatedFlowId');
    a.relatedHash = safeGetString(data, 'relatedHash');
    a.timestamp = safeGetString(data, 'timestamp');
    a.resolved = safeGetBool(data, 'resolved');
    return a;
  }
}

export class TipsAccountInfo {
  accountId: string = '';
  bankName: string = '';
  taxOffice: string = '';
  agreementStatus: string = '';
  autoDeductEnabled: boolean = false;
  lastDeductTime: string = '';
  totalDeducted: number = 0;

  static fromJson(data: Record<string, Object>): TipsAccountInfo {
    const t: TipsAccountInfo = new TipsAccountInfo();
    t.accountId = safeGetString(data, 'accountId');
    t.bankName = safeGetString(data, 'bankName');
    t.taxOffice = safeGetString(data, 'taxOffice');
    t.agreementStatus = safeGetString(data, 'agreementStatus');
    t.autoDeductEnabled = safeGetBool(data, 'autoDeductEnabled');
    t.lastDeductTime = safeGetString(data, 'lastDeductTime');
    t.totalDeducted = safeGetNumber(data, 'totalDeducted');
    return t;
  }
}

export class EcnyTraceRecord {
  flowId: string = '';
  umbrellaTopId: string = '';
  umbrellaBottomId: string = '';
  direction: string = '';
  amount: number = 0;
  purpose: string = '';
  hashProof: string = '';
  taxDeducted: boolean = false;
  invoiceIssued: boolean = false;
  bizHash: string = '';
  timestamp: string = '';

  static fromJson(data: Record<string, Object>): EcnyTraceRecord {
    const r: EcnyTraceRecord = new EcnyTraceRecord();
    r.flowId = safeGetString(data, 'flowId');
    r.umbrellaTopId = safeGetString(data, 'umbrellaTopId');
    r.umbrellaBottomId = safeGetString(data, 'umbrellaBottomId');
    r.direction = safeGetString(data, 'direction');
    r.amount = safeGetNumber(data, 'amount');
    r.purpose = safeGetString(data, 'purpose');
    r.hashProof = safeGetString(data, 'hashProof');
    r.taxDeducted = safeGetBool(data, 'taxDeducted');
    r.invoiceIssued = safeGetBool(data, 'invoiceIssued');
    r.bizHash = safeGetString(data, 'bizHash');
    r.timestamp = safeGetString(data, 'timestamp');
    return r;
  }
}

export class FourFlowCheckResult {
  bizHash: string = '';
  ecnyFlowId: string = '';
  invoiceId: string = '';
  contractId: string = '';
  bizAmount: number = 0;
  flowAmount: number = 0;
  invoiceAmount: number = 0;
  contractAmount: number = 0;
  matchStatus: string = '';
  checkTime: string = '';

  static fromJson(data: Record<string, Object>): FourFlowCheckResult {
    const c: FourFlowCheckResult = new FourFlowCheckResult();
    c.bizHash = safeGetString(data, 'bizHash');
    c.ecnyFlowId = safeGetString(data, 'ecnyFlowId');
    c.invoiceId = safeGetString(data, 'invoiceId');
    c.contractId = safeGetString(data, 'contractId');
    c.bizAmount = safeGetNumber(data, 'bizAmount');
    c.flowAmount = safeGetNumber(data, 'flowAmount');
    c.invoiceAmount = safeGetNumber(data, 'invoiceAmount');
    c.contractAmount = safeGetNumber(data, 'contractAmount');
    c.matchStatus = safeGetString(data, 'matchStatus');
    c.checkTime = safeGetString(data, 'checkTime');
    return c;
  }
}

export class WeightedScoreDetail {
  computePower: number = 0;
  visitFrequency: number = 0;
  duration: number = 0;
  contentDepth: number = 0;
  interaction: number = 0;
  platformDepth: number = 0;
  shareTracking: number = 0;
  crossProject: number = 0;

  static fromJson(data: Record<string, Object>): WeightedScoreDetail {
    const item: WeightedScoreDetail = new WeightedScoreDetail();
    item.computePower = safeGetNumber(data, 'computePower');
    item.visitFrequency = safeGetNumber(data, 'visitFrequency');
    item.duration = safeGetNumber(data, 'duration');
    item.contentDepth = safeGetNumber(data, 'contentDepth');
    item.interaction = safeGetNumber(data, 'interaction');
    item.platformDepth = safeGetNumber(data, 'platformDepth');
    item.shareTracking = safeGetNumber(data, 'shareTracking');
    item.crossProject = safeGetNumber(data, 'crossProject');
    return item;
  }
}

export class SplitDetail {
  platform: number = 0;
  contributor: number = 0;
  notary: number = 0;
  crossProject: number = 0;
  reserve: number = 0;

  static fromJson(data: Record<string, Object>): SplitDetail {
    const item: SplitDetail = new SplitDetail();
    item.platform = safeGetNumber(data, 'platform');
    item.contributor = safeGetNumber(data, 'contributor');
    item.notary = safeGetNumber(data, 'notary');
    item.crossProject = safeGetNumber(data, 'crossProject');
    item.reserve = safeGetNumber(data, 'reserve');
    return item;
  }
}

export class PageWeightedSettlement {
  id: string = '';
  userId: string = '';
  contributorId: string = '';
  project: string = '';
  totalScore: number = 0;
  scores: WeightedScoreDetail = new WeightedScoreDetail();
  settleAmount: number = 0;
  splits: SplitDetail = new SplitDetail();
  budgetId: string = '';
  budgetRemaining: number = 0;
  hashProof: string = '';
  notarized: boolean = false;
  x402PaymentId: string = '';
  status: string = '';
  createdAt: string = '';

  static fromJson(data: Record<string, Object>): PageWeightedSettlement {
    const item: PageWeightedSettlement = new PageWeightedSettlement();
    item.id = safeGetString(data, 'id');
    item.userId = safeGetString(data, 'userId');
    item.contributorId = safeGetString(data, 'contributorId');
    item.project = safeGetString(data, 'project');
    item.totalScore = safeGetNumber(data, 'totalScore');
    const scoresObj: Record<string, Object> | null = safeGetRecord(data, 'scores');
    if (scoresObj !== null) {
      item.scores = WeightedScoreDetail.fromJson(scoresObj);
    }
    item.settleAmount = safeGetNumber(data, 'settleAmount');
    const splitsObj: Record<string, Object> | null = safeGetRecord(data, 'splits');
    if (splitsObj !== null) {
      item.splits = SplitDetail.fromJson(splitsObj);
    }
    item.budgetId = safeGetString(data, 'budgetId');
    item.budgetRemaining = safeGetNumber(data, 'budgetRemaining');
    item.hashProof = safeGetString(data, 'hashProof');
    const notarVal: number = safeGetNumber(data, 'notarized');
    item.notarized = notarVal === 1 || data['notarized'] === true;
    item.x402PaymentId = safeGetString(data, 'x402PaymentId');
    item.status = safeGetString(data, 'status');
    item.createdAt = safeGetString(data, 'createdAt');
    return item;
  }
}

export class PageWeightedSettlementList {
  items: PageWeightedSettlement[] = [];
  total: number = 0;
  page: number = 0;
  pageSize: number = 0;

  static fromJson(data: Record<string, Object>): PageWeightedSettlementList {
    const item: PageWeightedSettlementList = new PageWeightedSettlementList();
    const arr: Record<string, Object>[] = safeGetRecordArray(data, 'items');
    for (let i = 0; i < arr.length; i++) {
      item.items.push(PageWeightedSettlement.fromJson(arr[i]));
    }
    item.total = safeGetNumber(data, 'total');
    item.page = safeGetNumber(data, 'page');
    item.pageSize = safeGetNumber(data, 'pageSize');
    return item;
  }
}

export class BudgetPoolItem {
  id: string = '';
  project: string = '';
  projectName: string = '';
  totalBudget: number = 0;
  usedBudget: number = 0;
  remaining: number = 0;
  usageRate: number = 0;
  status: string = '';
  alertThreshold: number = 0;
  alertTriggered: boolean = false;

  static fromJson(data: Record<string, Object>): BudgetPoolItem {
    const item: BudgetPoolItem = new BudgetPoolItem();
    item.id = safeGetString(data, 'id');
    item.project = safeGetString(data, 'project');
    item.projectName = safeGetString(data, 'projectName');
    item.totalBudget = safeGetNumber(data, 'totalBudget');
    item.usedBudget = safeGetNumber(data, 'usedBudget');
    item.remaining = safeGetNumber(data, 'remaining');
    item.usageRate = safeGetNumber(data, 'usageRate');
    item.status = safeGetString(data, 'status');
    item.alertThreshold = safeGetNumber(data, 'alertThreshold');
    const alertVal: number = safeGetNumber(data, 'alertTriggered');
    item.alertTriggered = alertVal === 1 || data['alertTriggered'] === true;
    return item;
  }
}

export class WeightedSettleStats {
  totalSettlements: number = 0;
  totalAmount: number = 0;
  totalPlatformFee: number = 0;
  totalContributorEarnings: number = 0;
  totalNotaryFee: number = 0;
  totalCrossProjectFee: number = 0;
  avgScore: number = 0;
  notarizedCount: number = 0;
  budgetPools: BudgetPoolItem[] = [];

  static fromJson(data: Record<string, Object>): WeightedSettleStats {
    const item: WeightedSettleStats = new WeightedSettleStats();
    item.totalSettlements = safeGetNumber(data, 'totalSettlements');
    item.totalAmount = safeGetNumber(data, 'totalAmount');
    item.totalPlatformFee = safeGetNumber(data, 'totalPlatformFee');
    item.totalContributorEarnings = safeGetNumber(data, 'totalContributorEarnings');
    item.totalNotaryFee = safeGetNumber(data, 'totalNotaryFee');
    item.totalCrossProjectFee = safeGetNumber(data, 'totalCrossProjectFee');
    item.avgScore = safeGetNumber(data, 'avgScore');
    item.notarizedCount = safeGetNumber(data, 'notarizedCount');
    const poolArr: Record<string, Object>[] = safeGetRecordArray(data, 'budgetPools');
    for (let i = 0; i < poolArr.length; i++) {
      item.budgetPools.push(BudgetPoolItem.fromJson(poolArr[i]));
    }
    return item;
  }
}

export class ContractVerifyResult {
  verified: boolean = false;
  contractId: string = '';
  contractType: string = '';
  commissionRate: number = 0;
  reason: string = '';
  message: string = '';

  static fromJson(data: Record<string, Object>): ContractVerifyResult {
    const item: ContractVerifyResult = new ContractVerifyResult();
    item.verified = safeGetBool(data, 'verified');
    item.contractId = safeGetString(data, 'contractId');
    item.contractType = safeGetString(data, 'contractType');
    item.commissionRate = safeGetNumber(data, 'commissionRate');
    item.reason = safeGetString(data, 'reason');
    item.message = safeGetString(data, 'message');
    return item;
  }
}

export class ContractSettleBreakdown {
  kolShare: number = 0;
  merchantShare: number = 0;
  platformFee: number = 0;
  taxReserve: number = 0;

  static fromJson(data: Record<string, Object>): ContractSettleBreakdown {
    const item: ContractSettleBreakdown = new ContractSettleBreakdown();
    item.kolShare = safeGetNumber(data, 'kolShare');
    item.merchantShare = safeGetNumber(data, 'merchantShare');
    item.platformFee = safeGetNumber(data, 'platformFee');
    item.taxReserve = safeGetNumber(data, 'taxReserve');
    return item;
  }
}

export class WeightUpdate {
  oldWeight: number = 0;
  newWeight: number = 0;
  direction: string = '';

  static fromJson(data: Record<string, Object>): WeightUpdate {
    const item: WeightUpdate = new WeightUpdate();
    item.oldWeight = safeGetNumber(data, 'oldWeight');
    item.newWeight = safeGetNumber(data, 'newWeight');
    item.direction = safeGetString(data, 'direction');
    return item;
  }
}

export class ContractSettleResult {
  id: string = '';
  merchantId: string = '';
  kolUserId: string = '';
  amount: number = 0;
  breakdown: ContractSettleBreakdown = new ContractSettleBreakdown();
  weightUpdate: WeightUpdate | null = null;
  status: string = '';

  static fromJson(data: Record<string, Object>): ContractSettleResult {
    const item: ContractSettleResult = new ContractSettleResult();
    item.id = safeGetString(data, 'id');
    item.merchantId = safeGetString(data, 'merchantId');
    item.kolUserId = safeGetString(data, 'kolUserId');
    item.amount = safeGetNumber(data, 'amount');
    const bd: Record<string, Object> | null = safeGetRecord(data, 'breakdown');
    if (bd !== null) { item.breakdown = ContractSettleBreakdown.fromJson(bd); }
    const wu: Record<string, Object> | null = safeGetRecord(data, 'weightUpdate');
    if (wu !== null) { item.weightUpdate = WeightUpdate.fromJson(wu); }
    item.status = safeGetString(data, 'status');
    return item;
  }
}

export class KolWeightAdjustResult {
  kolUserId: string = '';
  oldWeight: number = 0;
  newWeight: number = 0;
  level: number = 0;
  direction: string = '';

  static fromJson(data: Record<string, Object>): KolWeightAdjustResult {
    const item: KolWeightAdjustResult = new KolWeightAdjustResult();
    item.kolUserId = safeGetString(data, 'kolUserId');
    item.oldWeight = safeGetNumber(data, 'oldWeight');
    item.newWeight = safeGetNumber(data, 'newWeight');
    item.level = safeGetNumber(data, 'level');
    item.direction = safeGetString(data, 'direction');
    return item;
  }
}

export class DimensionItem {
  key: string = '';
  value: number = 0;

  static fromJson(key: string, value: Object): DimensionItem {
    const item: DimensionItem = new DimensionItem();
    item.key = key;
    item.value = Number(value);
    return item;
  }
}

export class ValuationResult {
  totalWeight: number = 0;
  estimatedValue: number = 0;
  qualityGrade: string = '';
  dimensions: DimensionItem[] = [];

  static fromJson(data: Record<string, Object>): ValuationResult {
    const item: ValuationResult = new ValuationResult();
    item.totalWeight = safeGetNumber(data, 'totalWeight');
    item.estimatedValue = safeGetNumber(data, 'estimatedValue');
    item.qualityGrade = safeGetString(data, 'qualityGrade');
    const dimObj: Record<string, Object> | null = safeGetRecord(data, 'dimensions');
    if (dimObj !== null) {
      const keys: string[] = Object.keys(dimObj);
      for (let i = 0; i < keys.length; i++) {
        item.dimensions.push(DimensionItem.fromJson(keys[i], dimObj[keys[i]]));
      }
    }
    return item;
  }
}

export class WeightedValuationResult {
  id: string = '';
  evidenceId: string = '';
  valuation: ValuationResult = new ValuationResult();

  static fromJson(data: Record<string, Object>): WeightedValuationResult {
    const item: WeightedValuationResult = new WeightedValuationResult();
    item.id = safeGetString(data, 'id');
    item.evidenceId = safeGetString(data, 'evidenceId');
    const val: Record<string, Object> | null = safeGetRecord(data, 'valuation');
    if (val !== null) { item.valuation = ValuationResult.fromJson(val); }
    return item;
  }
}

export class TestPaymentResult {
  id: string = '';
  evidenceId: string = '';
  amount: number = 0;
  channel: string = '';
  type: string = '';
  status: string = '';

  static fromJson(data: Record<string, Object>): TestPaymentResult {
    const item: TestPaymentResult = new TestPaymentResult();
    item.id = safeGetString(data, 'id');
    item.evidenceId = safeGetString(data, 'evidenceId');
    item.amount = safeGetNumber(data, 'amount');
    item.channel = safeGetString(data, 'channel');
    item.type = safeGetString(data, 'type');
    item.status = safeGetString(data, 'status');
    return item;
  }
}

export class EarningsReminderResult {
  hasEarnings: boolean = false;
  totalPending: number = 0;

  static fromJson(data: Record<string, Object>): EarningsReminderResult {
    const item: EarningsReminderResult = new EarningsReminderResult();
    item.hasEarnings = safeGetBool(data, 'hasEarnings');
    item.totalPending = safeGetNumber(data, 'totalPending');
    return item;
  }
}
