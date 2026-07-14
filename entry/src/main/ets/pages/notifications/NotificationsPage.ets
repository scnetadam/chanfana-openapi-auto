import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { NotificationItem, NotificationList } from '../../model/DataModels';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct NotificationsPage {
  @State notifications: NotificationItem[] = [];
  @State loading: boolean = true;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadNotifications();
  }

  private async loadNotifications() {
    const uid: string = this.userId;
    if (uid.length === 0) {
      this.loading = false;
      return;
    }
    const resp: ApiResponse<NotificationList> = await HttpClient.get<NotificationList>(
      '/api/notification/list?userId=' + uid,
      (data: Record<string, Object>): NotificationList => {
        return NotificationList.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.notifications = resp.data.list;
    }
    this.loading = false;
  }

  private getTypeIcon(type: string): string {
    if (type === 'booking') return 'B';
    if (type === 'wallet') return 'W';
    if (type === 'system') return 'S';
    if (type === 'kol_audit') return 'K';
    if (type === 'opc') return 'O';
    return 'N';
  }

  private formatTime(isoStr: string): string {
    const sliced: string = isoStr.slice(0, 16);
    return sliced.replace('T', ' ');
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

        Text('消息通知')
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
      } else if (this.notifications.length === 0) {
        Column() {
          Text('暂无消息')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 8 }) {
          ForEach(this.notifications, (item: NotificationItem) => {
            ListItem() {
              Row() {
                Text(this.getTypeIcon(item.type))
                  .fontSize(24)
                  .margin({ right: 12 })

                Column() {
                  Text(item.title)
                    .fontSize(15)
                    .fontWeight(FontWeight.Medium)
                    .fontColor($r('app.color.text_primary'))
                    .width('100%')
                  Text(item.content)
                    .fontSize(13)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 4 })
                    .width('100%')
                    .maxLines(2)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                  Text(this.formatTime(item.createdAt))
                    .fontSize(11)
                    .fontColor($r('app.color.text_secondary'))
                    .margin({ top: 4 })
                    .width('100%')
                }
                .layoutWeight(1)
                .alignItems(HorizontalAlign.Start)

                if (!item.read) {
                  Circle()
                    .width(8)
                    .height(8)
                    .fill($r('app.color.price_color'))
                    .margin({ left: 8 })
                }
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor($r('app.color.card_background'))
            }
          }, (item: NotificationItem) => item.id)
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16, top: 8 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }
}
