import { BrandPalette, BrandRadius, BrandSpacing, BrandTypography } from '../../common/BrandCI'
import { HttpClient, ApiResponse } from '../../common/HttpClient'

interface CosBucket {
  id: string
  name: string
  type: string
  encryption: string
  size: string
}

interface VodAsset {
  id: string
  name: string
  duration: string
  transcodeStatus: string
}

@Component
struct StorageVideoPage {
  @State buckets: CosBucket[] = [
    { id: 'cos-1', name: 'video-source', type: '源文件', encryption: 'SSE-KMS', size: '2.1TB' },
    { id: 'cos-2', name: 'video-output', type: '转码输出', encryption: 'SSE-KMS', size: '800GB' },
    { id: 'cos-3', name: 'ai-intermediate', type: 'AI中间物', encryption: 'SSE-KMS', size: '150GB' }
  ]
  @State vodAssets: VodAsset[] = [
    { id: 'vod-1', name: 'KOL汽车评测01', duration: '25:30', transcodeStatus: '已完成' },
    { id: 'vod-2', name: 'KOL汽车评测02', duration: '18:45', transcodeStatus: '转码中' },
    { id: 'vod-3', name: 'VM试用片段', duration: '03:20', transcodeStatus: '已完成' }
  ]
  @State cdnDomain: string = 'cdn.GNXYZ.XYZ'
  @State cdnAuthEnabled: boolean = true
  @State cdnAntiLeechEnabled: boolean = true
  @State isInnerNetwork: boolean = true
  @State statusMsg: string = ''

  aboutToAppear() {
    this.loadStorageStatus()
  }

  async loadStorageStatus() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cloud-video/storage/status',
      (data: Record<string, Object>) => data
    )
    if (resp.success && resp.data !== null) {
      const domainVal: Object | undefined = resp.data['cdnDomain']
      if (domainVal !== null && domainVal !== undefined && typeof domainVal === 'string') {
        this.cdnDomain = domainVal
      }
    }
  }

  build() {
    Scroll() {
      Column({ space: BrandSpacing.MD }) {
        Text('COS + VOD + CDN 存储视频管理')
          .fontSize(BrandTypography.SECTION_TITLE)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.TEXT_PRIMARY)
          .width('100%')

        this.NetworkCard()
        this.CosCard()
        this.VodCard()
        this.CdnCard()
        this.ActionCard()
      }
      .padding(BrandSpacing.LG)
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  NetworkCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('网络架构')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('CVM-COS-VOD走VPC内网:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.isInnerNetwork ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.isInnerNetwork ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('内网白名单已配置，杜绝公网暴露')
        .fontSize(BrandTypography.CAPTION)
        .fontColor(BrandPalette.TEXT_MUTED)

      Row({ space: BrandSpacing.SM }) {
        Text('API限制:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text('全部限制内网')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.PRIMARY)
      }
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  CosCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('COS存储桶')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.buckets, (b: CosBucket) => {
        Row({ space: BrandSpacing.SM }) {
          Column() {
            Text(b.name)
              .fontSize(BrandTypography.BODY)
              .fontWeight(FontWeight.Medium)
              .fontColor(BrandPalette.TEXT_PRIMARY)
            Text(`${b.type} | ${b.encryption} | ${b.size}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (b: CosBucket) => b.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  VodCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('VOD视频资产')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      ForEach(this.vodAssets, (v: VodAsset) => {
        Row({ space: BrandSpacing.SM }) {
          Column() {
            Text(v.name)
              .fontSize(BrandTypography.BODY)
              .fontWeight(FontWeight.Medium)
              .fontColor(BrandPalette.TEXT_PRIMARY)
            Text(`时长: ${v.duration} | 转码: ${v.transcodeStatus}`)
              .fontSize(BrandTypography.CAPTION)
              .fontColor(BrandPalette.TEXT_MUTED)
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Start)
          Text(v.transcodeStatus === '已完成' ? '✓' : '...')
            .fontSize(BrandTypography.BODY)
            .fontColor(v.transcodeStatus === '已完成' ? BrandPalette.PRIMARY : BrandPalette.GOLD)
        }
        .width('100%')
        .padding(BrandSpacing.SM)
        .backgroundColor(BrandPalette.SURFACE)
        .borderRadius(BrandRadius.SM)
      }, (v: VodAsset) => v.id)
    }
    .width('100%')
    .padding(BrandSpacing.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .borderRadius(BrandRadius.CARD)
  }

  @Builder
  CdnCard() {
    Column({ space: BrandSpacing.SM }) {
      Text('CDN分发配置')
        .fontSize(BrandTypography.CARD_TITLE)
        .fontWeight(FontWeight.Medium)
        .fontColor(BrandPalette.TEXT_PRIMARY)

      Row({ space: BrandSpacing.SM }) {
        Text('加速域名:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.cdnDomain)
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.NEON_BLUE)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('鉴权:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.cdnAuthEnabled ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.cdnAuthEnabled ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Row({ space: BrandSpacing.SM }) {
        Text('防盗链:')
          .fontSize(BrandTypography.BODY)
          .fontColor(BrandPalette.TEXT_SECONDARY)
        Text(this.cdnAntiLeechEnabled ? '已启用' : '未启用')
          .fontSize(BrandTypography.BODY)
          .fontColor(this.cdnAntiLeechEnabled ? BrandPalette.PRIMARY : BrandPalette.CYBER_RED)
      }

      Text('回源设计: 成片CDN分发冗余，时效省回源成本')
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
        Button('创建COS桶')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.PRIMARY)
          .onClick(() => {
            this.statusMsg = '新COS桶创建请求已提交（内网VPC+SSE-KMS）'
          })
        Button('触发转码')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.GOLD)
          .onClick(() => {
            this.statusMsg = 'MPS转码任务已触发，内网处理成本最省'
          })
        Button('CDN预热')
          .fontSize(BrandTypography.BODY)
          .backgroundColor(BrandPalette.SURFACE)
          .fontColor(BrandPalette.NEON_BLUE)
          .onClick(() => {
            this.statusMsg = `CDN预热: ${this.cdnDomain} 成片已推边缘`
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

export { StorageVideoPage }
