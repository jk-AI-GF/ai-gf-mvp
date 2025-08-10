/**
 * CharacterStateManager는 캐릭터의 행동 전제 조건(Capabilities)과
 * 행동 실행 시 점유할 리소스(Locks)를 관리합니다.
 */
export class CharacterStateManager {
  private capabilities: Set<string> = new Set();
  private locks: Set<string> = new Set();

  /**
   * 현재 캐릭터가 보유한 상태(Capability)를 추가합니다.
   */
  public addCapability(capability: string): void {
    this.capabilities.add(capability);
  }

  /**
   * 캐릭터 상태(Capability)를 제거합니다.
   */
  public removeCapability(capability: string): void {
    this.capabilities.delete(capability);
  }

  /**
   * 요구되는 모든 Capability를 만족하는지 확인합니다.
   */
  public hasCapabilities(required: string[]): boolean {
    return required.every(cap => this.capabilities.has(cap));
  }

  /**
   * 요청된 리소스(Locks)를 획득합니다.
   * 다른 행동이 점유 중인 리소스가 있으면 false를 반환합니다.
   */
  public acquireLocks(requested: string[]): boolean {
    if (requested.some(lock => this.locks.has(lock))) {
      return false;
    }
    requested.forEach(lock => this.locks.add(lock));
    return true;
  }

  /**
   * 사용이 끝난 리소스(Locks)를 해제합니다.
   */
  public releaseLocks(released: string[]): void {
    released.forEach(lock => this.locks.delete(lock));
  }

  /**
   * 현재 보유 중인 Capability 목록을 반환합니다.
   */
  public getCurrentCapabilities(): string[] {
    return Array.from(this.capabilities);
  }

  /**
   * 현재 점유 중인 Lock 목록을 반환합니다.
   */
  public getCurrentLocks(): string[] {
    return Array.from(this.locks);
  }
}