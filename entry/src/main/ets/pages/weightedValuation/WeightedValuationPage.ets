import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { WeightedValuationResult, ValuationResult, TestPaymentResult, DimensionItem } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct WeightedValuationPage {
  @State activeTab: number = 0;
  @State evidenceId: string = '';
  @State viewCount: string = '100';
  @State dwellTime: string = '120';
  @State purchaseCount: string = '0';
  @State shareCount: string = '5';
  @State commentCount: string = '10';
  @State bookmarkCount: string = '3';
  @State reportCount: string = '0';
  @State baseValue: string = '0.01';
  @State valuateResult: WeightedValuationResult | null = null;
  @State testPayResult: TestPaymentResult | null = null;
  @State statsData: Record<string, Object> | null = null;
  @State valuating: boolean = false;
  @State testPaying: boolean = false;

  aboutToAppear() {
    this.loadStats();
  }

  private async loadStats() {
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/weighted-valuation/stats',
      (data: Record<string, Object>): Record<string, Object> => { return data; });
    if (resp.success && resp.data !== null) {
      this.statsData = resp.data;
    }
  }

  private async doValuate() {
    if (this.evidenceId.length === 0) {
      promptAction.showToast({ message: '请输入存证ID' });
      return;
    }
    this.valuating = true;
    const body: Record<string, Object> = {
      'evidenceId': this.evidenceId,
      'metrics': {
        'viewCount': Number(this.viewCount),
        'dwellTime': Number(this.dwellTime),
        'purchaseCount': Number(this.purchaseCount),
        'shareCount': Number(this.shareCount),
        'commentCount': Number(this.commentCount),
        'bookmarkCount': Number(this.bookmarkCount),
        'reportCount': Number(this.reportCount),
        'baseValue': Number(this.baseValue),
      } as Record<string, Object>,
    };
    const resp: ApiResponse<WeightedValuationResult> = await HttpClient.post<WeightedValuationResult>(
      '/api/weighted-valuation/valuate', toPostBody(body),
      (data: Record<string, Object>): WeightedValuationResult => { return WeightedValuationResult.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.valuateResult = resp.data;
      promptAction.showToast({ message: '估值完成' });
    }
    this.valuating = false;
  }

  private async doTestPayment() {
    if (this.evidenceId.length === 0) {
      promptAction.showToast({ message: '请输入存证ID' });
      return;
    }
    this.testPaying = true;
    const body: Record<string, Object> = {
      'evidenceId': this.evidenceId,
    };
    if (this.valuateResult !== null) {
      body['valuationAmount'] = this.valuateResult.valuation.estimatedValue;
    }
    const resp: ApiResponse<TestPaymentResult> = await HttpClient.post<TestPaymentResult>(
      '/api/weighted-valuation/test-payment', toPostBody(body),
      (data: Record<string, Object>): TestPaymentResult => { return TestPaymentResult.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.testPayResult = resp.data;
      promptAction.showToast({ message: '测试支付成功' });
    }
    this.testPaying = false;
  }

  private gradeColor(grade: string): string {
    if (grade === 'A') return '#10b981';
    if (grade === 'B') return '#2563eb';
    if (grade === 'C') return '#f59e0b';
    if (grade === 'D') return '#ef4444';
    return '#9ca3af';
  }

  private fmtNum(n: number, d: number = 2): string {
    return n.toFixed(d);
  }

  build() {
    Column() {
      Row() {
        Text('<')
          .fontSize(22).fontColor(BrandPalette.TEXT_PRIMARY)
          .onClick(() => router.back())
          .width(40).height(40).textAlign(TextAlign.Center)
        Text('存证加权估值')
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1).textAlign(TextAlign.Center)
        Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          .width(40).textAlign(TextAlign.Center)
      }.width('100%').height(56).padding({ left: 8, right: 8 })

      Row() {
        Text('估值')
          .fontSize(14).fontColor(this.activeTab === 0 ? BrandPalette.GOLD : BrandPalette.TEXT_MUTED)
          .fontWeight(this.activeTab === 0 ? FontWeight.Bold : FontWeight.Normal)
          .padding({ left: 16, right: 16, top: 8, bottom: 8 }).borderRadius(20)
          .backgroundColor(this.activeTab === 0 ? BrandPalette.PRIMARY : '#fff')
          .onClick(() => { this.activeTab = 0; })
        Text('测试支付')
          .fontSize(14).fontColor(this.activeTab === 1 ? BrandPalette.GOLD : BrandPalette.TEXT_MUTED)
          .fontWeight(this.activeTab === 1 ? FontWeight.Bold : FontWeight.Normal)
          .padding({ left: 16, right: 16, top: 8, bottom: 8 }).borderRadius(20)
          .backgroundColor(this.activeTab === 1 ? BrandPalette.PRIMARY : '#fff')
          .onClick(() => { this.activeTab = 1; })
        Text('统计')
          .fontSize(14).fontColor(this.activeTab === 2 ? BrandPalette.GOLD : BrandPalette.TEXT_MUTED)
          .fontWeight(this.activeTab === 2 ? FontWeight.Bold : FontWeight.Normal)
          .padding({ left: 16, right: 16, top: 8, bottom: 8 }).borderRadius(20)
          .backgroundColor(this.activeTab === 2 ? BrandPalette.PRIMARY : '#fff')
          .onClick(() => { this.activeTab = 2; })
      }.width('100%').padding({ left: 16, right: 16, top: 8, bottom: 8 }).justifyContent(FlexAlign.Start).gap(8)

      if (this.activeTab === 0) {
        this.ValuateTab()
      } else if (this.activeTab === 1) {
        this.TestPayTab()
      } else {
        this.StatsTab()
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  ValuateTab() {
    Scroll() {
      Column() {
        Column() {
          Text('存证估值').fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            .width('100%').margin({ bottom: 12 })
          TextInput({ placeholder: '存证ID', text: this.evidenceId })
            .fontSize(14).width('100%').margin({ bottom: 8 })
            .onChange((v: string) => { this.evidenceId = v; })

          Text('估值指标').fontSize(13).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
            .width('100%').margin({ bottom: 6 })
          Row() {
            Column() {
              Text('浏览量').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.viewCount }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.viewCount = v; })
            }.layoutWeight(1).margin({ right: 4 })
            Column() {
              Text('停留时长(s)').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.dwellTime }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.dwellTime = v; })
            }.layoutWeight(1).margin({ left: 4 })
          }.width('100%').margin({ bottom: 6 })
          Row() {
            Column() {
              Text('购买次数').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.purchaseCount }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.purchaseCount = v; })
            }.layoutWeight(1).margin({ right: 4 })
            Column() {
              Text('分享次数').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.shareCount }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.shareCount = v; })
            }.layoutWeight(1).margin({ left: 4 })
          }.width('100%').margin({ bottom: 6 })
          Row() {
            Column() {
              Text('评论数').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.commentCount }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.commentCount = v; })
            }.layoutWeight(1).margin({ right: 4 })
            Column() {
              Text('收藏数').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.bookmarkCount }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.bookmarkCount = v; })
            }.layoutWeight(1).margin({ left: 4 })
          }.width('100%').margin({ bottom: 6 })
          Row() {
            Column() {
              Text('举报数(负)').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.reportCount }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.reportCount = v; })
            }.layoutWeight(1).margin({ right: 4 })
            Column() {
              Text('基础价值').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
              TextInput({ text: this.baseValue }).fontSize(12).width('100%').type(InputType.Number)
                .onChange((v: string) => { this.baseValue = v; })
            }.layoutWeight(1).margin({ left: 4 })
          }.width('100%').margin({ bottom: 12 })

          Button('估值')
            .width('100%').height(44).fontSize(16).fontWeight(FontWeight.Bold)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.GOLD).borderRadius(10)
            .onClick(() => this.doValuate())
            .enabled(!this.valuating)
        }.width('100%').padding(16).borderRadius(BrandRadius.CARD)
        .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

        if (this.valuateResult !== null) {
          Column() {
            Text('估值结果').fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
              .width('100%').margin({ bottom: 8 })
            Row() {
              Text('品质评级').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.valuateResult.valuation.qualityGrade)
                .fontSize(16).fontWeight(FontWeight.Bold).fontColor('#fff')
                .padding({ left: 12, right: 12, top: 2, bottom: 2 }).borderRadius(6)
                .backgroundColor(this.gradeColor(this.valuateResult.valuation.qualityGrade))
            }.width('100%').margin({ bottom: 4 })
            Row() {
              Text('总权重').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.fmtNum(this.valuateResult.valuation.totalWeight, 3))
                .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 4 })
            Row() {
              Text('估值金额').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.fmtNum(this.valuateResult.valuation.estimatedValue, 4))
                .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            }.width('100%')

            if (this.valuateResult !== null && this.valuateResult.valuation.dimensions.length > 0) {
              Text('\u7EF4\u5EA6\u6743\u91CD').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
                .width('100%').margin({ top: 12, bottom: 6 })
              ForEach(this.valuateResult.valuation.dimensions, (dim: DimensionItem) => {
                Row() {
                  Text(dim.key).fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
                  Blank()
                  Text(dim.value.toFixed(3))
                    .fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
                }.width('100%').margin({ bottom: 2 })
              }, (dim: DimensionItem) => dim.key)
            }
          }.width('100%').padding(16).borderRadius(BrandRadius.CARD).margin({ top: 12 })
          .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }
      }.padding({ left: 16, right: 16, top: 8 })
    }.layoutWeight(1)
  }

  @Builder
  TestPayTab() {
    Scroll() {
      Column() {
        Column() {
          Text('测试支付').fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            .width('100%').margin({ bottom: 12 })
          TextInput({ placeholder: '存证ID', text: this.evidenceId })
            .fontSize(14).width('100%').margin({ bottom: 12 })
            .onChange((v: string) => { this.evidenceId = v; })
          Button('测试支付')
            .width('100%').height(44).fontSize(16).fontWeight(FontWeight.Bold)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.GOLD).borderRadius(10)
            .onClick(() => this.doTestPayment())
            .enabled(!this.testPaying)
        }.width('100%').padding(16).borderRadius(BrandRadius.CARD)
        .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

        if (this.testPayResult !== null) {
          Column() {
            Row() {
              Text('支付金额').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.testPayResult.amount.toFixed(4)).fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            }.width('100%').margin({ bottom: 4 })
            Row() {
              Text('支付通道').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.testPayResult.channel).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('类型').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.testPayResult.type).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('状态').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.testPayResult.status).fontSize(12).fontColor(BrandPalette.NEON_BLUE)
            }.width('100%')
          }.width('100%').padding(16).borderRadius(BrandRadius.CARD).margin({ top: 12 })
          .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }
      }.padding({ left: 16, right: 16, top: 8 })
    }.layoutWeight(1)
  }

  @Builder
  StatsTab() {
    Scroll() {
      Column() {
        if (this.statsData !== null) {
          Column() {
            Text('估值统计').fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
              .width('100%').margin({ bottom: 8 })
            Row() {
              Text('总估值次数').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(String(this.statsData['total'])).fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 4 })
            Row() {
              Text('平均估值').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + Number(this.statsData['avgEstimatedValue']).toFixed(4))
                .fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            }.width('100%')
          }.width('100%').padding(16).borderRadius(BrandRadius.CARD)
          .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        } else {
          Column() {
            Text('暂无统计').fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
          }.width('100%').padding(32).justifyContent(FlexAlign.Center)
          .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        }
      }.padding({ left: 16, right: 16, top: 8 })
    }.layoutWeight(1)
  }
}
