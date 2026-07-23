import { CLSLogPage } from './CLSLogPage'
import { BastionPage } from './BastionPage'
import { StorageVideoPage } from './StorageVideoPage'
import { BillingPage } from './BillingPage'
import { SecurityPage } from './SecurityPage'
import { TaxChainPage } from './TaxChainPage'
import { KolVideoPage } from './KolVideoPage'
import { HaPage } from './HaPage'
import { BrandPalette, BrandIcon, BrandSlogan } from '../../common/BrandCI'
import { router } from '@kit.ArkUI'

@Entry
@Component
struct CloudVideoMainPage {
  @State currentIndex: number = 0

  build() {
    Column() {
      Row() {
        Text(BrandIcon.SEAL_GLYPH)
          .fontSize(22)
          .fontColor(BrandPalette.PRIMARY)
          .margin({ right: 8 })
        Text('云视管')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
        Text('· 服务器视频升级管理')
          .fontSize(13)
          .fontColor(BrandPalette.TEXT_MUTED)
          .margin({ left: 4 })
        Blank()
        Text('← 返回')
          .fontSize(13)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            router.back()
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      Tabs({ barPosition: BarPosition.Start, index: this.currentIndex }) {
        TabContent() {
          CLSLogPage()
        }.tabBar('CLS日志')

        TabContent() {
          BastionPage()
        }.tabBar('堡垒机')

        TabContent() {
          StorageVideoPage()
        }.tabBar('存储视频')

        TabContent() {
          BillingPage()
        }.tabBar('X402计费')

        TabContent() {
          SecurityPage()
        }.tabBar('安全核心')

        TabContent() {
          TaxChainPage()
        }.tabBar('税务链')

        TabContent() {
          KolVideoPage()
        }.tabBar('KOL视频')

        TabContent() {
          HaPage()
        }.tabBar('双机HA')
      }
      .scrollable(true)
      .barMode(BarMode.Scrollable)
      .onChange((index: number) => {
        this.currentIndex = index
      })
      .layoutWeight(1)
      .barBackgroundColor(BrandPalette.CARD_BG)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BrandPalette.DEEP_BG)
  }
}
