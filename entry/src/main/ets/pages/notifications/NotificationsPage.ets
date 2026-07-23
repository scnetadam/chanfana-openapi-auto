import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { NotificationItem, NotificationList } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct NotificationsPage {
  @State notifications: NotificationItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
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
    this.refreshing = false;
  }

  private async markAsRead(item: NotificationItem) {
    if (item.read) return;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'notificationId': item.id,
    };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/notification/mark-read', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      this.loadNotifications();
    }
  }

  private async markAllRead() {
    const body: Record<string, Object> = {
      'userId': this.userId,
    };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/notification/mark-all-read', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      promptAction.showToast({ message: '已全部标为已读' });
      this.loadNotifications();
    }
  }

  private getTypeIcon(type: string): string {
    if (type === 'booking') return 'sys.symbol.calendar';
    if (type === 'wallet') return 'sys.symbol.creditcard';
    if (type === 'system') return 'sys.symbol.bell';
    if (type === 'kol_audit') return 'sys.symbol.person_badge';
    if (type === 'opc') return 'sys.symbol.building';
    if (type === 'kol_task') return 'sys.symbol.list_bullet';
    if (type === 'settlement') return 'sys.symbol.bitcoin_sign_circle';
    return 'sys.symbol.bell';
  }

  private getTypeColor(type: string): string {
    if (type === 'booking') return '#007DFF';
    if (type === 'wallet') return '#E84026';
    if (type === 'system') return '#6366F1';
    if (type === 'kol_audit') return '#10B981';
    if (type === 'opc') return '#F59E0B';
    if (type === 'kol_task') return '#007DFF';
    if (type === 'settlement') return '#E84026';
    return '#6366F1';
  }

  private formatTime(isoStr: string): string {
    const sliced: string = isoStr.slice(0, 16);
    return sliced.replace('T', ' ');
  }

  private getUnreadCount(): number {
    let count: number = 0;
    for (let i = 0; i < this.notifications.length; i++) {
      if (!this.notifications[i].read) {
        count++;
      }
    }
    return count;
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

        Row() {
          Text('全部已读')
            .fontSize(13)
            .fontColor($r('app.color.primary_color'))
        }
        .width(60)
        .height(40)
        .justifyContent(FlexAlign.Center)
        .onClick(() => this.markAllRead())
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
        if (this.getUnreadCount() > 0) {
          Row() {
            Text(this.getUnreadCount().toString() + ' 条未读消息')
              .fontSize(13)
              .fontColor($r('app.color.primary_color'))
          }
          .width('100%')
          .padding({ left: 20, top: 8, bottom: 4 })
        }

        Refresh({ refreshing: $refreshing }) {
          List({ space: 8 }) {
            ForEach(this.notifications, (item: NotificationItem) => {
              ListItem() {
                this.NotificationCard(item)
              }
            }, (item: NotificationItem) => item.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadNotifications();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  NotificationCard(item: NotificationItem) {
    Row() {
      Column() {
        SymbolGlyph($r(this.getTypeIcon(item.type)))
          .fontSize(24)
          .fontColor([this.getTypeColor(item.type)])
      }
      .width(44)
      .height(44)
      .borderRadius(22)
      .backgroundColor($r('app.color.card_background'))
      .justifyContent(FlexAlign.Center)
      .margin({ right: 12 })

      Column() {
        Text(item.title)
          .fontSize(15)
          .fontWeight(item.read ? FontWeight.Normal : FontWeight.Bold)
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
    .backgroundColor(item.read ? $r('app.color.card_background') : $r('app.color.primary_bg_color'))
    .onClick(() => this.markAsRead(item))
  }
}
