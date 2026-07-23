import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { SettlementItem, SettlementList, SettlementStats } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandSeal, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct SettlementPage {
  @State settlements: SettlementItem[] = [];
  @State stats: SettlementStats | null = null;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentTab: number = 0;
  @State tabLabels: string[] = ['\u5168\u90E8', '\u5DF2\u5B8C\u6210', '\u5F85\u6267\u884C'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadSettlements();
    await this.loadStats();
    this.loading = false;
    this.refreshing = false;
  }

  private async loadSettlements() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const statusFilter: string = this.currentTab === 0 ? '' : (this.currentTab === 1 ? 'completed' : 'pending');
    const path: string = '/api/settlement/list?userId=' + uid + (statusFilter.length > 0 ? '&status=' + statusFilter : '');
    const resp: ApiResponse<SettlementItem[]> = await HttpClient.get<SettlementItem[]>(path, (data: Record<string, Object>): SettlementItem[] => {
      return SettlementList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) { this.settlements = resp.data; }
  }

  private async loadStats() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<SettlementStats> = await HttpClient.get<SettlementStats>(
      '/api/settlement/stats?userId=' + uid,
      (data: Record<string, Object>): SettlementStats => { return SettlementStats.fromJson(data); });
    if (resp.success && resp.data !== null) { this.stats = resp.data; }
  }

  private async executeSettlement(item: SettlementItem) {
    const emptyBody: Record<string, Object> = {};
    const resp: ApiResponse<SettlementItem> = await HttpClient.post<SettlementItem>(
      '/api/settlement/' + item.id + '/execute', emptyBody,
      (data: Record<string, Object>): SettlementItem => { return SettlementItem.fromJson(data); });
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '\u7ED3\u7B97\u6267\u884C\u6210\u529F' });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '\u7ED3\u7B97\u6267\u884C\u5931\u8D25' });
    }
  }

  private getStatusBg(status: string): string {
    if (status === 'completed') return BrandBadge.GREEN_BG;
    if (status === 'pending') return BrandBadge.BLUE_BG;
    if (status === 'failed') return BrandBadge.RED_BG;
    return BrandBadge.GOLD_BG;
  }

  private getStatusTextColor(status: string): string {
    if (status === 'completed') return BrandBadge.GREEN_TEXT;
    if (status === 'pending') return BrandBadge.BLUE_TEXT;
    if (status === 'failed') return BrandBadge.RED_TEXT;
    return BrandBadge.GOLD_TEXT;
  }

  private getStatusLabel(status: string): string {
    if (status === 'pending') return '\u5F85\u6267\u884C';
    if (status === 'processing') return '\u5904\u7406\u4E2D';
    if (status === 'completed') return '\u5DF2\u5B8C\u6210';
    if (status === 'failed') return '\u5931\u8D25';
    return status;
  }

  private getTypeLabel(type: string): string {
    if (type === 'kol_commission') return 'KOL\u5206\u4F63';
    if (type === 'booking_reward') return '\u9884\u7EA6\u5956\u52B1';
    if (type === 'content_reward') return '\u5185\u5BB9\u5956\u52B1';
    if (type === 'data_earnings') return '\u6570\u636E\u6536\u76CA';
    return type;
  }

  private getTypeBg(type: string): string {
    if (type === 'kol_commission') return BrandBadge.GREEN_BG;
    if (type === 'booking_reward') return BrandBadge.GOLD_BG;
    if (type === 'content_reward') return BrandBadge.PURPLE_BG;
    if (type === 'data_earnings') return BrandBadge.BLUE_BG;
    return BrandBadge.CYAN_BG;
  }

  private getTypeTextColor(type: string): string {
    if (type === 'kol_commission') return BrandBadge.GREEN_TEXT;
    if (type === 'booking_reward') return BrandBadge.GOLD_TEXT;
    if (type === 'content_reward') return BrandBadge.PURPLE_TEXT;
    if (type === 'data_earnings') return BrandBadge.BLUE_TEXT;
    return BrandBadge.CYAN_TEXT;
  }

  build() {
    Column() {
      Row() {
        Text('\u5FAE\u4EA4\u6613\u7ED3\u7B97')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH)
            .fontSize(14)
            .fontColor(BrandPalette.SEAL_RED)
            .opacity(0.6)
          Text('SETTLE')
            .fontSize(10)
            .fontColor(BrandPalette.NEON_BLUE)
            .letterSpacing(2)
            .margin({ left: 4 })
        }
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      Row() {
        Column() {
          Text('\u{1F4CA}').fontSize(20)
          Text('\u52A0\u6743\u7ED3\u7B97').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).padding(8).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        .onClick(() => { router.pushUrl({ url: 'pages/pageWeightedSettle/PageWeightedSettlePage' }); })
        Column() {
          Text('\u{1F48E}').fontSize(20)
          Text('\u5B58\u8BC1\u4F30\u503C').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).padding(8).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid }).margin({ left: 8 })
        .onClick(() => { router.pushUrl({ url: 'pages/weightedValuation/WeightedValuationPage' }); })
        Column() {
          Text('\u{1F4DC}').fontSize(20)
          Text('\u5408\u540C\u9A8C\u8BC1').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).padding(8).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid }).margin({ left: 8 })
        .onClick(() => { router.pushUrl({ url: 'pages/contractVerify/ContractVerifyPage' }); })
      }.width('100%').padding({ left: 16, right: 16, top: 0, bottom: 8 })

      if (this.stats !== null) {
        Column() {
          Row() {
            Column() {
              Text('\u00A5' + this.stats.totalIncome.toFixed(2))
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
              Text('\u603B\u6536\u5165').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text('\u00A5' + this.stats.totalExpense.toFixed(2))
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
              Text('\u603B\u652F\u51FA').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text('\u00A5' + this.stats.totalFee.toFixed(2))
                .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_MUTED)
              Text('\u624B\u7EED\u8D39').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text(this.stats.pendingCount.toString())
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.NEON_BLUE)
              Text('\u5F85\u7ED3\u7B97').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
          }.width('100%')

          if (this.stats.completedCount > 0) {
            Row() {
              Text(BrandIcon.CHAIN_LINK)
                .fontSize(12)
                .fontColor(BrandPalette.SEAL_RED)
              Text('\u5330\u5370\u5B58\u8BC1 ' + this.stats.completedCount + ' \u7B14')
                .fontSize(11)
                .fontColor(BrandPalette.TEXT_MUTED)
                .margin({ left: 4 })
            }
            .width('100%')
            .margin({ top: 8 })
            .padding({ left: 4 })
          }
        }
        .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      }

      Row() {
        ForEach(this.tabLabels, (label: string, index: number) => {
          Column() {
            Text(label)
              .fontSize(14)
              .fontWeight(this.currentTab === index ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === index ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
            if (this.currentTab === index) {
              Column().width(16).height(2).borderRadius(1).backgroundColor(BrandPalette.PRIMARY)
                .shadow({ radius: 6, color: '#00E5A044', offsetX: 0, offsetY: 0 }).margin({ top: 4 })
            }
          }
          .padding({ left: 12, right: 12, bottom: 8 })
          .onClick(() => { this.currentTab = index; this.loadSettlements(); })
        }, (label: string, index: number) => label + '_' + index.toString())
      }.width('100%').padding({ left: 16, top: 12 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else if (this.settlements.length === 0) {
        Column() {
          Text('\u6682\u65E0\u7ED3\u7B97\u8BB0\u5F55').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 8 }) {
            ForEach(this.settlements, (item: SettlementItem) => {
              ListItem() { this.SettlementCard(item) }
            }, (item: SettlementItem) => item.id)
          }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
        }.onRefreshing(() => { this.loadData(); })
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  SettlementCard(item: SettlementItem) {
    Column() {
      Row() {
        Text(this.getTypeLabel(item.type))
          .fontSize(11).fontColor(this.getTypeTextColor(item.type))
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(this.getTypeBg(item.type))
        Text(item.description.length > 0 ? item.description : '\u7ED3\u7B97')
          .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1).margin({ left: 8 })
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
        Text('\u00A5' + item.netAmount.toFixed(2))
          .fontSize(16).fontWeight(FontWeight.Bold)
          .fontColor(item.toUserId === this.userId ? BrandPalette.GOLD : BrandPalette.TEXT_PRIMARY)
      }.width('100%')

      Row() {
        Text(this.getStatusLabel(item.status))
          .fontSize(11).fontColor(this.getStatusTextColor(item.status))
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(this.getStatusBg(item.status))

        if (item.hashProof.length > 0) {
          Row() {
            Text(BrandIcon.SEAL_GLYPH)
              .fontSize(10)
              .fontColor(BrandPalette.SEAL_RED)
            Text('HASH')
              .fontSize(9).fontColor(BrandPalette.PRIMARY).letterSpacing(1)
          }
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor('#00E5A018').margin({ left: 6 })
        }
        if (item.aiVerified) {
          Text('AI\u2713')
            .fontSize(9).fontColor(BrandPalette.NEON_BLUE).letterSpacing(1)
            .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
            .backgroundColor(BrandBadge.BLUE_BG).margin({ left: 6 })
        }
        Blank()
        Text('FEE \u00A5' + item.fee.toFixed(2)).fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
      }.width('100%').margin({ top: 6 })

      Row() {
        Text(item.createdAt.slice(0, 16).replace('T', ' ')).fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
        Blank()
        if (item.status === 'pending' && item.fromUserId === this.userId) {
          Button('\u6267\u884C\u7ED3\u7B97')
            .height(28).fontSize(12)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG).borderRadius(14)
            .onClick(() => this.executeSettlement(item))
        }
      }.width('100%').margin({ top: 4 })
    }
    .width('100%').padding(12).borderRadius(BrandRadius.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }
}
