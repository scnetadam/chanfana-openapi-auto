import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ContentAuditRecord, ContentAuditStats } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';
import { ContentFingerprint } from '../../common/ContentFingerprint';
import { AiComplianceResult, AiSecurityLabel } from '../../model/DataModels';

@Entry
@Component
struct ContentAuditPage {
  @State records: ContentAuditRecord[] = [];
  @State stats: ContentAuditStats = new ContentAuditStats();
  @State loading: boolean = true;
  @State currentFilter: number = 0;
  @StorageProp('userId') userId: string = '';
  @State complianceMap: Record<string, AiComplianceResult> = {};

  private filters: string[] = ['全部', '已通过', '待审核', '已拒绝'];
  private filterStatuses: string[] = ['', 'pass', 'pending', 'reject'];

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await Promise.all([
      this.loadRecords(),
      this.loadStats(),
    ]);
    this.loading = false;
  }

  private async loadRecords() {
    const uid: string = this.userId;
    const statusParam: string = this.currentFilter === 0 ? '' : '&status=' + this.filterStatuses[this.currentFilter];
    const resp: ApiResponse<ContentAuditRecord[]> = await HttpClient.get<ContentAuditRecord[]>(
      '/api/content-audit/list?page=1&pageSize=50&userId=' + uid + statusParam,
      (data: Record<string, Object>): ContentAuditRecord[] => {
        const arr: Record<string, Object>[] = [];
        const listVal: Object | undefined = data['list'];
        if (listVal !== null && listVal !== undefined && Array.isArray(listVal)) {
          const rawArr: Object[] = listVal as Object[];
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: ContentAuditRecord[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(ContentAuditRecord.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) {
      this.records = resp.data;
    }
  }

  private async loadStats() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<ContentAuditStats> = await HttpClient.get<ContentAuditStats>(
      '/api/content-audit/stats?userId=' + uid,
      (data: Record<string, Object>): ContentAuditStats => {
        return ContentAuditStats.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.stats = resp.data;
    }
  }

  private async reviewContent(contentId: string, decision: string) {
    const body: Record<string, Object> = {
      'contentId': contentId,
      'decision': decision,
    };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/content-audit/review', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      promptAction.showToast({ message: decision === 'pass' ? '审核通过' : '审核拒绝' });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '操作失败' });
    }
  }

  private async tencentModerate(contentId: string) {
    const body: Record<string, Object> = { 'contentId': contentId };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/content-audit/tencent-moderation', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      promptAction.showToast({ message: '腾讯天御审核完成' });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '机审失败' });
    }
  }

  private async checkCompliance(contentId: string) {
    const result: AiComplianceResult = await ContentFingerprint.checkCompliance(contentId);
    this.complianceMap[contentId] = result;
  }

  private getCompliance(contentId: string): AiComplianceResult | null {
    const val: AiComplianceResult | undefined = this.complianceMap[contentId];
    if (val !== null && val !== undefined) {
      return val;
    }
    return null;
  }

  private getStatusColor(status: string): string {
    if (status === 'pass') return '#10B981';
    if (status === 'pending') return '#F59E0B';
    if (status === 'reject') return '#E84026';
    return '#99182431';
  }

  private getStatusLabel(status: string): string {
    if (status === 'pass') return '通过';
    if (status === 'pending') return '待审';
    if (status === 'reject') return '拒绝';
    return status;
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

        Text('内容审核')
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

      Row() {
        Column() {
          Text(this.stats.total.toString())
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_color'))
          Text('审核总数')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text(this.stats.pass.toString())
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.success_color'))
           Text('已通过')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text(this.stats.pending.toString())
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.warning_color'))
           Text('待审核')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text(this.stats.reject.toString())
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('已拒绝')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .padding(16)
      .margin({ left: 16, right: 16, top: 8 })
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
      .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })

      Scroll() {
        Row() {
          ForEach(this.filters, (filter: string, index: number) => {
            Text(filter)
              .fontSize(13)
              .fontColor(this.currentFilter === index ? Color.White : $r('app.color.text_primary'))
              .padding({ left: 14, right: 14, top: 6, bottom: 6 })
              .borderRadius(16)
              .backgroundColor(this.currentFilter === index ? $r('app.color.primary_color') : $r('app.color.card_background'))
              .margin({ right: 8 })
              .onClick(() => {
                this.currentFilter = index;
                this.loadData();
              })
          }, (filter: string, index: number) => filter + '_' + index.toString())
        }
      }
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .width('100%')
      .padding({ left: 16, top: 8, bottom: 8 })

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
      } else if (this.records.length === 0) {
        Column() {
          Text('暂无审核记录')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 8 }) {
          ForEach(this.records, (item: ContentAuditRecord) => {
            ListItem() {
              this.AuditCard(item)
            }
          }, (item: ContentAuditRecord) => item.id)
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16, top: 4, bottom: 8 })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  AuditCard(item: ContentAuditRecord) {
    Column() {
      Row() {
        Text(this.getStatusLabel(item.status))
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor(this.getStatusColor(item.status))

        if (item.tencentModerated) {
          Text('天御')
            .fontSize(10)
            .fontColor(Color.White)
            .padding({ left: 4, right: 4, top: 1, bottom: 1 })
            .borderRadius(3)
            .backgroundColor($r('app.color.purple_color'))
            .margin({ left: 4 })
        }

        if (item.needsTencentModeration && !item.tencentModerated) {
          Text('需机审')
            .fontSize(10)
            .fontColor($r('app.color.purple_color'))
            .padding({ left: 4, right: 4, top: 1, bottom: 1 })
            .borderRadius(3)
            .backgroundColor($r('app.color.purple_bg_color'))
            .margin({ left: 4 })
        }

        Blank()

        Text(item.createdAt.slice(0, 10))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')

      Row() {
        Text('内容ID: ')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Text(item.contentId)
          .fontSize(12)
          .fontColor($r('app.color.text_primary'))
          .fontWeight(FontWeight.Medium)
      }
      .width('100%')
      .margin({ top: 8 })

      Row() {
        Text('合规分: ')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Text(item.score.toFixed(2))
          .fontSize(12)
          .fontColor(item.score >= 0.8 ? $r('app.color.success_color') : (item.score >= 0.5 ? $r('app.color.warning_color') : $r('app.color.danger_color')))
          .fontWeight(FontWeight.Bold)
      }
      .width('100%')
      .margin({ top: 4 })

      if (item.violations.length > 0) {
        Row() {
          Text('违规项: ')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
          ForEach(item.violations, (v: Record<string, Object>, i: number) => {
            Text(String(v['category'] !== null && v['category'] !== undefined ? v['category'] : ''))
              .fontSize(10)
              .fontColor($r('app.color.price_color'))
              .padding({ left: 4, right: 4, top: 1, bottom: 1 })
              .borderRadius(3)
              .backgroundColor($r('app.color.danger_bg_color'))
              .margin({ left: 2 })
          }, (v: Record<string, Object>, i: number) => String(v['category'] !== null && v['category'] !== undefined ? v['category'] : '') + '_' + i.toString())
        }
        .width('100%')
        .margin({ top: 4 })
      }

      if (item.reason.length > 0) {
        Text('原因: ' + item.reason)
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
          .width('100%')
      }

      Row() {
        Text('安全标签: ')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Text('查询')
          .fontSize(11)
          .fontColor($r('app.color.primary_color'))
          .onClick(() => this.checkCompliance(item.contentId))
      }
      .width('100%')
      .margin({ top: 4 })

      if (this.getCompliance(item.contentId) !== null) {
        Column() {
          Row() {
            Text('风险等级: ')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
            Text(ContentFingerprint.getRiskLabel(this.getCompliance(item.contentId).riskScore))
              .fontSize(11)
              .fontColor(ContentFingerprint.getRiskColor(this.getCompliance(item.contentId).riskScore))
              .fontWeight(FontWeight.Bold)
            Text(' (' + this.getCompliance(item.contentId).riskScore.toString() + ')')
              .fontSize(10)
              .fontColor($r('app.color.text_secondary'))
          }
          .width('100%')

          if (this.getCompliance(item.contentId).labels.length > 0) {
            Flex({ wrap: FlexWrap.Wrap }) {
              ForEach(this.getCompliance(item.contentId).labels, (label: AiSecurityLabel, lIndex: number) => {
                Text(label.type + ':' + label.level)
                  .fontSize(10)
                  .fontColor(Color.White)
                  .backgroundColor(ContentFingerprint.getLabelColor(label.level))
                  .borderRadius(3)
                  .padding({ left: 4, right: 4, top: 1, bottom: 1 })
                  .margin({ right: 4, top: 4 })
              }, (label: AiSecurityLabel, lIndex: number) => label.type + '_' + lIndex.toString())
            }
            .width('100%')
            .margin({ top: 4 })
          }

          Row() {
            Text(ContentFingerprint.canDownload(this.getCompliance(item.contentId)) ? '可下载' : '不可下载')
              .fontSize(11)
              .fontColor(ContentFingerprint.canDownload(this.getCompliance(item.contentId)) ? $r('app.color.success_color') : $r('app.color.danger_color'))
              .margin({ right: 12 })
            Text(ContentFingerprint.canShareExternally(this.getCompliance(item.contentId)) ? '可外传' : '不可外传')
              .fontSize(11)
              .fontColor(ContentFingerprint.canShareExternally(this.getCompliance(item.contentId)) ? $r('app.color.success_color') : $r('app.color.danger_color'))
          }
          .width('100%')
          .margin({ top: 4 })
        }
        .width('100%')
        .margin({ top: 4 })
      }

      if (item.status === 'pending') {
        Row() {
          Button('通过')
            .height(28)
            .fontSize(12)
            .backgroundColor($r('app.color.success_color'))
            .fontColor(Color.White)
            .borderRadius(14)
            .margin({ right: 8 })
            .onClick(() => this.reviewContent(item.contentId, 'pass'))

          Button('拒绝')
            .height(28)
            .fontSize(12)
            .backgroundColor($r('app.color.price_color'))
            .fontColor(Color.White)
            .borderRadius(14)
            .margin({ right: 8 })
            .onClick(() => this.reviewContent(item.contentId, 'reject'))

          if (item.needsTencentModeration && !item.tencentModerated) {
            Button('腾讯机审')
              .height(28)
              .fontSize(12)
              .backgroundColor($r('app.color.purple_color'))
              .fontColor(Color.White)
              .borderRadius(14)
              .onClick(() => this.tencentModerate(item.contentId))
          }
        }
        .width('100%')
        .margin({ top: 8 })
        .justifyContent(FlexAlign.End)
      }
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }
}
