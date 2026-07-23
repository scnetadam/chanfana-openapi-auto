import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { AiInsightItem, AiInsightList, AiValueDashboard } from '../../model/DataModels';
import { WalletData } from '../../model/DataModels';
import { BrandPalette, BrandGradient, BrandTypography, BrandRadius, BrandSpacing, BrandBadge } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';
import { VoiceService } from '../../common/AiVoiceService';

@Component
export struct AiDashboardPage {
  @State insights: AiInsightItem[] = [];
  @State insightSummary: string = '';
  @State valueDashboard: AiValueDashboard | null = null;
  @State wallet: WalletData | null = null;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';
  @State isSpeaking: boolean = false;
  private voiceService: VoiceService = VoiceService.getInstance();

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await this.loadInsights();
    await this.loadValueDashboard();
    await this.loadWallet();
    this.loading = false;
    this.refreshing = false;
  }

  private async loadInsights() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const body: Record<string, Object> = { 'userId': uid };
    const resp: ApiResponse<AiInsightList> = await HttpClient.post<AiInsightList>(
      '/api/ai/insight', toPostBody(body),
      (data: Record<string, Object>): AiInsightList => { return AiInsightList.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.insights = resp.data.insights;
      this.insightSummary = resp.data.summary;
    }
  }

  private async loadValueDashboard() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<AiValueDashboard> = await HttpClient.get<AiValueDashboard>(
      '/api/ai/value-dashboard?userId=' + uid,
      (data: Record<string, Object>): AiValueDashboard => { return AiValueDashboard.fromJson(data); });
    if (resp.success && resp.data !== null) { this.valueDashboard = resp.data; }
  }

  private async loadWallet() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<WalletData> = await HttpClient.get<WalletData>(
      '/api/wallet/balance?userId=' + uid,
      (data: Record<string, Object>): WalletData => { return WalletData.fromJson(data); });
    if (resp.success && resp.data !== null) { this.wallet = resp.data; }
  }

  private broadcastInsights() {
    if (this.insightSummary.length > 0) {
      this.voiceService.speak(this.insightSummary, () => { this.isSpeaking = false; });
      this.isSpeaking = true;
    }
  }

  build() {
    Column() {
      Row() {
        Text('AI加权评估')
          .fontSize(BrandTypography.PAGE_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          if (this.insightSummary.length > 0) {
            if (this.isSpeaking) {
              Text('STOP')
                .fontSize(10)
                .fontColor(BrandPalette.CYBER_RED)
                .backgroundColor(BrandBadge.RED_BG)
                .borderRadius(10)
                .padding({ left: 10, right: 10, top: 4, bottom: 4 })
                .onClick(() => { this.voiceService.stopSpeak(); this.isSpeaking = false; })
            } else {
              Text('VOICE')
                .fontSize(10)
                .fontColor(BrandPalette.DEEP_BG)
                .backgroundColor(BrandPalette.PRIMARY)
                .borderRadius(10)
                .padding({ left: 10, right: 10, top: 4, bottom: 4 })
                .shadow({ radius: 8, color: '#00E5A033', offsetX: 0, offsetY: 2 })
                .onClick(() => this.broadcastInsights())
            }
          }
          Text('AI')
            .fontSize(10)
            .fontColor(BrandPalette.ACCENT)
            .backgroundColor(BrandBadge.PURPLE_BG)
            .borderRadius(10)
            .padding({ left: 10, right: 10, top: 4, bottom: 4 })
            .margin({ left: 6 })
            .onClick(() => { router.pushUrl({ url: 'pages/aivoice/AiVoiceAssistantPage' }); })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          Scroll() {
            Column() {
              if (this.valueDashboard !== null) {
                this.ValueHeroCard()
              }
              if (this.valueDashboard !== null) {
                this.WeightMetricsCard()
              }
              if (this.valueDashboard !== null) {
                this.StatsRow()
              }
              if (this.wallet !== null) {
                this.WalletRow()
              }
              this.AiToolsLink()
              this.InsightsSection()
            }
          }.layoutWeight(1)
        }.onRefreshing(() => { this.loadData(); })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  ValueHeroCard() {
    Column() {
      Row() {
        Text('AI VALUE INDEX')
          .fontSize(11)
          .fontColor(BrandPalette.PRIMARY)
          .letterSpacing(2)
          .opacity(0.9)
        Blank()
        Text('KOL: ' + this.valueDashboard!.kolScore.toString())
          .fontSize(12)
          .fontColor(BrandPalette.TEXT_SECONDARY)
          .letterSpacing(1)
      }.width('100%')

      Row() {
        Column() {
          Text('\u00A5' + this.valueDashboard!.totalEarned.toFixed(2))
            .fontSize(24).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          Text('总收益').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        Column().width(1).height(36).backgroundColor('#FFFFFF18')
        Column() {
          Text(this.valueDashboard!.avgWeightMultiplier.toFixed(2))
            .fontSize(24).fontWeight(FontWeight.Bold).fontColor(BrandPalette.NEON_BLUE)
          Text('加权乘数').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        Column().width(1).height(36).backgroundColor('#FFFFFF18')
        Column() {
          Text(this.valueDashboard!.kolValue.toFixed(0))
            .fontSize(24).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
          Text('KOL价值').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
      }.width('100%').margin({ top: 16 })
    }
    .width('100%').padding(20).borderRadius(BrandRadius.CARD)
    .linearGradient({ direction: GradientDirection.Right, colors: [['#8B5CF6', 0.0], ['#6366F1', 0.5], ['#00B4D8', 1.0]] })
    .margin({ left: 16, right: 16 })
    .shadow({ radius: 16, color: '#8B5CF633', offsetX: 0, offsetY: 4 })
  }

  @Builder
  WeightMetricsCard() {
    Column() {
      Text('WEIGHT METRICS')
        .fontSize(11).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).width('100%').margin({ bottom: 12 })
      Row() {
        Column() {
          Text(this.valueDashboard!.spreadWeight.toFixed(2))
            .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
          Text('传播权重').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
          Text('阅读 · 分享 · 覆盖').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        Column() {
          Text(this.valueDashboard!.conversionWeight.toFixed(2))
            .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.CYBER_RED)
          Text('转化权重').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
          Text('预约 · 成交 · 核销').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        Column() {
          Text(this.valueDashboard!.qualityWeight.toFixed(2))
            .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
          Text('质量权重').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
          Text('内容 · 评分 · 反馈').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
      }.width('100%').margin({ top: 8 })

      Column() {
        Row() {
          Text('SPREAD').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).letterSpacing(1).width(50)
          Progress({ value: this.valueDashboard!.spreadWeight * 100, total: 100, type: ProgressType.Linear })
            .layoutWeight(1).height(4).color(BrandPalette.PRIMARY).backgroundColor('#00E5A015')
        }.width('100%').margin({ top: 12 })
        Row() {
          Text('CONVERT').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).letterSpacing(1).width(50)
          Progress({ value: this.valueDashboard!.conversionWeight * 100, total: 100, type: ProgressType.Linear })
            .layoutWeight(1).height(4).color(BrandPalette.CYBER_RED).backgroundColor('#FF3D7115')
        }.width('100%').margin({ top: 8 })
        Row() {
          Text('QUALITY').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).letterSpacing(1).width(50)
          Progress({ value: this.valueDashboard!.qualityWeight * 100, total: 100, type: ProgressType.Linear })
            .layoutWeight(1).height(4).color(BrandPalette.GOLD).backgroundColor('#F0B90B15')
        }.width('100%').margin({ top: 8 })
      }.width('100%')
    }
    .width('100%').padding(16).borderRadius(BrandRadius.CARD)
    .backgroundColor(BrandPalette.CARD_BG).margin({ left: 16, right: 16, top: 12 })
    .alignItems(HorizontalAlign.Start)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }

  @Builder
  StatsRow() {
    Row() {
      Column() {
        Text(this.valueDashboard!.contentCount.toString())
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Text('内容数').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
      }.layoutWeight(1).alignItems(HorizontalAlign.Center)
      Column().width(1).height(32).backgroundColor(BrandPalette.DIVIDER)
      Column() {
        Text(this.valueDashboard!.realTimeSettlements.toString())
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
        Text('实时结算').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
      }.layoutWeight(1).alignItems(HorizontalAlign.Center)
      Column().width(1).height(32).backgroundColor(BrandPalette.DIVIDER)
      Column() {
        Text('\u00A5' + this.valueDashboard!.pendingSettlementAmount.toFixed(2))
          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.CYBER_RED)
        Text('待结算').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
      }.layoutWeight(1).alignItems(HorizontalAlign.Center)
    }
    .width('100%').height(72).margin({ left: 16, right: 16, top: 12 })
    .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }

  @Builder
  WalletRow() {
    Row() {
      Column() {
        Text('\u00A5' + this.wallet!.promotionBalance.toFixed(2))
          .fontSize(18).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
        Text('推广金余额').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
      }.layoutWeight(1).alignItems(HorizontalAlign.Center)
      Column().width(1).height(32).backgroundColor(BrandPalette.DIVIDER)
      Column() {
        Text(this.wallet!.reputationScore.toString())
          .fontSize(18).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
        Text('口碑值').fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 2 })
      }.layoutWeight(1).alignItems(HorizontalAlign.Center)
    }
    .width('100%').height(72).margin({ left: 16, right: 16, top: 12 })
    .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }

  @Builder
  AiToolsLink() {
    Row() {
      Text('AI工具市场').fontSize(15).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1)
      Text('>')
        .fontSize(13).fontColor(BrandPalette.PRIMARY)
        .onClick(() => { router.pushUrl({ url: 'pages/aitools/AiToolsPage' }); })
    }.width('100%').padding({ left: 16, right: 16, top: 16 })
  }

  @Builder
  InsightsSection() {
    Column() {
      Text('AI INSIGHTS')
        .fontSize(11).fontColor(BrandPalette.ACCENT).letterSpacing(2).width('100%')
      if (this.insightSummary.length > 0) {
        Text(this.insightSummary)
          .fontSize(13).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 8 }).width('100%')
      }
      if (this.insights.length === 0) {
        Text('暂无洞察，发布内容后AI将生成个性化建议')
          .fontSize(14).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 16 }).width('100%').textAlign(TextAlign.Center)
      } else {
        Column() {
          ForEach(this.insights, (item: AiInsightItem, index: number) => {
            this.InsightCard(item, index)
          }, (item: AiInsightItem, index: number) => item.type + '_' + index.toString())
        }.width('100%').margin({ top: 12 })
      }
    }
    .width('100%').padding(16).margin({ top: 4 }).alignItems(HorizontalAlign.Start)
  }

  @Builder
  InsightCard(item: AiInsightItem, index: number) {
    Row() {
      Column() {
        Text((index + 1).toString())
          .fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
      }
      .width(32).height(32).borderRadius(10).justifyContent(FlexAlign.Center)
      .backgroundColor(BrandBadge.GREEN_BG)
      .margin({ right: 12 })

      Column() {
        Text(item.title)
          .fontSize(15).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
        Text(item.detail)
          .fontSize(13).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 4 }).width('100%').lineHeight(20)
      }.layoutWeight(1).alignItems(HorizontalAlign.Start)
    }
    .width('100%').padding(12).borderRadius(BrandRadius.MD)
    .backgroundColor(BrandPalette.CARD_BG).margin({ top: 8 })
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }
}
