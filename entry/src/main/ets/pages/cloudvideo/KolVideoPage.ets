import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'

interface KolTier {
  id: string
  tier: string
  desc: string
  cosVod: string
  cdn: string
  billing: string
}

@Component
struct KolVideoPage {
  @State tiers: KolTier[] = [
    { id: 'tier-1', tier: '第一层', desc: '独立申请腾讯云产品', cosVod: 'COS+VOD全申请', cdn: 'CDN全配置', billing: 'X402支付' },
    { id: 'tier-2', tier: '第二层', desc: '全使用我们配置', cosVod: '我们管COS+VOD', cdn: '我们管CDN', billing: 'X402支付' },
    { id: 'tier-3', tier: '第三层', desc: '用户为主我们辅助', cosVod: '用户自管', cdn: '我们做CDN+私有化MPS', billing: 'X402支付' },
    { id: 'tier-4', tier: '第四层', desc: '其他方案预备', cosVod: '预备方案', cdn: '预备方案', billing: 'X402支付' }
  ]
  @State freeQuota: string = 'KOL免费COS+VOD使用申请中'
  @State drmEnabled: boolean = true
  @State watermarkEnabled: boolean = true
  @State statusMsg: string = ''

  aboutToAppear() {
    this.loadKolVideoStatus()
  }

  async loadKolVideoStatus() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/kol-video/status',
      (data: Record<string, Object>) => data
    )
    if (resp.success && resp.data !== null) {
      const quotaVal: Object | undefined = resp.data['freeQuota']
      if (quotaVal !== null && quotaVal !== undefined && typeof quotaVal === 'string') {
        this.freeQuota = quotaVal
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('KOL汽车视频四层机制')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.FreeQuotaCard()
        this.TierCard()
        this.ProtectionCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  FreeQuotaCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('免费额度管理')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Text(this.freeQuota)
        .fontSize(BrandTypography.BODY)
        .fontColor(BrandPalette.NEON_BLUE)

      Text('CDN+COS回源设计要省成本')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  TierCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('四层机制')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.tiers, (t: KolTier) => {
        Column({ space: BrandSpacing.XS }) {
          Row({ space: BrandSpacing.SM }) {
            Text(t.tier)
              .fontSize(BrandTypography.BODY)
              .fontWeight(FontWeight.Bold)
              .fontColor(BrandPalette.NEON_BLUE)
            Text(t.desc)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
          }

          Row({ space: BrandSpacing.MD }) {
            Text(`存储: ${t.cosVod}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
            Text(`分发: ${t.cdn}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
            Text(`结算: ${t.billing}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.GOLD)
          }
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
        .border({ width: 1, color: BrandPalette.DIVIDER })
      }, (t: KolTier) => t.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  ProtectionCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('内容保护')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('DRM加密:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.drmEnabled ? '已启用(AES-128/FairPlay/Widevine)' : '未启用')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(this.drmEnabled ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('数字水印:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.watermarkEnabled ? '已启用(溯源)' : '未启用')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(this.watermarkEnabled ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('CAM角色+业务服务临时密钥')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  ActionCard() {
    Column({ space: BrandSpacing.SM }) {
      Row({ space: BrandSpacing.SM }) {
        Button('申请免费额度')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            this.statusMsg = 'KOL免费COS+VOD额度申请已提交'
          })
        Button('创建KOL用户')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            this.statusMsg = 'KOL用户已创建，分配四层机制中第2层'
          })
      }
      if (this.statusMsg.length > 0) {
        Text(this.statusMsg)
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.GOLD)
          .margin({ top: BrandSpacing.XS })
      }
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }
}

export { KolVideoPage }
