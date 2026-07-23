import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ContractVerifyResult, ContractSettleResult, KolWeightAdjustResult } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct ContractVerifyPage {
  @State activeTab: number = 0;
  @State merchantId: string = '';
  @State kolUserId: string = '';
  @State settleAmount: string = '';
  @State adjustKolId: string = '';
  @State adjustSalesInc: string = '';
  @State adjustQualityDelta: string = '';
  @State verifyResult: ContractVerifyResult | null = null;
  @State settleResult: ContractSettleResult | null = null;
  @State adjustResult: KolWeightAdjustResult | null = null;
  @State verifying: boolean = false;
  @State settling: boolean = false;
  @State adjusting: boolean = false;

  private async doVerify() {
    if (this.merchantId.length === 0 || this.kolUserId.length === 0) {
      promptAction.showToast({ message: '请填写商家ID和KOL ID' });
      return;
    }
    this.verifying = true;
    const body: Record<string, Object> = {
      'merchantId': this.merchantId,
      'kolUserId': this.kolUserId,
    };
    const resp: ApiResponse<ContractVerifyResult> = await HttpClient.post<ContractVerifyResult>(
      '/api/contract-verify/verify', toPostBody(body),
      (data: Record<string, Object>): ContractVerifyResult => { return ContractVerifyResult.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.verifyResult = resp.data;
      promptAction.showToast({ message: resp.data.verified ? '合同有效' : '无有效合同' });
    }
    this.verifying = false;
  }

  private async doSettle() {
    if (this.merchantId.length === 0 || this.kolUserId.length === 0 || this.settleAmount.length === 0) {
      promptAction.showToast({ message: '请填写完整信息' });
      return;
    }
    this.settling = true;
    const body: Record<string, Object> = {
      'merchantId': this.merchantId,
      'kolUserId': this.kolUserId,
      'amount': Number(this.settleAmount),
    };
    const resp: ApiResponse<ContractSettleResult> = await HttpClient.post<ContractSettleResult>(
      '/api/contract-verify/settle-with-contract', toPostBody(body),
      (data: Record<string, Object>): ContractSettleResult => { return ContractSettleResult.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.settleResult = resp.data;
      promptAction.showToast({ message: '合同结算成功' });
    }
    this.settling = false;
  }

  private async doAdjust() {
    if (this.adjustKolId.length === 0) {
      promptAction.showToast({ message: '请填写KOL ID' });
      return;
    }
    this.adjusting = true;
    const body: Record<string, Object> = {
      'kolUserId': this.adjustKolId,
    };
    if (this.adjustSalesInc.length > 0) {
      body['salesIncrement'] = Number(this.adjustSalesInc);
    }
    if (this.adjustQualityDelta.length > 0) {
      body['qualityDelta'] = Number(this.adjustQualityDelta);
    }
    const resp: ApiResponse<KolWeightAdjustResult> = await HttpClient.post<KolWeightAdjustResult>(
      '/api/contract-verify/kol/adjust-weight', toPostBody(body),
      (data: Record<string, Object>): KolWeightAdjustResult => { return KolWeightAdjustResult.fromJson(data); });
    if (resp.success && resp.data !== null) {
      this.adjustResult = resp.data;
      promptAction.showToast({ message: '权重调整: ' + resp.data.direction });
    }
    this.adjusting = false;
  }

  private directionLabel(d: string): string {
    if (d === 'up') return '升权';
    if (d === 'down') return '降权';
    if (d === 'unchanged') return '不变';
    return d;
  }

  private directionColor(d: string): string {
    if (d === 'up') return BrandPalette.GOLD;
    if (d === 'down') return '#ef4444';
    return BrandPalette.TEXT_MUTED;
  }

  build() {
    Column() {
      Row() {
        Text('<')
          .fontSize(22).fontColor(BrandPalette.TEXT_PRIMARY)
          .onClick(() => router.back())
          .width(40).height(40).textAlign(TextAlign.Center)
        Text('雇佣合同验证')
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1).textAlign(TextAlign.Center)
        Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          .width(40).textAlign(TextAlign.Center)
      }.width('100%').height(56).padding({ left: 8, right: 8 })

      Row() {
        Text('验证')
          .fontSize(14).fontColor(this.activeTab === 0 ? BrandPalette.GOLD : BrandPalette.TEXT_MUTED)
          .fontWeight(this.activeTab === 0 ? FontWeight.Bold : FontWeight.Normal)
          .padding({ left: 16, right: 16, top: 8, bottom: 8 }).borderRadius(20)
          .backgroundColor(this.activeTab === 0 ? BrandPalette.PRIMARY : '#fff')
          .onClick(() => { this.activeTab = 0; })
        Text('合同结算')
          .fontSize(14).fontColor(this.activeTab === 1 ? BrandPalette.GOLD : BrandPalette.TEXT_MUTED)
          .fontWeight(this.activeTab === 1 ? FontWeight.Bold : FontWeight.Normal)
          .padding({ left: 16, right: 16, top: 8, bottom: 8 }).borderRadius(20)
          .backgroundColor(this.activeTab === 1 ? BrandPalette.PRIMARY : '#fff')
          .onClick(() => { this.activeTab = 1; })
        Text('升降权')
          .fontSize(14).fontColor(this.activeTab === 2 ? BrandPalette.GOLD : BrandPalette.TEXT_MUTED)
          .fontWeight(this.activeTab === 2 ? FontWeight.Bold : FontWeight.Normal)
          .padding({ left: 16, right: 16, top: 8, bottom: 8 }).borderRadius(20)
          .backgroundColor(this.activeTab === 2 ? BrandPalette.PRIMARY : '#fff')
          .onClick(() => { this.activeTab = 2; })
      }.width('100%').padding({ left: 16, right: 16, top: 8, bottom: 8 }).justifyContent(FlexAlign.Start).gap(8)

      if (this.activeTab === 0) {
        this.VerifyTab()
      } else if (this.activeTab === 1) {
        this.SettleTab()
      } else {
        this.AdjustTab()
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  VerifyTab() {
    Scroll() {
      Column() {
        Column() {
          Text('合同验证').fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            .width('100%').margin({ bottom: 12 })
          TextInput({ placeholder: '商家ID', text: this.merchantId })
            .fontSize(14).width('100%').margin({ bottom: 8 })
            .onChange((v: string) => { this.merchantId = v; })
          TextInput({ placeholder: 'KOL用户ID', text: this.kolUserId })
            .fontSize(14).width('100%').margin({ bottom: 12 })
            .onChange((v: string) => { this.kolUserId = v; })
          Button('验证合同')
            .width('100%').height(44).fontSize(16).fontWeight(FontWeight.Bold)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.GOLD).borderRadius(10)
            .onClick(() => this.doVerify())
            .enabled(!this.verifying)
        }.width('100%').padding(16).borderRadius(BrandRadius.CARD)
        .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

        if (this.verifyResult !== null) {
          Column() {
            Row() {
              Text('验证结果')
                .fontSize(14).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.verifyResult.verified ? '有效' : '无效')
                .fontSize(14).fontWeight(FontWeight.Bold)
                .fontColor(this.verifyResult.verified ? '#10b981' : '#ef4444')
                .padding({ left: 8, right: 8, top: 2, bottom: 2 }).borderRadius(4)
                .backgroundColor(this.verifyResult.verified ? '#dcfce7' : '#fef2f2')
            }.width('100%').margin({ bottom: 8 })
            if (this.verifyResult.contractId.length > 0) {
              Row() {
                Text('合同ID').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text(this.verifyResult.contractId).fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY)
              }.width('100%').margin({ bottom: 4 })
            }
            if (this.verifyResult.contractType.length > 0) {
              Row() {
                Text('合同类型').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text(this.verifyResult.contractType).fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY)
              }.width('100%').margin({ bottom: 4 })
            }
            if (this.verifyResult.commissionRate > 0) {
              Row() {
                Text('佣金比例').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text((this.verifyResult.commissionRate * 100).toFixed(1) + '%').fontSize(13).fontColor(BrandPalette.GOLD)
              }.width('100%').margin({ bottom: 4 })
            }
            if (this.verifyResult.reason.length > 0) {
              Text('原因: ' + this.verifyResult.reason)
                .fontSize(12).fontColor(BrandPalette.TEXT_MUTED).width('100%').margin({ top: 4 })
            }
          }.width('100%').padding(16).borderRadius(BrandRadius.CARD).margin({ top: 12 })
          .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }
      }.padding({ left: 16, right: 16, top: 8 })
    }.layoutWeight(1)
  }

  @Builder
  SettleTab() {
    Scroll() {
      Column() {
        Column() {
          Text('合同结算').fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            .width('100%').margin({ bottom: 12 })
          TextInput({ placeholder: '商家ID', text: this.merchantId })
            .fontSize(14).width('100%').margin({ bottom: 8 })
            .onChange((v: string) => { this.merchantId = v; })
          TextInput({ placeholder: 'KOL用户ID', text: this.kolUserId })
            .fontSize(14).width('100%').margin({ bottom: 8 })
            .onChange((v: string) => { this.kolUserId = v; })
          TextInput({ placeholder: '结算金额', text: this.settleAmount })
            .fontSize(14).width('100%').margin({ bottom: 12 }).type(InputType.Number)
            .onChange((v: string) => { this.settleAmount = v; })
          Button('合同结算')
            .width('100%').height(44).fontSize(16).fontWeight(FontWeight.Bold)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.GOLD).borderRadius(10)
            .onClick(() => this.doSettle())
            .enabled(!this.settling)
        }.width('100%').padding(16).borderRadius(BrandRadius.CARD)
        .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

        if (this.settleResult !== null) {
          Column() {
            Text('结算详情').fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_MUTED)
              .width('100%').margin({ bottom: 8 })
            Row() {
              Text('金额').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.settleResult.amount.toFixed(2)).fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            }.width('100%').margin({ bottom: 4 })
            Row() {
              Text('KOL份额').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.settleResult.breakdown.kolShare.toFixed(2)).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('商家份额').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.settleResult.breakdown.merchantShare.toFixed(2)).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('平台费').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.settleResult.breakdown.platformFee.toFixed(4)).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('税务预留').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('\u00A5' + this.settleResult.breakdown.taxReserve.toFixed(4)).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 4 })
            if (this.settleResult.weightUpdate !== null) {
              Row() {
                Text('权重更新').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text(this.directionLabel(this.settleResult.weightUpdate.direction))
                  .fontSize(12).fontWeight(FontWeight.Bold)
                  .fontColor(this.directionColor(this.settleResult.weightUpdate.direction))
              }.width('100%').margin({ bottom: 2 })
              Row() {
                Text('旧权重').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text(this.settleResult.weightUpdate.oldWeight.toFixed(2)).fontSize(11).fontColor(BrandPalette.TEXT_PRIMARY)
              }.width('100%').margin({ bottom: 2 })
              Row() {
                Text('新权重').fontSize(11).fontColor(BrandPalette.TEXT_MUTED)
                Blank()
                Text(this.settleResult.weightUpdate.newWeight.toFixed(2)).fontSize(11).fontColor(BrandPalette.GOLD)
              }.width('100%')
            }
          }.width('100%').padding(16).borderRadius(BrandRadius.CARD).margin({ top: 12 })
          .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }
      }.padding({ left: 16, right: 16, top: 8 })
    }.layoutWeight(1)
  }

  @Builder
  AdjustTab() {
    Scroll() {
      Column() {
        Column() {
          Text('KOL升降权').fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            .width('100%').margin({ bottom: 12 })
          TextInput({ placeholder: 'KOL用户ID', text: this.adjustKolId })
            .fontSize(14).width('100%').margin({ bottom: 8 })
            .onChange((v: string) => { this.adjustKolId = v; })
          TextInput({ placeholder: '销售增量(选填)', text: this.adjustSalesInc })
            .fontSize(14).width('100%').margin({ bottom: 8 }).type(InputType.Number)
            .onChange((v: string) => { this.adjustSalesInc = v; })
          TextInput({ placeholder: '品质变化(-0.1~0.1)', text: this.adjustQualityDelta })
            .fontSize(14).width('100%').margin({ bottom: 12 }).type(InputType.Number)
            .onChange((v: string) => { this.adjustQualityDelta = v; })
          Button('调整权重')
            .width('100%').height(44).fontSize(16).fontWeight(FontWeight.Bold)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.GOLD).borderRadius(10)
            .onClick(() => this.doAdjust())
            .enabled(!this.adjusting)
        }.width('100%').padding(16).borderRadius(BrandRadius.CARD)
        .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

        if (this.adjustResult !== null) {
          Column() {
            Row() {
              Text('调整方向').fontSize(13).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.directionLabel(this.adjustResult.direction))
                .fontSize(14).fontWeight(FontWeight.Bold)
                .fontColor(this.directionColor(this.adjustResult.direction))
            }.width('100%').margin({ bottom: 4 })
            Row() {
              Text('旧权重').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.adjustResult.oldWeight.toFixed(2)).fontSize(12).fontColor(BrandPalette.TEXT_PRIMARY)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('新权重').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text(this.adjustResult.newWeight.toFixed(2)).fontSize(12).fontColor(BrandPalette.GOLD)
            }.width('100%').margin({ bottom: 2 })
            Row() {
              Text('等级').fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
              Blank()
              Text('Lv' + this.adjustResult.level).fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            }.width('100%')
          }.width('100%').padding(16).borderRadius(BrandRadius.CARD).margin({ top: 12 })
          .backgroundColor(BrandPalette.CARD_BG).border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }

        Column() {
          Text('升降权规则').fontSize(14).fontWeight(FontWeight.Bold).fontColor('#92400e')
            .width('100%').margin({ bottom: 8 })
          Text('品质变化范围: -0.1 ~ +0.1').fontSize(12).fontColor('#a16207').width('100%').margin({ bottom: 2 })
          Text('权重范围: 0.1 ~ 10.0').fontSize(12).fontColor('#a16207').width('100%').margin({ bottom: 2 })
          Text('等级范围: Lv1 ~ Lv11').fontSize(12).fontColor('#a16207').width('100%').margin({ bottom: 2 })
          Text('数据品质挂钩: 品质↑权重↑ 品质↓权重↓').fontSize(12).fontColor('#a16207').width('100%')
        }.width('100%').padding(16).borderRadius(BrandRadius.CARD).margin({ top: 12 })
        .backgroundColor('#fefce8').border({ width: 1, color: '#fde68a', style: BorderStyle.Solid })
      }.padding({ left: 16, right: 16, top: 8 })
    }.layoutWeight(1)
  }
}
