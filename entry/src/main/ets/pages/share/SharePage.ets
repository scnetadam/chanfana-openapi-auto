import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ContentItem, BookingResult } from '../../model/DataModels';
import { RouterParams } from '../../model/RouterParams';
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
    if (rp.contentId) {
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
    if (!this.bookName.trim()) {
      promptAction.showToast({ message: '请输入姓名' });
      return;
    }
    if (!this.bookPhone.trim()) {
      promptAction.showToast({ message: '请输入手机号' });
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
      promptAction.showToast({ message: resp.error || '预约失败' });
    }
  }

  build() {
    Column() {
      Row() {
        Row() {
          Text('<')
            .fontSize(22)
            .fontColor($r('app.color.text_primary'))
            .onClick(() => router.back())
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)

        Text('内容详情')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row() {
          SymbolGlyph($r('sys.symbol.share'))
            .fontSize(20)
            .fontColor([$r('app.color.primary_color')])
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
              promptAction.showToast({ message: '链接已复制' });
            } catch (e) {
              promptAction.showToast({ message: '复制失败' });
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
            .color($r('app.color.primary_color'))
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
                  .fontColor($r('app.color.primary_color'))
                  .fontWeight(FontWeight.Medium)
              }
              Text(this.content.carModel)
                .fontSize(22)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .margin({ top: 4 })
            }
            .width('100%')
            .padding(16)
            .alignItems(HorizontalAlign.Start)

            if (this.content.text) {
              Column() {
                Text(this.content.text)
                  .fontSize(15)
                  .fontColor($r('app.color.text_primary'))
                  .lineHeight(24)
                  .width('100%')
              }
              .width('100%')
              .padding({ left: 16, right: 16, bottom: 12 })
              .alignItems(HorizontalAlign.Start)
            }

            Row() {
              this.StatItem('阅读', this.content.stats.views.toString())
              Divider().vertical(true).height(24).color('#1A182431')
              this.StatItem('预约', this.content.stats.bookings.toString())
              Divider().vertical(true).height(24).color('#1A182431')
              this.StatItem('收益', '¥' + this.content.stats.estimatedEarnings.toFixed(2))
            }
            .width('100%')
            .height(64)
            .justifyContent(FlexAlign.SpaceEvenly)
            .backgroundColor($r('app.color.card_background'))
            .borderRadius(12)
            .margin({ left: 16, right: 16 })

            Column() {
              Text('试驾预约')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .width('100%')

              TextInput({ placeholder: '您的姓名' })
                .width('100%')
                .height(44)
                .margin({ top: 12 })
                .onChange((value: string) => { this.bookName = value; })

              TextInput({ placeholder: '手机号码' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .type(InputType.PhoneNumber)
                .onChange((value: string) => { this.bookPhone = value; })

              TextInput({ placeholder: '所在城市 (选填)' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.bookCity = value; })

              Button(this.submitting ? '提交中...' : '立即预约试驾')
                .width('100%')
                .height(48)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .backgroundColor($r('app.color.primary_color'))
                .fontColor(Color.White)
                .borderRadius(24)
                .margin({ top: 16 })
                .enabled(!this.submitting)
                .onClick(() => this.submitBooking())
            }
            .width('100%')
            .padding(16)
            .margin({ top: 12 })
            .alignItems(HorizontalAlign.Start)

            Column() {
              Text('分享链接: ' + this.content.shareUrl)
                .fontSize(12)
                .fontColor($r('app.color.text_secondary'))
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
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  StatItem(label: string, value: string) {
    Column() {
      Text(value)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.text_primary'))
      Text(label)
        .fontSize(11)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 2 })
    }
    .alignItems(HorizontalAlign.Center)
  }
}
