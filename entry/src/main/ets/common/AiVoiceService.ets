import { speechRecognizer, textToSpeech } from '@kit.CoreSpeechKit';
import { abilityAccessCtrl, bundleManager, common, Permissions } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { HttpClient, ApiResponse, toPostBody } from './HttpClient';
import { AiIntentResult, AiIntentDef } from '../model/DataModels';
import { AI_CONFIG } from './Constants';

export class VoiceService {
  private static instance: VoiceService | null = null;
  private asrEngine: speechRecognizer.SpeechRecognitionEngine | null = null;
  private ttsEngine: textToSpeech.TextToSpeechEngine | null = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private carMode: boolean = false;
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((err: string) => void) | null = null;
  private onSpeakCompleteCallback: (() => void) | null = null;
  private lastRequestId: string = '';

  static getInstance(): VoiceService {
    if (VoiceService.instance === null) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  setCarMode(enabled: boolean): void {
    this.carMode = enabled;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  async initAsr(): Promise<boolean> {
    try {
      const mode: string = this.carMode ? 'long' : 'short';
      const extraParams: Record<string, Object> = { 'locate': 'CN', 'recognizerMode': mode };
      const initParams: speechRecognizer.CreateEngineParams = {
        language: 'zh-CN',
        online: 1,
        extraParams: extraParams,
      };
      const engine: speechRecognizer.SpeechRecognitionEngine = await speechRecognizer.createEngine(initParams);
      this.asrEngine = engine;
      const listener: speechRecognizer.SpeechListener = {
        onResults: (sessionId: string, result: string) => {
          if (this.onResultCallback !== null) {
            try {
              const parsed: Record<string, Object> = JSON.parse(result) as Record<string, Object>;
              const isFinalVal: Object | undefined = parsed['isFinal'];
              const resultVal: Object | undefined = parsed['result'];
              const isFinal: boolean = isFinalVal === true || isFinalVal === 1;
              const text: string = resultVal !== null && resultVal !== undefined ? String(resultVal) : '';
              this.onResultCallback(text, isFinal);
            } catch (e) {
              if (this.onErrorCallback !== null) {
                this.onErrorCallback('parse error');
              }
            }
          }
        },
        onStart: (sessionId: string) => {
          this.isListening = true;
        },
        onComplete: (sessionId: string) => {
          this.isListening = false;
        },
        onError: (sessionId: string, errorCode: number, errorMessage: string) => {
          this.isListening = false;
          if (this.onErrorCallback !== null) {
            this.onErrorCallback('ASR error: ' + errorCode);
          }
        },
      };
      engine.setListener(listener);
      return true;
    } catch (e) {
      const errMsg: string = e !== null && e !== undefined ? String(e) : 'init asr failed';
      return false;
    }
  }

  async initTts(): Promise<boolean> {
    try {
      const style: string = this.carMode ? 'navigation' : 'interaction-broadcast';
      const extraParams: Record<string, Object> = { 'style': style, 'locate': 'CN', 'name': 'TtsEngine' };
      const initParams: textToSpeech.CreateEngineParams = {
        language: 'zh-CN',
        person: 0,
        online: 1,
        extraParams: extraParams,
      };
      const engine: textToSpeech.TextToSpeechEngine = await textToSpeech.createEngine(initParams);
      this.ttsEngine = engine;
      const speakListener: textToSpeech.SpeakListener = {
        onStart: (requestId: string, response: textToSpeech.StartResponse) => {
          this.isSpeaking = true;
        },
        onComplete: (requestId: string, response: textToSpeech.CompleteResponse) => {
          this.isSpeaking = false;
          if (this.onSpeakCompleteCallback !== null) {
            this.onSpeakCompleteCallback();
            this.onSpeakCompleteCallback = null;
          }
        },
        onPlay: (requestId: string) => {
        },
        onPause: (requestId: string) => {
          this.isSpeaking = false;
        },
        onResume: (requestId: string) => {
          this.isSpeaking = true;
        },
        onStop: (requestId: string) => {
          this.isSpeaking = false;
        },
        onData: (requestId: string, audio: ArrayBuffer, response: textToSpeech.SynthesisResponse) => {
        },
        onError: (requestId: string, errorCode: number, errorMessage: string) => {
          this.isSpeaking = false;
          if (this.onSpeakCompleteCallback !== null) {
            this.onSpeakCompleteCallback();
            this.onSpeakCompleteCallback = null;
          }
        },
      };
      engine.setListener(speakListener);
      return true;
    } catch (e) {
      return false;
    }
  }

  startListening(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (err: string) => void
  ): void {
    if (this.asrEngine === null) {
      onError('ASR engine not initialized');
      return;
    }
    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    const sessionId: string = 'session_' + Date.now().toString();
    this.lastRequestId = sessionId;
    const recognizerParams: speechRecognizer.StartParams = {
      sessionId: sessionId,
      audioInfo: 'pcm',
    };
    try {
      this.asrEngine.startListening(recognizerParams);
      this.isListening = true;
    } catch (e) {
      this.isListening = false;
      onError('start listen failed');
    }
  }

  stopListening(): void {
    if (this.asrEngine !== null && this.isListening) {
      try {
        this.asrEngine.finish(this.lastRequestId);
      } catch (e) {
      }
      this.isListening = false;
    }
  }

  speak(text: string, onComplete?: () => void): void {
    if (this.ttsEngine === null) {
      if (onComplete !== null && onComplete !== undefined) {
        onComplete();
      }
      return;
    }
    if (this.isSpeaking) {
      this.stopSpeak();
    }
    if (onComplete !== null && onComplete !== undefined) {
      this.onSpeakCompleteCallback = onComplete;
    }
    const requestId: string = 'tts_' + Date.now().toString();
    const speakParams: textToSpeech.SpeakParams = {
      requestId: requestId,
      extraParams: { 'volume': this.carMode ? '2' : '1', 'speed': '1' },
    };
    try {
      this.ttsEngine.speak(text, speakParams);
      this.isSpeaking = true;
    } catch (e) {
      this.isSpeaking = false;
      if (onComplete !== null && onComplete !== undefined) {
        onComplete();
      }
    }
  }

  stopSpeak(): void {
    if (this.ttsEngine !== null && this.isSpeaking) {
      try {
        const requestId: string = 'tts_stop_' + Date.now().toString();
        this.ttsEngine.stop(requestId);
      } catch (e) {
      }
      this.isSpeaking = false;
    }
  }

  hasMicrophonePermission(): boolean {
    try {
      const atManager: abilityAccessCtrl.AtManager = abilityAccessCtrl.createAtManager();
      const bundleInfo: bundleManager.BundleInfo = bundleManager.getBundleInfoForSelfSync(bundleManager.BundleFlag.GET_BUNDLE_INFO_WITH_APPLICATION);
      const tokenId: number = bundleInfo.appInfo.accessTokenId;
      const permission: Permissions = 'ohos.permission.MICROPHONE';
      const result: abilityAccessCtrl.GrantStatus = atManager.checkAccessTokenSync(tokenId, permission);
      return result === abilityAccessCtrl.GrantStatus.PERMISSION_GRANTED;
    } catch (e) {
      return false;
    }
  }

  async requestMicrophonePermission(context: common.UIAbilityContext): Promise<boolean> {
    try {
      const atManager: abilityAccessCtrl.AtManager = abilityAccessCtrl.createAtManager();
      const permissions: Permissions[] = ['ohos.permission.MICROPHONE'];
      const result: abilityAccessCtrl.PermissionRequestResult = await atManager.requestPermissionsFromUser(context, permissions);
      return result.authResults.length > 0 && result.authResults[0] === 0;
    } catch (e) {
      return false;
    }
  }

  async recognizeIntent(text: string, userId: string): Promise<AiIntentResult> {
    const localResult: AiIntentResult = this.localIntentMatch(text);
    if (!AI_CONFIG.AI_MOCK_MODE && localResult.intent !== AiIntentDef.UNKNOWN) {
      try {
        const body: Record<string, Object> = {
          'text': text,
          'userId': userId,
        };
        const resp: ApiResponse<AiIntentResult> = await HttpClient.post<AiIntentResult>(
          '/api/ai/voice-intent', toPostBody(body),
          (data: Record<string, Object>): AiIntentResult => {
            return AiIntentResult.fromJson(data);
          });
        if (resp.success && resp.data !== null) {
          return resp.data;
        }
      } catch (e) {
      }
    }
    return localResult;
  }

  private localIntentMatch(text: string): AiIntentResult {
    const result: AiIntentResult = new AiIntentResult();
    result.responseText = '抱歉，我暂时无法理解您的需求，请换种说法试试。';
    result.confidence = 0;
    const t: string = text.toLowerCase();
    if (t.indexOf('余额') >= 0 || t.indexOf('钱包') >= 0 || t.indexOf('收益') >= 0) {
      result.intent = AiIntentDef.QUERY_BALANCE;
      result.responseText = '正在为您查询钱包余额...';
      result.actionRoute = 'pages/wallet/WalletPage';
      result.confidence = 0.9;
    } else if (t.indexOf('任务') >= 0 || t.indexOf('接单') >= 0 || t.indexOf('可领') >= 0) {
      result.intent = AiIntentDef.QUERY_TASKS;
      result.responseText = '正在为您查看可领取的任务...';
      result.actionRoute = 'pages/koltask/KolTaskPage';
      result.confidence = 0.9;
    } else if (t.indexOf('结算') >= 0 || t.indexOf('打款') >= 0 || t.indexOf('提现') >= 0) {
      result.intent = AiIntentDef.QUERY_SETTLEMENT;
      result.responseText = '正在为您查询结算信息...';
      result.actionRoute = 'pages/settlement/SettlementPage';
      result.confidence = 0.85;
    } else if (t.indexOf('认证') >= 0 || t.indexOf('审核') >= 0 || t.indexOf('kol') >= 0) {
      result.intent = AiIntentDef.CHECK_CERT;
      result.responseText = '正在为您查看认证状态...';
      result.actionRoute = 'pages/kolaudit/KolAuditPage';
      result.confidence = 0.85;
    } else if (t.indexOf('试驾') >= 0 || t.indexOf('预约') >= 0 || t.indexOf('到店') >= 0) {
      result.intent = AiIntentDef.BOOK_TEST_DRIVE;
      result.responseText = '正在为您查看试驾预约信息...';
      result.actionRoute = 'pages/activities/ActivitiesPage';
      result.confidence = 0.9;
    } else if (t.indexOf('帮助') >= 0 || t.indexOf('怎么用') >= 0 || t.indexOf('功能') >= 0) {
      result.intent = AiIntentDef.HELP;
      result.responseText = '我可以帮您查余额、看任务、查结算、预约试驾等，请说出您的需求。';
      result.confidence = 0.8;
    } else {
      result.intent = AiIntentDef.UNKNOWN;
    }
    return result;
  }

  destroyAsr(): void {
    if (this.asrEngine !== null) {
      try {
        this.asrEngine.destroy('asr_destroy');
      } catch (e) {
      }
      this.asrEngine = null;
      this.isListening = false;
    }
  }

  destroyTts(): void {
    if (this.ttsEngine !== null) {
      try {
        this.ttsEngine.shutdown();
      } catch (e) {
      }
      this.ttsEngine = null;
      this.isSpeaking = false;
    }
  }

  destroy(): void {
    this.destroyAsr();
    this.destroyTts();
  }
}
