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

        const result: PhotoItem[] = items.map((item) => {
          let url = item.dataUrl || '';
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

        resolve(result);
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

  /**
   * Generates high-resolution Canvas PNG data URLs
   */
  generateDefaultPresets(): PhotoItem[] {
    const presetsData = [
      {
        id: 'preset-1',
        name: 'Merry Christmas',
        title: '午夜祈愿 · 2025',
        description: '在深邃的祖母绿森林中，星光悄然绽放。',
        aspectRatio: 1.25,
        url: this.createCardCanvas(
          'MERRY CHRISTMAS',
          '午夜祈愿 · 星辰与松雪',
          '#041510',
          '#0a2e22',
          '#f6c85f',
          '✦ 2025 ✦'
        ),
      },
      {
        id: 'preset-2',
        name: 'Golden Radiance',
        title: '香槟颂歌 · 暖冬',
        description: '壁炉前温热的红茶，与长夜中的闪亮誓言。',
        aspectRatio: 1.25,
        url: this.createCardCanvas(
          'GOLDEN RADIANCE',
          '香槟颂歌 · 暖冬烛火',
          '#181003',
          '#332005',
          '#ffd97d',
          '❄ WARMTH ❄'
        ),
      },
      {
        id: 'preset-3',
        name: 'Emerald Evergreen',
        title: '常青之境 · 岁末',
        description: '常青的信念，如漫天星光般永不凋落。',
        aspectRatio: 1.25,
        url: this.createCardCanvas(
          'EMERALD NOEL',
          '常青之境 · 岁末回响',
          '#03141a',
          '#082a35',
          '#6ee7b7',
          '✧ ETERNITY ✧'
        ),
      },
      {
        id: 'preset-4',
        name: 'Starlight Dream',
        title: '极光与雪 · 漫步',
        description: '每一个微小的心愿，都是一盏点亮夜空的光点。',
        aspectRatio: 1.25,
        url: this.createCardCanvas(
          'STARLIGHT DREAM',
          '极光与雪 · 漫步星河',
          '#120619',
          '#240b33',
          '#f0b8ff',
          '✵ WISHES ✵'
        ),
      },
    ];

    return presetsData.map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title,
      description: p.description,
      aspectRatio: p.aspectRatio,
      url: p.url,
      createdAt: Date.now(),
      isPreset: true,
    }));
  }

  private createCardCanvas(
    enTitle: string,
    cnTitle: string,
    c1: string,
    c2: string,
    accent: string,
    badge: string
  ): string {
    if (typeof document === 'undefined') {
      return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="512"><rect width="640" height="512" fill="${c1}"/><text x="320" y="256" fill="${accent}" text-anchor="middle">${enTitle}</text></svg>`;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 640, 512);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.6, c2);
    grad.addColorStop(1, '#020508');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 512);

    // Radial center glow
    const radial = ctx.createRadialGradient(320, 240, 30, 320, 240, 300);
    radial.addColorStop(0, accent + '40');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 640, 512);

    // Double elegant borders
    ctx.strokeStyle = accent + '80';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 600, 472);

    ctx.strokeStyle = accent + '30';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, 584, 456);

    // Corner decorative markers
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCorner(36, 36);
    drawCorner(604, 36);
    drawCorner(36, 476);
    drawCorner(604, 476);

    // Top Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = accent + '70';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(240, 60, 160, 32, 16);
    } else {
      ctx.rect(240, 60, 160, 32);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 13px Times New Roman, serif';
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText(badge, 320, 81);

    // Golden title
    const titleGrad = ctx.createLinearGradient(0, 200, 0, 270);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.7, accent);
    titleGrad.addColorStop(1, '#d4af37');

    ctx.font = '400 36px Times New Roman, Cinzel, serif';
    ctx.fillStyle = titleGrad;
    ctx.letterSpacing = '4px';
    ctx.fillText(enTitle, 320, 235);

    // Chinese subtitle
    ctx.font = '300 20px PingFang SC, Microsoft YaHei, sans-serif';
    ctx.fillStyle = accent;
    ctx.letterSpacing = '2px';
    ctx.fillText(cnTitle, 320, 285);

    // Decorative line
    ctx.strokeStyle = accent + '50';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(180, 320);
    ctx.lineTo(460, 320);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(320, 320, 3, 0, Math.PI * 2);
    ctx.fill();

    // Footer note
    ctx.font = '300 11px Inter, sans-serif';
    ctx.fillStyle = '#8a99a8';
    ctx.letterSpacing = '1px';
    ctx.fillText('CHRISTMAS LIGHT GARDEN · MEMORY CARD', 320, 365);

    ctx.font = '300 10px Times New Roman, serif';
    ctx.fillStyle = accent + '90';
    ctx.letterSpacing = '4px';
    ctx.fillText('HOLIDAY DIGITAL ART EXPERIENCE', 320, 440);

    return canvas.toDataURL('image/png');
  }
}

export const photoStorage = new PhotoStorage();
