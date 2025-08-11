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
      const subJson = JSON.stringify(availableSubroutines, null, 2);
      const systemPrompt = `${basePrompt}\n\n다음 JSON 배열은 현재 실행 가능한 Action(서브루틴) 목록입니다:
${subJson}

사용자의 다음 요청을 분석하여, 가장 적절한 행동을 결정하세요.

**응답 생성 규칙:**
1.  **먼저 생각하기 (Think Step):** 사용자의 요청을 완수하기 위해 어떤 서브루틴을 사용해야 할지, 또는 단순 대화로 충분할지 판단합니다. 서브루틴을 사용해야 한다면, 해당 서브루틴의 'description'과 'capabilities'를 보고 어떤 'arguments'가 필요한지 분석합니다.
2.  **최종 응답 생성 (JSON Output):** 생각한 내용을 바탕으로, 아래 형식 중 하나에 맞춰 **반드시 순수한 JSON 객체 하나만** 응답으로 생성합니다. 다른 설명이나 텍스트를 포함해서는 안 됩니다.

**JSON 형식:**

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
  "arguments": { "key": "value" }, // 서브루틴의 description을 참고하여 필요한 모든 인자를 채워야 합니다.
  "text": "행동과 함께 출력할 대사입니다.",
  "expression": "표정 이름"
}

**매우 중요:**
-   'subroutine'의 이름은 위에 제공된 Action 목록에 있는 이름과 정확히 일치해야 합니다.
-   'arguments' 객체는 서브루틴의 'description'을 분석하여 **필요한 모든 키와 값을 포함**해야 합니다. 예를 들어, '캐릭터의 내부 상태 값을 변경합니다' 라는 설명이 있다면 'key'와 'value' 인자가 필요할 가능성이 높습니다.
-   'expression'은 캐릭터의 표정을 나타내며, 필수 항목입니다.
-   최종 출력은 반드시 JSON 객체여야 하며, 다른 텍스트나 설명이 포함되어서는 안 됩니다.
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
      
      let payload: any;
      try {
        // LLM 응답에서 JSON 객체만 추출하는 정규식을 사용합니다.
        // LLM이 생각 과정을 포함하여 응답하더라도 JSON 부분만 파싱합니다.
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          payload = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON object found in the response.");
        }
      } catch (err) {
        console.warn('[ChatService] JSON 파싱 실패, 기본 대화로 처리합니다.', { error: err, rawText: text });
        const fallbackExpr = extractExpression(text, vrmExpressionList);
        const fallbackText = removeExpressionTag(text);
        eventBus.emit('llm:responseReceived', { type: 'talk', text: fallbackText, expression: fallbackExpr });
        eventBus.emit('chat:newMessage', { role: 'assistant', text: fallbackText });
        eventBus.emit('ui:showFloatingMessage', { text: fallbackText });
        this.chatHistory.push({ role: 'assistant', content: fallbackText });
        return;
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