'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, Product, logAudit } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

export function useProducts(branchId?: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dbUtil.getItems<Product>(STORES.PRODUCTS);
      const activeProducts = data.filter(p => !p.isDeleted);
      
      let filtered = activeProducts;
      if (branchId) {
        filtered = activeProducts.filter(p => p.branchId === branchId);
      }
      
      setProducts(filtered.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await syncDb.add(STORES.PRODUCTS, newProduct);
    await logAudit('PRODUCT_ADD', JSON.stringify({ name: newProduct.name, id: newProduct.id }));
    await fetchProducts();
  };

  const addProducts = async (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = Date.now();
    const newProducts: Product[] = products.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    // Add all to sync queue and local DB
    for (const product of newProducts) {
      await syncDb.add(STORES.PRODUCTS, product);
    }
    
    await logAudit('PRODUCT_BULK_ADD', JSON.stringify({ count: newProducts.length }));
    await fetchProducts();
  };

  const updateProduct = async (product: Product) => {
    const updatedProduct = {
      ...product,
      updatedAt: Date.now(),
    };
    await syncDb.update(STORES.PRODUCTS, updatedProduct);
    await logAudit('PRODUCT_EDIT', JSON.stringify({ name: product.name, id: product.id }));
    await fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    await syncDb.delete(STORES.PRODUCTS, id);
    await logAudit('PRODUCT_DELETE', JSON.stringify({ id }));
    await fetchProducts();
  };

  return {
    products,
    loading,
    addProduct,
    addProducts,
    updateProduct,
    deleteProduct,
    refresh: fetchProducts,
  };
}
