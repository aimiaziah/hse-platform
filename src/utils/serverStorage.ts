// src/utils/serverStorage.ts - Server-side storage using filesystem
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class ServerStorage {
  private getFilePath(key: string): string {
    return path.join(DATA_DIR, `${key}.json`);
  }

  save<T>(key: string, data: T): void {
    try {
      const filePath = this.getFilePath(key);
      const serializedData = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, serializedData, 'utf8');
    } catch (error) {
      console.error('Error saving to serverStorage:', error);
    }
  }

  load<T>(key: string, defaultValue: T): T {
    try {
      const filePath = this.getFilePath(key);
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Error loading from serverStorage:', error);
      return defaultValue;
    }
  }

  remove(key: string): void {
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error removing from serverStorage:', error);
    }
  }

  clear(): void {
    try {
      const files = fs.readdirSync(DATA_DIR);
      files.forEach((file) => {
        fs.unlinkSync(path.join(DATA_DIR, file));
      });
    } catch (error) {
      console.error('Error clearing serverStorage:', error);
    }
  }
}

export const serverStorage = new ServerStorage();
