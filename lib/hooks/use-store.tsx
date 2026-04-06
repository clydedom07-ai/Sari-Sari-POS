'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbUtil, STORES, StoreInfo, logAudit } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

interface StoreContextType {
  store: StoreInfo | null;
  loading: boolean;
  updateStore: (name: string, address?: string, tin?: string, taxType?: 'VAT' | 'NON-VAT', vatRate?: number) => Promise<void>;
  getNextORNumber: () => Promise<string>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStore = async () => {
    try {
      const stores = await dbUtil.getItems<StoreInfo>(STORES.STORE_INFO);
      if (stores.length > 0) {
        setStore(stores[0]);
      }
    } catch (error) {
      console.error('Failed to load store info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  const updateStore = async (name: string, address: string = '', tin: string = '', taxType: 'VAT' | 'NON-VAT' = 'NON-VAT', vatRate: number = 12) => {
    const currentStore = await dbUtil.getItemById<StoreInfo>(STORES.STORE_INFO, 'main_config');
    const newStore: StoreInfo = {
      id: 'main_config',
      name,
      address,
      tin,
      currency: 'PHP',
      taxType,
      vatRate,
      lastORNumber: currentStore?.lastORNumber || 0,
      updatedAt: Date.now(),
    };
    await syncDb.update(STORES.STORE_INFO, newStore);
    await logAudit('STORE_SETTINGS_UPDATE', JSON.stringify({ name, taxType, tin }));
    await loadStore();
  };

  const getNextORNumber = async () => {
    const currentStore = store || (await dbUtil.getItemById<StoreInfo>(STORES.STORE_INFO, 'main_config'));
    const nextNum = (currentStore?.lastORNumber || 0) + 1;
    
    const updatedStore: StoreInfo = {
      ...(currentStore || {
        id: 'main_config',
        name: 'My Store',
        currency: 'PHP',
        taxType: 'NON-VAT',
        vatRate: 12,
      }),
      lastORNumber: nextNum,
      updatedAt: Date.now(),
    };
    
    await syncDb.update(STORES.STORE_INFO, updatedStore);
    await loadStore();
    
    return `OR-${nextNum.toString().padStart(6, '0')}`;
  };

  return (
    <StoreContext.Provider value={{ store, loading, updateStore, getNextORNumber }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
