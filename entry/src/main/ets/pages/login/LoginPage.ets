import { HttpClient, ApiResponse } from '../../common/HttpClient';
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

  build() {
    Column() {
      Column() {
        Text('龟钮印信')
          .fontSize(32)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .letterSpacing(4)
        Text('车讯传天下，印信通四方')
          .fontSize(14)
          .fontColor(Color.White)
          .opacity(0.8)
          .margin({ top: 8 })
      }
      .width('100%')
      .height(240)
      .justifyContent(FlexAlign.Center)
      .linearGradient({
        direction: GradientDirection.Right,
        colors: [['#1E40AF', 0.0], ['#3B82F6', 1.0]]
      })

      Column() {
        Text('欢迎登录')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .margin({ top: 32, bottom: 24 })

        Column() {
          TextInput({ placeholder: '输入您的昵称' })
            .width('100%')
            .height(48)
            .fontSize(16)
            .onChange((value: string) => {
              this.nickName = value;
              this.errorMsg = '';
            })
        }
        .width('100%')
        .padding({ left: 16, right: 16 })

        if (this.errorMsg.length > 0) {
          Text(this.errorMsg)
            .fontSize(13)
            .fontColor($r('app.color.price_color'))
            .margin({ top: 8 })
        }

        Button(this.logging ? '登录中...' : '立即登录')
          .width('80%')
          .height(48)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.primary_color'))
          .fontColor(Color.White)
          .borderRadius(24)
          .margin({ top: 32 })
          .enabled(!this.logging)
          .onClick(() => this.doLogin())

        Text('登录即表示同意《用户协议》和《隐私政策》')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 24 })
          .textAlign(TextAlign.Center)
      }
      .width('100%')
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }
}
