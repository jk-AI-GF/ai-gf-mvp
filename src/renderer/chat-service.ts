import eventBus from '../core/event-bus';
import { VRMManager } from './vrm-manager';
import { PluginManager } from '../plugins/plugin-manager';
import { LlmSettings, SUPPORTED_MODELS } from '../core/llm-settings';

import { characterState } from '../core/character-state';

// 각 LLM 제공사의 대화 기록 형식을 지원하기 위한 타입
type HistoryMessage = {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
};


/**
 * 텍스트에서 <표정: name> 태그를 추출합니다.
 */
function extractExpression(text: string, vrmExpressionList: string[]): string {
  const match = text.match(/<표정:\s*(.*?)\s*>/);
  if (match && vrmExpressionList.includes(match[1])) {
    return match[1];
  }
  return vrmExpressionList[0] || 'neutral';
}

/**
 * 텍스트에서 <표정: ...> 태그를 제거합니다.
 */
function removeExpressionTag(text: string): string {
  return text.replace(/<표정:\s*(.*?)\s*>/, '').trim();
}

export class ChatService {
  // 내부 대화 기록은 제네릭한 포맷으로 관리
  private chatHistory: HistoryMessage[] = [];
  private vrmManager: VRMManager;
  private pluginManager: PluginManager;

  constructor(vrmManager: VRMManager, pluginManager: PluginManager) {
    this.vrmManager = vrmManager;
    this.pluginManager = pluginManager;

    // sequences-updated 이벤트 수신 시 사용 가능한 서브루틴 목록을 로깅합니다.
    eventBus.on('sequences-updated', () => {
      if (this.pluginManager.context?.sequenceManager) {
        const availableSubroutines = this.pluginManager.context.sequenceManager.getAvailableSubroutines();
        console.log('[ChatService] Sequences updated. Available subroutines:', availableSubroutines);
      } else {
        console.log('[ChatService] Sequences updated, but SequenceManager is not available.');
      }
    });
  }

  /**
   * 사용자의 채팅 메시지를 처리하고 LLM 응답을 요청합니다.
   */
  public async sendChatMessage(
    message: string,
    persona: string,
    llmSettings: LlmSettings
  ): Promise<void> {
    const userMsg = message.trim();
    if (!userMsg) return;

    // UI에 사용자 메시지를 즉시 표시하고 기록에 추가합니다.
    eventBus.emit('chat:newMessage', { role: 'user', text: userMsg });
    this.chatHistory.push({ role: 'user', content: userMsg });

    try {
      // 채팅 시나리오에 맞는 시스템 프롬프트를 생성합니다.
      const systemPrompt = this._buildChatSystemPrompt(persona, llmSettings);

      // 범용 LLM 호출 함수를 사용합니다.
      const payload = await this._invokeLlm(systemPrompt, this.chatHistory, llmSettings);

      // LLM 응답을 기반으로 관련 이벤트를 발생시켜 다른 시스템들이 처리하도록 합니다.
      const speech = payload.text || "죄송해요, 잘 이해하지 못했어요.";
      
      // 기능 플러그인(LlmResponseHandlerPlugin 등)을 위한 핵심 이벤트
      eventBus.emit('llm:responseReceived', payload);
      
      // UI 업데이트를 위한 이벤트
      eventBus.emit('chat:newMessage', { role: 'assistant', text: speech });
      eventBus.emit('ui:showFloatingMessage', { text: speech });
      
      // 대화 기록에 어시스턴트의 응답을 추가합니다.
      this.chatHistory.push({ role: 'assistant', content: speech });

    } catch (err: any) {
      console.error(`LLM API call failed:`, err);
      eventBus.emit('chat:newMessage', { role: 'assistant', text: `API 호출 실패: ${err.message}` });
    }
  }

  /**
   * 채팅 시나리오에 특화된 시스템 프롬프트를 생성합니다.
   */
  private _buildChatSystemPrompt(persona: string, llmSettings: LlmSettings): string {
    const vrmExpressionList = this.vrmManager.currentVrm
      ? Object.keys(this.vrmManager.currentVrm.expressionManager.expressionMap)
      : ['neutral', 'happy', 'sad'];

    const currentState = characterState.toJSON();
    const stateJson = JSON.stringify(currentState, null, 2);

    const combinedSystemPrompt = `${llmSettings.systemPrompt}\n\n${persona}\n\n캐릭터의 현재 상태는 다음과 같습니다:\n${stateJson}`;

    const basePrompt = `${combinedSystemPrompt}\n\n모든 응답에 <표정: [표정_이름]> 형식의 표정 태그를 포함해 주세요. 표정_이름은 다음 목록 중 하나여야 합니다: ${vrmExpressionList.join(', ')}. 예시: <표정: happy> 안녕하세요!`;
    
    const availableSubroutines = this.pluginManager.context?.sequenceManager?.getAvailableSubroutines() || [];
    const subJson = JSON.stringify(availableSubroutines, null, 2);
    
    return `${basePrompt}\n\n다음 JSON 배열은 현재 실행 가능한 Action(서브루틴) 목록입니다:
${subJson}

사용자의 다음 요청을 분석하여, 가장 적절한 행동을 결정하세요.

**응답 생성 규칙:**
1.  **먼저 생각하기 (Think Step):** 사용자의 요청을 완수하기 위해 어떤 서브루틴을 사용해야 할지, 또는 단순 대화로 충분할지 판단합니다. 복잡한 요청은 여러 서브루틴의 조합으로 해결할 수 있습니다.
2.  **최종 응답 생성 (JSON Output):** 생각한 내용을 바탕으로, 아래 형식 중 하나에 맞춰 **반드시 순수한 JSON 객체 하나만** 응답으로 생성합니다. 다른 설명이나 텍스트를 포함해서는 안 됩니다.

**JSON 형식:**

// 1. 캐릭터가 단순히 대답만 할 경우:
{
  "type": "talk",
  "text": "캐릭터가 할 대사입니다.",
  "expression": "표정 이름"
}

// 2. 캐릭터가 단일 행동(서브루틴)을 수행할 경우:
{
  "type": "action",
  "subroutine": "실행할 서브루틴의 이름",
  "arguments": { "key": "value" }, // 서브루틴의 description을 참고하여 필요한 모든 인자를 채워야 합니다.
  "text": "행동과 함께 출력할 대사입니다.",
  "expression": "표정 이름"
}

// 3. 캐릭터가 여러 행동을 순차적으로 수행할 경우:
{
  "type": "action_array",
  "subroutines": [
    { "subroutine": "첫 번째 서브루틴 이름", "arguments": { "key": "value" } },
    { "subroutine": "두 번째 서브루틴 이름", "arguments": { "key": "value" } }
  ],
  "text": "모든 행동과 함께 출력할 대사입니다.",
  "expression": "표정 이름"
}


**매우 중요:**
-   'subroutine'의 이름은 위에 제공된 Action 목록에 있는 이름과 정확히 일치해야 합니다.
-   'arguments' 객체는 서브루틴의 'description'을 분석하여 **필요한 모든 키와 값을 포함**해야 합니다. 예를 들어, '캐릭터의 내부 상태 값을 변경합니다' 라는 설명이 있다면 'key'와 'value' 인자가 필요할 가능성이 높습니다.
-   'expression'은 캐릭터의 표정을 나타내며, 필수 항목입니다.
-   최종 출력은 반드시 JSON 객체여야 하며, 다른 텍스트나 설명이 포함되어서는 안 됩니다.
`;
  }

  /**
   * LLM API를 호출하고 응답을 파싱하는 범용 함수입니다.
   * @param systemPrompt LLM에 전달할 시스템 프롬프트
   * @param history 대화 기록
   * @param llmSettings 사용할 LLM 설정
   * @returns 파싱된 JSON 객체 응답
   */
  private async _invokeLlm(
    systemPrompt: string,
    history: HistoryMessage[],
    llmSettings: LlmSettings
  ): Promise<any> {
    const modelInfo = SUPPORTED_MODELS.find(m => m.id === llmSettings.selectedModel);
    if (!modelInfo) {
      throw new Error('선택된 LLM 모델을 찾을 수 없습니다.');
    }

    const { provider, modelId } = modelInfo;
    const apiKey = llmSettings.apiKeys[provider.toLowerCase() as keyof typeof llmSettings.apiKeys];

    if (!apiKey) {
      throw new Error(`${provider} API 키가 설정되어 있지 않습니다. 설정에서 입력해 주세요.`);
    }

    let requestUrl: string;
    let requestOptions: RequestInit;

    switch (provider) {
      case 'Google':
        ({ requestUrl, requestOptions } = this._buildGoogleRequest(apiKey, modelId, systemPrompt, history, llmSettings));
        break;
      case 'OpenAI':
        ({ requestUrl, requestOptions } = this._buildOpenAIRequest(apiKey, modelId, systemPrompt, history, llmSettings));
        break;
      case 'Anthropic':
        ({ requestUrl, requestOptions } = this._buildAnthropicRequest(apiKey, modelId, systemPrompt, history, llmSettings));
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    const res = await fetch(requestUrl, requestOptions);

    if (!res.ok) {
      const errorData = await res.json();
      const errorMessage = errorData.error?.message || res.statusText;
      throw new Error(`API Error (${res.status}): ${errorMessage}`);
    }

    const data = await res.json();
    let text = '';

    switch (provider) {
      case 'Google':
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        break;
      case 'OpenAI':
        text = data.choices?.[0]?.message?.content || '';
        break;
      case 'Anthropic':
        text = data.content?.[0]?.text || '';
        break;
    }

    if (!text) {
      throw new Error('LLM으로부터 빈 응답을 받았습니다.');
    }
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        // JSON 객체를 찾지 못한 경우, 일반 대화로 간주하고 fallback 객체를 반환합니다.
        console.warn('[ChatService] 응답에서 JSON 객체를 찾지 못해 기본 대화로 처리합니다.', { rawText: text });
        const vrmExpressionList = this.vrmManager.currentVrm ? Object.keys(this.vrmManager.currentVrm.expressionManager.expressionMap) : ['neutral'];
        const fallbackExpr = extractExpression(text, vrmExpressionList);
        const fallbackText = removeExpressionTag(text);
        return { type: 'talk', text: fallbackText, expression: fallbackExpr };
      }
    } catch (err) {
      // JSON 파싱 중 에러가 발생한 경우에도 동일하게 처리합니다.
      console.warn('[ChatService] JSON 파싱 중 예외가 발생하여 기본 대화로 처리합니다.', { error: err, rawText: text });
      const vrmExpressionList = this.vrmManager.currentVrm ? Object.keys(this.vrmManager.currentVrm.expressionManager.expressionMap) : ['neutral'];
      const fallbackExpr = extractExpression(text, vrmExpressionList);
      const fallbackText = removeExpressionTag(text);
      return { type: 'talk', text: fallbackText, expression: fallbackExpr };
    }
  }

  private _buildGoogleRequest(apiKey: string, modelId: string, systemPrompt: string, history: HistoryMessage[], settings: LlmSettings) {
    const contents = history.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    return {
      requestUrl: `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      requestOptions: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contents,
          generationConfig: {
            temperature: settings.temperature,
            maxOutputTokens: settings.maxTokens,
          },
        }),
      },
    };
  }

  private _buildOpenAIRequest(apiKey: string, modelId: string, systemPrompt: string, history: HistoryMessage[], settings: LlmSettings) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    return {
      requestUrl: 'https://api.openai.com/v1/chat/completions',
      requestOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }),
      },
    };
  }

  private _buildAnthropicRequest(apiKey: string, modelId: string, systemPrompt: string, history: HistoryMessage[], settings: LlmSettings) {
    const messages = history.slice(-10).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    return {
      requestUrl: 'https://api.anthropic.com/v1/messages',
      requestOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          system: systemPrompt,
          messages: messages,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
        }),
      },
    };
  }
}
