'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, User, MapPin, Calendar, Car, Edit2, History, Save, X, RotateCw, Plus } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPassenger,
  updatePassenger,
  getPassengerJourneys,
  type Passenger,
  type Journey,
  type UpdatePassengerData,
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

interface PageProps {
  params: { passengerId: string };
}

export default function PassengerDetailPage({ params }: PageProps) {
  const { user } = useRequireCorporateAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const passengerId = params.passengerId;
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [mostFrequentRoute, setMostFrequentRoute] = useState<{ pickup: string; dropoff: string; count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [journeysLoading, setJourneysLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    alias: '',
    referToAs: '',
    contactName: '',
    email: '',
    phone: '',
    driverInstructions: '',
    bookerNotes: '',
  });

  const [isRepresentative, setIsRepresentative] = useState(false);

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

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Sync contact name with passenger name when not representative
  useEffect(() => {
    if (!isRepresentative && isEditing) {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      setFormData((prev) => ({ ...prev, contactName: fullName }));
    }
  }, [formData.firstName, formData.lastName, isRepresentative, isEditing]);

  useEffect(() => {
    if (user && passengerId) {
      getPassenger(passengerId)
        .then((passengerData) => {
          setPassenger(passengerData.passenger);
          const p = passengerData.passenger;
          setFormData({
            title: p.title || '',
            firstName: p.firstName,
            lastName: p.lastName,
            alias: p.alias || '',
            referToAs: p.referToAs || '',
            contactName: p.contactName || `${p.firstName} ${p.lastName}`.trim(),
            email: p.email || '',
            phone: p.phone || '',
            driverInstructions: p.driverInstructions || '',
            bookerNotes: p.bookerNotes || '',
          });
          setIsRepresentative(p.isRepresentative || false);
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
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      const updateData: UpdatePassengerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        title: formData.title ? (formData.title as typeof VALID_TITLES[number]) : null,
        alias: formData.alias.trim() || null,
        referToAs: formData.referToAs.trim() || null,
        contactName: formData.contactName.trim() || null,
        isRepresentative: isRepresentative || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        driverInstructions: formData.driverInstructions.trim() || null,
        bookerNotes: formData.bookerNotes.trim() || null,
      };

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
      router.replace(`/corporate/passengers/${passengerId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update passenger', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (passenger) {
      setFormData({
        title: passenger.title || '',
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        alias: passenger.alias || '',
        referToAs: passenger.referToAs || '',
        contactName: passenger.contactName || `${passenger.firstName} ${passenger.lastName}`.trim(),
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
      setIsRepresentative(passenger.isRepresentative || false);
    }
    setErrors({});
    setIsEditing(false);
    router.replace(`/corporate/passengers/${passengerId}`);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
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
    return [passenger.title, passenger.firstName, passenger.lastName].filter(Boolean).join(' ');
  };

  const buildRebookUrl = (journey: Journey): string => {
    const params = new URLSearchParams();
    params.set('passengerId', passengerId);
    if (journey.pickupLocation) {
      params.set('pickupAddress', journey.pickupLocation.address);
      if (journey.pickupLocation.lat !== undefined) params.set('pickupLat', String(journey.pickupLocation.lat));
      if (journey.pickupLocation.lng !== undefined) params.set('pickupLng', String(journey.pickupLocation.lng));
      if (journey.pickupLocation.placeId) params.set('pickupPlaceId', journey.pickupLocation.placeId);
    }
    if (journey.dropoffLocation) {
      params.set('dropoffAddress', journey.dropoffLocation.address);
      if (journey.dropoffLocation.lat !== undefined) params.set('dropoffLat', String(journey.dropoffLocation.lat));
      if (journey.dropoffLocation.lng !== undefined) params.set('dropoffLng', String(journey.dropoffLocation.lng));
      if (journey.dropoffLocation.placeId) params.set('dropoffPlaceId', journey.dropoffLocation.placeId);
    }
    if (journey.vehicleType) params.set('vehicleType', journey.vehicleType);
    if (journey.passengers !== null) params.set('passengers', String(journey.passengers));
    if (journey.luggage !== null) params.set('luggage', String(journey.luggage));
    return `/corporate/quote?${params.toString()}`;
  };

  if (isLoading || !passenger) {
    return (
      <CorporateLayout pageTitle="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin" />
        </div>
      </CorporateLayout>
    );
  }

  return (
    <CorporateLayout pageTitle={formatPassengerName()}>
      <div className="max-w-4xl mx-auto">
        {/* Page Subheader with Alias */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="corp-user-avatar h-12 w-12 rounded-full flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              {passenger.alias && (
                <p className="corp-page-subtitle text-sm">&ldquo;{passenger.alias}&rdquo;</p>
              )}
            </div>
          </div>
          {!isEditing ? (
            <div className="flex gap-2">
              <Link
                href={`/corporate/quote?passengerId=${passengerId}`}
                className="corp-btn corp-btn-primary inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Book
              </Link>
              <button
                onClick={() => setIsEditing(true)}
                className="corp-btn corp-btn-secondary inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="corp-btn corp-btn-ghost inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="corp-btn corp-btn-primary inline-flex items-center px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Details / Edit Form */}
        {isEditing ? (
          <>
            {/* Passenger Details Section */}
            <div className="corp-card rounded-lg p-6 mb-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Passenger Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-1">
                  <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
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
                    className={`corp-input w-full px-3 py-2 rounded-lg ${errors.firstName ? 'border-red-500' : ''}`}
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
                    className={`corp-input w-full px-3 py-2 rounded-lg ${errors.lastName ? 'border-red-500' : ''}`}
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

            {/* Contact Information Section */}
            <div className="corp-card rounded-lg p-6 mb-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Contact Information</h2>

              {/* Representative Checkbox */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRepresentative}
                    onChange={(e) => setIsRepresentative(e.target.checked)}
                    className="corp-checkbox w-4 h-4 rounded"
                  />
                  <span className="text-sm">Passenger&apos;s representative (different contact person)</span>
                </label>
                <p className="mt-1 text-xs opacity-50 ml-6">
                  Check this if the contact person is not the passenger themselves
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="contactName" className="block text-sm font-medium mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    disabled={!isRepresentative}
                    className={`corp-input w-full px-3 py-2 rounded-lg ${!isRepresentative ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Contact person's name"
                  />
                  {!isRepresentative && (
                    <p className="mt-1 text-xs opacity-50">
                      Automatically set to passenger name. Enable representative to change.
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`corp-input w-full px-3 py-2 rounded-lg ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="john.smith@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
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
                <label className="block text-sm font-medium mb-2">Refreshment Preferences</label>
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
          </>
        ) : (
          <>
            {/* View Mode - Passenger Details */}
            <div className="corp-card rounded-lg p-6 mb-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Passenger Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm font-medium opacity-70">Full Name</dt>
                  <dd className="mt-1 text-sm">{formatPassengerName()}</dd>
                </div>
                {passenger.alias && (
                  <div>
                    <dt className="text-sm font-medium opacity-70">Alias / Nickname</dt>
                    <dd className="mt-1 text-sm">{passenger.alias}</dd>
                  </div>
                )}
                {passenger.referToAs && (
                  <div>
                    <dt className="text-sm font-medium opacity-70">Refer To As</dt>
                    <dd className="mt-1 text-sm">{passenger.referToAs}</dd>
                  </div>
                )}
              </div>
            </div>

            {/* View Mode - Contact Information */}
            {(passenger.contactName || passenger.email || passenger.phone) && (
              <div className="corp-card rounded-lg p-6 mb-6">
                <h2 className="corp-section-title text-lg font-semibold mb-4">Contact Information</h2>
                {passenger.isRepresentative && (
                  <p className="text-xs corp-badge corp-badge-info inline-block mb-4">Representative contact</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {passenger.contactName && (
                    <div>
                      <dt className="text-sm font-medium opacity-70">Contact Name</dt>
                      <dd className="mt-1 text-sm">{passenger.contactName}</dd>
                    </div>
                  )}
                  {passenger.email && (
                    <div>
                      <dt className="text-sm font-medium opacity-70">Email</dt>
                      <dd className="mt-1 text-sm">{passenger.email}</dd>
                    </div>
                  )}
                  {passenger.phone && (
                    <div>
                      <dt className="text-sm font-medium opacity-70">Phone</dt>
                      <dd className="mt-1 text-sm">{passenger.phone}</dd>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Mode - Preferences */}
            {(passenger.refreshments || passenger.driverInstructions || passenger.bookerNotes) && (
              <div className="corp-card rounded-lg p-6 mb-6">
                <h2 className="corp-section-title text-lg font-semibold mb-4">Preferences</h2>
                <div className="space-y-4">
                  {passenger.refreshments && (
                    <div>
                      <dt className="text-sm font-medium opacity-70 mb-2">Refreshment Preferences</dt>
                      <dd className="flex flex-wrap gap-2">
                        {passenger.refreshments.stillWater && <span className="corp-badge corp-badge-success text-xs">Still Water</span>}
                        {passenger.refreshments.sparklingWater && <span className="corp-badge corp-badge-success text-xs">Sparkling Water</span>}
                        {passenger.refreshments.tea && <span className="corp-badge corp-badge-success text-xs">Tea</span>}
                        {passenger.refreshments.coffee && <span className="corp-badge corp-badge-success text-xs">Coffee</span>}
                        {passenger.refreshments.other && <span className="corp-badge corp-badge-success text-xs">{passenger.refreshments.other}</span>}
                      </dd>
                    </div>
                  )}
                  {passenger.driverInstructions && (
                    <div>
                      <dt className="text-sm font-medium opacity-70 mb-1">Driver Instructions</dt>
                      <dd className="text-sm whitespace-pre-wrap">{passenger.driverInstructions}</dd>
                    </div>
                  )}
                  {passenger.bookerNotes && (
                    <div>
                      <dt className="text-sm font-medium opacity-70 mb-1">Booker Notes</dt>
                      <dd className="text-sm whitespace-pre-wrap">{passenger.bookerNotes}</dd>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Journey History */}
        <div className="corp-card rounded-lg">
          <div className="p-6 border-b corp-border flex items-center gap-2">
            <History className="h-5 w-5 corp-icon" />
            <h2 className="corp-section-title text-lg font-semibold">Journey History {!journeysLoading && journeys.length > 0 && `(${journeys.length})`}</h2>
          </div>

          {mostFrequentRoute && (
            <div className="p-4 corp-highlight border-b corp-border">
              <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">Most Frequent Route</p>
              <p className="text-sm">{mostFrequentRoute.pickup} <span className="opacity-50 mx-2">&rarr;</span> {mostFrequentRoute.dropoff} <span className="ml-2 opacity-50">({mostFrequentRoute.count} trips)</span></p>
            </div>
          )}

          {journeysLoading ? (
            <div className="p-6 text-center"><div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" /></div>
          ) : journeys.length === 0 ? (
            <div className="p-12 text-center">
              <History className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-4 text-sm opacity-70">No journey history yet</p>
            </div>
          ) : (
            <div className="divide-y corp-border">
              {journeys.map((journey) => (
                <div key={journey.bookingId} className="p-4 sm:p-6 corp-list-item">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 opacity-50 flex-shrink-0" />
                        <span className="text-sm font-medium">{formatDate(journey.date)}</span>
                        <span className={`corp-badge text-xs ${journey.status === 'completed' ? 'corp-badge-success' : journey.status === 'confirmed' ? 'corp-badge-info' : journey.status === 'cancelled' ? 'corp-badge-danger' : 'corp-badge-neutral'}`}>{journey.status}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" /><span className="opacity-70">{journey.pickup || 'Unknown'}</span></div>
                        <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" /><span className="opacity-70">{journey.dropoff || 'Unknown'}</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm opacity-70">
                      {journey.vehicleName && <div className="flex items-center gap-1"><Car className="h-4 w-4" /><span>{journey.vehicleName}</span></div>}
                      {journey.pricePence !== null && <span className="font-medium">{formatPrice(journey.pricePence)}</span>}
                      {(journey.status === 'completed' || journey.status === 'confirmed' || journey.status === 'pending') && (journey.pickupLocation || journey.pickup) && (journey.dropoffLocation || journey.dropoff) && (
                        <Link href={buildRebookUrl(journey)} className="corp-btn corp-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full">
                          <RotateCw className="h-3.5 w-3.5" />Rebook
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

      {toast?.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-sage text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </CorporateLayout>
  );
}
