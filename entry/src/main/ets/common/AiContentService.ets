import { HttpClient, ApiResponse, toPostBody } from './HttpClient';
import { AI_CONFIG } from './Constants';
import {
  AiCopyOptimizeResult, AiCopyAlternative, AiGeneratedCopy,
  AiTopicRecommendation, AiCarMatchResult, AiCarMatchItem,
  AiBookingSuggestion, AiKnowledgeQA, AiKnowledgeAnswer
} from '../model/DataModels';

export class AiContentService {
  private static instance: AiContentService | null = null;
  private requestCache: Record<string, number> = {};

  static getInstance(): AiContentService {
    if (AiContentService.instance === null) {
      AiContentService.instance = new AiContentService();
    }
    return AiContentService.instance;
  }

  private shouldThrottle(key: string): boolean {
    const now: number = Date.now();
    const lastTime: number = this.requestCache[key] !== null && this.requestCache[key] !== undefined ? this.requestCache[key] : 0;
    if (now - lastTime < AI_CONFIG.AI_REQUEST_THROTTLE_MS) {
      return true;
    }
    this.requestCache[key] = now;
    return false;
  }

  async optimizeCopy(text: string, style: string, brand: string, model: string, userId: string): Promise<ApiResponse<AiCopyOptimizeResult>> {
    const cacheKey: string = 'copy_' + text.length + '_' + style;
    if (this.shouldThrottle(cacheKey)) {
      return new ApiResponse<AiCopyOptimizeResult>(false, null, '请求过于频繁，请稍后再试');
    }
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockOptimizeCopy(text, style, brand, model);
    }
    const body: Record<string, Object> = {
      'text': text,
      'style': style,
      'brand': brand,
      'model': model,
      'userId': userId,
    };
    return await HttpClient.post<AiCopyOptimizeResult>(
      '/api/ai/copy-optimize', toPostBody(body),
      (data: Record<string, Object>): AiCopyOptimizeResult => {
        return AiCopyOptimizeResult.fromJson(data);
      });
  }

  private mockOptimizeCopy(text: string, style: string, brand: string, model: string): ApiResponse<AiCopyOptimizeResult> {
    const result: AiCopyOptimizeResult = new AiCopyOptimizeResult();
    result.originalText = text;
    result.style = style;
    const brandName: string = brand.length > 0 ? brand : '汽车';
    const modelName: string = model.length > 0 ? model : '';
    const carLabel: string = brandName + (modelName.length > 0 ? (' ' + modelName) : '');
    if (style === 'professional' || style.length === 0) {
      result.optimizedCopy = carLabel + '深度体验报告：' + (text.length > 20 ? text.slice(0, 20) : text) + '...从专业角度分析，这款车型在动力响应、操控精准度和舒适性方面均表现优异，值得推荐。';
    } else if (style === 'casual') {
      result.optimizedCopy = '今天试了' + carLabel + '，说实话真的被惊艳到了！' + (text.length > 15 ? text.slice(0, 15) : text) + '...强烈建议大家去体验一下！';
    } else if (style === 'humorous') {
      result.optimizedCopy = '本来只想随便试试' + carLabel + '，结果一坐上去就不想下来了...' + (text.length > 10 ? text.slice(0, 10) : text) + '钱包，危！';
    } else if (style === 'emotional') {
      result.optimizedCopy = '第一次开' + carLabel + '的时候，那种被科技温暖包裹的感觉...' + (text.length > 10 ? text.slice(0, 10) : text) + '这大概就是未来出行的样子吧。';
    } else if (style === 'news') {
      result.optimizedCopy = '【首发】' + carLabel + '实车评测：' + (text.length > 15 ? text.slice(0, 15) : text) + '...据悉该车型将于近期正式上市，市场期待度持续走高。';
    } else if (style === 'short_video') {
      result.optimizedCopy = carLabel + ' | 30秒告诉你这车值不值！' + (text.length > 10 ? text.slice(0, 10) : text) + ' #试驾 #选车 #' + brandName;
    } else {
      result.optimizedCopy = text;
    }
    const altStyles: string[] = ['professional', 'casual', 'humorous', 'emotional', 'news', 'short_video'];
    const altCopies: AiCopyAlternative[] = [];
    for (let i = 0; i < altStyles.length; i++) {
      if (altStyles[i] !== style) {
        const alt: AiCopyAlternative = new AiCopyAlternative();
        alt.style = altStyles[i];
        alt.text = result.optimizedCopy;
        alt.characterCount = alt.text.length;
        altCopies.push(alt);
      }
    }
    result.alternatives = altCopies;
    result.tags = [brandName, '试驾体验', '新车推荐'];
    return new ApiResponse<AiCopyOptimizeResult>(true, result, '');
  }

  async generateFromImages(imageUrls: string[], style: string, brand: string, model: string): Promise<ApiResponse<AiGeneratedCopy>> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockGenerateFromImages(style, brand, model);
    }
    const urlObjs: Object[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      urlObjs.push(imageUrls[i]);
    }
    const body: Record<string, Object> = {
      'imageUrls': urlObjs,
      'style': style,
      'brand': brand,
      'model': model,
    };
    return await HttpClient.post<AiGeneratedCopy>(
      '/api/ai/image-to-text', toPostBody(body),
      (data: Record<string, Object>): AiGeneratedCopy => {
        return AiGeneratedCopy.fromJson(data);
      });
  }

  private mockGenerateFromImages(style: string, brand: string, model: string): ApiResponse<AiGeneratedCopy> {
    const result: AiGeneratedCopy = new AiGeneratedCopy();
    const brandName: string = brand.length > 0 ? brand : '汽车';
    const modelName: string = model.length > 0 ? model : '';
    const carLabel: string = brandName + (modelName.length > 0 ? (' ' + modelName) : '');
    result.style = style.length > 0 ? style : 'professional';
    result.sourceType = 'image';
    result.text = '基于' + carLabel + '实拍图生成的推广文案：外观设计简洁大气，线条流畅，内饰用料考究，科技感十足。无论是城市通勤还是长途出行，都能带来舒适愉悦的驾驶体验。';
    result.tags = [brandName, '实拍', '外观评测'];
    return new ApiResponse<AiGeneratedCopy>(true, result, '');
  }

  async recommendTopics(userId: string, interestTags: string[], carModels: string[]): Promise<ApiResponse<AiTopicRecommendation[]>> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockRecommendTopics();
    }
    const tagObjs: Object[] = [];
    for (let i = 0; i < interestTags.length; i++) {
      tagObjs.push(interestTags[i]);
    }
    const modelObjs: Object[] = [];
    for (let i = 0; i < carModels.length; i++) {
      modelObjs.push(carModels[i]);
    }
    const body: Record<string, Object> = {
      'userId': userId,
      'interestTags': tagObjs,
      'carModels': modelObjs,
    };
    return await HttpClient.post<AiTopicRecommendation[]>(
      '/api/ai/topics-recommend', toPostBody(body),
      (data: Record<string, Object>): AiTopicRecommendation[] => {
        const arr: Record<string, Object>[] = [];
        const val: Object | undefined = data['topics'];
        if (val !== null && val !== undefined && Array.isArray(val)) {
          const rawArr: Object[] = val as Object[];
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: AiTopicRecommendation[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(AiTopicRecommendation.fromJson(arr[i]));
        }
        return result;
      });
  }

  private mockRecommendTopics(): ApiResponse<AiTopicRecommendation[]> {
    const topics: AiTopicRecommendation[] = [];
    const t1: AiTopicRecommendation = new AiTopicRecommendation();
    t1.id = 'topic_1';
    t1.title = '2026新能源车续航实测横评';
    t1.summary = '主流新能源车型真实续航对比，覆盖市区/高速/低温场景';
    t1.hotScore = 98;
    t1.category = 'new_energy';
    t1.suggestedAngles = ['低温续航衰减', '快充速度对比', '日常通勤实测'];
    t1.carModels = ['比亚迪汉EV', '特斯拉Model 3', '小鹏P7'];
    t1.isOriginal = true;
    topics.push(t1);

    const t2: AiTopicRecommendation = new AiTopicRecommendation();
    t2.id = 'topic_2';
    t2.title = '智能驾驶L2+实测谁最强';
    t2.summary = '华为ADS vs 特斯拉FSD vs 小鹏XNGP实战对比';
    t2.hotScore = 95;
    t2.category = 'smart_drive';
    t2.suggestedAngles = ['高速NOA对比', '城区辅助驾驶', '自动泊车体验'];
    t2.carModels = ['问界M5', '特斯拉Model Y', '小鹏G6'];
    t2.isOriginal = true;
    topics.push(t2);

    const t3: AiTopicRecommendation = new AiTopicRecommendation();
    t3.id = 'topic_3';
    t3.title = '10万级家轿谁是性价比之王';
    t3.summary = '紧凑型家轿全面对比：空间、动力、油耗、保值率';
    t3.hotScore = 90;
    t3.category = 'brand_compare';
    t3.suggestedAngles = ['用车成本计算', '三年保值率', '家庭出行体验'];
    t3.carModels = ['朗逸', '轩逸', '秦PLUS DM-i'];
    topics.push(t3);

    const t4: AiTopicRecommendation = new AiTopicRecommendation();
    t4.id = 'topic_4';
    t4.title = '车圈热梗：这车也太卷了';
    t4.summary = '2026最火汽车梗盘点，二创素材库';
    t4.hotScore = 87;
    t4.category = 'entertainment';
    t4.suggestedAngles = ['价格战名场面', '车主神评论', '品牌互怼合集'];
    t4.carModels = [];
    topics.push(t4);

    const t5: AiTopicRecommendation = new AiTopicRecommendation();
    t5.id = 'topic_5';
    t5.title = '混动技术路线大解析';
    t5.summary = '增程 vs 插混 vs 油混，到底选哪个？';
    t5.hotScore = 85;
    t5.category = 'new_energy';
    t5.suggestedAngles = ['技术原理通俗讲', '真实油耗对比', '适合人群分析'];
    t5.carModels = ['理想L7', '比亚迪宋DM-i', '丰田凯美瑞双擎'];
    topics.push(t5);

    return new ApiResponse<AiTopicRecommendation[]>(true, topics, '');
  }

  async matchCarInterest(userId: string, preferences: string, budget: string): Promise<ApiResponse<AiCarMatchResult>> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockMatchCarInterest();
    }
    const body: Record<string, Object> = {
      'userId': userId,
      'preferences': preferences,
      'budget': budget,
    };
    return await HttpClient.post<AiCarMatchResult>(
      '/api/ai/car-match', toPostBody(body),
      (data: Record<string, Object>): AiCarMatchResult => {
        return AiCarMatchResult.fromJson(data);
      });
  }

  private mockMatchCarInterest(): ApiResponse<AiCarMatchResult> {
    const result: AiCarMatchResult = new AiCarMatchResult();
    const m1: AiCarMatchItem = new AiCarMatchItem();
    m1.brand = '比亚迪';
    m1.model = '秦PLUS DM-i';
    m1.matchScore = 0.92;
    m1.priceRange = '9.98-17.68万';
    m1.highlights = ['超低油耗', 'DM-i混动', '大空间'];
    m1.imageTag = '新能源';
    result.matchedModels.push(m1);

    const m2: AiCarMatchItem = new AiCarMatchItem();
    m2.brand = '特斯拉';
    m2.model = 'Model 3';
    m2.matchScore = 0.85;
    m2.priceRange = '23.19-33.19万';
    m2.highlights = ['纯电续航长', '智能驾驶', '品牌效应'];
    m2.imageTag = '科技';
    result.matchedModels.push(m2);

    const m3: AiCarMatchItem = new AiCarMatchItem();
    m3.brand = '丰田';
    m3.model = '凯美瑞';
    m3.matchScore = 0.78;
    m3.priceRange = '17.18-26.88万';
    m3.highlights = ['可靠耐用', '保值率高', '省心'];
    m3.imageTag = '品质';
    result.matchedModels.push(m3);

    result.interestTags = ['新能源', '智能科技', '性价比'];
    return new ApiResponse<AiCarMatchResult>(true, result, '');
  }

  async optimizeBooking(userId: string, activityId: string): Promise<ApiResponse<AiBookingSuggestion>> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockOptimizeBooking();
    }
    const body: Record<string, Object> = {
      'userId': userId,
      'activityId': activityId,
    };
    return await HttpClient.post<AiBookingSuggestion>(
      '/api/ai/booking-optimize', toPostBody(body),
      (data: Record<string, Object>): AiBookingSuggestion => {
        return AiBookingSuggestion.fromJson(data);
      });
  }

  private mockOptimizeBooking(): ApiResponse<AiBookingSuggestion> {
    const result: AiBookingSuggestion = new AiBookingSuggestion();
    result.bestTimeSlot = '周六 14:00-16:00';
    result.recommendedDealer = '城市展厅中心店（距您3.2km）';
    result.reminderScript = '您的试驾预约在明天14:00，请携带驾照准时到店。如需改期请提前2小时联系。';
    result.preparationTips = ['携带驾驶证原件', '穿舒适驾驶的鞋', '提前想好想体验的功能', '可带家人一同体验后排空间'];
    result.voiceReminderEnabled = true;
    return new ApiResponse<AiBookingSuggestion>(true, result, '');
  }

  async queryKnowledge(question: string, userId: string): Promise<ApiResponse<AiKnowledgeAnswer>> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockQueryKnowledge(question);
    }
    const body: Record<string, Object> = {
      'question': question,
      'topK': AI_CONFIG.AI_RAG_TOP_K,
      'userId': userId,
    };
    return await HttpClient.post<AiKnowledgeAnswer>(
      '/api/ai/knowledge/query', toPostBody(body),
      (data: Record<string, Object>): AiKnowledgeAnswer => {
        return AiKnowledgeAnswer.fromJson(data);
      });
  }

  private mockQueryKnowledge(question: string): ApiResponse<AiKnowledgeAnswer> {
    const result: AiKnowledgeAnswer = new AiKnowledgeAnswer();
    result.question = question;
    const q: string = question.toLowerCase();
    if (q.indexOf('混动') >= 0 || q.indexOf('插混') >= 0 || q.indexOf('增程') >= 0) {
      result.answer = '混动汽车主要有三种技术路线：1)插电混动(Plug-in HEV)：可外接充电，短途纯电长途油电，如比亚迪DM-i；2)增程式(EREV)：发动机只发电不驱动，纯电行驶，如理想L系列；3)油电混动(HEV)：不可外充，自动切换油电，如丰田双擎。选择建议：有充电条件→插混；无充电条件→增程或油混。';
      result.category = 'new_energy';
    } else if (q.indexOf('续航') >= 0 || q.indexOf('电池') >= 0) {
      result.answer = '影响电动车续航的主要因素：1)温度：低温可降30-40%；2)速度：高速比市区多耗20-30%；3)空调：制热比制冷更耗电；4)载重：每增100kg约降3-5%。建议：冬季提前预热电池，高速保持100-110km/h，合理使用座椅加热替代空调。';
      result.category = 'ev';
    } else if (q.indexOf('保养') >= 0 || q.indexOf('维修') >= 0) {
      result.answer = '新能源汽车保养要点：1)电池健康：避免频繁快充，保持20-80%电量最佳；2)轮胎：电车扭矩大，轮胎磨损比油车快约20%；3)制动：动能回收减少刹车片磨损；4)空调：定期更换滤芯；5)冷却液：电池散热系统需定期检查。保养周期一般1万公里或6个月。';
      result.category = 'maintenance';
    } else {
      result.answer = '关于"' + question + '"，汽车知识库正在持续扩充中。您可以尝试搜索"混动"、"续航"、"保养"等关键词，或贡献您的专业知识帮助完善知识库。';
    }
    result.confidence = 0.85;
    const relatedQa: AiKnowledgeQA = new AiKnowledgeQA();
    relatedQa.id = 'related_1';
    relatedQa.question = '如何选择适合自己的新能源车型？';
    relatedQa.answer = '根据充电条件、日常里程、预算三个维度选择...';
    relatedQa.category = 'purchase';
    relatedQa.sourceType = 'expert';
    result.relatedQA.push(relatedQa);
    return new ApiResponse<AiKnowledgeAnswer>(true, result, '');
  }

  async getKnowledgeStats(): Promise<ApiResponse<Record<string, Object>>> {
    if (AI_CONFIG.AI_MOCK_MODE) {
      const stats: Record<string, Object> = {
        'totalQA': 12850,
        'targetQA': AI_CONFIG.AI_KNOWLEDGE_QA_TARGET,
        'categories': 6,
        'contributorCount': 342,
        'topCategory': 'new_energy',
      };
      return new ApiResponse<Record<string, Object>>(true, stats, '');
    }
    return await HttpClient.get<Record<string, Object>>(
      '/api/ai/knowledge/stats',
      (data: Record<string, Object>): Record<string, Object> => { return data; });
  }

  async getHotTopics(category: string): Promise<ApiResponse<AiTopicRecommendation[]>> {
    const catParam: string = category.length > 0 ? '?category=' + category : '';
    if (AI_CONFIG.AI_MOCK_MODE) {
      return this.mockRecommendTopics();
    }
    return await HttpClient.get<AiTopicRecommendation[]>(
      '/api/ai/topics/hot' + catParam,
      (data: Record<string, Object>): AiTopicRecommendation[] => {
        const arr: Record<string, Object>[] = [];
        const val: Object | undefined = data['topics'];
        if (val !== null && val !== undefined && Array.isArray(val)) {
          const rawArr: Object[] = val as Object[];
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: AiTopicRecommendation[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(AiTopicRecommendation.fromJson(arr[i]));
        }
        return result;
      });
  }
}
