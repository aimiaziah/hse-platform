// src/utils/storage.ts
class Storage {
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  save<T>(key: string, data: T): void {
    if (!this.isClient()) {
      console.warn(`[Storage] Cannot save '${key}' - not running in browser`);
      return;
    }

    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      console.log(
        `[Storage] ✅ Saved '${key}':`,
        Array.isArray(data) ? `${data.length} items` : typeof data,
      );
    } catch (error) {
      console.error(`[Storage] ❌ Error saving '${key}':`, error);
      throw error; // Re-throw to notify caller
    }
  }

  load<T>(key: string, defaultValue: T): T {
    if (!this.isClient()) {
      console.warn(`[Storage] Cannot load '${key}' - not running in browser`);
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        console.log(`[Storage] Loading '${key}': not found, returning default`);
        return defaultValue;
      }
      const parsed = JSON.parse(item) as T;
      console.log(
        `[Storage] ✅ Loaded '${key}':`,
        Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed,
      );
      return parsed;
    } catch (error) {
      console.error(`[Storage] ❌ Error loading '${key}':`, error);
      return defaultValue;
    }
  }

  remove(key: string): void {
    if (!this.isClient()) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  clear(): void {
    if (!this.isClient()) return;

    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

export const storage = new Storage();
