'use client';

import { useState } from 'react';
import { Car, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import Header from '@/components/shared/Header';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

// The licensing authority for this tenant's operator license
const OPERATOR_LICENSING_AUTHORITY = 'Bournemouth, Christchurch and Poole Council';
const OPERATOR_LICENSING_AUTHORITY_CODE = 'bournemouth-christchurch-poole';

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; applicationId: string }
  | { status: 'error'; message: string };

const YEARS_EXPERIENCE_OPTIONS = [
  { value: '<1', label: 'Less than 1 year' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10+', label: '10+ years' },
];

export default function DriverApplyPage() {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hasPhvLicense, setHasPhvLicense] = useState(false);
  const [hasPhvVehicle, setHasPhvVehicle] = useState<boolean | null>(null);
  const [yearsExperience, setYearsExperience] = useState('');
  const [consentToContact, setConsentToContact] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPhvLicense || hasPhvVehicle === null || !yearsExperience || !consentToContact) {
      setFormState({ status: 'error', message: 'Please complete all required fields' });
      return;
    }

    setFormState({ status: 'submitting' });

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverApply}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          hasPhvLicense,
          licensingAuthority: OPERATOR_LICENSING_AUTHORITY_CODE,
          hasPhvVehicle,
          yearsExperience,
          consentToContact,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Failed to submit application');
      }

      setFormState({ status: 'success', applicationId: data.applicationId });
    } catch (error) {
      setFormState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit application'
      });
    }
  };

  if (formState.status === 'success') {
    return (
      <div className="min-h-screen bg-background pt-20">
        <Header />
        <main className="py-12 md:py-20">
          <div className="container px-4 mx-auto max-w-lg">
            <div className="bg-card rounded-3xl shadow-xl overflow-hidden border-2 border-sage-light p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">
                Application Submitted
              </h1>
              <p className="text-muted-foreground mb-6">
                Thank you for your interest in driving with us. We&apos;ve received your application
                and will be in touch soon.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Reference: {formState.applicationId}
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-sage-dark text-white rounded-xl font-semibold hover:bg-sage-dark/90 transition-all"
              >
                Return Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />

      <main className="py-12 md:py-20">
        <div className="container px-4 mx-auto max-w-2xl">
          <div className="bg-card rounded-3xl shadow-xl overflow-hidden border-2 border-amber-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                <Car className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Apply to Drive
              </h1>
              <p className="text-amber-200 text-sm">
                Join The Dorset Transfer Company team
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formState.status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{formState.message}</p>
                </div>
              )}

              {/* Personal Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">
                      First Name *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      maxLength={50}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">
                      Last Name *
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      maxLength={50}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+44 or 07..."
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">UK mobile number</p>
                </div>
              </div>

              {/* License Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-lg font-semibold text-foreground">License Details</h2>

                <div className="flex items-start gap-3">
                  <input
                    id="hasPhvLicense"
                    type="checkbox"
                    checked={hasPhvLicense}
                    onChange={(e) => setHasPhvLicense(e.target.checked)}
                    className="mt-1 w-5 h-5 text-amber-600 border-border rounded focus:ring-amber-500"
                  />
                  <label htmlFor="hasPhvLicense" className="text-sm text-foreground">
                    I hold a valid PHV (Private Hire Vehicle) driver license from <span className="font-medium">{OPERATOR_LICENSING_AUTHORITY}</span> *
                  </label>
                </div>

                <p className="text-xs text-muted-foreground">
                  To drive with us, you must hold a PHV driver license issued by {OPERATOR_LICENSING_AUTHORITY}.
                </p>
              </div>

              {/* Experience */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-lg font-semibold text-foreground">Experience</h2>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Do you have a licensed PHV vehicle? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="hasPhvVehicle"
                        checked={hasPhvVehicle === true}
                        onChange={() => setHasPhvVehicle(true)}
                        className="w-5 h-5 text-amber-600 border-border focus:ring-amber-500"
                      />
                      <span className="text-foreground">Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="hasPhvVehicle"
                        checked={hasPhvVehicle === false}
                        onChange={() => setHasPhvVehicle(false)}
                        className="w-5 h-5 text-amber-600 border-border focus:ring-amber-500"
                      />
                      <span className="text-foreground">No</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="yearsExperience" className="block text-sm font-medium text-foreground mb-1">
                    Years of driving experience *
                  </label>
                  <select
                    id="yearsExperience"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select...</option>
                    {YEARS_EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Consent */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-start gap-3">
                  <input
                    id="consentToContact"
                    type="checkbox"
                    checked={consentToContact}
                    onChange={(e) => setConsentToContact(e.target.checked)}
                    className="mt-1 w-5 h-5 text-amber-600 border-border rounded focus:ring-amber-500"
                  />
                  <label htmlFor="consentToContact" className="text-sm text-foreground">
                    I consent to being contacted about driving opportunities with The Dorset Transfer Company *
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={formState.status === 'submitting'}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState.status === 'submitting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
