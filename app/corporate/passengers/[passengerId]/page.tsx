'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, AlertTriangle, User, MapPin, Calendar, Car, Edit2, History, Save, X, RotateCw } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPassenger,
  updatePassenger,
  getPassengerJourneys,
  getDashboard,
  type Passenger,
  type Journey,
  type UpdatePassengerData,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';

const VALID_TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Lord', 'Lady', 'Sir', 'Dame'] as const;

interface RefreshmentsState {
  stillWater: boolean;
  sparklingWater: boolean;
  tea: boolean;
  coffee: boolean;
  other: string;
}

interface PageProps {
  params: { passengerId: string };
}

export default function PassengerDetailPage({ params }: PageProps) {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const passengerId = params.passengerId;
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [mostFrequentRoute, setMostFrequentRoute] = useState<{ pickup: string; dropoff: string; count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [journeysLoading, setJourneysLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state for editing
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

  // Check if edit mode from URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Load data
  useEffect(() => {
    if (user && passengerId) {
      Promise.all([
        getPassenger(passengerId),
        getDashboard()
      ])
        .then(([passengerData, dashboardData]) => {
          setPassenger(passengerData.passenger);
          setCompanyName(dashboardData.company?.companyName);
          // Initialize form data
          const p = passengerData.passenger;
          setFormData({
            title: p.title || '',
            firstName: p.firstName,
            lastName: p.lastName,
            alias: p.alias || '',
            referToAs: p.referToAs || '',
            email: p.email || '',
            phone: p.phone || '',
            driverInstructions: p.driverInstructions || '',
            bookerNotes: p.bookerNotes || '',
          });
          setRefreshments({
            stillWater: p.refreshments?.stillWater || false,
            sparklingWater: p.refreshments?.sparklingWater || false,
            tea: p.refreshments?.tea || false,
            coffee: p.refreshments?.coffee || false,
            other: p.refreshments?.other || '',
          });
        })
        .catch((err) => {
          console.error('Failed to load passenger:', err);
          showToast('Failed to load passenger', 'error');
          router.push('/corporate/passengers');
        })
        .finally(() => setIsLoading(false));

      // Load journey history
      getPassengerJourneys(passengerId)
        .then((data) => {
          setJourneys(data.journeys);
          setMostFrequentRoute(data.mostFrequentRoute);
        })
        .catch((err) => {
          console.error('Failed to load journey history:', err);
        })
        .finally(() => setJourneysLoading(false));
    }
  }, [user, passengerId, showToast, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const updateData: UpdatePassengerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        title: formData.title ? (formData.title as typeof VALID_TITLES[number]) : null,
        alias: formData.alias.trim() || null,
        referToAs: formData.referToAs.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        driverInstructions: formData.driverInstructions.trim() || null,
        bookerNotes: formData.bookerNotes.trim() || null,
      };

      // Build refreshments object
      const hasRefreshments = refreshments.stillWater || refreshments.sparklingWater ||
                              refreshments.tea || refreshments.coffee || refreshments.other.trim();
      if (hasRefreshments) {
        updateData.refreshments = {
          stillWater: refreshments.stillWater,
          sparklingWater: refreshments.sparklingWater,
          tea: refreshments.tea,
          coffee: refreshments.coffee,
          other: refreshments.other.trim() || undefined,
        };
      } else {
        updateData.refreshments = null;
      }

      const result = await updatePassenger(passengerId, updateData);
      setPassenger(result.passenger);
      setIsEditing(false);
      showToast('Passenger updated successfully');

      // Remove edit param from URL
      router.replace(`/corporate/passengers/${passengerId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update passenger', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (passenger) {
      // Reset form to original values
      setFormData({
        title: passenger.title || '',
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        alias: passenger.alias || '',
        referToAs: passenger.referToAs || '',
        email: passenger.email || '',
        phone: passenger.phone || '',
        driverInstructions: passenger.driverInstructions || '',
        bookerNotes: passenger.bookerNotes || '',
      });
      setRefreshments({
        stillWater: passenger.refreshments?.stillWater || false,
        sparklingWater: passenger.refreshments?.sparklingWater || false,
        tea: passenger.refreshments?.tea || false,
        coffee: passenger.refreshments?.coffee || false,
        other: passenger.refreshments?.other || '',
      });
    }
    setErrors({});
    setIsEditing(false);
    router.replace(`/corporate/passengers/${passengerId}`);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (pence: number | null): string => {
    if (pence === null) return '-';
    return `£${(pence / 100).toFixed(2)}`;
  };

  const formatPassengerName = (): string => {
    if (!passenger) return '';
    const parts = [passenger.title, passenger.firstName, passenger.lastName].filter(Boolean);
    return parts.join(' ');
  };

  /**
   * Build a URL to rebook a journey with pre-filled data
   */
  const buildRebookUrl = (journey: Journey): string => {
    const params = new URLSearchParams();
    params.set('passengerId', passengerId);

    // Add pickup location
    if (journey.pickupLocation) {
      params.set('pickupAddress', journey.pickupLocation.address);
      if (journey.pickupLocation.lat !== undefined) {
        params.set('pickupLat', String(journey.pickupLocation.lat));
      }
      if (journey.pickupLocation.lng !== undefined) {
        params.set('pickupLng', String(journey.pickupLocation.lng));
      }
      if (journey.pickupLocation.placeId) {
        params.set('pickupPlaceId', journey.pickupLocation.placeId);
      }
    }

    // Add dropoff location
    if (journey.dropoffLocation) {
      params.set('dropoffAddress', journey.dropoffLocation.address);
      if (journey.dropoffLocation.lat !== undefined) {
        params.set('dropoffLat', String(journey.dropoffLocation.lat));
      }
      if (journey.dropoffLocation.lng !== undefined) {
        params.set('dropoffLng', String(journey.dropoffLocation.lng));
      }
      if (journey.dropoffLocation.placeId) {
        params.set('dropoffPlaceId', journey.dropoffLocation.placeId);
      }
    }

    // Add vehicle type
    if (journey.vehicleType) {
      params.set('vehicleType', journey.vehicleType);
    }

    // Add passenger and luggage counts
    if (journey.passengers !== null) {
      params.set('passengers', String(journey.passengers));
    }
    if (journey.luggage !== null) {
      params.set('luggage', String(journey.luggage));
    }

    return `/corporate/quote?${params.toString()}`;
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
      </div>
    );
  }

  if (!passenger) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <p className="text-navy-light/70">Passenger not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <CorporateHeader
        userName={user.name}
        companyName={companyName}
        onLogout={logout}
        isAdmin={isAdmin}
      />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          {/* Page Header */}
          <div className="mb-8">
            <Link
              href="/corporate/passengers"
              className="inline-flex items-center text-sm text-navy-light/70 hover:text-sage transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Passengers
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-sage/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-sage" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-navy">{formatPassengerName()}</h1>
                  {passenger.alias && (
                    <p className="text-navy-light/70 text-sm">
                      &ldquo;{passenger.alias}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-sage rounded-full text-sm font-medium text-sage hover:bg-sage/5 transition-colors"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Passenger
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center px-4 py-2 border border-sage/30 rounded-full text-sm font-medium text-navy-light/70 hover:bg-sage/5 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-full text-sm font-medium text-white bg-sage hover:bg-sage-dark disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Details / Edit Form */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6 mb-6">
            <h2 className="text-lg font-semibold text-navy mb-4">Passenger Details</h2>

            {isEditing ? (
              /* Edit Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-navy mb-1">Title</label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy bg-white"
                  >
                    <option value="">Select...</option>
                    {VALID_TITLES.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
                <div className="hidden sm:block" />

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy ${
                      errors.firstName ? 'border-red-300' : 'border-sage/30'
                    }`}
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy ${
                      errors.lastName ? 'border-red-300' : 'border-sage/30'
                    }`}
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Alias / Nickname</label>
                  <input
                    type="text"
                    value={formData.alias}
                    onChange={(e) => handleChange('alias', e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Refer To As</label>
                  <input
                    type="text"
                    value={formData.referToAs}
                    onChange={(e) => handleChange('referToAs', e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy ${
                      errors.email ? 'border-red-300' : 'border-sage/30'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-navy mb-2">Refreshment Preferences</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { key: 'stillWater', label: 'Still Water' },
                      { key: 'sparklingWater', label: 'Sparkling Water' },
                      { key: 'tea', label: 'Tea' },
                      { key: 'coffee', label: 'Coffee' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                          refreshments[key as keyof RefreshmentsState]
                            ? 'border-sage bg-sage/10 text-sage-dark'
                            : 'border-sage/30 hover:border-sage/50'
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
                  <input
                    type="text"
                    value={refreshments.other}
                    onChange={(e) => handleRefreshmentChange('other', e.target.value)}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                    placeholder="Other refreshment preferences..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-navy mb-1">Driver Instructions</label>
                  <textarea
                    value={formData.driverInstructions}
                    onChange={(e) => handleChange('driverInstructions', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                  />
                  <p className="mt-1 text-xs text-navy-light/50">{formData.driverInstructions.length}/500 - Visible to driver</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-navy mb-1">Booker Notes</label>
                  <textarea
                    value={formData.bookerNotes}
                    onChange={(e) => handleChange('bookerNotes', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                  />
                  <p className="mt-1 text-xs text-navy-light/50">{formData.bookerNotes.length}/500 - Only visible to bookers</p>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium text-navy-light/70">Full Name</dt>
                  <dd className="mt-1 text-sm text-navy">{formatPassengerName()}</dd>
                </div>
                {passenger.alias && (
                  <div>
                    <dt className="text-sm font-medium text-navy-light/70">Alias</dt>
                    <dd className="mt-1 text-sm text-navy">{passenger.alias}</dd>
                  </div>
                )}
                {passenger.referToAs && (
                  <div>
                    <dt className="text-sm font-medium text-navy-light/70">Refer To As</dt>
                    <dd className="mt-1 text-sm text-navy">{passenger.referToAs}</dd>
                  </div>
                )}
                {passenger.email && (
                  <div>
                    <dt className="text-sm font-medium text-navy-light/70">Email</dt>
                    <dd className="mt-1 text-sm text-navy">{passenger.email}</dd>
                  </div>
                )}
                {passenger.phone && (
                  <div>
                    <dt className="text-sm font-medium text-navy-light/70">Phone</dt>
                    <dd className="mt-1 text-sm text-navy">{passenger.phone}</dd>
                  </div>
                )}
                {passenger.refreshments && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-navy-light/70">Refreshment Preferences</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {passenger.refreshments.stillWater && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage-dark">Still Water</span>
                      )}
                      {passenger.refreshments.sparklingWater && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage-dark">Sparkling Water</span>
                      )}
                      {passenger.refreshments.tea && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage-dark">Tea</span>
                      )}
                      {passenger.refreshments.coffee && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage-dark">Coffee</span>
                      )}
                      {passenger.refreshments.other && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage-dark">{passenger.refreshments.other}</span>
                      )}
                    </dd>
                  </div>
                )}
                {passenger.driverInstructions && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-navy-light/70">Driver Instructions</dt>
                    <dd className="mt-1 text-sm text-navy whitespace-pre-wrap">{passenger.driverInstructions}</dd>
                  </div>
                )}
                {passenger.bookerNotes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-navy-light/70">Booker Notes</dt>
                    <dd className="mt-1 text-sm text-navy whitespace-pre-wrap">{passenger.bookerNotes}</dd>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Journey History */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20">
            <div className="p-6 border-b border-sage/20 flex items-center gap-2">
              <History className="h-5 w-5 text-sage" />
              <h2 className="text-lg font-semibold text-navy">
                Journey History {!journeysLoading && journeys.length > 0 && `(${journeys.length})`}
              </h2>
            </div>

            {/* Most Frequent Route */}
            {mostFrequentRoute && (
              <div className="p-4 bg-sage/5 border-b border-sage/20">
                <p className="text-xs font-medium text-navy-light/70 uppercase tracking-wider mb-1">Most Frequent Route</p>
                <p className="text-sm text-navy">
                  {mostFrequentRoute.pickup} <span className="text-navy-light/50 mx-2">&rarr;</span> {mostFrequentRoute.dropoff}
                  <span className="ml-2 text-navy-light/50">({mostFrequentRoute.count} trips)</span>
                </p>
              </div>
            )}

            {journeysLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
              </div>
            ) : journeys.length === 0 ? (
              <div className="p-12 text-center">
                <History className="mx-auto h-12 w-12 text-sage/30" />
                <p className="mt-4 text-sm text-navy-light/70">No journey history yet</p>
                <p className="mt-1 text-xs text-navy-light/50">
                  Book a transfer for this passenger to start tracking their journeys
                </p>
              </div>
            ) : (
              <div className="divide-y divide-sage/20">
                {journeys.map((journey) => (
                  <div key={journey.bookingId} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-navy-light/50 flex-shrink-0" />
                          <span className="text-sm font-medium text-navy">{formatDate(journey.date)}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            journey.status === 'completed' ? 'bg-sage/20 text-sage-dark' :
                            journey.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            journey.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {journey.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
                            <span className="text-navy-light/70">{journey.pickup || 'Unknown'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <span className="text-navy-light/70">{journey.dropoff || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-navy-light/70">
                        {journey.vehicleName && (
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            <span>{journey.vehicleName}</span>
                          </div>
                        )}
                        {journey.pricePence !== null && (
                          <span className="font-medium text-navy">{formatPrice(journey.pricePence)}</span>
                        )}
                        {/* Rebook button - only show for completed/confirmed journeys */}
                        {(journey.status === 'completed' || journey.status === 'confirmed') && journey.pickupLocation && journey.dropoffLocation && (
                          <Link
                            href={buildRebookUrl(journey)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sage border border-sage rounded-full hover:bg-sage/5 transition-colors"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                            Rebook
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

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
    </div>
  );
}
