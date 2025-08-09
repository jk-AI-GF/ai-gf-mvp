
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
import { DelayNodeModel } from './DelayNodeModel';
import { BranchNodeModel } from './BranchNodeModel';
import { ClockNodeModel } from './ClockNodeModel';

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

  constructor(pluginContext: PluginContext) {
    if (!pluginContext || !pluginContext.actionRegistry) {
      throw new Error("SequenceManager requires a PluginContext with an ActionRegistry.");
    }
    this.pluginContext = pluginContext;
    this.actionRegistry = pluginContext.actionRegistry;
    this.sequenceEngine = new SequenceEngine(pluginContext);
  }

  /**
   * userData/sequences 폴더에서 모든 시퀀스 파일 목록을 가져와 내부 상태를 초기화합니다.
   */
  public async initialize(): Promise<void> {
    this.allSequenceFiles = await window.electronAPI.getSequences();
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
      // UI 업데이트를 위해 이벤트를 발생시킬 수 있습니다.
      // this.pluginContext.eventBus.emit('sequences-updated');
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
  public deserializeSequence(sequenceData: any): SequenceData {
    const deserializedNodes: Node<BaseNode>[] = sequenceData.nodes.map((sNode: any): Node<BaseNode> | null => {
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

        default:
          console.error(`Unknown node type "${sNode.type}" for node ${sNode.id}.`);
          return null;
      }

      return { ...sNode, data: model };
    }).filter((n: Node<BaseNode> | null): n is Node<BaseNode> => n !== null);

    return { nodes: deserializedNodes, edges: sequenceData.edges };
  }

  /**
   * React Flow 객체를 저장 가능한 JSON 객체로 직렬화합니다.
   * @param flow - React Flow 인스턴스에서 toObject()로 얻은 객체입니다.
   * @returns 직렬화된 노드와 엣지를 포함하는 객체입니다.
   */
  public serializeSequence(flow: any): any {
    const serializedNodes = flow.nodes.map((node: Node<BaseNode>) => {
      // data 객체(모델)의 serialize 메서드를 호출하여 직렬화된 데이터를 가져옵니다.
      const serializedData = node.data.serialize();
      // 원래 노드에서 data를 제외한 나머지 속성을 복사하고, 직렬화된 데이터를 추가합니다.
      const { data, ...rest } = node;
      return { ...rest, data: serializedData };
    });

    return { nodes: serializedNodes, edges: flow.edges };
  }

  /**
   * 직렬화된 시퀀스 데이터를 지정된 파일에 덮어씁니다.
   * @param fileName - 저장할 시퀀스의 파일 이름입니다.
   * @param flow - React Flow 인스턴스에서 toObject()로 얻은 객체입니다.
   * @returns 성공 여부와 파일 경로를 포함하는 객체입니다.
   */
  public async saveSequenceToFile(fileName: string, flow: any): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const serializableData = this.serializeSequence(flow);
      const jsonString = JSON.stringify(serializableData, null, 2);
      
      // 메인 프로세스에 파일 저장을 요청합니다.
      const result = await window.electronAPI.saveSequenceToFile(fileName, jsonString);

      if (result.success) {
        // 성공 시 캐시를 무효화하여 다음에 최신 버전을 로드하도록 합니다.
        this.sequenceCache.delete(fileName);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SequenceManager] Failed to save sequence to file ${fileName}:`, errorMessage);
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

      const result = this.deserializeSequence(sequenceData);
      this.sequenceCache.set(fileName, result);
      return result;

    } catch (error) {
      console.error(`[SequenceManager] Failed to load and deserialize sequence ${fileName}:`, error);
      return null;
    }
  }
}
