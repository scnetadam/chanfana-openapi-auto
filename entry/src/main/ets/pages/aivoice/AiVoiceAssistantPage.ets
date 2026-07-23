import { VoiceService } from '../../common/AiVoiceService';
import { AiContentService } from '../../common/AiContentService';
import { AiIntentResult, AiIntentDef } from '../../model/DataModels';
import { router, promptAction } from '@kit.ArkUI';
import { common } from '@kit.AbilityKit';

class ChatMessage {
  text: string = '';
  isUser: boolean = false;
  isIntent: boolean = false;
  intentRoute: string = '';
  intentLabel: string = '';
  timestamp: number = 0;

  constructor(text: string, isUser: boolean) {
    this.text = text;
    this.isUser = isUser;
    this.timestamp = Date.now();
  }
}

@Entry
@Component
struct AiVoiceAssistantPage {
  @State messages: ChatMessage[] = [];
  @State inputText: string = '';
  @State isVoiceMode: boolean = true;
  @State isCarMode: boolean = false;
  @State isListening: boolean = false;
  @State isSpeaking: boolean = false;
  @State loading: boolean = false;
  @State voiceInitialized: boolean = false;
  @StorageProp('userId') userId: string = '';
  private voiceService: VoiceService = VoiceService.getInstance();
  private contentService: AiContentService = AiContentService.getInstance();
  private scroller: Scroller = new Scroller();

  aboutToAppear() {
    this.addSystemMessage('您好！我是AI语音助手，可以帮您查余额、看任务、查结算、预约试驾等。请说出您的需求，或切换到文字模式输入。');
  }

  aboutToDisappear() {
    this.voiceService.stopListening();
    this.voiceService.stopSpeak();
  }

  private addSystemMessage(text: string): void {
    const msg: ChatMessage = new ChatMessage(text, false);
    this.messages.push(msg);
    this.scrollToBottom();
  }

  private addUserMessage(text: string): void {
    const msg: ChatMessage = new ChatMessage(text, true);
    this.messages.push(msg);
    this.scrollToBottom();
  }

  private addIntentMessage(text: string, route: string, label: string): void {
    const msg: ChatMessage = new ChatMessage(text, false);
    msg.isIntent = true;
    msg.intentRoute = route;
    msg.intentLabel = label;
    this.messages.push(msg);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.scroller.scrollEdge(Edge.Bottom);
    }, 100);
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
        promptAction.showToast({ message: '需要麦克风权限才能使用语音功能' });
        return false;
      }
    }
    const asrOk: boolean = await this.voiceService.initAsr();
    const ttsOk: boolean = await this.voiceService.initTts();
    if (!asrOk) {
      promptAction.showToast({ message: '语音识别初始化失败，请使用文字模式' });
      this.isVoiceMode = false;
      return false;
    }
    this.voiceInitialized = true;
    return true;
  }

  private async startVoiceInput(): Promise<void> {
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
          this.processUserInput(text);
        }
      },
      (err: string) => {
        this.isListening = false;
        promptAction.showToast({ message: '语音识别出错，请重试' });
      }
    );
    this.isListening = true;
  }

  private async processUserInput(text: string): Promise<void> {
    this.addUserMessage(text);
    this.loading = true;
    const intentResult: AiIntentResult = await this.voiceService.recognizeIntent(text, this.userId);
    this.loading = false;
    this.addSystemMessage(intentResult.responseText);
    if (intentResult.intent !== AiIntentDef.UNKNOWN && intentResult.actionRoute.length > 0) {
      const label: string = this.getIntentLabel(intentResult.intent);
      this.addIntentMessage('点击前往 →', intentResult.actionRoute, label);
    }
    if (this.isCarMode && intentResult.responseText.length > 0) {
      this.voiceService.speak(intentResult.responseText, () => {
        this.isSpeaking = false;
      });
      this.isSpeaking = true;
    }
  }

  private getIntentLabel(intent: string): string {
    if (intent === AiIntentDef.QUERY_BALANCE) return '钱包';
    if (intent === AiIntentDef.QUERY_TASKS) return '任务';
    if (intent === AiIntentDef.QUERY_SETTLEMENT) return '结算';
    if (intent === AiIntentDef.CHECK_CERT) return '认证';
    if (intent === AiIntentDef.BOOK_TEST_DRIVE) return '试驾';
    if (intent === AiIntentDef.HELP) return '帮助';
    return '详情';
  }

  private sendTextMessage(): void {
    const text: string = this.inputText.trim();
    if (text.length === 0) return;
    this.inputText = '';
    this.processUserInput(text);
  }

  private stopSpeaking(): void {
    this.voiceService.stopSpeak();
    this.isSpeaking = false;
  }

  private toggleCarMode(): void {
    this.isCarMode = !this.isCarMode;
    this.voiceService.setCarMode(this.isCarMode);
    promptAction.showToast({ message: this.isCarMode ? '车内模式已开启' : '车内模式已关闭' });
  }

  build() {
    Column() {
      Row() {
        Text('AI语音助手')
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor($r('app.color.text_primary'))
          .layoutWeight(1)
        Row() {
          Text(this.isCarMode ? '车内' : '普通')
            .fontSize(12)
            .fontColor(this.isCarMode ? $r('app.color.warning_color') : $r('app.color.text_secondary'))
            .margin({ right: 4 })
          Toggle({ type: ToggleType.Switch, isOn: this.isCarMode })
            .width(44)
            .height(24)
            .onChange((isOn: boolean) => {
              this.toggleCarMode();
            })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 8 })

      if (this.isSpeaking) {
        Row() {
          LoadingProgress()
            .width(16)
            .height(16)
            .color($r('app.color.primary_color'))
          Text('正在播报...')
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
        .padding({ left: 16, right: 16, top: 4, bottom: 4 })
        .backgroundColor($r('app.color.bg_tag_color'))
      }

      List({ space: 8, scroller: this.scroller }) {
        ForEach(this.messages, (msg: ChatMessage, index: number) => {
          ListItem() {
            this.MessageBubble(msg)
          }
        }, (msg: ChatMessage, index: number) => index.toString())
      }
      .layoutWeight(1)
      .padding({ left: 12, right: 12, top: 8 })
      .width('100%')

      if (this.loading) {
        Row() {
          LoadingProgress()
            .width(20)
            .height(20)
            .color($r('app.color.primary_color'))
          Text('AI思考中...')
            .fontSize(13)
            .fontColor($r('app.color.text_secondary'))
            .margin({ left: 8 })
        }
        .width('100%')
        .padding({ left: 16, top: 4, bottom: 4 })
      }

      Row() {
        if (this.isVoiceMode) {
          Column() {
            Stack() {
              Circle()
                .width(this.isListening ? 68 : 56)
                .height(this.isListening ? 68 : 56)
                .fill(this.isListening ? $r('app.color.danger_color') : $r('app.color.primary_color'))
              if (this.isListening) {
                Circle()
                  .width(80)
                  .height(80)
                  .fill($r('app.color.danger_color'))
                  .opacity(0.2)
              }
              Text(this.isListening ? '聆听中' : '按住说话')
                .fontSize(12)
                .fontColor(Color.White)
            }
          }
          .alignItems(HorizontalAlign.Center)
          .onClick(() => {
            this.startVoiceInput();
          })
        } else {
          TextInput({ text: this.inputText, placeholder: '输入您的问题...' })
            .layoutWeight(1)
            .height(40)
            .borderRadius(20)
            .backgroundColor($r('app.color.bg_input_color'))
            .fontColor($r('app.color.text_primary'))
            .onChange((value: string) => {
              this.inputText = value;
            })
            .onSubmit(() => {
              this.sendTextMessage();
            })
          Text('发送')
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor($r('app.color.primary_color'))
            .borderRadius(16)
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .margin({ left: 8 })
            .onClick(() => {
              this.sendTextMessage();
            })
        }

        Text(this.isVoiceMode ? '文字' : '语音')
          .fontSize(12)
          .fontColor($r('app.color.primary_color'))
          .margin({ left: 12 })
          .onClick(() => {
            this.isVoiceMode = !this.isVoiceMode;
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 8, bottom: 12 })
      .backgroundColor($r('app.color.card_background'))
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background_color'))
  }

  @Builder
  MessageBubble(msg: ChatMessage) {
    Row() {
      if (msg.isUser) {
        Blank()
        Column() {
          Text(msg.text)
            .fontSize(15)
            .fontColor(Color.White)
            .lineHeight(22)
        }
        .padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .borderRadius({ topRight: 4, topLeft: 16, bottomLeft: 16, bottomRight: 16 })
        .backgroundColor($r('app.color.primary_color'))
        .constraintSize({ maxWidth: '75%' })
      } else if (msg.isIntent) {
        Blank()
        Column() {
          Text(msg.text)
            .fontSize(15)
            .fontColor(Color.White)
            .lineHeight(22)
          Row() {
            Text(msg.intentLabel)
              .fontSize(13)
              .fontColor(Color.White)
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .borderRadius(10)
              .backgroundColor('rgba(255,255,255,0.3)')
          }
          .margin({ top: 6 })
        }
        .padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .borderRadius({ topRight: 4, topLeft: 16, bottomLeft: 16, bottomRight: 16 })
        .backgroundColor($r('app.color.purple_color'))
        .constraintSize({ maxWidth: '75%' })
        .onClick(() => {
          if (msg.intentRoute.length > 0) {
            router.pushUrl({ url: msg.intentRoute });
          }
        })
      } else {
        Column() {
          Text(msg.text)
            .fontSize(15)
            .fontColor($r('app.color.text_primary'))
            .lineHeight(22)
        }
        .padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .borderRadius({ topRight: 16, topLeft: 4, bottomLeft: 16, bottomRight: 16 })
        .backgroundColor($r('app.color.card_background'))
        .constraintSize({ maxWidth: '75%' })
        Blank()
      }
    }
    .width('100%')
    .padding({ left: 4, right: 4 })
  }
}
