import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { AiInsightItem, AiInsightList, AiValueDashboard } from '../../model/DataModels';
import { WalletData } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct AiDashboardPage {
  @State insights: AiInsightItem[] = [];
  @State insightSummary: string = '';
  @State valueDashboard: AiValueDashboard | null = null;
  @State wallet: WalletData | null = null;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';

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
    const body: Record<string, Object> = {
      'userId': uid,
    };
    const resp: ApiResponse<AiInsightList> = await HttpClient.post<AiInsightList>(
      '/api/ai/insight', toPostBody(body),
      (data: Record<string, Object>): AiInsightList => {
        return AiInsightList.fromJson(data);
      });
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
      (data: Record<string, Object>): AiValueDashboard => {
        return AiValueDashboard.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.valueDashboard = resp.data;
    }
  }

  private async loadWallet() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<WalletData> = await HttpClient.get<WalletData>(
      '/api/wallet/balance?userId=' + uid,
      (data: Record<string, Object>): WalletData => {
        return WalletData.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.wallet = resp.data;
    }
  }

  build() {
    Column() {
      Row() {
        Text('AI加权评估')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

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
      } else {
        Refresh({ refreshing: $refreshing }) {
          Scroll() {
            Column() {
              if (this.valueDashboard !== null) {
                Column() {
                  Row() {
                    Text('AI价值指标')
                      .fontSize(16)
                      .fontWeight(FontWeight.Bold)
                      .fontColor(Color.White)
                    Blank()
                    Text('KOL评分: ' + this.valueDashboard.kolScore.toString())
                      .fontSize(13)
                      .fontColor(Color.White)
                      .opacity(0.9)
                  }
                  .width('100%')

                  Row() {
                    Column() {
                      Text('¥' + this.valueDashboard.totalEarned.toFixed(2))
                        .fontSize(22)
                        .fontWeight(FontWeight.Bold)
                        .fontColor(Color.White)
                      Text('总收益')
                        .fontSize(11)
                        .fontColor(Color.White)
                        .opacity(0.8)
                        .margin({ top: 2 })
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Center)

                    Column() {
                      Text(this.valueDashboard.avgWeightMultiplier.toFixed(2))
                        .fontSize(22)
                        .fontWeight(FontWeight.Bold)
                        .fontColor(Color.White)
                      Text('加权乘数')
                        .fontSize(11)
                        .fontColor(Color.White)
                        .opacity(0.8)
                        .margin({ top: 2 })
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Center)

                    Column() {
                      Text(this.valueDashboard.kolValue.toFixed(0))
                        .fontSize(22)
                        .fontWeight(FontWeight.Bold)
                        .fontColor(Color.White)
                      Text('KOL价值')
                        .fontSize(11)
                        .fontColor(Color.White)
                        .opacity(0.8)
                        .margin({ top: 2 })
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Center)
                  }
                  .width('100%')
                  .margin({ top: 16 })
                }
                .width('100%')
                .padding(20)
                .borderRadius(12)
                .linearGradient({
                  direction: GradientDirection.Right,
                  colors: [['#6366F1', 0.0], ['#8B5CF6', 1.0]]
                })
                .margin({ left: 16, right: 16 })
              }

              if (this.valueDashboard !== null) {
                Column() {
                  Text('加权权重明细')
                    .fontSize(16)
                    .fontWeight(FontWeight.Bold)
                    .fontColor($r('app.color.text_primary'))
                    .width('100%')

                  Row() {
                    Column() {
                      Text(this.valueDashboard.spreadWeight.toFixed(2))
                        .fontSize(20)
                        .fontWeight(FontWeight.Bold)
                        .fontColor($r('app.color.primary_color'))
                      Text('传播权重')
                        .fontSize(11)
                        .fontColor($r('app.color.text_secondary'))
                        .margin({ top: 2 })
                      Text('阅读·分享·覆盖')
                        .fontSize(10)
                        .fontColor($r('app.color.text_secondary'))
                        .opacity(0.6)
                        .margin({ top: 2 })
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Center)

                    Column() {
                      Text(this.valueDashboard.conversionWeight.toFixed(2))
                        .fontSize(20)
                        .fontWeight(FontWeight.Bold)
                        .fontColor($r('app.color.price_color'))
                      Text('转化权重')
                        .fontSize(11)
                        .fontColor($r('app.color.text_secondary'))
                        .margin({ top: 2 })
                      Text('预约·成交·核销')
                        .fontSize(10)
                        .fontColor($r('app.color.text_secondary'))
                        .opacity(0.6)
                        .margin({ top: 2 })
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Center)

                    Column() {
                      Text(this.valueDashboard.qualityWeight.toFixed(2))
                        .fontSize(20)
                        .fontWeight(FontWeight.Bold)
                        .fontColor(Color.Green)
                      Text('质量权重')
                        .fontSize(11)
                        .fontColor($r('app.color.text_secondary'))
                        .margin({ top: 2 })
                      Text('内容·评分·反馈')
                        .fontSize(10)
                        .fontColor($r('app.color.text_secondary'))
                        .opacity(0.6)
                        .margin({ top: 2 })
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Center)
                  }
                  .width('100%')
                  .margin({ top: 16 })

                  Column() {
                    Row() {
                      Text('传播')
                        .fontSize(11)
                        .fontColor($r('app.color.text_secondary'))
                        .width(40)
                      Progress({ value: this.valueDashboard.spreadWeight * 100, total: 100, type: ProgressType.Linear })
                        .layoutWeight(1)
                        .height(6)
                        .color($r('app.color.primary_color'))
                    }
                    .width('100%')
                    .margin({ top: 8 })

                    Row() {
                      Text('转化')
                        .fontSize(11)
                        .fontColor($r('app.color.text_secondary'))
                        .width(40)
                      Progress({ value: this.valueDashboard.conversionWeight * 100, total: 100, type: ProgressType.Linear })
                        .layoutWeight(1)
                        .height(6)
                        .color($r('app.color.price_color'))
                    }
                    .width('100%')
                    .margin({ top: 6 })

                    Row() {
                      Text('质量')
                        .fontSize(11)
                        .fontColor($r('app.color.text_secondary'))
                        .width(40)
                      Progress({ value: this.valueDashboard.qualityWeight * 100, total: 100, type: ProgressType.Linear })
                        .layoutWeight(1)
                        .height(6)
                        .color(Color.Green)
                    }
                    .width('100%')
                    .margin({ top: 6 })
                  }
                  .width('100%')
                  .margin({ top: 12 })
                }
                .width('100%')
                .padding(16)
                .borderRadius(12)
                .backgroundColor($r('app.color.card_background'))
                .margin({ left: 16, right: 16, top: 12 })
                .alignItems(HorizontalAlign.Start)
              }

              if (this.valueDashboard !== null) {
                Row() {
                  Column() {
                    Text(this.valueDashboard.contentCount.toString())
                      .fontSize(20)
                      .fontWeight(FontWeight.Bold)
                      .fontColor($r('app.color.text_primary'))
                    Text('内容数')
                      .fontSize(11)
                      .fontColor($r('app.color.text_secondary'))
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)

                  Column() {
                    Text(this.valueDashboard.realTimeSettlements.toString())
                      .fontSize(20)
                      .fontWeight(FontWeight.Bold)
                      .fontColor($r('app.color.primary_color'))
                    Text('实时结算')
                      .fontSize(11)
                      .fontColor($r('app.color.text_secondary'))
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)

                  Column() {
                    Text('¥' + this.valueDashboard.pendingSettlementAmount.toFixed(2))
                      .fontSize(16)
                      .fontWeight(FontWeight.Bold)
                      .fontColor($r('app.color.price_color'))
                    Text('待结算')
                      .fontSize(11)
                      .fontColor($r('app.color.text_secondary'))
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)
                }
                .width('100%')
                .height(72)
                .margin({ left: 16, right: 16, top: 12 })
                .borderRadius(12)
                .backgroundColor($r('app.color.card_background'))
                .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
              }

              if (this.wallet !== null) {
                Row() {
                  Column() {
                    Text('¥' + this.wallet.promotionBalance.toFixed(2))
                      .fontSize(18)
                      .fontWeight(FontWeight.Bold)
                      .fontColor($r('app.color.price_color'))
                    Text('推广金余额')
                      .fontSize(11)
                      .fontColor($r('app.color.text_secondary'))
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)

                  Column() {
                    Text(this.wallet.reputationScore.toString())
                      .fontSize(18)
                      .fontWeight(FontWeight.Bold)
                      .fontColor($r('app.color.primary_color'))
                    Text('口碑值')
                      .fontSize(11)
                      .fontColor($r('app.color.text_secondary'))
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)
                }
                .width('100%')
                .height(72)
                .margin({ left: 16, right: 16, top: 12 })
                .borderRadius(12)
                .backgroundColor($r('app.color.card_background'))
                .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
              }

              Row() {
                Text('AI工具市场')
                  .fontSize(15)
                  .fontColor($r('app.color.text_primary'))
                  .layoutWeight(1)
                Text('查看 >')
                  .fontSize(13)
                  .fontColor($r('app.color.primary_color'))
                  .onClick(() => {
                    router.pushUrl({ url: 'pages/aitools/AiToolsPage' });
                  })
              }
              .width('100%')
              .padding({ left: 16, right: 16, top: 16 })

              Column() {
                Text('AI洞察建议')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor($r('app.color.text_primary'))
                  .width('100%')

                if (this.insightSummary.length > 0) {
                  Text(this.insightSummary)
                    .fontSize(13)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 8 })
                    .width('100%')
                }

                if (this.insights.length === 0) {
                  Text('暂无洞察，发布内容后AI将生成个性化建议')
                    .fontSize(14)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 16 })
                    .width('100%')
                    .textAlign(TextAlign.Center)
                } else {
                  Column() {
                    ForEach(this.insights, (item: AiInsightItem, index: number) => {
                      this.InsightCard(item, index)
                    }, (item: AiInsightItem, index: number) => item.type + '_' + index.toString())
                  }
                  .width('100%')
                  .margin({ top: 12 })
                }
              }
              .width('100%')
              .padding(16)
              .margin({ top: 4 })
              .alignItems(HorizontalAlign.Start)
            }
          }
          .layoutWeight(1)
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
  InsightCard(item: AiInsightItem, index: number) {
    Row() {
      Column() {
        Text((index + 1).toString())
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
      }
      .width(32)
      .height(32)
      .borderRadius(16)
      .justifyContent(FlexAlign.Center)
      .backgroundColor($r('app.color.primary_color'))
      .margin({ right: 12 })

      Column() {
        Text(item.title)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
        Text(item.detail)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
          .width('100%')
          .lineHeight(20)
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding(12)
    .borderRadius(8)
    .backgroundColor($r('app.color.card_background'))
    .margin({ top: 8 })
  }
}
