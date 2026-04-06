'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, Customer, CreditEntry } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

export function useCustomers(branchId?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dbUtil.getItems<Customer>(STORES.CUSTOMERS);
      let filtered = data.filter(c => !c.isDeleted);
      if (branchId) {
        filtered = filtered.filter(c => c.branchId === branchId);
      }
      setCustomers(filtered.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalUtang' | 'branchId'>) => {
    if (!branchId) throw new Error('Branch ID is required to add a customer');
    const now = Date.now();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      totalUtang: 0,
      branchId,
      createdAt: now,
      updatedAt: now,
    };
    await syncDb.add(STORES.CUSTOMERS, newCustomer);
    await fetchCustomers();
  };

  const updateCustomer = async (customer: Customer) => {
    const updatedCustomer = {
      ...customer,
      updatedAt: Date.now(),
    };
    await syncDb.update(STORES.CUSTOMERS, updatedCustomer);
    await fetchCustomers();
  };

  const deleteCustomer = async (id: string) => {
    await syncDb.delete(STORES.CUSTOMERS, id);
    await fetchCustomers();
  };

  const recordCredit = async (customerId: string, amount: number, description: string, type: 'credit' | 'payment') => {
    if (!branchId) throw new Error('Branch ID is required to record credit');
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const now = Date.now();
    const entry: CreditEntry = {
      id: crypto.randomUUID(),
      customerId,
      branchId,
      amount: type === 'credit' ? amount : -amount,
      type,
      description,
      timestamp: now,
      updatedAt: now,
    };

    await syncDb.add(STORES.CREDIT_LOG, entry);
    
    const updatedCustomer = {
      ...customer,
      totalUtang: customer.totalUtang + entry.amount,
      updatedAt: now,
    };
    
    await syncDb.update(STORES.CUSTOMERS, updatedCustomer);
    await fetchCustomers();
  };

  const getCreditHistory = async (customerId: string) => {
    const allEntries = await dbUtil.getItems<CreditEntry>(STORES.CREDIT_LOG);
    return allEntries
      .filter(e => e.customerId === customerId)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordCredit,
    getCreditHistory,
    refresh: fetchCustomers,
  };
}
