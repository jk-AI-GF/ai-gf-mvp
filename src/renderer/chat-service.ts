
import eventBus from '../core/event-bus';

type ChatMessage = {
  role: string;
  parts: { text: string }[];
};

export class ChatService {
  private chatHistory: ChatMessage[] = [];

  constructor() {
    // Expose the method to the window object so other parts of the application can use it.
    // A better approach would be to use an event bus or dependency injection.
    (window as any).sendChatMessage = this.sendChatMessage.bind(this);
  }

  

  public async sendChatMessage(message: string): Promise<void> {
    const userMsg = message.trim();
    if (!userMsg) return;

    (window as any).appendMessage('user', userMsg);
    this.chatHistory.push({ role: 'user', parts: [{ text: userMsg }] });

    const apiKey = localStorage.getItem('llmApiKey');
    if (!apiKey) {
      (window as any).appendMessage('assistant', 'API 키가 설정되어 있지 않습니다. 설정에서 입력해 주세요.');
      return;
    }

    try {
      const personaText = (window as any).personaText || '';
      const vrmExpressionList = (window as any).vrmExpressionList || ['neutral', 'happy', 'sad'];
      
      const systemInstruction = {
        parts: [{ text: `${personaText}\n모든 응답에 <표정: [표정_이름]> 형식의 표정 태그를 포함해 주세요. 표정_이름은 다음 목록 중 하나여야 합니다: ${vrmExpressionList.join(', ')}. 예시: <표정: happy> 안녕하세요!` }]
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
      
      // Extract expression
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

      if ((window as any).animateExpression) {
        (window as any).animateExpression(expression, 1.0, 0.5);
      }
      
      // Send message to the chat box UI
      (window as any).appendMessage('assistant', text);
      // Trigger the floating message UI
      eventBus.emit('ui:showFloatingMessage', { text });

      if ((window as any).playTTS) {
        (window as any).playTTS(text);
      }

      this.chatHistory.push({ role: 'model', parts: [{ text }] });

    } catch (err: any) {
      console.error('Gemini API call failed:', err);
      (window as any).appendMessage('assistant', 'Gemini API 호출 실패: ' + err.message);
    }
  }
}
