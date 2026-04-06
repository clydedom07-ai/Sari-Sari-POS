'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, Transaction, Product } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

export function useTransactions(branchId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dbUtil.getItems<Transaction>(STORES.TRANSACTIONS);
      const activeTransactions = data.filter(t => !t.isDeleted);
      
      let filtered = activeTransactions;
      if (branchId) {
        filtered = activeTransactions.filter(t => t.branchId === branchId);
      }
      
      setTransactions(filtered.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'updatedAt'>) => {
    const now = Date.now();
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      updatedAt: now,
    };
    await syncDb.add(STORES.TRANSACTIONS, newTransaction);
    
    // Update last ticket number in metadata for fast sequential generation
    try {
      await dbUtil.updateItem(STORES.METADATA as any, { 
        key: 'last_ticket_number', 
        value: newTransaction.ticketNumber,
        updatedAt: now 
      });
    } catch (e) {
      console.error('Failed to update ticket metadata:', e);
    }

    await fetchTransactions();
    return newTransaction;
  };

  const getNextTicketNumber = useCallback(async () => {
    try {
      // 1. Try to get from metadata for speed
      const lastTicketMeta = await dbUtil.getItemById<{key: string, value: string}>(STORES.METADATA as any, 'last_ticket_number');
      
      let lastTicket = lastTicketMeta?.value;

      // 2. Fallback to scanning transactions if metadata is missing (e.g. first time or after clear)
      if (!lastTicket) {
        const data = await dbUtil.getItems<Transaction>(STORES.TRANSACTIONS);
        const activeTransactions = data.filter(t => !t.isDeleted);
        
        if (activeTransactions.length > 0) {
          const sorted = [...activeTransactions].sort((a, b) => b.timestamp - a.timestamp);
          lastTicket = sorted[0].ticketNumber;
        }
      }
      
      if (!lastTicket) {
        return 'T-0001';
      }
      
      const match = lastTicket.match(/T-(\d+)/);
      if (!match) return 'T-0001';
      
      const nextNum = parseInt(match[1], 10) + 1;
      return `T-${nextNum.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Failed to generate next ticket number:', error);
      return 'T-0001';
    }
  }, []);

  return {
    transactions,
    loading,
    addTransaction,
    getNextTicketNumber,
    refresh: fetchTransactions,
  };
}
