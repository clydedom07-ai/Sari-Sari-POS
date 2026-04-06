'use client';

import { useStore } from '@/lib/hooks/use-store';
import { useAuth } from '@/lib/contexts/auth-context';
import { Store, Clock, UserCircle, ChevronDown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BranchSelector } from './branch-selector';
import { BranchManagement } from '../branches/branch-management';
import { useState } from 'react';

export function Header({ ticketNumber }: { ticketNumber?: string }) {
  const { store } = useStore();
  const { user, logout } = useAuth();
  const [isManagingBranches, setIsManagingBranches] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="border-b bg-white/80 backdrop-blur-md px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        <div className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-200">
          <Store className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-black text-xl md:text-2xl tracking-tight text-gray-900 leading-tight">
            {store?.name || 'Sari-Sari POS'}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {ticketNumber && (
              <div className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                <span className="w-1 h-1 bg-orange-600 rounded-full" />
                Ticket: {ticketNumber}
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      <div className="flex items-center gap-4">
        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all group"
          >
            <div className={`p-1.5 rounded-lg ${user?.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
              <UserCircle className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">{user?.role}</p>
              <p className="text-xs font-bold text-gray-900 uppercase tracking-tight truncate max-w-[100px]">{user?.email}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-gray-50 mb-1">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Logged in as</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-red-50 text-red-600"
                  >
                    <div className="p-1.5 rounded-lg bg-red-100">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm">Logout</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <BranchSelector onManageBranches={() => setIsManagingBranches(true)} />
        
        <div className="hidden lg:flex flex-col text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
            Current Date
          </p>
          <p className="text-sm font-bold text-gray-900">
            {new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isManagingBranches && (
          <BranchManagement onClose={() => setIsManagingBranches(false)} />
        )}
      </AnimatePresence>
    </header>
  );
}
