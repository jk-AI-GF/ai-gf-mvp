import React, { useState, useEffect, useRef } from 'react';
import EditMenu from './components/EditMenu';
import SettingsModal from './components/SettingsModal';
import Sidebar from './components/Sidebar';
import PluginPanel from './components/PluginPanel';
import ModManagementPanel from './components/ModManagementPanel';
import AnimationEditPanel from './components/AnimationEditor/AnimationEditPanel';
import MaterialPanel from './components/MaterialPanel';
import LightPanel from './components/LightPanel';
import MeshControlPanel from './components/MeshControlPanel';
import CreatorPanel from './components/CreatorPanel';
import AssetPanel, { AssetTabType } from './components/AssetPanel';
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
  const [isPluginsPanelOpen, setPluginsPanelOpen] = useState(false);
  const [isModManagementPanelOpen, setModManagementPanelOpen] = useState(false);
  const [isAnimationEditPanelOpen, setAnimationEditPanelOpen] = useState(false);
  const [animationToEdit, setAnimationToEdit] = useState<string | null>(null);
  const [isMaterialPanelOpen, setMaterialPanelOpen] = useState(false);
  const [isLightPanelOpen, setLightPanelOpen] = useState(false);
  const [isMeshControlPanelOpen, setMeshControlPanelOpen] = useState(false);
  const [isCreatorPanelOpen, setCreatorPanelOpen] = useState(false);
  const [isContextDebugPanelOpen, setContextDebugPanelOpen] = useState(false);
  const [isCharacterStateViewerOpen, setCharacterStateViewerOpen] = useState(false);
  const [isSequenceEditorOpen, setSequenceEditorOpen] = useState(false);
  const [sequenceToEdit, setSequenceToEdit] = useState<string | null>(null);
  
  const [assetPanelState, setAssetPanelState] = useState<{ isOpen: boolean; tab: AssetTabType }>({ isOpen: false, tab: 'vrm' });

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState({ show: false, message: '' });
  
  const [allSequences, setAllSequences] = useState<{ name: string, type: 'sequence' | 'subroutine' }[]>([]);
  const [activeSequences, setActiveSequences] = useState<string[]>([]);
  
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchSequences = async () => {
      if (isSequenceManagerInitialized && sequenceManager) {
        const files = await window.electronAPI.getAllSequenceFilesWithType();
        setAllSequences(files);
        setActiveSequences(sequenceManager.getActiveSequenceFiles());
      }
    };
    fetchSequences();
  }, [isSequenceManagerInitialized, sequenceManager]);

  useEffect(() => {
    const handleSequencesUpdated = (data: { allSequences: { name: string, type: 'sequence' | 'subroutine' }[], activeSequences: string[] }) => {
      if (data) {
        setAllSequences(data.allSequences);
        setActiveSequences(data.activeSequences);
      }
    };
    const unsubscribe = eventBus.on('sequences-updated', handleSequencesUpdated);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSequenceManagerInitialized) return;
    const handleActiveSequencesChanged = (newActiveList: string[]) => {
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
    if (window.confirm(`'${sequenceFile}' 시퀀스를 정말로 삭제하시겠습니까?
이 작업은 되돌릴 수 없습니다.`)) {
      await sequenceManager.deleteSequence(sequenceFile);
    }
  };

  const handleEditSequence = (sequenceFile: string | null) => {
    setSequenceToEdit(sequenceFile);
    setSequenceEditorOpen(true);
  };

  const handleManualStartSequence = async (sequenceFile: string) => {
    await sequenceManager?.manualStartSequence(sequenceFile);
  };

  useEffect(() => {
    if (!actionRegistry) return;
    const definitions = actionRegistry.getAllActionDefinitions().map(def => ({ ...def, params: def.params.map(p => { const { validation, ...rest } = p; return rest; }) }));
    window.electronAPI.invoke('set-action-definitions', definitions);
    const unsubscribe = window.electronAPI.on('execute-action', (actionName: string, args: any[]) => {
      actionRegistry.get(actionName)?.implementation(...args);
    });
    return () => unsubscribe();
  }, [actionRegistry]);

  useEffect(() => {
    const handleNewMessage = (data: Message | any) => {
      const newMessage = (typeof data === 'object' && data !== null && typeof data.text === 'string')
        ? { role: data.role || 'system', text: data.text }
        : { role: 'system', text: `[SYSTEM] Received non-standard message: ${JSON.stringify(data)}` };
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
      [setSettingsModalOpen, setPluginsPanelOpen, setModManagementPanelOpen, 
       setMaterialPanelOpen, setLightPanelOpen, setCreatorPanelOpen, setContextDebugPanelOpen, 
       setSequenceEditorOpen, setCharacterStateViewerOpen, setMeshControlPanelOpen]
      .forEach(setter => setter(false));
      setAssetPanelState(prev => ({ ...prev, isOpen: false }));
    }
    return () => clearTimeout(timer);
  }, [isUiInteractive]);

  const handleSendMessage = (text: string) => {
    if (chatService) {
      chatService.sendChatMessage(text, persona || 'You are a friendly AI.', llmSettings);
    }
  };

  const handleOpenAssetPanel = (tab: AssetTabType) => {
    setAssetPanelState(prev => ({
      isOpen: !prev.isOpen || prev.tab !== tab,
      tab: tab,
    }));
  };
  
  const handleOpenAnimationEditor = (fileName: string) => {
    setAnimationToEdit(fileName);
    setAssetPanelState(prev => ({ ...prev, isOpen: false })); // Close asset panel
    setAnimationEditPanelOpen(true); // Open editor panel
  };

  const handleCloseAnimationEditor = () => {
    setAnimationEditPanelOpen(false);
    setAnimationToEdit(null);
    setAssetPanelState({ isOpen: true, tab: 'animation' }); // Re-open asset panel to animation tab
  };

  const [panelPositions, setPanelPositions] = useState({
    plugins: { x: window.innerWidth - 740, y: 70 },
    mod: { x: window.innerWidth - 370, y: 70 },
    material: { x: 20, y: 400 },
    light: { x: 350, y: 400 },
    meshControl: { x: 600, y: 400 },
    creator: { x: 20, y: 70 },
    asset: { x: window.innerWidth - 370, y: 70 },
    contextDebug: { x: window.innerWidth - 400, y: 70 },
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
            onOpenAssetPanel={handleOpenAssetPanel} 
            onOpenMeshControlPanel={() => setMeshControlPanelOpen(p => !p)}
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

      {isPluginsPanelOpen && <PluginPanel onClose={() => setPluginsPanelOpen(false)} initialPos={panelPositions.plugins} onDragEnd={(pos) => handlePanelDrag('plugins', pos)} />}
      {isModManagementPanelOpen && <ModManagementPanel onClose={() => setModManagementPanelOpen(false)} initialPos={panelPositions.mod} onDragEnd={(pos) => handlePanelDrag('mod', pos)} />}
      {isAnimationEditPanelOpen && <AnimationEditPanel onClose={handleCloseAnimationEditor} animationName={animationToEdit} initialPos={panelPositions.animationEditor} onDragEnd={(pos) => handlePanelDrag('animationEditor', pos)} />}
      {isMaterialPanelOpen && <MaterialPanel onClose={() => setMaterialPanelOpen(false)} initialPos={panelPositions.material} onDragEnd={(pos) => handlePanelDrag('material', pos)} />}
      {isLightPanelOpen && <LightPanel onClose={() => setLightPanelOpen(false)} initialPos={panelPositions.light} onDragEnd={(pos) => handlePanelDrag('light', pos)} />}
      {isMeshControlPanelOpen && <MeshControlPanel onClose={() => setMeshControlPanelOpen(false)} initialPos={panelPositions.meshControl} onDragEnd={(pos) => handlePanelDrag('meshControl', pos)} />}
      
      {assetPanelState.isOpen && <AssetPanel
        onClose={() => setAssetPanelState(prev => ({ ...prev, isOpen: false }))}
        initialPos={panelPositions.asset}
        onDragEnd={(pos) => handlePanelDrag('asset', pos)}
        initialTab={assetPanelState.tab}
        onEditAnimation={handleOpenAnimationEditor}
      />}

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
        onClose={() => setSequenceEditorOpen(false)}
        sequenceToLoad={sequenceToEdit}
      />

      {isContextDebugPanelOpen && <ContextStoreDebugPanel onClose={() => setContextDebugPanelOpen(false)} initialPos={panelPositions.contextDebug} onDragEnd={(pos) => handlePanelDrag('contextDebug', pos)} />}
      {isCharacterStateViewerOpen && <CharacterStateViewer onClose={() => setCharacterStateViewerOpen(false)} initialPos={panelPositions.characterState} onDragEnd={(pos) => handlePanelDrag('characterState', pos)} />}
      
      <FloatingMessageManager />
      <ImageAssetDisplay />
    </div>
  );
};

export default App;


