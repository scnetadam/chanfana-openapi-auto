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
  createdAt: string = '';
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
