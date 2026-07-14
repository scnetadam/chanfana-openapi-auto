import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { OpcSupportInfo, OpcBenefit, AiToolItem, AiToolList } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct OpcSupportPage {
  @State opcInfo: OpcSupportInfo | null = null;
  @State aiTools: AiToolItem[] = [];
  @State loading: boolean = true;
  @State applying: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await this.loadOpcInfo();
    await this.loadAiTools();
    this.loading = false;
  }

  private async loadOpcInfo() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<OpcSupportInfo> = await HttpClient.get<OpcSupportInfo>(
      '/api/opc/info?userId=' + uid,
      (data: Record<string, Object>): OpcSupportInfo => {
        return OpcSupportInfo.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.opcInfo = resp.data;
      if (this.opcInfo.discountRate === 0) {
        this.opcInfo.discountRate = 0.5;
      }
      if (this.opcInfo.status === 'approved') {
        this.opcInfo.eligible = true;
      }
    }
  }

  private async loadAiTools() {
    const uid: string = this.userId;
    const resp: ApiResponse<AiToolItem[]> = await HttpClient.get<AiToolItem[]>(
      '/api/ai-tools/list?userId=' + uid,
      (data: Record<string, Object>): AiToolItem[] => {
        const toolsObj: Record<string, Object> | null = data['tools'] !== null && data['tools'] !== undefined ?
          data as Record<string, Object> : null;
        return AiToolList.fromJson(data).list;
      });
    if (resp.success && resp.data !== null) {
      this.aiTools = resp.data;
    }
  }

  private async applyOpc() {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
    };
    const resp: ApiResponse<OpcSupportInfo> = await HttpClient.post<OpcSupportInfo>(
      '/api/opc/apply', toPostBody(body),
      (data: Record<string, Object>): OpcSupportInfo => {
        return OpcSupportInfo.fromJson(data);
      });
    this.applying = false;
    if (resp.success && resp.data !== null) {
      this.opcInfo = resp.data;
      promptAction.showToast({ message: 'OPC创业支持申请成功！' });
    } else {
      promptAction.showToast({ message: resp.error || '申请失败' });
    }
  }

  private getStatusLabel(status: string): string {
    if (status === 'active') return '已激活';
    if (status === 'pending') return '审核中';
    if (status === 'expired') return '已过期';
    return '未申请';
  }

  private getStatusColor(status: string): ResourceColor {
    if (status === 'active') return Color.Green;
    if (status === 'pending') return $r('app.color.primary_color');
    if (status === 'expired') return Color.Red;
    return $r('app.color.text_secondary');
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

        Text('OPC创业支持')
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
      } else {
        Scroll() {
          Column() {
            Column() {
              Text('OPC创业支持计划')
                .fontSize(22)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .width('100%')
              Text('为KOL创业者提供AI赋能和工具支持')
                .fontSize(14)
                .fontColor(Color.White)
                .opacity(0.8)
                .margin({ top: 8 })
                .width('100%')

              if (this.opcInfo !== null) {
                Row() {
                  Column() {
                    Text(this.opcInfo.freeAiQuota.toString())
                      .fontSize(24)
                      .fontWeight(FontWeight.Bold)
                      .fontColor(Color.White)
                    Text('免费AI额度')
                      .fontSize(11)
                      .fontColor(Color.White)
                      .opacity(0.8)
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)

                  Column() {
                    Text((this.opcInfo.discountRate * 100).toFixed(0) + '%')
                      .fontSize(24)
                      .fontWeight(FontWeight.Bold)
                      .fontColor(Color.White)
                    Text('工具折扣')
                      .fontSize(11)
                      .fontColor(Color.White)
                      .opacity(0.8)
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)

                  Column() {
                    Text(this.getStatusLabel(this.opcInfo.status))
                      .fontSize(16)
                      .fontWeight(FontWeight.Bold)
                      .fontColor(Color.White)
                    Text('状态')
                      .fontSize(11)
                      .fontColor(Color.White)
                      .opacity(0.8)
                      .margin({ top: 2 })
                  }
                  .layoutWeight(1)
                  .alignItems(HorizontalAlign.Center)
                }
                .width('100%')
                .margin({ top: 20 })
              }
            }
            .width('100%')
            .padding(20)
            .borderRadius(12)
            .linearGradient({
              direction: GradientDirection.Right,
              colors: [['#F59E0B', 0.0], ['#D97706', 1.0]]
            })
            .margin({ left: 16, right: 16 })

            if (this.opcInfo !== null && !this.opcInfo.eligible && this.opcInfo.status.length === 0) {
              Column() {
                Text('申请条件')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor($r('app.color.text_primary'))
                  .width('100%')

                this.ConditionRow('KOL认证', '已通过审核')
                this.ConditionRow('粉丝门槛', '>= 1000 + 同类平台基础')
                this.ConditionRow('运营基础', '在同类平台有运营记录')

                if (this.opcInfo.reason.length > 0) {
                  Text('未满足: ' + this.opcInfo.reason)
                    .fontSize(13)
                    .fontColor(Color.Red)
                    .margin({ top: 8 })
                    .width('100%')
                }

                Button('申请KOL认证')
                  .width('100%')
                  .height(44)
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .backgroundColor($r('app.color.primary_color'))
                  .fontColor(Color.White)
                  .borderRadius(22)
                  .margin({ top: 16 })
                  .onClick(() => {
                    router.pushUrl({ url: 'pages/kolaudit/KolAuditPage' });
                  })
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor($r('app.color.card_background'))
              .margin({ left: 16, right: 16, top: 12 })
              .alignItems(HorizontalAlign.Start)
            } else if (this.opcInfo !== null && this.opcInfo.eligible && this.opcInfo.status.length === 0) {
              Button(this.applying ? '申请中...' : '立即申请OPC创业支持')
                .width('90%')
                .height(48)
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .backgroundColor($r('app.color.primary_color'))
                .fontColor(Color.White)
                .borderRadius(24)
                .margin({ top: 16 })
                .enabled(!this.applying)
                .onClick(() => this.applyOpc())
            }

            if (this.opcInfo !== null && this.opcInfo.benefits.length > 0) {
              Column() {
                Text('OPC权益')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor($r('app.color.text_primary'))
                  .width('100%')

                ForEach(this.opcInfo.benefits, (item: OpcBenefit, index: number) => {
                  Row() {
                    Column() {
                      Text((index + 1).toString())
                        .fontSize(14)
                        .fontWeight(FontWeight.Bold)
                        .fontColor(Color.White)
                    }
                    .width(28)
                    .height(28)
                    .borderRadius(14)
                    .justifyContent(FlexAlign.Center)
                    .backgroundColor($r('app.color.primary_color'))
                    .margin({ right: 12 })

                    Column() {
                      Text(item.name)
                        .fontSize(15)
                        .fontWeight(FontWeight.Medium)
                        .fontColor($r('app.color.text_primary'))
                        .width('100%')
                      Text(item.description)
                        .fontSize(13)
                        .fontColor($r('app.color.text_secondary'))
                        .margin({ top: 2 })
                        .width('100%')
                    }
                    .layoutWeight(1)
                    .alignItems(HorizontalAlign.Start)
                  }
                  .width('100%')
                  .padding(12)
                  .borderRadius(8)
                  .backgroundColor($r('app.color.card_background'))
                  .margin({ top: 8 })
                }, (item: OpcBenefit, index: number) => item.name + '_' + index.toString())
              }
              .width('100%')
              .padding(16)
              .margin({ top: 12 })
              .alignItems(HorizontalAlign.Start)
            }

            if (this.opcInfo !== null && this.opcInfo.usedAiQuota > 0) {
              Column() {
                Row() {
                  Text('AI额度使用')
                    .fontSize(16)
                    .fontWeight(FontWeight.Bold)
                    .fontColor($r('app.color.text_primary'))
                    .layoutWeight(1)
                  Text(this.opcInfo.usedAiQuota.toString() + ' / ' + this.opcInfo.freeAiQuota.toString())
                    .fontSize(14)
                    .fontColor($r('app.color.text_secondary'))
                }
                .width('100%')

                Progress({ value: this.opcInfo.usedAiQuota, total: Math.max(this.opcInfo.freeAiQuota, 1), type: ProgressType.Linear })
                  .width('100%')
                  .height(8)
                  .color($r('app.color.primary_color'))
                  .margin({ top: 12 })
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor($r('app.color.card_background'))
              .margin({ left: 16, right: 16, top: 12 })
              .alignItems(HorizontalAlign.Start)
            }

            if (this.aiTools.length > 0) {
              Column() {
                Text('OPC专属AI工具')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor($r('app.color.text_primary'))
                  .width('100%')

                ForEach(this.aiTools, (item: AiToolItem) => {
                  this.AiToolCard(item)
                }, (item: AiToolItem) => item.id)
              }
              .width('100%')
              .padding(16)
              .margin({ top: 12 })
              .alignItems(HorizontalAlign.Start)
            }
          }
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ConditionRow(title: string, desc: string) {
    Row() {
      Text(title)
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .width(100)
      Text(desc)
        .fontSize(13)
        .fontColor($r('app.color.text_secondary'))
        .layoutWeight(1)
    }
    .width('100%')
    .height(36)
  }

  @Builder
  AiToolCard(item: AiToolItem) {
    Row() {
      Column() {
        Text(item.name)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
        Text(item.description)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 2 })
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      Column() {
        if (item.isFreeForOpc) {
          Text('OPC免费')
            .fontSize(12)
            .fontColor(Color.Green)
            .fontWeight(FontWeight.Bold)
        } else {
          Text('¥' + item.discountPrice.toFixed(0))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('¥' + item.originalPrice.toFixed(0))
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .decoration({ type: TextDecorationType.LineThrough })
        }
      }
      .alignItems(HorizontalAlign.End)
      .margin({ left: 12 })
    }
    .width('100%')
    .padding(12)
    .borderRadius(8)
    .backgroundColor($r('app.color.card_background'))
    .margin({ top: 8 })
  }
}
