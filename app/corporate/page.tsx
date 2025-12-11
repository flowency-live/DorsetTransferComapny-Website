'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken, verifySession } from '@/lib/services/corporateApi';

export default function CorporateIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();

      if (!token) {
        router.replace('/corporate/login');
        return;
      }

      const result = await verifySession();
      if (result.valid) {
        router.replace('/corporate/dashboard');
      } else {
        router.replace('/corporate/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
