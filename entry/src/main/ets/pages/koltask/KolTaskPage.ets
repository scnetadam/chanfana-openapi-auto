import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import {
  KolTaskItem, KolTaskList, KolSubmissionResult, KolEarningsData,
  BizCommissionItem, BizCommissionList, CommissionStats,
  KolAcceptedTask, KolAcceptedTaskList
} from '../../model/DataModels';
import { BrandPalette, BrandTypography, BrandRadius, BrandBadge } from '../../common/BrandCI';
import { router, promptAction } from '@kit.ArkUI';

@Component
export struct KolTaskPage {
  @State tasks: KolTaskItem[] = [];
  @State acceptedTasks: KolAcceptedTask[] = [];
  @State myEarnings: KolEarningsData | null = null;
  @State commissions: BizCommissionItem[] = [];
  @State commissionStats: CommissionStats | null = null;
  @State loading: boolean = true;
  @State refreshing: boolean = false;
  @State currentTab: number = 0;
  @State filterType: string = 'all';
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';

  private typeFilters: string[] = ['all', 'content', 'video', 'share', 'booking', 'live'];
  private typeLabels: Record<string, string> = {
    'all': '全部', 'content': '内容', 'video': '视频', 'share': '分享', 'booking': '预约', 'live': '直播',
  };

  aboutToAppear() { this.loadData(); }

  private async loadData() {
    this.loading = true;
    await Promise.all([this.loadTasks(), this.loadAcceptedTasks(), this.loadEarnings()]);
    if (this.currentTab === 3) { await this.loadCommissions(); }
    this.loading = false;
    this.refreshing = false;
  }

  private async loadTasks() {
    const path: string = this.currentTab === 1 ? '/api/kol-task/list?bizUserId=' + this.userId : '/api/kol-task/open';
    const resp: ApiResponse<KolTaskItem[]> = await HttpClient.get<KolTaskItem[]>(path, (data: Record<string, Object>): KolTaskItem[] => {
      return KolTaskList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) { this.tasks = resp.data; }
  }

  private async loadAcceptedTasks() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<KolAcceptedTask[]> = await HttpClient.get<KolAcceptedTask[]>(
      '/api/kol-task/my-accepted?kolUserId=' + uid,
      (data: Record<string, Object>): KolAcceptedTask[] => { return KolAcceptedTaskList.fromJson(data).list; });
    if (resp.success && resp.data !== null) { this.acceptedTasks = resp.data; }
  }

  private async loadEarnings() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<KolEarningsData> = await HttpClient.get<KolEarningsData>('/api/kol-task/kol/' + uid + '/earnings', (data: Record<string, Object>): KolEarningsData => {
      return KolEarningsData.fromJson(data);
    });
    if (resp.success && resp.data !== null) { this.myEarnings = resp.data; }
  }

  private async loadCommissions() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<BizCommissionItem[]> = await HttpClient.get<BizCommissionItem[]>('/api/biz/commission/list?kolUserId=' + uid, (data: Record<string, Object>): BizCommissionItem[] => {
      return BizCommissionList.fromJson(data).list;
    });
    if (resp.success && resp.data !== null) { this.commissions = resp.data; }
    await this.loadCommissionStats();
  }

  private async loadCommissionStats() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<CommissionStats> = await HttpClient.get<CommissionStats>('/api/biz/commission/stats?userId=' + uid, (data: Record<string, Object>): CommissionStats => {
      return CommissionStats.fromJson(data);
    });
    if (resp.success && resp.data !== null) { this.commissionStats = resp.data; }
  }

  private async acceptTask(task: KolTaskItem) {
    const body: Record<string, Object> = { 'taskId': task.id, 'kolUserId': this.userId, 'kolNickName': this.nickName };
    const resp: ApiResponse<KolAcceptedTask> = await HttpClient.post<KolAcceptedTask>(
      '/api/kol-task/' + task.id + '/accept', toPostBody(body),
      (data: Record<string, Object>): KolAcceptedTask => { return KolAcceptedTask.fromJson(data); });
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: '接任务成功！' });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '接任务失败' });
    }
  }

  private getFilteredTasks(): KolTaskItem[] {
    if (this.filterType === 'all') return this.tasks;
    const result: KolTaskItem[] = [];
    for (let i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].type === this.filterType) { result.push(this.tasks[i]); }
    }
    return result;
  }

  private getAcceptStatusLabel(status: string): string {
    if (status === 'accepted') return '已接取';
    if (status === 'in_progress') return '进行中';
    if (status === 'submitted') return '已提交';
    if (status === 'completed') return '已完成';
    if (status === 'expired') return '已过期';
    return status;
  }

  private getStatusBg(status: string): string {
    if (status === 'accepted' || status === 'completed') return BrandBadge.GREEN_BG;
    if (status === 'in_progress') return BrandBadge.GOLD_BG;
    if (status === 'submitted') return BrandBadge.PURPLE_BG;
    return BrandBadge.RED_BG;
  }

  private getStatusText(status: string): string {
    if (status === 'accepted' || status === 'completed') return BrandBadge.GREEN_TEXT;
    if (status === 'in_progress') return BrandBadge.GOLD_TEXT;
    if (status === 'submitted') return BrandBadge.PURPLE_TEXT;
    return BrandBadge.RED_TEXT;
  }

  private getTypeBg(type: string): string {
    if (type === 'content') return BrandBadge.GREEN_BG;
    if (type === 'video') return BrandBadge.PURPLE_BG;
    if (type === 'share') return BrandBadge.BLUE_BG;
    if (type === 'booking') return BrandBadge.GOLD_BG;
    if (type === 'live') return BrandBadge.RED_BG;
    return BrandBadge.GREEN_BG;
  }

  private getTypeText(type: string): string {
    if (type === 'content') return BrandBadge.GREEN_TEXT;
    if (type === 'video') return BrandBadge.PURPLE_TEXT;
    if (type === 'share') return BrandBadge.BLUE_TEXT;
    if (type === 'booking') return BrandBadge.GOLD_TEXT;
    if (type === 'live') return BrandBadge.RED_TEXT;
    return BrandBadge.GREEN_TEXT;
  }

  build() {
    Column() {
      Row() {
        Text('KOL任务中心')
          .fontSize(BrandTypography.PAGE_TITLE).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
        Blank()
        Text('TASKS').fontSize(10).fontColor(BrandPalette.NEON_BLUE).letterSpacing(2)
      }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.myEarnings !== null) {
        Row() {
          Column() {
            Text('\u00A5' + this.myEarnings.totalEarnings.toFixed(2))
              .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
            Text('累计收益').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
          }.layoutWeight(1).alignItems(HorizontalAlign.Center)
          Column() {
            Text(this.myEarnings.completedTasks.toString())
              .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
            Text('已完成').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
          }.layoutWeight(1).alignItems(HorizontalAlign.Center)
          Column() {
            Text(this.acceptedTasks.length.toString())
              .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
            Text('进行中').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
          }.layoutWeight(1).alignItems(HorizontalAlign.Center)
          Column() {
            Text(this.myEarnings.pendingCount.toString())
              .fontSize(20).fontWeight(FontWeight.Bold).fontColor(BrandPalette.NEON_BLUE)
            Text('待结算').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
          }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        }
        .width('100%').height(80).margin({ left: 16, right: 16, top: 8 })
        .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
        .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
      }

      Row() {
        this.TabLabel('可领任务', 0)
        this.TabLabel('已接任务', 2)
        this.TabLabel('我发布的', 1)
        this.TabLabel('分佣记录', 3)
      }.width('100%').padding({ left: 16, top: 12 })

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(BrandPalette.PRIMARY)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else if (this.currentTab === 0) {
        this.OpenTasksTab()
      } else if (this.currentTab === 2) {
        this.AcceptedTasksTab()
      } else if (this.currentTab === 3) {
        this.CommissionsTab()
      } else if (this.tasks.length === 0) {
        Column() {
          Text('暂无发布任务').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        this.TaskList()
      }
    }
    .width('100%').height('100%').backgroundColor(BrandPalette.DEEP_BG)
  }

  @Builder
  TabLabel(label: string, tab: number) {
    Column() {
      Text(label)
        .fontSize(14)
        .fontWeight(this.currentTab === tab ? FontWeight.Bold : FontWeight.Normal)
        .fontColor(this.currentTab === tab ? BrandPalette.PRIMARY : BrandPalette.TEXT_MUTED)
      if (this.currentTab === tab) {
        Column().width(16).height(2).borderRadius(1).backgroundColor(BrandPalette.PRIMARY)
          .shadow({ radius: 6, color: '#00E5A044', offsetX: 0, offsetY: 0 }).margin({ top: 4 })
      }
    }
    .margin({ right: 20 })
    .onClick(() => {
      this.currentTab = tab;
      if (tab === 0 || tab === 1) { this.loadTasks(); }
      else if (tab === 2) { this.loadAcceptedTasks(); }
      else if (tab === 3) { this.loadCommissions(); }
    })
  }

  @Builder
  OpenTasksTab() {
    Column() {
      Scroll() {
        Row() {
          ForEach(this.typeFilters, (type: string) => {
            Text(this.typeLabels[type])
              .fontSize(12)
              .fontColor(this.filterType === type ? BrandPalette.DEEP_BG : BrandPalette.TEXT_SECONDARY)
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
              .borderRadius(16)
              .backgroundColor(this.filterType === type ? BrandPalette.PRIMARY : BrandPalette.SURFACE)
              .margin({ right: 8 })
              .onClick(() => { this.filterType = type; })
          }, (type: string) => type)
        }
      }.scrollable(ScrollDirection.Horizontal).width('100%').padding({ left: 16, top: 8, bottom: 4 })

      if (this.getFilteredTasks().length === 0) {
        Column() {
          Text('暂无可领任务').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        this.TaskList()
      }
    }.layoutWeight(1)
  }

  @Builder
  TaskList() {
    Refresh({ refreshing: $refreshing }) {
      List({ space: 12 }) {
        ForEach(this.tasks, (item: KolTaskItem) => {
          ListItem() { this.TaskCard(item) }
        }, (item: KolTaskItem) => item.id)
      }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
    }.onRefreshing(() => { this.loadData(); })
  }

  @Builder
  AcceptedTasksTab() {
    if (this.acceptedTasks.length === 0) {
      Column() {
        Text('暂无已接任务').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
        Text('领取任务后将在此展示进度').fontSize(13).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 4 })
      }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
    } else {
      Refresh({ refreshing: $refreshing }) {
        List({ space: 12 }) {
          ForEach(this.acceptedTasks, (item: KolAcceptedTask) => {
            ListItem() { this.AcceptedTaskCard(item) }
          }, (item: KolAcceptedTask) => item.id)
        }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
      }.onRefreshing(() => { this.loadData(); })
    }
  }

  @Builder
  CommissionsTab() {
    if (this.commissionStats !== null) {
      Row() {
        Column() {
          Text('\u00A5' + this.commissionStats.totalIncome.toFixed(2))
            .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
          Text('分佣收入').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        Column() {
          Text(this.commissionStats.count.toString())
            .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          Text('分佣笔数').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
        Column() {
          Text('\u00A5' + this.commissionStats.walletBalance.toFixed(2))
            .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.PRIMARY)
          Text('钱包余额').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.layoutWeight(1).alignItems(HorizontalAlign.Center)
      }
      .width('100%').height(72).margin({ left: 16, right: 16, top: 8 })
      .borderRadius(BrandRadius.CARD).backgroundColor(BrandPalette.CARD_BG)
      .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
    }

    if (this.commissions.length === 0) {
      Column() {
        Text('暂无分佣记录').fontSize(16).fontColor(BrandPalette.TEXT_MUTED)
      }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
    } else {
      Refresh({ refreshing: $refreshing }) {
        List({ space: 12 }) {
          ForEach(this.commissions, (item: BizCommissionItem) => {
            ListItem() { this.CommissionCard(item) }
          }, (item: BizCommissionItem) => item.id)
        }.width('100%').layoutWeight(1).padding({ left: 16, right: 16, top: 4 })
      }.onRefreshing(() => { this.loadData(); })
    }
  }

  @Builder
  TaskCard(item: KolTaskItem) {
    Column() {
      Row() {
        Text(item.typeName)
          .fontSize(11).fontColor(this.getTypeText(item.type))
          .padding({ left: 8, right: 8, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(this.getTypeBg(item.type))
        Text(item.title)
          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1).margin({ left: 8 }).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
      }.width('100%')

      if (item.description.length > 0) {
        Text(item.description)
          .fontSize(13).fontColor(BrandPalette.TEXT_SECONDARY).margin({ top: 6 })
          .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis }).width('100%')
      }

      Row() {
        Column() {
          Text('\u00A5' + item.rewardPerUnit.toFixed(2))
            .fontSize(18).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
          Text('每单奖励').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }
        Column() {
          Text(item.completedCount + '/' + item.targetCount)
            .fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_PRIMARY)
          Text('完成进度').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.margin({ left: 24 })
        Blank()

        if (item.status === 'open' && this.currentTab === 0) {
          Row() {
            Button('接任务')
              .height(30).fontSize(12).fontWeight(FontWeight.Bold)
              .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG).borderRadius(15)
              .margin({ right: 8 })
              .onClick(() => this.acceptTask(item))
            Button('详情')
              .height(30).fontSize(12).fontWeight(FontWeight.Bold)
              .backgroundColor(Color.Transparent).fontColor(BrandPalette.PRIMARY).borderRadius(15)
              .borderWidth(1).borderColor(BrandPalette.PRIMARY)
              .onClick(() => { router.pushUrl({ url: 'pages/koltaskdetail/KolTaskDetailPage', params: { taskId: item.id } }); })
          }
        } else {
          Text(item.status === 'completed' ? 'DONE' : item.status === 'closed' ? 'CLOSED' : 'ACTIVE')
            .fontSize(10).fontColor(BrandPalette.TEXT_MUTED).letterSpacing(1)
        }
      }.width('100%').margin({ top: 12 }).alignItems(VerticalAlign.Center)

      Progress({ value: item.completedCount, total: Math.max(item.targetCount, 1), type: ProgressType.Linear })
        .width('100%').height(4).color(BrandPalette.PRIMARY).backgroundColor('#00E5A015').margin({ top: 8 })
    }
    .width('100%').padding(16).borderRadius(BrandRadius.CARD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }

  @Builder
  AcceptedTaskCard(item: KolAcceptedTask) {
    Column() {
      Row() {
        Text(item.typeName)
          .fontSize(11).fontColor(this.getStatusText(item.status))
          .padding({ left: 8, right: 8, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(this.getStatusBg(item.status))
        Text(item.taskTitle)
          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1).margin({ left: 8 }).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
      }.width('100%')

      Row() {
        Text(this.getAcceptStatusLabel(item.status))
          .fontSize(11).fontColor(this.getStatusText(item.status))
          .padding({ left: 8, right: 8, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(this.getStatusBg(item.status))
        Blank()
        Text('\u00A5' + item.earnedReward.toFixed(2))
          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
      }.width('100%').margin({ top: 8 })

      Row() {
        Column() {
          Text('\u00A5' + item.rewardPerUnit.toFixed(2))
            .fontSize(14).fontWeight(FontWeight.Bold).fontColor(BrandPalette.TEXT_PRIMARY)
          Text('每单奖励').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }
        Column() {
          Text(item.submissionCount + '/' + item.maxSubmissions)
            .fontSize(14).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_PRIMARY)
          Text('提交进度').fontSize(10).fontColor(BrandPalette.TEXT_MUTED).margin({ top: 2 })
        }.margin({ left: 24 })
        Blank()
        if (item.bizNickName.length > 0) {
          Text('发布: ' + item.bizNickName).fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
        }
      }.width('100%').margin({ top: 8 }).alignItems(VerticalAlign.Center)

      Progress({ value: item.submissionCount, total: Math.max(item.maxSubmissions, 1), type: ProgressType.Linear })
        .width('100%').height(4)
        .color(this.getStatusText(item.status))
        .backgroundColor('#00E5A015').margin({ top: 8 })

      Row() {
        if (item.status !== 'completed' && item.status !== 'expired') {
          Button('提交交付')
            .height(30).fontSize(12).fontWeight(FontWeight.Bold)
            .backgroundColor(BrandPalette.PRIMARY).fontColor(BrandPalette.DEEP_BG).borderRadius(15).margin({ right: 8 })
            .onClick(() => { router.pushUrl({ url: 'pages/koltaskdetail/KolTaskDetailPage', params: { taskId: item.taskId } }); })
        }
        Button('查看详情')
          .height(30).fontSize(12).fontWeight(FontWeight.Bold)
          .backgroundColor(Color.Transparent).fontColor(BrandPalette.PRIMARY).borderRadius(15)
          .borderWidth(1).borderColor(BrandPalette.PRIMARY)
          .onClick(() => { router.pushUrl({ url: 'pages/koltaskdetail/KolTaskDetailPage', params: { taskId: item.taskId } }); })
      }.width('100%').justifyContent(FlexAlign.End).margin({ top: 12 })
    }
    .width('100%').padding(16).borderRadius(BrandRadius.CARD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }

  @Builder
  CommissionCard(item: BizCommissionItem) {
    Column() {
      Row() {
        Text('COMMISSION')
          .fontSize(9).fontColor(BrandPalette.GOLD).letterSpacing(1)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 }).borderRadius(4)
          .backgroundColor(BrandBadge.GOLD_BG)
        Text(item.taskTitle)
          .fontSize(15).fontWeight(FontWeight.Medium).fontColor(BrandPalette.TEXT_PRIMARY)
          .layoutWeight(1).margin({ left: 8 }).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
        Text('+\u00A5' + item.commissionAmount.toFixed(2))
          .fontSize(16).fontWeight(FontWeight.Bold).fontColor(BrandPalette.GOLD)
      }.width('100%')

      Row() {
        Text('佣金率: ' + (item.commissionRate * 100).toFixed(1) + '%')
          .fontSize(12).fontColor(BrandPalette.TEXT_MUTED)
        Blank()
        Text(item.status === 'settled' ? '已结算' : '待结算')
          .fontSize(12)
          .fontColor(item.status === 'settled' ? BrandPalette.PRIMARY : BrandPalette.NEON_BLUE)
      }.width('100%').margin({ top: 8 })
    }
    .width('100%').padding(16).borderRadius(BrandRadius.CARD)
    .backgroundColor(BrandPalette.CARD_BG)
    .border({ width: 0.5, color: BrandPalette.DIVIDER, style: BorderStyle.Solid })
  }
}

