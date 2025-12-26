'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  verifySession,
  logout as apiLogout,
} from '@/lib/services/corporateApi';

interface CorporateUser {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  companyName: string;
  corpAccountId: string;
}

interface UseCorporateAuthReturn {
  user: CorporateUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export function useCorporateAuth(): UseCorporateAuthReturn {
  const [user, setUser] = useState<CorporateUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async (): Promise<boolean> => {
    // Cookie-based auth - just verify session, cookie sent automatically
    try {
      const result = await verifySession();

      if (result.valid && result.user) {
        setUser(result.user);
        setIsLoading(false);
        return true;
      } else {
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch {
      setUser(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push('/corporate/login');
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    logout,
    checkAuth,
  };
}

/**
 * Hook that redirects to login if not authenticated
 */
export function useRequireCorporateAuth(): UseCorporateAuthReturn {
  const auth = useCorporateAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.push('/corporate/login');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  return auth;
}
