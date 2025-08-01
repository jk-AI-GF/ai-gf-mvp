import { IPlugin } from './plugin-manager';
import { PluginContext } from '../plugin-api/plugin-context';

/**
 * VRM 모델이 주기적으로 플레이어에게 말을 거는 플러그인입니다.
 */
export class ProactiveDialoguePlugin implements IPlugin {
  public readonly name = 'ProactiveDialogue';
  public enabled = false; // Start disabled, enabled by PluginManager
  runInEditMode = false;

  private context: PluginContext;
  private timeSinceLastDialogue = 0.0;
  private nextDialogueTime = 0.0;
  private readonly dialoguePhrases: string[];

  constructor() {
    // 캐릭터가 말할 대화 문구 목록을 정의합니다.
    this.dialoguePhrases = [
      '안녕하세요! 잘 지내고 계신가요?',
      '무슨 생각을 하고 계세요?',
      '오늘 하루는 어떠셨나요?',
      '궁금한 점이 있으신가요?',
      '제가 도와드릴 일이 있을까요?',
      '잠시 쉬어가세요.',
      '날씨가 좋네요.',
      '음악이라도 들을까요?',
      '오늘도 힘내세요!',
      '저는 항상 당신 곁에 있어요.',
      '오늘 점심은 무엇을 드셨나요?',
      '가장 좋아하는 취미는 무엇인가요?',
      '요즘 관심 있는 주제가 있으신가요?',
      '오늘 하루 어떠셨나요?',
      '무슨 재미있는 일 없으셨어요?',
      '최근에 본 영화나 드라마 중에 추천할 만한 것이 있나요?',
      '가장 좋아하는 계절은 무엇인가요?',
      '어떤 종류의 음악을 좋아하세요?',
      '주말 계획은 어떻게 되세요?',
      '요즘 가장 행복했던 순간은 언제인가요?',
    ];
  }

  public setup(context: PluginContext): void {
    this.context = context;
  }

  public onEnable(): void {
    this.resetDialogueTimer();
  }

  public onDisable(): void {
    // No ongoing processes to disable
  }

  /**
   * 다음 대화까지의 시간을 랜덤으로 재설정합니다.
   */
  private resetDialogueTimer(): void {
    this.timeSinceLastDialogue = 0.0;
    // 5초에서 15초 사이의 랜덤한 시간 후에 다음 대화를 시작합니다.
    this.nextDialogueTime = Math.random() * 10.0 + 8.0;
  }

  /**
   * 매 프레임마다 호출되어 대화 로직을 처리합니다.
   * @param delta 마지막 프레임 이후의 시간 (초)
   */
  public update(delta: number): void {
    this.timeSinceLastDialogue += delta;

    if (this.timeSinceLastDialogue >= this.nextDialogueTime) {
      this.speakRandomDialogue();
      this.resetDialogueTimer();
    }
  }

  /**
   * 대화 목록에서 하나를 랜덤하게 선택하여 말합니다.
   */
  private speakRandomDialogue(): void {
    if (this.dialoguePhrases.length === 0) return;

    const randomIndex = Math.floor(Math.random() * this.dialoguePhrases.length);
    const phrase = this.dialoguePhrases[randomIndex];

    if (this.context.actions) {
      this.speak(phrase);
    } else {
      console.warn('Actions object not set. Cannot display dialogue.');
    }
  }

  private speak(phrase: string) {
    // Show the message in the floating message UI
    this.context.actions.showMessage(phrase);
    
    // Use the context action to play TTS
    this.context.actions.playTTS(phrase);
  }
}