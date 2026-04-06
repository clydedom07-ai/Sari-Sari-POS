'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'cashier';

interface AuthContextType {
  role: UserRole;
  switchRole: (role: UserRole) => void;
  isAdmin: boolean;
  isCashier: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const savedRole = localStorage.getItem('user-role') as UserRole;
      if (savedRole && (savedRole === 'admin' || savedRole === 'cashier')) {
        setRole(savedRole);
      }
      setLoading(false);
    };
    
    initAuth();
  }, []);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('user-role', newRole);
  };

  const value = {
    role,
    switchRole,
    isAdmin: role === 'admin',
    isCashier: role === 'cashier',
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
