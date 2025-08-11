
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
  }

  public async sendChatMessage(
    message: string,
    persona: string,
    llmSettings: LlmSettings
  ): Promise<void> {
    const userMsg = message.trim();
    if (!userMsg) return;

    eventBus.emit('chat:newMessage', { role: 'user', text: userMsg });
    this.chatHistory.push({ role: 'user', content: userMsg });

    const modelInfo = SUPPORTED_MODELS.find(m => m.id === llmSettings.selectedModel);
    if (!modelInfo) {
      eventBus.emit('chat:newMessage', { role: 'assistant', text: '선택된 LLM 모델을 찾을 수 없습니다.' });
      return;
    }

    const { provider, modelId } = modelInfo;
    const apiKey = llmSettings.apiKeys[provider.toLowerCase() as keyof typeof llmSettings.apiKeys];

    if (!apiKey) {
      eventBus.emit('chat:newMessage', { role: 'assistant', text: `${provider} API 키가 설정되어 있지 않습니다. 설정에서 입력해 주세요.` });
      return;
    }

    try {
      const vrmExpressionList = this.vrmManager.currentVrm
        ? Object.keys(this.vrmManager.currentVrm.expressionManager.expressionMap)
        : ['neutral', 'happy', 'sad'];

      // 0. Get current character state
      const currentState = characterState.toJSON();
      const stateJson = JSON.stringify(currentState, null, 2);

      // 1. 시스템 프롬프트와 페르소나, 캐릭터 상태를 결합합니다.
      const combinedSystemPrompt = `${llmSettings.systemPrompt}\n\n${persona}\n\n캐릭터의 현재 상태는 다음과 같습니다:\n${stateJson}`;

      // 2. 기본 프롬프트에 표정 태그 지시를 추가합니다.
      const basePrompt = `${combinedSystemPrompt}\n\n모든 응답에 <표정: [표정_이름]> 형식의 표정 태그를 포함해 주세요. 표정_이름은 다음 목록 중 하나여야 합니다: ${vrmExpressionList.join(', ')}. 예시: <표정: happy> 안녕하세요!`;
      
      // 3. 최종 시스템 프롬프트에 서브루틴과 JSON 출력 형식을 추가합니다.
      const availableSubroutines = this.pluginManager.context?.sequenceManager?.getAvailableSubroutines() || [];
      const subJson = JSON.stringify(availableSubroutines);
      const systemPrompt = `${basePrompt}\n\n다음 JSON 배열은 현재 실행 가능한 Action(서브루틴) 목록입니다:
${subJson}\n\nLLM 응답은 반드시 JSON 객체 하나만 포함해야 합니다. 형식은 다음과 같습니다.

// 1. 캐릭터가 단순히 대답만 할 경우:
{
  "type": "talk",
  "text": "캐릭터가 할 대사입니다.",
  "expression": "표정 이름"
}

// 2. 캐릭터가 행동(서브루틴)을 수행할 경우:
{
  "type": "action",
  "subroutine": "실행할 서브루틴의 이름",
  "arguments": { "인자이름1": "값1", "인자이름2": "값2" }, // 서브루틴에 필요한 인자들
  "text": "행동과 함께 출력할 대사입니다.",
  "expression": "표정 이름"
}

// 중요:
// - 응답은 다른 어떤 텍스트도 없이 순수한 JSON 객체여야 합니다.
// - 'subroutine'의 이름은 위에 제공된 Action 목록에 있는 이름과 정확히 일치해야 합니다.
// - 'arguments'는 해당 서브루틴이 요구하는 인자를 모두 포함해야 합니다.
// - 'expression'은 캐릭터의 표정을 나타내며, 필수 항목입니다.
`;

      let requestUrl: string;
      let requestOptions: RequestInit;

      switch (provider) {
        case 'Google':
          ({ requestUrl, requestOptions } = this._buildGoogleRequest(apiKey, modelId, systemPrompt, this.chatHistory, llmSettings));
          break;
        case 'OpenAI':
          ({ requestUrl, requestOptions } = this._buildOpenAIRequest(apiKey, modelId, systemPrompt, this.chatHistory, llmSettings));
          break;
        case 'Anthropic':
          ({ requestUrl, requestOptions } = this._buildAnthropicRequest(apiKey, modelId, systemPrompt, this.chatHistory, llmSettings));
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
        text = '응답이 없습니다.';
      }
      // JSON 파싱 및 분기 처리
      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch (err) {
        // Try to extract JSON object embedded in markdown or extra text
        const match = text.match(/({[\s\S]*})/);
        if (match) {
          try {
            payload = JSON.parse(match[1]);
          } catch (err2) {
            console.warn('[ChatService] JSON 파싱 실패, 기본 대화로 처리합니다.', err2);
          }
        }
        if (!payload) {
          console.warn('[ChatService] JSON 파싱 실패, 기본 대화로 처리합니다.', err);
          const fallbackExpr = extractExpression(text, vrmExpressionList);
          const fallbackText = removeExpressionTag(text);
          eventBus.emit('llm:responseReceived', { type: 'talk', text: fallbackText, expression: fallbackExpr });
          eventBus.emit('chat:newMessage', { role: 'assistant', text: fallbackText });
          eventBus.emit('ui:showFloatingMessage', { text: fallbackText });
          this.chatHistory.push({ role: 'assistant', content: fallbackText });
          return;
        }
      }
      // 처리된 JSON payload를 기반으로 분기
      if (payload.type === 'action') {
        const { subroutine, arguments: args, text: speech, expression: expr } = payload;
        // 서브루틴 실행은 이제 LlmResponseHandlerPlugin이 담당합니다.
        eventBus.emit('llm:responseReceived', { type: 'action', subroutine, arguments: args, text: speech, expression: expr });
        eventBus.emit('chat:newMessage', { role: 'assistant', text: speech });
        eventBus.emit('ui:showFloatingMessage', { text: speech });
        this.chatHistory.push({ role: 'assistant', content: speech });
      } else {
        const { text: speech, expression: expr } = payload;
        eventBus.emit('llm:responseReceived', { type: 'talk', text: speech, expression: expr });
        eventBus.emit('chat:newMessage', { role: 'assistant', text: speech });
        eventBus.emit('ui:showFloatingMessage', { text: speech });
        this.chatHistory.push({ role: 'assistant', content: speech });
      }

    }
    catch (err: any) {
      console.error(`${provider} API call failed:`, err);
      eventBus.emit('chat:newMessage', { role: 'assistant', text: `${provider} API 호출 실패: ${err.message}` });
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
