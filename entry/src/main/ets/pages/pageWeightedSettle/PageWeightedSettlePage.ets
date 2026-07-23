import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { PageWeightedSettlement, PageWeightedSettlementList, WeightedSettleStats, BudgetPoolItem } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct PageWeightedSettlePage {
  @State settlements: PageWeightedSettlement[] = [];
  @State stats: WeightedSettleStats | null = null;
  @State budgets: BudgetPoolItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadStats();
    await this.loadBudgets();
    await this.loadRecords();
    this.loading = false;
    this.refreshing = false;
  }

  private async loadStats() {
    const resp: ApiResponse<WeightedSettleStats> = await HttpClient.get<WeightedSettleStats>(
      '/api/page-weighted-settle/stats',
      (data: Record<string, Object>): WeightedSettleStats => { return WeightedSettleStats.fromJson(data); });
    if (resp.success && resp.data !== null) { this.stats = resp.data; }
  }

  private async loadBudgets() {
    const resp: ApiResponse<BudgetPoolItem[]> = await HttpClient.get<BudgetPoolItem[]>(
      '/api/page-weighted-settle/budget/list',
      (data: Record<string, Object>): BudgetPoolItem[] => {
        const arr: Object[] = data['budgetPools'] as Object[] || data as Object[] as Object[];
        const result: BudgetPoolItem[] = [];
        if (Array.isArray(arr)) {
          for (let i = 0; i < arr.length; i++) {
            const item: Object = arr[i];
            if (item !== null && item !== undefined && typeof item === 'object') {
              result.push(BudgetPoolItem.fromJson(item as Record<string, Object>));
            }
          }
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.budgets = resp.data; }
  }

  private async loadRecords() {
    const uid: string = this.userId;
    const path: string = '/api/page-weighted-settle/records' + (uid.length > 0 ? '?userId=' + uid + '&page=1' : '?page=1');
    const resp: ApiResponse<PageWeightedSettlement[]> = await HttpClient.get<PageWeightedSettlement[]>(
      path,
      (data: Record<string, Object>): PageWeightedSettlement[] => {
        return PageWeightedSettlementList.fromJson(data).items;
      });
    if (resp.success && resp.data !== null) { this.settlements = resp.data; }
  }

  private getStatusLabel(status: string): string {
    if (status === 'settled') return '已结算';
    if (status === 'paid') return '已支付';
    if (status === 'settled_local') return '本地结算';
    if (status === 'pending') return '待结算';
    return status;
  }

  private getStatusColor(status: string): string {
    if (status === 'paid' || status === 'settled') return BrandPalette.GOLD;
    if (status === 'settled_local') return '#d97706';
    return BrandPalette.TEXT_MUTED;
  }

  build() {
    Column() {
      Row() {
        Text('页面访问加权结算')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('PWS').fontSize(10).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).margin({ left: 4 })
        }
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.stats !== null) {
        Column() {
          Text('结算总览').fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
            .width('100%').margin({ bottom: 8 })
          Row() {
            Column() {
              Text(this.stats.totalSettlements.toString())
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
              Text('结算笔数').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text('\u00A5' + this.stats.totalAmount.toFixed(2))
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
              Text('结算总额').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text('\u00A5' + this.stats.totalContributorEarnings.toFixed(2))
                .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
              Text('贡献者收益').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text(this.stats.avgScore.toFixed(3))
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.NEON_BLUE)
              Text('平均权重').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
          }.width('100%')

          Row() {
            Text(BrandIcon.SEAL_GLYPH).fontSize(12).fontColor(BrandPalette.SEAL_RED)
            Text('公证存证 ' + this.stats.notarizedCount + ' 笔 | 平台费 \u00A5' + this.stats.totalPlatformFee.toFixed(2))
              .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 4 })
          }.width('100%').margin({ top: 8 }).padding({ left: 4 })
        }
        .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      }

      if (this.budgets.length > 0) {
        Column() {
          Text('B端预算池').fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
            .width('100%').margin({ bottom: 8 })
          ForEach(this.budgets, (budget: BudgetPoolItem) => {
            Column() {
              Row() {
                Text(budget.projectName).fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_PRIMARY)
                Blank()
                Text(budget.status === 'active' ? '运行中' : '已暂停')
                  .fontSize(11)
                  .fontColor(budget.status === 'active' ? '#16a34a' : '#d97706')
                  .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
                  .backgroundColor(budget.status === 'active' ? '#dcfce7' : '#fef3c7')
              }.width('100%')
              Progress({ value: budget.usedBudget, total: budget.totalBudget, type: ProgressType.Linear })
                .width('100%').margin({ top: 6 }).color(BrandPalette.PRIMARY)
                .backgroundColor(BrandPalette.DIVIDER)
              Row() {
                Text('已用 \u00A5' + budget.usedBudget.toFixed(0) + ' / \u00A5' + budget.totalBudget.toFixed(0))
                  .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text('剩余 \u00A5' + budget.remaining.toFixed(0)).fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              }.width('100%').margin({ top: 4 })
              if (budget.alertTriggered) {
                Text('\u26A0\uFE0F 预算不足预警').fontSize(11).fontColor('#dc2626').margin({ top: 4 })
              }
            }.width('100%').padding({ top: 8, bottom: 8 })
            .border({ width: 0, style: BorderStyle.Solid })
          }, (budget: BudgetPoolItem) => budget.id)
        }
        .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      }

      Column() {
        Text('加权维度').fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
          .width('100%').margin({ bottom: 8 })
        Row() {
          Text('算力权重 15% | 访问频次 12% | 停留时长 18% | 内容深度 20%')
            .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).layoutWeight(1)
        }.width('100%')
        Row() {
          Text('互动行为 15% | 平台深度 10% | 分享归因 5% | 跨项目协同 5%')
            .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).layoutWeight(1)
        }.width('100%').margin({ top: 4 })
      }
      .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
      .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
      .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else if (this.settlements.length === 0) {
        Column() {
          Text('暂无结算记录').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 8 }) {
            ForEach(this.settlements, (item: PageWeightedSettlement) => {
              ListItem() { this.SettlementCard(item) }
            }, (item: PageWeightedSettlement) => item.id)
          }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
        }.onRefreshing(() => { this.loadData(); })
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  SettlementCard(item: PageWeightedSettlement) {
    Column() {
      Row() {
        Text(this.getStatusLabel(item.status))
          .fontSize(11).fontColor(this.getStatusColor(item.status))
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(BrandBadge.GOLD_BG)
        Text(item.project === 'guiniu-zy' ? '自驭' : item.project === 'guiniu-yx' ? '印信' : '印证')
          .fontSize(11).fontColor(BrandPalette.NEON_BLUE)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(BrandBadge.BLUE_BG).margin({ left: 6 })
        Blank()
        Text('\u00A5' + item.settleAmount.toFixed(4))
          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
      }.width('100%')

      Row() {
        if (item.hashProof.length > 0) {
          Row() {
            Text(BrandIcon.SEAL_GLYPH).fontSize(10).fontColor(BrandPalette.SEAL_RED)
            Text('HASH ' + item.hashProof.slice(0, 10) + '...')
              .fontSize(9).fontColor(BrandPalette.PRIMARY).letterSpacing(1).margin({ left: 2 })
          }
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor('#00E5A018')
        }
        if (item.notarized) {
          Text('存证\u2713')
            .fontSize(9).fontColor(BrandPalette.NEON_BLUE).letterSpacing(1)
            .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
            .backgroundColor(BrandBadge.BLUE_BG).margin({ left: 6 })
        }
        Blank()
        Text('权重 ' + item.totalScore.toFixed(3)).fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
      }.width('100%').margin({ top: 6 })

      Row() {
        Text(item.createdAt.slice(0, 16).replace('T', ' ')).fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
        Blank()
        Text('贡献者 \u00A5' + item.splits.contributor.toFixed(4))
          .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
      }.width('100%').margin({ top: 4 })
    }
    .width('100%').padding(12).borderRadius(BrandRadius.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }
}
