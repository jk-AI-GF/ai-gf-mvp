import { SettingsService } from './settings-service';
import { ChatService } from './chat-service';
import { makePanelsDraggable } from './draggable-panels';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize services
  const settingsService = new SettingsService();
  await settingsService.loadInitialSettings();
  settingsService.setupEventListeners();

  new ChatService(); // This will handle all chat functionality

  // Make control panels draggable
  makePanelsDraggable();

  // UI Panel Logic
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
    const jointControlPanel = document.getElementById('joint-control-panel') as HTMLDivElement;
    if (jointControlPanel.style.display === 'block') {
      jointControlPanel.style.display = 'none';
    } else {
      jointControlPanel.style.display = 'block';
      if ((window as any).currentVrm && (window as any).createJointSliders) {
        (window as any).createJointSliders();
      }
    }
  };
  document.getElementById('close-joint-control')!.onclick = () => {
    (document.getElementById('joint-control-panel') as HTMLDivElement).style.display = 'none';
  };
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

  // This function creates the list of modules in the UI
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
});
