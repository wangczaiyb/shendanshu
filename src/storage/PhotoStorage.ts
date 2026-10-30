import { PhotoItem } from '../types';

const DB_NAME = 'ChristmasLightGardenDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

export class PhotoStorage {
  private db: IDBDatabase | null = null;
  private objectUrls: Map<string, string> = new Map();

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAllPhotos(): Promise<PhotoItem[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: Array<{
          id: string;
          name: string;
          blob?: Blob;
          aspectRatio: number;
          createdAt: number;
          title?: string;
          description?: string;
          isPreset?: boolean;
          dataUrl?: string;
          assetUrl?: string;
        }> = request.result || [];

        if (items.length === 0) {
          const presets = this.generateDefaultPresets();
          this.saveMultiplePhotos(presets).then(() => {
            resolve(presets);
          }).catch(() => {
            resolve(presets);
          });
          return;
        }

        const currentPresets = new Map(this.generateDefaultPresets().map(preset => [preset.id, preset]));
        const migratedPresets: PhotoItem[] = [];
        const result: PhotoItem[] = items.map((item) => {
          const preset = item.isPreset ? currentPresets.get(item.id) : undefined;
          if (preset) {
            const updated = { ...preset, createdAt: item.createdAt || preset.createdAt };
            if (item.assetUrl !== preset.url) migratedPresets.push(updated);
            return updated;
          }
          let url = item.assetUrl || item.dataUrl || '';
          if (item.blob) {
            if (this.objectUrls.has(item.id)) {
              URL.revokeObjectURL(this.objectUrls.get(item.id)!);
            }
            url = URL.createObjectURL(item.blob);
            this.objectUrls.set(item.id, url);
          }
          return {
            id: item.id,
            name: item.name,
            url: url,
            blob: item.blob,
            aspectRatio: item.aspectRatio || 1.25,
            createdAt: item.createdAt,
            title: item.title,
            description: item.description,
            isPreset: item.isPreset,
          };
        });

        if (migratedPresets.length) {
          this.saveMultiplePhotos(migratedPresets).then(() => resolve(result)).catch(() => resolve(result));
        } else resolve(result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async savePhoto(item: {
    id: string;
    name: string;
    blob?: Blob;
    dataUrl?: string;
    aspectRatio: number;
    title?: string;
    description?: string;
    isPreset?: boolean;
  }): Promise<PhotoItem> {
    await this.init();
    if (!this.db) throw new Error('DB not initialized');

    const record = {
      id: item.id,
      name: item.name,
      blob: item.blob,
      dataUrl: item.dataUrl,
      aspectRatio: item.aspectRatio,
      createdAt: Date.now(),
      title: item.title || item.name,
      description: item.description || '',
      isPreset: item.isPreset || false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => {
        let url = item.dataUrl || '';
        if (item.blob) {
          url = URL.createObjectURL(item.blob);
          this.objectUrls.set(item.id, url);
        }
        resolve({
          ...record,
          url,
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveMultiplePhotos(items: PhotoItem[]): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      items.forEach((item) => {
        store.put({
          id: item.id,
          name: item.name,
          blob: item.blob,
          dataUrl: item.url.startsWith('data:') ? item.url : undefined,
          assetUrl: item.isPreset && item.url.startsWith('/') ? item.url : undefined,
          aspectRatio: item.aspectRatio,
          createdAt: item.createdAt || Date.now(),
          title: item.title,
          description: item.description,
          isPreset: item.isPreset,
        });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePhoto(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    if (this.objectUrls.has(id)) {
      URL.revokeObjectURL(this.objectUrls.get(id)!);
      this.objectUrls.delete(id);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /** Bundled memories, in the order supplied by the user. */
  generateDefaultPresets(): PhotoItem[] {
    return [
      {
        id: 'preset-1',
        name: '给西兰花的信',
        title: '回忆 01 · 手写信',
        description: '',
        aspectRatio: 1389 / 1079,
        url: '/memories/memory-01-letter.jpg',
      },
      {
        id: 'preset-2',
        name: '书页里的小纸条',
        title: '回忆 02 · 小纸条',
        description: '',
        aspectRatio: 1080 / 1440,
        url: '/memories/memory-02-note.jpg',
      },
      {
        id: 'preset-3',
        name: '苹果与小星星',
        title: '回忆 03 · 苹果与星星',
        description: '',
        aspectRatio: 1,
        url: '/memories/memory-03-apple.png',
      },
      {
        id: 'preset-4',
        name: '雪中的街道',
        title: '回忆 04 · 冬日落雪',
        description: '',
        aspectRatio: 5888 / 4416,
        url: '/memories/memory-04-snow.jpg',
      },
    ].map(photo => ({ ...photo, createdAt: Date.now(), isPreset: true }));
  }
}

export const photoStorage = new PhotoStorage();
