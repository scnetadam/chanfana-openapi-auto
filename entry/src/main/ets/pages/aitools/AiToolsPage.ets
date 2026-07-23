import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { AiToolItem, AiToolList } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct AiToolsPage {
  @State tools: AiToolItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentCategory: number = 0;
  @State categories: string[] = ['全部', '大模型', '数据分析', '内容创作', '营销工具'];
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';

  aboutToAppear() {
    this.loadTools();
  }

  private async loadTools() {
    this.loading = true;
    const categoryParam: string = this.currentCategory === 0 ? '' : '&category=' + this.categories[this.currentCategory];
    const resp: ApiResponse<AiToolItem[]> = await HttpClient.get<AiToolItem[]>(
      '/api/ai-tools/list?opcDiscount=true' + categoryParam,
      (data: Record<string, Object>): AiToolItem[] => {
        return AiToolList.fromJson(data).list;
      });
    if (resp.success && resp.data !== null) {
      this.tools = resp.data;
    }
    this.loading = false;
    this.refreshing = false;
  }

  private async subscribeTool(tool: AiToolItem) {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const body: Record<string, Object> = {
      'userId': uid,
    };
    const resp: ApiResponse<AiToolItem> = await HttpClient.post<AiToolItem>(
      '/api/ai-tools/' + tool.id + '/subscribe', toPostBody(body),
      (data: Record<string, Object>): AiToolItem => {
        return AiToolItem.fromJson(data);
      });
    if (resp.success) {
      promptAction.showToast({ message: '订阅成功！' });
      this.loadTools();
    } else {
      promptAction.showToast({ message: resp.error || '订阅失败' });
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

        Text('AI工具市场')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row() {
          Text('OPC')
            .fontSize(12)
            .fontColor($r('app.color.primary_color'))
            .fontWeight(FontWeight.Bold)
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          router.pushUrl({ url: 'pages/opcsupport/OpcSupportPage' });
        })
      }
      .width('100%')
      .height(56)
      .padding({ left: 8, right: 8 })

      Scroll() {
        Row() {
          ForEach(this.categories, (cat: string, index: number) => {
            Text(cat)
              .fontSize(13)
              .fontWeight(this.currentCategory === index ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentCategory === index ? Color.White : $r('app.color.text_primary'))
              .padding({ left: 14, right: 14, top: 6, bottom: 6 })
              .borderRadius(16)
              .backgroundColor(this.currentCategory === index ? $r('app.color.primary_color') : $r('app.color.card_background'))
              .margin({ right: 8 })
              .onClick(() => {
                this.currentCategory = index;
                this.loadTools();
              })
          }, (cat: string, index: number) => cat + '_' + index.toString())
        }
        .width('100%')
        .padding({ left: 16, top: 8, bottom: 8 })
        .scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Off)
      }
      .width('100%')
      .height(48)

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
      } else if (this.tools.length === 0) {
        Column() {
          Text('暂无AI工具')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.tools, (item: AiToolItem) => {
              ListItem() {
                this.ToolCard(item)
              }
            }, (item: AiToolItem) => item.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadTools();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ToolCard(item: AiToolItem) {
    Column() {
      Row() {
        Column() {
          Text(item.name)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .width('100%')
          Text(item.provider)
            .fontSize(12)
            .fontColor($r('app.color.primary_color'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)

        if (item.isFreeForOpc) {
          Text('OPC免费')
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .padding({ left: 10, right: 10, top: 4, bottom: 4 })
            .borderRadius(12)
            .backgroundColor(Color.Green)
        }
      }
      .width('100%')

      Text(item.description)
        .fontSize(13)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 8 })
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .width('100%')

      Row() {
        Text(item.category)
          .fontSize(11)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor($r('app.color.primary_color'))

        Blank()

        if (item.discountRate < 1 && item.discountPrice < item.originalPrice) {
          Text('¥' + item.discountPrice.toFixed(0))
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('¥' + item.originalPrice.toFixed(0))
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .decoration({ type: TextDecorationType.LineThrough })
            .margin({ left: 8 })
        } else if (item.originalPrice > 0) {
          Text('¥' + item.originalPrice.toFixed(0))
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
        } else {
          Text('免费')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.Green)
        }

        Button('使用')
          .height(32)
          .fontSize(13)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.primary_color'))
          .fontColor(Color.White)
          .borderRadius(16)
          .margin({ left: 12 })
          .onClick(() => this.subscribeTool(item))
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
