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
import AnimationEditPanel from './components/AnimationEditor/AnimationEditPanel';
import MaterialPanel from './components/MaterialPanel';
import LightPanel from './components/LightPanel';
import CreatorPanel from './components/CreatorPanel';
import ContextStoreDebugPanel from './components/ContextStoreDebugPanel';
import CharacterStateViewer from './components/CharacterStateViewer';
import SequenceEditor from './components/SequenceEditor/SequenceEditor';
import Chat from './components/Chat';
import FloatingMessageManager from './components/FloatingMessageManager';
import { ImageAssetDisplay } from './components/ImageAssetDisplay';
import UIModeNotification from './components/UIModeNotification';
import eventBus from '../core/event-bus';
import { useAppContext } from './contexts/AppContext';

interface Message {
  role: string;
  text: string;
}

const App: React.FC = () => {
  const { 
    chatService, isUiInteractive, persona, llmSettings, pluginManager, 
    actionRegistry,
    sequenceManager,
    isSequenceManagerInitialized,
  } = useAppContext();

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isJointPanelOpen, setJointPanelOpen] = useState(false);
  const [isExpressionPanelOpen, setExpressionPanelOpen] = useState(false);
  const [isPluginsPanelOpen, setPluginsPanelOpen] = useState(false);
  const [isMeshPanelOpen, setMeshPanelOpen] = useState(false);
  const [isModManagementPanelOpen, setModManagementPanelOpen] = useState(false);
  const [isPosePanelOpen, setPosePanelOpen] = useState(false);
  const [isAnimationPanelOpen, setAnimationPanelOpen] = useState(false);
  const [isAnimationEditPanelOpen, setAnimationEditPanelOpen] = useState(false);
  const [animationToEdit, setAnimationToEdit] = useState<string | null>(null);
  const [isMaterialPanelOpen, setMaterialPanelOpen] = useState(false);
  const [isLightPanelOpen, setLightPanelOpen] = useState(false);
  const [isCreatorPanelOpen, setCreatorPanelOpen] = useState(false);
  const [isContextDebugPanelOpen, setContextDebugPanelOpen] = useState(false);
  const [isCharacterStateViewerOpen, setCharacterStateViewerOpen] = useState(false);
  const [isSequenceEditorOpen, setSequenceEditorOpen] = useState(false);
  const [sequenceToEdit, setSequenceToEdit] = useState<string | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  // Sequence state is now driven by the manager
  const [allSequences, setAllSequences] = useState<{ name: string, type: 'sequence' | 'subroutine' }[]>([]);
  const [activeSequences, setActiveSequences] = useState<string[]>([]);
  
  const isInitialMount = useRef(true);

  // This effect now correctly waits for the manager to be fully initialized.
  useEffect(() => {
    const fetchSequences = async () => {
      if (isSequenceManagerInitialized && sequenceManager) {
        console.log('[App] SequenceManager is initialized. Fetching sequences...');
        const files = await window.electronAPI.getAllSequenceFilesWithType();
        setAllSequences(files);
        setActiveSequences(sequenceManager.getActiveSequenceFiles());
      }
    };
    fetchSequences();
  }, [isSequenceManagerInitialized, sequenceManager]);

  // This effect handles updates after the initial load, like saving or deleting.
  useEffect(() => {
    const handleSequencesUpdated = (data: { allSequences: { name: string, type: 'sequence' | 'subroutine' }[], activeSequences: string[] }) => {
      if (data) {
        console.log('[App] Received sequences-updated event with data, updating state directly.');
        setAllSequences(data.allSequences);
        setActiveSequences(data.activeSequences);
      }
    };
    const unsubscribe = eventBus.on('sequences-updated', handleSequencesUpdated);
    return () => unsubscribe();
  }, []); // No dependencies needed as it uses the event payload

  // This effect handles real-time changes to the active sequence list (toggling).
  useEffect(() => {
    if (!isSequenceManagerInitialized) return;

    const handleActiveSequencesChanged = (newActiveList: string[]) => {
      console.log('[App] Received sequences:activeListChanged event, updating active list.');
      setActiveSequences(newActiveList);
    };
    const unsubscribe = eventBus.on('sequences:activeListChanged', handleActiveSequencesChanged);
    return () => unsubscribe();
  }, [isSequenceManagerInitialized]);

  useEffect(() => {
    if (pluginManager) {
      const pluginNames = Array.from(pluginManager.plugins.keys());
      window.electronAPI.updatePluginList(pluginNames);
    }
  }, [pluginManager]);


  const handleDeleteSequence = async (sequenceFile: string) => {
    if (!sequenceManager) return;
    const confirmed = window.confirm(`'${sequenceFile}' 시퀀스를 정말로 삭제하시겠습니까?
이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    try {
      await sequenceManager.deleteSequence(sequenceFile);
      // The event is now emitted from the manager, so no need to emit here.
    } catch (error) {
      console.error(`Failed to delete sequence ${sequenceFile}:`, error);
      alert(`시퀀스 삭제 실패: ${error}`);
    }
  };

  const handleEditSequence = (sequenceFile: string | null) => {
    setSequenceToEdit(sequenceFile);
    setSequenceEditorOpen(true);
  };

  const handleCloseSequenceEditor = () => {
    setSequenceEditorOpen(false);
    setSequenceToEdit(null);
  };

  const handleManualStartSequence = async (sequenceFile: string) => {
    if (!sequenceManager) {
      console.error("SequenceManager not available.");
      return;
    }
    await sequenceManager.manualStartSequence(sequenceFile);
  };

  useEffect(() => {
    if (!actionRegistry) return;

    const definitions = actionRegistry.getAllActionDefinitions();
    const serializableDefinitions = definitions.map(def => {
      const params = def.params.map(p => {
        const { validation, ...rest } = p;
        return rest;
      });
      return { ...def, params };
    });

    window.electronAPI.invoke('set-action-definitions', serializableDefinitions)
      .then(() => console.log('[Renderer] Action definitions sent to main process.'))
      .catch(err => console.error('[Renderer] Failed to send action definitions:', err));

    const unsubscribe = window.electronAPI.on('execute-action', (actionName: string, args: any[]) => {
      console.log(`[Renderer] Received action execution request: ${actionName}`, args);
      const action = actionRegistry.get(actionName);
      if (action && typeof action.implementation === 'function') {
        try {
          action.implementation(...args);
        } catch (error) {
          console.error(`[Renderer] Error executing action "${actionName}":`, error);
        }
      } else {
        console.warn(`[Renderer] Action "${actionName}" not found or not implemented.`);
      }
    });

    return () => unsubscribe();
  }, [actionRegistry]);

  useEffect(() => {
    const handleNewMessage = (data: Message | any) => {
      let newMessage: Message;
      if (typeof data === 'object' && data !== null && typeof data.text === 'string') {
        newMessage = {
          role: data.role || 'system',
          text: data.text,
        };
      } else {
        newMessage = {
          role: 'system',
          text: `[SYSTEM] Received non-standard message: ${JSON.stringify(data)}`,
        };
      }
      setChatMessages((prev) => [...prev, newMessage]);
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
    const timer = setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 2000);
    if (!isUiInteractive) {
      [setSettingsModalOpen, setJointPanelOpen, setExpressionPanelOpen, setPluginsPanelOpen, 
       setMeshPanelOpen, setModManagementPanelOpen, setPosePanelOpen, setAnimationPanelOpen, 
       setMaterialPanelOpen, setLightPanelOpen, setCreatorPanelOpen,
       setContextDebugPanelOpen, setSequenceEditorOpen, setCharacterStateViewerOpen]
      .forEach(setter => setter(false));
    }
    return () => clearTimeout(timer);
  }, [isUiInteractive]);

  const handleSendMessage = (text: string) => {
    if (chatService) {
      const currentPersona = persona || 'You are a friendly AI. Respond in Korean.';
      chatService.sendChatMessage(text, currentPersona, llmSettings);
    } else {
      console.error('Chat service is not initialized.');
      setChatMessages((prev) => [...prev, { role: 'system', text: '오류: 채팅 서비스가 초기화되지 않았습니다.' }]);
    }
  };

  const handleOpenAnimationEditor = (fileName: string) => {
    setAnimationToEdit(fileName);
    setAnimationPanelOpen(false); // Close list panel
    setAnimationEditPanelOpen(true); // Open editor panel
  };

  const handleCloseAnimationEditor = () => {
    setAnimationEditPanelOpen(false);
    setAnimationToEdit(null);
    setAnimationPanelOpen(true); // Re-open list panel
  };

  const [panelPositions, setPanelPositions] = useState({
    joint: { x: 20, y: 70 }, expression: { x: 390, y: 70 },
    plugins: { x: window.innerWidth - 740, y: 70 }, mesh: { x: window.innerWidth - 370, y: 70 },
    mod: { x: window.innerWidth - 370, y: 70 }, pose: { x: window.innerWidth - 370, y: 70 },
    animation: { x: window.innerWidth - 370, y: 70 }, material: { x: 20, y: 400 },
    light: { x: 350, y: 400 },
    creator: { x: 20, y: 70 }, contextDebug: { x: window.innerWidth - 400, y: 70 },
    characterState: { x: window.innerWidth - 400, y: 400 },
    animationEditor: { x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200 },
  });

  const handlePanelDrag = (panelId: keyof typeof panelPositions, pos: { x: number; y: number }) => {
    setPanelPositions((prev) => ({ ...prev, [panelId]: pos }));
  };
  
  return (
    <div>
      <UIModeNotification isVisible={notification.show} message={notification.message} />
      
      {isUiInteractive && (
        <>
          <EditMenu
            onOpenPosePanel={() => setPosePanelOpen(p => !p)}
            onOpenAnimationPanel={() => setAnimationPanelOpen(p => !p)}
            onOpenJointControl={() => setJointPanelOpen(p => !p)}
            onOpenExpressionPanel={() => setExpressionPanelOpen(p => !p)}
            onOpenMeshPanel={() => setMeshPanelOpen(p => !p)}
          />
          <Sidebar
            isUiInteractive={isUiInteractive}
            onOpenSettings={() => setSettingsModalOpen(p => !p)}
            onOpenPluginsPanel={() => setPluginsPanelOpen(p => !p)}
            onOpenModManagementPanel={() => setModManagementPanelOpen(p => !p)}
            onOpenMaterialPanel={() => setMaterialPanelOpen(p => !p)}
            onOpenLightPanel={() => setLightPanelOpen(p => !p)}
            onOpenCreatorPanel={() => setCreatorPanelOpen(p => !p)}
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
      {isAnimationPanelOpen && <AnimationPanel 
        onClose={() => setAnimationPanelOpen(false)} 
        initialPos={panelPositions.animation} 
        onDragEnd={(pos) => handlePanelDrag('animation', pos)}
        onEdit={handleOpenAnimationEditor}
      />}
      {isAnimationEditPanelOpen && <AnimationEditPanel
        onClose={handleCloseAnimationEditor}
        initialPos={panelPositions.animationEditor}
        onDragEnd={(pos) => handlePanelDrag('animationEditor', pos)}
        animationName={animationToEdit}
      />}
      {isMaterialPanelOpen && <MaterialPanel onClose={() => setMaterialPanelOpen(false)} initialPos={panelPositions.material} onDragEnd={(pos) => handlePanelDrag('material', pos)} />}
      {isLightPanelOpen && <LightPanel onClose={() => setLightPanelOpen(false)} initialPos={panelPositions.light} onDragEnd={(pos) => handlePanelDrag('light', pos)} />}
      
      {isCreatorPanelOpen && <CreatorPanel 
        onClose={() => setCreatorPanelOpen(false)} 
        initialPos={panelPositions.creator} 
        onDragEnd={(pos) => handlePanelDrag('creator', pos)}
        sequences={allSequences}
        onOpenContextViewer={() => setContextDebugPanelOpen(p => !p)}
        onOpenCharacterStateViewer={() => setCharacterStateViewerOpen(p => !p)}
        onOpenSequenceEditor={handleEditSequence}
        onEditSequence={handleEditSequence}
        onDeleteSequence={handleDeleteSequence}
        activeSequences={activeSequences}
        onManualStartSequence={handleManualStartSequence}
      />}

      <SequenceEditor
        isOpen={isSequenceEditorOpen}
        onClose={handleCloseSequenceEditor}
        sequenceToLoad={sequenceToEdit}
      />

      {isContextDebugPanelOpen && <ContextStoreDebugPanel
        onClose={() => setContextDebugPanelOpen(false)}
        initialPos={panelPositions.contextDebug}
        onDragEnd={(pos) => handlePanelDrag('contextDebug', pos)}
      />}

      {isCharacterStateViewerOpen && <CharacterStateViewer
        onClose={() => setCharacterStateViewerOpen(false)}
        initialPos={panelPositions.characterState}
        onDragEnd={(pos) => handlePanelDrag('characterState', pos)}
      />}
      
      <FloatingMessageManager />
      <ImageAssetDisplay />
    </div>
  );
};

export default App;
