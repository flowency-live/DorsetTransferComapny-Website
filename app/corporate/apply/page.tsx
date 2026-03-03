'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, User, Mail, Phone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

interface FormData {
  companyName: string;
  companyNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function CorporateApplyPage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    companyNumber: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateApply}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          companyNumber: formData.companyNumber.trim() || undefined,
          contactName: formData.contactName.trim(),
          contactEmail: formData.contactEmail.trim().toLowerCase(),
          contactPhone: formData.contactPhone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || data.message || 'Failed to submit application. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('An error occurred. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
        <Header />
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <div className="bg-white py-12 px-6 shadow-lg rounded-lg text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Application Submitted
                </h2>
                <p className="text-gray-600 mb-6">
                  Thank you for applying for a corporate account. Our team will review your application and be in touch soon.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  You&apos;ll receive an email once your account has been approved with instructions to set up your login.
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-sage text-white rounded-md font-medium hover:bg-sage-dark transition-colors"
                >
                  Return to Homepage
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            {/* Corporate Portal Badge */}
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-2 bg-sage/10 text-sage text-sm font-medium rounded-full">
                Corporate Travel Portal
              </span>
            </div>

            {/* Card */}
            <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-sage" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Apply for a Corporate Account
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Streamline your business travel with dedicated account management and corporate rates.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Company Name */}
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sage focus:border-sage sm:text-sm"
                      placeholder="Acme Ltd"
                    />
                  </div>
                </div>

                {/* Companies House Number */}
                <div>
                  <label htmlFor="companyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Companies House Number <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="companyNumber"
                    name="companyNumber"
                    value={formData.companyNumber}
                    onChange={handleChange}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sage focus:border-sage sm:text-sm"
                    placeholder="e.g., 12345678"
                    maxLength={8}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    UK registered company number for verification
                  </p>
                </div>

                <hr className="my-6 border-gray-200" />

                {/* Contact Name */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="contactName"
                      name="contactName"
                      required
                      value={formData.contactName}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sage focus:border-sage sm:text-sm"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                {/* Contact Email */}
                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="contactEmail"
                      name="contactEmail"
                      required
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sage focus:border-sage sm:text-sm"
                      placeholder="john@acme.com"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="contactPhone"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sage focus:border-sage sm:text-sm"
                      placeholder="+44 7700 900000"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {status === 'error' && (
                  <div className="rounded-md bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sage hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </form>

              {/* Benefits */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Corporate Account Benefits</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-sage flex-shrink-0" />
                    Preferential corporate rates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-sage flex-shrink-0" />
                    Invoice billing with flexible payment terms
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-sage flex-shrink-0" />
                    Manage team members and bookings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-sage flex-shrink-0" />
                    Dedicated account support
                  </li>
                </ul>
              </div>
            </div>

            {/* Already have an account */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/corporate/login" className="font-medium text-sage hover:text-sage-dark">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Back to main site */}
            <div className="mt-4 text-center">
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
