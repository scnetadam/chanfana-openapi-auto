import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ContractParamItem } from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge, BrandIcon } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct ContractParamsPage {
  @State params: ContractParamItem[] = [];
  @State loading: boolean = true;
  @State editKey: string = '';
  @State editValue: string = '';
  @State showEditDialog: boolean = false;
  @State simUserId: string = '';
  @State simAmount: string = '';
  @State simResult: string = '';
  @StorageProp('userId') userId: string = '';

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await this.loadParams();
    this.loading = false;
  }

  private async loadParams() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<ContractParamItem[]> = await HttpClient.get<ContractParamItem[]>(
      '/api/contract-params/list?userId=' + uid,
      (data: Record<string, Object>): ContractParamItem[] => {
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
        } else {
          const keys: string[] = Object.keys(data);
          for (let i = 0; i < keys.length; i++) {
            const val: Object | undefined = data[keys[i]];
            if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
              arr.push(val as Record<string, Object>);
            }
          }
        }
        const result: ContractParamItem[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(ContractParamItem.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) { this.params = resp.data; }
  }

  private async updateParam() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const numVal: number = parseFloat(this.editValue);
    if (isNaN(numVal)) {
      promptAction.showToast({ message: '\u8BF7\u8F93\u5165\u6709\u6548\u6570\u503C' });
      return;
    }
    const body: Record<string, Object> = toPostBody({
      'userId': uid,
      'paramKey': this.editKey,
      'paramValue': numVal
    });
    const resp: ApiResponse<ContractParamItem> = await HttpClient.post<ContractParamItem>(
      '/api/contract-params/update', body,
      (data: Record<string, Object>): ContractParamItem => { return ContractParamItem.fromJson(data); });
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '\u53C2\u6570\u66F4\u65B0\u6210\u529F' });
      this.showEditDialog = false;
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '\u53C2\u6570\u66F4\u65B0\u5931\u8D25' });
    }
  }

  private async simulateThreshold() {
    if (this.simUserId.length === 0 || this.simAmount.length === 0) {
      promptAction.showToast({ message: '\u8BF7\u586B\u5199\u6A21\u62DF\u53C2\u6570' });
      return;
    }
    const amountVal: number = parseFloat(this.simAmount);
    if (isNaN(amountVal)) {
      promptAction.showToast({ message: '\u8BF7\u8F93\u5165\u6709\u6548\u91D1\u989D' });
      return;
    }
    const body: Record<string, Object> = toPostBody({
      'userId': this.simUserId,
      'amount': amountVal
    });
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.post<Record<string, Object>>(
      '/api/contract-params/simulate', body,
      (data: Record<string, Object>): Record<string, Object> => { return data; });
    if (resp.success && resp.data !== null) {
      const resultData: Record<string, Object> = resp.data;
      const passed: Object | undefined = resultData['passed'];
      const threshold: Object | undefined = resultData['threshold'];
      this.simResult = (passed === true ? '\u901A\u8FC7' : '\u672A\u901A\u8FC7') +
        ' | \u9608\u503C: ' + (threshold !== null && threshold !== undefined ? String(threshold) : '-');
    } else {
      this.simResult = '\u6A21\u62DF\u5931\u8D25';
    }
  }

  private openEdit(item: ContractParamItem) {
    this.editKey = item.paramKey;
    this.editValue = item.paramValue.toString();
    this.showEditDialog = true;
  }

  private getScopeBg(scope: string): string {
    if (scope === 'global') return BrandBadge.GOLD_BG;
    if (scope === 'user') return BrandBadge.GREEN_BG;
    return BrandBadge.BLUE_BG;
  }

  private getScopeText(scope: string): string {
    if (scope === 'global') return BrandBadge.GOLD_TEXT;
    if (scope === 'user') return BrandBadge.GREEN_TEXT;
    return BrandBadge.BLUE_TEXT;
  }

  build() {
    Column() {
      Row() {
        Text('\u5408\u540C\u9608\u503C\u914D\u7F6E')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Row() {
          Text(BrandIcon.SEAL_GLYPH).fontSize(14).fontColor(BrandPalette.SEAL_RED).opacity(0.6)
          Text('PARAM')
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
            Column() {
              Text('\u53C2\u6570\u5217\u8868')
                .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

              ForEach(this.params, (item: ContractParamItem) => {
                Row() {
                  Column() {
                    Text(item.description.length > 0 ? item.description : item.paramKey)
                      .fontSize(13).fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
                      .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
                    Text(item.paramKey)
                      .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 }).width('100%')
                  }.layoutWeight(1)
                  Text(item.paramValue.toFixed(2))
                    .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
                    .margin({ left: 8, right: 8 })
                  Text(item.scope)
                    .fontSize(10).fontColor(this.getScopeText(item.scope))
                    .padding({ left: 4, right: 4, top: 2, bottom: 2 }).borderRadius(4)
                    .backgroundColor(this.getScopeBg(item.scope))
                  Button('\u7F16\u8F91')
                    .height(24).fontSize(11).margin({ left: 6 })
                    .backgroundColor(BrandPalette.SURFACE).fontColor(BrandPalette.PRIMARY)
                    .borderRadius(12).border({ width: 0.5, color: BrandPalette.PRIMARY, style: BorderStyle.Solid })
                    .onClick(() => this.openEdit(item))
                }.width('100%').padding({ top: 10, bottom: 10 })
                .border({ width: 0, style: BorderStyle.Solid, color: BrandPalette.DIVIDER })
              }, (item: ContractParamItem) => item.paramKey)
            }
            .width('100%').padding(16).margin({ left: 16, right: 16, top: 8 })
            .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
            .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })

            Column() {
              Text('\u9608\u503C\u6A21\u62DF\u5668')
                .fontSize(BrandTypography.SECTION_TITLE).fontWeight(FontWeight.Bold)
                .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')

              TextInput({ text: this.simUserId, placeholder: '\u7528\u6237ID' })
                .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE).borderRadius(BrandRadius.SM)
                .width('100%').height(40).margin({ top: 8 })
                .onChange((val: string) => { this.simUserId = val; })

              TextInput({ text: this.simAmount, placeholder: '\u91D1\u989D' })
                .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
                .placeholderColor(BrandPalette.TEXT_MUTED)
                .backgroundColor(BrandPalette.SURFACE).borderRadius(BrandRadius.SM)
                .width('100%').height(40).margin({ top: 8 })
                .type(InputType.Number)
                .onChange((val: string) => { this.simAmount = val; })

              Button('\u6A21\u62DF\u68C0\u6D4B')
                .width('100%').height(40).margin({ top: 12 })
                .fontSize(14).fontWeight(FontWeight.Bold)
                .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG)
                .borderRadius(BrandRadius.PILL)
                .onClick(() => this.simulateThreshold())

              if (this.simResult.length > 0) {
                Text(this.simResult)
                  .fontSize(13).fontColor(BrandPalette.NEON_BLUE).margin({ top: 8 }).width('100%')
              }
            }
            .width('100%').padding(16).margin({ left: 16, right: 16, top: 12, bottom: 24 })
            .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
            .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
          }
        }.width('100%').layoutWeight(1)
      }

      if (this.showEditDialog) {
        Column() {
          Column() {
            Text('\u7F16\u8F91\u53C2\u6570')
              .fontSize(BrandTypography.CARD_TITLE).fontWeight(FontWeight.Bold)
              .fontColor(BrandPalette.TEXT_PRIMARY).width('100%')
            Text(this.editKey)
              .fontSize(12).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 4 }).width('100%')
            TextInput({ text: this.editValue, placeholder: '\u53C2\u6570\u503C' })
              .fontSize(14).fontColor(BrandPalette.TEXT_PRIMARY)
              .placeholderColor(BrandPalette.TEXT_MUTED)
              .backgroundColor(BrandPalette.SURFACE).borderRadius(BrandRadius.SM)
              .width('100%').height(40).margin({ top: 12 })
              .type(InputType.Number)
              .onChange((val: string) => { this.editValue = val; })
            Row() {
              Button('\u53D6\u6D88')
                .layoutWeight(1).height(36).fontSize(13)
                .backgroundColor(BrandPalette.SURFACE).fontColor(BrandPalette.TEXT_MUTED)
                .borderRadius(BrandRadius.PILL)
                .onClick(() => { this.showEditDialog = false; })
              Button('\u786E\u8BA4')
                .layoutWeight(1).height(36).fontSize(13).margin({ left: 8 })
                .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG)
                .borderRadius(BrandRadius.PILL)
                .onClick(() => this.updateParam())
            }.width('100%').margin({ top: 16 })
          }
          .padding(20).borderRadius(BrandRadius.LG)
          .backgroundColor(BrandPalette.CARD_BG)
          .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
        }
        .width('100%').height('100%')
        .backgroundColor('#000000AA')
        .justifyContent(FlexAlign.Center).padding({ left: 24, right: 24 })
        .position({ x: 0, y: 0 })
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }
}
