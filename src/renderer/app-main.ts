import { ChatService } from './chat-service';
import { makePanelsDraggable } from './draggable-panels';
import { createJointSliders, createExpressionSliders, createMeshList, createModList, toggleVrmMeshVisibility } from './ui-manager';

// This function creates the list of plugins in the UI
function createPluginList() {
  const pluginsListDiv = document.getElementById('plugins-list') as HTMLDivElement;
  if (!pluginsListDiv) return;

  pluginsListDiv.innerHTML = ''; // Clear existing list

  if (!(window as any).pluginManager) {
    pluginsListDiv.textContent = '플러그인 관리자를 찾을 수 없습니다.';
    return;
  }

  // Iterate over registered plugins
  for (const plugin of (window as any).pluginManager.plugins.values()) {
    const pluginDiv = document.createElement('div');
    pluginDiv.style.marginBottom = '10px';
    pluginDiv.style.display = 'flex';
    pluginDiv.style.alignItems = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `plugin-toggle-${plugin.name}`;
    checkbox.checked = plugin.enabled;
    checkbox.style.marginRight = '10px';
    checkbox.style.width = '20px';
    checkbox.style.height = '20px';
    checkbox.style.cursor = 'pointer';

    const label = document.createElement('label');
    label.htmlFor = `plugin-toggle-${plugin.name}`;
    label.textContent = plugin.name;
    label.style.color = 'white';
    label.style.fontSize = '1.1rem';
    label.style.cursor = 'pointer';

    checkbox.onchange = (event) => {
      if ((event.target as HTMLInputElement).checked) {
        (window as any).pluginManager.enable(plugin.name);
      } else {
        (window as any).pluginManager.disable(plugin.name);
      }
    };

    pluginDiv.appendChild(checkbox);
    pluginDiv.appendChild(label);
    pluginsListDiv.appendChild(pluginDiv);
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  new ChatService(); // This will handle all chat functionality

  // Make control panels draggable
  makePanelsDraggable();

  // UI Panel Logic
  document.getElementById('quit-app-button')!.onclick = () => (window as any).electronAPI.quitApp();
  
  document.getElementById('open-joint-control')!.onclick = () => {
    const jointControlPanel = document.getElementById('joint-control-panel') as HTMLDivElement;
    if (jointControlPanel.style.display === 'block') {
      jointControlPanel.style.display = 'none';
    } else {
      jointControlPanel.style.display = 'block';
      if ((window as any).currentVrm) {
        createJointSliders();
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
      createExpressionSliders();
    }
  };
  document.getElementById('close-expression-panel')!.onclick = () => {
    (document.getElementById('expression-control-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('open-plugins-panel-button')!.onclick = () => {
    const pluginControlPanel = document.getElementById('plugin-control-panel') as HTMLDivElement;
    if (pluginControlPanel.style.display === 'block') {
      pluginControlPanel.style.display = 'none';
    } else {
      pluginControlPanel.style.display = 'block';
      if ((window as any).pluginManager) {
        createPluginList();
      }
    }
  };
  document.getElementById('close-plugins-panel')!.onclick = () => {
    (document.getElementById('plugin-control-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('open-mesh-panel-button')!.onclick = () => {
    const meshControlPanel = document.getElementById('mesh-control-panel') as HTMLDivElement;
    if (meshControlPanel.style.display === 'block') {
      meshControlPanel.style.display = 'none';
    } else {
      meshControlPanel.style.display = 'block';
      createMeshList((window as any).vrmManager.currentVrm, toggleVrmMeshVisibility);
    }
  };
  document.getElementById('close-mesh-panel')!.onclick = () => {
    (document.getElementById('mesh-control-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('open-mod-management-panel-button')!.onclick = () => {
    const modManagementPanel = document.getElementById('mod-management-panel') as HTMLDivElement;
    if (modManagementPanel.style.display === 'block') {
      modManagementPanel.style.display = 'none';
    } else {
      modManagementPanel.style.display = 'block';
      createModList();
    }
  };  
  document.getElementById('close-mod-management-panel')!.onclick = () => {
    (document.getElementById('mod-management-panel') as HTMLDivElement).style.display = 'none';
  };
});
