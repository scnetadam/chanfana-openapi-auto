import { HttpClient } from '../common/HttpClient';
import { VideoItem } from '../model/DataModels';
import { router } from '@kit.ArkUI';

@Entry
@Component
struct VideoStreamPage {
  @State videos: VideoItem[] = []
  @State loading: boolean = true
  @State uploading: boolean = false
  @State showUploadDialog: boolean = false
  @State videoTitle: string = ''
  @State videoDescription: string = ''

  async aboutToAppear(): Promise<void> {
    await this.loadVideos()
  }

  async loadVideos(): Promise<void> {
    this.loading = true
    try {
      const response = await HttpClient.get('/api/video/list')
      if (response.success && response.data.videos) {
        this.videos = []
        for (let i = 0; i < response.data.videos.length; i++) {
          this.videos.push(VideoItem.fromJson(response.data.videos[i]))
        }
      }
    } catch (e) {
      console.error('加载视频列表失败', e)
    } finally {
      this.loading = false
    }
  }

  async uploadVideo(): Promise<void> {
    if (!this.videoTitle) {
      AlertDialog.show({ message: '请输入视频标题' })
      return
    }

    this.uploading = true
    try {
      const response = await HttpClient.post('/api/video/upload', {
        title: this.videoTitle,
        description: this.videoDescription,
        duration: 60,
        fileSize: '50MB',
        thumbnail: ''
      })
      
      if (response.success) {
        await this.loadVideos()
        this.showUploadDialog = false
        this.videoTitle = ''
        this.videoDescription = ''
        AlertDialog.show({ message: '视频上传成功！' })
      } else {
        AlertDialog.show({ message: response.error || '上传失败' })
      }
    } catch (e) {
      AlertDialog.show({ message: '上传失败：' + e })
    } finally {
      this.uploading = false
    }
  }

  async deleteVideo(videoId: string): Promise<void> {
    try {
      const response = await HttpClient.delete('/api/video/' + videoId)
      if (response.success) {
        await this.loadVideos()
        AlertDialog.show({ message: '删除成功！' })
      } else {
        AlertDialog.show({ message: response.error || '删除失败' })
      }
    } catch (e) {
      AlertDialog.show({ message: '删除失败：' + e })
    }
  }

  build() {
    Column() {
      Row() {
        Button('返回')
          .onClick(() => {
            router.back()
          })
        Text('视频流管理')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
        Button('上传')
          .onClick(() => {
            this.showUploadDialog = true
          })
      }
      .width('100%')
      .padding(16)

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(60)
            .height(60)
          Text('加载中...')
            .margin({ top: 16 })
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.videos.length === 0) {
        Column() {
          Text('暂无视频')
            .fontSize(16)
            .fontColor('#999999')
          
          Button('上传第一个视频')
            .margin({ top: 16 })
            .onClick(() => {
              this.showUploadDialog = true
            })
        }
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List() {
          ForEach(this.videos, (video: VideoItem) => {
            ListItem() {
              Column() {
                Row() {
                  Column() {
                    Text(video.title)
                      .fontSize(18)
                      .fontWeight(FontWeight.Bold)
                    
                    Text(video.description || '暂无描述')
                      .fontSize(14)
                      .fontColor('#666666')
                      .margin({ top: 4 })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)

                  Column() {
                    Text(video.status === 'ready' ? '已就绪' : '处理中')
                      .fontSize(12)
                      .fontColor(video.status === 'ready' ? '#52c41a' : '#faad14')
                  }
                }
                .width('100%')

                Row() {
                  if (video.stats && video.stats['views'] !== undefined) {
                    Text(`播放：${video.stats['views']}`)
                      .fontSize(14)
                      .fontColor('#666666')
                  }

                  if (video.stats && video.stats['likes'] !== undefined) {
                    Text(`点赞：${video.stats['likes']}`)
                      .fontSize(14)
                      .fontColor('#666666')
                      .margin({ left: 16 })
                  }

                  Blank()

                  Button('删除')
                    .fontSize(14)
                    .backgroundColor('#ff4d4f')
                    .width(60)
                    .onClick(() => {
                      this.deleteVideo(video.id)
                    })
                }
                .width('100%')
                .margin({ top: 12 })
              }
              .padding(16)
              .backgroundColor('#ffffff')
              .borderRadius(8)
              .margin({ bottom: 12 })
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16 })
      }

      if (this.showUploadDialog) {
        Column() {
          Column() {
            Text('上传视频')
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .width('100%')

            TextInput({ placeholder: '视频标题' })
              .width('100%')
              .margin({ top: 16 })
              .onChange((value: string) => {
                this.videoTitle = value
              })

            TextArea({ placeholder: '视频描述' })
              .width('100%')
              .height(100)
              .margin({ top: 12 })
              .onChange((value: string) => {
                this.videoDescription = value
              })

            Row() {
              Button('取消')
                .layoutWeight(1)
                .backgroundColor('#f5f5f5')
                .fontColor('#666666')
                .onClick(() => {
                  this.showUploadDialog = false
                })

              Button(this.uploading ? '上传中...' : '上传')
                .layoutWeight(1)
                .backgroundColor('#1890ff')
                .margin({ left: 12 })
                .enabled(!this.uploading)
                .onClick(() => {
                  this.uploadVideo()
                })
            }
            .width('100%')
            .margin({ top: 24 })
          }
          .width('80%')
          .padding(24)
          .backgroundColor('#ffffff')
          .borderRadius(12)
        }
        .width('100%')
        .height('100%')
        .backgroundColor('rgba(0, 0, 0, 0.5)')
        .justifyContent(FlexAlign.Center)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
  }
}
