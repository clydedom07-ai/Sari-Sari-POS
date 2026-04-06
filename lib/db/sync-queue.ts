'use client';

import { dbUtil, STORES, SyncAction, StoreName } from './idb';

/**
 * [SaaS ARCHITECT NOTE]
 * This sync queue is designed for a multi-device cloud environment.
 * 
 * OFFLINE-FIRST STRATEGY:
 * 1. Local-First: All writes go to IndexedDB immediately via syncDb.
 * 2. Background Sync: Changes are queued in 'sync_queue'.
 * 3. Conflict Resolution: Uses 'updatedAt' (Last Write Wins) on the server.
 * 4. Soft Deletes: 'isDeleted' flag ensures deletions propagate across devices.
 * 
 * FUTURE API INTEGRATION:
 * - Implement a /api/sync endpoint that accepts a batch of SyncActions.
 * - The backend should return the server's authoritative state for any conflicted items.
 */

/**
 * Queues an action to be synchronized with the server when online.
 */
export async function queueAction(
  store: StoreName,
  type: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: any
): Promise<void> {
  const action: SyncAction = {
    store,
    type,
    payload: {
      ...payload,
      updatedAt: Date.now(),
      isDeleted: type === 'DELETE'
    },
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  try {
    await dbUtil.addItem(STORES.SYNC_QUEUE, action);
    console.log(`[CloudSync] Queued ${type} for ${store}`);
    
    // Trigger background sync if online
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      processQueue();
    }
  } catch (error) {
    console.error('[CloudSync] Failed to queue action:', error);
  }
}

/**
 * Marks a specific action as successfully synchronized.
 */
export async function markAsSynced(actionId: number): Promise<void> {
  try {
    await dbUtil.deleteItem(STORES.SYNC_QUEUE, actionId);
    console.log(`[CloudSync] Action ${actionId} synced and removed from queue.`);
  } catch (error) {
    console.error(`[CloudSync] Failed to mark action ${actionId} as synced:`, error);
  }
}

/**
 * Processes the pending synchronization queue in batches.
 */
export async function processQueue(): Promise<void> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return;
  }

  const queue = await dbUtil.getItems<SyncAction>(STORES.SYNC_QUEUE);
  const pendingActions = queue.filter(a => a.status === 'pending' || a.status === 'failed');

  if (pendingActions.length === 0) return;

  console.log(`[CloudSync] Syncing ${pendingActions.length} changes to cloud...`);

  // Batching strategy: Send up to 50 actions at a time
  const BATCH_SIZE = 50;
  const batch = pendingActions.slice(0, BATCH_SIZE);

  try {
    // 1. Mark batch as processing locally
    for (const action of batch) {
      action.status = 'processing';
      await dbUtil.updateItem(STORES.SYNC_QUEUE, action);
    }

    // 2. --- BACKEND INTEGRATION POINT ---
    // In a real SaaS, you would send the entire batch here:
    // const response = await fetch('/api/v1/sync/batch', {
    //   method: 'POST',
    //   body: JSON.stringify({ actions: batch })
    // });
    // if (!response.ok) throw new Error('Batch sync failed');
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    
    // 3. On success, remove from queue
    for (const action of batch) {
      if (action.id) {
        await markAsSynced(action.id);
      }
    }

    // 4. Update store-wide sync timestamp
    const storeInfo = await dbUtil.getItems<any>(STORES.STORE_INFO);
    if (storeInfo.length > 0) {
      const info = storeInfo[0];
      info.lastSyncedAt = Date.now();
      await dbUtil.updateItem(STORES.STORE_INFO, info);
    }

    // 5. If there are more items, continue processing
    if (pendingActions.length > BATCH_SIZE) {
      processQueue();
    }
  } catch (error) {
    console.error('[CloudSync] Batch sync failed:', error);
    // Revert status to failed for retry
    for (const action of batch) {
      action.status = 'failed';
      action.retryCount += 1;
      await dbUtil.updateItem(STORES.SYNC_QUEUE, action);
    }
  }
}

/**
 * SaaS-ready DB wrapper.
 */
export const syncDb = {
  async add<T>(store: StoreName, item: T): Promise<any> {
    const result = await dbUtil.addItem(store, item);
    await queueAction(store, 'CREATE', item);
    return result;
  },

  async update<T>(store: StoreName, item: T): Promise<any> {
    const result = await dbUtil.updateItem(store, item);
    await queueAction(store, 'UPDATE', item);
    return result;
  },

  async delete(store: StoreName, id: string | number): Promise<void> {
    const item = await dbUtil.getItemById<any>(store, id);
    if (item) {
      // For metadata, the ID might be 'key'
      const key = (item as any).id || (item as any).key || id;
      await dbUtil.deleteItem(store, id);
      await queueAction(store, 'DELETE', { ...item, id: key, isDeleted: true });
    }
  }
};

// Listen for online event to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Back online! Triggering sync...');
    processQueue();
  });
}
