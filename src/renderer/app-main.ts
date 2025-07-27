import { ChatService } from './chat-service';
import { makePanelsDraggable } from './draggable-panels';




document.addEventListener('DOMContentLoaded', async () => {
  new ChatService(); // This will handle all chat functionality

  // Make control panels draggable
  makePanelsDraggable();

  // UI Panel Logic
  document.getElementById('quit-app-button')!.onclick = () => (window as any).electronAPI.quitApp();
  
  
  
  document.getElementById('close-pose-panel')!.onclick = () => {
    (document.getElementById('pose-side-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('close-animation-panel')!.onclick = () => {
    (document.getElementById('animation-side-panel') as HTMLDivElement).style.display = 'none';
  };
  
  
  
  
  
  document.getElementById('close-mesh-panel')!.onclick = () => {
    (document.getElementById('mesh-control-panel') as HTMLDivElement).style.display = 'none';
  };
    
  document.getElementById('close-mod-management-panel')!.onclick = () => {
    (document.getElementById('mod-management-panel') as HTMLDivElement).style.display = 'none';
  };
});
