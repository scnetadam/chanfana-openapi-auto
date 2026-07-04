import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { ActivityItem } from '../../model/DataModels';
import { RouterParams } from '../../model/RouterParams';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct ActivityDetailPage {
  @State activity: ActivityItem | null = null;
  @State loading: boolean = true;
  private activityId: string = '';

  aboutToAppear() {
    const rawParams: Object | null = router.getParams();
    const params: Record<string, Object> = (rawParams !== null && rawParams !== undefined) ? rawParams as Record<string, Object> : {};
    const rp: RouterParams = RouterParams.fromRecord(params);
    if (rp.id) {
      this.activityId = rp.id;
      this.loadDetail();
    }
  }

  private async loadDetail() {
    const resp: ApiResponse<ActivityItem> = await HttpClient.get<ActivityItem>('/api/activity/' + this.activityId, (data: Record<string, Object>): ActivityItem => {
      return ActivityItem.fromJson(data);
    });
    if (resp.success && resp.data !== null) {
      this.activity = resp.data;
    }
    this.loading = false;
  }

  private onPromoteClick(): void {
    if (this.activity !== null) {
      const routeParams: Record<string, Object> = { 'activityId': this.activity.id };
      router.pushUrl({ url: 'pages/publish/PublishPage', params: routeParams });
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

        Text('活动详情')
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
      } else if (this.activity !== null) {
        Scroll() {
          Column() {
            Column() {
              Text(this.activity.brand)
                .fontSize(14)
                .fontColor($r('app.color.primary_color'))
                .fontWeight(FontWeight.Medium)
              Text(this.activity.title)
                .fontSize(24)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .margin({ top: 8 })
              Text(this.activity.description)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 12 })
                .lineHeight(22)
            }
            .width('100%')
            .padding(20)
            .alignItems(HorizontalAlign.Start)

            Column() {
              Text('奖励规则')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))

              Row() {
                Column() {
                  Text('¥' + this.activity.rewardPerView.toFixed(2))
                    .fontSize(20)
                    .fontWeight(FontWeight.Bold)
                    .fontColor($r('app.color.price_color'))
                  Text('每次阅读')
                    .fontSize(12)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 4 })
                }
                .layoutWeight(1)

                Column() {
                  Text('¥' + this.activity.rewardPerBooking.toFixed(0))
                    .fontSize(20)
                    .fontWeight(FontWeight.Bold)
                    .fontColor($r('app.color.price_color'))
                  Text('每次试驾预约')
                    .fontSize(12)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 4 })
                }
                .layoutWeight(1)
              }
              .width('100%')
              .margin({ top: 16 })
            }
            .width('100%')
            .padding(20)
            .alignItems(HorizontalAlign.Start)

            Column() {
              Text('活动信息')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
              Text('车型: ' + this.activity.model)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 8 })
              Text('活动周期: ' + this.activity.startDate + ' ~ ' + this.activity.endDate)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 4 })
              Text('推广预算: ¥' + this.activity.totalBudget)
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 4 })
            }
            .width('100%')
            .padding(20)
            .alignItems(HorizontalAlign.Start)

            Button('立即推广')
              .width('90%')
              .height(48)
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .backgroundColor($r('app.color.primary_color'))
              .fontColor(Color.White)
              .borderRadius(24)
              .margin({ top: 24, bottom: 32 })
              .onClick(() => this.onPromoteClick())
          }
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }
}
