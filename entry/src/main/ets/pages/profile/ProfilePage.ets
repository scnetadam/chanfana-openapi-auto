import { HttpClient, ApiResponse } from '../../common/HttpClient';
import { router, promptAction } from '@kit.ArkUI';
import { UserInfo } from '../../model/DataModels';

@Entry
@Component
struct ProfilePage {
  @State profile: UserInfo | null = null;
  @State editNickName: string = '';
  @State loading: boolean = true;
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') currentNickName: string = '';
  @StorageProp('avatarUrl') avatarUrl: string = '';

  aboutToAppear() {
    this.loadProfile();
  }

  private async loadProfile() {
    const uid: string = this.userId;
    if (uid.length === 0) {
      this.loading = false;
      return;
    }
    const resp: ApiResponse<UserInfo> = await HttpClient.get<UserInfo>(
      '/api/auth/userinfo?userId=' + uid,
      (data: Record<string, Object>): UserInfo => {
        return UserInfo.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.profile = resp.data;
      this.editNickName = resp.data.nickName;
      if (resp.data.avatarUrl.length > 0) {
        AppStorage.SetOrCreate<string>('avatarUrl', resp.data.avatarUrl);
      }
    }
    this.loading = false;
  }

  private async saveProfile() {
    if (this.editNickName.trim().length === 0) {
      promptAction.showToast({ message: '昵称不能为空' });
      return;
    }
    const body: Record<string, Object> = {};
    body['userId'] = this.userId;
    body['nickName'] = this.editNickName.trim();
    const resp: ApiResponse<UserInfo> = await HttpClient.put<UserInfo>(
      '/api/auth/profile', body,
      (data: Record<string, Object>): UserInfo => {
        return UserInfo.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      AppStorage.SetOrCreate<string>('nickName', resp.data.nickName);
      this.profile = resp.data;
      promptAction.showToast({ message: '保存成功' });
    } else {
      promptAction.showToast({ message: resp.error || '保存失败' });
    }
  }

  private doLogout() {
    AppStorage.SetOrCreate<string>('userId', '');
    AppStorage.SetOrCreate<string>('token', '');
    AppStorage.SetOrCreate<string>('nickName', '');
    router.replaceUrl({ url: 'pages/login/LoginPage' });
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

        Text('个人中心')
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
      } else {
        Scroll() {
          Column() {
            Column() {
              Stack() {
                Circle()
                  .width(80)
                  .height(80)
                  .fill($r('app.color.primary_color'))
                  .margin({ top: 24 })
                if (this.avatarUrl.length > 0) {
                  Image(this.avatarUrl)
                    .width(80)
                    .height(80)
                    .borderRadius(40)
                    .margin({ top: 24 })
                }
              }
              Text(this.currentNickName || '用户')
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .margin({ top: 12 })
              Text('推广员 · 龟钮自驭')
                .fontSize(13)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 4 })
            }
            .width('100%')
            .padding({ bottom: 24 })
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text('修改昵称')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')

              TextInput({ text: this.editNickName, placeholder: '输入新昵称' })
                .width('100%')
                .height(44)
                .margin({ top: 8 })
                .onChange((value: string) => {
                  this.editNickName = value;
                })

              Button('保存修改')
                .width('100%')
                .height(44)
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .backgroundColor($r('app.color.primary_color'))
                .fontColor(Color.White)
                .borderRadius(22)
                .margin({ top: 16 })
                .onClick(() => this.saveProfile())
            }
            .width('100%')
            .padding(16)
            .borderRadius(12)
            .backgroundColor($r('app.color.card_background'))
            .margin({ left: 16, right: 16, top: 8 })
            .alignItems(HorizontalAlign.Start)

            Column() {
              Row() {
                Text('消息通知')
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
              .onClick(() => {
                router.pushUrl({ url: 'pages/notifications/NotificationsPage' });
              })

              Divider().color($r('app.color.divider_color'))

              Row() {
                Text('关于龟钮自驭')
                  .fontSize(15)
                  .fontColor($r('app.color.text_primary'))
                  .layoutWeight(1)
                Text('v3.0.0')
                  .fontSize(13)
                  .fontColor($r('app.color.text_secondary'))
              }
              .width('100%')
              .height(52)
              .padding({ left: 16, right: 16 })
            }
            .width('100%')
            .borderRadius(12)
            .backgroundColor($r('app.color.card_background'))
            .margin({ left: 16, right: 16, top: 16 })
            .alignItems(HorizontalAlign.Start)

            Button('退出登录')
              .width('80%')
              .height(44)
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .backgroundColor(Color.Transparent)
              .fontColor($r('app.color.price_color'))
              .borderRadius(22)
              .border({ width: 1, color: $r('app.color.price_color') })
              .margin({ top: 32, bottom: 32 })
              .onClick(() => this.doLogout())
          }
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }
}
