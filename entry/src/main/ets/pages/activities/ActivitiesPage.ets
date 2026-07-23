import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { ActivityItem, ActivityItemList } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandSeal, BrandIcon } from '../../common/BrandCI';
import { router } from '@kit.ArkUI';

@Component
export struct ActivitiesPage {
  @State activities: ActivityItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';

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
    this.refreshing = false;
  }

  build() {
    Column() {
      Row() {
        Text('\u63A8\u5E7F\u6D3B\u52A8')
          .fontSize(BrandTypography.PAGE_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH)
            .fontSize(14)
            .fontColor(BrandPalette.SEAL_RED)
            .opacity(0.6)
          Text('PROMO')
            .fontSize(10)
            .fontColor(BrandPalette.PRIMARY)
            .letterSpacing(2)
            .margin({ left: 4 })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
          Text('LOADING...')
            .fontSize(12).fontColor(BrandPalette.TEXT_MUTED).letterSpacing(2).margin({ top: 12 })
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else if (this.activities.length === 0) {
        Column() {
          Text('暂无活动')
            .fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.activities, (item: ActivityItem) => {
              ListItem() {
                this.ActivityCard(item)
              }.onClick(() => {
                const routeParams: Record<string, Object> = { 'id': item.id };
                router.pushUrl({ url: 'pages/activitydetail/ActivityDetailPage', params: routeParams });
              })
            }, (item: ActivityItem) => item.id)
          }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
        }.onRefreshing(() => { this.loadActivities(); })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  ActivityCard(item: ActivityItem) {
    Column() {
      Row() {
        Column() {
          Text(item.brand)
            .fontSize(11).fontColor(BrandPalette.PRIMARY).fontWeight(FontWeight.Medium).letterSpacing(1)
          Text(item.title)
            .fontSize(18).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis }).margin({ top: 4 })
          Text(item.description)
            .fontSize(13).fontColor(BrandPalette.TEXT_SECONDARY)
            .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis }).margin({ top: 6 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Start)

        Column() {
          Text('\u00A5' + item.rewardPerBooking.toFixed(0))
            .fontSize(22).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
          Text('每笔试驾')
            .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
        }.alignItems(HorizontalAlign.End).margin({ left: 12 })
      }.width('100%').padding(16)

      Row() {
        Text(item.model)
          .fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
        Blank()
        Text(item.startDate + ' ~ ' + item.endDate)
          .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
      }.width('100%').padding({ left: 16, right: 16, bottom: 12 })
    }
    .width('100%').borderRadius(BrandRadius.CARD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
    .shadow({ radius: 8, color: '#0A0E1A66', offsetX: 0, offsetY: 2 })
  }
}
