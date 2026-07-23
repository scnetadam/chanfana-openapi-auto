import { ActivitiesPage } from './activities/ActivitiesPage';
import { AiDashboardPage } from './aidashboard/AiDashboardPage';
import { KolTaskPage } from './koltask/KolTaskPage';
import { SettlementPage } from './settlement/SettlementPage';
import { BrandPalette, BrandSeal, BrandSlogan, BrandIcon } from '../common/BrandCI';
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
      .tabBar(this.TabBarBuilder(0, '资讯', $r('sys.symbol.calendar')))

      TabContent() {
        KolTaskPage()
      }
      .tabBar(this.TabBarBuilder(1, '任务', $r('sys.symbol.list_bullet')))

      TabContent() {
        AiDashboardPage()
      }
      .tabBar(this.TabBarBuilder(2, 'AI', $r('sys.symbol.chart_bar')))

      TabContent() {
        SettlementPage()
      }
      .tabBar(this.TabBarBuilder(3, '收付', $r('sys.symbol.creditcard')))

      TabContent() {
        this.MineTab()
      }
      .tabBar(this.TabBarBuilder(4, '我的', $r('sys.symbol.person')))
    }
    .width('100%')
    .height('100%')
    .barPosition(BarPosition.End)
    .barBackgroundColor(BrandPalette.CARD_BG)
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
            .width(80)
            .height(80)
            .fill('#0A162818')
          Circle()
            .width(80)
            .height(80)
            .fill('#0A162818')
            .border({ width: 2, color: '#0A162844', style: BorderStyle.Solid })
          if (this.avatarUrl.length > 0) {
            Image(this.avatarUrl)
              .width(74)
              .height(74)
              .borderRadius(37)
          } else {
            Stack() {
              Text(this.nickName.length > 0 ? this.nickName.charAt(0) : BrandIcon.SEAL_GLYPH)
                .fontSize(28)
                .fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.SEAL_RED)
              Text(BrandIcon.KNOB_SYMBOL)
                .fontSize(10)
                .fontColor(BrandSeal.KNOB_HIGHLIGHT)
                .offset({ y: -36 })
            }
          }
        }
        .shadow({ radius: 16, color: '#0A162822', offsetX: 0, offsetY: 4 })
        Text(this.nickName)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .margin({ top: 12 })
        Row() {
          Text('KOL\u63A8\u5E7F\u5458')
            .fontSize(12)
            .fontColor(BrandPalette.PRIMARY)
            .backgroundColor('#00E5A018')
            .borderRadius(4)
            .padding({ left: 6, right: 6, top: 2, bottom: 2 })
           Text('\u9F9F\u94AE\u5370\u9274')
             .fontSize(12)
             .fontColor(BrandPalette.SEAL_RED)
             .backgroundColor('#0A162818')
             .borderRadius(4)
             .padding({ left: 6, right: 6, top: 2, bottom: 2 })
             .margin({ left: 6 })
          Text(BrandSlogan.EN)
            .fontSize(9)
            .fontColor(BrandPalette.TEXT_MUTED)
            .letterSpacing(1)
            .margin({ left: 6 })
        }
        .margin({ top: 6 })
      }
      .width('100%')
      .padding({ top: 40, bottom: 24 })
      .alignItems(HorizontalAlign.Center)
      .linearGradient({
        direction: GradientDirection.Bottom,
        colors: [['#0A0E1A', 0.0], ['#0D0A1A', 0.4], ['#131929', 1.0]]
      })

      Scroll() {
        Column() {
          Text('KOL \u670D\u52A1')
            .fontSize(11)
            .fontColor(BrandPalette.PRIMARY)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('KOL\u8BA4\u8BC1\u5BA1\u6838', () => {
            router.pushUrl({ url: 'pages/kolaudit/KolAuditPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u53D1\u5E03\u5185\u5BB9', () => {
            router.pushUrl({ url: 'pages/publish/PublishPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u63A8\u5E7F\u770B\u677F', () => {
            router.pushUrl({ url: 'pages/dashboard/DashboardPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u63A8\u5E7F\u94B1\u5305', () => {
            router.pushUrl({ url: 'pages/wallet/WalletPage' });
          })

          Text('AI \u80FD\u529B')
            .fontSize(11)
            .fontColor(BrandPalette.ACCENT)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, top: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('AI\u5DE5\u5177\u5E02\u573A', () => {
            router.pushUrl({ url: 'pages/aitools/AiToolsPage' });
          })
          this.CyberDivider()
          this.MenuRow('AI\u8BED\u97F3\u52A9\u624B', () => {
            router.pushUrl({ url: 'pages/aivoice/AiVoiceAssistantPage' });
          })
          this.CyberDivider()
          this.MenuRow('AI\u70ED\u95E8\u9009\u9898', () => {
            router.pushUrl({ url: 'pages/aitopics/AiTopicsPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u6C7D\u8F66\u77E5\u8BC6\u5E93', () => {
            router.pushUrl({ url: 'pages/aiknowledge/AiKnowledgePage' });
          })

          Text('\u5546\u4E1A\u670D\u52A1')
            .fontSize(11)
            .fontColor(BrandPalette.GOLD)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, top: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('OPC\u521B\u4E1A\u5E7F\u573A', () => {
            router.pushUrl({ url: 'pages/opcplaza/OpcPlazaPage' });
          })
          this.CyberDivider()
          this.MenuRow('B\u7AEF\u5546\u5BB6\u8BA4\u8BC1', () => {
            router.pushUrl({ url: 'pages/bizcert/BizCertPage' });
          })

          Text('\u5B58\u8BC1 \u00B7 \u5B58\u50A8')
            .fontSize(11)
            .fontColor(BrandPalette.SEAL_RED)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, top: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('IP\u5B58\u8BC1\u4E2D\u5FC3', () => {
            router.pushUrl({ url: 'pages/hash/HashPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u5185\u5BB9\u5BA1\u6838', () => {
            router.pushUrl({ url: 'pages/contentaudit/ContentAuditPage' });
          })
          this.CyberDivider()
          this.MenuRow('CFS\u6570\u636E\u5B58\u50A8', () => {
            router.pushUrl({ url: 'pages/cfsstorage/CfsStoragePage' });
          })
          this.CyberDivider()
          this.MenuRow('COS\u4E91\u5B58\u50A8', () => {
            router.pushUrl({ url: 'pages/cosapply/CosApplyPage' });
          })

          Text('\u5408\u89C4\u81EA\u9A6D')
            .fontSize(11)
            .fontColor(BrandPalette.GOLD)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, top: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('\u5408\u89C4\u770B\u677F', () => {
            router.pushUrl({ url: 'pages/compliance/ComplianceDashboardPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u4E09\u6D41\u6838\u9A8C', () => {
            router.pushUrl({ url: 'pages/compliance/ThreeFlowsPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u76D1\u7BA1\u770B\u677F', () => {
            router.pushUrl({ url: 'pages/regulatory/RegulatoryWatchPage' });
          })
          this.CyberDivider()
          this.MenuRow('e-CNY\u94B1\u5305', () => {
            router.pushUrl({ url: 'pages/ecny/EcnyWalletPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u53D1\u7968\u7BA1\u7406', () => {
            router.pushUrl({ url: 'pages/invoice/InvoiceManagePage' });
          })
          this.CyberDivider()
          this.MenuRow('\u5408\u540C\u9608\u503C\u914D\u7F6E', () => {
            router.pushUrl({ url: 'pages/contractparams/ContractParamsPage' });
          })
          this.CyberDivider()
          this.MenuRow('KOL\u8F68\u9053\u7BA1\u7406', () => {
            router.pushUrl({ url: 'pages/koltrack/KolTrackPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u9875\u9762\u52A0\u6743\u7ED3\u7B97', () => {
            router.pushUrl({ url: 'pages/pageWeightedSettle/PageWeightedSettlePage' });
          })

          Text('\u4E91\u89C6\u7BA1')
            .fontSize(11)
            .fontColor(BrandPalette.SEAL_RED)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, top: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('\u4E91\u89C6\u7BA1 - \u670D\u52A1\u5668\u89C6\u9891\u5347\u7EA7', () => {
            router.pushUrl({ url: 'pages/cloudvideo/CloudVideoMainPage' });
          })
          this.CyberDivider()
          this.MenuRow('CLS\u65E5\u5FD7\u7BA1\u7406', () => {
            router.pushUrl({ url: 'pages/cloudvideo/CloudVideoMainPage' });
          })
          this.CyberDivider()
          this.MenuRow('X402\u8BA1\u8D39\u7ED3\u7B97', () => {
            router.pushUrl({ url: 'pages/cloudvideo/CloudVideoMainPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u7A0E\u52A1\u94FE+\u5370\u8BC1\u5B58\u8BC1', () => {
            router.pushUrl({ url: 'pages/cloudvideo/CloudVideoMainPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u53CC\u673AHA\u9AD8\u53EF\u7528', () => {
            router.pushUrl({ url: 'pages/cloudvideo/CloudVideoMainPage' });
          })

          Text('\u66F4\u591A')
            .fontSize(11)
            .fontColor(BrandPalette.NEON_BLUE)
            .letterSpacing(2)
            .width('100%')
            .padding({ left: 16, top: 16, bottom: 4 })
            .opacity(0.8)
          this.MenuRow('MAAS\u5927\u6A21\u578B\u5E7F\u573A', () => {
            router.pushUrl({ url: 'pages/maasplaza/MaasPlazaPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u89C6\u9891\u6D41\u7BA1\u7406', () => {
            router.pushUrl({ url: 'pages/videostream/VideoStreamPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u7ACB\u4F53\u5C55\u793A', () => {
            router.pushUrl({ url: 'pages/stereodisplay/StereoDisplayPage' });
          })
          this.CyberDivider()
          this.MenuRow('OPC\u652F\u6301\u8BA1\u5212', () => {
            router.pushUrl({ url: 'pages/opcsupport/OpcSupportPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u6D88\u606F\u901A\u77E5', () => {
            router.pushUrl({ url: 'pages/notifications/NotificationsPage' });
          })
          this.CyberDivider()
          this.MenuRow('\u4E2A\u4EBA\u8BBE\u7F6E', () => {
            router.pushUrl({ url: 'pages/profile/ProfilePage' });
          })
          this.CyberDivider()
          this.MenuRow('\u5173\u4E8E', () => {
             promptAction.showToast({ message: '\u9F9F\u94AE\u5370\u9274 ' + BrandSlogan.VERSION + ' \u2014 ' + BrandSlogan.SECONDARY });
          })
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 8, bottom: 8 })
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  CyberDivider() {
    Column()
      .width('100%')
      .height(0.5)
      .backgroundColor(BrandPalette.DIVIDER)
      .margin({ left: 16, right: 16 })
  }

  @Builder
  MenuRow(title: string, action: () => void) {
    Row() {
      Text(title)
        .fontSize(15)
        .fontColor(BrandPalette.TEXT_PRIMARY)
        .layoutWeight(1)
      Text('>')
        .fontSize(16)
        .fontColor(BrandPalette.TEXT_MUTED)
    }
    .width('100%')
    .height(52)
    .padding({ left: 16, right: 16 })
    .borderRadius(10)
    .onClick(action)
  }

  @Builder
  TabBarBuilder(index: number, title: string, icon: Resource) {
    Column() {
      SymbolGlyph(icon)
        .fontSize(22)
        .fontColor(this.currentIndex === index ? [BrandPalette.PRIMARY] : [BrandPalette.TEXT_MUTED])
      Text(title)
        .fontSize(11)
        .fontColor(this.currentIndex === index ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
        .margin({ top: 4 })
      if (this.currentIndex === index) {
        Column()
          .width(16)
          .height(2)
          .borderRadius(1)
          .backgroundColor(BrandPalette.PRIMARY)
          .margin({ top: 4 })
          .shadow({ radius: 6, color: '#00E5A044', offsetX: 0, offsetY: 0 })
      }
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
