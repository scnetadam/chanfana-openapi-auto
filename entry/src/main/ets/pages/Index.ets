import { ActivitiesPage } from './activities/ActivitiesPage';
import { AiDashboardPage } from './aidashboard/AiDashboardPage';
import { KolTaskPage } from './koltask/KolTaskPage';
import { SettlementPage } from './settlement/SettlementPage';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct Index {
  @State currentIndex: number = 0;
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';
  @StorageProp('avatarUrl') avatarUrl: string = '';

  aboutToAppear() {
    if (this.userId.length === 0) {
      router.replaceUrl({ url: 'pages/login/LoginPage' });
    }
    const savedTab: number | undefined = AppStorage.get<number>('tabIndex');
    if (savedTab !== null && savedTab !== undefined && savedTab >= 0 && savedTab <= 4) {
      this.currentIndex = savedTab;
      AppStorage.SetOrCreate<number>('tabIndex', -1);
    }
  }

  build() {
    Tabs({ index: this.currentIndex }) {
      TabContent() {
        ActivitiesPage()
      }
      .tabBar(this.TabBarBuilder(0, '活动', $r('sys.symbol.calendar')))

      TabContent() {
        KolTaskPage()
      }
      .tabBar(this.TabBarBuilder(1, '任务', $r('sys.symbol.list_bullet')))

      TabContent() {
        AiDashboardPage()
      }
      .tabBar(this.TabBarBuilder(2, 'AI评估', $r('sys.symbol.chart_bar')))

      TabContent() {
        SettlementPage()
      }
      .tabBar(this.TabBarBuilder(3, '结算', $r('sys.symbol.creditcard')))

      TabContent() {
        this.MineTab()
      }
      .tabBar(this.TabBarBuilder(4, '我的', $r('sys.symbol.person')))
    }
    .width('100%')
    .height('100%')
    .barPosition(BarPosition.End)
    .onChange((index: number) => {
      this.currentIndex = index;
    })
  }

  @Builder
  MineTab() {
    Column() {
      Column() {
        Stack() {
          Circle()
            .width(72)
            .height(72)
            .fill($r('app.color.primary_color'))
          if (this.avatarUrl.length > 0) {
            Image(this.avatarUrl)
              .width(72)
              .height(72)
              .borderRadius(36)
          }
        }
        Text(this.nickName)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .margin({ top: 12 })
        Text('KOL推广员 · 龟钮印信')
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
      }
      .width('100%')
      .padding({ top: 40, bottom: 24 })
      .alignItems(HorizontalAlign.Center)

      Column() {
        this.MenuRow('KOL认证审核', () => {
          router.pushUrl({ url: 'pages/kolaudit/KolAuditPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('OPC创业支持', () => {
          router.pushUrl({ url: 'pages/opcsupport/OpcSupportPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('AI工具市场', () => {
          router.pushUrl({ url: 'pages/aitools/AiToolsPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('消息通知', () => {
          router.pushUrl({ url: 'pages/notifications/NotificationsPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('发布内容', () => {
          router.pushUrl({ url: 'pages/publish/PublishPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('B端商家认证', () => {
          router.pushUrl({ url: 'pages/bizcert/BizCertPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('IP存证中心', () => {
          router.pushUrl({ url: 'pages/hash/HashPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('CFS数据存储', () => {
          router.pushUrl({ url: 'pages/cfsstorage/CfsStoragePage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('MAAS大模型广场', () => {
          router.pushUrl({ url: 'pages/maasplaza/MaasPlazaPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('视频流管理', () => {
          router.pushUrl({ url: 'pages/videostream/VideoStreamPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('立体展示', () => {
          router.pushUrl({ url: 'pages/stereodisplay/StereoDisplayPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('推广看板', () => {
          router.pushUrl({ url: 'pages/dashboard/DashboardPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('推广钱包', () => {
          router.pushUrl({ url: 'pages/wallet/WalletPage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('个人设置', () => {
          router.pushUrl({ url: 'pages/profile/ProfilePage' });
        })
        Divider().color('#1A182431')
        this.MenuRow('关于', () => {
          promptAction.showToast({ message: '龟钮印信 v3.3.0 — KOL实时加权交易系统' });
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16 })
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
      .margin({ left: 16, right: 16 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  MenuRow(title: string, action: () => void) {
    Row() {
      Text(title)
        .fontSize(15)
        .fontColor($r('app.color.text_primary'))
        .layoutWeight(1)
      Text('>')
        .fontSize(16)
        .fontColor($r('app.color.text_secondary'))
    }
    .width('100%')
    .height(52)
    .padding({ left: 16, right: 16 })
    .onClick(action)
  }

  @Builder
  TabBarBuilder(index: number, title: string, icon: Resource) {
    Column() {
      SymbolGlyph(icon)
        .fontSize(22)
        .fontColor(this.currentIndex === index ? [$r('app.color.primary_color')] : [Color.Gray])
      Text(title)
        .fontSize(12)
        .fontColor(this.currentIndex === index ? $r('app.color.primary_color') : Color.Gray)
        .margin({ top: 4 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
