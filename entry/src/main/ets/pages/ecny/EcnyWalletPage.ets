import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { EcnyWalletData, EcnyFlowItem } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct EcnyWalletPage {
  @State wallet: EcnyWalletData | null = null;
  @State flows: EcnyFlowItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State newWalletType: string = 'personal';
  @State walletTypeOptions: string[] = ['personal', 'business'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadWallet();
    await this.loadFlows();
    this.loading = false;
    this.refreshing = false;
  }

  private async loadWallet() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<EcnyWalletData> = await HttpClient.get<EcnyWalletData>(
      '/api/ecny/wallet?userId=' + uid,
      (data: Record<string, Object>): EcnyWalletData => { return EcnyWalletData.fromJson(data); });
    if (resp.success && resp.data !== null) { this.wallet = resp.data; }
  }

  private async loadFlows() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<EcnyFlowItem[]> = await HttpClient.get<EcnyFlowItem[]>(
      '/api/ecny/flows?userId=' + uid,
      (data: Record<string, Object>): EcnyFlowItem[] => {
        const arr: Record<string, Object>[] = [];
        const listObj: Object | undefined = data['list'];
        if (listObj !== null && listObj !== undefined && Array.isArray(listObj)) {
          const rawArr: Object[] = listObj;
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: EcnyFlowItem[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(EcnyFlowItem.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.flows = resp.data; }
  }

  private async createWallet() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const body: Record<string, Object> = toPostBody({
      'userId': uid,
      'walletType': this.newWalletType
    });
    const resp: ApiResponse<EcnyWalletData> = await HttpClient.post<EcnyWalletData>(
      '/api/ecny/wallet/create', body,
      (data: Record<string, Object>): EcnyWalletData => { return EcnyWalletData.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.wallet = resp.data;
      promptAction.showToast({ message: '\u94B1\u5305\u521B\u5EFA\u6210\u529F' });
    } else {
      promptAction.showToast({ message: resp.error || '\u94B1\u5305\u521B\u5EFA\u5931\u8D25' });
    }
  }

  private getDirectionIcon(direction: string): string {
    if (direction === 'in') return '\u2193';
    if (direction === 'out') return '\u2191';
    return '\u2194';
  }

  private getDirectionColor(direction: string): string {
    if (direction === 'in') return BrandBadge.GREEN_TEXT;
    if (direction === 'out') return BrandBadge.RED_TEXT;
    return BrandPalette.TEXT_PRIMARY;
  }

  private getFlowStatusBg(status: string): string {
    if (status === 'completed') return BrandBadge.GREEN_BG;
    if (status === 'pending') return BrandBadge.BLUE_BG;
    if (status === 'failed') return BrandBadge.RED_BG;
    return BrandBadge.GOLD_BG;
  }

  private getFlowStatusText(status: string): string {
    if (status === 'completed') return BrandBadge.GREEN_TEXT;
    if (status === 'pending') return BrandBadge.BLUE_TEXT;
    if (status === 'failed') return BrandBadge.RED_TEXT;
    return BrandBadge.GOLD_TEXT;
  }

  private getFlowStatusLabel(status: string): string {
    if (status === 'completed') return '\u5DF2\u5B8C\u6210';
    if (status === 'pending') return '\u5F85\u5904\u7406';
    if (status === 'failed') return '\u5931\u8D25';
    return status;
  }

  build() {
    Column() {
      Row() {
        Text('e-CNY\u7BA1\u7406')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.WALLET_SYMBOL).fontSize(14).fontColor(BrandPalette.GOLD).opacity(0.6)
          Text('eCNY')
            .fontSize(10).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).margin({ left: 4 })
        }
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            if (this.wallet !== null) {
              Column() {
                Row() {
                  Column() {
                    Text('\u94B1\u5305\u4F59\u989D')
                      .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
                    Text('\u00A5' + this.wallet.balance.toFixed(2))
                      .fontSize(28).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD).margin({ top: 4 })
                  }.alignItems(HorizontalAlign.Start)
                  Blank()
                  Column() {
                    Text(this.wallet.walletType === 'personal' ? '\u4E2A\u4EBA\u94B1\u5305' : '\u5546\u6237\u94B1\u5305')
                      .fontSize(11).fontColor(BrandPalette.PRIMARY)
                      .padding({ left: 8, right: 8, top: 2, bottom: 2 }).borderRadius(4)
                      .backgroundColor('#00E5A022')
                    Text(this.wallet.status)
                      .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 4 })
                  }
                }.width('100%')
                Text('ID: ' + this.wallet.walletId)
                  .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 8 }).width('100%')
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            } else {
              Column() {
                Text('\u5C1A\u672A\u521B\u5EFA\u94B1\u5305')
                  .fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
                Row() {
                  ForEach(this.walletTypeOptions, (opt: string) => {
                    Column() {
                      Text(opt === 'personal' ? '\u4E2A\u4EBA' : '\u5546\u6237')
                        .fontSize(13).fontWeight(FontWeight.Bold)
                        .fontColor(this.newWalletType === opt ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
                    }
                    .layoutWeight(1).height(36).borderRadius(BrandRadius.SM)
                    .backgroundColor(this.newWalletType === opt ? '#00E5A022' : BrandPalette.SURFACE)
                    .border({ width: this.newWalletType === opt ? 1 : 0,
                      color: BrandPalette.PRIMARY, style: BorderStyle.Solid })
                    .justifyContent(FlexAlign.Center)
                    .onClick(() => { this.newWalletType = opt; })
                  }, (opt: string) => opt)
                }.width('100%').margin({ top: 12 })
                Button('\u521B\u5EFA\u94B1\u5305')
                  .width('100%').height(40).margin({ top: 12 })
                  .fontSize(14).fontWeight(FontWeight.Bold)
                  .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG)
                  .borderRadius(BrandRadius.PILL)
                  .onClick(() => this.createWallet())
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }

            if (this.flows.length > 0) {
              Column() {
                Text('\u6D41\u6C34\u8BB0\u5F55')
                  .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                  .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

                ForEach(this.flows, (item: EcnyFlowItem) => {
                  Row() {
                    Text(this.getDirectionIcon(item.direction))
                      .fontSize(16).fontColor(this.getDirectionColor(item.direction))
                    Column() {
                      Text(item.bizType)
                        .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
                        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
                      Text(item.flowId.length > 12 ? item.flowId.substring(0, 12) + '...' : item.flowId)
                        .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 }).width('100%')
                    }.layoutWeight(1).margin({ left: 8 })
                    Column() {
                      Text((item.direction === 'in' ? '+' : '-') + '\u00A5' + item.amount.toFixed(2))
                        .fontSize(14).fontWeight(FontWeight.Bold)
                        .fontColor(this.getDirectionColor(item.direction))
                      Text(this.getFlowStatusLabel(item.status))
                        .fontSize(9).fontColor(this.getFlowStatusText(item.status))
                        .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                        .backgroundColor(this.getFlowStatusBg(item.status))
                        .margin({ top: 2 })
                    }.alignItems(HorizontalAlign.End)
                  }.width('100%').padding({ top: 8, bottom: 8 })
                  .border({ width: 0, style: BorderStyle.Solid, color: BrandPalette.DIVIDER })
                }, (item: EcnyFlowItem) => item.flowId)
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 12, bottom: 24 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }
          }
        }.width('100%').layoutWeight(1)
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }
}
