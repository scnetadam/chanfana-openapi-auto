import { HttpClient, ApiResponse, toPostBody } from '../../common/HttpClient';
import {
  OpcCitySubsidy, OpcCitySubsidyList, OpcSubsidyRecord, OpcSubsidyRecordList,
  OpcTokenAccount, OpcAiInvestProject, OpcAiInvestList, OpcPlazaStats
} from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';

@Entry
@Component
struct OpcPlazaPage {
  @State plazaStats: OpcPlazaStats | null = null;
  @State citySubsidies: OpcCitySubsidy[] = [];
  @State subsidyRecords: OpcSubsidyRecord[] = [];
  @State aiInvestProjects: OpcAiInvestProject[] = [];
  @State tokenAccount: OpcTokenAccount | null = null;
  @State loading: boolean = true;
  @State currentTab: number = 0;
  @State applying: boolean = false;
  @State selectedCity: string = '';
  @StorageProp('userId') userId: string = '';
  @StorageProp('nickName') nickName: string = '';

  aboutToAppear() {
    this.loadData();
  }

  private async loadData() {
    this.loading = true;
    await Promise.all([
      this.loadPlazaStats(),
      this.loadCitySubsidies(),
      this.loadTokenAccount(),
    ]);
    this.loading = false;
  }

  private async loadPlazaStats() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<OpcPlazaStats> = await HttpClient.get<OpcPlazaStats>(
      '/api/opc/plaza/stats?userId=' + uid,
      (data: Record<string, Object>): OpcPlazaStats => {
        return OpcPlazaStats.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.plazaStats = resp.data;
      if (this.plazaStats.myCity.length > 0) {
        this.selectedCity = this.plazaStats.myCity;
      }
    }
  }

  private async loadCitySubsidies() {
    const resp: ApiResponse<OpcCitySubsidy[]> = await HttpClient.get<OpcCitySubsidy[]>(
      '/api/opc/plaza/cities',
      (data: Record<string, Object>): OpcCitySubsidy[] => {
        return OpcCitySubsidyList.fromJson(data).list;
      });
    if (resp.success && resp.data !== null) {
      this.citySubsidies = resp.data;
    }
  }

  private async loadSubsidyRecords() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<OpcSubsidyRecord[]> = await HttpClient.get<OpcSubsidyRecord[]>(
      '/api/opc/plaza/my-subsidies?userId=' + uid,
      (data: Record<string, Object>): OpcSubsidyRecord[] => {
        return OpcSubsidyRecordList.fromJson(data).list;
      });
    if (resp.success && resp.data !== null) {
      this.subsidyRecords = resp.data;
    }
  }

  private async loadAiInvestProjects() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<OpcAiInvestProject[]> = await HttpClient.get<OpcAiInvestProject[]>(
      '/api/opc/plaza/ai-invest?userId=' + uid,
      (data: Record<string, Object>): OpcAiInvestProject[] => {
        return OpcAiInvestList.fromJson(data).list;
      });
    if (resp.success && resp.data !== null) {
      this.aiInvestProjects = resp.data;
    }
  }

  private async loadTokenAccount() {
    const uid: string = this.userId;
    if (uid.length === 0) return;
    const resp: ApiResponse<OpcTokenAccount> = await HttpClient.get<OpcTokenAccount>(
      '/api/opc/plaza/token-account?userId=' + uid,
      (data: Record<string, Object>): OpcTokenAccount => {
        return OpcTokenAccount.fromJson(data);
      });
    if (resp.success && resp.data !== null) {
      this.tokenAccount = resp.data;
    }
  }

  private async applyCitySubsidy(city: string) {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'city': city,
    };
    const resp: ApiResponse<OpcSubsidyRecord> = await HttpClient.post<OpcSubsidyRecord>(
      '/api/opc/plaza/apply-subsidy', toPostBody(body),
      (data: Record<string, Object>): OpcSubsidyRecord => {
        return OpcSubsidyRecord.fromJson(data);
      });
    this.applying = false;
    if (resp.success) {
      promptAction.showToast({ message: '补贴申请已提交！' });
      this.loadData();
    } else {
      promptAction.showToast({ message: resp.error || '申请失败' });
    }
  }

  private async createAiInvest() {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'projectName': 'AI推广投资-' + this.selectedCity,
      'aiModelType': 'glm-4',
      'investAmount': 100,
      'city': this.selectedCity,
    };
    const resp: ApiResponse<OpcAiInvestProject> = await HttpClient.post<OpcAiInvestProject>(
      '/api/opc/plaza/ai-invest/create', toPostBody(body),
      (data: Record<string, Object>): OpcAiInvestProject => {
        return OpcAiInvestProject.fromJson(data);
      });
    this.applying = false;
    if (resp.success && resp.data !== null) {
      promptAction.showToast({ message: 'AI投资已创建，补贴比例 ' + (resp.data.subsidyRate * 100).toFixed(0) + '%' });
      this.loadAiInvestProjects();
    } else {
      promptAction.showToast({ message: resp.error || '创建失败' });
    }
  }

  private async claimTokenSubsidy() {
    this.applying = true;
    const body: Record<string, Object> = {
      'userId': this.userId,
      'city': this.selectedCity,
    };
    const resp: ApiResponse<OpcTokenAccount> = await HttpClient.post<OpcTokenAccount>(
      '/api/opc/plaza/claim-token', toPostBody(body),
      (data: Record<string, Object>): OpcTokenAccount => {
        return OpcTokenAccount.fromJson(data);
      });
    this.applying = false;
    if (resp.success && resp.data !== null) {
      this.tokenAccount = resp.data;
      promptAction.showToast({ message: 'TOKEN补贴已领取！' });
    } else {
      promptAction.showToast({ message: resp.error || '领取失败' });
    }
  }

  private getCityLevelLabel(level: string): string {
    if (level === 'tier1') return '一线';
    if (level === 'new1') return '新一线';
    if (level === 'tier2') return '二线';
    if (level === 'tier3') return '三线';
    return level;
  }

  private getCityLevelColor(level: string): string {
    if (level === 'tier1') return '#E84026';
    if (level === 'new1') return '#F59E0B';
    if (level === 'tier2') return '#007DFF';
    return '#10B981';
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

        Text('OPC创业广场')
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
        Column() {
          if (this.plazaStats !== null) {
            this.StatsBanner()
          }

          Row() {
            Text('城市补贴')
              .fontSize(15)
              .fontWeight(this.currentTab === 0 ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === 0 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
              .padding({ bottom: 8 })
              .borderWidth({ bottom: this.currentTab === 0 ? 2 : 0 })
              .borderColor($r('app.color.primary_color'))
              .onClick(() => { this.currentTab = 0; })

            Text('AI投资补贴')
              .fontSize(15)
              .fontWeight(this.currentTab === 1 ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === 1 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
              .margin({ left: 20 })
              .padding({ bottom: 8 })
              .borderWidth({ bottom: this.currentTab === 1 ? 2 : 0 })
              .borderColor($r('app.color.primary_color'))
              .onClick(() => {
                this.currentTab = 1;
                this.loadAiInvestProjects();
              })

            Text('TOKEN补贴')
              .fontSize(15)
              .fontWeight(this.currentTab === 2 ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === 2 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
              .margin({ left: 20 })
              .padding({ bottom: 8 })
              .borderWidth({ bottom: this.currentTab === 2 ? 2 : 0 })
              .borderColor($r('app.color.primary_color'))
              .onClick(() => {
                this.currentTab = 2;
                this.loadSubsidyRecords();
              })

            Text('我的补贴')
              .fontSize(15)
              .fontWeight(this.currentTab === 3 ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.currentTab === 3 ? $r('app.color.primary_color') : $r('app.color.text_secondary'))
              .margin({ left: 20 })
              .padding({ bottom: 8 })
              .borderWidth({ bottom: this.currentTab === 3 ? 2 : 0 })
              .borderColor($r('app.color.primary_color'))
              .onClick(() => {
                this.currentTab = 3;
                this.loadSubsidyRecords();
              })
          }
          .width('100%')
          .padding({ left: 16, top: 4 })

          Scroll() {
            Column() {
              if (this.currentTab === 0) {
                this.CitySubsidyTab()
              } else if (this.currentTab === 1) {
                this.AiInvestTab()
              } else if (this.currentTab === 2) {
                this.TokenSubsidyTab()
              } else {
                this.MySubsidyTab()
              }
            }
          }
          .layoutWeight(1)
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  StatsBanner() {
    Column() {
      Row() {
        Column() {
          Text((this.plazaStats !== null ? this.plazaStats.activeCities : 0).toString())
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
          Text('补贴城市')
            .fontSize(11)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text('¥' + (this.plazaStats !== null ? this.plazaStats.totalSubsidyPool.toFixed(0) : '0'))
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
          Text('补贴池总额')
            .fontSize(11)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text((this.plazaStats !== null ? this.plazaStats.totalOpcUsers : 0).toString())
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
          Text('OPC创业者')
            .fontSize(11)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .margin({ top: 16 })

      Divider().color('#33FFFFFF').margin({ top: 16 })

      Row() {
        Column() {
          Text('¥' + (this.plazaStats !== null ? this.plazaStats.myPromoSubsidy.toFixed(2) : '0.00'))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.gold_color'))
          Text('我的推广补贴')
            .fontSize(10)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text('¥' + (this.plazaStats !== null ? this.plazaStats.myAiSubsidy.toFixed(2) : '0.00'))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.gold_color'))
          Text('我的AI补贴')
            .fontSize(10)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text((this.plazaStats !== null ? this.plazaStats.myTokenSubsidy.toFixed(0) : '0'))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.gold_color'))
          Text('我的TOKEN')
            .fontSize(10)
            .fontColor(Color.White)
            .opacity(0.8)
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .margin({ top: 12 })

      if (this.plazaStats !== null && this.plazaStats.myCity.length > 0) {
        Text('所在城市: ' + this.plazaStats.myCity + ' · ' + this.getOpcStatusLabel(this.plazaStats.myOpcStatus))
          .fontSize(12)
          .fontColor(Color.White)
          .opacity(0.7)
          .margin({ top: 8 })
          .width('100%')
          .textAlign(TextAlign.Center)
      }
    }
    .width('100%')
    .padding(20)
    .borderRadius(12)
    .linearGradient({
      direction: GradientDirection.Right,
      colors: [['#6366F1', 0.0], ['#4F46E5', 0.5], ['#7C3AED', 1.0]]
    })
    .margin({ left: 16, right: 16, top: 8 })
  }

  private getOpcStatusLabel(status: string): string {
    if (status === 'active') return '已激活';
    if (status === 'pending') return '审核中';
    if (status === 'expired') return '已过期';
    return '未激活';
  }

  @Builder
  CitySubsidyTab() {
    Column() {
      Text('按城市给予推广补贴政策扶持')
        .fontSize(14)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 8, bottom: 12 })
        .width('100%')
        .padding({ left: 16 })

      if (this.citySubsidies.length === 0) {
        this.EmptyCityList()
      } else {
        ForEach(this.citySubsidies, (item: OpcCitySubsidy) => {
          this.CitySubsidyCard(item)
        }, (item: OpcCitySubsidy) => item.id)
      }
    }
  }

  @Builder
  EmptyCityList() {
    Column() {
      Text('暂无城市补贴政策')
        .fontSize(15)
        .fontColor($r('app.color.text_secondary'))
      Text('请先完成OPC认证')
        .fontSize(13)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 4 })
      Button('前往OPC认证')
        .height(36)
        .fontSize(14)
        .backgroundColor($r('app.color.primary_color'))
        .fontColor(Color.White)
        .borderRadius(18)
        .margin({ top: 16 })
        .onClick(() => {
          router.pushUrl({ url: 'pages/opcsupport/OpcSupportPage' });
        })
    }
    .width('100%')
    .padding(40)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  CitySubsidyCard(item: OpcCitySubsidy) {
    Column() {
      Row() {
        Column() {
          Text(item.city)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
          Text(item.province)
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .alignItems(HorizontalAlign.Start)

        Blank()

        Column() {
          Text(this.getCityLevelLabel(item.cityLevel))
            .fontSize(12)
            .fontColor(Color.White)
            .padding({ left: 8, right: 8, top: 3, bottom: 3 })
            .borderRadius(4)
            .backgroundColor(this.getCityLevelColor(item.cityLevel))
          Text(item.opcCount.toString() + ' OPC')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
        }
        .alignItems(HorizontalAlign.End)
      }
      .width('100%')

      if (item.description.length > 0) {
        Text(item.description)
          .fontSize(13)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 8 })
          .width('100%')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }

      Row() {
        Column() {
          Text((item.promoSubsidyRate * 100).toFixed(0) + '%')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('推广补贴率')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text((item.aiInvestSubsidyRate * 100).toFixed(0) + '%')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.purple_color'))
           Text('AI投资补贴率')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text('+' + (item.tokenBonusRate * 100).toFixed(0) + '%')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.success_color'))
           Text('TOKEN加成')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .margin({ top: 12 })
      .padding(12)
      .borderRadius(8)
      .backgroundColor($r('app.color.page_background_color'))

      Row() {
        Column() {
          Text('推广上限 ¥' + item.promoSubsidyCap.toFixed(0))
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
        }
        .layoutWeight(1)

        Column() {
          Text('AI上限 ¥' + item.aiInvestSubsidyCap.toFixed(0))
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
        }
        .layoutWeight(1)

        Column() {
          Text('TOKEN上限 ' + item.tokenBonusCap.toFixed(0))
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
        }
        .layoutWeight(1)
      }
      .width('100%')
      .margin({ top: 4 })

      if (item.highlights.length > 0) {
        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(item.highlights, (hl: string, index: number) => {
            Text(hl)
              .fontSize(11)
              .fontColor($r('app.color.primary_color'))
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .borderRadius(4)
              .backgroundColor('#1A007DFF')
              .margin({ right: 6, top: 6 })
          }, (hl: string, index: number) => hl + '_' + index.toString())
        }
        .width('100%')
        .margin({ top: 8 })
      }

      Row() {
        Text('已发放 ¥' + item.totalSubsidyIssued.toFixed(0))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .layoutWeight(1)

        if (item.status === 'active') {
          Button('申请补贴')
            .height(32)
            .fontSize(13)
            .fontWeight(FontWeight.Bold)
            .backgroundColor($r('app.color.primary_color'))
            .fontColor(Color.White)
            .borderRadius(16)
            .enabled(!this.applying)
            .onClick(() => {
              this.selectedCity = item.city;
              this.applyCitySubsidy(item.city);
            })
        } else {
          Text(item.status === 'coming' ? '即将开放' : '已结束')
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
        }
      }
      .width('100%')
      .margin({ top: 12 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .margin({ left: 16, right: 16, top: 8 })
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }

  @Builder
  AiInvestTab() {
    Column() {
      Column() {
        Row() {
          Column() {
            Text('AI投资补贴计划')
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.text_primary'))
              .width('100%')
            Text('投资AI工具获城市专项补贴，放大推广收益')
              .fontSize(13)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 4 })
              .width('100%')
          }
          .layoutWeight(1)
        }
        .width('100%')

        Row() {
          Column() {
            Text('补贴范围')
              .fontSize(12)
              .fontColor($r('app.color.text_secondary'))
              .width('100%')
            Text('· AI内容生成工具投资')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 4 })
              .width('100%')
            Text('· AI视频制作工具投资')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 2 })
              .width('100%')
            Text('· AI数据分析工具投资')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 2 })
              .width('100%')
            Text('· AI语音合成工具投资')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 2 })
              .width('100%')
          }
          .layoutWeight(1)

          Column() {
            Text('补贴机制')
              .fontSize(12)
              .fontColor($r('app.color.text_secondary'))
              .width('100%')
            Text('· 按城市等级差异化补贴率')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 4 })
              .width('100%')
            Text('· 一线最高补贴50%投资额')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 2 })
              .width('100%')
            Text('· 新一线最高补贴40%投资额')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 2 })
              .width('100%')
            Text('· 补贴自动计入OPC收益账户')
              .fontSize(13)
              .fontColor($r('app.color.text_primary'))
              .margin({ top: 2 })
              .width('100%')
          }
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ top: 12 })

        Button('发起AI投资')
          .width('100%')
          .height(44)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.purple_color'))
          .fontColor(Color.White)
          .borderRadius(22)
          .margin({ top: 16 })
          .enabled(!this.applying && this.selectedCity.length > 0)
          .onClick(() => this.createAiInvest())
      }
      .width('100%')
      .padding(16)
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
      .margin({ left: 16, right: 16, top: 8 })

      if (this.aiInvestProjects.length > 0) {
        Text('我的AI投资项目')
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .margin({ left: 16, top: 16, bottom: 4 })

        ForEach(this.aiInvestProjects, (item: OpcAiInvestProject) => {
          this.AiInvestCard(item)
        }, (item: OpcAiInvestProject) => item.id)
      }
    }
  }

  @Builder
  AiInvestCard(item: OpcAiInvestProject) {
    Column() {
      Row() {
        Column() {
          Text(item.projectName)
            .fontSize(15)
            .fontWeight(FontWeight.Medium)
            .fontColor($r('app.color.text_primary'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1)
          Text(item.aiModelType)
            .fontSize(12)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)

        Column() {
          Text(this.getInvestStatusLabel(item.status))
            .fontSize(12)
            .fontColor(Color.White)
            .padding({ left: 8, right: 8, top: 2, bottom: 2 })
            .borderRadius(4)
            .backgroundColor(this.getInvestStatusColor(item.status))
        }
      }
      .width('100%')

      Row() {
        Column() {
          Text('¥' + item.investAmount.toFixed(0))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
          Text('投资额')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }

        Column() {
          Text((item.subsidyRate * 100).toFixed(0) + '%')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.purple_color'))
           Text('补贴率')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .margin({ left: 24 })

        Column() {
          Text('¥' + item.subsidyAmount.toFixed(0))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.success_color'))
           Text('补贴金额')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .margin({ left: 24 })

        Blank()

        Column() {
          Text('¥' + item.actualReturn.toFixed(0))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
          Text('实际回报')
            .fontSize(10)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
      }
      .width('100%')
      .margin({ top: 12 })
      .alignItems(VerticalAlign.Center)

      Row() {
        Text(item.city)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Blank()
        Text(item.createdAt.slice(0, 10))
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .margin({ top: 8 })
    }
    .width('100%')
    .padding(16)
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .margin({ left: 16, right: 16, top: 8 })
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }

  private getInvestStatusLabel(status: string): string {
    if (status === 'active') return '投资中';
    if (status === 'completed') return '已回报';
    if (status === 'pending') return '审核中';
    return status;
  }

  private getInvestStatusColor(status: string): string {
    if (status === 'active') return '#10B981';
    if (status === 'completed') return '#007DFF';
    if (status === 'pending') return '#F59E0B';
    return '#99182431';
  }

  @Builder
  TokenSubsidyTab() {
    Column() {
      if (this.tokenAccount !== null) {
        Column() {
          Row() {
            Column() {
              Text(this.tokenAccount.availableTokens.toFixed(0))
                .fontSize(28)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.success_color'))
              Text('可用TOKEN')
                .fontSize(12)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text(this.tokenAccount.totalTokens.toFixed(0))
                .fontSize(28)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
              Text('累计TOKEN')
                .fontSize(12)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text(this.tokenAccount.lockedTokens.toFixed(0))
                .fontSize(28)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_secondary'))
              Text('冻结TOKEN')
                .fontSize(12)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)
          }
          .width('100%')

          Divider().margin({ top: 16, bottom: 12 })

          Row() {
            Column() {
              Text(this.tokenAccount.earnedTokens.toFixed(0))
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.primary_color'))
              Text('推广获得')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text(this.tokenAccount.subsidyTokens.toFixed(0))
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
.fontColor($r('app.color.success_color'))
               Text('补贴获得')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text(this.tokenAccount.spentTokens.toFixed(0))
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.price_color'))
              Text('已使用')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)

            Column() {
              Text('¥' + this.tokenAccount.exchangeRate.toFixed(4))
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor($r('app.color.text_primary'))
              Text('兑换汇率')
                .fontSize(10)
                .fontColor($r('app.color.text_secondary'))
                .margin({ top: 2 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Center)
          }
          .width('100%')
        }
        .width('100%')
        .padding(20)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ left: 16, right: 16, top: 8 })

        Column() {
          Text('TOKEN补贴政策')
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
            .width('100%')

          this.TokenPolicyRow('推广产出TOKEN', '每完成推广任务，按效果产出TOKEN');
          this.TokenPolicyRow('城市加成补贴', '按城市等级额外加成TOKEN奖励');
          this.TokenPolicyRow('AI投资返TOKEN', 'AI投资回报部分以TOKEN形式发放');
          this.TokenPolicyRow('TOKEN兑换人民币', '按实时汇率兑换，T+1到账');
          this.TokenPolicyRow('TOKEN质押增值', '质押TOKEN获取额外年化收益');
        }
        .width('100%')
        .padding(16)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ left: 16, right: 16, top: 12 })

        Button('领取城市TOKEN补贴')
          .width('90%')
          .height(48)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .backgroundColor($r('app.color.success_color'))
          .fontColor(Color.White)
          .borderRadius(24)
          .margin({ top: 16 })
          .enabled(!this.applying)
          .onClick(() => this.claimTokenSubsidy())
      } else {
        Column() {
          Text('TOKEN补贴')
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.text_primary'))
          Text('完成OPC认证后即可领取城市TOKEN补贴')
            .fontSize(14)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 8 })
          Button('前往认证')
            .height(36)
            .fontSize(14)
            .backgroundColor($r('app.color.success_color'))
            .fontColor(Color.White)
            .borderRadius(18)
            .margin({ top: 16 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/opcsupport/OpcSupportPage' });
            })
        }
        .width('100%')
        .padding(40)
        .alignItems(HorizontalAlign.Center)
      }
    }
  }

  @Builder
  TokenPolicyRow(title: string, desc: string) {
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
    .padding({ top: 10, bottom: 10 })
  }

  @Builder
  MySubsidyTab() {
    Column() {
      if (this.plazaStats !== null) {
        Row() {
          Column() {
            Text('¥' + this.plazaStats.myPromoSubsidy.toFixed(2))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.price_color'))
            Text('推广补贴')
              .fontSize(10)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text('¥' + this.plazaStats.myAiSubsidy.toFixed(2))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.purple_color'))
            Text('AI投资补贴')
              .fontSize(10)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)

          Column() {
            Text(this.plazaStats.myTokenSubsidy.toFixed(0))
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.success_color'))
            Text('TOKEN补贴')
              .fontSize(10)
              .fontColor($r('app.color.text_secondary'))
              .margin({ top: 2 })
          }
          .layoutWeight(1)
          .alignItems(HorizontalAlign.Center)
        }
        .width('100%')
        .height(76)
        .borderRadius(12)
        .backgroundColor($r('app.color.card_background'))
        .margin({ left: 16, right: 16, top: 8 })
        .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
      }

      if (this.subsidyRecords.length === 0) {
        Column() {
          Text('暂无补贴记录')
            .fontSize(15)
            .fontColor($r('app.color.text_secondary'))
          Text('申请城市补贴后记录将在此展示')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 4 })
        }
        .width('100%')
        .padding(40)
        .alignItems(HorizontalAlign.Center)
      } else {
        ForEach(this.subsidyRecords, (item: OpcSubsidyRecord) => {
          this.SubsidyRecordCard(item)
        }, (item: OpcSubsidyRecord) => item.id)
      }
    }
  }

  @Builder
  SubsidyRecordCard(item: OpcSubsidyRecord) {
    Column() {
      Row() {
        Text(this.getSubsidyTypeLabel(item.subsidyType))
          .fontSize(12)
          .fontColor(Color.White)
          .padding({ left: 8, right: 8, top: 2, bottom: 2 })
          .borderRadius(4)
          .backgroundColor(this.getSubsidyTypeColor(item.subsidyType))
        Text(item.city)
          .fontSize(14)
          .fontColor($r('app.color.text_primary'))
          .margin({ left: 8 })

        Blank()

        if (item.subsidyType === 'token') {
          Text('+' + item.tokenAmount.toFixed(0) + ' TOKEN')
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.success_color'))
        } else {
          Text('+¥' + item.amount.toFixed(2))
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.price_color'))
        }
      }
      .width('100%')

      Row() {
        Text(item.bizSource)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
        Blank()
        Text(item.status === 'approved' ? '已发放' : item.status === 'pending' ? '审核中' : item.status)
          .fontSize(12)
          .fontColor(item.status === 'approved' ? Color.Green : $r('app.color.primary_color'))
      }
      .width('100%')
      .margin({ top: 8 })

      if (item.auditNote.length > 0) {
        Text('备注: ' + item.auditNote)
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
          .width('100%')
      }

      Text(item.createdAt.slice(0, 16).replace('T', ' '))
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

  private getSubsidyTypeLabel(type: string): string {
    if (type === 'promo') return '推广补贴';
    if (type === 'ai_invest') return 'AI投资';
    if (type === 'token') return 'TOKEN';
    return type;
  }

  private getSubsidyTypeColor(type: string): string {
    if (type === 'promo') return '#E84026';
    if (type === 'ai_invest') return '#6366F1';
    if (type === 'token') return '#10B981';
    return '#99182431';
  }
}
