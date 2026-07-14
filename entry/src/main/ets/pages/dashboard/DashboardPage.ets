import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { ContentItem, ContentItemList } from '../../model/DataModels';
import { router } from '@kit.ArkUI';

@Component
export struct DashboardPage {
  @State contents: ContentItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadContents();
  }

  private async loadContents() {
    const uid: string = this.userId;
    if (uid.length === 0) {
      this.loading = false;
      return;
    }
    const resp: ApiResponse<ContentItem[]> = await HttpClient.get<ContentItem[]>('/api/content/user/' + uid, (data: Record<string, Object>): ContentItem[] => {
      return ContentItemList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) {
      this.contents = resp.data;
    }
    this.loading = false;
    this.refreshing = false;
  }

  build() {
    Column() {
      Row() {
        Text('推广看板')
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
      } else if (this.contents.length === 0) {
        Column() {
          Text('暂无推广内容')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
          Text('去发布第一篇推广吧')
            .fontSize(14)
            .fontColor($r('app.color.primary_color'))
            .margin({ top: 8 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/activities/ActivitiesPage' });
            })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.contents, (item: ContentItem) => {
              ListItem() {
                this.ContentCard(item)
              }
              .onClick(() => {
                const routeParams: Record<string, Object> = { 'contentId': item.id };
                router.pushUrl({ url: 'pages/share/SharePage', params: routeParams });
              })
            }, (item: ContentItem) => item.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadContents();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ContentCard(item: ContentItem) {
    Column() {
      Row() {
        Text(item.carModel)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
        Text('¥' + item.stats.estimatedEarnings.toFixed(2))
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.price_color'))
      }
      .width('100%')

      if (item.text) {
        Text(item.text)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 6 })
          .width('100%')
      }

      Row() {
        this.StatBadge('阅读', item.stats.views.toString())
        this.StatBadge('预约', item.stats.bookings.toString())
        this.StatBadge('分享', item.stats.shares.toString())
      }
      .width('100%')
      .margin({ top: 12 })
      .justifyContent(FlexAlign.SpaceAround)

      Row() {
        Column() {
          Text('阅读')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
          Progress({ value: item.stats.views, total: Math.max(item.stats.views, 100), type: ProgressType.Linear })
            .width(80)
            .height(6)
            .color($r('app.color.primary_color'))
            .margin({ top: 2 })
        }

        Column() {
          Text('预约')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
          Progress({ value: item.stats.bookings, total: Math.max(item.stats.bookings, 10), type: ProgressType.Linear })
            .width(80)
            .height(6)
            .color($r('app.color.price_color'))
            .margin({ top: 2 })
        }
      }
      .width('100%')
      .margin({ top: 12 })
      .justifyContent(FlexAlign.SpaceAround)

      Row() {
        Text('转化漏斗: 阅读→预约')
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
        Blank()
        Text(item.createdAt.slice(0, 10))
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .margin({ top: 8 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
  }

  @Builder
  StatBadge(label: string, value: string) {
    Column() {
      Text(value)
        .fontSize(18)
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
