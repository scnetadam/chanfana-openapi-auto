import { AiContentService } from '../../common/AiContentService';
import { VoiceService } from '../../common/AiVoiceService';
import { AiKnowledgeAnswer, AiKnowledgeQA } from '../../model/DataModels';
import { AI_CONFIG } from '../../common/Constants';
import { router, promptAction } from '@kit.ArkUI';
import { common } from '@kit.AbilityKit';

@Entry
@Component
struct AiKnowledgePage {
  @State searchQuery: string = '';
  @State isVoiceMode: boolean = false;
  @State isListening: boolean = false;
  @State isSpeaking: boolean = false;
  @State loading: boolean = false;
  @State answer: AiKnowledgeAnswer | null = null;
  @State totalQA: number = 0;
  @State targetQA: number = AI_CONFIG.AI_KNOWLEDGE_QA_TARGET;
  @State contributorCount: number = 0;
  @State categoryCount: number = 0;
  @State quickQuestions: string[] = ['混动和插混有什么区别？', '电动车续航冬天会降多少？', '新能源车怎么保养？', 'L2自动驾驶靠谱吗？', '10万买什么车好？'];
  @StorageProp('userId') userId: string = '';
  private contentService: AiContentService = AiContentService.getInstance();
  private voiceService: VoiceService = VoiceService.getInstance();
  private voiceInitialized: boolean = false;

  aboutToAppear() {
    this.loadStats();
  }

  aboutToDisappear() {
    this.voiceService.stopListening();
    this.voiceService.stopSpeak();
  }

  private async loadStats() {
    const resp = await this.contentService.getKnowledgeStats();
    if (resp.success && resp.data !== null) {
      const data: Record<string, Object> = resp.data;
      const totalVal: Object | undefined = data['totalQA'];
      if (totalVal !== null && totalVal !== undefined) {
        this.totalQA = Number(totalVal);
      }
      const targetVal: Object | undefined = data['targetQA'];
      if (targetVal !== null && targetVal !== undefined) {
        this.targetQA = Number(targetVal);
      }
      const contribVal: Object | undefined = data['contributorCount'];
      if (contribVal !== null && contribVal !== undefined) {
        this.contributorCount = Number(contribVal);
      }
      const catVal: Object | undefined = data['categories'];
      if (catVal !== null && catVal !== undefined) {
        this.categoryCount = Number(catVal);
      }
    }
  }

  private async search() {
    const q: string = this.searchQuery.trim();
    if (q.length === 0) return;
    this.loading = true;
    const resp = await this.contentService.queryKnowledge(q, this.userId);
    if (resp.success && resp.data !== null) {
      this.answer = resp.data;
    } else {
      this.answer = null;
      promptAction.showToast({ message: resp.message.length > 0 ? resp.message : '查询失败' });
    }
    this.loading = false;
  }

  private async initVoiceIfNeeded(): Promise<boolean> {
    if (this.voiceInitialized) {
      return true;
    }
    const hasPermission: boolean = this.voiceService.hasMicrophonePermission();
    if (!hasPermission) {
      const context: common.UIAbilityContext = getContext(this) as common.UIAbilityContext;
      const granted: boolean = await this.voiceService.requestMicrophonePermission(context);
      if (!granted) {
        promptAction.showToast({ message: '需要麦克风权限' });
        return false;
      }
    }
    const asrOk: boolean = await this.voiceService.initAsr();
    const ttsOk: boolean = await this.voiceService.initTts();
    if (!asrOk) {
      promptAction.showToast({ message: '语音初始化失败' });
      return false;
    }
    this.voiceInitialized = true;
    return true;
  }

  private async startVoiceSearch(): Promise<void> {
    const ok: boolean = await this.initVoiceIfNeeded();
    if (!ok) return;
    if (this.isListening) {
      this.voiceService.stopListening();
      this.isListening = false;
      return;
    }
    this.voiceService.startListening(
      (text: string, isFinal: boolean) => {
        if (isFinal && text.length > 0) {
          this.isListening = false;
          this.searchQuery = text;
          this.search();
        }
      },
      (err: string) => {
        this.isListening = false;
      }
    );
    this.isListening = true;
  }

  private speakAnswer(): void {
    if (this.answer !== null) {
      this.voiceService.speak(this.answer.answer, () => {
        this.isSpeaking = false;
      });
      this.isSpeaking = true;
    }
  }

  private stopSpeaking(): void {
    this.voiceService.stopSpeak();
    this.isSpeaking = false;
  }

  private getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10B981';
    if (confidence >= 0.5) return '#F59E0B';
    return '#E84026';
  }

  private getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return '高可信';
    if (confidence >= 0.5) return '中等';
    return '待验证';
  }

  private getCategoryIcon(cat: string): string {
    if (cat === 'new_energy') return '⚡';
    if (cat === 'ev') return '🔋';
    if (cat === 'smart_drive') return '🚗';
    if (cat === 'maintenance') return '🔧';
    if (cat === 'purchase') return '💰';
    return '📋';
  }

  build() {
    Column() {
      Row() {
        Text('汽车知识库')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
        Text(this.totalQA.toString() + '/' + (this.targetQA / 10000).toFixed(0) + '万+')
          .fontSize(13)
          .fontColor($r('app.color.purple_color'))
          .fontWeight(FontWeight.Medium)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 4 })

      Row() {
        Column() {
          Row() {
            Text('知识量')
              .fontSize(11)
              .fontColor($r('app.color.text_secondary'))
            Text(this.totalQA.toString())
              .fontSize(16)
              .fontWeight(FontWeight.Bold)
              .fontColor($r('app.color.primary_color'))
              .margin({ left: 4 })
          }
          Progress({ value: this.totalQA, total: this.targetQA, type: ProgressType.Linear })
            .width(80)
            .height(4)
            .color($r('app.color.primary_color'))
            .margin({ top: 4 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text(this.categoryCount.toString())
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.success_color'))
          Text('分类')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)

        Column() {
          Text(this.contributorCount.toString())
            .fontSize(16)
            .fontWeight(FontWeight.Bold)
            .fontColor($r('app.color.warning_color'))
          Text('贡献者')
            .fontSize(11)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 2 })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .padding(12)
      .margin({ left: 16, right: 16, top: 4 })
      .borderRadius(12)
      .backgroundColor($r('app.color.card_background'))
      .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })

      Row() {
        if (this.isVoiceMode) {
          TextInput({ text: this.searchQuery, placeholder: '语音输入中...' })
            .layoutWeight(1)
            .height(40)
            .borderRadius(20)
            .backgroundColor($r('app.color.bg_input_color'))
            .fontColor($r('app.color.text_primary'))
            .enabled(false)
        } else {
          TextInput({ text: this.searchQuery, placeholder: '搜索汽车知识...' })
            .layoutWeight(1)
            .height(40)
            .borderRadius(20)
            .backgroundColor($r('app.color.bg_input_color'))
            .fontColor($r('app.color.text_primary'))
            .onChange((value: string) => {
              this.searchQuery = value;
            })
            .onSubmit(() => {
              this.search();
            })
        }
        Text(this.isVoiceMode ? '文字' : '语音')
          .fontSize(12)
          .fontColor($r('app.color.primary_color'))
          .margin({ left: 8 })
          .onClick(() => {
            this.isVoiceMode = !this.isVoiceMode;
          })
        if (this.isVoiceMode) {
          Stack() {
            Circle()
              .width(this.isListening ? 40 : 36)
              .height(this.isListening ? 40 : 36)
              .fill(this.isListening ? $r('app.color.danger_color') : $r('app.color.primary_color'))
            Text('🎤')
              .fontSize(16)
          }
          .margin({ left: 8 })
          .onClick(() => {
            this.startVoiceSearch();
          })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 8, bottom: 8 })

      if (this.isSpeaking) {
        Row() {
          LoadingProgress()
            .width(16)
            .height(16)
            .color($r('app.color.primary_color'))
          Text('正在朗读...')
            .fontSize(13)
            .fontColor($r('app.color.primary_color'))
            .margin({ left: 6 })
          Text('停止')
            .fontSize(13)
            .fontColor($r('app.color.danger_color'))
            .margin({ left: 12 })
            .onClick(() => {
              this.stopSpeaking();
            })
        }
        .width('100%')
        .padding({ left: 16, top: 2, bottom: 2 })
        .backgroundColor($r('app.color.bg_tag_color'))
      }

      if (this.loading) {
        Column() {
          LoadingProgress()
            .width(40)
            .height(40)
            .color($r('app.color.primary_color'))
          Text('AI检索中...')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ top: 8 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.answer !== null) {
        Scroll() {
          Column() {
            this.AnswerCard(this.answer)

            if (this.answer.relatedQA.length > 0) {
              Text('相关问题')
                .fontSize(15)
                .fontWeight(FontWeight.Medium)
                .fontColor($r('app.color.text_primary'))
                .width('100%')
                .margin({ left: 16, top: 16 })

              ForEach(this.answer.relatedQA, (qa: AiKnowledgeQA, index: number) => {
                this.RelatedQACard(qa)
              }, (qa: AiKnowledgeQA, index: number) => qa.id + '_' + index.toString())
            }

            Text('贡献知识')
              .fontSize(14)
              .fontColor(Color.White)
              .backgroundColor($r('app.color.primary_color'))
              .borderRadius(20)
              .padding({ left: 20, right: 20, top: 10, bottom: 10 })
              .margin({ top: 20, bottom: 20 })
              .onClick(() => {
                promptAction.showToast({ message: '知识贡献功能即将上线' });
              })
          }
          .width('100%')
        }
        .layoutWeight(1)
      } else {
        Scroll() {
          Column() {
            Text('热门问题')
              .fontSize(15)
              .fontWeight(FontWeight.Medium)
              .fontColor($r('app.color.text_primary'))
              .width('100%')
              .margin({ left: 16, top: 8 })

            ForEach(this.quickQuestions, (q: string, index: number) => {
              Row() {
                Text((index + 1).toString())
                  .fontSize(14)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(Color.White)
                  .width(24)
                  .height(24)
                  .borderRadius(12)
                  .textAlign(TextAlign.Center)
                  .backgroundColor($r('app.color.primary_color'))
                Text(q)
                  .fontSize(14)
                  .fontColor($r('app.color.text_primary'))
                  .margin({ left: 10 })
                  .layoutWeight(1)
              }
              .width('100%')
              .padding({ left: 16, right: 16, top: 10, bottom: 10 })
              .onClick(() => {
                this.searchQuery = q;
                this.search();
              })
            }, (q: string, index: number) => index.toString())
          }
          .width('100%')
        }
        .layoutWeight(1)
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  AnswerCard(ans: AiKnowledgeAnswer) {
    Column() {
      Row() {
        Text(this.getCategoryIcon(ans.relatedQA.length > 0 && ans.relatedQA[0].category.length > 0 ? ans.relatedQA[0].category : 'other'))
          .fontSize(20)
        Text(ans.question)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
          .margin({ left: 8 })
      }
      .width('100%')

      Row() {
        Text(this.getConfidenceLabel(ans.confidence))
          .fontSize(11)
          .fontColor(Color.White)
          .backgroundColor(this.getConfidenceColor(ans.confidence))
          .borderRadius(8)
          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
        Text((ans.confidence * 100).toFixed(0) + '%')
          .fontSize(11)
          .fontColor($r('app.color.text_secondary'))
          .margin({ left: 6 })
      }
      .margin({ top: 8 })

      Text(ans.answer)
        .fontSize(14)
        .fontColor($r('app.color.text_primary'))
        .lineHeight(24)
        .margin({ top: 12 })
        .width('100%')

      Row() {
        Text('朗读')
          .fontSize(13)
          .fontColor($r('app.color.primary_color'))
          .onClick(() => {
            this.speakAnswer();
          })
      }
      .margin({ top: 8 })
    }
    .width('100%')
    .padding(16)
    .margin({ left: 16, right: 16, top: 8 })
    .borderRadius(12)
    .backgroundColor($r('app.color.card_background'))
    .shadow({ radius: 4, color: $r('app.color.divider_color'), offsetX: 0, offsetY: 2 })
  }

  @Builder
  RelatedQACard(qa: AiKnowledgeQA) {
    Row() {
      Column() {
        Text(qa.question)
          .fontSize(14)
          .fontColor($r('app.color.text_primary'))
          .width('100%')
        Text(qa.answer.length > 60 ? qa.answer.slice(0, 60) + '...' : qa.answer)
          .fontSize(12)
          .fontColor($r('app.color.text_secondary'))
          .margin({ top: 4 })
          .width('100%')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .layoutWeight(1)
      Text('>')
        .fontSize(16)
        .fontColor($r('app.color.text_secondary'))
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 10, bottom: 10 })
    .margin({ left: 16, right: 16, top: 6 })
    .borderRadius(8)
    .backgroundColor($r('app.color.card_background'))
    .onClick(() => {
      this.searchQuery = qa.question;
      this.search();
    })
  }
}
