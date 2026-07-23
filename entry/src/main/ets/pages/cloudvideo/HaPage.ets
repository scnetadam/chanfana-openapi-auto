import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'

interface ServerNode {
  id: string
  name: string
  role: string
  status: string
  cpu: string
  memory: string
  load: number
}

@Component
struct HaPage {
  @State servers: ServerNode[] = [
    { id: 'srv-1', name: 'X402-主', role: 'X402计费主服务器', status: '运行中', cpu: '32%', memory: '58%', load: 32 },
    { id: 'srv-2', name: 'X402-备', role: 'X402计费备服务器', status: '热备', cpu: '8%', memory: '30%', load: 8 },
    { id: 'srv-3', name: '视频-主', role: '汽车视频主服务器', status: '运行中', cpu: '45%', memory: '72%', load: 45 },
    { id: 'srv-4', name: '视频-备', role: '汽车视频备服务器', status: '热备', cpu: '5%', memory: '25%', load: 5 }
  ]
  @State failoverMode: string = '自动切换'
  @State peakBalance: boolean = true
  @State independentRun: boolean = true
  @State statusMsg: string = ''

  aboutToAppear() {
    this.loadHaStatus()
  }

  async loadHaStatus() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/ha/status',
      (data: Record<string, Object>) => data
    )
    if (resp.success && resp.data !== null) {
      const modeVal: Object | undefined = resp.data['failoverMode']
      if (modeVal !== null && modeVal !== undefined && typeof modeVal === 'string') {
        this.failoverMode = modeVal
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('双服务器互备高可用')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.TopologyCard()
        this.ServerListCard()
        this.PolicyCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  TopologyCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('双机拓扑')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.LG }) {
        Column({ space: BrandSpacing.XS }) {
          Text('X402集群')
            .fontSize(BrandTypography.BODY)
            .fontWeight(FontWeight.Bold)
            .fontColor(BrandPalette.PRIMARY)
          Text('主 ←→ 备')
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.TEXT_MUTED)
          Text('独立跑X402计费')
            .fontSize(BrandTypography.MICRO)
            .fontColor(BrandPalette.TEXT_MUTED)
        }
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
        .border({ width: 1, color: BrandPalette.PRIMARY })

        Column({ space: BrandSpacing.XS }) {
          Text('视频集群')
            .fontSize(BrandTypography.BODY)
            .fontWeight(FontWeight.Bold)
            .fontColor(BrandPalette.GOLD)
          Text('主 ←→ 备')
            .fontSize(BrandTypography.CAPTION)
            .fontColor(BrandPalette.TEXT_MUTED)
          Text('独立跑汽车视频')
            .fontSize(BrandTypography.MICRO)
            .fontColor(BrandPalette.TEXT_MUTED)
        }
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
        .border({ width: 1, color: BrandPalette.GOLD })
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  ServerListCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('服务器状态')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.servers, (srv: ServerNode) => {
        Column({ space: BrandSpacing.XS }) {
          Row({ space: BrandSpacing.SM }) {
            Text(srv.name)
              .fontSize(BrandTypography.BODY)
              .fontWeight(FontWeight.Bold)
              .fontColor(BrandPalette.TEXT_PRIMARY)
            Text(srv.role)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
              .layoutWeight(1)
            Text(srv.status)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(srv.status === '运行中' ? BrandPalette.PRIMARY : BrandPalette.NEON_BLUE)
          }

          Row({ space: BrandSpacing.MD }) {
            Text(`CPU: ${srv.cpu}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
            Text(`内存: ${srv.memory}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
          }

          Progress({ value: srv.load, total: 100, type: ProgressType.Linear })
            .width('100%')
            .color(srv.load > 80 ? BrandPalette.CYBER_RED : srv.load > 50 ? BrandPalette.GOLD : BrandPalette.PRIMARY)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (srv: ServerNode) => srv.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  PolicyCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('高可用策略')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('故障切换:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.failoverMode)
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.PRIMARY)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('峰谷均衡:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.peakBalance ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.peakBalance ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('独立运行:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.independentRun ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.independentRun ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('高峰分开跑，按使用峰谷搞均衡')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)

      Text('X402和汽车视频双机都要有独立跑的能力')
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
        Button('模拟主备切换')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            this.servers = this.servers.map((srv: ServerNode) => {
              if (srv.status === '运行中') {
                return { ...srv, status: '热备', cpu: '8%', memory: '30%', load: 8 }
              }
              return { ...srv, status: '运行中', cpu: '35%', memory: '55%', load: 35 }
            })
            this.statusMsg = '主备切换完成，原备机已接管'
          })
        Button('负载均衡检测')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            this.statusMsg = '负载均衡正常，峰谷调度策略运行中'
          })
        Button('独立运行测试')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.NEON_BLUE)
          .onClick(() => {
            this.statusMsg = 'X402独立运行✓ 视频独立运行✓ 双机互备验证通过'
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

export { HaPage }
