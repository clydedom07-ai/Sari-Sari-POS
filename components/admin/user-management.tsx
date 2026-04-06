'use client';

import { useState } from 'react';
import { useUsers } from '@/lib/hooks/use-users';
import { useBranches } from '@/lib/hooks/use-branches';
import { User, Shield, Trash2, CheckCircle2, XCircle, Loader2, UserPlus, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '@/components/ui/modal';

export function UserManagement() {
  const { users, loading, updateUserBranches, deleteUser } = useUsers();
  const { branches } = useBranches();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleToggleBranch = async (userId: string, branchId: string, currentAssignments: string[]) => {
    const newAssignments = currentAssignments.includes(branchId)
      ? currentAssignments.filter(id => id !== branchId)
      : [...currentAssignments, branchId];
    
    await updateUserBranches(userId, newAssignments);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">User Management</h3>
          <p className="text-sm text-gray-500 font-medium">Manage staff accounts and their branch assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {users.map((user) => (
          <motion.div
            key={user.id}
            layout
            className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl ${
                  user.role === 'admin' ? 'bg-indigo-600' : 'bg-orange-600'
                }`}>
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-xl font-black text-gray-900 tracking-tight">{user.email}</h4>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex-1 lg:max-w-md">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  Assigned Branches
                </p>
                {user.role === 'admin' ? (
                  <div className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Full Access to All Branches
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {branches.map((branch) => {
                      const isAssigned = user.assignedBranchIds.includes(branch.id);
                      return (
                        <button
                          key={branch.id}
                          onClick={() => handleToggleBranch(user.id, branch.id, user.assignedBranchIds)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            isAssigned
                              ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-100'
                              : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {branch.name}
                        </button>
                      );
                    })}
                    {branches.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No branches available.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirmId(user.id)}
                  className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all group/btn"
                >
                  <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {users.length === 0 && (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-gray-200">
            <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-300">
              <UserPlus className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No staff members yet</h3>
            <p className="text-gray-500 font-medium">New users will appear here after they sign up.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await deleteUser(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        variant="danger"
        confirmText="Delete User"
      />
    </div>
  );
}
