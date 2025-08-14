import { DataProviderDefinition, DataProviderImplementation } from "../../plugin-api/data-providers";

/**
 * 레지스트리 내에서 관리될 데이터 프로바이더의 정보 구조입니다.
 */
interface DataProviderInfo {
    definition: DataProviderDefinition;
    implementation: DataProviderImplementation;
}

/**
 * 데이터 프로바이더를 등록하고 관리하는 중앙 레지스트리 클래스입니다.
 */
export class DataProviderRegistry {
    private providers = new Map<string, DataProviderInfo>();

    /**
     * 새로운 데이터 프로바이더를 등록합니다.
     * @param definition - 데이터 프로바이더의 명세 (이름, 설명, 입출력 등)
     * @param implementation - 실제 데이터를 반환하는 함수
     */
    register(definition: DataProviderDefinition, implementation: DataProviderImplementation) {
        if (this.providers.has(definition.name)) {
            console.warn(`Data provider "${definition.name}" is already registered. Overwriting.`);
        }
        this.providers.set(definition.name, { definition, implementation });
    }

    /**
     * 이름으로 등록된 데이터 프로바이더 정보를 가져옵니다.
     * @param name - 가져올 데이터 프로바이더의 이름
     * @returns 데이터 프로바이더 정보 또는 undefined
     */
    get(name: string): DataProviderInfo | undefined {
        return this.providers.get(name);
    }

    /**
     * 등록된 모든 데이터 프로바이더의 명세 목록을 반환합니다.
     * @returns 모든 데이터 프로바이더 명세의 배열
     */
    getAllDefinitions(): DataProviderDefinition[] {
        return Array.from(this.providers.values()).map(info => info.definition);
    }
}
