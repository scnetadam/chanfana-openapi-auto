import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { BrandPalette, BrandTypography, BrandRadius, BrandSeal, BrandSlogan, BrandIcon } from '../../common/BrandCI';
import { router } from '@kit.ArkUI';

class LoginResult {
  token: string = '';
  user: LoginUser = new LoginUser();

  static fromJson(data: Record<string, Object>): LoginResult {
    const r: LoginResult = new LoginResult();
    const tokenVal: Object | undefined = data['token'];
    if (tokenVal !== null && tokenVal !== undefined) {
      r.token = String(tokenVal);
    }
    const userObj: Object | undefined = data['user'];
    if (userObj !== null && userObj !== undefined && typeof userObj === 'object' && !Array.isArray(userObj)) {
      r.user = LoginUser.fromJson(userObj as Record<string, Object>);
    }
    return r;
  }
}

class LoginUser {
  id: string = '';
  nickName: string = '';
  avatarUrl: string = '';

  static fromJson(data: Record<string, Object>): LoginUser {
    const u: LoginUser = new LoginUser();
    const idVal: Object | undefined = data['id'];
    if (idVal !== null && idVal !== undefined) u.id = String(idVal);
    const nickVal: Object | undefined = data['nickName'];
    if (nickVal !== null && nickVal !== undefined) u.nickName = String(nickVal);
    const avatarVal: Object | undefined = data['avatarUrl'];
    if (avatarVal !== null && avatarVal !== undefined) u.avatarUrl = String(avatarVal);
    return u;
  }
}

@Entry
@Component
struct LoginPage {
  @State nickName: string = '';
  @State logging: boolean = false;
  @State errorMsg: string = '';
  @State sealPulse: number = 1.0;

  private async doLogin() {
    if (this.nickName.trim().length === 0) {
      this.errorMsg = '请输入昵称';
      return;
    }
    this.logging = true;
    this.errorMsg = '';
    const body: Record<string, Object> = {};
    body['nickName'] = this.nickName.trim();
    body['platform'] = 'harmony';
    const resp: ApiResponse<LoginResult> = await HttpClient.post<LoginResult>(
      '/api/auth/login', body, (data: Record<string, Object>): LoginResult => {
        return LoginResult.fromJson(data);
      });
    this.logging = false;
    if (resp.success && resp.data !== null) {
      AppStorage.SetOrCreate<string>('userId', resp.data.user.id);
      AppStorage.SetOrCreate<string>('token', resp.data.token);
      AppStorage.SetOrCreate<string>('nickName', resp.data.user.nickName);
      AppStorage.SetOrCreate<string>('avatarUrl', resp.data.user.avatarUrl);
      router.replaceUrl({ url: 'pages/Index' });
    } else {
      this.errorMsg = resp.error || '登录失败，请重试';
    }
  }

  @Builder
  SealStamp() {
    Stack() {
      Column()
        .width(BrandSeal.STAMP_SIZE)
        .height(BrandSeal.STAMP_SIZE)
        .borderRadius(BrandRadius.SEAL)
        .border({
          width: BrandSeal.STAMP_BORDER_WIDTH,
          color: BrandSeal.SEAL_BORDER,
          style: BorderStyle.Solid
        })
        .backgroundColor(BrandSeal.SEAL_BG)

      Text(BrandIcon.SEAL_GLYPH)
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor(BrandSeal.SEAL_TEXT)

      Row() {
        Circle()
          .width(8)
          .height(8)
          .fill(BrandSeal.KNOB_HIGHLIGHT)
        Circle()
          .width(4)
          .height(4)
          .fill(BrandSeal.KNOB_SHADOW)
          .margin({ left: 2 })
      }
      .offset({ y: -38 })
    }
    .scale({ x: this.sealPulse, y: this.sealPulse })
    .shadow({
      radius: 24,
      color: '#0A162844',
      offsetX: 0,
      offsetY: 4
    })
  }

  @Builder
  BrandHeader() {
    Column() {
      this.SealStamp()

      Text('龟钮自驭')
        .fontSize(BrandTypography.HERO_TITLE)
        .fontWeight(FontWeight.Bold)
        .fontColor(BrandPalette.TEXT_PRIMARY)
        .letterSpacing(BrandTypography.LETTER_SPACING_HERO)
        .margin({ top: 24 })

      Row() {
        Column()
          .width(28)
          .height(1)
          .backgroundColor('#0A162866')
        Text('X402')
          .fontSize(12)
          .fontColor(BrandPalette.SEAL_RED)
          .letterSpacing(4)
          .margin({ left: 10, right: 10 })
        Column()
          .width(28)
          .height(1)
          .backgroundColor('#0A162866')
      }
      .margin({ top: 14 })

      Text(BrandSlogan.PRIMARY)
        .fontSize(13)
        .fontColor(BrandPalette.TEXT_SECONDARY)
        .letterSpacing(3)
        .margin({ top: 10 })

      Text(BrandSlogan.SECONDARY)
        .fontSize(10)
        .fontColor(BrandPalette.TEXT_MUTED)
        .letterSpacing(2)
        .margin({ top: 4 })
    }
    .width('100%')
    .height(360)
    .justifyContent(FlexAlign.Center)
    .linearGradient({
      direction: GradientDirection.Bottom,
      colors: [['#0A0E1A', 0.0], ['#0D0A1A', 0.3], ['#1A0D0D', 0.7], ['#131929', 1.0]]
    })
  }

  build() {
    Column() {
      this.BrandHeader()

      Column() {
        Column() {
          TextInput({ placeholder: '\u8F93\u5165\u60A8\u7684\u6635\u79F0' })
            .width('100%')
            .height(50)
            .fontSize(16)
            .fontColor(BrandPalette.TEXT_PRIMARY)
            .placeholderColor(BrandPalette.TEXT_MUTED)
            .backgroundColor(BrandPalette.SURFACE)
            .borderRadius(BrandRadius.LG)
            .padding({ left: 16, right: 16 })
            .onChange((value: string) => {
              this.nickName = value;
              this.errorMsg = '';
            })
        }
        .width('100%')
        .padding({ left: 24, right: 24 })

        if (this.errorMsg.length > 0) {
          Text(this.errorMsg)
            .fontSize(13)
            .fontColor(BrandPalette.CYBER_RED)
            .margin({ top: 8 })
        }

        Button(this.logging ? '\u767B\u5F55\u4E2D...' : '\u94AE\u5370\u767B\u5F55')
          .width('80%')
          .height(52)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(BrandPalette.DEEP_BG)
          .backgroundColor(BrandPalette.PRIMARY)
          .borderRadius(26)
          .margin({ top: 28 })
          .shadow({ radius: 20, color: '#00E5A044', offsetX: 0, offsetY: 4 })
          .enabled(!this.logging)
          .onClick(() => this.doLogin())

        Row() {
          Column()
            .width(32)
            .height(1)
            .backgroundColor(BrandPalette.DIVIDER)
          Text('BLOCKCHAIN VERIFIED')
            .fontSize(9)
            .fontColor(BrandPalette.TEXT_MUTED)
            .letterSpacing(3)
            .margin({ left: 10, right: 10 })
          Column()
            .width(32)
            .height(1)
            .backgroundColor(BrandPalette.DIVIDER)
        }
        .margin({ top: 24 })

        Text('\u767B\u5F55\u5373\u8868\u793A\u540C\u610F\u300A\u7528\u6237\u534F\u8BAE\u300B\u548C\u300A\u9690\u79C1\u653F\u7B56\u300B')
          .fontSize(11)
          .fontColor(BrandPalette.TEXT_MUTED)
          .margin({ top: 12 })
      }
      .width('100%')
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
      .backgroundColor(BrandPalette.DEEP_BG)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(BrandPalette.DEEP_BG)
  }
}
