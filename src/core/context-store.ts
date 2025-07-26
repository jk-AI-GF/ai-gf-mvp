
/**
 * A simple key-value store for modules to share state.
 */
export class ContextStore {
  private store: Map<string, any> = new Map();

  /**
   * Sets a value in the store.
   * @param key The key to store the value under.
   * @param value The value to store.
   */
  public set(key: string, value: any): void {
    this.store.set(key, value);
    console.log(`[ContextStore] Set ${key}:`, value);
  }

  /**
   * Gets a value from the store.
   * @param key The key of the value to retrieve.
   * @returns The value, or undefined if the key does not exist.
   */
  public get(key: string): any {
    return this.store.get(key);
  }

  /**
   * Deletes a key-value pair from the store.
   * @param key The key to delete.
   * @returns True if the key existed and was deleted, false otherwise.
   */
  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears the entire store.
   */
  public clear(): void {
    this.store.clear();
  }
}
