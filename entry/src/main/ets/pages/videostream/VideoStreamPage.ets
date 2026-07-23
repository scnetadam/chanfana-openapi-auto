import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { VideoItem } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';
import { AiContentService } from '../../common/AiContentService';

@Entry
@Component
struct VideoStreamPage {
  @State videos: VideoItem[] = [];
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State uploading: boolean = false;
  @State showUploadDialog: boolean = false;
  @State videoTitle: string = '';
  @State videoDescription: string = '';
  @StorageProp('userId') userId: string = '';
  @State aiSummaryMap: Record<string, string> = {};
  private contentService: AiContentService = AiContentService.getInstance();

  aboutToAppear() {
    this.loadVideos();
  }

  private async loadVideos() {
    this.loading = true;
    const uid: string = this.userId;
    const path: string = '/api/video/list' + (uid.length > 0 ? '?userId=' + uid : '');
    const resp: ApiResponse<VideoItem[]> = await HttpClient.get<VideoItem[]>(
      path,
      (data: Record<string, Object>): VideoItem[] => {
        const arr: Record<string, Object>[] = [];
        const videosVal: Object | undefined = data['videos'];
        if (videosVal !== null && videosVal !== undefined && Array.isArray(videosVal)) {
          const rawArr: Object[] = videosVal as Object[];
          for (let i = 0; i < rawArr.length; i++) {
            const item: Object = rawArr[i];
            if (item !== null && item !== undefined && typeof item === 'object' && !Array.isArray(item)) {
              arr.push(item as Record<string, Object>);
            }
          }
        }
        const result: VideoItem[] = [];
        for (let i = 0; i < arr.length; i++) {
          result.push(VideoItem.fromJson(arr[i]));
        }
        return result;
      });
    if (resp.success && resp.data !== null) {
      this.videos = resp.data;
    }
    this.loading = false;
    this.refreshing = false;
  }

  private async uploadVideo() {
    if (this.videoTitle.length === 0) {
      promptAction.showToast({ message: '请输入视频标题' });
      return;
    }
    this.uploading = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'title': this.videoTitle,
      'description': this.videoDescription,
    };
    const resp: ApiResponse<VideoItem> = await HttpClient.post<VideoItem>(
      '/api/video/upload', toPostBody(body),
      (data: Record<string, Object>): VideoItem => {
        return VideoItem.fromJson(data);
      });
    this.uploading = false;
    if (resp.success) {
      this.showUploadDialog = false;
      this.videoTitle = '';
      this.videoDescription = '';
      promptAction.showToast({ message: '视频上传成功！' });
      this.loadVideos();
    } else {
      promptAction.showToast({ message: resp.error || '上传失败' });
    }
  }

  private async deleteVideo(videoId: string) {
    const body: Record<string, Object> = { 'videoId': videoId };
    const resp: ApiResponse<Object> = await HttpClient.post<Object>(
      '/api/video/' + videoId + '/delete', toPostBody(body),
      (data: Record<string, Object>): Object => {
        return data;
      });
    if (resp.success) {
      promptAction.showToast({ message: '删除成功' });
      this.loadVideos();
    } else {
      promptAction.showToast({ message: resp.error || '删除失败' });
    }
  }

  private async generateAiSummary(videoId: string, title: string) {
    const resp = await this.contentService.optimizeCopy(title, 'short_video', '', '', this.userId);
    if (resp.success && resp.data !== null) {
      this.aiSummaryMap[videoId] = resp.data.optimizedCopy;
    }
  }

  private getStatusLabel(status: string): string {
    if (status === 'ready') return '已就绪';
    if (status === 'processing') return '处理中';
    if (status === 'failed') return '失败';
    return status;
  }

  private getStatusColor(status: string): ResourceColor {
    if (status === 'ready') return $r('app.color.success_color');
    if (status === 'processing') return $r('app.color.warning_color');
    return $r('app.color.text_secondary');
  }

  private getStatValue(stats: Record<string, Object>, key: string): string {
    const val: Object | undefined = stats[key];
    if (val !== null && val !== undefined) {
      return String(val);
    }
    return '0';
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

        Text('视频流管理')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        Row() {
          Text('+')
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_color'))
        }
        .width(40)
        .height(40)
        .justifyContent(FlexAlign.Center)
        .onClick(() => {
          this.showUploadDialog = true;
        })
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
      } else if (this.videos.length === 0) {
        Column() {
          Text('暂无视频')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
          Button('上传第一个视频')
            .height(40)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(20)
            .margin({ top: 16 })
            .onClick(() => {
              this.showUploadDialog = true;
            })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.videos, (video: VideoItem) => {
              ListItem() {
                this.VideoCard(video)
              }
            }, (video: VideoItem) => video.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadVideos();
        })
      }

      if (this.showUploadDialog) {
        this.UploadDialog()
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  VideoCard(video: VideoItem) {
    Column() {
      Row() {
        Column() {
          Text(video.title)
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text(video.description.length > 0 ? video.description : '暂无描述')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%')
        }
        .alignItems(HorizontalAlign.Start)
        .layoutWeight(1)

        Column() {
          Text(this.getStatusLabel(video.status))
            .fontSize(12)
            .fontColor(Color.White)
            .padding({ left: 8, right: 8, top: 2, bottom: 2 })
            .borderRadius(4)
            .backgroundColor(this.getStatusColor(video.status))
        }
        .margin({ left: 8 })
      }
      .width('100%')

      Row() {
        Text('播放: ' + this.getStatValue(video.stats, 'views'))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Text('点赞: ' + this.getStatValue(video.stats, 'likes'))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ left: 16 })

        Blank()

        Button('删除')
          .height(28)
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .backgroundColor(Color.Transparent)
          .fontColor($r('app.color.price_color'))
          .borderRadius(14)
          .borderWidth(1)
          .borderColor($r('app.color.price_color'))
          .onClick(() => this.deleteVideo(video.id))
      }
      .width('100%')
      .margin({ top: 8 })
      .alignItems(VerticalAlign.Center)

      if (this.aiSummaryMap[video.id] !== null && this.aiSummaryMap[video.id] !== undefined && this.aiSummaryMap[video.id].length > 0) {
        Column() {
          Text('AI摘要')
            .fontSize(11)
            .fontColor($r('app.color.purple_color'))
            .fontWeight(FontWeight.Medium)
          Text(this.aiSummaryMap[video.id])
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
            .lineHeight(18)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%')
        }
        .width('100%')
        .margin({ top: 6 })
      }

      Row() {
        Text('AI摘要')
          .fontSize(11)
          .fontColor($r('app.color.purple_color'))
          .margin({ right: 8 })
          .onClick(() => this.generateAiSummary(video.id, video.title))
        Text('精华预览')
          .fontSize(11)
          .fontColor($r('app.color.primary_color'))
      }
      .width('100%')
      .margin({ top: 4 })

      Row() {
        Text(video.createdAt.slice(0, 10))
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .margin({ top: 4 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }

  @Builder
  UploadDialog() {
    Column() {
      Column() {
        Text('上传视频')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .width('100%')

        Text('视频标题')
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
          .margin({ top: 16 })
        TextInput({ placeholder: '输入视频标题' })
          .width('100%')
          .height(44)
          .margin({ top: 8 })
          .onChange((value: string) => { this.videoTitle = value; })

        Text('视频描述')
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
          .margin({ top: 16 })
        TextInput({ placeholder: '输入视频描述(选填)' })
          .width('100%')
          .height(44)
          .margin({ top: 8 })
          .onChange((value: string) => { this.videoDescription = value; })

        Row() {
          Button('取消')
            .layoutWeight(1)
            .height(44)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.card_background'))
            .fontColor($r('app.color.text_secondary'))
            .borderRadius(22)
            .onClick(() => { this.showUploadDialog = false; })

          Button(this.uploading ? '上传中...' : '上传')
            .layoutWeight(1)
            .height(44)
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(22)
            .margin({ left: 12 })
            .enabled(!this.uploading)
            .onClick(() => this.uploadVideo())
        }
        .width('100%')
        .margin({ top: 24 })
      }
      .width('85%')
      .padding(24)
      .borderRadius(16)
      .backgroundColor($r('app.color.card_background'))
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#80000000')
    .justifyContent(FlexAlign.Center)
  }
}
