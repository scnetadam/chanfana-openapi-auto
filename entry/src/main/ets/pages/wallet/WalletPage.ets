import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { WalletData, TransactionItem, TransactionListData } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandSeal, BrandIcon } from '../../common/BrandCI';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct WalletPage {
  @State wallet: WalletData | null = null;
  @State transactions: TransactionItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadWalletData(); }

  private async loadWalletData() {
    const uid: string = this.userId;
    if (uid.length === 0) { this.loading = false; return; }
    const balanceResp: ApiResponse<WalletData> = await HttpClient.get<WalletData>('/api/wallet/balance?userId=' + uid, (data: Record<string, Object>): WalletData => {
      return WalletData.fromJson(data);
    });
    if (balanceResp.success && balanceResp.data !== null) { this.wallet = balanceResp.data; }
    const txResp: ApiResponse<TransactionListData> = await HttpClient.get<TransactionListData>('/api/wallet/transactions?userId=' + uid, (data: Record<string, Object>): TransactionListData => {
      return TransactionListData.fromJson(data);
    });
    if (txResp.success && txResp.data !== null) { this.transactions = txResp.data.list; }
    this.loading = false;
    this.refreshing = false;
  }

  private getBalanceText(): string {
    if (this.wallet !== null) { return '\u00A5' + this.wallet.promotionBalance.toFixed(2); }
    return '\u00A50.00';
  }

  build() {
    Column() {
      Row() {
        Row() {
          Text('<').fontSize(22).fontColor(BrandPalette.TEXT_PRIMARY).onClick(() => router.back())
        }.width(40).height(40).justifyContent(FlexAlign.Center)
        Text('推广钱包')
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1).textAlign(TextAlign.Center)
        Row().width(40)
      }.width('100%').height(56).padding({ left: 8, right: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          Scroll() {
            Column() {
               Column() {
                 Text('BALANCE')
                   .fontSize(11).fontColor(BrandPalette.PRIMARY).letterSpacing(3).opacity(0.9)
                 Text(this.getBalanceText())
                   .fontSize(38).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
                   .margin({ top: 8 })
                 Row() {
                    Column().width(16).height(1).backgroundColor('#0A162866')
                   Text('\u63A8\u5E7F\u91D1')
                     .fontSize(11).fontColor(BrandPalette.TEXT_SECONDARY).letterSpacing(2).margin({ left: 6, right: 6 })
                    Column().width(16).height(1).backgroundColor('#0A162866')
                 }.margin({ top: 8 })
                 Row() {
                   Text(BrandIcon.SEAL_GLYPH)
                     .fontSize(14)
                     .fontColor('#FFFFFF66')
                   Text(BrandIcon.KNOB_SYMBOL)
                     .fontSize(9)
                     .fontColor('#FFFFFF44')
                     .margin({ left: 4 })
                 }.margin({ top: 6 })
               }
               .width('100%').height(180).justifyContent(FlexAlign.Center)
               .borderRadius(BrandRadius.CARD)
               .linearGradient({ direction: GradientDirection.Right, colors: [['#00E5A0', 0.0], ['#00B4D8', 0.7], ['#00D4FF', 1.0]] })
               .margin({ left: 16, right: 16 })
                .shadow({ radius: 20, color: '#00E5A033', offsetX: 0, offsetY: 4 })

              Row() {
                Column() {
                  Text('\u{1F4CA}').fontSize(18)
                  Text('\u52A0\u6743\u7ED3\u7B97').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).padding({ top: 8, bottom: 8 }).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
                .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
                .onClick(() => { router.pushUrl({ url: 'pages/pageWeightedSettle/PageWeightedSettlePage' }); })
                Column() {
                  Text('\u{1F48E}').fontSize(18)
                  Text('\u5B58\u8BC1\u4F30\u503C').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).padding({ top: 8, bottom: 8 }).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
                .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid }).margin({ left: 8 })
                .onClick(() => { router.pushUrl({ url: 'pages/weightedValuation/WeightedValuationPage' }); })
                Column() {
                  Text('\u{1F4DC}').fontSize(18)
                  Text('\u5408\u540C\u9A8C\u8BC1').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).padding({ top: 8, bottom: 8 }).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
                .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid }).margin({ left: 8 })
                .onClick(() => { router.pushUrl({ url: 'pages/contractVerify/ContractVerifyPage' }); })
                Column() {
                  Text('\u{1F6E1}\uFE0F').fontSize(18)
                  Text('\u5408\u89C4\u770B\u677F').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).padding({ top: 8, bottom: 8 }).borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
                .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid }).margin({ left: 8 })
                .onClick(() => { router.pushUrl({ url: 'pages/compliance/ComplianceDashboardPage' }); })
              }.width('100%').padding({ left: 16, right: 16, top: 0, bottom: 0 })

               Column() {
                Text('TRANSACTIONS')
                  .fontSize(11).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).width('100%')

                if (this.transactions.length === 0) {
                  Column() {
                    Text('暂无交易记录').fontSize(14).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 24 })
                  }.width('100%').alignItems(HorizontalAlign.Center)
                } else {
                  Column() {
                    ForEach(this.transactions, (item: TransactionItem) => {
                      this.TransactionRow(item)
                    }, (item: TransactionItem) => item.id)
                  }.width('100%').margin({ top: 8 })
                }
              }
              .width('100%').padding(16).margin({ top: 12 }).alignItems(HorizontalAlign.Start)
            }
          }.layoutWeight(1)
        }.onRefreshing(() => { this.loadWalletData(); })
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  TransactionRow(item: TransactionItem) {
    Row() {
      Column() {
        Text(item.desc)
          .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY).maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis }).width('100%')
        Text(item.createdAt.slice(0, 16).replace('T', ' '))
          .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
      }.layoutWeight(1).alignItems(HorizontalAlign.Start)

      const isDebit: boolean = item.type === 'withdraw' || item.type === 'fee' || item.type === 'expense';
      const amountText: string = isDebit ? ('-' + item.amount.toFixed(2)) : ('+' + item.amount.toFixed(2));
      Text(amountText)
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(isDebit ? BrandPalette.TEXT_MUTED : BrandPalette.GOLD)
    }
    .width('100%').height(56).padding({ left: 4, right: 4 })
    .borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG).margin({ top: 6 })
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }
}
