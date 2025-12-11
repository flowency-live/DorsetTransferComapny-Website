'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/services/corporateApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [debugLink, setDebugLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setIsSubmitted(true);
        // For testing, show the magic link if provided
        if (result.magicLink) {
          setDebugLink(result.magicLink);
        }
      } else {
        setError(result.error || result.message || 'Failed to send reset link');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Dorset Transfer Company
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Corporate Travel Portal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Click the link in the email to reset your password. The link will expire in 15 minutes.
              </p>

              {/* Debug: Show magic link for testing */}
              {debugLink && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800 font-medium mb-2">
                    DEBUG: Password reset link (for testing only)
                  </p>
                  <a
                    href={debugLink}
                    className="text-xs text-blue-600 hover:text-blue-500 break-all"
                  >
                    {debugLink}
                  </a>
                </div>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                    setDebugLink(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Try a different email
                </button>
                <div>
                  <Link
                    href="/corporate/login"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          Dorset Transfer Company
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Corporate Travel Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h2 className="text-center text-xl font-semibold text-gray-900 mb-2">
            Reset your password
          </h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/corporate/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Back to login
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to main site
          </Link>
        </div>
      </div>
    </div>
  );
}
