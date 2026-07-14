import { HttpClient } from '../common/HttpClient';
import { StereoModel } from '../model/DataModels';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct StereoDisplayPage {
  @State models: StereoModel[] = []
  @State loading: boolean = true
  @State selectedBrand: string = ''
  @State brands: string[] = []

  async aboutToAppear(): Promise<void> {
    await this.loadModels()
    await this.loadBrands()
  }

  async loadModels(): Promise<void> {
    this.loading = true
    try {
      let url = '/api/stereo/models'
      if (this.selectedBrand) {
        url += '?brand=' + this.selectedBrand
      }
      const response = await HttpClient.get(url)
      if (response.success && response.data.models) {
        this.models = []
        for (let i = 0; i < response.data.models.length; i++) {
          this.models.push(StereoModel.fromJson(response.data.models[i]))
        }
      }
    } catch (e) {
      console.error('加载3D模型列表失败', e)
    } finally {
      this.loading = false
    }
  }

  async loadBrands(): Promise<void> {
    try {
      const response = await HttpClient.get('/api/stereo/brands')
      if (response.success && response.data.brands) {
        this.brands = []
        for (let i = 0; i < response.data.brands.length; i++) {
          this.brands.push(String(response.data.brands[i]))
        }
      }
    } catch (e) {
      console.error('加载品牌列表失败', e)
    }
  }

  async viewModel(modelId: string): Promise<void> {
    try {
      const response = await HttpClient.post('/api/stereo/view', {
        modelId: modelId,
        viewMode: '3d'
      })
      if (response.success) {
        AlertDialog.show({ message: '3D视图已启动' })
      }
    } catch (e) {
      AlertDialog.show({ message: '启动失败：' + e })
    }
  }

  async startAR(modelId: string): Promise<void> {
    try {
      const response = await HttpClient.post('/api/stereo/ar', {
        modelId: modelId,
        platform: 'harmonyos'
      })
      if (response.success) {
        AlertDialog.show({ message: 'AR功能已启动' })
      }
    } catch (e) {
      AlertDialog.show({ message: '启动失败：' + e })
    }
  }

  build() {
    Column() {
      Row() {
        Button('返回')
          .onClick(() => {
            router.back()
          })
        Text('立体展示')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
        Blank().width(60)
      }
      .width('100%')
      .padding(16)

      Row() {
        Text('品牌筛选：')
          .fontSize(14)

        Button('全部')
          .fontSize(14)
          .backgroundColor(this.selectedBrand === '' ? '#1890ff' : '#f5f5f5')
          .fontColor(this.selectedBrand === '' ? '#ffffff' : '#666666')
          .onClick(() => {
            this.selectedBrand = ''
            this.loadModels()
          })

        ForEach(this.brands, (brand: string) => {
          Button(brand)
            .fontSize(14)
            .backgroundColor(this.selectedBrand === brand ? '#1890ff' : '#f5f5f5')
            .fontColor(this.selectedBrand === brand ? '#ffffff' : '#666666')
            .margin({ left: 8 })
            .onClick(() => {
              this.selectedBrand = brand
              this.loadModels()
            })
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 16 })

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
      } else if (this.models.length === 0) {
        Column() {
          Text('暂无3D模型')
            .fontSize(16)
            .fontColor('#999999')
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List() {
          ForEach(this.models, (model: StereoModel) => {
            ListItem() {
              Column() {
                Row() {
                  Column() {
                    Text(model.name)
                      .fontSize(18)
                      .fontWeight(FontWeight.Bold)
                    
                    Row() {
                      Text(model.brand)
                        .fontSize(14)
                        .fontColor('#666666')
                      
                      Text(' | ')
                        .fontColor('#d9d9d9')
                      
                      Text(model.category)
                        .fontSize(14)
                        .fontColor('#666666')
                    }
                    .margin({ top: 4 })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)

                  Text(model.fileSize)
                    .fontSize(14)
                    .fontColor('#999999')
                }
                .width('100%')

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
                  Button('3D查看')
                    .fontSize(14)
                    .backgroundColor('#1890ff')
                    .layoutWeight(1)
                    .onClick(() => {
                      this.viewModel(model.id)
                    })

                  Button('AR看车')
                    .fontSize(14)
                    .backgroundColor('#52c41a')
                    .layoutWeight(1)
                    .margin({ left: 12 })
                    .onClick(() => {
                      this.startAR(model.id)
                    })
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
