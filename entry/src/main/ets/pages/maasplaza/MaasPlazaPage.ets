import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { MaasModel } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct MaasPlazaPage {
  @State models: MaasModel[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadModels();
  }

  private async loadModels() {
    this.loading = true;
    const resp: ApiResponse<MaasModel[]> = await HttpClient.get<MaasModel[]>(
      '/api/maas/models',
      (data: Record<string, Object>): MaasModel[] => {
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
        const result: MaasModel[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(MaasModel.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) {
      this.models = resp.data;
    }
    this.loading = false;
    this.refreshing = false;
  }

  private async subscribeModel(modelId: string) {
    const body: Record<string, Object> = { 'modelId': modelId };
    const resp: ApiResponse<MaasModel> = await HttpClient.post<MaasModel>(
      '/api/maas/subscribe', toPostBody(body),
      (data: Record<string, Object>): MaasModel => {
        return MaasModel.fromJson(data);
      });
    if (resp.success) {
      promptAction.showToast({ message: '订阅成功！' });
      this.loadModels();
    } else {
      promptAction.showToast({ message: resp.error || '订阅失败' });
    }
  }

  private async unsubscribeModel(modelId: string) {
    const body: Record<string, Object> = { 'modelId': modelId };
    const resp: ApiResponse<MaasModel> = await HttpClient.post<MaasModel>(
      '/api/maas/unsubscribe', toPostBody(body),
      (data: Record<string, Object>): MaasModel => {
        return MaasModel.fromJson(data);
      });
    if (resp.success) {
      promptAction.showToast({ message: '取消订阅成功' });
      this.loadModels();
    } else {
      promptAction.showToast({ message: resp.error || '取消订阅失败' });
    }
  }

  private getPriceText(pricing: Record<string, Object>): string {
    const inputVal: Object | undefined = pricing['input'];
    if (inputVal !== null && inputVal !== undefined) {
      return String(inputVal) + '元/千tokens';
    }
    return '详询';
  }

  private getTypeIcon(type: string): string {
    if (type === 'llm') return 'sys.symbol.text_bubble';
    if (type === 'image') return 'sys.symbol.photo';
    if (type === 'audio') return 'sys.symbol.waveform_path';
    if (type === 'video') return 'sys.symbol.video';
    return 'sys.symbol.cpu';
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

        Text('MAAS大模型广场')
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
          Text('暂无可用大模型')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.models, (model: MaasModel) => {
              ListItem() {
                this.ModelCard(model)
              }
            }, (model: MaasModel) => model.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadModels();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ModelCard(model: MaasModel) {
    Column() {
      Row() {
        Column() {
          Text(model.name)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
          Text(model.provider)
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)

        if (model.isFreeForOpc) {
          Text('OPC免费')
            .fontSize(12)
            .fontColor($r('app.color.success_color'))
            .backgroundColor($r('app.color.success_bg_color'))
            .padding({ left: 8, right: 8, top: 4, bottom: 4 })
            .borderRadius(4)
        }
      }
      .width('100%')

      if (model.description.length > 0) {
        Text(model.description)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 8 })
          .width('100%')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }

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
        Text('价格: ' + this.getPriceText(model.pricing))
          .fontSize(13)
          .fontColor($r('app.color.price_color'))
          .fontWeight(FontWeight.Bold)

        Blank()

        if (model.subscribed) {
          Text('已订阅')
            .fontSize(13)
            .fontColor($r('app.color.success_color'))
            .fontWeight(FontWeight.Bold)
        } else {
          Button('订阅')
            .height(32)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(16)
            .onClick(() => this.subscribeModel(model.id))
        }
      }
      .width('100%')
      .margin({ top: 12 })
      .alignItems(VerticalAlign.Center)
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }
}
