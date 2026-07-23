import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { CosStorage, CamRoleGuide, CamGuideStep } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct CosApplyPage {
  @State storage: CosStorage | null = null;
  @State hasStorage: boolean = false;
  @State camRole: CamRoleGuide | null = null;
  @State hasCamRole: boolean = false;
  @State loading: boolean = true;
  @State applying: boolean = false;
  @State currentStep: number = 0;
  @State guideSteps: CamGuideStep[] = [];
  @State mode: string = 'platform';
  @State roleArn: string = '';
  @State roleName: string = '';
  @State platformBucket: string = '';
  @State region: string = '';
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await Promise.all([
      this.loadStatus(),
      this.loadCamGuide(),
    ]);
    this.loading = false;
  }

  private async loadStatus() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<Record<string, Object>> = await HttpClient.get<Record<string, Object>>(
      '/api/cos/status?userId=' + uid,
      (data: Record<string, Object>): Record<string, Object> => {
        return data;
      });
    if (resp.success && resp.data !== null) {
      const d: Record<string, Object> = resp.data;
      this.hasStorage = d['hasStorage'] === true || d['hasStorage'] === 1;
      this.hasCamRole = d['hasCamRole'] === true || d['hasCamRole'] === 1;
      const pbVal: Object | undefined = d['platformBucket'];
      if (pbVal !== null && pbVal !== undefined) {
        this.platformBucket = String(pbVal);
      }
      const rVal: Object | undefined = d['region'];
      if (rVal !== null && rVal !== undefined) {
        this.region = String(rVal);
      }
      const storageObj: Object | undefined = d['storage'];
      if (storageObj !== null && storageObj !== undefined && typeof storageObj === 'object' && !Array.isArray(storageObj)) {
        this.storage = CosStorage.fromJson(storageObj as Record<string, Object>);
      }
      const camObj: Object | undefined = d['camRole'];
      if (camObj !== null && camObj !== undefined && typeof camObj === 'object' && !Array.isArray(camObj)) {
        this.camRole = CamRoleGuide.fromJson(camObj as Record<string, Object>);
      }
    }
  }

  private async loadCamGuide() {
    const resp: ApiResponse<CamGuideStep[]> = await HttpClient.get<CamGuideStep[]>(
      '/api/cos/cam-guide',
      (data: Record<string, Object>): CamGuideStep[] => {
        const stepsVal: Object | undefined = data['steps'];
        if (stepsVal !== null && stepsVal !== undefined && Array.isArray(stepsVal)) {
          const rawArr: Object[] = stepsVal as Object[];
          const result: CamGuideStep[] = [];
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              result.push(CamGuideStep.fromJson(item as Record<string, Object>));
            }
          }
          return result;
        }
        return [];
      });
    if (resp.success && resp.data !== null) {
      this.guideSteps = resp.data;
    }
  }

  private async applyStorage() {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'mode': this.mode,
      'region': this.region.length > 0 ? this.region : 'ap-guangzhou',
    };
    if (this.mode === 'own' && this.roleArn.length > 0) {
      body['roleArn'] = this.roleArn;
    }
    const resp: ApiResponse<CosStorage> = await HttpClient.post<CosStorage>(
      '/api/cos/apply', toPostBody(body),
      (data: Record<string, Object>): CosStorage => {
        return CosStorage.fromJson(data);
      });
    this.applying = false;
    if (resp.success && resp.data !== null) {
      this.storage = resp.data;
      this.hasStorage = true;
      promptAction.showToast({ message: 'COS存储申请成功！' });
    } else {
      promptAction.showToast({ message: resp.error || '申请失败' });
    }
  }

  private async saveCamRole() {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'roleArn': this.roleArn,
      'roleName': this.roleName,
    };
    const resp: ApiResponse<CamRoleGuide> = await HttpClient.post<CamRoleGuide>(
      '/api/cos/cam-role', toPostBody(body),
      (data: Record<string, Object>): CamRoleGuide => {
        return CamRoleGuide.fromJson(data);
      });
    this.applying = false;
    if (resp.success && resp.data !== null) {
      this.camRole = resp.data;
      this.hasCamRole = true;
      promptAction.showToast({ message: 'CAM角色配置成功！' });
    } else {
      promptAction.showToast({ message: resp.error || '配置失败' });
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

        Text('COS云存储')
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
      } else if (this.hasStorage && this.storage !== null) {
        this.StorageInfoView()
      } else {
        this.ApplyView()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  ApplyView() {
    Scroll() {
      Column() {
        Text('申请COS云存储')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .width('100%')

        Text('为KOL提供腾讯云COS对象存储服务')
          .fontSize(14)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 8 })
          .width('100%')

        Column() {
          Text('选择存储模式')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .width('100%')
            .margin({ bottom: 12 })

          Row() {
            Radio({ value: 'platform', group: 'cosMode' })
              .checked(this.mode === 'platform')
              .onChange((isChecked: boolean) => {
                if (isChecked) { this.mode = 'platform'; }
              })
            Column() {
              Text('使用平台共享COS')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
              Text('按量付费，无需配置，开箱即用')
                .fontSize(12)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
                .width('100%')
              if (this.platformBucket.length > 0) {
                Text('桶名: ' + this.platformBucket)
                  .fontSize(11)
                  .fontColor($r('app.color.text_secondary'))
                  .margin({ top: 2 })
                  .width('100%')
              }
            }
            .layoutWeight(1)
            .margin({ left: 8 })
            .alignItems(HorizontalAlign.Start)
          }
          .width('100%')
          .padding(12)
          .borderRadius(8)
          .backgroundColor($r('app.color.card_background'))

          Row() {
            Radio({ value: 'own', group: 'cosMode' })
              .checked(this.mode === 'own')
              .onChange((isChecked: boolean) => {
                if (isChecked) { this.mode = 'own'; }
              })
            Column() {
              Text('自建COS存储桶')
                .fontSize(14)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
              Text('免费额度50GB，需配置CAM角色授权')
                .fontSize(12)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
                .width('100%')
            }
            .layoutWeight(1)
            .margin({ left: 8 })
            .alignItems(HorizontalAlign.Start)
          }
          .width('100%')
          .padding(12)
          .borderRadius(8)
          .backgroundColor($r('app.color.card_background'))
          .margin({ top: 8 })
        }
        .width('100%')
        .padding(16)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ top: 16 })

        if (this.mode === 'own') {
          Column() {
            Text('CAM角色配置')
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
              .width('100%')
              .margin({ bottom: 12 })

            if (!this.hasCamRole && this.guideSteps.length > 0) {
              Column() {
                Text('配置引导步骤')
                  .fontSize(14)
                  .fontWeight(FontWeight.Medium)
                  .fontColor($r('app.color.text_primary'))
                  .width('100%')
                  .margin({ bottom: 8 })

                ForEach(this.guideSteps, (step: CamGuideStep) => {
                  this.StepIndicator(step.step, step.title, step.description, step.action)
                }, (step: CamGuideStep) => step.step.toString())
              }
              .width('100%')
              .padding(12)
              .borderRadius(8)
              .backgroundColor($r('app.color.primary_bg_color'))
              .margin({ bottom: 12 })
            }

            TextInput({ placeholder: '请输入角色ARN (qcs::cam::uin/...)' })
              .width('100%')
              .height(44)
              .margin({ bottom: 8 })
              .onChange((value: string) => { this.roleArn = value; })

            TextInput({ placeholder: '请输入角色名称' })
              .width('100%')
              .height(44)
              .margin({ bottom: 8 })
              .onChange((value: string) => { this.roleName = value; })

            Row() {
              Button('保存角色配置')
                .height(40)
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
                .backgroundColor($r('app.color.primary_color'))
                .fontColor(Color.White)
                .borderRadius(20)
                .enabled(this.roleArn.length > 0 && this.roleName.length > 0)
                .onClick(() => this.saveCamRole())

              Blank()

              Button('下载Terraform脚本')
                .height(40)
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
                .backgroundColor($r('app.color.success_color'))
                .fontColor(Color.White)
                .borderRadius(20)
                .onClick(() => {
                  promptAction.showToast({ message: '请在浏览器中访问 /api/cos/terraform-script 下载' });
                })
            }
            .width('100%')

            if (this.hasCamRole && this.camRole !== null) {
              Column() {
                Row() {
                  Text('已配置角色: ')
                    .fontSize(13)
                    .fontColor($r('app.color.success_color'))
                  Text(this.camRole.roleName)
                    .fontSize(13)
                    .fontWeight(FontWeight.Medium)
                    .fontColor($r('app.color.text_primary'))
                }
                .margin({ top: 8 })
                Row() {
                  Text('角色ARN: ')
                    .fontSize(12)
                    .fontColor($r('app.color.text_secondary'))
                  Text(this.camRole.roleArn)
                    .fontSize(11)
                    .fontColor($r('app.color.text_secondary'))
                    .layoutWeight(1)
                }
                .margin({ top: 4 })
              }
              .padding(12)
              .borderRadius(8)
              .backgroundColor($r('app.color.success_bg_color'))
              .margin({ top: 8 })
            }
          }
          .width('100%')
          .padding(16)
          .borderRadius(12)
          .backgroundColor($r('app.color.card_background'))
          .margin({ top: 12 })
        }

        Button(this.applying ? '申请中...' : '立即申请')
          .width('90%')
          .height(48)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.primary_color'))
          .fontColor(Color.White)
          .borderRadius(24)
          .margin({ top: 24, bottom: 32 })
          .enabled(!this.applying)
          .onClick(() => this.applyStorage())
      }
      .padding({ left: 20, right: 20, top: 8 })
    }
    .layoutWeight(1)
  }

  @Builder
  StepIndicator(stepNum: number, title: string, desc: string, action: string) {
    Row() {
      Column() {
        Text(stepNum.toString())
          .fontSize(14)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Bold)
      }
      .width(28)
      .height(28)
      .borderRadius(14)
      .justifyContent(FlexAlign.Center)
      .backgroundColor(this.currentStep >= stepNum ? $r('app.color.primary_color') : $r('app.color.text_secondary'))

      Column() {
        Text(title)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
        Text(desc)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 2 })
          .width('100%')
        Text(action)
          .fontSize(12)
          .fontColor($r('app.color.primary_color'))
          .margin({ top: 2 })
          .width('100%')
      }
      .layoutWeight(1)
      .margin({ left: 12 })
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 8, bottom: 8 })
  }

  @Builder
  StorageInfoView() {
    Scroll() {
      Column() {
        Text('存储信息')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .width('100%')

        Column() {
          this.InfoRow('存储模式', this.storage.mode === 'platform' ? '平台共享COS' : '自建COS桶')
          this.InfoRow('存储桶', this.storage.bucketName)
          this.InfoRow('区域', this.storage.region)
          this.InfoRow('总空间', this.storage.freeSpace)
          this.InfoRow('已使用', this.storage.usedSpace)
          this.InfoRow('文件数', this.storage.fileCount.toString())
          this.InfoRow('存储类型', this.storage.storageClass)
          if (this.storage.mode === 'own' && this.storage.roleArn.length > 0) {
            this.InfoRow('角色ARN', this.storage.roleArn)
          }
          this.InfoRow('状态', this.storage.status === 'active' ? '正常' : this.storage.status)
        }
        .width('100%')
        .padding(16)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ top: 16 })

        if (this.storage.status === 'active') {
          Text('存储服务运行正常，文件通过API接口管理')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 12 })
            .width('100%')
        }
      }
      .padding({ left: 20, right: 20, top: 8 })
    }
    .layoutWeight(1)
  }

  @Builder
  InfoRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(14)
        .fontColor($r('app.color.text_secondary'))
        .width(100)
      Text(value)
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .layoutWeight(1)
    }
    .width('100%')
    .height(40)
  }
}
