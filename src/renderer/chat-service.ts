
import eventBus from '../core/event-bus';
import { VRMManager } from './vrm-manager';
import { PluginManager } from '../plugins/plugin-manager';

type ChatMessage = {
  role: string;
  parts: { text: string }[];
};

export class ChatService {
  private chatHistory: ChatMessage[] = [];
  private vrmManager: VRMManager;
  private pluginManager: PluginManager;

  constructor(vrmManager: VRMManager, pluginManager: PluginManager) {
    this.vrmManager = vrmManager;
    this.pluginManager = pluginManager;
  }

  public async sendChatMessage(message: string, persona: string): Promise<void> {
    const userMsg = message.trim();
    if (!userMsg) return;

    eventBus.emit('chat:newMessage', { role: 'user', text: userMsg });
    this.chatHistory.push({ role: 'user', parts: [{ text: userMsg }] });

    const apiKey = localStorage.getItem('llmApiKey');
    if (!apiKey) {
      eventBus.emit('chat:newMessage', { role: 'assistant', text: 'API 키가 설정되어 있지 않습니다. 설정에서 입력해 주세요.' });
      return;
    }

    try {
      const vrmExpressionList = this.vrmManager.currentVrm 
        ? Object.keys(this.vrmManager.currentVrm.expressionManager.expressionMap)
        : ['neutral', 'happy', 'sad'];
      
      const systemInstruction = {
        parts: [{ text: `${persona}\n모든 응답에 <표정: [표정_이름]> 형식의 표정 태그를 포함해 주세요. 표정_이름은 다음 목록 중 하나여야 합니다: ${vrmExpressionList.join(', ')}. 예시: <표정: happy> 안녕하세요!` }]
      };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemInstruction,
          contents: this.chatHistory.slice(-10),
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`API Error: ${errorData.error?.message || res.statusText}`);
      }

      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답이 없습니다.';
      
      let expression = 'happy'; // Default expression
      const expressionMatch = text.match(/<표정:\s*(.*?)\s*>/);
      if (expressionMatch && expressionMatch[1]) {
        const proposedExpression = expressionMatch[1];
        if (vrmExpressionList.includes(proposedExpression)) {
          expression = proposedExpression;
        } else {
          console.warn(`LLM proposed expression "${proposedExpression}" not found in VRM expression list. Using default.`);
        }
        text = text.replace(/<표정:\s*(.*?)\s*>/, '').trim();
      }

      // Use actions from plugin context
      this.pluginManager.context.actions.setExpression(expression, 1.0, 0.5);
      this.pluginManager.context.actions.speak(text);
      
      eventBus.emit('chat:newMessage', { role: 'assistant', text });
      eventBus.emit('ui:showFloatingMessage', { text });

      this.chatHistory.push({ role: 'model', parts: [{ text }] });

    } catch (err: any) {
      console.error('Gemini API call failed:', err);
      eventBus.emit('chat:newMessage', { role: 'assistant', text: 'Gemini API 호출 실패: ' + err.message });
    }
  }
}
