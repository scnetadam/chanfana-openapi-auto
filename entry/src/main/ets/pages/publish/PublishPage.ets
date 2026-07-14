import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ActivityItem, ActivityItemList, PublishResult } from '../../model/DataModels';
import { RouterParams } from '../../model/RouterParams';
import { router, promptAction } from '@kit.ArkUI';
import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { fileIo } from '@kit.CoreFileKit';
import { http } from '@kit.NetworkKit';
import { common } from '@kit.AbilityKit';

@Entry
@Component
struct PublishPage {
  @State activities: ActivityItem[] = [];
  @State selectedActivityId: string = '';
  @State selectedActivityName: string = '';
  @State contentText: string = '';
  @State publishing: boolean = false;
  @State loading: boolean = true;
  @State showActivityPicker: boolean = false;
  @State selectedImageUris: string[] = [];
  @State uploading: boolean = false;
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';

  aboutToAppear() {
    this.loadActivities();
  }

  private async loadActivities() {
    const rawParams: Object | null = router.getParams();
    const params: Record<string, Object> = (rawParams !== null && rawParams !== undefined) ? rawParams as Record<string, Object> : {};
    const rp: RouterParams = RouterParams.fromRecord(params);
    if (rp.activityId) {
      this.selectedActivityId = rp.activityId;
    }
    const resp: ApiResponse<ActivityItem[]> = await HttpClient.get<ActivityItem[]>('/api/activity/list', (data: Record<string, Object>): ActivityItem[] => {
      return ActivityItemList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) {
      this.activities = resp.data;
      if (this.selectedActivityId) {
        for (let i = 0; i < this.activities.length; i++) {
          if (this.activities[i].id === this.selectedActivityId) {
            this.selectedActivityName = this.activities[i].title;
            break;
          }
        }
      }
    }
    this.loading = false;
  }

  private async pickImages() {
    try {
      const photoSelectOptions: photoAccessHelper.PhotoSelectOptions = new photoAccessHelper.PhotoSelectOptions();
      photoSelectOptions.maxSelectNumber = 3;
      photoSelectOptions.MIMEType = photoAccessHelper.PhotoViewMIMETypes.IMAGE_TYPE;
      const photoViewPicker: photoAccessHelper.PhotoViewPicker = new photoAccessHelper.PhotoViewPicker();
      const result: photoAccessHelper.PhotoSelectResult = await photoViewPicker.select(photoSelectOptions);
      if (result.photoUris.length > 0) {
        this.selectedImageUris = result.photoUris;
      }
    } catch (e) {
      const errMsg: string = e !== null && e !== undefined ? String(e) : '选择图片失败';
      promptAction.showToast({ message: errMsg });
    }
  }

  private async uploadImage(uri: string): Promise<string> {
    const context: common.UIAbilityContext = getContext(this) as common.UIAbilityContext;
    const cacheDir: string = context.cacheDir;
    const fileName: string = 'upload_' + Date.now().toString(36) + '.jpg';
    const cachePath: string = cacheDir + '/' + fileName;
    const srcFile: fileIo.File = fileIo.openSync(uri, fileIo.OpenMode.READ_ONLY);
    const stat: fileIo.Stat = fileIo.statSync(uri);
    const buf: ArrayBuffer = new ArrayBuffer(stat.size);
    fileIo.readSync(srcFile.fd, buf);
    fileIo.closeSync(srcFile);
    const destFile: fileIo.File = fileIo.openSync(cachePath, fileIo.OpenMode.READ_WRITE | fileIo.OpenMode.CREATE);
    fileIo.writeSync(destFile.fd, buf);
    fileIo.closeSync(destFile);
    const token: string = HttpClient.getToken();
    const headers: Record<string, string> = {};
    if (token.length > 0) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const request: http.HttpRequest = http.createHttp();
    const resp: http.HttpResponse = await request.request('http://10.0.2.2:3000/api/upload/image', {
      method: http.RequestMethod.POST,
      header: headers,
      multiFormDataList: [{
        name: 'image',
        contentType: 'image/jpeg',
        filePath: cachePath,
      }],
      connectTimeout: 30000,
      readTimeout: 30000,
    });
    request.destroy();
    if (resp.responseCode === 200) {
      const jsonStr: string = resp.result.toString();
      const record: Record<string, Object> = JSON.parse(jsonStr) as Record<string, Object>;
      const successVal: Object | undefined = record['success'];
      if (successVal === true) {
        const dataObj: Object | undefined = record['data'];
        if (dataObj !== null && dataObj !== undefined && typeof dataObj === 'object') {
          const dataRecord: Record<string, Object> = dataObj as Record<string, Object>;
          const urlVal: Object | undefined = dataRecord['url'];
          if (urlVal !== null && urlVal !== undefined) {
            return String(urlVal);
          }
        }
      }
    }
    return '';
  }

  private async doPublish() {
    if (!this.selectedActivityId) {
      promptAction.showToast({ message: '请选择推广活动' });
      return;
    }
    if (!this.contentText.trim()) {
      promptAction.showToast({ message: '请填写推广内容' });
      return;
    }
    this.publishing = true;
    let imageUrls: string[] = [];
    if (this.selectedImageUris.length > 0) {
      this.uploading = true;
      for (let i = 0; i < this.selectedImageUris.length; i++) {
        const url: string = await this.uploadImage(this.selectedImageUris[i]);
        if (url.length > 0) {
          imageUrls.push(url);
        }
      }
      this.uploading = false;
    }
    const body: Record<string, Object> = {};
    body['text'] = this.contentText;
    const imageObjArr: Object[] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      imageObjArr.push(imageUrls[i]);
    }
    body['images'] = imageObjArr;
    body['activityId'] = this.selectedActivityId;
    body['userId'] = this.userId;
    body['nickName'] = this.nickName;
    const resp: ApiResponse<PublishResult> = await HttpClient.post<PublishResult>('/api/content/publish', toPostBody(body), (data: Record<string, Object>): PublishResult => {
      return PublishResult.fromJson(data);
    });
    this.publishing = false;
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '发布成功！' });
      const routeParams: Record<string, Object> = { 'contentId': resp.data.id };
      router.replaceUrl({ url: 'pages/share/SharePage', params: routeParams });
    } else {
      promptAction.showToast({ message: resp.error || '发布失败' });
    }
  }

  build() {
    Column() {
      Row() {
        Text('发布推广内容')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
      }
      .width('100%')
      .height(56)
      .padding({ left: 16, right: 16 })

      Scroll() {
        Column() {
          Column() {
            Text('绑定活动')
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor($r('app.color.text_primary'))
              .width('100%')

            Row() {
              if (this.selectedActivityName) {
                Text(this.selectedActivityName)
                  .fontSize(15)
                  .fontColor($r('app.color.text_primary'))
                  .layoutWeight(1)
              } else {
                Text('请选择推广活动')
                  .fontSize(15)
                  .fontColor($r('app.color.text_secondary'))
                  .layoutWeight(1)
              }
              Text('>')
                .fontSize(16)
                .fontColor($r('app.color.text_secondary'))
            }
            .width('100%')
            .height(48)
            .padding({ left: 12, right: 12 })
            .borderRadius(8)
            .backgroundColor($r('app.color.page_background_color'))
            .margin({ top: 8 })
            .onClick(() => {
              this.showActivityPicker = !this.showActivityPicker;
            })
          }
          .width('100%')
          .padding(16)
          .alignItems(HorizontalAlign.Start)

          if (this.showActivityPicker && this.activities.length > 0) {
            Column() {
              ForEach(this.activities, (item: ActivityItem) => {
                Row() {
                  Radio({ value: item.id, group: 'activity' })
                    .checked(item.id === this.selectedActivityId)
                    .onChange((isChecked: boolean) => {
                      if (isChecked) {
                        this.selectedActivityId = item.id;
                        this.selectedActivityName = item.title;
                        this.showActivityPicker = false;
                      }
                    })
                  Column() {
                    Text(item.title)
                      .fontSize(14)
                      .fontColor($r('app.color.text_primary'))
                    Text(item.brand + ' ' + item.model + ' · 试驾¥' + item.rewardPerBooking)
                      .fontSize(12)
                      .fontColor($r('app.color.text_secondary'))
                      .margin({ top: 2 })
                  }
                  .margin({ left: 8 })
                  .layoutWeight(1)
                }
                .width('100%')
                .padding(12)
              }, (item: ActivityItem) => item.id)
            }
            .width('100%')
            .padding({ left: 16, right: 16, bottom: 8 })
          }

          Column() {
            Text('推广文案')
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor($r('app.color.text_primary'))
              .width('100%')

            TextArea({ placeholder: '写下你的推广文案，分享真实体验...' })
              .width('100%')
              .height(160)
              .fontSize(15)
              .padding(12)
              .borderRadius(8)
              .backgroundColor($r('app.color.page_background_color'))
              .margin({ top: 8 })
              .onChange((value: string) => {
                this.contentText = value;
              })
          }
          .width('100%')
          .padding(16)
          .alignItems(HorizontalAlign.Start)

          Column() {
            Text('图片上传')
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor($r('app.color.text_primary'))
              .width('100%')

            Row() {
              ForEach(this.selectedImageUris, (uri: string) => {
                Image(uri)
                  .width(72)
                  .height(72)
                  .borderRadius(8)
                  .margin({ right: 8 })
              }, (uri: string, index: number) => uri + index)

              if (this.selectedImageUris.length < 3) {
                Column() {
                  Text('+')
                    .fontSize(28)
                    .fontColor($r('app.color.text_secondary'))
                }
                .width(72)
                .height(72)
                .borderRadius(8)
                .border({ width: 1, color: $r('app.color.text_secondary'), style: BorderStyle.Dashed })
                .justifyContent(FlexAlign.Center)
                .onClick(() => this.pickImages())
              }
            }
            .width('100%')
            .margin({ top: 8 })

            if (this.uploading) {
              LoadingProgress()
                .width(24)
                .height(24)
                .color($r('app.color.primary_color'))
                .margin({ top: 8 })
            }
          }
          .width('100%')
          .padding(16)
          .alignItems(HorizontalAlign.Start)

          Button(this.publishing ? '发布中...' : '发布并生成海报')
            .width('90%')
            .height(48)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(24)
            .margin({ top: 24, bottom: 32 })
            .enabled(!this.publishing)
            .onClick(() => this.doPublish())
        }
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }
}
