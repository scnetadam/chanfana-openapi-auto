import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { RegulatoryOverview, RegulatoryAlert, TipsAccountInfo, EcnyTraceRecord, FourFlowCheckResult } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct RegulatoryWatchPage {
  @State overview: RegulatoryOverview | null = null;
  @State alerts: RegulatoryAlert[] = [];
  @State tipsInfo: TipsAccountInfo | null = null;
  @State traces: EcnyTraceRecord[] = [];
  @State fourFlows: FourFlowCheckResult[] = [];
  @State loading: boolean = true;
  @State currentTab: number = 0;
  @State tabLabels: string[] = ['\u76D1\u7BA1\u603B\u89C8', 'TIPS\u6263\u7A0E', 'e-CNY\u7A7F\u900F', '\u56DB\u6D41\u5408\u4E00', '\u9884\u8B66'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadOverview();
    await this.loadAlerts();
    await this.loadTipsInfo();
    await this.loadTraces();
    await this.loadFourFlows();
    this.loading = false;
  }

  private async loadOverview() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<RegulatoryOverview> = await HttpClient.get<RegulatoryOverview>(
      '/api/regulatory/overview?userId=' + uid,
      (data: Record<string, Object>): RegulatoryOverview => { return RegulatoryOverview.fromJson(data); });
    if (resp.success && resp.data !== null) { this.overview = resp.data; }
  }

  private async loadAlerts() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<RegulatoryAlert[]> = await HttpClient.get<RegulatoryAlert[]>(
      '/api/regulatory/alerts?userId=' + uid,
      (data: Record<string, Object>): RegulatoryAlert[] => {
        const arr: Record<string, Object>[] = [];
        const listObj: Object | undefined = data['list'];
        if (listObj !== null && listObj !== undefined && Array.isArray(listObj)) {
          const rawArr: Object[] = listObj;
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: RegulatoryAlert[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(RegulatoryAlert.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.alerts = resp.data; }
  }

  private async loadTipsInfo() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<TipsAccountInfo> = await HttpClient.get<TipsAccountInfo>(
      '/api/regulatory/tips?userId=' + uid,
      (data: Record<string, Object>): TipsAccountInfo => { return TipsAccountInfo.fromJson(data); });
    if (resp.success && resp.data !== null) { this.tipsInfo = resp.data; }
  }

  private async loadTraces() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<EcnyTraceRecord[]> = await HttpClient.get<EcnyTraceRecord[]>(
      '/api/regulatory/ecny-traces?userId=' + uid,
      (data: Record<string, Object>): EcnyTraceRecord[] => {
        const arr: Record<string, Object>[] = [];
        const listObj: Object | undefined = data['list'];
        if (listObj !== null && listObj !== undefined && Array.isArray(listObj)) {
          const rawArr: Object[] = listObj;
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: EcnyTraceRecord[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(EcnyTraceRecord.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.traces = resp.data; }
  }

  private async loadFourFlows() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<FourFlowCheckResult[]> = await HttpClient.get<FourFlowCheckResult[]>(
      '/api/regulatory/four-flows?userId=' + uid,
      (data: Record<string, Object>): FourFlowCheckResult[] => {
        const arr: Record<string, Object>[] = [];
        const listObj: Object | undefined = data['list'];
        if (listObj !== null && listObj !== undefined && Array.isArray(listObj)) {
          const rawArr: Object[] = listObj;
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: FourFlowCheckResult[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(FourFlowCheckResult.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.fourFlows = resp.data; }
  }

  private getSeverityBg(severity: string): string {
    if (severity === 'high') return BrandBadge.RED_BG;
    if (severity === 'medium') return BrandBadge.GOLD_BG;
    return BrandBadge.BLUE_BG;
  }

  private getSeverityText(severity: string): string {
    if (severity === 'high') return BrandBadge.RED_TEXT;
    if (severity === 'medium') return BrandBadge.GOLD_TEXT;
    return BrandBadge.BLUE_TEXT;
  }

  private getSeverityLabel(severity: string): string {
    if (severity === 'high') return '\u9AD8';
    if (severity === 'medium') return '\u4E2D';
    return '\u4F4E';
  }

  private getMatchStatusBg(status: string): string {
    if (status === 'matched') return BrandBadge.GREEN_BG;
    if (status === 'mismatched') return BrandBadge.RED_BG;
    return BrandBadge.GOLD_BG;
  }

  private getMatchStatusText(status: string): string {
    if (status === 'matched') return BrandBadge.GREEN_TEXT;
    if (status === 'mismatched') return BrandBadge.RED_TEXT;
    return BrandBadge.GOLD_TEXT;
  }

  private getMatchStatusLabel(status: string): string {
    if (status === 'matched') return '\u56DB\u6D41\u5339\u914D';
    if (status === 'mismatched') return '\u4E0D\u5339\u914D';
    return '\u90E8\u5206\u5339\u914D';
  }

  private getRiskLevelColor(level: string): string {
    if (level === 'low') return BrandBadge.GREEN_TEXT;
    if (level === 'medium') return BrandBadge.GOLD_TEXT;
    if (level === 'high') return BrandBadge.RED_TEXT;
    return BrandPalette.TEXT_MUTED;
  }

  private getWhitelistStatusLabel(status: string): string {
    if (status === 'whitelisted') return '\u767D\u540D\u5355';
    if (status === 'pending') return '\u5BA1\u6838\u4E2D';
    if (status === 'rejected') return '\u5DF2\u62D2\u7EDD';
    return '\u672A\u7533\u8BF7';
  }

  private truncateId(id: string): string {
    if (id.length <= 16) return id;
    return id.substring(0, 10) + '...' + id.substring(id.length - 4);
  }

  build() {
    Column() {
      Row() {
        Text('\u76D1\u7BA1\u770B\u677F')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('REGULATE')
            .fontSize(10).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).margin({ left: 4 })
        }
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      Row() {
        ForEach(this.tabLabels, (label: string, index: number) => {
          Column() {
            Text(label)
              .fontSize(13)
              .fontWeight(this.currentTab === index ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === index ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
            if (this.currentTab === index) {
              Column().width(16).height(2).borderRadius(1).backgroundColor(BrandPalette.PRIMARY)
                .shadow({ radius: 6, color: '#00E5A044', offsetX: 0, offsetY: 0 }).margin({ top: 4 })
            }
          }
          .padding({ left: 8, right: 8, bottom: 8 })
          .onClick(() => { this.currentTab = index; })
        }, (label: string, index: number) => label + '_' + index.toString())
      }.width('100%').padding({ left: 12, top: 8 }).scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Off)

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            if (this.currentTab === 0) {
              this.OverviewTab()
            } else if (this.currentTab === 1) {
              this.TipsTab()
            } else if (this.currentTab === 2) {
              this.EcnyTraceTab()
            } else if (this.currentTab === 3) {
              this.FourFlowTab()
            } else {
              this.AlertTab()
            }
          }
        }.width('100%').layoutWeight(1)
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  OverviewTab() {
    Column() {
      if (this.overview !== null) {
        Column() {
          Row() {
            Column() {
              Text(this.overview.totalVerifiedTransactions.toString())
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
              Text('\u5DF2\u6838\u5B9E\u4EA4\u6613').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text(this.overview.fourFlowMatchRate.toFixed(1) + '%')
                .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
              Text('\u56DB\u6D41\u5339\u914D\u7387').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
            Column() {
              Text(this.overview.pendingAlerts.toString())
                .fontSize(20).fontWeight(FontWeight.Bold)
                .fontColor(this.overview.pendingAlerts > 0 ? BrandBadge.RED_TEXT : BrandBadge.GREEN_TEXT)
              Text('\u5F85\u5904\u7406\u9884\u8B66').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
            }.layoutWeight(1).alignItems(HorizontalAlign.Center)
          }.width('100%')

          Row() {
            Text('\u00A5' + this.overview.totalVerifiedAmount.toFixed(2))
              .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD).margin({ top: 8 })
            Text('\u5DF2\u6838\u5B9E\u91D1\u989D').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 4, top: 8 })
          }
        }
        .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

        Column() {
          Text('\u76D1\u7BA1\u8054\u901A\u72B6\u6001')
            .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
            .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

          Row() {
            Text('TIPS').fontSize(11).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.overview.tipsEnabled ? '\u5DF2\u63A5\u5165' : '\u672A\u63A5\u5165')
              .fontSize(13)
              .fontColor(this.overview.tipsEnabled ? BrandBadge.GREEN_TEXT : BrandBadge.RED_TEXT)
          }.width('100%').margin({ top: 8 })
          Row() {
            Text('e-CNY\u7A7F\u900F').fontSize(11).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.overview.ecnyTraceable ? '\u5DF2\u5F00\u542F' : '\u672A\u5F00\u542F')
              .fontSize(13)
              .fontColor(this.overview.ecnyTraceable ? BrandBadge.GREEN_TEXT : BrandBadge.RED_TEXT)
          }.width('100%').margin({ top: 6 })
          Row() {
            Text('\u91D1\u7A0E\u56DB\u671F').fontSize(11).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.overview.goldenTaxLinked ? '\u5DF2\u5BF9\u63A5' : '\u672A\u5BF9\u63A5')
              .fontSize(13)
              .fontColor(this.overview.goldenTaxLinked ? BrandBadge.GREEN_TEXT : BrandBadge.RED_TEXT)
              .layoutWeight(1)
            if (this.overview.goldenTaxLinked) {
              Text('\u540C\u6B65 ' + this.overview.goldenTaxSyncCount + ' \u6B21')
                .fontSize(10).fontColor(BrandPalette.TEXT_MUTED)
            }
          }.width('100%').margin({ top: 6 })
          Row() {
            Text('\u767D\u540D\u5355').fontSize(11).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.getWhitelistStatusLabel(this.overview.whitelistStatus))
              .fontSize(13).fontColor(
                this.overview.whitelistStatus === 'whitelisted' ? BrandBadge.GREEN_TEXT : BrandPalette.TEXT_PRIMARY)
          }.width('100%').margin({ top: 6 })
          Row() {
            Text('\u98CE\u9669\u7B49\u7EA7').fontSize(11).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.overview.riskLevel)
              .fontSize(13).fontWeight(FontWeight.Bold)
              .fontColor(this.getRiskLevelColor(this.overview.riskLevel))
          }.width('100%').margin({ top: 6 })
          if (this.overview.lastSyncTime.length > 0) {
            Row() {
              Text('\u6700\u540E\u540C\u6B65').fontSize(11).fontColor(BrandPalette.TEXT_MUTED).width(80)
              Text(this.overview.lastSyncTime.substring(0, 16).replace('T', ' '))
                .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
            }.width('100%').margin({ top: 6 })
          }
        }
        .width('100%').padding(16).margin({ left: 16, right: 16, top: 12, bottom: 24 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      } else {
        Column() {
          Text('\u76D1\u7BA1\u6570\u636E\u52A0\u8F7D\u4E2D...').fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').padding(32).justifyContent(FlexAlign.Center)
      }
    }
  }

  @Builder
  TipsTab() {
    Column() {
      if (this.tipsInfo !== null) {
        Column() {
          Text('TIPS\u4E09\u65B9\u534F\u8BAE')
            .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
            .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

          Row() {
            Text('\u94F6\u884C').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.tipsInfo.bankName)
              .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1)
          }.width('100%').margin({ top: 8 })
          Row() {
            Text('\u7A0E\u52A1\u5C40').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.tipsInfo.taxOffice)
              .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1)
          }.width('100%').margin({ top: 6 })
          Row() {
            Text('\u534F\u8BAE\u72B6\u6001').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.tipsInfo.agreementStatus)
              .fontSize(13)
              .fontColor(this.tipsInfo.agreementStatus === 'active' ? BrandBadge.GREEN_TEXT : BrandPalette.TEXT_PRIMARY)
          }.width('100%').margin({ top: 6 })
          Row() {
            Text('\u81EA\u52A8\u6263\u7A0E').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text(this.tipsInfo.autoDeductEnabled ? '\u5DF2\u5F00\u542F' : '\u672A\u5F00\u542F')
              .fontSize(13)
              .fontColor(this.tipsInfo.autoDeductEnabled ? BrandBadge.GREEN_TEXT : BrandBadge.RED_TEXT)
          }.width('100%').margin({ top: 6 })
          Row() {
            Text('\u5DF2\u6263\u7A0E\u603B\u989D').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(80)
            Text('\u00A5' + this.tipsInfo.totalDeducted.toFixed(2))
              .fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
          }.width('100%').margin({ top: 6 })
          if (this.tipsInfo.lastDeductTime.length > 0) {
            Row() {
              Text('\u6700\u540E\u6263\u7A0E').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(80)
              Text(this.tipsInfo.lastDeductTime.substring(0, 16).replace('T', ' '))
                .fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
            }.width('100%').margin({ top: 6 })
          }
        }
        .width('100%').padding(16).margin({ left: 16, right: 16, top: 8, bottom: 24 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      } else {
        Column() {
          Text('TIPS\u4E09\u65B9\u534F\u8BAE\u5C1A\u672A\u7B7E\u7F72')
            .fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
          Text('\u9F9F\u94AE\u5370\u9274\u53EF\u534F\u52A9\u5BF9\u63A5\u62DB\u884C\u5206\u884C\u529E\u7406TIPS\u4E09\u65B9\u6263\u7A0E\u534F\u8BAE')
            .fontSize(12).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 8 })
        }.width('100%').padding(32).justifyContent(FlexAlign.Center)
          .margin({ left: 16, right: 16, top: 8, bottom: 24 })
          .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
          .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      }
    }
  }

  @Builder
  EcnyTraceTab() {
    Column() {
      if (this.traces.length === 0) {
        Column() {
          Text('\u6682\u65E0e-CNY\u7A7F\u900F\u8BB0\u5F55').fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').padding(32).justifyContent(FlexAlign.Center)
          .margin({ left: 16, right: 16, top: 8, bottom: 24 })
          .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
      } else {
        ForEach(this.traces, (item: EcnyTraceRecord) => {
          Column() {
            Row() {
              Text(this.truncateId(item.flowId))
                .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1)
              Text('\u00A5' + item.amount.toFixed(2))
                .fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            }.width('100%')
            Row() {
              Text(item.direction === 'in' ? '\u2193' : '\u2191')
                .fontSize(12).fontColor(item.direction === 'in' ? BrandBadge.GREEN_TEXT : BrandBadge.RED_TEXT)
              Text(item.purpose)
                .fontSize(12).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 4 }).layoutWeight(1)
              if (item.taxDeducted) {
                Text('\u6263\u7A0E')
                  .fontSize(9).fontColor(BrandBadge.GREEN_TEXT)
                  .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                  .backgroundColor(BrandBadge.GREEN_BG)
              }
              if (item.invoiceIssued) {
                Text('\u5F00\u7968')
                  .fontSize(9).fontColor(BrandBadge.GOLD_TEXT)
                  .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                  .backgroundColor(BrandBadge.GOLD_BG).margin({ left: 4 })
              }
            }.width('100%').margin({ top: 6 })
            if (item.hashProof.length > 0) {
              Row() {
                Text('HASH').fontSize(9).fontColor(BrandPalette.NEON_BLUE).letterSpacing(1)
                Text(this.truncateId(item.hashProof))
                  .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 4 })
              }.width('100%').margin({ top: 4 })
            }
            Row() {
              Text('\u4F1E\u9876 ' + this.truncateId(item.umbrellaTopId))
                .fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
              Text('\u2192').fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 4 })
              Text('\u4F1E\u5E95 ' + this.truncateId(item.umbrellaBottomId))
                .fontSize(9).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 4 })
              Blank()
              Text(item.timestamp.length > 16 ? item.timestamp.substring(0, 16).replace('T', ' ') : item.timestamp)
                .fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
            }.width('100%').margin({ top: 4 })
          }
          .width('100%').padding(12).margin({ left: 16, right: 16, top: 4 })
          .borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
          .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }, (item: EcnyTraceRecord) => item.flowId)
      }
    }.margin({ bottom: 24 })
  }

  @Builder
  FourFlowTab() {
    Column() {
      if (this.fourFlows.length === 0) {
        Column() {
          Text('\u6682\u65E0\u56DB\u6D41\u5408\u4E00\u68C0\u67E5\u8BB0\u5F55').fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').padding(32).justifyContent(FlexAlign.Center)
          .margin({ left: 16, right: 16, top: 8, bottom: 24 })
          .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
      } else {
        ForEach(this.fourFlows, (item: FourFlowCheckResult) => {
          Column() {
            Row() {
              Text(this.getMatchStatusLabel(item.matchStatus))
                .fontSize(11).fontColor(this.getMatchStatusText(item.matchStatus))
                .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
                .backgroundColor(this.getMatchStatusBg(item.matchStatus))
              Blank()
              Text(item.checkTime.length > 16 ? item.checkTime.substring(0, 16).replace('T', ' ') : item.checkTime)
                .fontSize(10).fontColor(BrandPalette.TEXT_MUTED)
            }.width('100%')
            Row() {
              Text('BIZ').fontSize(9).fontColor(BrandPalette.NEON_BLUE).letterSpacing(1)
              Text(this.truncateId(item.bizHash))
                .fontSize(10).fontColor(BrandPalette.TEXT_PRIMARY).margin({ left: 4 })
            }.width('100%').margin({ top: 6 })
            Row() {
              Column() {
                Text('\u4E1A\u52A1\u6D41').fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
                Text('\u00A5' + item.bizAmount.toFixed(2))
                  .fontSize(11).fontColor(BrandPalette.TEXT_PRIMARY)
              }.layoutWeight(1).alignItems(HorizontalAlign.Center)
              Column() {
                Text('\u8D44\u91D1\u6D41').fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
                Text('\u00A5' + item.flowAmount.toFixed(2))
                  .fontSize(11).fontColor(BrandPalette.GOLD)
              }.layoutWeight(1).alignItems(HorizontalAlign.Center)
              Column() {
                Text('\u7968\u636E\u6D41').fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
                Text('\u00A5' + item.invoiceAmount.toFixed(2))
                  .fontSize(11).fontColor(BrandBadge.GOLD_TEXT)
              }.layoutWeight(1).alignItems(HorizontalAlign.Center)
              Column() {
                Text('\u5408\u540C\u6D41').fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
                Text('\u00A5' + item.contractAmount.toFixed(2))
                  .fontSize(11).fontColor(BrandPalette.NEON_BLUE)
              }.layoutWeight(1).alignItems(HorizontalAlign.Center)
            }.width('100%').margin({ top: 6 })
          }
          .width('100%').padding(12).margin({ left: 16, right: 16, top: 4 })
          .borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
          .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }, (item: FourFlowCheckResult) => item.bizHash)
      }
    }.margin({ bottom: 24 })
  }

  @Builder
  AlertTab() {
    Column() {
      if (this.alerts.length === 0) {
        Column() {
          Text('\u6682\u65E0\u76D1\u7BA1\u9884\u8B66').fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').padding(32).justifyContent(FlexAlign.Center)
          .margin({ left: 16, right: 16, top: 8, bottom: 24 })
          .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
      } else {
        ForEach(this.alerts, (item: RegulatoryAlert) => {
          Column() {
            Row() {
              Text(this.getSeverityLabel(item.severity))
                .fontSize(11).fontColor(this.getSeverityText(item.severity))
                .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
                .backgroundColor(this.getSeverityBg(item.severity))
              Text(item.type)
                .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
              Blank()
              if (item.resolved) {
                Text('\u5DF2\u5904\u7406')
                  .fontSize(10).fontColor(BrandBadge.GREEN_TEXT)
                  .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                  .backgroundColor(BrandBadge.GREEN_BG)
              } else {
                Text('\u5F85\u5904\u7406')
                  .fontSize(10).fontColor(BrandBadge.RED_TEXT)
                  .padding({ left: 4, right: 4, top: 1, bottom: 1 }).borderRadius(3)
                  .backgroundColor(BrandBadge.RED_BG)
              }
            }.width('100%')
            Text(item.title)
              .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY).margin({ top: 6 }).width('100%')
            if (item.detail.length > 0) {
              Text(item.detail)
                .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 4 }).width('100%')
                .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            Row() {
              if (item.relatedFlowId.length > 0) {
                Text('FLOW ' + this.truncateId(item.relatedFlowId))
                  .fontSize(9).fontColor(BrandPalette.NEON_BLUE)
              }
              if (item.relatedHash.length > 0) {
                Text('HASH ' + this.truncateId(item.relatedHash))
                  .fontSize(9).fontColor(BrandPalette.NEON_BLUE).margin({ left: 8 })
              }
              Blank()
              Text(item.timestamp.length > 16 ? item.timestamp.substring(0, 16).replace('T', ' ') : item.timestamp)
                .fontSize(9).fontColor(BrandPalette.TEXT_MUTED)
            }.width('100%').margin({ top: 4 })
          }
          .width('100%').padding(12).margin({ left: 16, right: 16, top: 4 })
          .borderRadius(BrandRadius.MD).backgroundColor(BrandPalette.CARD_BG)
          .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }, (item: RegulatoryAlert) => item.id)
      }
    }.margin({ bottom: 24 })
  }
}
