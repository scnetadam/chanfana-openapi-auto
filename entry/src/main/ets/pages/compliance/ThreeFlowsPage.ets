import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ComplianceCheckItem, ComplianceCheckList } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct ThreeFlowsPage {
  @State checks: ComplianceCheckItem[] = [];
  @State total: number = 0;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentTab: number = 0;
  @State tabLabels: string[] = ['\u5168\u90E8', '\u5339\u914D', '\u4E0D\u5339\u914D', '\u90E8\u5206'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadChecks();
    this.loading = false;
    this.refreshing = false;
  }

  private async loadChecks() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const statusFilter: string = this.currentTab === 0 ? '' :
      (this.currentTab === 1 ? 'matched' : (this.currentTab === 2 ? 'mismatched' : 'partial'));
    const path: string = '/api/compliance/three-flows?userId=' + uid +
      (statusFilter.length > 0 ? '&matchStatus=' + statusFilter : '');
    const resp: ApiResponse<ComplianceCheckItem[]> = await HttpClient.get<ComplianceCheckItem[]>(path,
      (data: Record<string, Object>): ComplianceCheckItem[] => {
        return ComplianceCheckList.fromJson(data).list;
      });
    if (resp.success && resp.data !== null) {
      this.checks = resp.data;
      const totalVal: number = resp.data.length;
      this.total = totalVal;
    }
  }

  private getMatchStatusBg(status: string): string {
    if (status === 'matched') return BrandBadge.GREEN_BG;
    if (status === 'mismatched') return BrandBadge.RED_BG;
    if (status === 'partial') return BrandBadge.GOLD_BG;
    return BrandBadge.BLUE_BG;
  }

  private getMatchStatusText(status: string): string {
    if (status === 'matched') return BrandBadge.GREEN_TEXT;
    if (status === 'mismatched') return BrandBadge.RED_TEXT;
    if (status === 'partial') return BrandBadge.GOLD_TEXT;
    return BrandBadge.BLUE_TEXT;
  }

  private getMatchStatusLabel(status: string): string {
    if (status === 'matched') return '\u5339\u914D';
    if (status === 'mismatched') return '\u4E0D\u5339\u914D';
    if (status === 'partial') return '\u90E8\u5206';
    return '\u5F85\u68C0';
  }

  private truncateHash(hash: string): string {
    if (hash.length <= 12) return hash;
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 4);
  }

  build() {
    Column() {
      Row() {
        Text('\u4E09\u6D41\u6838\u9A8C')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('3FLOW')
            .fontSize(10).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).margin({ left: 4 })
        }
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      Row() {
        ForEach(this.tabLabels, (label: string, index: number) => {
          Column() {
            Text(label)
              .fontSize(14)
              .fontWeight(this.currentTab === index ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === index ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
            if (this.currentTab === index) {
              Column().width(16).height(2).borderRadius(1).backgroundColor(BrandPalette.PRIMARY)
                .shadow({ radius: 6, color: '#00E5A044', offsetX: 0, offsetY: 0 }).margin({ top: 4 })
            }
          }
          .padding({ left: 12, right: 12, bottom: 8 })
          .onClick(() => { this.currentTab = index; this.loadChecks(); })
        }, (label: string, index: number) => label + '_' + index.toString())
      }.width('100%').padding({ left: 16, top: 12 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else if (this.checks.length === 0) {
        Column() {
          Text('\u6682\u65E0\u6838\u9A8C\u8BB0\u5F55').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 8 }) {
            ForEach(this.checks, (item: ComplianceCheckItem) => {
              ListItem() { this.CheckCard(item) }
            }, (item: ComplianceCheckItem) => item.checkId)
          }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
        }.onRefreshing(() => { this.loadData(); })
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  CheckCard(item: ComplianceCheckItem) {
    Column() {
      Row() {
        Text(item.checkId.length > 10 ? item.checkId.substring(0, 10) + '...' : item.checkId)
          .fontSize(13).fontColor(BrandPalette.TEXT_SECONDARY)
        Blank()
        Text(this.getMatchStatusLabel(item.matchStatus))
          .fontSize(11).fontColor(this.getMatchStatusText(item.matchStatus))
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(this.getMatchStatusBg(item.matchStatus))
      }.width('100%')

      Row() {
        Text('BIZ').fontSize(10).fontColor(BrandPalette.TEXT_MUTED)
        Text(this.truncateHash(item.bizHash))
          .fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY).margin({ left: 4 })
      }.width('100%').margin({ top: 6 })

      Row() {
        if (item.ecnyFlowId.length > 0) {
          Row() {
            Text('FLOW').fontSize(9).fontColor(BrandPalette.NEON_BLUE).letterSpacing(1)
          }.padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(BrandBadge.BLUE_BG)
        }
        if (item.invoiceId.length > 0) {
          Row() {
            Text('INV').fontSize(9).fontColor(BrandPalette.GOLD).letterSpacing(1)
          }.padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(BrandBadge.GOLD_BG).margin({ left: 6 })
        }
        if (item.autoCheck) {
          Text('AI\u2713').fontSize(9).fontColor(BrandPalette.NEON_BLUE).letterSpacing(1)
            .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
            .backgroundColor(BrandBadge.BLUE_BG).margin({ left: 6 })
        }
        Blank()
        Text('\u00A5' + item.bizAmount.toFixed(2))
          .fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
      }.width('100%').margin({ top: 6 })

      if (item.mismatchDetail.length > 0) {
        Text(item.mismatchDetail)
          .fontSize(11).fontColor(BrandBadge.RED_TEXT).margin({ top: 4 }).width('100%')
          .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis })
      }

      Text(item.checkTime.length > 16 ? item.checkTime.substring(0, 16).replace('T', ' ') : item.checkTime)
        .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 4 }).width('100%')
    }
    .width('100%').padding(12).borderRadius(BrandRadius.MD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }
}
