import { HttpClient } from '../common/HttpClient';
import { CfsStorage } from '../model/DataModels';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct CfsStoragePage {
  @State storage: CfsStorage | null = null
  @State hasStorage: boolean = false
  @State loading: boolean = true
  @State applying: boolean = false

  async aboutToAppear(): Promise<void> {
    await this.loadStorageStatus()
  }

  async loadStorageStatus(): Promise<void> {
    this.loading = true
    try {
      const response = await HttpClient.get('/api/cfs/status')
      if (response.success) {
        this.hasStorage = response.data.hasStorage
        if (this.hasStorage && response.data.storage) {
          this.storage = CfsStorage.fromJson(response.data.storage)
        }
      }
    } catch (e) {
      console.error('加载CFS存储状态失败', e)
    } finally {
      this.loading = false
    }
  }

  async applyStorage(): Promise<void> {
    this.applying = true
    try {
      const response = await HttpClient.post('/api/cfs/apply', { region: 'ap-guangzhou' })
      if (response.success) {
        this.storage = CfsStorage.fromJson(response.data)
        this.hasStorage = true
        AlertDialog.show({ message: 'CFS存储申请成功！' })
      } else {
        AlertDialog.show({ message: response.error || '申请失败' })
      }
    } catch (e) {
      AlertDialog.show({ message: '申请失败：' + e })
    } finally {
      this.applying = false
    }
  }

  build() {
    Column() {
      Row() {
        Button('返回')
          .onClick(() => {
            router.back()
          })
        Text('腾讯CFS数据存储')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
        Blank().width(60)
      }
      .width('100%')
      .padding(16)

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(60)
            .height(60)
          Text('加载中...')
            .margin({ top: 16 })
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (!this.hasStorage) {
        Column() {
          Text('申请免费CFS存储')
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
          
          Text('为KOL提供免费的数据存储服务')
            .fontSize(14)
            .fontColor('#666666')
            .margin({ top: 8 })

          Column() {
            Text('免费额度')
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
            
            Row() {
              Text('存储空间：')
              Text('10GB')
                .fontWeight(FontWeight.Bold)
                .fontColor('#1890ff')
            }
            .margin({ top: 8 })

            Row() {
              Text('最大文件数：')
              Text('10,000')
                .fontWeight(FontWeight.Bold)
                .fontColor('#1890ff')
            }
            .margin({ top: 4 })

            Row() {
              Text('月流量：')
              Text('100GB')
                .fontWeight(FontWeight.Bold)
                .fontColor('#1890ff')
            }
            .margin({ top: 4 })
          }
          .padding(16)
          .backgroundColor('#f5f5f5')
          .borderRadius(8)
          .margin({ top: 24 })

          Button(this.applying ? '申请中...' : '立即申请')
            .width('80%')
            .height(48)
            .backgroundColor('#1890ff')
            .margin({ top: 32 })
            .enabled(!this.applying)
            .onClick(() => {
              this.applyStorage()
            })
        }
        .layoutWeight(1)
        .padding(24)
      } else if (this.storage) {
        Column() {
          Text('存储信息')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .width('100%')

          Column() {
            Row() {
              Text('存储桶：')
                .width(80)
              Text(this.storage.bucketName)
                .layoutWeight(1)
            }
            .width('100%')
            .margin({ bottom: 12 })

            Row() {
              Text('区域：')
                .width(80)
              Text(this.storage.region)
                .layoutWeight(1)
            }
            .width('100%')
            .margin({ bottom: 12 })

            Row() {
              Text('总空间：')
                .width(80)
              Text(this.storage.freeSpace)
                .layoutWeight(1)
            }
            .width('100%')
            .margin({ bottom: 12 })

            Row() {
              Text('已使用：')
                .width(80)
              Text(this.storage.usedSpace)
                .layoutWeight(1)
            }
            .width('100%')
            .margin({ bottom: 12 })

            Row() {
              Text('状态：')
                .width(80)
              Text(this.storage.status === 'active' ? '正常' : this.storage.status)
                .fontColor(this.storage.status === 'active' ? '#52c41a' : '#ff4d4f')
                .layoutWeight(1)
            }
            .width('100%')
          }
          .padding(16)
          .backgroundColor('#f5f5f5')
          .borderRadius(8)
          .margin({ top: 16 })

          Button('管理文件')
            .width('100%')
            .height(48)
            .backgroundColor('#1890ff')
            .margin({ top: 24 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/cfsfiles/CfsFilesPage' })
            })
        }
        .layoutWeight(1)
        .padding(24)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#ffffff')
  }
}
