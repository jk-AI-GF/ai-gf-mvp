import React, { useState, useEffect } from 'react';
import TopMenu from './components/TopMenu';
import SettingsModal from './components/SettingsModal';
import JointControlPanel from './components/JointControlPanel';
import ExpressionPanel from './components/ExpressionPanel';
import Sidebar from './components/Sidebar';
import PluginPanel from './components/PluginPanel';
import MeshControlPanel from './components/MeshControlPanel';
import ModManagementPanel from './components/ModManagementPanel';
import PosePanel from './components/PosePanel';
import AnimationPanel from './components/AnimationPanel';
import Chat from './components/Chat';
import CameraControl from './components/CameraControl';
import FloatingMessageManager from './components/FloatingMessageManager';
import eventBus from '../core/event-bus';

interface Message {
  role: string;
  text: string;
}

const App: React.FC = () => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isJointPanelOpen, setJointPanelOpen] = useState(false);
  const [isExpressionPanelOpen, setExpressionPanelOpen] = useState(false);
  const [isPluginsPanelOpen, setPluginsPanelOpen] = useState(false);
  const [isMeshPanelOpen, setMeshPanelOpen] = useState(false);
  const [isModManagementPanelOpen, setModManagementPanelOpen] = useState(false);
  const [isPosePanelOpen, setPosePanelOpen] = useState(false);
  const [isAnimationPanelOpen, setAnimationPanelOpen] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      setChatMessages(prev => [...prev, message]);
    };

    const unsubscribe = eventBus.on('chat:newMessage', handleNewMessage);

    // This replaces the old global function with an event-based one
    (window as any).appendMessage = (role: string, text: string) => {
      eventBus.emit('chat:newMessage', { role, text });
    };

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSendMessage = (text: string) => {
    if ((window as any).sendChatMessage) {
      (window as any).sendChatMessage(text);
    } else {
      console.error('ChatService is not available.');
      setChatMessages(prev => [...prev, { role: 'system', text: '오류: 채팅 서비스가 초기화되지 않았습니다.' }]);
    }
  };

  const [panelPositions, setPanelPositions] = useState({
    joint: { x: 20, y: 70 },
    expression: { x: 390, y: 70 },
    plugins: { x: window.innerWidth - 740, y: 70 },
    mesh: { x: window.innerWidth - 370, y: 70 },
    mod: { x: window.innerWidth - 370, y: 70 },
    pose: { x: window.innerWidth - 370, y: 70 },
    animation: { x: window.innerWidth - 370, y: 70 },
  });

  const handlePanelDrag = (panelId: keyof typeof panelPositions, pos: { x: number, y: number }) => {
    setPanelPositions(prev => ({
      ...prev,
      [panelId]: pos,
    }));
  };

  return (
    <div>
      <TopMenu 
        onOpenPosePanel={() => setPosePanelOpen(prev => !prev)}
        onOpenAnimationPanel={() => setAnimationPanelOpen(prev => !prev)}
      />
      <Sidebar
        onOpenSettings={() => setSettingsModalOpen(prev => !prev)}
        onOpenJointControl={() => setJointPanelOpen(prev => !prev)}
        onOpenExpressionPanel={() => setExpressionPanelOpen(prev => !prev)}
        onOpenPluginsPanel={() => setPluginsPanelOpen(prev => !prev)}
        onOpenMeshPanel={() => setMeshPanelOpen(prev => !prev)}
        onOpenModManagementPanel={() => setModManagementPanelOpen(prev => !prev)}
      />

      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
      />

      {isJointPanelOpen && <JointControlPanel onClose={() => setJointPanelOpen(false)} initialPos={panelPositions.joint} onDragEnd={(pos) => handlePanelDrag('joint', pos)} />}
      {isExpressionPanelOpen && <ExpressionPanel onClose={() => setExpressionPanelOpen(false)} initialPos={panelPositions.expression} onDragEnd={(pos) => handlePanelDrag('expression', pos)} />}
      {isPluginsPanelOpen && <PluginPanel onClose={() => setPluginsPanelOpen(false)} initialPos={panelPositions.plugins} onDragEnd={(pos) => handlePanelDrag('plugins', pos)} />}
      {isMeshPanelOpen && <MeshControlPanel onClose={() => setMeshPanelOpen(false)} initialPos={panelPositions.mesh} onDragEnd={(pos) => handlePanelDrag('mesh', pos)} />}
      {isModManagementPanelOpen && <ModManagementPanel onClose={() => setModManagementPanelOpen(false)} initialPos={panelPositions.mod} onDragEnd={(pos) => handlePanelDrag('mod', pos)} />}
      {isPosePanelOpen && <PosePanel onClose={() => setPosePanelOpen(false)} initialPos={panelPositions.pose} onDragEnd={(pos) => handlePanelDrag('pose', pos)} />}
      {isAnimationPanelOpen && <AnimationPanel onClose={() => setAnimationPanelOpen(false)} initialPos={panelPositions.animation} onDragEnd={(pos) => handlePanelDrag('animation', pos)} />}
      <Chat messages={chatMessages} onSendMessage={handleSendMessage} />
      <CameraControl />
      <FloatingMessageManager />
    </div>
  );
};

export default App;
