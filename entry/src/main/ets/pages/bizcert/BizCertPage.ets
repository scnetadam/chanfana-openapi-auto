import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { BizCertStatus } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct BizCertPage {
  @State certStatus: BizCertStatus | null = null;
  @State companyName: string = '';
  @State creditCode: string = '';
  @State legalPerson: string = '';
  @State contactName: string = '';
  @State contactPhone: string = '';
  @State industry: string = '';
  @State scale: string = '';
  @State loading: boolean = true;
  @State submitting: boolean = false;
  @State isBizUser: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadCertStatus();
  }

  private async loadCertStatus() {
    const uid: string = this.userId;
    if (uid.length === 0) {
      this.loading = false;
      return;
    }
    const resp: ApiResponse<BizCertStatus> = await HttpClient.get<BizCertStatus>(
      '/api/biz/status?userId=' + uid,
      (data: Record<string, Object>): BizCertStatus => {
        return BizCertStatus.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.certStatus = resp.data;
      if (resp.data.status === 'approved') {
        this.isBizUser = true;
      }
    }
    this.loading = false;
  }

  private async submitCert() {
    if (!this.companyName.trim()) {
      promptAction.showToast({ message: '请输入企业名称' });
      return;
    }
    if (!this.contactName.trim()) {
      promptAction.showToast({ message: '请输入联系人' });
      return;
    }
    if (!this.contactPhone.trim()) {
      promptAction.showToast({ message: '请输入联系电话' });
      return;
    }
    this.submitting = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'companyName': this.companyName.trim(),
      'creditCode': this.creditCode.trim(),
      'legalPerson': this.legalPerson.trim(),
      'contactName': this.contactName.trim(),
      'contactPhone': this.contactPhone.trim(),
      'industry': this.industry.trim(),
      'scale': this.scale.trim(),
    };
    const resp: ApiResponse<BizCertStatus> = await HttpClient.post<BizCertStatus>(
      '/api/biz/apply', toPostBody(body),
      (data: Record<string, Object>): BizCertStatus => {
        return BizCertStatus.fromJson(data);
      });
    this.submitting = false;
    if (resp.success && resp.data !== null) {
      this.certStatus = resp.data;
      if (resp.data.status === 'approved') {
        this.isBizUser = true;
        promptAction.showToast({ message: '认证通过！' });
      } else {
        promptAction.showToast({ message: resp.data.message || '已提交，审核中' });
      }
    } else {
      promptAction.showToast({ message: resp.error || '认证失败' });
    }
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

        Text('B端商家认证')
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
      } else if (this.isBizUser) {
        Scroll() {
          Column() {
            Column() {
              SymbolGlyph($r('sys.symbol.checkmark_circle'))
                .fontSize(64)
                .fontColor([Color.Green])
              Text('认证已通过')
                .fontSize(22)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.Green)
                .margin({ top: 16 })
              Text('您已通过龟钮印证商家认证，可发布KOL任务和商家产品')
                .fontSize(14)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 8 })
                .textAlign(TextAlign.Center)
            }
            .width('100%')
            .padding(32)
            .alignItems(HorizontalAlign.Center)

            Column() {
              this.MenuRow('KOL任务中心', () => {
                AppStorage.SetOrCreate<number>('tabIndex', 1);
                router.back();
              })
              Divider().color($r('app.color.divider_color'))
              this.MenuRow('商家产品管理', () => {
                promptAction.showToast({ message: '即将开放' });
              })
              Divider().color($r('app.color.divider_color'))
              this.MenuRow('结算中心', () => {
                AppStorage.SetOrCreate<number>('tabIndex', 3);
                router.back();
              })
            }
            .width('100%')
            .padding({ left: 16, right: 16 })
            .borderRadius(12)
            .backgroundColor($r('app.color.card_background'))
            .margin({ left: 16, right: 16, top: 16 })
          }
        }
        .layoutWeight(1)
      } else if (this.certStatus !== null && this.certStatus.status === 'pending_review') {
        Column() {
          SymbolGlyph($r('sys.symbol.clock'))
            .fontSize(64)
            .fontColor([$r('app.color.primary_color')])
          Text('审核中')
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_color'))
            .margin({ top: 16 })
          Text('您的认证申请正在AI审核中，请稍候')
            .fontSize(14)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 8 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            Column() {
              Text('入驻龟钮印证')
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
              Text('完成商家认证后，可发布KOL任务、创建商家产品、通过龟钮印证实现微交易结算')
                .fontSize(13)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 8 })
                .width('100%')
            }
            .width('100%')
            .padding(16)
            .alignItems(HorizontalAlign.Start)

            Column() {
              Text('企业名称 *')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
              TextInput({ placeholder: '请输入企业全称' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.companyName = value; })

              Text('统一社会信用代码')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ top: 16 })
              TextInput({ placeholder: '18位信用代码 (选填)' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.creditCode = value; })

              Text('法人代表')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ top: 16 })
              TextInput({ placeholder: '法人姓名 (选填)' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.legalPerson = value; })

              Text('联系人 *')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ top: 16 })
              TextInput({ placeholder: '联系人姓名' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.contactName = value; })

              Text('联系电话 *')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ top: 16 })
              TextInput({ placeholder: '手机号码' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .type(InputType.PhoneNumber)
                .onChange((value: string) => { this.contactPhone = value; })

              Text('所属行业')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ top: 16 })
              TextInput({ placeholder: '如: 汽车/科技/零售' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.industry = value; })

              Text('企业规模')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ top: 16 })
              TextInput({ placeholder: '如: 小型/中型/大型' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => { this.scale = value; })
            }
            .width('100%')
            .padding(16)
            .alignItems(HorizontalAlign.Start)

            Button(this.submitting ? '提交中...' : '提交认证')
              .width('90%')
              .height(48)
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .backgroundColor($r('app.color.primary_color'))
              .fontColor(Color.White)
              .borderRadius(24)
              .margin({ top: 24, bottom: 32 })
              .enabled(!this.submitting)
              .onClick(() => this.submitCert())
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
  MenuRow(title: string, action: () => void) {
    Row() {
      Text(title)
        .fontSize(15)
        .fontColor($r('app.color.text_primary'))
        .layoutWeight(1)
      Text('>')
        .fontSize(16)
        .fontColor($r('app.color.text_secondary'))
    }
    .width('100%')
    .height(52)
    .padding({ left: 16, right: 16 })
    .onClick(action)
  }
}
