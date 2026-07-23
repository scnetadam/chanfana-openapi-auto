import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'

interface BastionSession {
  id: string
  user: string
  target: string
  protocol: string
  status: string
}

@Component
struct BastionPage {
  @State trialDays: number = 14
  @State trialUsed: number = 0
  @State is4aEnabled: boolean = false
  @State isZeroTrustEnabled: boolean = false
  @State sessions: BastionSession[] = [
    { id: 'bs-1', user: 'admin01', target: 'CVM-Web-01', protocol: 'SSH', status: '活跃' },
    { id: 'bs-2', user: 'admin02', target: 'CVM-DB-01', protocol: 'RDP', status: '已断开' }
  ]
  @State statusMsg: string = ''

  aboutToAppear() {
    this.loadBastionStatus()
  }

  async loadBastionStatus() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/bastion/status',
      (data: Record<string, Object>) => data
    )
    if (resp.success && resp.data !== null) {
      const usedVal: Object | undefined = resp.data['trialUsed']
      if (usedVal !== null && usedVal !== undefined) {
        this.trialUsed = Number(usedVal)
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('堡垒机 + 4A管控 + 零信任')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.TrialCard()
        this.Model4ACard()
        this.SessionCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  TrialCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('堡垒机试用')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('试用天数:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(`${this.trialUsed}/${this.trialDays}天`)
          .fontSize(BrandTypography.BODY)
          .fontColor(this.trialUsed >= this.trialDays ? BrandPalette.CYBER_RED : BrandPalette.PRIMARY)
      }

      Progress({ value: this.trialUsed, total: this.trialDays, type: ProgressType.Linear })
        .width('100%')
        .color(this.trialUsed >= this.trialDays ? BrandPalette.CYBER_RED : BrandPalette.PRIMARY)

      if (this.trialUsed >= this.trialDays) {
        Text('试用已到期，请购买正式版')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.CYBER_RED)
      }
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  Model4ACard() {
    Column({ space: BrandSpacing.SM }) {
      Text('4A管控模型')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('账号管理:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.is4aEnabled ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.is4aEnabled ? BrandPalette.PRIMARY : BrandPalette.GOLD)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('认证管理:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.is4aEnabled ? 'MFA+SSO' : '密码认证')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_PRIMARY)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('授权管理:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.is4aEnabled ? 'RBAC策略' : '默认策略')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_PRIMARY)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('审计管理:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.is4aEnabled ? '全量记录' : '基础记录')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_PRIMARY)
      }

      Divider().color(BrandPalette.DIVIDER).margin({ top: BrandSpacing.XS, bottom: BrandSpacing.XS })

      Row({ space: BrandSpacing.SM }) {
        Text('零信任模型:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.isZeroTrustEnabled ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.isZeroTrustEnabled ? BrandPalette.PRIMARY : BrandPalette.GOLD)
      }
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  SessionCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('会话管理')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.sessions, (s: BastionSession) => {
        Row({ space: BrandSpacing.SM }) {
          Text(`[${s.protocol}]`)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.NEON_BLUE)
            .width(40)
          Text(s.user)
            .fontSize(BrandTypography.BODY)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .width(70)
          Text(s.target)
            .fontSize(BrandTypography.BODY)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .layoutWeight(1)
          Text(s.status)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(s.status === '活跃' ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (s: BastionSession) => s.id)
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
        Button('启用4A管控')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            this.is4aEnabled = !this.is4aEnabled
            this.statusMsg = this.is4aEnabled ? '4A管控模型已启用' : '4A管控模型已关闭'
          })
        Button('启用零信任')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.ACCENT)
          .onClick(() => {
            this.isZeroTrustEnabled = !this.isZeroTrustEnabled
            this.statusMsg = this.isZeroTrustEnabled ? '零信任模型已启用' : '零信任模型已关闭'
          })
        Button('试用天数+1')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            if (this.trialUsed < this.trialDays) {
              this.trialUsed++
            }
            this.statusMsg = `已使用 ${this.trialUsed} 天`
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

export { BastionPage }
