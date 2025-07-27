import { ChatService } from './chat-service';





document.addEventListener('DOMContentLoaded', async () => {
  new ChatService(); // This will handle all chat functionality

  

  // UI Panel Logic
  document.getElementById('quit-app-button')!.onclick = () => (window as any).electronAPI.quitApp();
  
  
  
  document.getElementById('close-pose-panel')!.onclick = () => {
    (document.getElementById('pose-side-panel') as HTMLDivElement).style.display = 'none';
  };
  document.getElementById('close-animation-panel')!.onclick = () => {
    (document.getElementById('animation-side-panel') as HTMLDivElement).style.display = 'none';
  };
});
