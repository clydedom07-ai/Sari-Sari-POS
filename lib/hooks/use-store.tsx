'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoreInfo, Product } from '@/lib/db/idb';
import { storeService } from '@/lib/services/store-service';
import { productService } from '@/lib/services/product-service';
import { auditService } from '@/lib/services/audit-service';

interface StoreContextType {
  store: StoreInfo | null;
  loading: boolean;
  updateStore: (name: string, address?: string, tin?: string, taxType?: 'VAT' | 'NON-VAT', vatRate?: number) => Promise<void>;
  getNextORNumber: () => Promise<string>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => Promise<Product>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStore = async () => {
    try {
      const currentStore = await storeService.getStore();
      if (currentStore) {
        setStore(currentStore);
      }
      const allProducts = await productService.getAll();
      setProducts(allProducts.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load store info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newProduct: Product = {
      ...product,
      id,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await productService.create(newProduct);
    await auditService.log('PRODUCT_ADD', JSON.stringify({ name: product.name, id }));
    await loadStore();
    return newProduct;
  };

  const updateStore = async (name: string, address: string = '', tin: string = '', taxType: 'VAT' | 'NON-VAT' = 'NON-VAT', vatRate: number = 12) => {
    const currentStore = await storeService.getById('main_config');
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
    await storeService.update(newStore);
    await auditService.log('STORE_SETTINGS_UPDATE', JSON.stringify({ name, taxType, tin }));
    await loadStore();
  };

  const getNextORNumber = async () => {
    const currentStore = store || (await storeService.getById('main_config'));
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
    
    await storeService.update(updatedStore);
    await loadStore();
    
    return `OR-${nextNum.toString().padStart(6, '0')}`;
  };

  return (
    <StoreContext.Provider value={{ store, loading, updateStore, getNextORNumber, products, addProduct }}>
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
