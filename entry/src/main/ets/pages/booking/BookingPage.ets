import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { BookingItem, BookingItemList, BookingResult } from '../../model/DataModels';
import { RouterParams } from '../../model/RouterParams';
import { router } from '@kit.ArkUI';
import { AiContentService } from '../../common/AiContentService';
import { AiBookingSuggestion } from '../../model/DataModels';
import { VoiceService } from '../../common/AiVoiceService';

@Entry
@Component
struct BookingPage {
  @State bookingId: string = '';
  @State booking: BookingItem | null = null;
  @State loading: boolean = true;
  @State checkInResult: string = '';
  @State aiSuggestion: AiBookingSuggestion | null = null;
  @State loadingSuggestion: boolean = false;
  private contentService: AiContentService = AiContentService.getInstance();
  private voiceService: VoiceService = VoiceService.getInstance();

  aboutToAppear() {
    const rawParams: Object | null = router.getParams();
    const params: Record<string, Object> = (rawParams !== null && rawParams !== undefined) ? rawParams as Record<string, Object> : {};
    const rp: RouterParams = RouterParams.fromRecord(params);
    if (rp.bookingId) {
      this.bookingId = rp.bookingId;
      this.loadBooking();
      this.loadAiSuggestion();
    }
  }

  private async loadBooking() {
    const resp: ApiResponse<BookingItem[]> = await HttpClient.get<BookingItem[]>('/api/booking/' + this.bookingId, (data: Record<string, Object>): BookingItem[] => {
      return BookingItemList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null && resp.data.length > 0) {
      this.booking = resp.data[0];
    }
    this.loading = false;
  }

  private async loadAiSuggestion() {
    if (this.bookingId.length === 0) return;
    this.loadingSuggestion = true;
    const resp = await this.contentService.optimizeBooking(this.userId, this.bookingId);
    if (resp.success && resp.data !== null) {
      this.aiSuggestion = resp.data;
    }
    this.loadingSuggestion = false;
  }

  private playVoiceReminder() {
    if (this.aiSuggestion !== null) {
      this.voiceService.speak(this.aiSuggestion.reminderScript);
    }
  }

  private async doCheckIn() {
    const body: Record<string, Object> = {};
    body['bookingId'] = this.bookingId;
    const resp: ApiResponse<RouterParams> = await HttpClient.post<RouterParams>('/api/booking/checkin', toPostBody(body), (data: Record<string, Object>): RouterParams => {
      return RouterParams.fromRecord(data);
    });
    if (resp.success && resp.data !== null) {
      this.checkInResult = resp.data.message || '核销成功';
    }
  }

  private maskPhone(phone: string): string {
    if (phone.length >= 7) {
      return phone.slice(0, 3) + '****' + phone.slice(7);
    }
    return phone;
  }

  private formatDateTime(isoStr: string): string {
    const sliced: string = isoStr.slice(0, 16);
    return sliced.replace('T', ' ');
  }

  private StatusText(status: string): string {
    if (status === 'pending') return '待确认';
    if (status === 'checked_in') return '已到店';
    if (status === 'completed') return '已完成';
    if (status === 'cancelled') return '已取消';
    return status;
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

        Text('预约结果')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40)
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
      } else {
        Scroll() {
          Column() {
            Column() {
              Text('预约成功!')
                .fontSize(28)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.primary_color'))
              Text('您的试驾预约已提交，经销商将尽快联系您')
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 8 })
                .textAlign(TextAlign.Center)
            }
            .width('100%')
            .padding(24)
            .alignItems(HorizontalAlign.Center)

            if (this.booking !== null) {
              Column() {
                this.InfoRow('预约编号', this.booking.id)
                this.InfoRow('姓名', this.booking.name)
                this.InfoRow('手机', this.maskPhone(this.booking.phone))
                if (this.booking.city) {
                  this.InfoRow('城市', this.booking.city)
                }
                this.InfoRow('状态', this.StatusText(this.booking.status))
                this.InfoRow('提交时间', this.formatDateTime(this.booking.createdAt))
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor($r('app.color.card_background'))
              .margin({ left: 16, right: 16 })
            }

            if (this.checkInResult) {
              Column() {
                Text(this.checkInResult)
                  .fontSize(14)
                  .fontColor($r('app.color.price_color'))
                  .fontWeight(FontWeight.Medium)
              }
              .width('100%')
              .padding(16)
              .alignItems(HorizontalAlign.Center)
            }

            if (this.aiSuggestion !== null) {
              Column() {
                Text('AI智能建议')
                  .fontSize(15)
                  .fontWeight(FontWeight.Bold)
                  .fontColor($r('app.color.purple_color'))
                  .width('100%')
                
                Row() {
                  Text('推荐时段: ')
                    .fontSize(13)
                    .fontColor($r('app.color.text_secondary'))
                  Text(this.aiSuggestion.bestTimeSlot)
                    .fontSize(13)
                    .fontColor($r('app.color.text_primary'))
                    .fontWeight(FontWeight.Medium)
                }
                .width('100%')
                .margin({ top: 8 })

                Row() {
                  Text('推荐门店: ')
                    .fontSize(13)
                    .fontColor($r('app.color.text_secondary'))
                  Text(this.aiSuggestion.recommendedDealer)
                    .fontSize(13)
                    .fontColor($r('app.color.text_primary'))
                    .fontWeight(FontWeight.Medium)
                }
                .width('100%')
                .margin({ top: 4 })

                if (this.aiSuggestion.preparationTips.length > 0) {
                  Text('准备事项:')
                    .fontSize(13)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 8 })
                    .width('100%')
                  Column() {
                    ForEach(this.aiSuggestion.preparationTips, (tip: string, index: number) => {
                      Row() {
                        Text((index + 1).toString() + '.')
                          .fontSize(12)
                          .fontColor($r('app.color.primary_color'))
                          .margin({ right: 4 })
                        Text(tip)
                          .fontSize(12)
                          .fontColor($r('app.color.text_primary'))
                          .layoutWeight(1)
                      }
                      .width('100%')
                      .margin({ top: 4 })
                    }, (tip: string, index: number) => tip + '_' + index.toString())
                  }
                  .width('100%')
                }

                if (this.aiSuggestion.voiceReminderEnabled) {
                  Row() {
                    Text('语音提醒')
                      .fontSize(13)
                      .fontColor($r('app.color.primary_color'))
                      .margin({ right: 8 })
                    Text('播放')
                      .fontSize(13)
                      .fontColor(Color.White)
                      .backgroundColor($r('app.color.primary_color'))
                      .borderRadius(10)
                      .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                      .onClick(() => this.playVoiceReminder())
                  }
                  .margin({ top: 8 })
                }
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor($r('app.color.card_background'))
              .margin({ left: 16, right: 16, top: 12 })
              .alignItems(HorizontalAlign.Start)
            } else if (this.loadingSuggestion) {
              Row() {
                LoadingProgress()
                  .width(20)
                  .height(20)
                  .color($r('app.color.purple_color'))
                Text('AI建议加载中...')
                  .fontSize(13)
                  .fontColor($r('app.color.text_secondary'))
                  .margin({ left: 8 })
              }
              .width('100%')
              .padding({ left: 16, top: 8, bottom: 8 })
            }

            Column() {
              Button('到店核销 (v1.0 自动通过)')
                .width('90%')
                .height(44)
                .fontSize(15)
                .backgroundColor($r('app.color.primary_color'))
                .fontColor(Color.White)
                .borderRadius(22)
                .onClick(() => this.doCheckIn())

              Button('返回活动列表')
                .width('90%')
                .height(44)
                .fontSize(15)
                .backgroundColor(Color.Transparent)
                .fontColor($r('app.color.primary_color'))
                .borderRadius(22)
                .border({ width: 1, color: $r('app.color.primary_color') })
                .margin({ top: 12 })
                .onClick(() => {
                  router.clear();
                  router.pushUrl({ url: 'pages/activities/ActivitiesPage' });
                })
            }
            .width('100%')
            .padding(24)
            .alignItems(HorizontalAlign.Center)
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
  InfoRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(14)
        .fontColor($r('app.color.text_secondary'))
        .width(80)
      Text(value)
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .layoutWeight(1)
    }
    .width('100%')
    .height(40)
  }
}
