import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { WalletData, TransactionItem, TransactionListData } from '../../model/DataModels';
import { APP_CONFIG } from '../../common/Constants';

@Component
export struct WalletPage {
  @State wallet: WalletData | null = null;
  @State transactions: TransactionItem[] = [];
  @State loading: boolean = true;
  private userId: string = APP_CONFIG.DEFAULT_USER_ID;

  aboutToAppear() {
    this.loadWalletData();
  }

  private async loadWalletData() {
    const balanceResp: ApiResponse<WalletData> = await HttpClient.get<WalletData>('/api/wallet/balance?userId=' + this.userId, (data: Record<string, Object>): WalletData => {
      return WalletData.fromJson(data);
    });
    if (balanceResp.success && balanceResp.data !== null) {
      this.wallet = balanceResp.data;
    }
    const txResp: ApiResponse<TransactionListData> = await HttpClient.get<TransactionListData>('/api/wallet/transactions?userId=' + this.userId, (data: Record<string, Object>): TransactionListData => {
      return TransactionListData.fromJson(data);
    });
    if (txResp.success && txResp.data !== null) {
      this.transactions = txResp.data.list;
    }
    this.loading = false;
  }

  private getBalanceText(): string {
    if (this.wallet !== null) {
      return '¥' + this.wallet.promotionBalance.toFixed(2);
    }
    return '¥0.00';
  }

  private formatDateTime(isoStr: string): string {
    const sliced: string = isoStr.slice(0, 16);
    return sliced.replace('T', ' ');
  }

  build() {
    Column() {
      Row() {
        Text('推广钱包')
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
        Scroll() {
          Column() {
            Column() {
              Text('推广金余额')
                .fontSize(14)
                .fontColor(Color.White)
                .opacity(0.8)
              Text(this.getBalanceText())
                .fontSize(36)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .margin({ top: 8 })
            }
            .width('100%')
            .height(140)
            .justifyContent(FlexAlign.Center)
            .borderRadius(12)
            .linearGradient({
              direction: GradientDirection.Right,
              colors: [['#007DFF', 0.0], ['#5C8AFF', 1.0]]
            })
            .margin({ left: 16, right: 16 })

            Column() {
              Text('交易流水')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .width('100%')

              if (this.transactions.length === 0) {
                Column() {
                  Text('暂无交易记录')
                    .fontSize(14)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 24 })
                }
                .width('100%')
                .alignItems(HorizontalAlign.Center)
              } else {
                Column() {
                  ForEach(this.transactions, (item: TransactionItem) => {
                    this.TransactionRow(item)
                  }, (item: TransactionItem) => item.id)
                }
                .width('100%')
                .margin({ top: 8 })
              }
            }
            .width('100%')
            .padding(16)
            .margin({ top: 12 })
            .alignItems(HorizontalAlign.Start)
          }
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  TransactionRow(item: TransactionItem) {
    Row() {
      Column() {
        Text(item.desc)
          .fontSize(14)
          .fontColor($r('app.color.text_primary'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
        Text(this.formatDateTime(item.createdAt))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 2 })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Text('+' + item.amount.toFixed(2))
        .fontSize(15)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.price_color'))
    }
    .width('100%')
    .height(56)
    .padding({ left: 4, right: 4 })
    .borderRadius(8)
    .backgroundColor($r('app.color.card_background'))
    .margin({ top: 6 })
  }
}
