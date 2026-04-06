'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, Supplier, RestockTransaction, RestockItem, Product } from '@/lib/db/idb';
import { useBranches } from './use-branches';

export function useRestocking() {
  const { currentBranch } = useBranches();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restockHistory, setRestockHistory] = useState<RestockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentBranch) return;
    setLoading(true);
    try {
      const [allSuppliers, allRestocks] = await Promise.all([
        dbUtil.getItems<Supplier>(STORES.SUPPLIERS),
        dbUtil.getItems<RestockTransaction>(STORES.RESTOCK_TRANSACTIONS)
      ]);

      setSuppliers(allSuppliers.filter(s => s.branchId === currentBranch.id && !s.isDeleted));
      setRestockHistory(
        allRestocks
          .filter(r => r.branchId === currentBranch.id && !r.isDeleted)
          .sort((a, b) => b.timestamp - a.timestamp)
      );
    } catch (error) {
      console.error('Error fetching restocking data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'branchId' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
    if (!currentBranch) return;
    const newSupplier: Supplier = {
      ...supplierData,
      id: crypto.randomUUID(),
      branchId: currentBranch.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false
    };
    await dbUtil.addItem(STORES.SUPPLIERS, newSupplier);
    await fetchData();
  };

  const updateSupplier = async (supplier: Supplier) => {
    const updatedSupplier = { ...supplier, updatedAt: Date.now() };
    await dbUtil.updateItem(STORES.SUPPLIERS, updatedSupplier);
    await fetchData();
  };

  const deleteSupplier = async (id: string) => {
    const supplier = await dbUtil.getItemById<Supplier>(STORES.SUPPLIERS, id);
    if (supplier) {
      await dbUtil.updateItem(STORES.SUPPLIERS, { ...supplier, isDeleted: true, updatedAt: Date.now() });
      await fetchData();
    }
  };

  const recordRestock = async (
    supplierId: string, 
    items: RestockItem[], 
    totalCost: number, 
    referenceNumber?: string, 
    notes?: string
  ) => {
    if (!currentBranch) return;

    const restockTx: RestockTransaction = {
      id: crypto.randomUUID(),
      supplierId,
      items,
      totalCost,
      timestamp: Date.now(),
      branchId: currentBranch.id,
      referenceNumber,
      notes,
      updatedAt: Date.now(),
      isDeleted: false
    };

    // 1. Save restock transaction
    await dbUtil.addItem(STORES.RESTOCK_TRANSACTIONS, restockTx);

    // 2. Update product stocks
    for (const item of items) {
      const product = await dbUtil.getItemById<Product>(STORES.PRODUCTS, item.productId);
      if (product) {
        const updatedProduct = {
          ...product,
          stock: product.stock + item.quantity,
          updatedAt: Date.now()
        };
        await dbUtil.updateItem(STORES.PRODUCTS, updatedProduct);
      }
    }

    await fetchData();
  };

  return {
    suppliers,
    restockHistory,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    recordRestock,
    refresh: fetchData
  };
}
