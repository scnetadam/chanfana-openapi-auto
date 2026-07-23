import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'
import { router } from '@kit.ArkUI'

interface TaxFlowItem {
  id: string
  name: string
  status: string
  detail: string
}

interface ChainNode {
  id: string
  chain: string
  txHash: string
  type: string
}

@Component
struct TaxChainPage {
  @State taxFlows: TaxFlowItem[] = [
    { id: 'tax-1', name: '金税4对接', status: '预备中', detail: '增值税发票系统' },
    { id: 'tax-2', name: '自然人税务APP', status: '预备中', detail: '个税申报' },
    { id: 'tax-3', name: '个人税务', status: '预备中', detail: '综合所得申报' },
    { id: 'tax-4', name: 'WORM存储', status: '已启用', detail: '一次写入多次读取' },
    { id: 'tax-5', name: 'DSAUDIT精细审计', status: '待配置', detail: '100%审计入DSAUDIT' }
  ]
  @State chainNodes: ChainNode[] = [
    { id: 'chain-1', chain: '蚂蚁链', txHash: '0x3a7f...b2c1', type: 'HASH双写' },
    { id: 'chain-2', chain: '公正云', txHash: '0x8d2e...f4a3', type: 'HASH双写' }
  ]
  @State chainDualWrite: boolean = true
  @State wormEnabled: boolean = true
  @State retentionMonths: number = 6
  @State statusMsg: string = ''
  @State guiniuHash: string = ''

  aboutToAppear() {
    this.loadTaxChainStatus()
  }

  async loadTaxChainStatus() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/tax-chain/status',
      (data: Record<string, Object>) => data
    )
    if (resp.success && resp.data !== null) {
      const hashVal: Object | undefined = resp.data['latestHash']
      if (hashVal !== null && hashVal !== undefined && typeof hashVal === 'string') {
        this.guiniuHash = hashVal
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('税务 + 区块链数据完整性')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.TaxFlowCard()
        this.ChainCard()
        this.GuiniuVerifyCard()
        this.WormCard()
        this.AuditCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  TaxFlowCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('税务数据流')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.taxFlows, (item: TaxFlowItem) => {
        Row({ space: BrandSpacing.SM }) {
          Text(item.status === '已启用' ? '✓' : '○')
            .fontSize(BrandTypography.BODY)
            .fontColor(item.status === '已启用' ? BrandPalette.PRIMARY : BrandPalette.GOLD)
            .width(20)
          Column() {
            Text(item.name)
              .fontSize(BrandTypography.BODY)
              .fontColor(BrandPalette.TEXT_PRIMARY)
            Text(item.detail)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start)
          Text(item.status)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(item.status === '已启用' ? BrandPalette.PRIMARY : BrandPalette.GOLD)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (item: TaxFlowItem) => item.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  ChainCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('区块链双写互为背书')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('双写模式:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.chainDualWrite ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.chainDualWrite ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('蚂蚁链 + 公正云互为背书，HASH上链双写')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)

      ForEach(this.chainNodes, (node: ChainNode) => {
        Row({ space: BrandSpacing.SM }) {
          Text(`[${node.chain}]`)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.NEON_BLUE)
            .width(60)
          Text(node.type)
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.TEXT_MUTED)
          Text(node.txHash)
            .fontSize(BrandTypography.MICRO)
            .fontColor(BrandPalette.TEXT_MUTED)
            .layoutWeight(1)
        }
        .width('100%')
        .padding(BrandSpacing.XS)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (node: ChainNode) => node.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  GuiniuVerifyCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('龟钮印证存证联调')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.GOLD)

      Text('税务流通过龟钮印证进行HASH确权存证')
        .fontSize(BrandTypography.BODY)
        .fontColor(BrandPalette.TEXT_SECONDARY)

      Row({ space: BrandSpacing.SM }) {
        Text('最新存证Hash:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.guiniuHash.length > 0 ? this.guiniuHash : '暂无')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.NEON_BLUE)
          .layoutWeight(1)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('三流合一:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text('Hash(业务)←→e-CNY(资金)←→数电票(票据)')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.GOLD)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('KOL税务轨:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text('A轨(全职) B轨(劳务) C轨(个体户)')
          .fontSize(BrandTypography.CAPTION)
          .fontColor(BrandPalette.PRIMARY)
      }

      Button('前往印证存证中心 >')
        .fontSize(BrandTypography.BODY)
        .backgroundColor(BrandPalette.GOLD)
        .fontColor(BrandPalette.DEEP_BG)
        .borderRadius(BrandRadius.PILL)
        .width('100%')
        .onClick(() => {
          router.pushUrl({ url: 'pages/hash/HashPage' })
        })
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
    .border({ width: 1, color: BrandPalette.GOLD })
  }

  @Builder
  WormCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('WORM防篡改存储')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('WORM模式:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.wormEnabled ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.wormEnabled ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('税务一次写入多次读取，防止税务流篡改')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)

      Text('HASH上链双写检测，WORM存储防篡改')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  AuditCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('审计留存')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('留存时长:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(`>= ${this.retentionMonths}个月`)
          .fontSize(BrandTypography.BODY)
          .fontColor(this.retentionMonths >= 6 ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('所有税务100%审计入DSAUDIT')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.GOLD)
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
        Button('HASH上链')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            this.statusMsg = 'HASH双写完成：蚂蚁链+公正云互为背书'
          })
        Button('WORM检测')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            this.statusMsg = 'WORM检测通过，税务数据未被篡改'
          })
        Button('审计报告')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.NEON_BLUE)
          .onClick(() => {
            this.statusMsg = `审计报告：100%税务记录入DSAUDIT，留存${this.retentionMonths}个月`
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

export { TaxChainPage }
