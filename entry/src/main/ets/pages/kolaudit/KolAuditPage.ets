import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { KolAuditProfile, KolAuditSubmitResult } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct KolAuditPage {
  @State profile: KolAuditProfile | null = null;
  @State followerCount: string = '';
  @State channel: string = 'standard';
  @State platform: string = '';
  @State platformUrl: string = '';
  @State hasOtherPlatform: boolean = false;
  @State otherPlatformFollowers: string = '';
  @State bizAuthCode: string = '';
  @State bizUserId: string = '';
  @State loading: boolean = true;
  @State submitting: boolean = false;
  @State submittingOpc: boolean = false;
  @State channelOptions: ChannelOption[] = [
    new ChannelOption('standard', '标准审核', '粉丝>2000'),
    new ChannelOption('biz_auth', 'B端授权', '商家授权,免粉丝要求'),
    new ChannelOption('biz_invite', 'B端邀请', '商家邀请,免审核'),
    new ChannelOption('cross_platform', '同类平台基础', '粉丝>1000+运营证明'),
    new ChannelOption('opc', 'OPC创业', '粉丝>1000+同类平台基础'),
  ];
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadProfile();
  }

  private async loadProfile() {
    const uid: string = this.userId;
    if (uid.length === 0) {
      this.loading = false;
      return;
    }
    const resp: ApiResponse<KolAuditProfile> = await HttpClient.get<KolAuditProfile>(
      '/api/kol-audit/profile?userId=' + uid,
      (data: Record<string, Object>): KolAuditProfile => {
        return KolAuditProfile.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.profile = resp.data;
      this.followerCount = resp.data.followerCount.toString();
      this.platform = resp.data.platform;
      this.platformUrl = resp.data.platformUrl;
      this.hasOtherPlatform = resp.data.hasOtherPlatform;
      if (resp.data.otherPlatformFollowers > 0) {
        this.otherPlatformFollowers = resp.data.otherPlatformFollowers.toString();
      }
    }
    this.loading = false;
  }

  private async submitAudit() {
    const followers: number = parseInt(this.followerCount) || 0;
    const channel: string = this.channel;
    if (channel === 'standard' && followers < 2000 && !this.hasOtherPlatform) {
      promptAction.showToast({ message: '标准审核需粉丝>2000' });
      return;
    }
    if ((channel === 'cross_platform' || channel === 'opc') && followers < 1000) {
      promptAction.showToast({ message: '此通道需粉丝>1000' });
      return;
    }
    if ((channel === 'biz_auth' || channel === 'biz_invite') && this.bizUserId.length === 0) {
      promptAction.showToast({ message: 'B端授权/邀请需填写商家ID' });
      return;
    }
    this.submitting = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'channel': channel,
      'followers': followers,
      'crossPlatformProof': this.hasOtherPlatform ? this.platform + ': ' + this.platformUrl : '',
      'bizAuthCode': this.bizAuthCode,
      'bizUserId': this.bizUserId,
      'nickName': AppStorage.get<string>('nickName') || '',
    };
    const resp: ApiResponse<KolAuditSubmitResult> = await HttpClient.post<KolAuditSubmitResult>(
      '/api/kol-audit/submit', toPostBody(body),
      (data: Record<string, Object>): KolAuditSubmitResult => {
        return KolAuditSubmitResult.fromJson(data);
      });
    this.submitting = false;
    if (resp.success && resp.data !== null) {
      if (resp.data.success) {
        promptAction.showToast({ message: '审核提交成功！' });
        this.loadProfile();
      } else {
        promptAction.showToast({ message: resp.data.message || '审核未通过' });
      }
    } else {
      promptAction.showToast({ message: resp.error || '提交失败' });
    }
  }

  private async applyOpc() {
    this.submittingOpc = true;
    const followers: number = parseInt(this.followerCount) || 0;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'nickName': AppStorage.get<string>('nickName') || '',
      'followers': followers,
      'crossPlatformProof': this.hasOtherPlatform ? this.platform + ': ' + this.platformUrl : '',
      'businessPlan': '',
    };
    const resp: ApiResponse<KolAuditSubmitResult> = await HttpClient.post<KolAuditSubmitResult>(
      '/api/kol-audit/opc-apply', toPostBody(body),
      (data: Record<string, Object>): KolAuditSubmitResult => {
        return KolAuditSubmitResult.fromJson(data);
      });
    this.submittingOpc = false;
    if (resp.success && resp.data !== null && resp.data.success) {
      promptAction.showToast({ message: 'OPC创业支持申请已提交！' });
      this.loadProfile();
    } else {
      promptAction.showToast({ message: (resp.data !== null ? resp.data.message : '') || resp.error || '申请失败' });
    }
  }

  private getStatusText(status: string): string {
    if (status === 'pending') return '审核中';
    if (status === 'approved') return '已通过';
    if (status === 'rejected') return '未通过';
    return status || '未申请';
  }

  private getStatusColor(status: string): ResourceColor {
    if (status === 'approved') return Color.Green;
    if (status === 'pending') return $r('app.color.primary_color');
    if (status === 'rejected') return Color.Red;
    return $r('app.color.text_secondary');
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

        Text('KOL认证审核')
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
      } else if (this.profile !== null && this.profile.isApproved) {
        Scroll() {
          Column() {
            Column() {
              SymbolGlyph($r('sys.symbol.checkmark_circle'))
                .fontSize(64)
                .fontColor([Color.Green])
              Text('KOL认证已通过')
                .fontSize(22)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.Green)
                .margin({ top: 16 })
              if (this.profile.isBizInvited) {
                Text('B端商家邀请 · 免审核')
                  .fontSize(13)
                  .fontColor($r('app.color.primary_color'))
                  .margin({ top: 4 })
              } else if (this.profile.isBizAuthorized) {
                Text('B端商家授权 · 免审核')
                  .fontSize(13)
                  .fontColor($r('app.color.primary_color'))
                  .margin({ top: 4 })
              }
              Text('粉丝: ' + this.profile.followerCount.toString() + ' · KOL评分: ' + this.profile.kolScore.toString())
                .fontSize(13)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 8 })
            }
            .width('100%')
            .padding(32)
            .alignItems(HorizontalAlign.Center)

            if (this.profile.canApplyOpc && this.profile.followerCount >= 1000) {
              Column() {
                Text('OPC创业支持')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor($r('app.color.text_primary'))
                  .width('100%')

                Text('您符合OPC创业支持条件，可申请免费AI额度和工具折扣')
                  .fontSize(13)
                  .fontColor($r('app.color.text_secondary'))
                  .margin({ top: 8 })
                  .width('100%')

                Button(this.submittingOpc ? '申请中...' : '申请OPC创业支持')
                  .width('100%')
                  .height(44)
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .backgroundColor($r('app.color.primary_color'))
                  .fontColor(Color.White)
                  .borderRadius(22)
                  .margin({ top: 16 })
                  .enabled(!this.submittingOpc)
                  .onClick(() => this.applyOpc())
              }
              .width('100%')
              .padding(16)
              .borderRadius(12)
              .backgroundColor($r('app.color.card_background'))
              .margin({ left: 16, right: 16, top: 16 })
              .alignItems(HorizontalAlign.Start)
            }

            Column() {
              this.MenuRow('OPC创业支持', () => {
                router.pushUrl({ url: 'pages/opcsupport/OpcSupportPage' });
              })
              Divider().color('#1A182431')
              this.MenuRow('AI工具市场', () => {
                router.pushUrl({ url: 'pages/aitools/AiToolsPage' });
              })
              Divider().color('#1A182431')
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
      } else if (this.profile !== null && this.profile.status === 'pending') {
        Column() {
          SymbolGlyph($r('sys.symbol.clock'))
            .fontSize(64)
            .fontColor([$r('app.color.primary_color')])
          Text('审核中')
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_color'))
            .margin({ top: 16 })
          Text('您的KOL认证正在审核中，请耐心等待')
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
              Text('KOL认证申请')
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
              Text('成为认证KOL，享受平台推广分佣和AI加权收益')
                .fontSize(13)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 8 })
                .width('100%')
            }
            .width('100%')
            .padding(16)
            .alignItems(HorizontalAlign.Start)

            Column() {
              Text('审核规则')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .width('100%')

              this.RuleRow('标准审核', '粉丝 > 2000')
              this.RuleRow('同类平台', '粉丝 > 1000 + 运营基础')
              this.RuleRow('B端授权', '商家直接授权，免审核')
              this.RuleRow('B端邀请', '商家邀请，免审核')
            }
            .width('100%')
            .padding(16)
            .borderRadius(12)
            .backgroundColor($r('app.color.card_background'))
            .margin({ left: 16, right: 16, top: 8 })
            .alignItems(HorizontalAlign.Start)

             Column() {
               Text('审核通道 *')
                 .fontSize(14)
                 .fontWeight(FontWeight.Medium)
                 .fontColor($r('app.color.text_primary'))
                 .width('100%')
               ForEach(this.channelOptions, (opt: ChannelOption) => {
                 Row() {
                   Radio({ value: opt.key, group: 'channel' })
                     .checked(this.channel === opt.key)
                     .onChange((checked: boolean) => {
                       if (checked) { this.channel = opt.key; }
                     })
                   Column() {
                     Text(opt.label)
                       .fontSize(14)
                       .fontColor($r('app.color.text_primary'))
                     Text(opt.desc)
                       .fontSize(12)
                       .fontColor($r('app.color.text_secondary'))
                   }
                   .margin({ left: 8 })
                   .alignItems(HorizontalAlign.Start)
                 }
                 .width('100%')
                 .height(48)
                 .alignItems(VerticalAlign.Center)
               })

               Text('粉丝数 *')
                 .fontSize(14)
                 .fontWeight(FontWeight.Medium)
                 .fontColor($r('app.color.text_primary'))
                 .width('100%')
                 .margin({ top: 8 })
               TextInput({ placeholder: '输入粉丝数量' })
                 .width('100%')
                 .height(44)
                 .margin({ top: 8 })
                 .type(InputType.Number)
                 .onChange((value: string) => { this.followerCount = value; })

               if (this.channel === 'biz_auth' || this.channel === 'biz_invite') {
                 Text('商家ID *')
                   .fontSize(14)
                   .fontWeight(FontWeight.Medium)
                   .fontColor($r('app.color.text_primary'))
                   .width('100%')
                   .margin({ top: 16 })
                 TextInput({ placeholder: '输入商家用户ID' })
                   .width('100%')
                   .height(44)
                   .margin({ top: 8 })
                   .onChange((value: string) => { this.bizUserId = value; })

                 Text('授权码')
                   .fontSize(14)
                   .fontWeight(FontWeight.Medium)
                   .fontColor($r('app.color.text_primary'))
                   .width('100%')
                   .margin({ top: 16 })
                 TextInput({ placeholder: 'B端授权码(如有)' })
                   .width('100%')
                   .height(44)
                   .margin({ top: 8 })
                   .onChange((value: string) => { this.bizAuthCode = value; })
               }

               Text('主平台')
                 .fontSize(14)
                 .fontWeight(FontWeight.Medium)
                 .fontColor($r('app.color.text_primary'))
                 .width('100%')
                 .margin({ top: 16 })
               TextInput({ placeholder: '如: 抖音/小红书/微博' })
                 .width('100%')
                 .height(44)
                 .margin({ top: 8 })
                 .onChange((value: string) => { this.platform = value; })

               Text('主页链接')
                 .fontSize(14)
                 .fontWeight(FontWeight.Medium)
                 .fontColor($r('app.color.text_primary'))
                 .width('100%')
                 .margin({ top: 16 })
               TextInput({ placeholder: '输入平台主页URL' })
                 .width('100%')
                 .height(44)
                 .margin({ top: 8 })
                 .onChange((value: string) => { this.platformUrl = value; })

               Row() {
                 Checkbox()
                   .select(this.hasOtherPlatform)
                   .onChange((checked: boolean) => { this.hasOtherPlatform = checked; })
                 Text('有同类平台运营基础')
                   .fontSize(14)
                   .fontColor($r('app.color.text_primary'))
                   .margin({ left: 8 })
               }
               .width('100%')
               .margin({ top: 16 })

               if (this.hasOtherPlatform) {
                 Text('其他平台粉丝数')
                   .fontSize(14)
                   .fontWeight(FontWeight.Medium)
                   .fontColor($r('app.color.text_primary'))
                   .width('100%')
                   .margin({ top: 12 })
                 TextInput({ placeholder: '输入其他平台粉丝数量' })
                   .width('100%')
                   .height(44)
                   .margin({ top: 8 })
                   .type(InputType.Number)
                   .onChange((value: string) => { this.otherPlatformFollowers = value; })
               }
             }
            .width('100%')
            .padding(16)
            .margin({ top: 8 })
            .alignItems(HorizontalAlign.Start)

            Button(this.submitting ? '提交中...' : '提交KOL审核')
              .width('90%')
              .height(48)
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .backgroundColor($r('app.color.primary_color'))
              .fontColor(Color.White)
              .borderRadius(24)
              .margin({ top: 24, bottom: 32 })
              .enabled(!this.submitting)
              .onClick(() => this.submitAudit())
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
  RuleRow(title: string, desc: string) {
    Row() {
      Text(title)
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .width(100)
      Text(desc)
        .fontSize(13)
        .fontColor($r('app.color.text_secondary'))
        .layoutWeight(1)
    }
    .width('100%')
    .height(36)
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

class ChannelOption {
  key: string = '';
  label: string = '';
  desc: string = '';

  constructor(key: string, label: string, desc: string) {
    this.key = key;
    this.label = label;
    this.desc = desc;
  }
}
