import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ContentItem, BookingResult } from '../../model/DataModels';
import { RouterParams } from '../../model/RouterParams';
import { BrandPalette, BrandTypography, BrandRadius, BrandSeal, BrandIcon, BrandSlogan } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';
import { pasteboard } from '@kit.BasicServicesKit';

@Entry
@Component
struct SharePage {
  @State content: ContentItem | null = null;
  @State loading: boolean = true;
  @State bookName: string = '';
  @State bookPhone: string = '';
  @State bookCity: string = '';
  @State submitting: boolean = false;
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';
  private contentId: string = '';

  aboutToAppear() {
    const rawParams: Object | null = router.getParams();
    const params: Record<string, Object> = (rawParams !== null && rawParams !== undefined) ? rawParams as Record<string, Object> : {};
    const rp: RouterParams = RouterParams.fromRecord(params);
    if (rp.contentId.length > 0) {
      this.contentId = rp.contentId;
      this.loadContent();
      this.trackView();
    }
  }

  private async loadContent() {
    const resp: ApiResponse<ContentItem> = await HttpClient.get<ContentItem>('/api/content/' + this.contentId, (data: Record<string, Object>): ContentItem => {
      return ContentItem.fromJson(data);
    });
    if (resp.success && resp.data !== null) {
      this.content = resp.data;
    }
    this.loading = false;
  }

  private async trackView() {
    const body: Record<string, Object> = {};
    body['contentId'] = this.contentId;
    body['spreadUserId'] = this.userId;
    body['spreadNickName'] = this.nickName;
    await HttpClient.post<Object>('/api/content/track/view', toPostBody(body), (data: Record<string, Object>): Object => {
      return data;
    });
  }

  private async submitBooking() {
    if (this.bookName.trim().length === 0) {
      promptAction.showToast({ message: '\u8BF7\u8F93\u5165\u59D3\u540D' });
      return;
    }
    if (this.bookPhone.trim().length === 0) {
      promptAction.showToast({ message: '\u8BF7\u8F93\u5165\u624B\u673A\u53F7' });
      return;
    }
    this.submitting = true;
    const body: Record<string, Object> = {};
    body['contentId'] = this.contentId;
    body['userId'] = this.userId;
    body['name'] = this.bookName;
    body['phone'] = this.bookPhone;
    body['city'] = this.bookCity;
    body['dealerName'] = '';
    const emptyArr: Object[] = [];
    body['refChain'] = emptyArr;
    const resp: ApiResponse<BookingResult> = await HttpClient.post<BookingResult>('/api/booking/submit', toPostBody(body), (data: Record<string, Object>): BookingResult => {
      return BookingResult.fromJson(data);
    });
    this.submitting = false;
    if (resp.success && resp.data !== null) {
      const routeParams: Record<string, Object> = { 'bookingId': resp.data.bookingId };
      router.pushUrl({ url: 'pages/booking/BookingPage', params: routeParams });
    } else {
      promptAction.showToast({ message: resp.error || '\u9884\u7EA6\u5931\u8D25' });
    }
  }

  build() {
    Column() {
      Row() {
        Row() {
          Text('<')
            .fontSize(22)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .onClick(() => router.back())
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)

        Text('\u5185\u5BB9\u8BE6\u60C5')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row() {
          SymbolGlyph($r('sys.symbol.share'))
            .fontSize(20)
            .fontColor([BrandPalette.PRIMARY])
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          const url: string = this.content !== null ? this.content.shareUrl : '';
          if (url.length > 0) {
            try {
              const pasteData: pasteboard.PasteData = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, url);
              const sysPasteboard: pasteboard.SystemPasteboard = pasteboard.getSystemPasteboard();
              sysPasteboard.setData(pasteData);
              promptAction.showToast({ message: '\u94FE\u63A5\u5DF2\u590D\u5236' });
            } catch (e) {
              promptAction.showToast({ message: '\u590D\u5236\u5931\u8D25' });
            }
          }
        })
      }
      .width('100%')
      .height(56)
      .padding({ left: 8, right: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color(BrandPalette.PRIMARY)
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.content !== null) {
        Scroll() {
          Column() {
            Column() {
              if (this.content.hasActivity) {
                Text(this.content.activity.brand + ' ' + this.content.activity.model)
                  .fontSize(12)
                  .fontColor(BrandPalette.PRIMARY)
                  .fontWeight(FontWeight.Medium)
                  .letterSpacing(1)
              }
              Text(this.content.carModel)
                .fontSize(22)
                .fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.TEXT_PRIMARY)
                .margin({ top: 4 })
            }
            .width('100%')
            .padding(16)
            .alignItems(HorizontalAlign.Start)

            if (this.content.text.length > 0) {
              Column() {
                Text(this.content.text)
                  .fontSize(15)
                  .fontColor(BrandPalette.TEXT_PRIMARY)
                  .lineHeight(24)
                  .width('100%')
              }
              .width('100%')
              .padding({ left: 16, right: 16, bottom: 12 })
              .alignItems(HorizontalAlign.Start)
            }

            Row() {
              this.StatItem('\u9605\u8BFB', this.content.stats.views.toString())
              Column().width(1).height(24).backgroundColor(BrandPalette.DIVIDER)
              this.StatItem('\u9884\u7EA6', this.content.stats.bookings.toString())
              Column().width(1).height(24).backgroundColor(BrandPalette.DIVIDER)
              this.StatItem('\u6536\u76CA', '\u00A5' + this.content.stats.estimatedEarnings.toFixed(2))
            }
            .width('100%')
            .height(64)
            .justifyContent(FlexAlign.SpaceEvenly)
            .backgroundColor(BrandPalette.CARD_BG)
            .borderRadius(BrandRadius.MD)
            .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            .margin({ left: 16, right: 16 })

            if (this.content.trackId.length > 0) {
              Row() {
                Text(BrandIcon.SEAL_GLYPH)
                  .fontSize(16)
                  .fontColor(BrandPalette.SEAL_RED)
                Text('\u5B58\u8BC1\u8FFD\u8E2A')
                  .fontSize(13)
                  .fontColor(BrandPalette.TEXT_PRIMARY)
                  .fontWeight(FontWeight.Medium)
                  .margin({ left: 6 })
                Blank()
                Text('HASH:' + this.content.trackId.slice(0, 8))
                  .fontSize(10)
                  .fontColor(BrandPalette.TEXT_MUTED)
                  .fontFamily('monospace')
              }
              .width('100%')
              .padding(12)
              .margin({ left: 16, right: 16, top: 8 })
              .borderRadius(BrandRadius.MD)
              .backgroundColor(BrandSeal.SEAL_BG)
              .border({ width: 1, color: BrandSeal.SEAL_BORDER, style: BorderStyle.Solid })
            }

            Column() {
              Text('\u8BD5\u9A7E\u9884\u7EA6')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.TEXT_PRIMARY)
                .width('100%')

              TextInput({ placeholder: '\u60A8\u7684\u59D3\u540D' })
                .width('100%')
                .height(44)
                .margin({ top: 12 })
                .fontSize(15)
                .fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE)
                .borderRadius(BrandRadius.MD)
                .onChange((value: string) => { this.bookName = value; })

              TextInput({ placeholder: '\u624B\u673A\u53F7\u7801' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .fontSize(15)
                .fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE)
                .borderRadius(BrandRadius.MD)
                .type(InputType.PhoneNumber)
                .onChange((value: string) => { this.bookPhone = value; })

              TextInput({ placeholder: '\u6240\u5728\u57CE\u5E02 (\u9009\u586B)' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .fontSize(15)
                .fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE)
                .borderRadius(BrandRadius.MD)
                .onChange((value: string) => { this.bookCity = value; })

              Button(this.submitting ? '\u63D0\u4EA4\u4E2D...' : '\u7ACB\u5373\u9884\u7EA6\u8BD5\u9A7E')
                .width('100%')
                .height(48)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .backgroundColor(BrandPalette.PRIMARY)
                .fontColor(BrandPalette.DEEP_BG)
                .borderRadius(24)
                .margin({ top: 16 })
                .shadow({ radius: 16, color: '#00E5A033', offsetX: 0, offsetY: 4 })
                .enabled(!this.submitting)
                .onClick(() => this.submitBooking())
            }
            .width('100%')
            .padding(16)
            .margin({ top: 12 })
            .alignItems(HorizontalAlign.Start)

            Column() {
              Text('\u5206\u4EAB\u94FE\u63A5: ' + this.content.shareUrl)
                .fontSize(12)
                .fontColor(BrandPalette.TEXT_MUTED)
                .width('100%')
                .copyOption(CopyOptions.LocalDevice)
            }
            .width('100%')
            .padding(16)
          }
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  StatItem(label: string, value: string) {
    Column() {
      Text(value)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(BrandPalette.TEXT_PRIMARY)
      Text(label)
        .fontSize(11)
        .fontColor(BrandPalette.TEXT_SECONDARY)
        .margin({ top: 2 })
    }
    .alignItems(HorizontalAlign.Center)
  }
}
