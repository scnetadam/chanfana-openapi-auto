import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { CfsStorage } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct CfsStoragePage {
  @State storage: CfsStorage | null = null;
  @State hasStorage: boolean = false;
  @State loading: boolean = true;
  @State applying: boolean = false;
  @StorageProp('userId') userId: string = '';

  aboutToAppear() {
    this.loadStorageStatus();
  }

  private async loadStorageStatus() {
    this.loading = true;
    const uid: string = this.userId;
    if (uid.length === 0) {
      this.loading = false;
      return;
    }
    const resp: ApiResponse<CfsStorage> = await HttpClient.get<CfsStorage>(
      '/api/cfs/status?userId=' + uid,
      (data: Record<string, Object>): CfsStorage => {
        const storageObj: Record<string, Object> | null =
          data['storage'] !== null && data['storage'] !== undefined ?
            data['storage'] as Record<string, Object> : null;
        if (storageObj !== null) {
          return CfsStorage.fromJson(storageObj);
        }
        return new CfsStorage();
      });
    if (resp.success && resp.data !== null) {
      this.hasStorage = resp.data.id.length > 0;
      if (this.hasStorage) {
        this.storage = resp.data;
      }
    }
    this.loading = false;
  }

  private async applyStorage() {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'region': 'ap-guangzhou',
    };
    const resp: ApiResponse<CfsStorage> = await HttpClient.post<CfsStorage>(
      '/api/cfs/apply', toPostBody(body),
      (data: Record<string, Object>): CfsStorage => {
        return CfsStorage.fromJson(data);
      });
    this.applying = false;
    if (resp.success && resp.data !== null) {
      this.storage = resp.data;
      this.hasStorage = true;
      promptAction.showToast({ message: 'CFS存储申请成功！' });
    } else {
      promptAction.showToast({ message: resp.error || '申请失败' });
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

        Text('CFS数据存储')
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
      } else if (!this.hasStorage) {
        Scroll() {
          Column() {
            Text('申请免费CFS存储')
              .fontSize(22)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
              .width('100%')

            Text('为KOL提供免费的数据存储服务')
              .fontSize(14)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 8 })
              .width('100%')

            Column() {
              Text('免费额度')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
                .width('100%')

              this.QuotaRow('存储空间', '10GB')
              this.QuotaRow('最大文件数', '10,000')
              this.QuotaRow('月流量', '100GB')
            }
            .width('100%')
            .padding(16)
            .borderRadius(12)
            .backgroundColor($r('app.color.card_background'))
            .margin({ top: 16 })

            Button(this.applying ? '申请中...' : '立即申请')
              .width('90%')
              .height(48)
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .backgroundColor($r('app.color.primary_color'))
              .fontColor(Color.White)
              .borderRadius(24)
              .margin({ top: 24 })
              .enabled(!this.applying)
              .onClick(() => this.applyStorage())
          }
          .padding({ left: 20, right: 20, top: 8 })
        }
        .layoutWeight(1)
      } else if (this.storage !== null) {
        this.StorageInfoView()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  QuotaRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(14)
        .fontColor($r('app.color.text_secondary'))
        .width(100)
      Text(value)
        .fontSize(14)
        .fontWeight(FontWeight.Bold)
        .fontColor($r('app.color.primary_color'))
        .layoutWeight(1)
    }
    .width('100%')
    .height(36)
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
          this.InfoRow('存储桶', this.storage.bucketName)
          this.InfoRow('区域', this.storage.region)
          this.InfoRow('总空间', this.storage.freeSpace)
          this.InfoRow('已使用', this.storage.usedSpace)
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
        .width(80)
      Text(value)
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .layoutWeight(1)
    }
    .width('100%')
    .height(40)
  }
}
