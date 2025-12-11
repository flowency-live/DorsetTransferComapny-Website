'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { verifyToken } from '@/lib/services/corporateApi';

function VerifyContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('No login token provided');
      return;
    }

    const verify = async () => {
      try {
        const result = await verifyToken(token);

        if (result.success) {
          // Check if user needs to set password (first time login)
          if (result.needsPassword) {
            // Store user info in sessionStorage so set-password page can display it
            if (result.user) {
              sessionStorage.setItem('dtc_pending_user', JSON.stringify(result.user));
            }
            // Redirect to set-password page with the token
            router.push(`/corporate/set-password?token=${token}`);
            return;
          }

          setStatus('success');
          // Short delay to show success message, then redirect
          setTimeout(() => {
            router.push('/corporate/dashboard');
          }, 1500);
        } else {
          setStatus('error');
          setError(result.error || 'Failed to verify login link');
        }
      } catch {
        setStatus('error');
        setError('An error occurred while verifying your login link');
      }
    };

    verify();
  }, [searchParams, router]);

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto" />
          <p className="mt-4 text-sm text-gray-600">
            Verifying your login link...
          </p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Login successful!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Redirecting you to the dashboard...
          </p>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Login link invalid
        </h2>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
        <p className="mt-4 text-sm text-gray-500">
          This link may have expired or already been used. Please request a
          new login link.
        </p>
        <Link
          href="/corporate/login"
          className="mt-6 inline-block text-sm font-medium text-sage hover:text-sage-dark"
        >
          Request new login link
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <Header />

      {/* Main content with padding for fixed header */}
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Corporate Portal Badge */}
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-2 bg-sage/10 text-sage text-sm font-medium rounded-full">
                Corporate Travel Portal
              </span>
            </div>

            {/* Card */}
            <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CorporateVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
          <Header />
          <main className="flex-1 pt-24 pb-16">
            <div className="container mx-auto px-4">
              <div className="max-w-md mx-auto">
                <div className="text-center mb-8">
                  <span className="inline-block px-4 py-2 bg-sage/10 text-sage text-sm font-medium rounded-full">
                    Corporate Travel Portal
                  </span>
                </div>
                <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto" />
                    <p className="mt-4 text-sm text-gray-600">Loading...</p>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
