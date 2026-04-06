'use client';

import { useState, useEffect, useCallback } from 'react';
import { dbUtil, STORES, Branch } from '@/lib/db/idb';
import { syncDb } from '@/lib/db/sync-queue';

const CURRENT_BRANCH_KEY = 'sarisari_current_branch_id';

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dbUtil.getItems<Branch>(STORES.BRANCHES);
      const activeBranches = data.filter(b => !b.isDeleted);
      setBranches(activeBranches.sort((a, b) => b.createdAt - a.createdAt));
      
      // Initialize current branch if not set or if current one is deleted
      const savedId = localStorage.getItem(CURRENT_BRANCH_KEY);
      if (activeBranches.length > 0) {
        if (!savedId || !activeBranches.find(b => b.id === savedId)) {
          const defaultId = activeBranches[0].id;
          setCurrentBranchId(defaultId);
          localStorage.setItem(CURRENT_BRANCH_KEY, defaultId);
        } else {
          setCurrentBranchId(savedId);
        }
      } else {
        setCurrentBranchId(null);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const addBranch = async (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newBranch: Branch = {
      ...branch,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await syncDb.add(STORES.BRANCHES, newBranch);
    await fetchBranches();
    return newBranch;
  };

  const updateBranch = async (branch: Branch) => {
    const updatedBranch = {
      ...branch,
      updatedAt: Date.now(),
    };
    await syncDb.update(STORES.BRANCHES, updatedBranch);
    await fetchBranches();
  };

  const deleteBranch = async (id: string) => {
    await syncDb.delete(STORES.BRANCHES, id);
    await fetchBranches();
  };

  const selectBranch = (id: string) => {
    setCurrentBranchId(id);
    localStorage.setItem(CURRENT_BRANCH_KEY, id);
  };

  const currentBranch = branches.find(b => b.id === currentBranchId);

  return {
    branches,
    currentBranchId,
    currentBranch,
    loading,
    addBranch,
    updateBranch,
    deleteBranch,
    selectBranch,
    refresh: fetchBranches,
  };
}
