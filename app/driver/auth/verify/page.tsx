'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { verifyMagicLink } from '@/lib/services/driverApi';

function VerifyContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('Invalid or missing login link');
        return;
      }

      try {
        const result = await verifyMagicLink(token);

        if (result.success) {
          setStatus('success');
          // Redirect to dashboard after brief delay
          setTimeout(() => {
            router.push('/driver/dashboard');
          }, 1500);
        } else {
          setStatus('error');
          setError(result.error || result.message || 'Invalid or expired login link');
        }
      } catch {
        setStatus('error');
        setError('Failed to verify login link. Please try again.');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Driver Portal Badge */}
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-2 bg-sage/10 text-sage text-sm font-medium rounded-full">
                Driver Portal
              </span>
            </div>

            {/* Card */}
            <div className="bg-white py-8 px-6 shadow-lg rounded-lg text-center">
              {status === 'loading' && (
                <>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto mb-4"></div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your login...</h2>
                  <p className="text-gray-600">Please wait while we verify your login link.</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Login successful!</h2>
                  <p className="text-gray-600">Redirecting you to your dashboard...</p>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Login failed</h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Link
                    href="/driver/login"
                    className="inline-block px-4 py-2 bg-sage text-white rounded-md hover:bg-sage-dark transition-colors"
                  >
                    Back to login
                  </Link>
                </>
              )}
            </div>

            {/* Back to main site */}
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                &larr; Back to main site
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function DriverVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
        <Header />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
