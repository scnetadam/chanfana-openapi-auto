import { ActivitiesPage } from './activities/ActivitiesPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { WalletPage } from './wallet/WalletPage';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct Index {
  @State currentIndex: number = 0;

  build() {
    Tabs({ index: this.currentIndex }) {
      TabContent() {
        ActivitiesPage()
      }
      .tabBar(this.TabBarBuilder(0, '活动', $r('sys.symbol.calendar')))

      TabContent() {
        Column() {
          Column() {
            Text('+')
              .fontSize(48)
              .fontWeight(FontWeight.Bold)
              .fontColor(Color.White)
          }
          .width(80)
          .height(80)
          .borderRadius(40)
          .backgroundColor($r('app.color.primary_color'))
          .justifyContent(FlexAlign.Center)
          .margin({ top: 120 })

          Text('发布推广内容')
            .fontSize(18)
            .fontColor($r('app.color.text_primary'))
            .fontWeight(FontWeight.Medium)
            .margin({ top: 16 })

          Text('选择活动后分享你的体验')
            .fontSize(14)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 8 })

          Button('立即发布')
            .width(200)
            .height(44)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(22)
            .margin({ top: 32 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/publish/PublishPage' });
            })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Start)
        .alignItems(HorizontalAlign.Center)
      }
      .tabBar(this.TabBarBuilder(1, '发布', $r('sys.symbol.plus_circle')))

      TabContent() {
        DashboardPage()
      }
      .tabBar(this.TabBarBuilder(2, '看板', $r('sys.symbol.chart_bar')))

      TabContent() {
        WalletPage()
      }
      .tabBar(this.TabBarBuilder(3, '钱包', $r('sys.symbol.wallet')))
    }
    .width('100%')
    .height('100%')
    .barPosition(BarPosition.End)
    .onChange((index: number) => {
      this.currentIndex = index;
    })
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
