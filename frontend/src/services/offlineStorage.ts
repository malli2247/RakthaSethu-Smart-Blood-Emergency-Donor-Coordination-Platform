import { emergencyService } from './emergencyService';

const DB_NAME = 'rakthasethu_offline_db';
const DB_VERSION = 1;

export interface OfflineDraftRequest {
  idempotencyKey: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  bloodGroup: string;
  unitsRequired: number;
  hospitalName: string;
  hospitalCity: string;
  hospitalState?: string;
  hospitalAddress?: string;
  contactName: string;
  contactPhone: string;
  urgency: string;
  medicalReason?: string;
  createdAt: string;
}

export interface CachedEmergencyResources {
  lastUpdated: string;
  hospitals: Array<{ name: string; city: string; phone: string; address: string }>;
  bloodBanks: Array<{ name: string; city: string; phone: string; capacity: number }>;
  nationalEmergencyNumbers: Array<{ title: string; number: string; description: string }>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains('pending_requests')) {
        db.createObjectStore('pending_requests', { keyPath: 'idempotencyKey' });
      }
      if (!db.objectStoreNames.contains('emergency_cache')) {
        db.createObjectStore('emergency_cache', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

export const offlineStorage = {
  /**
   * Saves an emergency requisition created while offline
   */
  async saveOfflineRequest(draft: Omit<OfflineDraftRequest, 'idempotencyKey' | 'createdAt'>): Promise<OfflineDraftRequest> {
    const db = await openDB();
    const idempotencyKey = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fullDraft: OfflineDraftRequest = {
      ...draft,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_requests', 'readwrite');
      const store = tx.objectStore('pending_requests');
      const req = store.put(fullDraft);
      req.onsuccess = () => resolve(fullDraft);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Gets all pending offline requests waiting for synchronization
   */
  async getPendingRequests(): Promise<OfflineDraftRequest[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_requests', 'readonly');
      const store = tx.objectStore('pending_requests');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Removes a synchronized request by idempotencyKey
   */
  async removePendingRequest(idempotencyKey: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_requests', 'readwrite');
      const store = tx.objectStore('pending_requests');
      const req = store.delete(idempotencyKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Caches critical emergency numbers and facilities for offline access
   */
  async cacheEmergencyResources(data: CachedEmergencyResources): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('emergency_cache', 'readwrite');
      const store = tx.objectStore('emergency_cache');
      const req = store.put({ key: 'resources', data });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Retrieves offline cached resources
   */
  async getCachedEmergencyResources(): Promise<CachedEmergencyResources | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('emergency_cache', 'readonly');
        const store = tx.objectStore('emergency_cache');
        const req = store.get('resources');
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  /**
   * Automatically synchronizes all queued offline requests upon reconnection
   */
  async syncAllPendingActions(): Promise<{ syncedCount: number; errors: string[] }> {
    const pending = await this.getPendingRequests();
    if (pending.length === 0) {
      return { syncedCount: 0, errors: [] };
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const draft of pending) {
      try {
        await emergencyService.syncOfflineAction({
          idempotencyKey: draft.idempotencyKey,
          actionType: 'CREATE_REQUEST',
          payload: draft,
        });
        await this.removePendingRequest(draft.idempotencyKey);
        syncedCount++;
      } catch (err: any) {
        errors.push(err.message || 'Synchronization failed');
      }
    }

    return { syncedCount, errors };
  },
};
