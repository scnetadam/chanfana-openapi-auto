import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'

interface SecurityItem {
  id: string
  category: string
  item: string
  status: string
  detail: string
}

@Component
struct SecurityPage {
  @State securityItems: SecurityItem[] = [
    { id: 'sec-1', category: '数据不出域', item: '原生内容VPC隔离', status: '已启用', detail: 'VPC私有受控' },
    { id: 'sec-2', category: '数据不出域', item: 'AI中间物VPC隔离', status: '已启用', detail: 'VPC私有受控' },
    { id: 'sec-3', category: '数据不出域', item: '税务数据隔离', status: '已启用', detail: 'VPC私有受控' },
    { id: 'sec-4', category: '数据不出域', item: 'HASH私钥HSM托管', status: '已启用', detail: '不落盘CVM' },
    { id: 'sec-5', category: '加密', item: 'COS SSE-KMS加密', status: '已启用', detail: 'KMS独立管理' },
    { id: 'sec-6', category: '加密', item: 'VOD SSE-KMS加密', status: '已启用', detail: 'KMS独立管理' },
    { id: 'sec-7', category: '加密', item: 'TLS/SSL传输加密', status: '已启用', detail: '全链路TLS' },
    { id: 'sec-8', category: 'DRM', item: 'AES-128加密', status: '已启用', detail: '流媒体DRM' },
    { id: 'sec-9', category: 'DRM', item: 'FairPlay', status: '待配置', detail: 'iOS DRM' },
    { id: 'sec-10', category: 'DRM', item: 'Widevine', status: '待配置', detail: 'Android DRM' },
    { id: 'sec-11', category: '水印', item: '数字水印溯源', status: '已启用', detail: '内容溯源' },
    { id: 'sec-12', category: '四流分离', item: '信息流子集', status: '已启用', detail: '独立安全组' },
    { id: 'sec-13', category: '四流分离', item: '支付流子集', status: '已启用', detail: '独立安全组' },
    { id: 'sec-14', category: '四流分离', item: '税务流子集', status: '已启用', detail: '独立安全组' },
    { id: 'sec-15', category: '四流分离', item: 'HASH流子集', status: '已启用', detail: '独立安全组' },
    { id: 'sec-16', category: '访问控制', item: 'CAM精细授权', status: '已启用', detail: '管理员读写/普通只读' },
    { id: 'sec-17', category: '访问控制', item: '临时密钥(STS)', status: '已启用', detail: '不永久AK/SK' },
    { id: 'sec-18', category: 'CDN', item: '防盗链', status: '已启用', detail: 'Referer+IP白名单' },
    { id: 'sec-19', category: 'CDN', item: 'URL鉴权', status: '已启用', detail: '防盗刷' }
  ]
  @State selectedCategory: string = '全部'
  private categories: string[] = ['全部', '数据不出域', '加密', 'DRM', '水印', '四流分离', '访问控制', 'CDN']

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('安全核心配置')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.SummaryCard()
        this.CategoryFilter()
        this.SecurityList()
        this.YoutuCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  SummaryCard() {
    Row({ space: BrandSpacing.XXL }) {
      Column() {
        Text('已启用')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.TEXT_MUTED)
        Text(`${this.securityItems.filter(i => i.status === '已启用').length}`)
          .fontSize(BrandTypography.HERO_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.PRIMARY)
      }
      Column() {
        Text('待配置')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.TEXT_MUTED)
        Text(`${this.securityItems.filter(i => i.status === '待配置').length}`)
          .fontSize(BrandTypography.HERO_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.GOLD)
      }
      Column() {
        Text('总项')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.TEXT_MUTED)
        Text(`${this.securityItems.length}`)
          .fontSize(BrandTypography.HERO_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
      }
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
    .justifyContent(FlexAlign.SpaceAround)
  }

  @Builder
  CategoryFilter() {
    Scroll() {
      Row({ space: BrandSpacing.SM }) {
        ForEach(this.categories, (cat: string) => {
          Button(cat)
            .fontSize(BrandTypography.CAPTION)
            .height(28)
            .backgroundColor(this.selectedCategory === cat ? BrandPalette.PRIMARY : BrandPalette.SURFACE)
            .fontColor(this.selectedCategory === cat ? BrandPalette.DEEP_BG : BrandPalette.TEXT_SECONDARY)
            .onClick(() => {
              this.selectedCategory = cat
            })
        }, (cat: string) => cat)
      }
    }
    .scrollable(ScrollDirection.Horizontal)
    .width('100%')
  }

  @Builder
  SecurityList() {
    Column({ space: BrandSpacing.XS }) {
      ForEach(this.securityItems.filter(i => this.selectedCategory === '全部' || i.category === this.selectedCategory),
        (item: SecurityItem) => {
          Row({ space: BrandSpacing.SM }) {
            Text(item.status === '已启用' ? '✓' : '○')
              .fontSize(BrandTypography.BODY)
              .fontColor(item.status === '已启用' ? BrandPalette.PRIMARY : BrandPalette.GOLD)
              .width(20)
            Column() {
              Text(item.item)
                .fontSize(BrandTypography.BODY)
                .fontColor(BrandPalette.TEXT_PRIMARY)
              Text(`${item.category} | ${item.detail}`)
                .fontSize(BrandTypography.MICRO)
                .fontColor(BrandPalette.TEXT_MUTED)
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)
          }
          .width('100%')
          .padding(BrandSpacing.SM)
          .backgroundColor(BrandPalette.SURFACE)
          .borderRadius(BrandRadius.SM)
        }, (item: SecurityItem) => item.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  YoutuCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('腾讯云智眸 + MPS')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Text('智眸+采编本地部署套打AI能力')
        .fontSize(BrandTypography.BODY)
        .fontColor(BrandPalette.TEXT_SECONDARY)

      Text('MPS私有化+COS+CDN+VOD原生打通')
        .fontSize(BrandTypography.BODY)
        .fontColor(BrandPalette.TEXT_SECONDARY)

      Text('安全预备上流量后轻量模型预留本地模型')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.GOLD)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }
}

export { SecurityPage }
