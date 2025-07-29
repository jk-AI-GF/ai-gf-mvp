import React, { useState, useEffect, useRef } from 'react';
import EditMenu from './components/EditMenu';
import SettingsModal from './components/SettingsModal';
import JointControlPanel from './components/JointControlPanel';
import ExpressionPanel from './components/ExpressionPanel';
import Sidebar from './components/Sidebar';
import PluginPanel from './components/PluginPanel';
import MeshControlPanel from './components/MeshControlPanel';
import ModManagementPanel from './components/ModManagementPanel';
import PosePanel from './components/PosePanel';
import AnimationPanel from './components/AnimationPanel';
import MaterialPanel from './components/MaterialPanel';
import LightPanel from './components/LightPanel';
import Chat from './components/Chat';
import FloatingMessageManager from './components/FloatingMessageManager';
import UIModeNotification from './components/UIModeNotification';
import eventBus from '../core/event-bus';
import { useAppContext } from './contexts/AppContext';

interface Message {
  role: string;
  text: string;
}

const App: React.FC = () => {
  const { chatService, isUiInteractive, persona, llmSettings } = useAppContext();
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isJointPanelOpen, setJointPanelOpen] = useState(false);
  const [isExpressionPanelOpen, setExpressionPanelOpen] = useState(false);
  const [isPluginsPanelOpen, setPluginsPanelOpen] = useState(false);
  const [isMeshPanelOpen, setMeshPanelOpen] = useState(false);
  const [isModManagementPanelOpen, setModManagementPanelOpen] = useState(false);
  const [isPosePanelOpen, setPosePanelOpen] = useState(false);
  const [isAnimationPanelOpen, setAnimationPanelOpen] = useState(false);
  const [isMaterialPanelOpen, setMaterialPanelOpen] = useState(false);
  const [isLightPanelOpen, setLightPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const isInitialMount = useRef(true);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      setChatMessages((prev) => [...prev, message]);
    };
    const unsubscribe = eventBus.on('chat:newMessage', handleNewMessage);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const message = isUiInteractive ? 'UI Interaction Enabled' : 'UI Interaction Disabled (Mouse Ignored)';
    setNotification({ show: true, message });

    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 2000);

    if (!isUiInteractive) {
      setSettingsModalOpen(false);
      setJointPanelOpen(false);
      setExpressionPanelOpen(false);
      setPluginsPanelOpen(false);
      setMeshPanelOpen(false);
      setModManagementPanelOpen(false);
      setPosePanelOpen(false);
      setAnimationPanelOpen(false);
      setMaterialPanelOpen(false);
      setLightPanelOpen(false);
    }

    return () => clearTimeout(timer);
  }, [isUiInteractive]);

  const handleSendMessage = (text: string) => {
    if (chatService) {
      const currentPersona =
        persona ||
        'You are a friendly and helpful AI assistant. Please respond in Korean.';
      chatService.sendChatMessage(text, currentPersona, llmSettings);
    } else {
      console.error('Chat service is not initialized.');
      setChatMessages((prev) => [
        ...prev,
        { role: 'system', text: '오류: 채팅 서비스가 초기화되지 않았습니다.' },
      ]);
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
    material: { x: 20, y: 400 },
    light: { x: 350, y: 400 },
  });

  const handlePanelDrag = (panelId: keyof typeof panelPositions, pos: { x: number; y: number }) => {
    setPanelPositions((prev) => ({
      ...prev,
      [panelId]: pos,
    }));
  };

  return (
    <div>
      <UIModeNotification isVisible={notification.show} message={notification.message} />
      
      {isUiInteractive && (
        <>
          <EditMenu
            onOpenPosePanel={() => setPosePanelOpen((prev) => !prev)}
            onOpenAnimationPanel={() => setAnimationPanelOpen((prev) => !prev)}
            onOpenJointControl={() => setJointPanelOpen((prev) => !prev)}
            onOpenExpressionPanel={() => setExpressionPanelOpen((prev) => !prev)}
            onOpenMeshPanel={() => setMeshPanelOpen((prev) => !prev)}
          />
          <Sidebar
            isUiInteractive={isUiInteractive}
            onOpenSettings={() => setSettingsModalOpen((prev) => !prev)}
            onOpenPluginsPanel={() => setPluginsPanelOpen((prev) => !prev)}
            onOpenModManagementPanel={() => setModManagementPanelOpen((prev) => !prev)}
            onOpenMaterialPanel={() => setMaterialPanelOpen((prev) => !prev)}
            onOpenLightPanel={() => setLightPanelOpen((prev) => !prev)}
          />
        </>
      )}
      <Chat messages={chatMessages} onSendMessage={handleSendMessage} />

      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

      {isJointPanelOpen && <JointControlPanel onClose={() => setJointPanelOpen(false)} initialPos={panelPositions.joint} onDragEnd={(pos) => handlePanelDrag('joint', pos)} />}
      {isExpressionPanelOpen && <ExpressionPanel onClose={() => setExpressionPanelOpen(false)} initialPos={panelPositions.expression} onDragEnd={(pos) => handlePanelDrag('expression', pos)} />}
      {isPluginsPanelOpen && <PluginPanel onClose={() => setPluginsPanelOpen(false)} initialPos={panelPositions.plugins} onDragEnd={(pos) => handlePanelDrag('plugins', pos)} />}
      {isMeshPanelOpen && <MeshControlPanel onClose={() => setMeshPanelOpen(false)} initialPos={panelPositions.mesh} onDragEnd={(pos) => handlePanelDrag('mesh', pos)} />}
      {isModManagementPanelOpen && <ModManagementPanel onClose={() => setModManagementPanelOpen(false)} initialPos={panelPositions.mod} onDragEnd={(pos) => handlePanelDrag('mod', pos)} />}
      {isPosePanelOpen && <PosePanel onClose={() => setPosePanelOpen(false)} initialPos={panelPositions.pose} onDragEnd={(pos) => handlePanelDrag('pose', pos)} />}
      {isAnimationPanelOpen && <AnimationPanel onClose={() => setAnimationPanelOpen(false)} initialPos={panelPositions.animation} onDragEnd={(pos) => handlePanelDrag('animation', pos)} />}
      {isMaterialPanelOpen && <MaterialPanel onClose={() => setMaterialPanelOpen(false)} initialPos={panelPositions.material} onDragEnd={(pos) => handlePanelDrag('material', pos)} />}
      {isLightPanelOpen && <LightPanel onClose={() => setLightPanelOpen(false)} initialPos={panelPositions.light} onDragEnd={(pos) => handlePanelDrag('light', pos)} />}
      
      <FloatingMessageManager />
    </div>
  );
};

export default App;
