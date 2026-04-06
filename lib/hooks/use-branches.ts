'use client';

import { useState, useEffect, useCallback } from 'react';
import { Branch } from '@/lib/db/idb';
import { branchService } from '@/lib/services/branch-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { useStore } from '@/lib/hooks/use-store';

const CURRENT_BRANCH_KEY = 'sarisari_current_branch_id';

export function useBranches() {
  const { user, isAdmin } = useAuth();
  const { store } = useStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      let activeBranches: Branch[];
      if (store) {
        activeBranches = await branchService.getByBusiness(store.id);
      } else {
        activeBranches = await branchService.getAll();
      }
      
      // Filter by user assignments if not admin
      if (user && !isAdmin) {
        activeBranches = activeBranches.filter(b => user.assignedBranchIds.includes(b.id));
      }

      setBranches(activeBranches.sort((a, b) => b.createdAt - a.createdAt));
      
      // Initialize current branch if not set or if current one is deleted/restricted
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
  }, [user, isAdmin, store]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const addBranch = async (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt' | 'businessId' | 'isDeleted'>) => {
    const businessId = store?.id || 'main_config';
    const id = crypto.randomUUID();
    const now = Date.now();
    const newBranch: Branch = {
      ...branch,
      id,
      businessId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await branchService.create(newBranch);
    await fetchBranches();
    return newBranch;
  };

  const updateBranch = async (branch: Branch) => {
    await branchService.update(branch);
    await fetchBranches();
  };

  const deleteBranch = async (id: string) => {
    await branchService.delete(id);
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
