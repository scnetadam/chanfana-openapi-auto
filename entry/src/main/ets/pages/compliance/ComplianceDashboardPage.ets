import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ComplianceDashboardData, ComplianceCheckItem, KolTrackDistribution } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct ComplianceDashboardPage {
  @State dashboard: ComplianceDashboardData | null = null;
  @State distribution: KolTrackDistribution | null = null;
  @State loading: boolean = true;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadDashboard();
    await this.loadDistribution();
    this.loading = false;
  }

  private async loadDashboard() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<ComplianceDashboardData> = await HttpClient.get<ComplianceDashboardData>(
      '/api/compliance/dashboard?userId=' + uid,
      (data: Record<string, Object>): ComplianceDashboardData => { return ComplianceDashboardData.fromJson(data); });
    if (resp.success && resp.data !== null) { this.dashboard = resp.data; }
  }

  private async loadDistribution() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<KolTrackDistribution> = await HttpClient.get<KolTrackDistribution>(
      '/api/compliance/kol-distribution?userId=' + uid,
      (data: Record<string, Object>): KolTrackDistribution => { return KolTrackDistribution.fromJson(data); });
    if (resp.success && resp.data !== null) { this.distribution = resp.data; }
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

  private getBarWidth(value: number, total: number): string {
    if (total === 0) return '0%';
    const pct: number = Math.floor((value / total) * 100);
    return pct.toString() + '%';
  }

  build() {
    Column() {
      Row() {
        Text('\u5408\u89C4\u770B\u677F')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('COMPLY')
            .fontSize(10).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2).margin({ left: 4 })
        }
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            if (this.dashboard !== null) {
              Row() {
                Column() {
                  Text(this.dashboard.totalChecks.toString())
                    .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
                  Text('\u603B\u68C0\u67E5').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).alignItems(HorizontalAlign.Center)
                Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
                Column() {
                  Text(this.dashboard.matchRate.toFixed(1) + '%')
                    .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
                  Text('\u5339\u914D\u7387').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).alignItems(HorizontalAlign.Center)
                Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
                Column() {
                  Text(this.dashboard.matched.toString())
                    .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandBadge.GREEN_TEXT)
                  Text('\u5DF2\u5339\u914D').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).alignItems(HorizontalAlign.Center)
                Column().width(1).height(28).backgroundColor(BrandPalette.DIVIDER)
                Column() {
                  Text(this.dashboard.mismatched.toString())
                    .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandBadge.RED_TEXT)
                  Text('\u4E0D\u5339\u914D').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                }.layoutWeight(1).alignItems(HorizontalAlign.Center)
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }

            if (this.distribution !== null) {
              Column() {
                Text('KOL\u8F68\u9053\u5206\u5E03')
                  .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                  .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

                Column() {
                  Row() {
                    Text('A\u8F68').fontSize(12).fontColor(BrandBadge.GOLD_TEXT).width(28)
                    Row()
                      .width(this.getBarWidth(this.distribution.A, this.distribution.A + this.distribution.B + this.distribution.C))
                      .height(12).borderRadius(6).backgroundColor(BrandBadge.GOLD_TEXT)
                    Text(this.distribution.A.toString()).fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
                  }.width('100%').margin({ top: 8 })
                  Row() {
                    Text('B\u8F68').fontSize(12).fontColor(BrandBadge.GREEN_TEXT).width(28)
                    Row()
                      .width(this.getBarWidth(this.distribution.B, this.distribution.A + this.distribution.B + this.distribution.C))
                      .height(12).borderRadius(6).backgroundColor(BrandBadge.GREEN_TEXT)
                    Text(this.distribution.B.toString()).fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
                  }.width('100%').margin({ top: 8 })
                  Row() {
                    Text('C\u8F68').fontSize(12).fontColor(BrandBadge.BLUE_TEXT).width(28)
                    Row()
                      .width(this.getBarWidth(this.distribution.C, this.distribution.A + this.distribution.B + this.distribution.C))
                      .height(12).borderRadius(6).backgroundColor(BrandBadge.BLUE_TEXT)
                    Text(this.distribution.C.toString()).fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
                  }.width('100%').margin({ top: 8 })
                }.width('100%')
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 12 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }

            if (this.dashboard !== null && this.dashboard.recentMismatches.length > 0) {
              Column() {
                Text('\u6700\u8FD1\u4E0D\u5339\u914D')
                  .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                  .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

                ForEach(this.dashboard.recentMismatches, (item: ComplianceCheckItem) => {
                  Row() {
                    Column() {
                      Text(this.truncateHash(item.bizHash))
                        .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
                      Text(item.mismatchDetail)
                        .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 }).width('100%')
                        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
                    }.layoutWeight(1)
                    Text(this.getMatchStatusLabel(item.matchStatus))
                      .fontSize(11).fontColor(this.getMatchStatusText(item.matchStatus))
                      .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
                      .backgroundColor(this.getMatchStatusBg(item.matchStatus))
                  }.width('100%').padding({ top: 8, bottom: 8 })
                  .border({ width: 0, style: BorderStyle.Solid, color: BrandPalette.DIVIDER })
                }, (item: ComplianceCheckItem) => item.checkId)
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 12 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }
          }
        }.width('100%').layoutWeight(1)
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }
}
