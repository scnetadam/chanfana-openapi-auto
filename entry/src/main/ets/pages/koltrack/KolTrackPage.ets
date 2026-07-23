import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { KolTrackData, KolTrackDistribution } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct KolTrackPage {
  @State trackData: KolTrackData | null = null;
  @State distribution: KolTrackDistribution | null = null;
  @State loading: boolean = true;
  @State selectedTrack: string = 'B';
  @State reasonInput: string = '';
  @State trackOptions: string[] = ['A', 'B', 'C'];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadTrackData();
    await this.loadDistribution();
    this.loading = false;
  }

  private async loadTrackData() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<KolTrackData> = await HttpClient.get<KolTrackData>(
      '/api/kol-track/my?userId=' + uid,
      (data: Record<string, Object>): KolTrackData => { return KolTrackData.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.trackData = resp.data;
      this.selectedTrack = resp.data.track;
    }
  }

  private async loadDistribution() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<KolTrackDistribution> = await HttpClient.get<KolTrackDistribution>(
      '/api/kol-track/distribution?userId=' + uid,
      (data: Record<string, Object>): KolTrackDistribution => { return KolTrackDistribution.fromJson(data); });
    if (resp.success && resp.data !== null) { this.distribution = resp.data; }
  }

  private async reclassifyTrack() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    if (this.reasonInput.length === 0) {
      promptAction.showToast({ message: '\u8BF7\u586B\u5199\u8F6C\u8F68\u539F\u56E0' });
      return;
    }
    const body: Record<string, Object> = toPostBody({
      'userId': uid,
      'track': this.selectedTrack,
      'reason': this.reasonInput
    });
    const resp: ApiResponse<KolTrackData> = await HttpClient.post<KolTrackData>(
      '/api/kol-track/reclassify', body,
      (data: Record<string, Object>): KolTrackData => { return KolTrackData.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.trackData = resp.data;
      promptAction.showToast({ message: '\u8F6C\u8F68\u7533\u8BF7\u5DF2\u63D0\u4EA4' });
      this.reasonInput = '';
    } else {
      promptAction.showToast({ message: resp.error || '\u8F6C\u8F68\u7533\u8BF7\u5931\u8D25' });
    }
  }

  private getTrackColor(track: string): string {
    if (track === 'A') return BrandBadge.GOLD_TEXT;
    if (track === 'B') return BrandBadge.GREEN_TEXT;
    if (track === 'C') return BrandBadge.BLUE_TEXT;
    return BrandPalette.TEXT_PRIMARY;
  }

  private getTrackBg(track: string): string {
    if (track === 'A') return BrandBadge.GOLD_BG;
    if (track === 'B') return BrandBadge.GREEN_BG;
    if (track === 'C') return BrandBadge.BLUE_BG;
    return BrandPalette.CARD_BG;
  }

  private getTrackLabel(track: string): string {
    if (track === 'A') return 'A\u8F68 \u00B7 \u4E00\u822C\u7EB3\u7A0E\u4EBA';
    if (track === 'B') return 'B\u8F68 \u00B7 \u5C0F\u89C4\u6A21\u7EB3\u7A0E\u4EBA';
    if (track === 'C') return 'C\u8F68 \u00B7 \u514D\u7A0E';
    return track;
  }

  private getBarWidth(value: number, total: number): string {
    if (total === 0) return '0%';
    const pct: number = Math.floor((value / total) * 100);
    return pct.toString() + '%';
  }

  build() {
    Column() {
      Row() {
        Text('KOL\u8F68\u9053\u7BA1\u7406')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('TRACK')
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
            Row() {
              ForEach(this.trackOptions, (track: string) => {
                Column() {
                  Text(track + '\u8F68')
                    .fontSize(16).fontWeight(FontWeight.Bold)
                    .fontColor(this.trackData !== null && this.trackData.track === track ?
                      this.getTrackColor(track) : BrandPalette.TEXT_MUTED)
                  Text(this.getTrackLabel(track).split(' \u00B7 ')[1] || '')
                    .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
                  if (this.trackData !== null && this.trackData.track === track) {
                    Column().width(8).height(8).borderRadius(4)
                      .backgroundColor(this.getTrackColor(track)).margin({ top: 4 })
                  }
                }
                .layoutWeight(1).padding(12).borderRadius(BrandRadius.MD)
                .backgroundColor(this.trackData !== null && this.trackData.track === track ?
                  this.getTrackBg(track) : BrandPalette.CARD_BG)
                .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
              }, (track: string) => track)
            }.width('100%').margin({ left: 16, right: 16, top: 8 })

            if (this.trackData !== null) {
              Column() {
                Text('\u5F53\u524D\u8F68\u9053\u72B6\u6001')
                  .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                  .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
                Row() {
                  Text('\u7A0E\u79CD').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(60)
                  Text(this.trackData.taxType.length > 0 ? this.trackData.taxType : '-')
                    .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).layoutWeight(1)
                }.width('100%').margin({ top: 8 })
                Row() {
                  Text('\u4EE3\u6263\u7387').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(60)
                  Text(this.trackData.withholdingRate.toFixed(2) + '%')
                    .fontSize(13).fontColor(BrandPalette.GOLD).layoutWeight(1)
                }.width('100%').margin({ top: 6 })
                Row() {
                  Text('\u81EA\u5F00\u7968').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(60)
                  Text(this.trackData.selfInvoicing ? '\u662F' : '\u5426')
                    .fontSize(13).fontColor(this.trackData.selfInvoicing ? BrandBadge.GREEN_TEXT : BrandBadge.RED_TEXT)
                    .layoutWeight(1)
                }.width('100%').margin({ top: 6 })
                Row() {
                  Text('\u81EA\u52A8\u5206\u7C7B').fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width(60)
                  Text(this.trackData.autoClassified ? '\u662F' : '\u5426')
                    .fontSize(13).fontColor(BrandPalette.NEON_BLUE).layoutWeight(1)
                }.width('100%').margin({ top: 6 })
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 12 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }

            if (this.distribution !== null) {
              Column() {
                Text('\u8F68\u9053\u5206\u5E03')
                  .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                  .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
                Column() {
                  Row() {
                    Text('A\u8F68').fontSize(12).fontColor(BrandBadge.GOLD_TEXT).width(28)
                    Row()
                      .width(this.getBarWidth(this.distribution.A,
                        this.distribution.A + this.distribution.B + this.distribution.C))
                      .height(12).borderRadius(6).backgroundColor(BrandBadge.GOLD_TEXT)
                    Text(this.distribution.A.toString())
                      .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
                  }.width('100%').margin({ top: 8 })
                  Row() {
                    Text('B\u8F68').fontSize(12).fontColor(BrandBadge.GREEN_TEXT).width(28)
                    Row()
                      .width(this.getBarWidth(this.distribution.B,
                        this.distribution.A + this.distribution.B + this.distribution.C))
                      .height(12).borderRadius(6).backgroundColor(BrandBadge.GREEN_TEXT)
                    Text(this.distribution.B.toString())
                      .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
                  }.width('100%').margin({ top: 8 })
                  Row() {
                    Text('C\u8F68').fontSize(12).fontColor(BrandBadge.BLUE_TEXT).width(28)
                    Row()
                      .width(this.getBarWidth(this.distribution.C,
                        this.distribution.A + this.distribution.B + this.distribution.C))
                      .height(12).borderRadius(6).backgroundColor(BrandBadge.BLUE_TEXT)
                    Text(this.distribution.C.toString())
                      .fontSize(11).fontColor(BrandPalette.TEXT_MUTED).margin({ left: 6 })
                  }.width('100%').margin({ top: 8 })
                }.width('100%')
              }
              .width('100%').padding(16).margin({ left: 16, right: 16, top: 12 })
              .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
              .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
            }

            Column() {
              Text('\u8F6C\u8F68\u7533\u8BF7')
                .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

              Row() {
                ForEach(this.trackOptions, (track: string) => {
                  Column() {
                    Text(track)
                      .fontSize(14).fontWeight(FontWeight.Bold)
                      .fontColor(this.selectedTrack === track ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
                  }
                  .layoutWeight(1).height(36).borderRadius(BrandRadius.SM)
                  .backgroundColor(this.selectedTrack === track ? '#00E5A022' : BrandPalette.SURFACE)
                  .border({ width: this.selectedTrack === track ? 1 : 0,
                    color: BrandPalette.PRIMARY, style: BorderStyle.Solid })
                  .justifyContent(FlexAlign.Center)
                  .onClick(() => { this.selectedTrack = track; })
                }, (track: string) => track)
              }.width('100%').margin({ top: 8 })

              TextInput({ text: this.reasonInput, placeholder: '\u8BF7\u586B\u5199\u8F6C\u8F68\u539F\u56E0' })
                .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE).borderRadius(BrandRadius.SM)
                .width('100%').height(40).margin({ top: 8 })
                .onChange((val: string) => { this.reasonInput = val; })

              Button('\u63D0\u4EA4\u8F6C\u8F68')
                .width('100%').height(40).margin({ top: 12 })
                .fontSize(14).fontWeight(FontWeight.Bold)
                .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG)
                .borderRadius(BrandRadius.PILL)
                .onClick(() => this.reclassifyTrack())
            }
            .width('100%').padding(16).margin({ left: 16, right: 16, top: 12, bottom: 24 })
            .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
            .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
          }
        }.width('100%').layoutWeight(1)
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }
}
