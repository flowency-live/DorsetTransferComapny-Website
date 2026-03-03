'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Car,
  Luggage,
  Edit2,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Droplet,
  Coffee,
  User,
  Mail,
  Phone,
  Loader2,
  Heart,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
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

interface CorporateQuoteResultProps {
  quote: QuoteResponse;
  magicToken: string;
  onNewQuote: () => void;
  onBack?: () => void;
  onBookingConfirmed: (bookingId: string) => void;
  specialRequests?: string;

  // Corporate context
  selectedPassenger: SelectedPassenger | null;
  manualPassengerName: string;
  user: CorporateUser;
  company: CompanyData;

  // Favourite trip
  isFromFavourite?: boolean;
  onSaveToFavourites?: () => void;
}

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

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function getPaymentTermsLabel(terms: string): string {
  switch (terms) {
    case 'net7': return 'Net 7';
    case 'net14': return 'Net 14';
    case 'net30': return 'Net 30';
    default: return 'Immediate';
  }
}

function formatTime12Hour(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function CorporateQuoteResult({
  quote,
  magicToken,
  onNewQuote,
  onBack,
  onBookingConfirmed,
  specialRequests: initialSpecialRequests,
  selectedPassenger,
  manualPassengerName,
  user,
  company,
  isFromFavourite = false,
  onSaveToFavourites,
}: CorporateQuoteResultProps) {
  // Collapsible sections
  type ExpandedSection = 'contact' | 'preferences' | null;
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

  // Contact state
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    name: '',
    email: '',
    phone: '',
  });
  const [contactErrors, setContactErrors] = useState<Partial<ContactDetails>>({});
  const [contactValid, setContactValid] = useState(false);

  // Preferences state
  const [refreshments, setRefreshments] = useState<RefreshmentPreferences>({
    stillWater: false,
    sparklingWater: false,
    tea: false,
    coffee: false,
    other: '',
  });
  const [driverInstructions, setDriverInstructions] = useState('');
  const [specialRequests, setSpecialRequests] = useState(initialSpecialRequests || '');

  // Booking state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quote expiry
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Initialize from props
  useEffect(() => {
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

    // Auto-expand contact if invalid
    if (!validation.valid) {
      setExpandedSection('contact');
    }

    // Initialize preferences from passenger
    if (selectedPassenger?.refreshments) {
      setRefreshments({
        stillWater: selectedPassenger.refreshments.stillWater ?? false,
        sparklingWater: selectedPassenger.refreshments.sparklingWater ?? false,
        tea: selectedPassenger.refreshments.tea ?? false,
        coffee: selectedPassenger.refreshments.coffee ?? false,
        other: selectedPassenger.refreshments.other ?? '',
      });
    }

    if (selectedPassenger?.driverInstructions) {
      setDriverInstructions(selectedPassenger.driverInstructions);
    }
  }, [selectedPassenger, manualPassengerName, user]);

  // Quote expiry timer
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const expires = new Date(quote.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [quote.expiresAt]);

  // Scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle contact field changes
  const handleContactChange = useCallback((field: keyof ContactDetails, value: string) => {
    setContactDetails(prev => {
      const updated = { ...prev, [field]: value };
      setContactErrors(errors => ({ ...errors, [field]: undefined }));
      const validation = validateContact(updated);
      setContactValid(validation.valid);
      return updated;
    });
  }, []);

  // Toggle refreshment preference
  const toggleRefreshment = useCallback((key: keyof Omit<RefreshmentPreferences, 'other'>) => {
    setRefreshments(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Toggle section
  const toggleSection = useCallback((section: ExpandedSection) => {
    setExpandedSection(prev => (prev === section ? null : section));
  }, []);

  // Handle contact done
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
        corporateAccountId: user.corpAccountId,
        passengerName: selectedPassenger?.displayName || manualPassengerName || contactDetails.name,
        passengerId: selectedPassenger?.passengerId || undefined,
        bookedBy: user.email,
        passengerAlias: selectedPassenger?.alias || undefined,
        passengerDriverInstructions: driverInstructions || undefined,
        passengerRefreshments: refreshments,
        paymentMethod: isPayOnAccount ? 'invoice' : 'card',
        specialRequests: specialRequests || '',
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.bookings}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const data = await response.json();
      onBookingConfirmed(data.booking.bookingId);
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
    driverInstructions,
    refreshments,
    specialRequests,
    onBookingConfirmed,
  ]);

  const pickupDate = new Date(quote.pickupTime);
  const isPayOnAccount = company.paymentTerms !== 'immediate';
  const passengerName = selectedPassenger?.displayName || manualPassengerName || contactDetails.name;

  // Check if any preferences are set
  const hasActivePrefs =
    refreshments.stillWater ||
    refreshments.sparklingWater ||
    refreshments.tea ||
    refreshments.coffee ||
    refreshments.other ||
    driverInstructions;

  return (
    <section className="py-6 pb-24">
      <div className="container px-4 mx-auto max-w-2xl">
        {/* Quote Card */}
        <div className="corp-card rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[var(--corp-accent)] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">Your Quote</h2>
                <p className="text-sm opacity-90">
                  {passengerName ? `Booking for ${passengerName}` : 'Review and confirm'}
                </p>
              </div>
              {quote.returnJourney && (
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
                  Return Trip
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Section */}
          {quote.vehicleDetails && (
            <div className="p-5 border-b border-[var(--corp-border-default)]">
              <div className="flex gap-4">
                {quote.vehicleDetails.imageUrl ? (
                  <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-[var(--corp-bg-surface)] flex-shrink-0">
                    <Image
                      src={quote.vehicleDetails.imageUrl}
                      alt={quote.vehicleDetails.name}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-28 h-20 rounded-lg bg-[var(--corp-bg-surface)] flex items-center justify-center flex-shrink-0">
                    <Car className="w-10 h-10 text-[var(--corp-accent)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg">{quote.vehicleDetails.name}</h3>
                  <p className="text-sm corp-page-subtitle line-clamp-2">{quote.vehicleDetails.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {quote.passengers}
                    </span>
                    {quote.luggage !== undefined && quote.luggage > 0 && (
                      <span className="flex items-center gap-1">
                        <Luggage className="w-4 h-4" />
                        {quote.luggage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Journey Section */}
          <div className="p-5 border-b border-[var(--corp-border-default)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider corp-page-subtitle">
                Journey
              </span>
              <button
                type="button"
                onClick={onBack || onNewQuote}
                className="flex items-center gap-1 text-sm text-[var(--corp-accent)] hover:underline"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>

            {/* Route */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--corp-accent-muted)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--corp-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{quote.pickupLocation.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--corp-bg-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{quote.dropoffLocation.address}</p>
                </div>
              </div>

              {/* Date/Time */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--corp-accent)]" />
                  <span>
                    {pickupDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--corp-accent)]" />
                  <span>{formatTime12Hour(pickupDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section (collapsible) */}
          <div className="border-b border-[var(--corp-border-default)]">
            <button
              type="button"
              onClick={() => toggleSection('contact')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--corp-bg-hover)] transition-colors"
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
              <div className="px-5 pb-5 space-y-4">
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
              <div className="px-5 pb-4 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium">{contactDetails.name || 'No name'}</span>
                  <span className="corp-page-subtitle">{contactDetails.email || 'No email'}</span>
                  <span className="corp-page-subtitle">{contactDetails.phone || 'No phone'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Preferences Section (collapsible) */}
          <div className="border-b border-[var(--corp-border-default)]">
            <button
              type="button"
              onClick={() => toggleSection('preferences')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--corp-bg-hover)] transition-colors"
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
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleRefreshment('stillWater')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  refreshments.stillWater
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
                  refreshments.sparklingWater
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
                  refreshments.tea
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
                  refreshments.coffee
                    ? 'bg-[var(--corp-accent-muted)] border-[var(--corp-accent)] text-[var(--corp-accent)]'
                    : 'bg-[var(--corp-bg-surface)] border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)]'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                Coffee
              </button>
              {!expandedSection && !driverInstructions && (
                <button
                  type="button"
                  onClick={() => setExpandedSection('preferences')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-dashed border-[var(--corp-border-default)] corp-page-subtitle hover:border-[var(--corp-accent)] transition-colors"
                >
                  + Add instructions
                </button>
              )}
            </div>

            {/* Expanded preferences fields */}
            {expandedSection === 'preferences' && (
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Driver Instructions
                  </label>
                  <textarea
                    value={driverInstructions}
                    onChange={e => setDriverInstructions(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--corp-border-default)] bg-[var(--corp-bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)] resize-none"
                    rows={2}
                    placeholder="e.g., Please call on arrival, meet at arrivals hall..."
                  />
                </div>
              </div>
            )}

            {/* Show driver instructions summary when collapsed */}
            {expandedSection !== 'preferences' && driverInstructions && (
              <div className="px-5 pb-4 text-sm corp-page-subtitle">
                <span className="font-medium">Instructions:</span> {driverInstructions}
              </div>
            )}
          </div>

          {/* Price & CTA Section */}
          <div className="p-5 bg-[var(--corp-bg-surface)]">
            {/* Error message */}
            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {submitError}
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-[var(--corp-accent)]">
                  {formatPrice(quote.pricing.totalPrice)}
                </p>
                {isPayOnAccount && (
                  <p className="text-sm corp-page-subtitle">
                    Invoice to {company.companyName} ({getPaymentTermsLabel(company.paymentTerms)})
                  </p>
                )}
              </div>
              <div className="text-right text-sm corp-page-subtitle">
                <p>Quote expires in</p>
                <p className="font-semibold">{timeRemaining}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onNewQuote}
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </span>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Save as Favourite - show below card if not from favourite */}
        {!isFromFavourite && onSaveToFavourites && (
          <div className="mt-6 p-4 bg-[var(--corp-accent-muted)] border border-[var(--corp-border-default)] rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--corp-bg-elevated)] rounded-lg">
                  <Heart className="h-5 w-5 text-[var(--corp-accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium">Save this route?</p>
                  <p className="text-xs corp-page-subtitle">Quick book this trip again anytime</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSaveToFavourites}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--corp-accent)] text-[var(--corp-accent)] font-medium text-sm rounded-lg hover:bg-[var(--corp-accent)] hover:text-white transition-colors"
              >
                <Heart className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
