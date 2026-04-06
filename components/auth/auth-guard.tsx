'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login' && pathname !== '/signup') {
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/signup')) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  // Allow access to login and signup pages even if not logged in
  if (!user && (pathname === '/login' || pathname === '/signup')) {
    return <>{children}</>;
  }

  // If not logged in and not on login/signup, don't render children (will redirect)
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
