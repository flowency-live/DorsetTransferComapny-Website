'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Car,
  Users,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Droplet,
  Coffee,
  MessageSquare,
} from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';
import type { QuoteResponse } from '@/app/quote/lib/types';
import type { SelectedPassenger } from '@/components/corporate/PassengerSelector';
import type { RefreshmentPreferences } from '@/lib/services/corporateApi';

// Contact details structure
interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

// Booking preferences structure
interface BookingPreferences {
  refreshments: RefreshmentPreferences;
  driverInstructions: string;
  specialRequests: string;
}

// Company data for payment display
interface CompanyData {
  companyName: string;
  paymentTerms: 'immediate' | 'net7' | 'net14' | 'net30';
}

// Corporate user from auth
interface CorporateUser {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  companyName: string;
  corpAccountId: string;
}

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void;

  // Quote data
  quote: QuoteResponse;
  magicToken: string;

  // Pre-fill sources (preference hierarchy: passenger > user > empty)
  selectedPassenger: SelectedPassenger | null;
  manualPassengerName: string;
  user: CorporateUser;
  company: CompanyData;
}

type ExpandedSection = 'contact' | 'preferences' | null;

// Validation functions
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  return /^[\d\s\+\-\(\)]{10,}$/.test(phone.replace(/\s/g, ''));
}

function validateContact(contact: ContactDetails): { valid: boolean; errors: Partial<ContactDetails> } {
  const errors: Partial<ContactDetails> = {};

  if (!contact.name.trim()) {
    errors.name = 'Name is required';
  } else if (contact.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!contact.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(contact.email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!contact.phone.trim()) {
    errors.phone = 'Phone is required';
  } else if (!validatePhone(contact.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function getPaymentTermsLabel(terms: string): string {
  switch (terms) {
    case 'net7':
      return 'Net 7';
    case 'net14':
      return 'Net 14';
    case 'net30':
      return 'Net 30';
    default:
      return 'Immediate';
  }
}

export default function BookingConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  quote,
  magicToken,
  selectedPassenger,
  manualPassengerName,
  user,
  company,
}: BookingConfirmationModalProps) {
  // State
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    name: '',
    email: '',
    phone: '',
  });
  const [contactErrors, setContactErrors] = useState<Partial<ContactDetails>>({});
  const [contactValid, setContactValid] = useState(false);

  const [preferences, setPreferences] = useState<BookingPreferences>({
    refreshments: {
      stillWater: false,
      sparklingWater: false,
      tea: false,
      coffee: false,
      other: '',
    },
    driverInstructions: '',
    specialRequests: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize contact and preferences from props
  useEffect(() => {
    if (!isOpen) return;

    // Priority: selectedPassenger > user profile > empty
    const initialContact: ContactDetails = {
      name: selectedPassenger?.displayName || manualPassengerName || user.name || '',
      email: selectedPassenger?.email || user.email || '',
      phone: selectedPassenger?.phone || '',
    };

    setContactDetails(initialContact);

    // Validate initial contact
    const validation = validateContact(initialContact);
    setContactValid(validation.valid);
    setContactErrors({});

    // Auto-expand contact section if invalid
    if (!validation.valid) {
      setExpandedSection('contact');
    } else {
      setExpandedSection(null);
    }

    // Initialize preferences from passenger or defaults
    const initialRefreshments: RefreshmentPreferences = {
      stillWater: selectedPassenger?.refreshments?.stillWater ?? false,
      sparklingWater: selectedPassenger?.refreshments?.sparklingWater ?? false,
      tea: selectedPassenger?.refreshments?.tea ?? false,
      coffee: selectedPassenger?.refreshments?.coffee ?? false,
      other: selectedPassenger?.refreshments?.other ?? '',
    };

    setPreferences({
      refreshments: initialRefreshments,
      driverInstructions: selectedPassenger?.driverInstructions || '',
      specialRequests: '',
    });

    // Reset submit state
    setIsSubmitting(false);
    setSubmitError(null);
  }, [isOpen, selectedPassenger, manualPassengerName, user]);

  // Handle contact field changes
  const handleContactChange = useCallback((field: keyof ContactDetails, value: string) => {
    setContactDetails(prev => {
      const updated = { ...prev, [field]: value };
      // Clear error for this field
      setContactErrors(errors => ({ ...errors, [field]: undefined }));
      // Revalidate
      const validation = validateContact(updated);
      setContactValid(validation.valid);
      return updated;
    });
  }, []);

  // Toggle refreshment preference (chip click)
  const toggleRefreshment = useCallback((key: keyof Omit<RefreshmentPreferences, 'other'>) => {
    setPreferences(prev => ({
      ...prev,
      refreshments: {
        ...prev.refreshments,
        [key]: !prev.refreshments[key],
      },
    }));
  }, []);

  // Handle section expand/collapse
  const toggleSection = useCallback((section: ExpandedSection) => {
    setExpandedSection(prev => (prev === section ? null : section));
  }, []);

  // Handle Done button in contact section
  const handleContactDone = useCallback(() => {
    const validation = validateContact(contactDetails);
    if (validation.valid) {
      setContactValid(true);
      setContactErrors({});
      setExpandedSection(null);
    } else {
      setContactErrors(validation.errors);
    }
  }, [contactDetails]);

  // Handle confirm booking
  const handleConfirm = useCallback(async () => {
    // Validate contact first
    const validation = validateContact(contactDetails);
    if (!validation.valid) {
      setContactErrors(validation.errors);
      setContactValid(false);
      setExpandedSection('contact');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isPayOnAccount = company.paymentTerms !== 'immediate';

      const bookingData = {
        quoteId: quote.quoteId,
        magicToken: magicToken,
        customerName: contactDetails.name,
        customerEmail: contactDetails.email,
        customerPhone: contactDetails.phone,
        // Corporate-specific fields
        corporateAccountId: user.corpAccountId,
        passengerName: selectedPassenger?.displayName || manualPassengerName || contactDetails.name,
        passengerId: selectedPassenger?.passengerId || undefined,
        bookedBy: user.email,
        // Preferences
        passengerAlias: selectedPassenger?.alias || undefined,
        passengerDriverInstructions: preferences.driverInstructions || undefined,
        passengerRefreshments: preferences.refreshments,
        // Payment
        paymentMethod: isPayOnAccount ? 'invoice' : 'card',
        specialRequests: preferences.specialRequests || '',
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.bookings}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const data = await response.json();
      onConfirm(data.booking.bookingId);
    } catch (err) {
      console.error('Booking error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    contactDetails,
    company.paymentTerms,
    quote.quoteId,
    magicToken,
    user,
    selectedPassenger,
    manualPassengerName,
    preferences,
    onConfirm,
  ]);

  if (!isOpen) return null;

  const isPayOnAccount = company.paymentTerms !== 'immediate';
  const passengerName = selectedPassenger?.displayName || manualPassengerName || contactDetails.name;

  // Check if any preferences are set
  const hasActivePrefs =
    preferences.refreshments.stillWater ||
    preferences.refreshments.sparklingWater ||
    preferences.refreshments.tea ||
    preferences.refreshments.coffee ||
    preferences.refreshments.other ||
    preferences.driverInstructions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Frosted glass overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="corp-card relative rounded-xl max-w-lg w-full my-8 max-h-[90vh] overflow-hidden shadow-2xl border-2 border-[var(--corp-border-subtle)] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b-2 border-[var(--corp-accent)] bg-[var(--corp-bg-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--corp-accent-muted)]">
              <Check className="w-5 h-5 text-[var(--corp-accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Confirm Your Booking</h2>
              <p className="text-sm corp-page-subtitle mt-0.5">
                {passengerName ? `Booking for ${passengerName}` : 'Review and confirm'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--corp-bg-hover)] border border-transparent hover:border-[var(--corp-border-default)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Journey Section (read-only, always collapsed) */}
          <section className="rounded-xl border border-[var(--corp-border-default)] bg-[var(--corp-bg-elevated)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--corp-border-subtle)] bg-[var(--corp-bg-surface)]">
              <span className="text-xs font-semibold uppercase tracking-wider corp-page-subtitle">
                Journey
              </span>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {/* Route */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[var(--corp-accent)] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{quote.pickupLocation.address}</p>
                  <p className="corp-page-subtitle mt-1 truncate">to {quote.dropoffLocation.address}</p>
                </div>
              </div>
              {/* Date/Time */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[var(--corp-accent)] flex-shrink-0" />
                <span>
                  {formatDate(quote.pickupTime)} at {formatTime(quote.pickupTime)}
                </span>
              </div>
              {/* Vehicle & Passengers */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-[var(--corp-accent)]" />
                  <span className="capitalize">{quote.vehicleType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--corp-accent)]" />
                  <span>{quote.passengers} passenger{quote.passengers !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section (collapsible) */}
          <section
            className={`rounded-xl border overflow-hidden transition-all ${
              expandedSection === 'contact'
                ? 'border-[var(--corp-accent)] shadow-sm'
                : 'border-[var(--corp-border-default)]'
            } bg-[var(--corp-bg-elevated)]`}
          >
            <button
              type="button"
              onClick={() => toggleSection('contact')}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--corp-border-subtle)] bg-[var(--corp-bg-surface)] hover:bg-[var(--corp-bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider corp-page-subtitle">
                  Contact
                </span>
                {contactValid ? (
                  <Check className="w-4 h-4 text-[var(--corp-success)]" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[var(--corp-error)]" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--corp-accent)]">
                  {expandedSection === 'contact' ? 'Done' : 'Edit'}
                </span>
                {expandedSection === 'contact' ? (
                  <ChevronUp className="w-4 h-4 text-[var(--corp-accent)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 corp-page-subtitle" />
                )}
              </div>
            </button>

            {expandedSection === 'contact' ? (
              /* Expanded: Form fields */
              <div className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Full Name <span className="text-[var(--corp-error)]">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 corp-page-subtitle" />
                    <input
                      type="text"
                      value={contactDetails.name}
                      onChange={e => handleContactChange('name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)] ${
                        contactErrors.name ? 'border-[var(--corp-error)]' : 'border-[var(--corp-border-default)]'
                      }`}
                      placeholder="John Smith"
                    />
                  </div>
                  {contactErrors.name && (
                    <p className="mt-1 text-xs text-[var(--corp-error)] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {contactErrors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Email <span className="text-[var(--corp-error)]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 corp-page-subtitle" />
                    <input
                      type="email"
                      value={contactDetails.email}
                      onChange={e => handleContactChange('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)] ${
                        contactErrors.email ? 'border-[var(--corp-error)]' : 'border-[var(--corp-border-default)]'
                      }`}
                      placeholder="john@company.com"
                    />
                  </div>
                  {contactErrors.email && (
                    <p className="mt-1 text-xs text-[var(--corp-error)] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {contactErrors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Phone <span className="text-[var(--corp-error)]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 corp-page-subtitle" />
                    <input
                      type="tel"
                      value={contactDetails.phone}
                      onChange={e => handleContactChange('phone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)] ${
                        contactErrors.phone ? 'border-[var(--corp-error)]' : 'border-[var(--corp-border-default)]'
                      }`}
                      placeholder="07700 900000"
                    />
                  </div>
                  {contactErrors.phone && (
                    <p className="mt-1 text-xs text-[var(--corp-error)] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {contactErrors.phone}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleContactDone}
                  className="w-full py-2.5 rounded-lg bg-[var(--corp-accent)] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Collapsed: Summary */
              <div className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium">{contactDetails.name || 'No name'}</span>
                  <span className="corp-page-subtitle">{contactDetails.email || 'No email'}</span>
                  <span className="corp-page-subtitle">{contactDetails.phone || 'No phone'}</span>
                </div>
              </div>
            )}
          </section>

          {/* Preferences Section (collapsible with chips) */}
          <section
            className={`rounded-xl border overflow-hidden transition-all ${
              expandedSection === 'preferences'
                ? 'border-[var(--corp-accent)] shadow-sm'
                : 'border-[var(--corp-border-default)]'
            } bg-[var(--corp-bg-elevated)]`}
          >
            <button
              type="button"
              onClick={() => toggleSection('preferences')}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-[var(--corp-border-subtle)] bg-[var(--corp-bg-surface)] hover:bg-[var(--corp-bg-hover)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider corp-page-subtitle">
                  Preferences
                </span>
                <span className="text-xs corp-page-subtitle">(optional)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--corp-accent)]">
                  {expandedSection === 'preferences' ? 'Done' : hasActivePrefs ? 'Edit' : 'Add'}
                </span>
                {expandedSection === 'preferences' ? (
                  <ChevronUp className="w-4 h-4 text-[var(--corp-accent)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 corp-page-subtitle" />
                )}
              </div>
            </button>

            {/* Preference chips (always visible) */}
            <div className="px-4 py-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleRefreshment('stillWater')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  preferences.refreshments.stillWater
                    ? 'bg-[var(--corp-accent-muted)] border-[var(--corp-accent)] text-[var(--corp-accent)]'
                    : 'bg-[var(--corp-bg-surface)] border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)]'
                }`}
              >
                <Droplet className="w-3.5 h-3.5" />
                Still water
              </button>
              <button
                type="button"
                onClick={() => toggleRefreshment('sparklingWater')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  preferences.refreshments.sparklingWater
                    ? 'bg-[var(--corp-accent-muted)] border-[var(--corp-accent)] text-[var(--corp-accent)]'
                    : 'bg-[var(--corp-bg-surface)] border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)]'
                }`}
              >
                <Droplet className="w-3.5 h-3.5" />
                Sparkling
              </button>
              <button
                type="button"
                onClick={() => toggleRefreshment('tea')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  preferences.refreshments.tea
                    ? 'bg-[var(--corp-accent-muted)] border-[var(--corp-accent)] text-[var(--corp-accent)]'
                    : 'bg-[var(--corp-bg-surface)] border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)]'
                }`}
              >
                Tea
              </button>
              <button
                type="button"
                onClick={() => toggleRefreshment('coffee')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  preferences.refreshments.coffee
                    ? 'bg-[var(--corp-accent-muted)] border-[var(--corp-accent)] text-[var(--corp-accent)]'
                    : 'bg-[var(--corp-bg-surface)] border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                Coffee
              </button>
              {!expandedSection && !preferences.driverInstructions && (
                <button
                  type="button"
                  onClick={() => setExpandedSection('preferences')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-dashed border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)] transition-colors"
                >
                  + Add instructions
                </button>
              )}
            </div>

            {/* Expanded: Additional fields */}
            {expandedSection === 'preferences' && (
              <div className="px-4 pb-4 space-y-4">
                {/* Other refreshments */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Other refreshments
                  </label>
                  <input
                    type="text"
                    value={preferences.refreshments.other || ''}
                    onChange={e =>
                      setPreferences(prev => ({
                        ...prev,
                        refreshments: { ...prev.refreshments, other: e.target.value },
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--corp-border-default)] bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)]"
                    placeholder="e.g., Orange juice, snacks..."
                  />
                </div>

                {/* Driver instructions */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    <MessageSquare className="w-4 h-4" />
                    Driver Instructions
                  </label>
                  <textarea
                    value={preferences.driverInstructions}
                    onChange={e =>
                      setPreferences(prev => ({ ...prev, driverInstructions: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--corp-border-default)] bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)] resize-none"
                    rows={2}
                    placeholder="e.g., Please call on arrival, meet at arrivals hall..."
                  />
                </div>

                {/* Special requests */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Special Requests
                  </label>
                  <textarea
                    value={preferences.specialRequests}
                    onChange={e =>
                      setPreferences(prev => ({ ...prev, specialRequests: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--corp-border-default)] bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)] resize-none"
                    rows={2}
                    placeholder="Any additional requests for this booking..."
                  />
                </div>
              </div>
            )}

            {/* Show driver instructions summary when collapsed */}
            {expandedSection !== 'preferences' && preferences.driverInstructions && (
              <div className="px-4 pb-3 text-sm corp-page-subtitle">
                <span className="font-medium">Instructions:</span> {preferences.driverInstructions}
              </div>
            )}
          </section>

          {/* Error message */}
          {submitError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 border-t-2 border-[var(--corp-accent)] bg-[var(--corp-bg-elevated)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-bold text-[var(--corp-accent)]">
                {formatPrice(quote.pricing.totalPrice)}
              </p>
              {isPayOnAccount && (
                <p className="text-sm corp-page-subtitle">
                  Invoice to {company.companyName} ({getPaymentTermsLabel(company.paymentTerms)})
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-[var(--corp-border-default)] font-medium hover:bg-[var(--corp-bg-hover)] transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg bg-[var(--corp-accent)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
