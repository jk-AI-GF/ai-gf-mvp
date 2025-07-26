
import { setClearColor } from './scene-utils';

export class SettingsService {
  private personaTextarea: HTMLTextAreaElement;
  private saveMessage: HTMLDivElement;
  private apiKeyInput: HTMLInputElement;
  private backgroundColorPicker: HTMLInputElement;

  constructor() {
    this.personaTextarea = document.getElementById('persona-text') as HTMLTextAreaElement;
    this.saveMessage = document.getElementById('save-message') as HTMLDivElement;
    this.apiKeyInput = document.getElementById('llm-api-key') as HTMLInputElement;
    this.backgroundColorPicker = document.getElementById('background-color-picker') as HTMLInputElement;
  }

  /**
   * Loads all initial settings from localStorage or files.
   */
  public async loadInitialSettings(): Promise<void> {
    this.loadApiKey();
    this.loadBackgroundColor();
    await this.loadPersona();
  }

  /**
   * Sets up all event listeners for the settings UI.
   */
  public setupEventListeners(): void {
    this.setupApiKeyForm();
    this.setupPersonaForm();
    this.setupBackgroundColorPicker();
  }

  private showSaveMessage(message: string, duration: number = 2000): void {
    if (!this.saveMessage) return;
    this.saveMessage.textContent = message;
    this.saveMessage.style.display = 'block';
    setTimeout(() => {
      this.saveMessage.style.display = 'none';
    }, duration);
  }

  // --- API Key ---
  private loadApiKey(): void {
    this.apiKeyInput.value = localStorage.getItem('llmApiKey') || '';
  }

  private setupApiKeyForm(): void {
    const form = document.getElementById('llm-form') as HTMLFormElement;
    form.onsubmit = (e) => {
      e.preventDefault();
      localStorage.setItem('llmApiKey', this.apiKeyInput.value);
      this.showSaveMessage('API 키가 저장되었습니다.');
    };
  }

  // --- Persona ---
  private async loadPersona(): Promise<void> {
    const savedPersona = localStorage.getItem('userPersona');
    if (savedPersona) {
      this.personaTextarea.value = savedPersona;
      (window as any).personaText = savedPersona;
      console.log('Persona loaded from localStorage.');
    } else {
      try {
        // Assuming assets are served from the root. Adjust path if necessary.
        const response = await fetch('/main_window/assets/Persona/persona.txt');
        const text = await response.text();
        (window as any).personaText = text.trim();
        this.personaTextarea.value = (window as any).personaText;
        console.log('Default persona loaded from file.');
      } catch (error) {
        console.error('Failed to load default persona.txt:', error);
        (window as any).personaText = ''; // Fallback
      }
    }
  }

  private setupPersonaForm(): void {
    const personaForm = document.getElementById('persona-form') as HTMLFormElement;
    const loadPersonaFileButton = document.getElementById('load-persona-file-button') as HTMLButtonElement;

    personaForm.onsubmit = async (e) => {
      e.preventDefault();
      const persona = this.personaTextarea.value.trim();
      localStorage.setItem('userPersona', persona);
      (window as any).personaText = persona;
      this.showSaveMessage('페르소나가 저장되었습니다.');

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
        if (personaContent !== null) {
          this.personaTextarea.value = personaContent;
          localStorage.setItem('userPersona', personaContent);
          (window as any).personaText = personaContent;
          this.showSaveMessage('페르소나를 파일에서 불러왔습니다!');
        } else {
           this.showSaveMessage('페르소나 파일 불러오기가 취소되었습니다.');
        }
      } catch (error: any) {
        console.error('Error loading persona from file:', error);
        this.showSaveMessage(`페르소나 파일 불러오기 실패: ${error.message}`);
      }
    };
  }

  // --- Background Color ---
  private loadBackgroundColor(): void {
    const savedColor = localStorage.getItem('backgroundColor');
    if (savedColor) {
      this.backgroundColorPicker.value = savedColor;
      // The setClearColor function is defined in scene-utils and exposed on the window object
      // by renderer.ts. A better approach would be to pass it in or use an event bus.
      if ((window as any).setClearColor) {
        (window as any).setClearColor(parseInt(savedColor.replace('#', '0x')));
      }
    }
  }

  private setupBackgroundColorPicker(): void {
    this.backgroundColorPicker.onchange = (e) => {
      const color = (e.target as HTMLInputElement).value;
      localStorage.setItem('backgroundColor', color);
      if ((window as any).setClearColor) {
        (window as any).setClearColor(parseInt(color.replace('#', '0x')));
      }
    };
  }
}
