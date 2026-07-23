import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import {
  KolTaskDetail, KolTaskItem, KolAcceptedTask, KolTaskSubmissionRecord,
  KolSubmissionResult, AiScoreData
} from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct KolTaskDetailPage {
  @State detail: KolTaskDetail | null = null;
  @State loading: boolean = true;
  @State accepting: boolean = false;
  @State submitting: boolean = false;
  @State proofText: string = '';
  @State proofUrl: string = '';
  @State proofType: string = 'link';
  @State currentSection: number = 0;
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';
  private taskId: string = '';

  aboutToAppear() {
    const params: Record<string, Object> | null = router.getParams() as Record<string, Object> | null;
    if (params !== null && params['taskId'] !== null && params['taskId'] !== undefined) {
      this.taskId = String(params['taskId']);
    }
    this.loadDetail();
  }

  private async loadDetail() {
    if (this.taskId.length === 0) return;
    this.loading = true;
    const resp: ApiResponse<KolTaskDetail> = await HttpClient.get<KolTaskDetail>(
      '/api/kol-task/' + this.taskId + '/detail?userId=' + this.userId,
      (data: Record<string, Object>): KolTaskDetail => {
        return KolTaskDetail.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.detail = resp.data;
    }
    this.loading = false;
  }

  private async acceptTask() {
    this.accepting = true;
    const body: Record<string, Object> = {
      'taskId': this.taskId,
      'kolUserId': this.userId,
      'kolNickName': this.nickName,
    };
    const resp: ApiResponse<KolAcceptedTask> = await HttpClient.post<KolAcceptedTask>(
      '/api/kol-task/' + this.taskId + '/accept', toPostBody(body),
      (data: Record<string, Object>): KolAcceptedTask => {
        return KolAcceptedTask.fromJson(data);
      });
    this.accepting = false;
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '接任务成功！' });
      this.loadDetail();
    } else {
      promptAction.showToast({ message: resp.error || '接任务失败' });
    }
  }

  private async submitProof() {
    if (this.proofType === 'text' && this.proofText.length === 0) {
      promptAction.showToast({ message: '请填写交付内容' });
      return;
    }
    if (this.proofType === 'link' && this.proofUrl.length === 0) {
      promptAction.showToast({ message: '请填写交付链接' });
      return;
    }
    if (this.detail === null || this.detail.acceptance === null) return;
    this.submitting = true;
    const body: Record<string, Object> = {
      'taskId': this.taskId,
      'acceptanceId': this.detail.acceptance.id,
      'kolUserId': this.userId,
      'proofType': this.proofType,
      'proofUrl': this.proofUrl,
      'proofText': this.proofText,
    };
    const resp: ApiResponse<KolSubmissionResult> = await HttpClient.post<KolSubmissionResult>(
      '/api/kol-task/' + this.taskId + '/submit', toPostBody(body),
      (data: Record<string, Object>): KolSubmissionResult => {
        return KolSubmissionResult.fromJson(data);
      });
    this.submitting = false;
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '提交成功！奖励 ¥' + resp.data.reward.toFixed(2) });
      this.proofText = '';
      this.proofUrl = '';
      this.loadDetail();
    } else {
      promptAction.showToast({ message: resp.error || '提交失败' });
    }
  }

  private getAcceptStatusLabel(status: string): string {
    if (status === 'accepted') return '已接任务';
    if (status === 'in_progress') return '进行中';
    if (status === 'submitted') return '已提交';
    if (status === 'completed') return '已完成';
    if (status === 'expired') return '已过期';
    return status;
  }

  private getAcceptStatusColor(status: string): string {
    if (status === 'accepted') return '#007DFF';
    if (status === 'in_progress') return '#F59E0B';
    if (status === 'submitted') return '#6366F1';
    if (status === 'completed') return '#10B981';
    if (status === 'expired') return '#99182431';
    return '#99182431';
  }

  private getSubStatusLabel(status: string): string {
    if (status === 'pending') return '待审核';
    if (status === 'approved') return '已通过';
    if (status === 'rejected') return '未通过';
    return status;
  }

  private getSubStatusColor(status: string): ResourceColor {
    if (status === 'approved') return Color.Green;
    if (status === 'pending') return $r('app.color.primary_color');
    if (status === 'rejected') return Color.Red;
    return $r('app.color.text_secondary');
  }

  private getTaskTypeIcon(type: string): string {
    if (type === 'content') return 'sys.symbol.doc_text';
    if (type === 'video') return 'sys.symbol.video';
    if (type === 'share') return 'sys.symbol.share';
    if (type === 'booking') return 'sys.symbol.calendar';
    if (type === 'live') return 'sys.symbol.dot_radiowaves_left_and_right';
    return 'sys.symbol.list_bullet';
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

        Text('任务详情')
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
      } else if (this.detail !== null) {
        Scroll() {
          Column() {
            this.TaskInfoSection()

            if (this.detail.acceptance !== null) {
              this.AcceptanceSection()
            }

            Row() {
              Text('任务说明')
                .fontSize(15)
                .fontWeight(this.currentSection === 0 ? FontWeight.Bold : FontWeight.Normal)
                .fontColor(this.currentSection === 0 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
                .padding({ bottom: 8 })
                .borderWidth({ bottom: this.currentSection === 0 ? 2 : 0 })
                .borderColor($r('app.color.primary_color'))
                .onClick(() => { this.currentSection = 0; })

              Text('交付记录')
                .fontSize(15)
                .fontWeight(this.currentSection === 1 ? FontWeight.Bold : FontWeight.Normal)
                .fontColor(this.currentSection === 1 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
                .margin({ left: 20 })
                .padding({ bottom: 8 })
                .borderWidth({ bottom: this.currentSection === 1 ? 2 : 0 })
                .borderColor($r('app.color.primary_color'))
                .onClick(() => { this.currentSection = 1; })

              if (this.detail.canSubmit && this.detail.acceptance !== null) {
                Text('提交交付')
                  .fontSize(15)
                  .fontWeight(this.currentSection === 2 ? FontWeight.Bold : FontWeight.Normal)
                  .fontColor(this.currentSection === 2 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
                  .margin({ left: 20 })
                  .padding({ bottom: 8 })
                  .borderWidth({ bottom: this.currentSection === 2 ? 2 : 0 })
                  .borderColor($r('app.color.primary_color'))
                  .onClick(() => { this.currentSection = 2; })
              }
            }
            .width('100%')
            .padding({ left: 16, top: 12 })

            if (this.currentSection === 0) {
              this.TaskDescSection()
            } else if (this.currentSection === 1) {
              this.SubmissionsSection()
            } else {
              this.SubmitSection()
            }
          }
        }
        .layoutWeight(1)
      } else {
        Column() {
          Text('任务不存在')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  TaskInfoSection() {
    Column() {
      Row() {
        SymbolGlyph($r(this.getTaskTypeIcon(this.detail.task.type)))
          .fontSize(28)
          .fontColor([$r('app.color.primary_color')])
          .margin({ right: 12 })

        Column() {
          Text(this.detail.task.typeName)
            .fontSize(12)
            .fontColor(Color.White)
            .padding({ left: 8, right: 8, top: 2, bottom: 2 })
            .borderRadius(4)
            .backgroundColor($r('app.color.primary_color'))
            .alignSelf(ItemAlign.Start)
          Text(this.detail.task.title)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .margin({ top: 6 })
            .width('100%')
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
      }
      .width('100%')

      Row() {
        Column() {
          Text('¥' + this.detail.task.rewardPerUnit.toFixed(2))
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('每单奖励')
            .fontSize(11)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text('¥' + this.detail.task.totalRewardPool.toFixed(0))
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
          Text('奖励池')
            .fontSize(11)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text(this.detail.remainSlots.toString())
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.gold_color'))
          Text('剩余名额')
            .fontSize(11)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .margin({ top: 20 })

      Progress({
        value: this.detail.task.completedCount,
        total: Math.max(this.detail.task.targetCount, 1),
        type: ProgressType.Linear
      })
        .width('100%')
        .height(6)
        .color($r('app.color.gold_color'))
        .margin({ top: 12 })

      Row() {
        Text(this.detail.task.completedCount + '/' + this.detail.task.targetCount + ' 已完成')
          .fontSize(12)
          .fontColor(Color.White)
          .opacity(0.7)
        Blank()
        if (this.detail.bizNickName.length > 0) {
          Text('发布: ' + this.detail.bizNickName)
            .fontSize(12)
            .fontColor(Color.White)
            .opacity(0.7)
        }
      }
      .width('100%')
      .margin({ top: 4 })

      if (this.detail.activityTitle.length > 0) {
        Row() {
          Text('关联活动: ' + this.detail.activityTitle)
            .fontSize(12)
            .fontColor(Color.White)
            .opacity(0.7)
        }
        .width('100%')
        .margin({ top: 4 })
      }

      if (this.detail.canAccept && this.detail.acceptance === null) {
        Button(this.accepting ? '接取中...' : '立即接任务')
          .width('100%')
          .height(48)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .backgroundColor(Color.White)
          .fontColor($r('app.color.primary_color'))
          .borderRadius(24)
          .margin({ top: 20 })
          .enabled(!this.accepting)
          .onClick(() => this.acceptTask())
      } else if (this.detail.acceptance === null) {
        Row() {
          Text('名额已满或不符合接取条件')
            .fontSize(14)
            .fontColor(Color.White)
            .opacity(0.7)
        }
        .margin({ top: 16 })
      }
    }
    .width('100%')
    .padding(20)
    .borderRadius(12)
    .linearGradient({
      direction: GradientDirection.Right,
      colors: [['#007DFF', 0.0], ['#4F46E5', 0.5], ['#6366F1', 1.0]]
    })
    .margin({ left: 16, right: 16, top: 8 })
  }

  @Builder
  AcceptanceSection() {
    Column() {
      Row() {
        Text(this.getAcceptStatusLabel(this.detail.acceptance.status))
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.White)
          .padding({ left: 12, right: 12, top: 4, bottom: 4 })
          .borderRadius(6)
          .backgroundColor(this.getAcceptStatusColor(this.detail.acceptance.status))
        Blank()
        Text('已提交: ' + this.detail.acceptance.submissionCount + '/' + this.detail.acceptance.maxSubmissions)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')

      Row() {
        Column() {
          Text('¥' + this.detail.acceptance.earnedReward.toFixed(2))
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('已获奖励')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text('¥' + (this.detail.acceptance.rewardPerUnit * this.detail.acceptance.maxSubmissions).toFixed(2))
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.primary_color'))
          Text('可获总额')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        if (this.detail.acceptance.deadline.length > 0) {
          Column() {
            Text(this.detail.acceptance.deadline.slice(0, 10))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
            Text('截止日期')
              .fontSize(10)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)
        }
      }
      .width('100%')
      .margin({ top: 16 })

      if (this.detail.canSubmit && this.detail.acceptance.status !== 'completed' && this.detail.acceptance.status !== 'expired') {
        Button('提交交付物')
          .width('100%')
          .height(40)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.primary_color'))
          .fontColor(Color.White)
          .borderRadius(20)
          .margin({ top: 16 })
          .onClick(() => { this.currentSection = 2; })
      }
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .margin({ left: 16, right: 16, top: 12 })
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }

  @Builder
  TaskDescSection() {
    Column() {
      if (this.detail.task.description.length > 0) {
        Column() {
          Text('任务描述')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .width('100%')
          Text(this.detail.task.description)
            .fontSize(14)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 8 })
            .width('100%')
            .lineHeight(22)
        }
        .width('100%')
        .padding(16)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ left: 16, right: 16, top: 8 })
      }

      Column() {
        Text('任务要求')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .width('100%')

        this.RequireRow('任务类型', this.detail.task.typeName)
        this.RequireRow('单次奖励', '¥' + this.detail.task.rewardPerUnit.toFixed(2))
        this.RequireRow('目标数量', this.detail.task.targetCount.toString())
        this.RequireRow('奖励池', '¥' + this.detail.task.totalRewardPool.toFixed(0))
        this.RequireRow('已使用', '¥' + this.detail.task.usedReward.toFixed(0))
        if (this.detail.task.deadline.length > 0) {
          this.RequireRow('截止时间', this.detail.task.deadline.slice(0, 16).replace('T', ' '))
        }
        this.RequireRow('发布时间', this.detail.task.createdAt.slice(0, 10))
      }
      .width('100%')
      .padding(16)
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
      .margin({ left: 16, right: 16, top: 8 })
      .alignItems(HorizontalAlign.Start)

      Column() {
        Text('交付说明')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .width('100%')

        this.DeliveryGuideRow('内容类任务', '提交原创推广内容，AI评分加权奖励')
        this.DeliveryGuideRow('分享类任务', '提交分享截图/链接，按转化效果结算')
        this.DeliveryGuideRow('预约类任务', '提交预约记录，按有效预约结算')
        this.DeliveryGuideRow('视频类任务', '提交视频链接，按播放量加权结算')
        this.DeliveryGuideRow('直播类任务', '提交直播截图/回放链接，按时长结算')
      }
      .width('100%')
      .padding(16)
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
      .margin({ left: 16, right: 16, top: 8 })
      .alignItems(HorizontalAlign.Start)
    }
  }

  @Builder
  RequireRow(label: string, value: string) {
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
    .height(36)
  }

  @Builder
  DeliveryGuideRow(title: string, desc: string) {
    Row() {
      Column() {
        Text(title)
          .fontSize(14)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
        Text(desc)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 2 })
          .width('100%')
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 8, bottom: 8 })
  }

  @Builder
  SubmissionsSection() {
    Column() {
      if (this.detail.submissions.length === 0) {
        Column() {
          Text('暂无交付记录')
            .fontSize(15)
            .fontColor($r('app.color.text_secondary'))
          Text('接取任务后提交交付物，记录将在此展示')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
        }
        .width('100%')
        .padding(40)
        .alignItems(HorizontalAlign.Center)
      } else {
        ForEach(this.detail.submissions, (item: KolTaskSubmissionRecord) => {
          this.SubmissionCard(item)
        }, (item: KolTaskSubmissionRecord) => item.id)
      }
    }
  }

  @Builder
  SubmissionCard(item: KolTaskSubmissionRecord) {
    Column() {
      Row() {
        Text(item.proofType === 'link' ? '链接交付' : '文本交付')
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor(item.proofType === 'link' ? $r('app.color.purple_color') : $r('app.color.warning_color'))
        Text(this.getSubStatusLabel(item.status))
          .fontSize(12)
          .fontColor(this.getSubStatusColor(item.status))
          .fontWeight(FontWeight.Bold)
          .margin({ left: 8 })
        Blank()
        Text('+¥' + item.reward.toFixed(2))
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.price_color'))
      }
      .width('100%')

      if (item.proofText.length > 0) {
        Text(item.proofText)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 8 })
          .width('100%')
          .maxLines(3)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }

      if (item.proofUrl.length > 0) {
        Text(item.proofUrl)
          .fontSize(12)
          .fontColor($r('app.color.primary_color'))
          .margin({ top: 4 })
          .width('100%')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }

      if (item.aiScore !== null) {
        Row() {
          Text('AI评分:')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
          Text(' 质量' + item.aiScore.quality.toFixed(0))
            .fontSize(12)
            .fontColor($r('app.color.primary_color'))
          Text(' 传播' + item.aiScore.spread.toFixed(0))
            .fontSize(12)
            .fontColor($r('app.color.primary_color'))
          Text(' KOL' + item.aiScore.kol.toFixed(0))
            .fontSize(12)
            .fontColor($r('app.color.primary_color'))
          Text(' x' + item.aiScore.multiplier.toFixed(1))
            .fontSize(12)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
        }
        .margin({ top: 8 })
      }

      if (item.reviewNote.length > 0) {
        Text('审核备注: ' + item.reviewNote)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
          .width('100%')
      }

      Text(item.submittedAt.slice(0, 16).replace('T', ' '))
        .fontSize(11)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 4 })
        .width('100%')
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .margin({ left: 16, right: 16, top: 8 })
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }

  @Builder
  SubmitSection() {
    Column() {
      if (this.detail.acceptance === null) {
        Column() {
          Text('请先接取任务')
            .fontSize(15)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .padding(40)
        .alignItems(HorizontalAlign.Center)
      } else if (this.detail.acceptance.submissionCount >= this.detail.acceptance.maxSubmissions) {
        Column() {
          Text('已达到最大提交次数')
            .fontSize(15)
            .fontColor($r('app.color.text_secondary'))
          Text('已提交 ' + this.detail.acceptance.submissionCount + ' 次')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
        }
        .width('100%')
        .padding(40)
        .alignItems(HorizontalAlign.Center)
      } else {
        Column() {
          Text('提交交付物')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .width('100%')

          Text('剩余提交次数: ' + (this.detail.acceptance.maxSubmissions - this.detail.acceptance.submissionCount) + '/' + this.detail.acceptance.maxSubmissions)
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
            .width('100%')

          Text('交付方式')
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_primary'))
            .width('100%')
            .margin({ top: 16 })

          Row() {
            Row() {
              Radio({ value: 'link', group: 'proofType' })
                .checked(this.proofType === 'link')
                .onChange((checked: boolean) => { if (checked) { this.proofType = 'link'; } })
              Text('链接交付')
                .fontSize(14)
                .fontColor($r('app.color.text_primary'))
                .margin({ left: 8 })
            }

            Row() {
              Radio({ value: 'text', group: 'proofType' })
                .checked(this.proofType === 'text')
                .onChange((checked: boolean) => { if (checked) { this.proofType = 'text'; } })
              Text('文本交付')
                .fontSize(14)
                .fontColor($r('app.color.text_primary'))
                .margin({ left: 8 })
            }
            .margin({ left: 24 })
          }
          .margin({ top: 8 })

          if (this.proofType === 'link') {
            Text('交付链接')
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor($r('app.color.text_primary'))
              .width('100%')
              .margin({ top: 16 })
            TextInput({ placeholder: '输入内容链接/分享链接/截图链接' })
              .width('100%')
              .height(44)
              .margin({ top: 8 })
              .onChange((value: string) => { this.proofUrl = value; })
          }

          Text('交付说明')
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_primary'))
            .width('100%')
            .margin({ top: 16 })
          TextInput({ placeholder: '简述交付内容(选填)' })
            .width('100%')
            .height(44)
            .margin({ top: 8 })
            .onChange((value: string) => { this.proofText = value; })

          Row() {
            Text('提交即代表同意平台AI评分加权规则，奖励实时结算')
              .fontSize(12)
              .fontColor($r('app.color.text_secondary'))
          }
          .margin({ top: 12 })

          Button(this.submitting ? '提交中...' : '提交交付物')
            .width('100%')
            .height(48)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(24)
            .margin({ top: 20, bottom: 32 })
            .enabled(!this.submitting)
            .onClick(() => this.submitProof())
        }
        .width('100%')
        .padding(16)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ left: 16, right: 16, top: 8 })
        .alignItems(HorizontalAlign.Start)
      }
    }
  }
}
