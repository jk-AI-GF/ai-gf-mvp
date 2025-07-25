document.addEventListener('DOMContentLoaded', async () => {
  // Initial persona loading
  const personaTextarea = document.getElementById('persona-text') as HTMLTextAreaElement;
  const saveMessage = document.getElementById('save-message') as HTMLDivElement; // Get saveMessage here

  const savedPersona = localStorage.getItem('userPersona');
  if (savedPersona) {
    personaTextarea.value = savedPersona;
    (window as any).personaText = savedPersona;
    console.log('Persona loaded from localStorage:', (window as any).personaText);
  } else {
    try {
      const response = await fetch('/main_window/assets/Persona/persona.txt');
      const text = await response.text();
      (window as any).personaText = text.trim();
      personaTextarea.value = (window as any).personaText;
      console.log('Persona loaded from file:', (window as any).personaText);
    } catch (error) {
      console.error('Failed to load persona.txt:', error);
      (window as any).personaText = ''; // Fallback to empty string if loading fails
    }
  }

  document.getElementById('close-overlay')!.onclick = () => (window as any).close();
  document.getElementById('open-settings')!.onclick = () => {
    const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
    const settingsOverlay = document.getElementById('settings-modal-overlay') as HTMLDivElement;
    settingsModal.style.display = 'block';
    settingsModal.style.visibility = 'visible';
    settingsModal.style.opacity = '1';
    settingsOverlay.style.display = 'block';
    settingsOverlay.style.pointerEvents = 'auto';
  };
  document.getElementById('close-settings')!.onclick = () => {
    const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
    const settingsOverlay = document.getElementById('settings-modal-overlay') as HTMLDivElement;
    settingsModal.style.opacity = '0';
    settingsModal.style.visibility = 'hidden';
    settingsOverlay.style.display = 'none';
    settingsOverlay.style.pointerEvents = 'none';
    // Give time for the transition to complete before setting display to 'none'
    setTimeout(() => {
      settingsModal.style.display = 'none';
    }, 300); // Matches the transition duration
  };
  document.getElementById('open-joint-control')!.onclick = () => {
    (document.getElementById('joint-control-panel') as HTMLDivElement).style.display = 'block';
    if ((window as any).currentVrm && (window as any).createJointSliders) {
      (window as any).createJointSliders();
    }
  };
  document.getElementById('close-joint-control')!.onclick = () => {
    (document.getElementById('joint-control-panel') as HTMLDivElement).style.display = 'none';
  };
  // document.getElementById('open-pose-panel-button').onclick = () => {
  //   document.getElementById('pose-side-panel').style.display = 'flex';
  //   // The list will be populated by renderer.ts
  // };
  document.getElementById('close-pose-panel')!.onclick = () => {
    (document.getElementById('pose-side-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('close-animation-panel')!.onclick = () => {
    (document.getElementById('animation-side-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('open-expression-panel-button')!.onclick = () => {
    const expressionControlPanel = document.getElementById('expression-control-panel') as HTMLDivElement;
    if (expressionControlPanel.style.display === 'block') {
      expressionControlPanel.style.display = 'none';
    } else {
      expressionControlPanel.style.display = 'block';
      if ((window as any).createExpressionSliders) {
        (window as any).createExpressionSliders();
      }
    }
  };
  document.getElementById('close-expression-panel')!.onclick = () => {
    (document.getElementById('expression-control-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('open-modules-panel-button')!.onclick = () => {
    const moduleControlPanel = document.getElementById('module-control-panel') as HTMLDivElement;
    if (moduleControlPanel.style.display === 'block') {
      moduleControlPanel.style.display = 'none';
    } else {
      moduleControlPanel.style.display = 'block';
      if ((window as any).moduleManager && (window as any).createModuleList) {
        (window as any).createModuleList();
      }
    }
  };
  document.getElementById('close-modules-panel')!.onclick = () => {
    (document.getElementById('module-control-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('open-mesh-panel-button')!.onclick = () => {
    const meshControlPanel = document.getElementById('mesh-control-panel') as HTMLDivElement;
    if (meshControlPanel.style.display === 'block') {
      meshControlPanel.style.display = 'none';
    } else {
      meshControlPanel.style.display = 'block';
      if ((window as any).listVrmMeshes && (window as any).toggleVrmMeshVisibility && (window as any).createMeshList) {
        (window as any).createMeshList();
      }
    }
  };
  document.getElementById('close-mesh-panel')!.onclick = () => {
    (document.getElementById('mesh-control-panel') as HTMLDivElement).style.display = 'none';
  };
  // LLM API 저장 로직
  const form = document.getElementById('llm-form') as HTMLFormElement;
  form.onsubmit = (e) => {
    e.preventDefault();
    const apiKey = (document.getElementById('llm-api-key') as HTMLInputElement).value;
    localStorage.setItem('llmApiKey', apiKey);
    saveMessage.style.display = 'block';
    setTimeout(() => { saveMessage.style.display = 'none'; }, 2000);
  };
  (document.getElementById('llm-api-key') as HTMLInputElement).value = localStorage.getItem('llmApiKey') || '';

  // Persona setting
  // Persona setting
  const personaForm = document.getElementById('persona-form') as HTMLFormElement;
  const loadPersonaFileButton = document.getElementById('load-persona-file-button') as HTMLButtonElement;

  personaForm.onsubmit = async (e) => {
    e.preventDefault();
    const persona = personaTextarea.value.trim();
    localStorage.setItem('userPersona', persona);
    (window as any).personaText = persona; // Update window.personaText on save
    saveMessage.style.display = 'block';
    setTimeout(() => { saveMessage.style.display = 'none'; }, 2000);

    // Save persona to file via Electron main process
    try {
      const result = await (window as any).electronAPI.savePersonaToFile(persona);
      if (result.success) {
        console.log(`Persona saved to file: ${result.message}`);
      } else {
        console.error(`Failed to save persona to file: ${result.message}`);
      }
    } catch (error) {
      console.error('Error calling savePersonaToFile:', error);
    }
  };

  loadPersonaFileButton.onclick = async () => {
    try {
      const personaContent = await (window as any).electronAPI.openPersonaFile();
      if (personaContent) {
        personaTextarea.value = personaContent;
        localStorage.setItem('userPersona', personaContent); // Also save to localStorage
        (window as any).personaText = personaContent; // Update window.personaText
        saveMessage.textContent = '페르소나를 파일에서 불러왔습니다!';
        saveMessage.style.display = 'block';
        setTimeout(() => { saveMessage.style.display = 'none'; }, 2000);
      } else {
        saveMessage.textContent = '페르소나 파일 불러오기 취소됨.';
        saveMessage.style.display = 'block';
        setTimeout(() => { saveMessage.style.display = 'none'; }, 2000);
      }
    } catch (error: any) {
      console.error('Error loading persona from file:', error);
      saveMessage.textContent = `페르소나 파일 불러오기 실패: ${error.message}`;
      saveMessage.style.display = 'block';
      setTimeout(() => { saveMessage.style.display = 'none'; }, 2000);
    }
  };

  // Background color setting
  const backgroundColorPicker = document.getElementById('background-color-picker') as HTMLInputElement;
  const savedBackgroundColor = localStorage.getItem('backgroundColor');
  if (savedBackgroundColor) {
    backgroundColorPicker.value = savedBackgroundColor;
    if ((window as any).setClearColor) {
      (window as any).setClearColor(parseInt(savedBackgroundColor.replace('#', '0x')));
    }
  }

  backgroundColorPicker.onchange = (e) => {
    const color = (e.target as HTMLInputElement).value;
    localStorage.setItem('backgroundColor', color);
    if ((window as any).setClearColor) {
      (window as any).setClearColor(parseInt(color.replace('#', '0x')));
    }
  };
  
  const chatForm = document.getElementById('chat-form') as HTMLFormElement;
  const chatInput = document.getElementById('chat-input') as HTMLInputElement;
  const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
  let chatHistory: { role: string; parts: { text: string }[] }[] = []; // Make chatHistory a global variable within this script scope

  

  (window as any).sendChatMessage = async function(message: string) {
    const userMsg = message.trim();
    if (!userMsg) return;

    (window as any).appendMessage('user', userMsg);
    chatHistory.push({ role: 'user', parts: [{ text: userMsg }] });
    if (chatInput) chatInput.value = ''; // Clear input only if it exists

    // Gemini API 호출
    const apiKey = localStorage.getItem('llmApiKey');
    if (!apiKey) {
      (window as any).appendMessage('assistant', 'API 키가 설정되어 있지 않습니다. 설정에서 입력해 주세요.');
      return;
    }
    try {
      const contentsToSend = [
        { role: 'system', parts: [{ text: `${(window as any).personaText}\n모든 응답에 <표정: [표정_이름]> 형식의 표정 태그를 포함해 주세요. 표정_이름은 다음 목록 중 하나여야 합니다: ${(window as any).vrmExpressionList ? (window as any).vrmExpressionList.join(', ') : '기본, 행복, 슬픔'}. 예시: <표정: 행복> 안녕하세요!` }] },
        ...chatHistory.slice(-10) // 최근 10개만 보냄
      ];
      console.log('Contents sent to Gemini API:', contentsToSend);
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${(window as any).personaText}\n모든 응답에 <표정: [표정_이름]> 형식의 표정 태그를 포함해 주세요. 표정_이름은 다음 목록 중 하나여야 합니다: ${(window as any).vrmExpressionList ? (window as any).vrmExpressionList.join(', ') : '기본, 행복, 슬픔'}. 예시: <표정: 행복> 안녕하세요!` }] },
          contents: chatHistory.slice(-10), // 최근 10개만 보냄
        })
      });
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답이 없습니다.';
      let expression = 'happy'; // Default expression
      const expressionMatch = text.match(/<표정:\s*(.*?)\s*>/);
      if (expressionMatch && expressionMatch[1]) {
        const proposedExpression = expressionMatch[1];
        if ((window as any).vrmExpressionList && (window as any).vrmExpressionList.includes(proposedExpression)) {
          expression = proposedExpression;
        } else {
          console.warn(`LLM proposed expression "${proposedExpression}" not found in VRM expression list. Using default "기본".`);
        }
        text = text.replace(/<표정:\s*(.*?)\s*>/, '').trim(); // Remove the expression tag from the text
      }
      console.log('LLM Response Text:', text);
      console.log('LLM Expression:', expression);

      // VRM 모델에 표정 적용
      if ((window as any).currentVrm && (window as any).currentVrm.expressionManager && (window as any).expressionMap) {

        // LLM이 제안한 표정을 VRM 모델에 점진적으로 적용
        if ((window as any).vrmExpressionList.includes(expression)) { // LLM이 제안한 표정이 유효한지 다시 확인
            (window as any).animateExpression(expression, 1.0, 0.5); // 0.5초 동안 점진적으로 변경

        } else {
          console.warn(`LLM proposed expression "${expression}" not found in VRM expression list. Not applying.`);
        }
      } else {
        console.warn('VRM model or expressionManager not ready for expression application.', { currentVrm: (window as any).currentVrm, expressionManager: (window as any).currentVrm?.expressionManager, expressionMap: (window as any).expressionMap });
      }

      (window as any).appendMessage('assistant', text);

      if ((window as any).playTTS) {
        (window as any).playTTS(text);
      }

      chatHistory.push({ role: 'model', parts: [{ text }] });
    }
     catch (err: any) {
      (window as any).appendMessage('assistant', 'Gemini API 호출 실패: ' + err);
    }
  };

  (window as any).createModuleList = function() {
    const modulesListDiv = document.getElementById('modules-list') as HTMLDivElement;
    if (!modulesListDiv) return;

    modulesListDiv.innerHTML = ''; // Clear existing list

    if (!(window as any).moduleManager) {
      modulesListDiv.textContent = '모듈 관리자를 찾을 수 없습니다.';
      return;
    }

    // Iterate over registered modules
    for (const module of (window as any).moduleManager.modules.values()) {
      const moduleDiv = document.createElement('div');
      moduleDiv.style.marginBottom = '10px';
      moduleDiv.style.display = 'flex';
      moduleDiv.style.alignItems = 'center';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `module-toggle-${module.name}`;
      checkbox.checked = module.enabled;
      checkbox.style.marginRight = '10px';
      checkbox.style.width = '20px';
      checkbox.style.height = '20px';
      checkbox.style.cursor = 'pointer';

      const label = document.createElement('label');
      label.htmlFor = `module-toggle-${module.name}`;
      label.textContent = module.name;
      label.style.color = 'white';
      label.style.fontSize = '1.1rem';
      label.style.cursor = 'pointer';

      checkbox.onchange = (event) => {
        if ((event.target as HTMLInputElement).checked) {
          (window as any).moduleManager.enable(module.name);
        } else {
          (window as any).moduleManager.disable(module.name);
        }
      };

      moduleDiv.appendChild(checkbox);
      moduleDiv.appendChild(label);
      modulesListDiv.appendChild(moduleDiv);
    }
  };

  

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    (window as any).sendChatMessage(chatInput.value);
  };
});