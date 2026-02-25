'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  createPassenger,
  type CreatePassengerData,
} from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';

const VALID_TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Lord', 'Lady', 'Sir', 'Dame'] as const;

interface RefreshmentsState {
  stillWater: boolean;
  sparklingWater: boolean;
  tea: boolean;
  coffee: boolean;
  other: string;
}

export default function NewPassengerPage() {
  const { user } = useRequireCorporateAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    alias: '',
    referToAs: '',
    email: '',
    phone: '',
    driverInstructions: '',
    bookerNotes: '',
  });

  const [refreshments, setRefreshments] = useState<RefreshmentsState>({
    stillWater: false,
    sparklingWater: false,
    tea: false,
    coffee: false,
    other: '',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleRefreshmentChange = (field: keyof RefreshmentsState, value: boolean | string) => {
    setRefreshments((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const passengerData: CreatePassengerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };

      // Only include optional fields if they have values
      if (formData.title) passengerData.title = formData.title as typeof VALID_TITLES[number];
      if (formData.alias.trim()) passengerData.alias = formData.alias.trim();
      if (formData.referToAs.trim()) passengerData.referToAs = formData.referToAs.trim();
      if (formData.email.trim()) passengerData.email = formData.email.trim();
      if (formData.phone.trim()) passengerData.phone = formData.phone.trim();
      if (formData.driverInstructions.trim()) passengerData.driverInstructions = formData.driverInstructions.trim();
      if (formData.bookerNotes.trim()) passengerData.bookerNotes = formData.bookerNotes.trim();

      // Build refreshments object if any are selected
      const hasRefreshments = refreshments.stillWater || refreshments.sparklingWater ||
                              refreshments.tea || refreshments.coffee || refreshments.other.trim();
      if (hasRefreshments) {
        passengerData.refreshments = {
          stillWater: refreshments.stillWater,
          sparklingWater: refreshments.sparklingWater,
          tea: refreshments.tea,
          coffee: refreshments.coffee,
          other: refreshments.other.trim() || undefined,
        };
      }

      await createPassenger(passengerData);
      showToast('Passenger added successfully');

      // Redirect to passenger list after short delay
      setTimeout(() => {
        router.push('/corporate/passengers');
      }, 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add passenger', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CorporateLayout pageTitle="Add Passenger">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <Link
            href="/corporate/passengers"
            className="inline-flex items-center text-sm opacity-70 hover:opacity-100 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Passengers
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 corp-action-icon-sage rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Add New Passenger</h1>
              <p className="corp-page-subtitle mt-0.5">
                Save passenger details for quick bookings
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Identity Section */}
          <div className="corp-card rounded-lg p-6 mb-6">
            <h2 className="corp-section-title text-lg font-semibold mb-4">Passenger Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-1">
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Title
                </label>
                <select
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="corp-input w-full px-3 py-2 rounded-lg"
                >
                  <option value="">Select...</option>
                  {VALID_TITLES.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              {/* Empty space for alignment */}
              <div className="hidden sm:block" />

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={`corp-input w-full px-3 py-2 rounded-lg ${
                    errors.firstName ? 'border-red-500' : ''
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={`corp-input w-full px-3 py-2 rounded-lg ${
                    errors.lastName ? 'border-red-500' : ''
                  }`}
                  placeholder="Smith"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                )}
              </div>

              {/* Alias */}
              <div>
                <label htmlFor="alias" className="block text-sm font-medium mb-1">
                  Alias / Nickname
                </label>
                <input
                  type="text"
                  id="alias"
                  value={formData.alias}
                  onChange={(e) => handleChange('alias', e.target.value)}
                  className="corp-input w-full px-3 py-2 rounded-lg"
                  placeholder="Johnny"
                />
                <p className="mt-1 text-xs opacity-50">Visible to driver if set</p>
              </div>

              {/* Refer To As */}
              <div>
                <label htmlFor="referToAs" className="block text-sm font-medium mb-1">
                  Refer To As
                </label>
                <input
                  type="text"
                  id="referToAs"
                  value={formData.referToAs}
                  onChange={(e) => handleChange('referToAs', e.target.value)}
                  className="corp-input w-full px-3 py-2 rounded-lg"
                  placeholder="Dr Smith"
                />
                <p className="mt-1 text-xs opacity-50">How the driver should address them</p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="corp-card rounded-lg p-6 mb-6">
            <h2 className="corp-section-title text-lg font-semibold mb-4">Contact Information</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`corp-input w-full px-3 py-2 rounded-lg ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  placeholder="john.smith@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="corp-input w-full px-3 py-2 rounded-lg"
                  placeholder="+44 7700 900000"
                />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="corp-card rounded-lg p-6 mb-6">
            <h2 className="corp-section-title text-lg font-semibold mb-4">Preferences</h2>

            {/* Refreshments */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Refreshment Preferences
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'stillWater', label: 'Still Water' },
                  { key: 'sparklingWater', label: 'Sparkling Water' },
                  { key: 'tea', label: 'Tea' },
                  { key: 'coffee', label: 'Coffee' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`corp-checkbox-card flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                      refreshments[key as keyof RefreshmentsState]
                        ? 'corp-checkbox-card-selected'
                        : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={refreshments[key as keyof RefreshmentsState] as boolean}
                      onChange={(e) => handleRefreshmentChange(key as keyof RefreshmentsState, e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={refreshments.other}
                  onChange={(e) => handleRefreshmentChange('other', e.target.value)}
                  className="corp-input w-full px-3 py-2 rounded-lg"
                  placeholder="Other refreshment preferences..."
                />
              </div>
            </div>

            {/* Driver Instructions */}
            <div className="mb-4">
              <label htmlFor="driverInstructions" className="block text-sm font-medium mb-1">
                Driver Instructions
              </label>
              <textarea
                id="driverInstructions"
                value={formData.driverInstructions}
                onChange={(e) => handleChange('driverInstructions', e.target.value)}
                rows={3}
                maxLength={500}
                className="corp-input w-full px-3 py-2 rounded-lg"
                placeholder="E.g., Prefers quiet journeys, uses wheelchair..."
              />
              <p className="mt-1 text-xs opacity-50">
                {formData.driverInstructions.length}/500 characters - Visible to driver
              </p>
            </div>

            {/* Booker Notes */}
            <div>
              <label htmlFor="bookerNotes" className="block text-sm font-medium mb-1">
                Booker Notes
              </label>
              <textarea
                id="bookerNotes"
                value={formData.bookerNotes}
                onChange={(e) => handleChange('bookerNotes', e.target.value)}
                rows={3}
                maxLength={500}
                className="corp-input w-full px-3 py-2 rounded-lg"
                placeholder="Internal notes for bookers..."
              />
              <p className="mt-1 text-xs opacity-50">
                {formData.bookerNotes.length}/500 characters - Only visible to bookers
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <Link
              href="/corporate/passengers"
              className="corp-btn corp-btn-secondary px-6 py-2 rounded-full text-sm font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="corp-btn corp-btn-primary px-6 py-2 rounded-full text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Passenger'}
            </button>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toast?.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-sage text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </CorporateLayout>
  );
}
