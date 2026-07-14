import { HttpClient } from '../common/HttpClient';
import { MaasModel } from '../model/DataModels';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct MaasPlazaPage {
  @State models: MaasModel[] = []
  @State loading: boolean = true
  @State selectedModel: MaasModel | null = null

  async aboutToAppear(): Promise<void> {
    await this.loadModels()
  }

  async loadModels(): Promise<void> {
    this.loading = true
    try {
      const response = await HttpClient.get('/api/maas/models')
      if (response.success && response.data.models) {
        this.models = []
        for (let i = 0; i < response.data.models.length; i++) {
          this.models.push(MaasModel.fromJson(response.data.models[i]))
        }
      }
    } catch (e) {
      console.error('加载大模型列表失败', e)
    } finally {
      this.loading = false
    }
  }

  async subscribeModel(modelId: string): Promise<void> {
    try {
      const response = await HttpClient.post('/api/maas/subscribe', { modelId })
      if (response.success) {
        await this.loadModels()
        AlertDialog.show({ message: '订阅成功！' })
      } else {
        AlertDialog.show({ message: response.error || '订阅失败' })
      }
    } catch (e) {
      AlertDialog.show({ message: '订阅失败：' + e })
    }
  }

  async unsubscribeModel(modelId: string): Promise<void> {
    try {
      const response = await HttpClient.delete('/api/maas/subscribe/' + modelId)
      if (response.success) {
        await this.loadModels()
        AlertDialog.show({ message: '取消订阅成功！' })
      } else {
        AlertDialog.show({ message: response.error || '取消订阅失败' })
      }
    } catch (e) {
      AlertDialog.show({ message: '取消订阅失败：' + e })
    }
  }

  build() {
    Column() {
      Row() {
        Button('返回')
          .onClick(() => {
            router.back()
          })
        Text('MAAS大模型广场')
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
      } else {
        List() {
          ForEach(this.models, (model: MaasModel) => {
            ListItem() {
              Column() {
                Row() {
                  Column() {
                    Text(model.name)
                      .fontSize(18)
                      .fontWeight(FontWeight.Bold)
                    
                    Text(model.provider)
                      .fontSize(14)
                      .fontColor('#666666')
                      .margin({ top: 4 })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)

                  if (model.isFreeForOpc) {
                    Text('OPC免费')
                      .fontSize(12)
                      .fontColor('#52c41a')
                      .backgroundColor('#f6ffed')
                      .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                      .borderRadius(4)
                  }
                }
                .width('100%')

                Text(model.description)
                  .fontSize(14)
                  .fontColor('#666666')
                  .margin({ top: 12 })

                Row() {
                  ForEach(model.features, (feature: string) => {
                    Text(feature)
                      .fontSize(12)
                      .fontColor('#1890ff')
                      .backgroundColor('#e6f7ff')
                      .padding({ left: 8, right: 8, top: 4, bottom: 4 })
                      .borderRadius(4)
                      .margin({ right: 8 })
                  })
                }
                .width('100%')
                .margin({ top: 12 })

                Row() {
                  Text('价格：')
                    .fontSize(14)
                  
                  if (model.pricing && model.pricing['input'] !== undefined) {
                    Text(`${model.pricing['input']}元/千tokens`)
                      .fontSize(14)
                      .fontColor('#ff4d4f')
                      .fontWeight(FontWeight.Bold)
                  }

                  Blank()

                  if (model.subscribed) {
                    Button('已订阅')
                      .fontSize(14)
                      .backgroundColor('#52c41a')
                      .enabled(false)
                      .width(80)
                  } else {
                    Button('订阅')
                      .fontSize(14)
                      .backgroundColor('#1890ff')
                      .width(80)
                      .onClick(() => {
                        this.subscribeModel(model.id)
                      })
                  }
                }
                .width('100%')
                .margin({ top: 16 })
              }
              .padding(16)
              .backgroundColor('#ffffff')
              .borderRadius(8)
              .margin({ bottom: 12 })
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
  }
}
