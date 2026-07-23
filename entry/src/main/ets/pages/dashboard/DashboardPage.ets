import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { ContentItem, ContentItemList } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandSeal, BrandIcon, BrandSlogan } from '../../common/BrandCI';
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
        Text('\u63A8\u5E7F\u770B\u677F')
          .fontSize(BrandTypography.PAGE_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH)
            .fontSize(14)
            .fontColor(BrandPalette.SEAL_RED)
            .opacity(0.6)
          Text('DASHBOARD')
            .fontSize(10)
            .fontColor(BrandPalette.NEON_BLUE)
            .letterSpacing(2)
            .margin({ left: 4 })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

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
      } else if (this.contents.length === 0) {
        Column() {
          Column()
            .width(80)
            .height(80)
            .borderRadius(BrandRadius.SEAL)
            .border({ width: 2, color: BrandSeal.SEAL_BORDER, style: BorderStyle.Solid })
            .backgroundColor(BrandSeal.SEAL_BG)
            .justifyContent(FlexAlign.Center)
          Text(BrandIcon.SEAL_GLYPH)
            .fontSize(36)
            .fontWeight(FontWeight.Bold)
            .fontColor(BrandSeal.SEAL_TEXT)
            .margin({ top: -52 })
          Text('\u6682\u65E0\u63A8\u5E7F\u5185\u5BB9')
            .fontSize(16)
            .fontColor(BrandPalette.TEXT_MUTED)
            .margin({ top: 20 })
          Text('\u53BB\u53D1\u5E03\u7B2C\u4E00\u7BC7\u63A8\u5E7F\u5427')
            .fontSize(14)
            .fontColor(BrandPalette.PRIMARY)
            .margin({ top: 8 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/activities/ActivitiesPage' });
            })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
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
    .backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  ContentCard(item: ContentItem) {
    Column() {
      Row() {
        Text(item.carModel)
          .fontSize(BrandTypography.CARD_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1)
        Text('\u00A5' + item.stats.estimatedEarnings.toFixed(2))
          .fontSize(BrandTypography.CARD_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.GOLD)
      }
      .width('100%')

      if (item.text.length > 0) {
        Text(item.text)
          .fontSize(13)
          .fontColor(BrandPalette.TEXT_SECONDARY)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 6 })
          .width('100%')
      }

      Row() {
        this.StatBadge('\u9605\u8BFB', item.stats.views.toString())
        this.StatBadge('\u9884\u7EA6', item.stats.bookings.toString())
        this.StatBadge('\u5206\u4EAB', item.stats.shares.toString())
      }
      .width('100%')
      .margin({ top: 12 })
      .justifyContent(FlexAlign.SpaceAround)

      Row() {
        Column() {
          Text('\u9605\u8BFB')
            .fontSize(10)
            .fontColor(BrandPalette.TEXT_SECONDARY)
          Progress({ value: item.stats.views, total: Math.max(item.stats.views, 100), type: ProgressType.Linear })
            .width(80)
            .height(6)
            .color(BrandPalette.PRIMARY)
            .backgroundColor('#00E5A015')
            .margin({ top: 2 })
        }

        Column() {
          Text('\u9884\u7EA6')
            .fontSize(10)
            .fontColor(BrandPalette.TEXT_SECONDARY)
          Progress({ value: item.stats.bookings, total: Math.max(item.stats.bookings, 10), type: ProgressType.Linear })
            .width(80)
            .height(6)
            .color(BrandPalette.CYBER_RED)
            .backgroundColor('#FF3D7115')
            .margin({ top: 2 })
        }
      }
      .width('100%')
      .margin({ top: 12 })
      .justifyContent(FlexAlign.SpaceAround)

      Row() {
        Text('\u8F6C\u5316\u6F0F\u6597: \u9605\u8BFB\u2192\u9884\u7EA6')
          .fontSize(11)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Blank()
        if (item.trackId.length > 0) {
          Text('HASH')
            .fontSize(9)
            .fontColor(BrandPalette.PRIMARY)
            .letterSpacing(1)
            .padding({ left: 4, right: 4, top: 1, bottom: 1 })
            .borderRadius(3)
            .backgroundColor('#00E5A018')
            .margin({ right: 6 })
        }
        Text(item.createdAt.slice(0, 10))
          .fontSize(11)
          .fontColor(BrandPalette.TEXT_MUTED)
      }
      .width('100%')
      .margin({ top: 8 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(BrandRadius.CARD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
    .shadow({ radius: 8, color: '#0A0E1A66', offsetX: 0, offsetY: 2 })
  }

  @Builder
  StatBadge(label: string, value: string) {
    Column() {
      Text(value)
        .fontSize(18)
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
