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
import TriggerEditorPanel from './components/TriggerEditorPanel';
import CreatorPanel from './components/CreatorPanel';
import ContextStoreDebugPanel from './components/ContextStoreDebugPanel';
import SequenceEditor from './components/SequenceEditor/SequenceEditor';
import Chat from './components/Chat';
import FloatingMessageManager from './components/FloatingMessageManager';
import UIModeNotification from './components/UIModeNotification';
import eventBus from '../core/event-bus';
import { useAppContext } from './contexts/AppContext';
import { CustomTrigger } from '../core/custom-trigger-manager';
import { Node } from 'reactflow';
import { BaseNode } from '../core/sequence/BaseNode';
import { ActionNodeModel } from '../core/sequence/ActionNodeModel';
import { ManualStartNodeModel } from '../core/sequence/ManualStartNodeModel';
import { EventNodeModel } from '../core/sequence/EventNodeModel';
import { EVENT_DEFINITIONS } from '../core/event-definitions';

interface Message {
  role: string;
  text: string;
}

const App: React.FC = () => {
  const { 
    chatService, isUiInteractive, persona, llmSettings, pluginManager, 
    actionRegistry,
    sequenceEngine,
  } = useAppContext();

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
  const [isCreatorPanelOpen, setCreatorPanelOpen] = useState(false);
  const [isTriggerEditorPanelOpen, setTriggerEditorPanelOpen] = useState(false);
  const [isContextDebugPanelOpen, setContextDebugPanelOpen] = useState(false);
  const [isSequenceEditorOpen, setSequenceEditorOpen] = useState(false);
  const [sequenceToEdit, setSequenceToEdit] = useState<string | null>(null);
  
  const [customTriggers, setCustomTriggers] = useState<CustomTrigger[]>([]);
  const [editingTrigger, setEditingTrigger] = useState<CustomTrigger | null>(null);
  
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [activeSequences, setActiveSequences] = useState<string[]>([]);
  const [allSequences, setAllSequences] = useState<string[]>([]);
  const isInitialMount = useRef(true);

  const fetchAllSequences = async () => {
    try {
      const sequenceFiles = await window.electronAPI.getSequences();
      setAllSequences(sequenceFiles);
    } catch (error) {
      console.error("Failed to fetch sequences:", error);
    }
  };

  const handleDeleteSequence = async (sequenceFile: string) => {
    const confirmed = window.confirm(`'${sequenceFile}' 시퀀스를 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    const result = await window.electronAPI.deleteSequence(sequenceFile);
    if (result.success) {
      console.log(`Sequence ${sequenceFile} deleted successfully.`);
      if (activeSequences.includes(sequenceFile)) {
        const updatedActive = activeSequences.filter(s => s !== sequenceFile);
        setActiveSequences(updatedActive);
        window.electronAPI.setActiveSequences(updatedActive);
        sequenceEngine?.deactivateSequence(sequenceFile);
      }
      fetchAllSequences();
    } else {
      console.error(`Failed to delete sequence ${sequenceFile}:`, result.error);
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
    if (!sequenceEngine || !actionRegistry) {
      console.error("SequenceEngine or ActionRegistry not available to manually start sequence.");
      return;
    }
    try {
      console.log(`Manually starting sequence: ${sequenceFile}`);
      const filePath = await window.electronAPI.resolvePath('userData', `sequences/${sequenceFile}`);
      const sequenceJSON = await window.electronAPI.readAbsoluteFile(filePath);
      if (!(sequenceJSON instanceof ArrayBuffer)) {
        console.error(`Failed to read sequence file buffer for manual start: ${sequenceFile}`, sequenceJSON);
        return;
      }
      const sequenceData = JSON.parse(new TextDecoder().decode(sequenceJSON));

      // Deserialize plain objects from JSON into class instances
      const deserializedNodes: Node[] = sequenceData.nodes.map((sNode: any) => {
        let model: BaseNode;
        const data = sNode.data;

        switch (data.nodeType) {
          case 'ActionNodeModel':
            const actionDef = actionRegistry.getActionDefinition(data.actionName);
            if (!actionDef) {
              console.error(`Action "${data.actionName}" not found in registry. Cannot load node ${sNode.id}.`);
              return null;
            }
            const actionModel = new ActionNodeModel(sNode.id, actionDef);
            if (data.paramValues) {
              actionModel.paramValues = data.paramValues;
            }
            model = actionModel;
            break;
          
          case 'ManualStartNodeModel':
            model = new ManualStartNodeModel(sNode.id);
            break;

          case 'EventNodeModel':
            const eventDef = EVENT_DEFINITIONS.find(e => e.name === data.eventName);
            if (!eventDef) {
              console.error(`Event "${data.eventName}" not found in definitions. Cannot load node ${sNode.id}.`);
              return null;
            }
            model = new EventNodeModel(sNode.id, eventDef);
            break;

          default:
            console.error(`Unknown node type "${data.nodeType}" for node ${sNode.id}.`);
            return null;
        }

        return {
          id: sNode.id,
          type: sNode.type,
          position: sNode.position,
          data: model,
        };
      }).filter(Boolean) as Node[];

      sequenceEngine.runManual(deserializedNodes, sequenceData.edges);
    } catch (error) {
      console.error(`Failed to manually start sequence ${sequenceFile}:`, error);
    }
  };

  const handleToggleSequence = async (sequenceFile: string, shouldActivate: boolean) => {
    if (!sequenceEngine) {
      console.error("SequenceEngine not available to toggle sequence.");
      return;
    }

    const updatedActiveSequences = shouldActivate
      ? [...new Set([...activeSequences, sequenceFile])]
      : activeSequences.filter(name => name !== sequenceFile);

    setActiveSequences(updatedActiveSequences);
    window.electronAPI.setActiveSequences(updatedActiveSequences);

    if (shouldActivate) {
      try {
        const filePath = await window.electronAPI.resolvePath('userData', `sequences/${sequenceFile}`);
        const sequenceJSON = await window.electronAPI.readAbsoluteFile(filePath);
        if (!(sequenceJSON instanceof ArrayBuffer)) {
          console.error(`Failed to read sequence file buffer for activation: ${sequenceFile}`, sequenceJSON);
          return;
        }
        const sequenceData = JSON.parse(new TextDecoder().decode(sequenceJSON));
        sequenceEngine.activateSequence(sequenceFile, sequenceData.nodes, sequenceData.edges);
      } catch (error) {
        console.error(`Failed to activate sequence ${sequenceFile}:`, error);
      }
    } else {
      sequenceEngine.deactivateSequence(sequenceFile);
    }
  };

  // Load sequences and active status from store on startup
  useEffect(() => {
    fetchAllSequences();
    window.electronAPI.getActiveSequences().then(setActiveSequences);
    
    const unsubscribe = eventBus.on('sequences-updated', fetchAllSequences);
    return () => unsubscribe();
  }, []);

  // When the sequence engine is ready, activate all sequences that are marked as active
  useEffect(() => {
    if (!sequenceEngine) return;

    const loadAndActivate = async (sequenceFile: string) => {
      try {
        const filePath = await window.electronAPI.resolvePath('userData', `sequences/${sequenceFile}`);
        const fileExists = await window.electronAPI.fileExists(filePath);
        if (!fileExists) {
          console.warn(`Sequence file not found, cannot activate: ${sequenceFile}`);
          return;
        }
        const sequenceJSON = await window.electronAPI.readAbsoluteFile(filePath);
        if (!(sequenceJSON instanceof ArrayBuffer)) {
          console.error(`Failed to read sequence file buffer: ${sequenceFile}`, sequenceJSON);
          return;
        }
        const sequenceData = JSON.parse(new TextDecoder().decode(sequenceJSON));
        sequenceEngine.activateSequence(sequenceFile, sequenceData.nodes, sequenceData.edges);
      } catch (error) {
        console.error(`Failed to load and activate sequence ${sequenceFile}:`, error);
      }
    };

    activeSequences.forEach(loadAndActivate);

    return () => {
      activeSequences.forEach(sequenceFile => sequenceEngine.deactivateSequence(sequenceFile));
    };
  }, [sequenceEngine, activeSequences]);

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
    const loadTriggers = async () => {
      const savedTriggers = await window.electronAPI.getCustomTriggers();
      setCustomTriggers(savedTriggers || []);
    };
    loadTriggers();
  }, []);

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
       setMaterialPanelOpen, setLightPanelOpen, setCreatorPanelOpen, setTriggerEditorPanelOpen,
       setContextDebugPanelOpen, setSequenceEditorOpen]
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

  const handleOpenTriggerEditor = (trigger: CustomTrigger | null) => {
    setEditingTrigger(trigger);
    setTriggerEditorPanelOpen(true);
  };

  const handleSaveTrigger = async (trigger: CustomTrigger) => {
    const isEditing = customTriggers.some(t => t.id === trigger.id);
    const { success, error } = await window.electronAPI.saveCustomTrigger(trigger);

    if (success) {
      const updatedTriggers = isEditing 
        ? customTriggers.map(t => t.id === trigger.id ? trigger : t)
        : [...customTriggers, trigger];
      setCustomTriggers(updatedTriggers);

      if (pluginManager) {
        if (isEditing) {
          pluginManager.context.system.unregisterCustomTrigger(trigger.id);
        }
        if (trigger.enabled) {
          pluginManager.context.system.registerCustomTrigger(trigger);
        }
      }
    } else {
      console.error('Failed to save trigger:', error);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    const { success, error } = await window.electronAPI.deleteCustomTrigger(triggerId);

    if (success) {
      const updatedTriggers = customTriggers.filter(t => t.id !== triggerId);
      setCustomTriggers(updatedTriggers);
      pluginManager?.context.system.unregisterCustomTrigger(triggerId);
    } else {
      console.error('Failed to delete trigger:', error);
    }
  };

  const handleToggleTrigger = async (triggerId: string, enabled: boolean) => {
    const triggerToUpdate = customTriggers.find(t => t.id === triggerId);
    if (!triggerToUpdate) return;

    const updatedTrigger = { ...triggerToUpdate, enabled };
    
    const { success, error } = await window.electronAPI.saveCustomTrigger(updatedTrigger);

    if (success) {
      setCustomTriggers(customTriggers.map(t => t.id === triggerId ? updatedTrigger : t));
      if (enabled) {
        pluginManager?.context.system.registerCustomTrigger(updatedTrigger);
      } else {
        pluginManager?.context.system.unregisterCustomTrigger(triggerId);
      }
    } else {
      console.error('Failed to toggle trigger:', error);
    }
  };

  const [panelPositions, setPanelPositions] = useState({
    joint: { x: 20, y: 70 }, expression: { x: 390, y: 70 },
    plugins: { x: window.innerWidth - 740, y: 70 }, mesh: { x: window.innerWidth - 370, y: 70 },
    mod: { x: window.innerWidth - 370, y: 70 }, pose: { x: window.innerWidth - 370, y: 70 },
    animation: { x: window.innerWidth - 370, y: 70 }, material: { x: 20, y: 400 },
    light: { x: 350, y: 400 }, triggerEditor: { x: window.innerWidth - 370, y: 400 },
    creator: { x: 20, y: 70 }, contextDebug: { x: window.innerWidth - 400, y: 70 },
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
      {isAnimationPanelOpen && <AnimationPanel onClose={() => setAnimationPanelOpen(false)} initialPos={panelPositions.animation} onDragEnd={(pos) => handlePanelDrag('animation', pos)} />}
      {isMaterialPanelOpen && <MaterialPanel onClose={() => setMaterialPanelOpen(false)} initialPos={panelPositions.material} onDragEnd={(pos) => handlePanelDrag('material', pos)} />}
      {isLightPanelOpen && <LightPanel onClose={() => setLightPanelOpen(false)} initialPos={panelPositions.light} onDragEnd={(pos) => handlePanelDrag('light', pos)} />}
      
      {isCreatorPanelOpen && <CreatorPanel 
        onClose={() => setCreatorPanelOpen(false)} 
        initialPos={panelPositions.creator} 
        onDragEnd={(pos) => handlePanelDrag('creator', pos)}
        triggers={customTriggers}
        sequences={allSequences}
        onOpenTriggerEditor={() => handleOpenTriggerEditor(null)}
        onEditTrigger={(trigger) => handleOpenTriggerEditor(trigger)}
        onDeleteTrigger={handleDeleteTrigger}
        onToggleTrigger={handleToggleTrigger}
        onOpenContextViewer={() => setContextDebugPanelOpen(p => !p)}
        onOpenSequenceEditor={handleEditSequence}
        onEditSequence={handleEditSequence}
        onDeleteSequence={handleDeleteSequence}
        activeSequences={activeSequences}
        onToggleSequence={handleToggleSequence}
        onManualStartSequence={handleManualStartSequence}
      />}

      {isTriggerEditorPanelOpen && <TriggerEditorPanel 
        onClose={() => setTriggerEditorPanelOpen(false)} 
        initialPos={panelPositions.triggerEditor} 
        onDragEnd={(pos) => handlePanelDrag('triggerEditor', pos)}
        onSave={handleSaveTrigger}
        triggerToEdit={editingTrigger}
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
      
      <FloatingMessageManager />
    </div>
  );
};

export default App;
