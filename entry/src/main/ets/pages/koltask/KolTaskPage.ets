import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import { KolTaskItem, KolTaskList, KolSubmissionResult, KolEarningsData, BizCommissionItem, BizCommissionList, CommissionStats } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct KolTaskPage {
  @State tasks: KolTaskItem[] = [];
  @State myEarnings: KolEarningsData | null = null;
  @State commissions: BizCommissionItem[] = [];
  @State commissionStats: CommissionStats | null = null;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentTab: number = 0;
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await this.loadTasks();
    await this.loadEarnings();
    if (this.currentTab === 2) {
      await this.loadCommissions();
    }
    this.loading = false;
    this.refreshing = false;
  }

  private async loadTasks() {
    const path: string = this.currentTab === 0 ? '/api/kol-task/open' : '/api/kol-task/list?bizUserId=' + this.userId;
    const resp: ApiResponse<KolTaskItem[]> = await HttpClient.get<KolTaskItem[]>(path, (data: Record<string, Object>): KolTaskItem[] => {
      return KolTaskList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) {
      this.tasks = resp.data;
    }
  }

  private async loadEarnings() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<KolEarningsData> = await HttpClient.get<KolEarningsData>('/api/kol-task/kol/' + uid + '/earnings', (data: Record<string, Object>): KolEarningsData => {
      return KolEarningsData.fromJson(data);
    });
    if (resp.success && resp.data !== null) {
      this.myEarnings = resp.data;
    }
  }

  private async loadCommissions() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<BizCommissionItem[]> = await HttpClient.get<BizCommissionItem[]>('/api/biz/commission/list?kolUserId=' + uid, (data: Record<string, Object>): BizCommissionItem[] => {
      return BizCommissionList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) {
      this.commissions = resp.data;
    }
    await this.loadCommissionStats();
  }

  private async loadCommissionStats() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<CommissionStats> = await HttpClient.get<CommissionStats>('/api/biz/commission/stats?userId=' + uid, (data: Record<string, Object>): CommissionStats => {
      return CommissionStats.fromJson(data);
    });
    if (resp.success && resp.data !== null) {
      this.commissionStats = resp.data;
    }
  }

  private async acceptTask(task: KolTaskItem) {
    const body: Record<string, Object> = {
      'kolUserId': this.userId,
      'kolNickName': this.nickName,
      'proofData': {},
    };
    const resp: ApiResponse<KolSubmissionResult> = await HttpClient.post<KolSubmissionResult>(
      '/api/kol-task/' + task.id + '/submit', toPostBody(body), (data: Record<string, Object>): KolSubmissionResult => {
        return KolSubmissionResult.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '领取成功！奖励 ¥' + resp.data.reward.toFixed(2) });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '领取失败' });
    }
  }

  build() {
    Column() {
      Row() {
        Text('KOL任务中心')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.myEarnings !== null) {
        Row() {
          Column() {
            Text('¥' + this.myEarnings.totalEarnings.toFixed(2))
              .fontSize(22)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.price_color'))
            Text('累计收益')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text(this.myEarnings.completedTasks.toString())
              .fontSize(22)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
            Text('完成任务')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text(this.myEarnings.pendingCount.toString())
              .fontSize(22)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.primary_color'))
            Text('待结算')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)
        }
        .width('100%')
        .height(80)
        .margin({ left: 16, right: 16, top: 8 })
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
      }

      Row() {
        Text(this.currentTab === 0 ? '可领任务' : '可领任务')
          .fontSize(16)
          .fontWeight(this.currentTab === 0 ? FontWeight.Bold : FontWeight.Normal)
          .fontColor(this.currentTab === 0 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
          .padding({ bottom: 8 })
          .borderWidth({ bottom: this.currentTab === 0 ? 2 : 0 })
          .borderColor($r('app.color.primary_color'))
          .onClick(() => { this.currentTab = 0; this.loadTasks(); })

        Text('我发布的')
          .fontSize(16)
          .fontWeight(this.currentTab === 1 ? FontWeight.Bold : FontWeight.Normal)
          .fontColor(this.currentTab === 1 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
          .margin({ left: 24 })
          .padding({ bottom: 8 })
          .borderWidth({ bottom: this.currentTab === 1 ? 2 : 0 })
          .borderColor($r('app.color.primary_color'))
          .onClick(() => { this.currentTab = 1; this.loadTasks(); })

        Text('分佣记录')
          .fontSize(16)
          .fontWeight(this.currentTab === 2 ? FontWeight.Bold : FontWeight.Normal)
          .fontColor(this.currentTab === 2 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
          .margin({ left: 24 })
          .padding({ bottom: 8 })
          .borderWidth({ bottom: this.currentTab === 2 ? 2 : 0 })
          .borderColor($r('app.color.primary_color'))
          .onClick(() => { this.currentTab = 2; this.loadCommissions(); })
      }
      .width('100%')
      .padding({ left: 16, top: 12 })

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
      } else if (this.currentTab === 2) {
        if (this.commissionStats !== null) {
          Row() {
            Column() {
              Text('¥' + this.commissionStats.totalIncome.toFixed(2))
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.price_color'))
              Text('分佣总收入')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text(this.commissionStats.count.toString())
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
              Text('分佣笔数')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text('¥' + this.commissionStats.totalFee.toFixed(2))
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_secondary'))
              Text('平台手续费')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text('¥' + this.commissionStats.walletBalance.toFixed(2))
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.primary_color'))
              Text('钱包余额')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)
          }
          .width('100%')
          .height(76)
          .margin({ left: 16, right: 16, top: 8 })
          .borderRadius(12)
          .backgroundColor($r('app.color.card_background'))
          .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
        }

        if (this.commissions.length === 0) {
          Column() {
            Text('暂无分佣记录')
              .fontSize(16)
              .fontColor($r('app.color.text_secondary'))
          }
          .width('100%')
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
        } else {
          Refresh({ refreshing: $refreshing }) {
            List({ space: 12 }) {
              ForEach(this.commissions, (item: BizCommissionItem) => {
                ListItem() {
                  this.CommissionCard(item)
                }
              }, (item: BizCommissionItem) => item.id)
            }
            .width('100%')
            .layoutWeight(1)
            .padding({ left: 16, right: 16, top: 4 })
          }
          .onRefreshing(() => {
            this.loadData();
          })
        }
      } else if (this.tasks.length === 0) {
        Column() {
          Text(this.currentTab === 0 ? '暂无可领任务' : '暂无发布任务')
            .fontSize(16)
            .fontColor($r('app.color.text_secondary'))
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Refresh({ refreshing: $refreshing }) {
          List({ space: 12 }) {
            ForEach(this.tasks, (item: KolTaskItem) => {
              ListItem() {
                this.TaskCard(item)
              }
            }, (item: KolTaskItem) => item.id)
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: 16, right: 16, top: 4 })
        }
        .onRefreshing(() => {
          this.loadData();
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  TaskCard(item: KolTaskItem) {
    Column() {
      Row() {
        Text(item.typeName)
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor($r('app.color.primary_color'))
        Text(item.title)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .margin({ left: 8 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .width('100%')

      if (item.description.length > 0) {
        Text(item.description)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 6 })
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
      }

      Row() {
        Column() {
          Text('¥' + item.rewardPerUnit.toFixed(2))
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('每单奖励')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }

        Column() {
          Text(item.completedCount + '/' + item.targetCount)
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_primary'))
          Text('完成进度')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .margin({ left: 24 })

        Blank()

        if (item.status === 'open' && this.currentTab === 0) {
          Button('领取任务')
            .height(32)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(16)
            .onClick(() => this.acceptTask(item))
        } else {
          Text(item.status === 'completed' ? '已完成' : item.status === 'closed' ? '已关闭' : '进行中')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
        }
      }
      .width('100%')
      .margin({ top: 12 })
      .alignItems(VerticalAlign.Center)

      Progress({ value: item.completedCount, total: Math.max(item.targetCount, 1), type: ProgressType.Linear })
        .width('100%')
        .height(4)
        .color($r('app.color.primary_color'))
        .margin({ top: 8 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
  }

  @Builder
  CommissionCard(item: BizCommissionItem) {
    Column() {
      Row() {
        Text('分佣')
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor($r('app.color.price_color'))
        Text(item.taskTitle)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .margin({ left: 8 })
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text('+¥' + item.commissionAmount.toFixed(2))
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.price_color'))
      }
      .width('100%')

      Row() {
        Text('佣金率: ' + (item.commissionRate * 100).toFixed(1) + '%')
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Blank()
        Text(item.status === 'settled' ? '已结算' : item.status === 'pending' ? '待结算' : item.status)
          .fontSize(12)
          .fontColor(item.status === 'settled' ? Color.Green : $r('app.color.primary_color'))
      }
      .width('100%')
      .margin({ top: 8 })

      if (item.settlementTime.length > 0) {
        Text('结算时间: ' + item.settlementTime.slice(0, 16).replace('T', ' '))
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
          .width('100%')
      }
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: '#1A000000', offsetX: 0, offsetY: 2 })
  }
}
