import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { StereoModel } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct StereoDisplayPage {
  @State models: StereoModel[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State selectedBrand: string = '';
  @State brands: string[] = [];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await Promise.all([
      this.loadModels(),
      this.loadBrands(),
    ]);
    this.loading = false;
    this.refreshing = false;
  }

  private async loadModels() {
    const path: string = '/api/stereo/models' + (this.selectedBrand.length > 0 ? '?brand=' + this.selectedBrand : '');
    const resp: ApiResponse<StereoModel[]> = await HttpClient.get<StereoModel[]>(
      path,
      (data: Record<string, Object>): StereoModel[] => {
        const arr: Record<string, Object>[] = [];
        const modelsVal: Object | undefined = data['models'];
        if (modelsVal !== null && modelsVal !== undefined && Array.isArray(modelsVal)) {
          const rawArr: Object[] = modelsVal as Object[];
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: StereoModel[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(StereoModel.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) {
      this.models = resp.data;
    }
  }

  private async loadBrands() {
    const resp: ApiResponse<string[]> = await HttpClient.get<string[]>(
      '/api/stereo/brands',
      (data: Record<string, Object>): string[] => {
        const brandsVal: Object | undefined = data['brands'];
        if (brandsVal !== null && brandsVal !== undefined && Array.isArray(brandsVal)) {
          const rawArr: Object[] = brandsVal as Object[];
          const result: string[] = [];
          for (let i = 0; i < rawArr.length; i++) {
            result.push(String(rawArr[i]));
          }
          return result;
        }
        return [];
      });
    if (resp.success && resp.data !== null) {
      this.brands = resp.data;
    }
  }

  private async viewModel(modelId: string) {
    const body: Record<string, Object> = {
      'modelId': modelId,
      'viewMode': '3d',
    };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/stereo/view', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      promptAction.showToast({ message: '3D视图已启动' });
    } else {
      promptAction.showToast({ message: resp.error || '启动失败' });
    }
  }

  private async startAR(modelId: string) {
    const body: Record<string, Object> = {
      'modelId': modelId,
      'platform': 'harmonyos',
    };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/stereo/ar', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      promptAction.showToast({ message: 'AR功能已启动' });
    } else {
      promptAction.showToast({ message: resp.error || '启动失败' });
    }
  }

  build() {
    Column() {
      Row() {
        Row() {
          Text('<')
            .fontSize(22)
            .fontColor($r('app.color.text_primary'))
            .onClick(() => router.back())
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)

        Text('立体展示')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40)
      }
      .width('100%')
      .height(56)
      .padding({ left: 8, right: 8 })

      Scroll() {
        Row() {
          Text('全部')
            .fontSize(13)
            .fontColor(this.selectedBrand.length === 0 ? Color.White : $r('app.color.text_primary'))
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .borderRadius(16)
            .backgroundColor(this.selectedBrand.length === 0 ? $r('app.color.primary_color') : $r('app.color.card_background'))
            .margin({ right: 8 })
            .onClick(() => {
              this.selectedBrand = '';
              this.loadModels();
            })

          ForEach(this.brands, (brand: string) => {
            Text(brand)
              .fontSize(13)
              .fontColor(this.selectedBrand === brand ? Color.White : $r('app.color.text_primary'))
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
              .borderRadius(16)
              .backgroundColor(this.selectedBrand === brand ? $r('app.color.primary_color') : $r('app.color.card_background'))
              .margin({ right: 8 })
              .onClick(() => {
                this.selectedBrand = brand;
                this.loadModels();
              })
          }, (brand: string) => brand)
        }
      }
      .scrollable(ScrollDirection.Horizontal)
      .width('100%')
      .padding({ left: 16, top: 4, bottom: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
            .color($r('app.color.primary_color'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.models.length === 0) {
        Column() {
          Text('暂无3D模型')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.models, (model: StereoModel) => {
              ListItem() {
                this.ModelCard(model)
              }
            }, (model: StereoModel) => model.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadData();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ModelCard(model: StereoModel) {
    Column() {
      Row() {
        Column() {
          Text(model.name)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))

          Row() {
            Text(model.brand)
              .fontSize(13)
              .fontColor($r('app.color.text_secondary'))
            Text(' | ')
              .fontColor($r('app.color.text_secondary'))
            Text(model.category)
              .fontSize(13)
              .fontColor($r('app.color.text_secondary'))
          }
          .margin({ top: 4 })
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)

        Text(model.fileSize)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')

      if (model.features.length > 0) {
        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(model.features, (feature: string, index: number) => {
            Text(feature)
              .fontSize(11)
              .fontColor($r('app.color.primary_color'))
              .backgroundColor($r('app.color.primary_bg_color'))
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .borderRadius(4)
              .margin({ right: 6, top: 6 })
          }, (feature: string, index: number) => feature + '_' + index.toString())
        }
        .width('100%')
        .margin({ top: 8 })
      }

      Row() {
        Button('3D查看')
          .height(36)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.primary_color'))
          .fontColor(Color.White)
          .borderRadius(18)
          .layoutWeight(1)
          .onClick(() => this.viewModel(model.id))

        Button('AR看车')
          .height(36)
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.success_color'))
          .fontColor(Color.White)
          .borderRadius(18)
          .layoutWeight(1)
          .margin({ left: 12 })
          .onClick(() => this.startAR(model.id))
      }
      .width('100%')
      .margin({ top: 12 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }
}
