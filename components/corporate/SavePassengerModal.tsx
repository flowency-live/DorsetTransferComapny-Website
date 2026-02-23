'use client';

import { useState, useEffect } from 'react';
import { X, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { createPassenger, type CreatePassengerData, type Passenger } from '@/lib/services/corporateApi';

interface SavePassengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (passenger: Passenger) => void;
  initialData?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

const VALID_TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Lord', 'Lady', 'Sir', 'Dame'] as const;

export default function SavePassengerModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
}: SavePassengerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Parse initial name if provided
  useEffect(() => {
    if (initialData?.name) {
      const parts = initialData.name.trim().split(' ');
      if (parts.length >= 2) {
        // Check if first part is a title
        const possibleTitle = parts[0];
        if (VALID_TITLES.includes(possibleTitle as typeof VALID_TITLES[number])) {
          setTitle(possibleTitle);
          setFirstName(parts[1] || '');
          setLastName(parts.slice(2).join(' ') || '');
        } else {
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
      } else {
        setFirstName(initialData.name);
      }
    }

    if (initialData?.email) {
      setEmail(initialData.email);
    }

    if (initialData?.phone) {
      setPhone(initialData.phone);
    }
  }, [initialData]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const passengerData: CreatePassengerData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (title) passengerData.title = title as typeof VALID_TITLES[number];
      if (alias.trim()) passengerData.alias = alias.trim();
      if (email.trim()) passengerData.email = email.trim();
      if (phone.trim()) passengerData.phone = phone.trim();

      const result = await createPassenger(passengerData);
      setSuccess(true);
      onSaved?.(result.passenger);

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        // Reset form
        setTitle('');
        setFirstName('');
        setLastName('');
        setAlias('');
        setEmail('');
        setPhone('');
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save passenger');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-navy/50 transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-sage/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-sage" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-navy">Save Passenger</h3>
                <p className="text-sm text-navy-light/70">Add to your directory for future bookings</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-navy-light/50 hover:text-navy hover:bg-sage/10 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-sage/20 mb-4">
                <CheckCircle className="h-6 w-6 text-sage" />
              </div>
              <h4 className="text-lg font-semibold text-navy">Passenger Saved!</h4>
              <p className="mt-2 text-sm text-navy-light/70">
                They&apos;ve been added to your passenger directory.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Title</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy bg-white"
                  >
                    <option value="">Select...</option>
                    {VALID_TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                {/* Alias */}
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Alias / Nickname
                  </label>
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                    placeholder="Optional"
                  />
                </div>

                {/* Contact Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-navy bg-white border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-sage border border-transparent rounded-full hover:bg-sage-dark disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Passenger'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
