import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { ActivityItem, ActivityItemList } from '../../model/DataModels';
import { router } from '@kit.ArkUI';

@Component
export struct ActivitiesPage {
  @State activities: ActivityItem[] = [];
  @State loading: boolean = true;

  aboutToAppear() {
    this.loadActivities();
  }

  private async loadActivities() {
    const resp: ApiResponse<ActivityItem[]> = await HttpClient.get<ActivityItem[]>('/api/activity/list', (data: Record<string, Object>): ActivityItem[] => {
      return ActivityItemList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) {
      this.activities = resp.data;
    }
    this.loading = false;
  }

  build() {
    Column() {
      Row() {
        Text('推广活动')
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
          Text('加载中...')
            .fontSize(14)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 12 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.activities.length === 0) {
        Column() {
          Text('暂无活动')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 12 }) {
          ForEach(this.activities, (item: ActivityItem) => {
            ListItem() {
              this.ActivityCard(item)
            }
            .onClick(() => {
              const routeParams: Record<string, Object> = { 'id': item.id };
              router.pushUrl({ url: 'pages/activitydetail/ActivityDetailPage', params: routeParams });
            })
          }, (item: ActivityItem) => item.id)
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16, top: 4 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ActivityCard(item: ActivityItem) {
    Column() {
      Row() {
        Column() {
          Text(item.brand)
            .fontSize(12)
            .fontColor($r('app.color.primary_color'))
            .fontWeight(FontWeight.Medium)
          Text(item.title)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 4 })
          Text(item.description)
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 6 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)

        Column() {
          Text('¥' + item.rewardPerBooking.toFixed(0))
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('每笔试驾')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
        }
        .alignItems(HorizontalAlign.End)
        .margin({ left: 12 })
      }
      .width('100%')
      .padding(16)

      Row() {
        Text(item.model)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Blank()
        Text(item.startDate + ' ~ ' + item.endDate)
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 12 })
    }
    .width('100%')
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
  }
}
