'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/db/idb';
import { useAuth } from '@/lib/contexts/auth-context';
import { userService } from '@/lib/services/user-service';
import { auditService } from '@/lib/services/audit-service';

export function useUsers() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!currentUser || !isAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const businessUsers = await userService.getByBusiness(currentUser.businessId);
      // Remove passwordHash from the results
      const safeUsers = businessUsers.map(({ passwordHash, ...u }) => u);
      
      setUsers(safeUsers.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserBranches = async (userId: string, branchIds: string[]) => {
    if (!isAdmin) return;

    try {
      const userData = await userService.getById(userId);
      if (!userData) throw new Error('User not found');

      const updatedUser: User = {
        ...userData,
        assignedBranchIds: branchIds,
        updatedAt: Date.now(),
      };

      await userService.update(updatedUser);
      await auditService.log('USER_BRANCH_ASSIGNMENT', `Updated branch assignments for ${userData.email}`);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user branches:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin || userId === currentUser?.id) return;

    try {
      await userService.delete(userId);
      await auditService.log('USER_DELETED', `Deleted user with ID ${userId}`);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    updateUserBranches,
    deleteUser,
    refresh: fetchUsers,
  };
}
