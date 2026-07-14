import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { HashRecord, HashRecordList, HashStats } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct HashPage {
  @State records: HashRecord[] = [];
  @State stats: HashStats = new HashStats();
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentType: number = 0;
  @State verifyHash: string = '';
  @State verifyResult: string = '';
  @State verifyChecked: boolean = false;
  @StorageProp('userId') userId: string = '';

  private typeFilters: string[] = ['全部', 'KOL身份', 'KOL/IP', '内容', '分佣', 'OPC', '预约', '商家'];
  private typeMap: Record<string, string> = {
    'KOL身份': 'kol_identity',
    'KOL/IP': 'kol_ip',
    '内容': 'content_publish',
    '分佣': 'commission',
    'OPC': 'opc_identity',
    '预约': 'booking_convert',
    '商家': 'biz_product',
  };

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    const typeParam: string = this.currentType === 0 ? '' : '&dataType=' + this.typeMap[this.typeFilters[this.currentType]];
    const userParam: string = this.userId.length > 0 ? '&userId=' + this.userId : '';
    const listResp: ApiResponse<HashRecordList> = await HttpClient.get<HashRecordList>(
      '/api/hash/list?page=1&pageSize=50' + typeParam + userParam,
      (data: Record<string, Object>): HashRecordList => {
        return HashRecordList.fromJson(data);
      });
    if (listResp.success && listResp.data !== null) {
      this.records = listResp.data.list;
    }
    const statsResp: ApiResponse<HashStats> = await HttpClient.get<HashStats>(
      '/api/hash/stats',
      (data: Record<string, Object>): HashStats => {
        return HashStats.fromJson(data);
      });
    if (statsResp.success && statsResp.data !== null) {
      this.stats = statsResp.data;
    }
    this.loading = false;
    this.refreshing = false;
  }

  private async doVerify() {
    if (this.verifyHash.length === 0) {
      promptAction.showToast({ message: '请输入存证哈希' });
      return;
    }
    const body: Record<string, Object> = {
      'hash': this.verifyHash,
    };
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.post<Record<string, Object>>(
      '/api/hash/verify', body,
      (data: Record<string, Object>): Record<string, Object> => {
        return data;
      });
    if (resp.success && resp.data !== null) {
      const validVal: Object | undefined = resp.data['valid'];
      const isValid: boolean = validVal !== null && validVal !== undefined && validVal === true;
      this.verifyResult = isValid ? '验证通过 — 存证数据完整' : '验证失败 — 数据已被篡改或不存在';
      this.verifyChecked = true;
    } else {
      this.verifyResult = '验证失败: ' + (resp.error || '未知错误');
      this.verifyChecked = true;
    }
  }

  private getTypeLabel(dataType: string): string {
    const labels: Record<string, string> = {
      'kol_identity': 'KOL身份',
      'kol_ip': 'KOL/IP',
      'content_publish': '内容发布',
      'content_share': '内容传播',
      'commission': '分佣',
      'opc_identity': 'OPC',
      'booking_convert': '预约转化',
      'biz_product': '商家产品',
    };
    const label: string | undefined = labels[dataType];
    return label !== null && label !== undefined ? label : dataType;
  }

  private getTypeColor(dataType: string): string {
    const colors: Record<string, string> = {
      'kol_identity': '#FF6B35',
      'kol_ip': '#E91E63',
      'content_publish': '#4CAF50',
      'content_share': '#8BC34A',
      'commission': '#FF9800',
      'opc_identity': '#9C27B0',
      'booking_convert': '#2196F3',
      'biz_product': '#607D8B',
    };
    const color: string | undefined = colors[dataType];
    return color !== null && color !== undefined ? color : '#999999';
  }

  private shortHash(hash: string): string {
    if (hash.length <= 16) {
      return hash;
    }
    return hash.slice(0, 8) + '...' + hash.slice(hash.length - 8);
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

        Text('IP存证中心')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row().width(40).height(40)
      }
      .width('100%')
      .height(56)
      .padding({ left: 8, right: 8 })

      Row() {
        Column() {
          Text(this.stats.total.toString())
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_color'))
          Text('存证总数')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)

        Column() {
          Text(this.getTypeCount('kol_identity').toString())
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#FF6B35')
          Text('KOL身份')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)

        Column() {
          Text(this.getTypeCount('content_publish').toString())
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#4CAF50')
          Text('内容存证')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)

        Column() {
          Text(this.getTypeCount('commission').toString())
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor('#FF9800')
          Text('分佣存证')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
      }
      .width('100%')
      .padding(16)
      .margin({ left: 16, right: 16, top: 8 })
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))

      Scroll() {
        Row() {
          ForEach(this.typeFilters, (filter: string, index: number) => {
            Text(filter)
              .fontSize(13)
              .fontWeight(this.currentType === index ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentType === index ? Color.White : $r('app.color.text_primary'))
              .padding({ left: 14, right: 14, top: 6, bottom: 6 })
              .borderRadius(16)
              .backgroundColor(this.currentType === index ? $r('app.color.primary_color') : $r('app.color.card_background'))
              .margin({ right: 8 })
              .onClick(() => {
                this.currentType = index;
                this.loadData();
              })
          }, (filter: string, index: number) => filter + '_' + index.toString())
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
      } else if (this.records.length === 0) {
        Column() {
          Text('暂无存证记录')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 10 }) {
            ForEach(this.records, (item: HashRecord) => {
              ListItem() {
                this.RecordCard(item)
              }
            }, (item: HashRecord) => item.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4, bottom: 8 })
        }
        .onRefreshing(() => {
          this.loadData();
        })
      }

      Column() {
        Text('存证验证')
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
          .margin({ bottom: 8 })

        Row() {
          TextInput({ placeholder: '输入存证哈希值' })
            .layoutWeight(1)
            .height(40)
            .fontSize(13)
            .fontColor($r('app.color.text_primary'))
            .onChange((value: string) => {
              this.verifyHash = value;
              this.verifyChecked = false;
            })
          Button('验证')
            .height(40)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(8)
            .margin({ left: 8 })
            .onClick(() => this.doVerify())
        }
        .width('100%')

        if (this.verifyChecked) {
          Text(this.verifyResult)
            .fontSize(13)
            .fontColor(this.verifyResult.indexOf('通过') >= 0 ? Color.Green : Color.Red)
            .margin({ top: 6 })
            .width('100%')
        }
      }
      .width('100%')
      .padding(16)
      .margin({ left: 16, right: 16, bottom: 16 })
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  private getTypeCount(dataType: string): number {
    const byType: Record<string, Object> = this.stats.byType;
    const val: Object | undefined = byType[dataType];
    if (val !== null && val !== undefined) {
      return Number(val);
    }
    return 0;
  }

  @Builder
  RecordCard(item: HashRecord) {
    Column() {
      Row() {
        Text(this.getTypeLabel(item.dataType))
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor(this.getTypeColor(item.dataType))

        Text(item.source === 'local' ? '本地存证' : '印证存证')
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
          .margin({ left: 8 })

        Blank()

        Text(item.createdAt.slice(0, 10))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')

      Row() {
        Text('TxID:')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Text(item.txId)
          .fontSize(12)
          .fontColor($r('app.color.text_primary'))
          .fontWeight(FontWeight.Medium)
          .margin({ left: 4 })
      }
      .width('100%')
      .margin({ top: 8 })

      Row() {
        Text('Hash:')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Text(this.shortHash(item.hash))
          .fontSize(12)
          .fontColor($r('app.color.primary_color'))
          .fontWeight(FontWeight.Medium)
          .margin({ left: 4 })
      }
      .width('100%')
      .margin({ top: 4 })
    }
    .width('100%')
    .padding(14)
    .borderRadius(10)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 2, color: '#1A000000', offsetX: 0, offsetY: 1 })
  }
}
