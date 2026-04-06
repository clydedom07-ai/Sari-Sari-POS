'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, EWalletTransaction, logAudit } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

export function useEWallet(branchId?: string) {
  const [transactions, setTransactions] = useState<EWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dbUtil.getItems<EWalletTransaction>(STORES.EWALLET_TRANSACTIONS);
      const activeTransactions = data.filter(t => !t.isDeleted);
      
      let filtered = activeTransactions;
      if (branchId) {
        filtered = activeTransactions.filter(t => t.branchId === branchId);
      }
      
      setTransactions(filtered.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to fetch e-wallet transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (transaction: Omit<EWalletTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newTransaction: EWalletTransaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await syncDb.add(STORES.EWALLET_TRANSACTIONS, newTransaction);
    await logAudit('EWALLET_TRANSACTION', JSON.stringify({ 
      type: transaction.type, 
      amount: transaction.amount, 
      service: transaction.serviceType,
      reference: transaction.referenceNumber 
    }));
    await fetchTransactions();
    return newTransaction;
  };

  const getStats = useCallback(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'cash_in') {
        acc.totalCashIn += t.amount;
      } else {
        acc.totalCashOut += t.amount;
      }
      acc.totalFees += t.fee || 0;
      return acc;
    }, { totalCashIn: 0, totalCashOut: 0, totalFees: 0 });
  }, [transactions]);

  return {
    transactions,
    loading,
    addTransaction,
    getStats,
    refresh: fetchTransactions,
  };
}
