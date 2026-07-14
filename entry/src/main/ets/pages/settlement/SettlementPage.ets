import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { SettlementItem, SettlementList, SettlementStats } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct SettlementPage {
  @State settlements: SettlementItem[] = [];
  @State stats: SettlementStats | null = null;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentTab: number = 0;
  @State tabLabels: string[] = ['全部', '已完成', '待执行'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadData();
  }

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
    if (resp.success && resp.data !== null) {
      this.settlements = resp.data;
    }
  }

  private async loadStats() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<SettlementStats> = await HttpClient.get<SettlementStats>(
      '/api/settlement/stats?userId=' + uid,
      (data: Record<string, Object>): SettlementStats => {
        return SettlementStats.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.stats = resp.data;
    }
  }

  private async executeSettlement(item: SettlementItem) {
    const emptyBody: Record<string, Object> = {};
    const resp: ApiResponse<SettlementItem> = await HttpClient.post<SettlementItem>(
      '/api/settlement/' + item.id + '/execute', emptyBody,
      (data: Record<string, Object>): SettlementItem => {
        return SettlementItem.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '结算执行成功' });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '结算执行失败' });
    }
  }

  private formatDateTime(isoStr: string): string {
    const sliced: string = isoStr.slice(0, 16);
    return sliced.replace('T', ' ');
  }

  private getStatusText(status: string): string {
    if (status === 'pending') return '待执行';
    if (status === 'processing') return '处理中';
    if (status === 'completed') return '已完成';
    if (status === 'failed') return '失败';
    return status;
  }

  private getStatusColor(status: string): ResourceColor {
    if (status === 'completed') return $r('app.color.price_color');
    if (status === 'pending') return $r('app.color.primary_color');
    if (status === 'failed') return Color.Red;
    return $r('app.color.text_secondary');
  }

  private getTypeLabel(type: string): string {
    if (type === 'kol_commission') return 'KOL分佣';
    if (type === 'booking_reward') return '预约奖励';
    if (type === 'content_reward') return '内容奖励';
    if (type === 'data_earnings') return '数据收益';
    return type;
  }

  build() {
    Column() {
      Row() {
        Text('微交易结算')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.stats !== null) {
        Row() {
          Column() {
            Text('¥' + this.stats.totalIncome.toFixed(2))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.price_color'))
            Text('总收入')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text('¥' + this.stats.totalExpense.toFixed(2))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
            Text('总支出')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text('¥' + this.stats.totalFee.toFixed(2))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_secondary'))
            Text('手续费')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text(this.stats.pendingCount.toString())
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.primary_color'))
            Text('待结算')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)
        }
        .width('100%')
        .height(80)
        .margin({ left: 16, right: 16, top: 8 })
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
      }

      Row() {
        ForEach(this.tabLabels, (label: string, index: number) => {
          Text(label)
            .fontSize(14)
            .fontWeight(this.currentTab === index ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.currentTab === index ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
            .padding({ left: 12, right: 12, bottom: 8 })
            .borderWidth({ bottom: this.currentTab === index ? 2 : 0 })
            .borderColor($r('app.color.primary_color'))
            .onClick(() => { this.currentTab = index; this.loadSettlements(); })
        }, (label: string, index: number) => label + '_' + index.toString())
      }
      .width('100%')
      .padding({ left: 16, top: 12 })

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color($r('app.color.primary_color'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.settlements.length === 0) {
        Column() {
          Text('暂无结算记录')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 8 }) {
            ForEach(this.settlements, (item: SettlementItem) => {
              ListItem() {
                this.SettlementCard(item)
              }
            }, (item: SettlementItem) => item.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadData();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  SettlementCard(item: SettlementItem) {
    Column() {
      Row() {
        Text(this.getTypeLabel(item.type))
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor($r('app.color.primary_color'))

        Text(item.description.length > 0 ? item.description : '结算')
          .fontSize(14)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .margin({ left: 8 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text('¥' + item.netAmount.toFixed(2))
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(item.toUserId === this.userId ? $r('app.color.price_color') : $r('app.color.text_primary'))
      }
      .width('100%')

      Row() {
        Text(this.getStatusText(item.status))
          .fontSize(12)
          .fontColor(this.getStatusColor(item.status))

        if (item.hashProof.length > 0) {
          Text('HASH已存证')
            .fontSize(10)
            .fontColor(Color.Green)
            .margin({ left: 8 })
        }

        if (item.aiVerified) {
          Text('AI已验证')
            .fontSize(10)
            .fontColor($r('app.color.primary_color'))
            .margin({ left: 8 })
        }

        Blank()

        Text('手续费 ¥' + item.fee.toFixed(2))
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .margin({ top: 6 })

      Row() {
        Text(this.formatDateTime(item.createdAt))
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))

        Blank()

        if (item.status === 'pending' && item.fromUserId === this.userId) {
          Button('执行结算')
            .height(28)
            .fontSize(12)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(14)
            .onClick(() => this.executeSettlement(item))
        }
      }
      .width('100%')
      .margin({ top: 4 })
    }
    .width('100%')
    .padding(12)
    .borderRadius(8)
    .backgroundColor($r('app.color.card_background'))
  }
}
