import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { ActivityItem, ActivityItemList, PublishResult } from '../../model/DataModels';
import { RouterParams } from '../../model/RouterParams';
import { APP_CONFIG } from '../../common/Constants';
import { router, promptAction } from '@kit.ArkUI';

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
    const body: Record<string, Object> = {};
    body['text'] = this.contentText;
    const emptyArr: Object[] = [];
    body['images'] = emptyArr;
    body['activityId'] = this.selectedActivityId;
    body['userId'] = APP_CONFIG.DEFAULT_USER_ID;
    body['nickName'] = APP_CONFIG.DEFAULT_NICK_NAME;
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
            Text('图片上传 (v1.0 暂未开放)')
              .fontSize(14)
              .fontColor($r('app.color.text_secondary'))
              .width('100%')
              .padding(16)
          }
          .width('100%')
          .margin({ top: 8 })

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
