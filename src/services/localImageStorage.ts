const DB_NAME = 'DawaSnapLocalImages';
const LEGACY_DB_NAME = 'DawaLensLocalImages';
const STORE_NAME = 'images';
const DB_VERSION = 1;

class LocalImageStorage {
  private db: IDBDatabase | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });
  }

  public async saveImage(medicineId: string, base64Data: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(base64Data, medicineId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to save image locally in IndexedDB:', e);
    }
  }

  public async getImage(medicineId: string): Promise<string | null> {
    try {
      const db = await this.initDB();
      const res = await new Promise<string | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(medicineId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

      if (res) return res;

      // Fallback check legacy store
      try {
        const legacyReq = indexedDB.open(LEGACY_DB_NAME, 1);
        return new Promise<string | null>((resolve) => {
          legacyReq.onsuccess = () => {
            const legacyDb = legacyReq.result;
            if (!legacyDb.objectStoreNames.contains(STORE_NAME)) {
              legacyDb.close();
              return resolve(null);
            }
            const tx = legacyDb.transaction(STORE_NAME, 'readonly');
            const legacyStore = tx.objectStore(STORE_NAME);
            const legacyFetch = legacyStore.get(medicineId);
            legacyFetch.onsuccess = () => {
              const legacyVal = legacyFetch.result || null;
              legacyDb.close();
              resolve(legacyVal);
            };
            legacyFetch.onerror = () => {
              legacyDb.close();
              resolve(null);
            };
          };
          legacyReq.onerror = () => resolve(null);
        });
      } catch {
        return null;
      }
    } catch (e) {
      console.error('Failed to get image from IndexedDB:', e);
      return null;
    }
  }

  public async deleteImage(medicineId: string): Promise<void> {
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(medicineId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to delete image from IndexedDB:', e);
    }
  }

  public async clearAll(): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to clear IndexedDB store:', e);
    }
  }
}

export const localImageStorage = new LocalImageStorage();
