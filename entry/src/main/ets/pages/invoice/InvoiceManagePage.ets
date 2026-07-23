import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { InvoiceItem } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct InvoiceManagePage {
  @State invoices: InvoiceItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State invoiceType: string = 'special';
  @State recipientTrack: string = 'B';
  @State invoiceAmount: string = '';
  @State typeOptions: string[] = ['special', 'normal'];
  @State trackOptions: string[] = ['A', 'B', 'C'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadInvoices();
    this.loading = false;
    this.refreshing = false;
  }

  private async loadInvoices() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<InvoiceItem[]> = await HttpClient.get<InvoiceItem[]>(
      '/api/invoice/list?userId=' + uid,
      (data: Record<string, Object>): InvoiceItem[] => {
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
        const result: InvoiceItem[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(InvoiceItem.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.invoices = resp.data; }
  }

  private async issueInvoice() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const amountVal: number = parseFloat(this.invoiceAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      promptAction.showToast({ message: '\u8BF7\u8F93\u5165\u6709\u6548\u91D1\u989D' });
      return;
    }
    const body: Record<string, Object> = toPostBody({
      'userId': uid,
      'invoiceType': this.invoiceType,
      'recipientTrack': this.recipientTrack,
      'amount': amountVal
    });
    const resp: ApiResponse<InvoiceItem> = await HttpClient.post<InvoiceItem>(
      '/api/invoice/issue', body,
      (data: Record<string, Object>): InvoiceItem => { return InvoiceItem.fromJson(data); });
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '\u5F00\u7968\u6210\u529F' });
      this.invoiceAmount = '';
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '\u5F00\u7968\u5931\u8D25' });
    }
  }

  private getStatusBg(status: string): string {
    if (status === 'issued') return BrandBadge.GREEN_BG;
    if (status === 'draft') return BrandBadge.BLUE_BG;
    if (status === 'cancelled') return BrandBadge.RED_BG;
    if (status === 'paid') return BrandBadge.GOLD_BG;
    return BrandBadge.CYAN_BG;
  }

  private getStatusText(status: string): string {
    if (status === 'issued') return BrandBadge.GREEN_TEXT;
    if (status === 'draft') return BrandBadge.BLUE_TEXT;
    if (status === 'cancelled') return BrandBadge.RED_TEXT;
    if (status === 'paid') return BrandBadge.GOLD_TEXT;
    return BrandBadge.CYAN_TEXT;
  }

  private getStatusLabel(status: string): string {
    if (status === 'draft') return '\u8349\u7A3F';
    if (status === 'issued') return '\u5DF2\u5F00\u7968';
    if (status === 'paid') return '\u5DF2\u652F\u4ED8';
    if (status === 'cancelled') return '\u5DF2\u4F5C\u5E9F';
    return status;
  }

  private getTrackColor(track: string): string {
    if (track === 'A') return BrandBadge.GOLD_TEXT;
    if (track === 'B') return BrandBadge.GREEN_TEXT;
    if (track === 'C') return BrandBadge.BLUE_TEXT;
    return BrandPalette.TEXT_MUTED;
  }

  private getTypeLabel(type: string): string {
    if (type === 'special') return '\u4E13\u7968';
    if (type === 'normal') return '\u666E\u7968';
    return type;
  }

  build() {
    Column() {
      Row() {
        Text('\u53D1\u7968\u7BA1\u7406')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('INV')
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
            Column() {
              Text('\u5F00\u7968')
                .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

              Row() {
                ForEach(this.typeOptions, (opt: string) => {
                  Column() {
                    Text(this.getTypeLabel(opt))
                      .fontSize(13).fontWeight(FontWeight.Bold)
                      .fontColor(this.invoiceType === opt ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
                  }
                  .layoutWeight(1).height(36).borderRadius(BrandRadius.SM)
                  .backgroundColor(this.invoiceType === opt ? '#00E5A022' : BrandPalette.SURFACE)
                  .border({ width: this.invoiceType === opt ? 1 : 0,
                    color: BrandPalette.PRIMARY, style: BorderStyle.Solid })
                  .justifyContent(FlexAlign.Center)
                  .onClick(() => { this.invoiceType = opt; })
                }, (opt: string) => opt)
              }.width('100%').margin({ top: 8 })

              Row() {
                Text('\u6536\u7968\u65B9\u8F68\u9053').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
                ForEach(this.trackOptions, (track: string) => {
                  Column() {
                    Text(track)
                      .fontSize(12).fontWeight(FontWeight.Bold)
                      .fontColor(this.recipientTrack === track ?
                        this.getTrackColor(track) : BrandPalette.TEXT_MUTED)
                  }
                  .width(40).height(28).borderRadius(BrandRadius.SM)
                  .backgroundColor(this.recipientTrack === track ? '#0A0E1A' : BrandPalette.SURFACE)
                  .justifyContent(FlexAlign.Center).margin({ left: 6 })
                  .onClick(() => { this.recipientTrack = track; })
                }, (track: string) => track)
                Blank()
              }.width('100%').margin({ top: 8 })

              TextInput({ text: this.invoiceAmount, placeholder: '\u91D1\u989D' })
                .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE).borderRadius(BrandRadius.SM)
                .width('100%').height(40).margin({ top: 8 })
                .type(InputType.Number)
                .onChange((val: string) => { this.invoiceAmount = val; })

              Button('\u5F00\u7968')
                .width('100%').height(40).margin({ top: 12 })
                .fontSize(14).fontWeight(FontWeight.Bold)
                .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG)
                .borderRadius(BrandRadius.PILL)
                .onClick(() => this.issueInvoice())
            }
            .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
            .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
            .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

            if (this.invoices.length > 0) {
              Column() {
                Text('\u53D1\u7968\u5217\u8868')
                  .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                  .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

                ForEach(this.invoices, (item: InvoiceItem) => {
                  Row() {
                    Column() {
                      Row() {
                        Text(this.getTypeLabel(item.invoiceType))
                          .fontSize(11).fontColor(BrandPalette.PRIMARY)
                          .padding({ left: 4, right: 4, top: 2, bottom: 2 }).borderRadius(4)
                          .backgroundColor('#00E5A022')
                        Text(item.invoiceNo.length > 0 ? item.invoiceNo : item.invoiceId.substring(0, 8))
                          .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).margin({ left: 6 })
                          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).layoutWeight(1)
                        Text(this.getStatusLabel(item.status))
                          .fontSize(11).fontColor(this.getStatusText(item.status))
                          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
                          .backgroundColor(this.getStatusBg(item.status))
                      }.width('100%')

                      Row() {
                        Text(item.recipientTrack + '\u8F68')
                          .fontSize(10).fontColor(this.getTrackColor(item.recipientTrack))
                          .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                          .backgroundColor('#0A0E1A').margin({ top: 6 })
                        Blank()
                        Text('\u00A5' + item.totalAmount.toFixed(2))
                          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
                          .margin({ top: 6 })
                      }.width('100%')

                      Row() {
                        Text('\u7A0E\u989D \u00A5' + item.taxAmount.toFixed(2))
                          .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                        Blank()
                        Text(item.createdAt.length > 10 ? item.createdAt.substring(0, 10) : item.createdAt)
                          .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                      }.width('100%')
                    }.layoutWeight(1)
                  }.width('100%').padding({ top: 8, bottom: 8 })
                  .border({ width: 0, style: BorderStyle.Solid, color: BrandPalette.DIVIDER })
                }, (item: InvoiceItem) => item.invoiceId)
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
