
import { Node } from 'reactflow';
import { ActionRegistry } from '../action-registry';
import { EVENT_DEFINITIONS } from '../event-definitions';
import { PluginContext } from '../../plugin-api/plugin-context';
import { ActionNodeModel } from './ActionNodeModel';
import { BaseNode } from './BaseNode';
import { EventNodeModel } from './EventNodeModel';
import { LiteralNodeModel } from './LiteralNodeModel';
import { ManualStartNodeModel } from './ManualStartNodeModel';
import { OperatorNodeModel } from './OperatorNodeModel';
import { RandomNodeModel } from './RandomNodeModel';
import { SequenceEngine } from './SequenceEngine';
import { SubroutineDefinition, SubroutineParameter } from './SubroutineDefinition';
import { DelayNodeModel } from './DelayNodeModel';
import { BranchNodeModel } from './BranchNodeModel';
import { ClockNodeModel } from './ClockNodeModel';
import { NumToStrNodeModel } from './NumToStrNodeModel';
import { InputNodeModel } from './InputNodeModel';
import { CallSubroutineNodeModel } from './CallSubroutineNodeModel';
import { DataProviderNodeModel } from './DataProviderNodeModel';
import { CommentNodeModel } from './CommentNodeModel';

// 시퀀스 데이터의 구조를 정의합니다.
interface SequenceData {
  nodes: Node<BaseNode>[];
  edges: any[];
}

/**
 * 시퀀스의 전체 생명주기를 관리하는 중앙 클래스입니다.
 * 파일 I/O, ( де)직렬화, 활성화/비활성화, 실행 등 모든 시퀀스 관련 작업을 처리합니다.
 */
export class SequenceManager {
  private sequenceEngine: SequenceEngine;
  private actionRegistry: ActionRegistry;
  private pluginContext: PluginContext;

  // 로드된 모든 시퀀스 파일의 이름을 추적합니다.
  private allSequenceFiles: string[] = [];
  // 활성화된 시퀀스 파일의 이름을 추적합니다.
  private activeSequenceFiles: Set<string> = new Set();
  // 메모리에 캐시된 시퀀스 데이터를 저장합니다.
  private sequenceCache: Map<string, SequenceData> = new Map();
  // 캐시된 서브루틴 메타데이터 정의를 저장합니다.
  private subroutineDefinitions: Map<string, SubroutineDefinition> = new Map();

  constructor(pluginContext: PluginContext) {
    if (!pluginContext || !pluginContext.actionRegistry) {
      throw new Error("SequenceManager requires a PluginContext with an ActionRegistry.");
    }
    this.pluginContext = pluginContext;
    this.actionRegistry = pluginContext.actionRegistry;
    this.sequenceEngine = new SequenceEngine(pluginContext);
  }

  /**
   * 특정 서브루틴의 메타데이터를 로드하여 반환합니다.
   * @param name 서브루틴 식별자 (파일명)
   * @returns SubroutineDefinition 또는 undefined
   */
  /**
   * 파일로부터 로드된 서브루틴 메타데이터 정의를 반환합니다.
   * @param name 서브루틴 파일 이름
   */
  public getSubroutineDefinition(name: string): SubroutineDefinition | undefined {
    return this.subroutineDefinitions.get(name);
  }

  /**
   * 주어진 서브루틴 목록 중 현재 캐릭터 상태로 실행 가능한 것만 필터링합니다.
   */
  public filterSubroutines(defs: SubroutineDefinition[]): SubroutineDefinition[] {
    const csm = this.pluginContext.characterStateManager;
    if (!csm) {
      console.warn('[SequenceManager] characterStateManager not available; skipping filter.');
      return defs;
    }
    return defs.filter(def => csm.hasCapabilities(def.capabilities));
  }

  /**
   * 현재 실행 가능한 서브루틴 메타데이터 목록을 반환합니다.
   */
  /**
   * 현재 로드된 서브루틴 정의 중 캐릭터 상태로 실행 가능한 것만 반환합니다.
   */
  public getAvailableSubroutines(): SubroutineDefinition[] {
    return this.filterSubroutines(Array.from(this.subroutineDefinitions.values()));
  }

  /**
   * 서브루틴의 논리적 이름(name)을 기반으로 해당 서브루틴의 파일 이름을 찾습니다.
   * @param name 찾고자 하는 서브루틴의 이름 (예: 'greet')
   * @returns 서브루틴의 파일 이름 (예: 'greeting-sequence.json') 또는 찾지 못한 경우 undefined
   */
  public findSubroutineFileByName(name: string): string | undefined {
    const foundFiles: string[] = [];
    for (const [fileName, definition] of this.subroutineDefinitions.entries()) {
      if (definition.name === name) {
        foundFiles.push(fileName);
      }
    }

    if (foundFiles.length === 0) {
      console.warn(`[SequenceManager] Subroutine with name '${name}' not found.`);
      return undefined;
    }
    if (foundFiles.length > 1) {
      console.warn(`[SequenceManager] Multiple subroutines found with name '${name}'. Using the first one: ${foundFiles[0]}. Found files: ${foundFiles.join(', ')}`);
    }
    return foundFiles[0];
  }

  /**
   * userData/sequences 폴더에서 모든 시퀀스 파일 목록을 가져와 내부 상태를 초기화합니다.
   */
  public async initialize(): Promise<void> {
    // 모든 시퀀스 및 서브루틴 파일을 메타데이터(type)와 함께 가져옵니다.
    const allFilesWithType = await window.electronAPI.getAllSequenceFilesWithType();
    this.allSequenceFiles = allFilesWithType.map(f => f.name);

    // 서브루틴 정의 파일을 선탑재하여 필터링에 사용합니다.
    this.subroutineDefinitions.clear();
    for (const { name, type } of allFilesWithType) {
      if (type === 'subroutine') {
        const def = await this.loadSubroutineDefinition(name);
        if (def) this.subroutineDefinitions.set(name, def);
      }
    }

    const activeFiles = await window.electronAPI.getActiveSequences();
    this.activeSequenceFiles = new Set(activeFiles);

    // 활성화된 시퀀스를 로드하고 활성화합니다.
    for (const fileName of this.activeSequenceFiles) {
      await this.activateSequence(fileName);
    }
  }

  public getAllSequenceFiles(): string[] {
    return this.allSequenceFiles;
  }

  public getActiveSequenceFiles(): string[] {
    return Array.from(this.activeSequenceFiles);
  }

  /**
   * 시퀀스를 활성화 또는 비활성화합니다.
   * @param fileName - 토글할 시퀀스의 파일 이름입니다.
   * @param shouldActivate - 활성화할지 여부입니다.
   */
  public async toggleSequence(fileName: string, shouldActivate: boolean): Promise<void> {
    if (shouldActivate) {
      this.activeSequenceFiles.add(fileName);
      await this.activateSequence(fileName);
    } else {
      this.activeSequenceFiles.delete(fileName);
      this.deactivateSequence(fileName);
    }
    await window.electronAPI.setActiveSequences(Array.from(this.activeSequenceFiles));
    this.pluginContext.eventBus.emit('sequences:activeListChanged', this.getActiveSequenceFiles());
  }

  /**
   * 시퀀스를 수동으로 한 번 실행합니다.
   * @param fileName - 실행할 시퀀스의 파일 이름입니다.
   */
  public async manualStartSequence(fileName: string): Promise<void> {
    try {
      const sequenceData = await this.loadAndDeserializeSequence(fileName);
      if (sequenceData) {
        console.log(`[SequenceManager] Manually starting sequence: ${fileName}`);
        await this.sequenceEngine.runManual(sequenceData.nodes, sequenceData.edges);
      }
    } catch (error) {
      console.error(`[SequenceManager] Failed to manually start sequence ${fileName}:`, error);
    }
  }

  /**
   * ID를 기반으로 시퀀스를 프로그래매틱하게 실행합니다.
   * @param fileName - 실행할 시퀀스의 파일 이름입니다.
   */
  public async runSequenceById(fileName: string): Promise<void> {
    // manualStartSequence와 동일한 로직을 사용합니다.
    // 이 메서드는 주로 액션 시스템에서 호출하기 위해 존재합니다.
    return this.manualStartSequence(fileName);
  }

  /**
   * 지정된 ID와 인수를 사용하여 서브루틴을 실행합니다.
   * @param fileName - 실행할 서브루틴의 파일 이름입니다.
   * @param args - 서브루틴의 입력 노드에 전달할 인수(파라미터)입니다.
   */
  public async runSubroutine(fileName: string, args: Record<string, any>): Promise<void> {
    const def = this.getSubroutineDefinition(fileName);
    const csm = this.pluginContext.characterStateManager;
    if (def && csm) {
      if (!csm.hasCapabilities(def.capabilities)) {
        console.warn(`[SequenceManager] Cannot run subroutine '${fileName}'; missing capabilities: ${def.capabilities}`);
        return;
      }
      if (!csm.acquireLocks(def.locks)) {
        console.warn(`[SequenceManager] Cannot acquire locks for subroutine '${fileName}': ${def.locks}`);
        return;
      }
    }
    try {
      const sequenceData = await this.loadAndDeserializeSequence(fileName);
      if (!sequenceData) {
        console.error(`[SequenceManager] Subroutine file not found or failed to load: ${fileName}`);
        return;
      }
      const isSubroutine = sequenceData.nodes.some(n => n.data.constructor.name === 'InputNodeModel');
      if (!isSubroutine) {
        console.error(`[SequenceManager] Attempted to run a non-subroutine sequence as a subroutine: ${fileName}`);
        return;
      }
      console.log(`[SequenceManager] Running subroutine: ${fileName} with args:`, args);
      await this.sequenceEngine.runSubroutine(sequenceData.nodes, sequenceData.edges, args);
    } catch (error) {
      console.error(`[SequenceManager] Failed to run subroutine ${fileName}:`, error);
    } finally {
      if (def && csm) {
        csm.releaseLocks(def.locks);
      }
    }
  }

  /**
   * 시퀀스 파일을 삭제합니다.
   * @param fileName - 삭제할 시퀀스의 파일 이름입니다.
   */
  public async deleteSequence(fileName: string): Promise<void> {
    // 먼저 비활성화합니다.
    if (this.activeSequenceFiles.has(fileName)) {
      await this.toggleSequence(fileName, false);
    }

    const result = await window.electronAPI.deleteSequence(fileName);
    if (result.success) {
      console.log(`[SequenceManager] Sequence ${fileName} deleted successfully.`);
      this.allSequenceFiles = this.allSequenceFiles.filter(f => f !== fileName);
      this.sequenceCache.delete(fileName);
      this.subroutineDefinitions.delete(fileName);
      
      const updatedAllFiles = await window.electronAPI.getAllSequenceFilesWithType();
      this.allSequenceFiles = updatedAllFiles.map(f => f.name);

      this.pluginContext.eventBus.emit('sequences-updated', {
        allSequences: updatedAllFiles,
        activeSequences: this.getActiveSequenceFiles(),
      });
    } else {
      console.error(`[SequenceManager] Failed to delete sequence ${fileName}:`, result.error);
      throw new Error(result.error);
    }
  }

  /**
   * 에디터의 현재 노드/엣지 상태를 기반으로 시퀀스를 수동 실행합니다.
   * @param nodes 실행할 노드 배열
   * @param edges 실행할 엣지 배열
   */
  public async runManualFromState(nodes: Node[], edges: any[]): Promise<void> {
    console.log(`[SequenceManager] Manually running sequence from editor state.`);
    await this.sequenceEngine.runManual(nodes, edges);
  }

  /**
   * 시퀀스를 활성화하고 이벤트 리스너를 등록합니다.
   * @param fileName - 활성화할 시퀀스의 파일 이름입니다.
   */
  private async activateSequence(fileName: string): Promise<void> {
    try {
      const sequenceData = await this.loadAndDeserializeSequence(fileName);
      if (sequenceData) {
        this.sequenceEngine.activateSequence(fileName, sequenceData.nodes, sequenceData.edges);
      }
    } catch (error) {
      console.error(`[SequenceManager] Failed to activate sequence ${fileName}:`, error);
      // 활성화에 실패하면 목록에서 제거합니다.
      this.activeSequenceFiles.delete(fileName);
      await window.electronAPI.setActiveSequences(Array.from(this.activeSequenceFiles));
    }
  }

  /**
   * 시퀀스를 비활성화하고 이벤트 리스너를 해제합니다.
   * @param fileName - 비활성화할 시퀀스의 파일 이름입니다.
   */
  private deactivateSequence(fileName: string): void {
    this.sequenceEngine.deactivateSequence(fileName);
  }

  /**
   * 시퀀스 JSON 객체를 실제 노드 모델 객체로 변환합니다.
   * @param sequenceData - 파싱된 시퀀스 JSON 데이터입니다.
   * @returns 역직렬화된 노드와 엣지를 포함하는 객체입니다.
   */
  public async deserializeSequence(sequenceData: any): Promise<SequenceData> {
    const nodePromises = sequenceData.nodes.map(async (sNode: any): Promise<Node<BaseNode> | null> => {
      const data = sNode.data;
      let model: BaseNode;
  
      switch (sNode.type) {
        case 'actionNode':
          const actionDef = this.actionRegistry.getActionDefinition(data.actionName);
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
        
        case 'manualStartNode':
          model = new ManualStartNodeModel(sNode.id);
          break;
  
        case 'eventNode':
          const eventDef = EVENT_DEFINITIONS.find(e => e.name === data.eventName);
          if (!eventDef) {
            console.error(`Event "${data.eventName}" not found in definitions. Cannot load node ${sNode.id}.`);
            return null;
          }
          model = new EventNodeModel(sNode.id, eventDef);
          break;
  
        case 'literalNode':
          model = new LiteralNodeModel(sNode.id, data.dataType, data.value);
          break;
  
        case 'delayNode':
          model = new DelayNodeModel(sNode.id, data.delay);
          break;
  
        case 'operatorNode':
          model = new OperatorNodeModel(sNode.id, data.category, data.operator);
          break;
  
        case 'randomNode':
          model = new RandomNodeModel(sNode.id, data.min, data.max);
          break;
  
        case 'branchNode':
          model = new BranchNodeModel(sNode.id);
          break;
  
        case 'clockNode':
          model = new ClockNodeModel(sNode.id, data.interval);
          break;
  
        case 'numToStrNode':
          model = new NumToStrNodeModel(sNode.id);
          break;
  
        case 'subroutineInputNode':
          model = new InputNodeModel(sNode.id, data.parameters);
          break;

        case 'callSubroutineNode':
          const callNode = new CallSubroutineNodeModel(sNode.id, data.subroutineId);
          if (data.subroutineId) {
            try {
              const targetSequence = await this.loadAndDeserializeSequence(data.subroutineId);
              if (targetSequence) {
                const inputNode = targetSequence.nodes.find(n => n.data instanceof InputNodeModel)?.data as InputNodeModel;
                if (inputNode) {
                  callNode.setSubroutine(data.subroutineId, inputNode.parameters);
                } else {
                  console.warn(`[SequenceManager] Subroutine "${data.subroutineId}" has no InputNode. Cannot determine parameters for node ${sNode.id}.`);
                }
              }
            } catch (e) {
              console.error(`[SequenceManager] Failed to load parameters for subroutine "${data.subroutineId}" in node ${sNode.id}.`, e);
            }
          }
          model = callNode;
          break;
  
        case 'dataProviderNode':
          const registry = this.pluginContext.dataProviderRegistry;
          if (!registry) {
            console.error(`DataProviderRegistry not found in context. Cannot load dataProviderNode ${sNode.id}.`);
            return null;
          }
          const providerInfo = registry.get(data.providerName);
          if (!providerInfo) {
            console.error(`Data provider "${data.providerName}" not found in registry. Cannot load node ${sNode.id}.`);
            return null;
          }
          model = new DataProviderNodeModel(sNode.id, providerInfo.definition);
          break;

        case 'commentNode':
          model = new CommentNodeModel(sNode.id, data.comment, data.width, data.height);
          break;

        default:
          console.error(`Unknown node type "${sNode.type}" for node ${sNode.id}.`);
          return null;
      }
  
      const finalNode: Node<BaseNode> = { ...sNode, data: model };

      // For comment nodes, apply the saved size to the node's style directly.
      if (sNode.type === 'commentNode' && data.width && data.height) {
        finalNode.style = { width: data.width, height: data.height };
      }

      return finalNode;
    });
  
    const deserializedNodes = (await Promise.all(nodePromises))
      .filter((n: Node<BaseNode> | null): n is Node<BaseNode> => n !== null);
  
    return { nodes: deserializedNodes, edges: sequenceData.edges };
  }

  /**
   * React Flow 객체를 저장 가능한 JSON 객체로 직렬화합니다.
   * @param flow - React Flow 인스턴스에서 toObject()로 얻은 객체입니다.
   * @returns 직렬화된 노드와 엣지를 포함하는 객체입니다.
   */
  public serializeSequence(flow: any, description: string, capabilities: string[] = [], locks: string[] = []): any {
    const serializedNodes = flow.nodes.map((node: Node<BaseNode>) => {
      const serializedData = node.data.serialize();
      
      // For comment nodes, get the actual rendered size from the node object,
      // not from the data model, to ensure it's the source of truth.
      if (node.type === 'commentNode' && node.width && node.height) {
        (serializedData as any).width = Math.round(node.width);
        (serializedData as any).height = Math.round(node.height);
      }

      const { data, ...rest } = node;
      return { ...rest, data: serializedData };
    });

    // Determine the sequence type
    const isSubroutine = flow.nodes.some((node: Node) => node.type === 'subroutineInputNode');
    const sequenceType = isSubroutine ? 'subroutine' : 'sequence';

    const data: any = {
      type: sequenceType,
      description,
      nodes: serializedNodes,
      edges: flow.edges,
    };
    if (sequenceType === 'subroutine') {
      data.capabilities = capabilities;
      data.locks = locks;
    }
    return data;
  }

  /**
   * 시퀀스를 파일에 저장하거나 업데이트합니다.
   * fileName이 제공되면 해당 파일을 덮어쓰고, 그렇지 않으면 '다른 이름으로 저장' 대화 상자를 엽니다.
   * @param flow - React Flow 인스턴스에서 toObject()로 얻은 객체입니다.
   * @param description - 시퀀스에 대한 설명입니다.
   * @param capabilities - 서브루틴에 필요한 기능 목록입니다.
   * @param locks - 서브루틴이 실행되는 동안 점유할 잠금 목록입니다.
   * @param fileName - (선택 사항) 저장할 시퀀스의 파일 이름입니다.
   * @returns 성공 여부와 파일 경로를 포함하는 객체입니다.
   */
  public async saveOrUpdateSequence(
    flow: any, 
    description: string, 
    capabilities: string[] = [], 
    locks: string[] = [], 
    fileName?: string | null
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const serializableData = this.serializeSequence(flow, description, capabilities, locks);
      const jsonString = JSON.stringify(serializableData, null, 2);
      
      const result = fileName 
        ? await window.electronAPI.saveSequenceToFile(fileName, jsonString)
        : await window.electronAPI.saveSequence(jsonString);

      if (result.success && result.filePath) {
        const newFileName = await window.electronAPI.basename(result.filePath);
        
        // Invalidate cache for the saved file to force a re-read
        this.sequenceCache.delete(newFileName);

        // Hot-reload the sequence if it's currently active to apply logic changes immediately
        if (this.activeSequenceFiles.has(newFileName)) {
          console.log(`[SequenceManager] Hot-reloading active sequence: ${newFileName}`);
          this.deactivateSequence(newFileName);
          await this.activateSequence(newFileName);
        }

        // Update internal file list if it's a new file
        if (!this.allSequenceFiles.includes(newFileName)) {
          this.allSequenceFiles.push(newFileName);
        }

        // Update subroutine definitions cache
        if (serializableData.type === 'subroutine') {
          const def = await this.loadSubroutineDefinition(newFileName, serializableData);
          if (def) {
            this.subroutineDefinitions.set(newFileName, def);
          }
        } else {
          this.subroutineDefinitions.delete(newFileName);
        }
        
        const updatedAllFiles = await window.electronAPI.getAllSequenceFilesWithType();
        this.allSequenceFiles = updatedAllFiles.map(f => f.name);

        this.pluginContext.eventBus.emit('sequences-updated', {
          allSequences: updatedAllFiles,
          activeSequences: this.getActiveSequenceFiles(),
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SequenceManager] Failed to save sequence:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 파일에서 시퀀스 데이터를 로드하고 역직렬화합니다. 캐시를 활용합니다.
   * @param fileName - 로드할 시퀀스의 파일 이름입니다.
   * @returns 역직렬화된 시퀀스 데이터 또는 실패 시 null입니다.
   */
  private async loadAndDeserializeSequence(fileName: string): Promise<SequenceData | null> {
    if (this.sequenceCache.has(fileName)) {
      return this.sequenceCache.get(fileName)!;
    }

    try {
      const filePath = await window.electronAPI.resolvePath('userData', `sequences/${fileName}`);
      const fileExists = await window.electronAPI.fileExists(filePath);
      if (!fileExists) {
        console.warn(`[SequenceManager] Sequence file not found, cannot load: ${fileName}`);
        return null;
      }

      const sequenceJSON = await window.electronAPI.readAbsoluteFile(filePath);
      if (!(sequenceJSON instanceof ArrayBuffer)) {
        console.error(`[SequenceManager] Failed to read sequence file buffer: ${fileName}`, sequenceJSON);
        return null;
      }
      const sequenceData = JSON.parse(new TextDecoder().decode(sequenceJSON));

      const result = await this.deserializeSequence(sequenceData);
      this.sequenceCache.set(fileName, result);
      return result;

    } catch (error) {
      console.error(`[SequenceManager] Failed to load and deserialize sequence ${fileName}:`, error);
      return null;
    }
  }

  /**
   * 서브루틴 정의 파일을 로드하여 메타데이터를 반환합니다.
   * @param fileName 서브루틴 파일 이름
   * @param data 직렬화된 데이터 (선택 사항, 제공되면 파일 I/O를 건너뜁니다)
   */
  private async loadSubroutineDefinition(fileName: string, data?: any): Promise<SubroutineDefinition | undefined> {
    try {
      let json = data;
      if (!json) {
        const filePath = await window.electronAPI.resolvePath('userData', `sequences/${fileName}`);
        const exists = await window.electronAPI.fileExists(filePath);
        if (!exists) {
          console.warn(`[SequenceManager] Subroutine file not found: ${fileName}`);
          return undefined;
        }
        const fileBuffer = await window.electronAPI.readAbsoluteFile(filePath);
        if (!(fileBuffer instanceof ArrayBuffer)) {
          console.error(`[SequenceManager] Failed to read subroutine file buffer: ${fileName}`);
          return undefined;
        }
        json = JSON.parse(new TextDecoder().decode(fileBuffer));
      }

      if (json.type !== 'subroutine') {
        return undefined;
      }
      const name = json.name || fileName.replace(/\.[^/.]+$/, '');
      const description = json.description || '';
      const parameters: SubroutineParameter[] = [];
      const inputNode = (json.nodes || []).find((n: any) => n.type === 'subroutineInputNode');
      if (inputNode?.data?.parameters) {
        for (const param of inputNode.data.parameters) {
          parameters.push({
            name: param.name,
            type: param.type,
            description: param.description,
          });
        }
      }
      const capabilities: string[] = Array.isArray(json.capabilities) ? json.capabilities : [];
      const locks: string[] = Array.isArray(json.locks) ? json.locks : [];
      return { name, description, parameters, capabilities, locks };
    } catch (error) {
      console.error(`[SequenceManager] Error loading subroutine definition ${fileName}:`, error);
      return undefined;
    }
  }
}
