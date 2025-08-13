
/**
 * A simple key-value store for plugins/mods to share state, with basic event subscription.
 */
export class ContextStore {
  private store: Map<string, any> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Notifies all registered listeners that the store has been updated.
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Subscribes a listener function to be called on store updates.
   * @param listener The function to call when the store changes.
   * @returns An unsubscribe function.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Sets a value in the store and notifies listeners.
   * @param key The key to store the value under.
   * @param value The value to store.
   */
  public set(key: string, value: any): void {
    this.store.set(key, value);
    this.notifyListeners();
    // console.log(`[ContextStore] Set ${key}:`, value);
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
   * Gets a shallow copy of all key-value pairs in the store.
   * @returns An object containing all key-value pairs.
   */
  public getAll(): Record<string, any> {
    return Object.fromEntries(this.store);
  }

  /**
   * Deletes a key-value pair from the store and notifies listeners.
   * @param key The key to delete.
   * @returns True if the key existed and was deleted, false otherwise.
   */
  public delete(key: string): boolean {
    const result = this.store.delete(key);
    if (result) {
      this.notifyListeners();
    }
    return result;
  }

  /**
   * Clears the entire store and notifies listeners.
   */
  public clear(): void {
    this.store.clear();
    this.notifyListeners();
  }
}
