import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography, BrandIcon } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'
import { router } from '@kit.ArkUI'

interface CamUser {
  id: string
  name: string
  subSet: string
  policy: string
  status: string
}

interface BillingRecord {
  id: string
  service: string
  usage: string
  cost: string
  settlement: string
}

@Component
struct BillingPage {
  @State camUsers: CamUser[] = [
    { id: 'cam-1', name: 'admin-readwrite', subSet: '管理子集(50)', policy: '读写', status: '活跃' },
    { id: 'cam-2', name: 'viewer-readonly', subSet: '只读子集', policy: '只读', status: '活跃' },
    { id: 'cam-3', name: 'x402-cashier', subSet: 'X402独立', policy: '独立授权', status: '活跃' }
  ]
  @State billingRecords: BillingRecord[] = [
    { id: 'bill-1', service: 'COS存储', usage: '2.1TB', cost: '¥126/月', settlement: 'X402' },
    { id: 'bill-2', service: 'VOD转码', usage: '50小时', cost: '¥75/月', settlement: 'X402' },
    { id: 'bill-3', service: 'CDN流量', usage: '5TB', cost: '¥450/月', settlement: 'X402' },
    { id: 'bill-4', service: 'MPS转码', usage: '30小时', cost: '¥45/月', settlement: 'X402' }
  ]
  @State vmTrialMinutes: number = 200
  @State vmUsedMinutes: number = 0
  @State x402Balance: string = '¥5,280.00'
  @State statusMsg: string = ''

  aboutToAppear() {
    this.loadBillingStatus()
  }

  async loadBillingStatus() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/billing/status',
      (data: Record<string, Object>) => data
    )
    if (resp.success && resp.data !== null) {
      const balanceVal: Object | undefined = resp.data['x402Balance']
      if (balanceVal !== null && balanceVal !== undefined && typeof balanceVal === 'string') {
        this.x402Balance = balanceVal
      }
      const usedVal: Object | undefined = resp.data['vmUsedMinutes']
      if (usedVal !== null && usedVal !== undefined) {
        this.vmUsedMinutes = Number(usedVal)
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('CAM + X402计费结算')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.CamCard()
        this.VMTrialCard()
        this.BillingCard()
        this.X402Card()
        this.SealLinkCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  CamCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('CAM子用户管理')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Text('每个管理子集50个用户，KOL免费额度管理')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)

      ForEach(this.camUsers, (u: CamUser) => {
        Row({ space: BrandSpacing.SM }) {
          Text(u.name)
            .fontSize(BrandTypography.BODY)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .layoutWeight(1)
          Text(`[${u.policy}]`)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.NEON_BLUE)
          Text(u.subSet)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.TEXT_MUTED)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (u: CamUser) => u.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  VMTrialCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('VM试用配额')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('已用/总额:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(`${this.vmUsedMinutes}/${this.vmTrialMinutes}分钟`)
          .fontSize(BrandTypography.BODY)
          .fontColor(this.vmUsedMinutes >= this.vmTrialMinutes ? BrandPalette.CYBER_RED : BrandPalette.PRIMARY)
      }

      Progress({ value: this.vmUsedMinutes, total: this.vmTrialMinutes, type: ProgressType.Linear })
        .width('100%')
        .color(BrandPalette.PRIMARY)

      Text('超出后X402流量计费实时结算')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  BillingCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('X402费用明细')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.billingRecords, (r: BillingRecord) => {
        Row({ space: BrandSpacing.SM }) {
          Text(r.service)
            .fontSize(BrandTypography.BODY)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .layoutWeight(1)
          Text(r.usage)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.TEXT_MUTED)
          Text(r.cost)
            .fontSize(BrandTypography.BODY)
            .fontWeight(FontWeight.Medium)
            .fontColor(BrandPalette.TEXT_PRIMARY)
          Text(`[${r.settlement}]`)
            .fontSize(BrandTypography.MICRO)
            .fontColor(BrandPalette.GOLD)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (r: BillingRecord) => r.id)

      Row() {
        Text('月度合计:')
          .fontSize(BrandTypography.BODY)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
        Text('¥696/月')
          .fontSize(BrandTypography.PAGE_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.GOLD)
      }
      .width('100%')
      .justifyContent(FlexAlign.End)
      .padding({ top: BrandSpacing.XS })
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  X402Card() {
    Column({ space: BrandSpacing.SM }) {
      Text('X402收银台')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('账户余额:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.x402Balance)
          .fontSize(BrandTypography.PAGE_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.PRIMARY)
      }

      Text('X402独立收银台，独立授权，实时结算')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  SealLinkCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('龟钮印信联调')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.GOLD)

      Text('X402计费通过龟钮印信支付通道结算')
        .fontSize(BrandTypography.BODY)
        .fontColor(BrandPalette.TEXT_SECONDARY)

      Row({ space: BrandSpacing.SM }) {
        Text('印信结算通道:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text('支付宝/微信/e-CNY')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.NEON_BLUE)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('分账模式:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text('伞顶→伞底自动清分')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.GOLD)
      }

      Button('前往印信收付页 >')
        .fontSize(BrandTypography.BODY)
        .backgroundColor(BrandPalette.GOLD)
        .fontColor(BrandPalette.DEEP_BG)
        .borderRadius(BrandRadius.PILL)
        .width('100%')
        .onClick(() => {
          router.pushUrl({ url: 'pages/settlement/SettlementPage' })
        })
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
    .border({ width: 1, color: BrandPalette.GOLD })
  }

  @Builder
  ActionCard() {
    Column({ space: BrandSpacing.SM }) {
      Row({ space: BrandSpacing.SM }) {
        Button('模拟VM+10分钟')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            if (this.vmUsedMinutes < this.vmTrialMinutes) {
              this.vmUsedMinutes += 10
              this.statusMsg = `VM已使用 ${this.vmUsedMinutes} 分钟`
            } else {
              this.statusMsg = '试用额度已用完，X402实时计费中'
            }
          })
        Button('X402结算')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            this.statusMsg = 'X402实时结算完成，扣费已入账'
          })
        Button('MPS计费')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.NEON_BLUE)
          .onClick(() => {
            this.statusMsg = 'MPS计费管理：转码¥1.5/分钟，X402结算'
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

export { BillingPage }
