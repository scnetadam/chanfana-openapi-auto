import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography, BrandBadge } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'

interface CLSLogItem {
  id: string
  name: string
  status: string
  retention: string
  tag: string
}

@Component
struct CLSLogPage {
  @State logSets: CLSLogItem[] = [
    { id: 'cls-1', name: '信息流日志', status: '运行中', retention: '6个月', tag: 'INFO' },
    { id: 'cls-2', name: '支付流日志', status: '运行中', retention: '6个月', tag: 'PAY' },
    { id: 'cls-3', name: '税务流日志', status: '运行中', retention: '6个月', tag: 'TAX' },
    { id: 'cls-4', name: 'HASH流日志', status: '运行中', retention: '6个月', tag: 'HASH' },
    { id: 'cls-5', name: '堡垒机审计日志', status: '待配置', retention: '6个月', tag: 'AUDIT' },
    { id: 'cls-6', name: 'RDS操作日志', status: '待配置', retention: '6个月', tag: 'DB' }
  ]
  @State cosRedundancy: boolean = true
  @State rdsStatus: boolean = true
  @State complianceLevel: string = '等保3级预备'
  @State retentionMonths: number = 6
  @State alertMsg: string = ''
  @State loading: boolean = false

  aboutToAppear() {
    this.loadLogStatus()
  }

  async loadLogStatus() {
    this.loading = true
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/cls/status',
      (data: Record<string, Object>) => data
    )
    this.loading = false
    if (resp.success && resp.data !== null) {
      const cosVal: Object | undefined = resp.data['cosRedundancy']
      if (cosVal !== null && cosVal !== undefined) {
        this.cosRedundancy = cosVal === true || cosVal === 'true'
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('CLS日志 + 等保3级配置')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')
          .padding({ left: BrandSpacing.LG })

        this.StatusCard()
        this.ComplianceCard()
        this.LogListCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  StatusCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('基础状态')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('COS冗余:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.cosRedundancy ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.cosRedundancy ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('RDS:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.rdsStatus ? '已接入' : '未接入')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.rdsStatus ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('等保等级:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.complianceLevel)
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.GOLD)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('留存时长:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(`${this.retentionMonths}个月`)
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_PRIMARY)
      }
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  ComplianceItem(label: string, done: boolean) {
    Row({ space: BrandSpacing.SM }) {
      Text(done ? '✓' : '○')
        .fontSize(BrandTypography.BODY)
        .fontColor(done ? BrandPalette.PRIMARY : BrandPalette.GOLD)
      Text(label)
        .fontSize(BrandTypography.BODY)
        .fontColor(done ? BrandPalette.TEXT_PRIMARY : BrandPalette.TEXT_MUTED)
    }
  }

  @Builder
  ComplianceCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('等保3级达标项')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      this.ComplianceItem('日志留存 >= 6个月', true)
      this.ComplianceItem('四流日志TAG分离', true)
      this.ComplianceItem('CLS冗余备份', true)
      this.ComplianceItem('RDS审计日志', false)
      this.ComplianceItem('堡垒机会话录像', false)
      this.ComplianceItem('DSAUDIT精细审计', false)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  LogListCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('日志集管理')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.logSets, (item: CLSLogItem) => {
        Row({ space: BrandSpacing.SM }) {
          Text(`[${item.tag}]`)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.NEON_BLUE)
            .width(50)
          Text(item.name)
            .fontSize(BrandTypography.BODY)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .layoutWeight(1)
          Text(item.status)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(item.status === '运行中' ? BrandPalette.PRIMARY : BrandPalette.GOLD)
          Text(item.retention)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.TEXT_MUTED)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (item: CLSLogItem) => item.id)
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
        Button('补包检测')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            this.alertMsg = '检测中：4/6日志集达标，需补堡垒机审计+RDS日志包'
          })
        Button('延长留存')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            this.retentionMonths = this.retentionMonths >= 12 ? 6 : this.retentionMonths + 1
            this.alertMsg = `留存已调整为 ${this.retentionMonths} 个月`
          })
        Button('等保预检')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.CYBER_RED)
          .onClick(() => {
            this.alertMsg = '等保3级预检：6/8项达标，需补RDS审计+DSAUDIT'
          })
      }
      if (this.alertMsg.length > 0) {
        Text(this.alertMsg)
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

export { CLSLogPage }
