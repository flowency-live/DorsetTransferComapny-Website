'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';

import CorporateLayout from '@/components/corporate/CorporateLayout';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';
import { getTenantHeaders } from '@/lib/config/tenant';
import LocationInput from '@/app/quote/components/LocationInput';
import DateTimePicker from '@/app/quote/components/DateTimePicker';
import PassengerCounter from '@/app/quote/components/PassengerCounter';
import LuggageCounter from '@/app/quote/components/LuggageCounter';
import { LocationType } from '@/app/quote/lib/types';

interface BookingLocation {
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

interface BookingPricing {
  currency: string;
  totalPrice: number;
  displayTotal: string;
  transferPrice?: number;
  displayTransferPrice?: string;
  fees?: {
    airportDrop?: number;
    vat?: number;
    vatRate?: number;
  };
}

interface BookingData {
  bookingId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  pickupTime: string;
  pickupLocation: BookingLocation;
  dropoffLocation: BookingLocation;
  waypoints?: BookingLocation[];
  vehicleType: string;
  journeyType: 'one-way' | 'round-trip' | 'by-the-hour';
  passengers: number;
  luggage?: number;
  returnJourney: boolean;
  returnPickupTime?: string;
  flightNumber?: string;
  trainNumber?: string;
  returnFlightNumber?: string;
  returnTrainNumber?: string;
  specialRequests?: string;
  durationHours?: number;
  pricing: BookingPricing;
  createdAt: string;
  quoteId?: string;
}

interface CancellationPreview {
  bookingId: string;
  originalAmount: number;
  displayOriginalAmount: string;
  cancellationFee: number;
  displayCancellationFee: string;
  refundAmount: number;
  displayRefundAmount: string;
  isFreeCancel: boolean;
  freeCancellationHours: number;
  cancellationFeePercent: number;
  hoursUntilPickup: number;
}

interface JourneyEditForm {
  pickupAddress: string;
  pickupPlaceId: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffPlaceId: string;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupDateTime: Date | null;
  returnDateTime: Date | null;
  vehicleType: string;
  passengers: number;
  luggage: number;
  returnJourney: boolean;
  specialRequests: string;
  flightNumber: string;
  trainNumber: string;
  returnFlightNumber: string;
  returnTrainNumber: string;
}

interface AmendmentQuote {
  amendmentId: string;
  original: { price: number; displayPrice: string };
  amended: { price: number; displayPrice: string };
  priceDifference: { amount: number; displayAmount: string; isIncrease: boolean };
  expiresAt: string;
}

async function getBookingByToken(bookingId: string, token: string): Promise<BookingData> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}?token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getTenantHeaders(),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load booking');
  }

  const data = await response.json();
  return data.booking;
}

async function getCancelPreview(bookingId: string, token: string): Promise<CancellationPreview> {
  const url = `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}/cancel-preview?token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getTenantHeaders(),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get cancellation preview');
  }

  return response.json();
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'corp-badge corp-badge-warning';
    case 'confirmed':
      return 'corp-badge corp-badge-success';
    case 'completed':
      return 'corp-badge corp-badge-info';
    case 'cancelled':
      return 'corp-badge corp-badge-danger';
    default:
      return 'corp-badge corp-badge-neutral';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Awaiting Confirmation';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

function CorporateBookingContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = params.bookingId as string;
  const token = searchParams.get('token');

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStep, setEditStep] = useState<'form' | 'review' | 'success'>('form');
  const [journeyForm, setJourneyForm] = useState<JourneyEditForm | null>(null);
  const [amendmentQuote, setAmendmentQuote] = useState<AmendmentQuote | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId || !token) {
        setError('Invalid booking link. Please use the link from your confirmation email.');
        setLoading(false);
        return;
      }

      try {
        const bookingData = await getBookingByToken(bookingId, token);
        setBooking(bookingData);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, token]);

  const handleBack = () => {
    router.push('/corporate/history');
  };

  const handleNewQuote = () => {
    router.push('/corporate/quote');
  };

  const handleOpenCancelModal = async () => {
    if (!token) return;

    setCancelError(null);
    setShowCancelModal(true);

    try {
      const preview = await getCancelPreview(bookingId, token);
      setCancelPreview(preview);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to load cancellation details');
    }
  };

  const handleCancel = async () => {
    if (!token) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}?token=${encodeURIComponent(token)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...getTenantHeaders(),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const updated = await getBookingByToken(bookingId, token);
      setBooking(updated);
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!booking) return;

    setJourneyForm({
      pickupAddress: booking.pickupLocation?.address || '',
      pickupPlaceId: booking.pickupLocation?.placeId || '',
      pickupLat: booking.pickupLocation?.lat,
      pickupLng: booking.pickupLocation?.lng,
      dropoffAddress: booking.dropoffLocation?.address || '',
      dropoffPlaceId: booking.dropoffLocation?.placeId || '',
      dropoffLat: booking.dropoffLocation?.lat,
      dropoffLng: booking.dropoffLocation?.lng,
      pickupDateTime: new Date(booking.pickupTime),
      returnDateTime: booking.returnPickupTime ? new Date(booking.returnPickupTime) : null,
      vehicleType: booking.vehicleType || 'standard',
      passengers: booking.passengers,
      luggage: booking.luggage || 0,
      returnJourney: booking.returnJourney || false,
      specialRequests: booking.specialRequests || '',
      flightNumber: booking.flightNumber || '',
      trainNumber: booking.trainNumber || '',
      returnFlightNumber: booking.returnFlightNumber || '',
      returnTrainNumber: booking.returnTrainNumber || '',
    });
    setEditStep('form');
    setAmendmentQuote(null);
    setEditError(null);
    setShowEditModal(true);
  };

  const hasJourneyChanges = (): boolean => {
    if (!booking || !journeyForm) return false;

    return (
      journeyForm.pickupPlaceId !== (booking.pickupLocation?.placeId || '') ||
      journeyForm.dropoffPlaceId !== (booking.dropoffLocation?.placeId || '') ||
      journeyForm.pickupDateTime?.toISOString() !== booking.pickupTime ||
      journeyForm.vehicleType !== (booking.vehicleType || 'standard') ||
      journeyForm.passengers !== booking.passengers ||
      journeyForm.luggage !== (booking.luggage || 0) ||
      journeyForm.returnJourney !== (booking.returnJourney || false) ||
      (journeyForm.returnJourney && journeyForm.returnDateTime?.toISOString() !== booking.returnPickupTime)
    );
  };

  const handleSimpleUpdate = async () => {
    if (!token || !journeyForm) return;

    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}?token=${encodeURIComponent(token)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getTenantHeaders() },
        body: JSON.stringify({
          specialRequests: journeyForm.specialRequests,
          flightNumber: journeyForm.flightNumber,
          trainNumber: journeyForm.trainNumber,
          returnFlightNumber: journeyForm.returnFlightNumber,
          returnTrainNumber: journeyForm.returnTrainNumber,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update booking');
    }

    const updated = await getBookingByToken(bookingId, token);
    setBooking(updated);
    setShowEditModal(false);
  };

  const handleGetAmendmentQuote = async () => {
    if (!token || !journeyForm) return;

    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}/amend?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getTenantHeaders() },
        body: JSON.stringify({
          pickupLocation: {
            address: journeyForm.pickupAddress,
            placeId: journeyForm.pickupPlaceId,
            lat: journeyForm.pickupLat,
            lng: journeyForm.pickupLng,
          },
          dropoffLocation: {
            address: journeyForm.dropoffAddress,
            placeId: journeyForm.dropoffPlaceId,
            lat: journeyForm.dropoffLat,
            lng: journeyForm.dropoffLng,
          },
          pickupTime: journeyForm.pickupDateTime?.toISOString(),
          returnJourney: journeyForm.returnJourney,
          returnPickupTime: journeyForm.returnDateTime?.toISOString(),
          vehicleType: journeyForm.vehicleType,
          passengers: journeyForm.passengers,
          luggage: journeyForm.luggage,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get quote');
    }

    const quote = await response.json();
    setAmendmentQuote(quote);
    setEditStep('review');
  };

  const handleSubmitEdit = async () => {
    if (!token || !journeyForm) return;

    setSaving(true);
    setEditError(null);

    try {
      const journeyChanged = hasJourneyChanges();

      if (!journeyChanged) {
        await handleSimpleUpdate();
      } else {
        await handleGetAmendmentQuote();
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update booking');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAmendment = async () => {
    if (!token) return;

    setSaving(true);
    setEditError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}/amend/confirm?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getTenantHeaders() },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to confirm amendment');
      }

      const updated = await getBookingByToken(bookingId, token);
      setBooking(updated);

      setEditStep('success');
      setTimeout(() => {
        setShowEditModal(false);
        setEditStep('form');
      }, 2000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to confirm amendment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CorporateLayout pageTitle="Booking Details">
        <div className="max-w-2xl mx-auto py-12 text-center">
          <div className="corp-loading-spinner w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" />
          <p className="corp-page-subtitle">Loading your booking...</p>
        </div>
      </CorporateLayout>
    );
  }

  if (error || !booking) {
    return (
      <CorporateLayout pageTitle="Booking Details">
        <div className="max-w-2xl mx-auto py-12 text-center">
          <div className="corp-card rounded-lg p-6 mb-6 border-l-4 border-l-[var(--corp-error)]">
            <h2 className="text-lg font-semibold mb-2">Booking Not Found</h2>
            <p className="corp-page-subtitle mb-4">
              {error || 'This booking link is invalid or has expired.'}
            </p>
          </div>
          <button onClick={handleNewQuote} className="corp-btn corp-btn-primary">
            Get a New Quote
          </button>
        </div>
      </CorporateLayout>
    );
  }

  const totalPrice = booking.pricing?.totalPrice || 0;
  const canModify = booking.status !== 'cancelled' && booking.status !== 'completed';

  return (
    <CorporateLayout pageTitle="Booking Details">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="corp-link flex items-center gap-2 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Booking History
        </button>

        {/* Status Banner */}
        <div className="mb-6">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeClass(booking.status)}`}>
            {getStatusLabel(booking.status)}
          </span>
        </div>

        {/* Booking Reference */}
        <div className="corp-card rounded-lg p-6 mb-6 border-l-4 border-l-[var(--corp-accent)]">
          <p className="text-sm corp-page-subtitle mb-1">Booking Reference</p>
          <p className="text-2xl font-bold text-[var(--corp-accent)]">{booking.bookingId}</p>
        </div>

        {/* Journey Details */}
        <div className="corp-card rounded-lg mb-6 overflow-hidden">
          <div className="p-6 border-b corp-border">
            <h2 className="text-lg font-semibold mb-4">Journey Details</h2>

            <div className="space-y-4">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--corp-success-bg)] flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[var(--corp-success)]"></div>
                </div>
                <div>
                  <p className="text-sm corp-page-subtitle">Pickup</p>
                  <p className="font-medium">{booking.pickupLocation?.address || 'Not specified'}</p>
                  <p className="text-sm text-[var(--corp-accent)] mt-1">
                    {formatDate(booking.pickupTime)} at {formatTime(booking.pickupTime)}
                  </p>
                  {booking.flightNumber && (
                    <p className="text-sm corp-page-subtitle mt-1">
                      Flight: {booking.flightNumber}
                    </p>
                  )}
                  {booking.trainNumber && (
                    <p className="text-sm corp-page-subtitle mt-1">
                      Train: {booking.trainNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Waypoints */}
              {booking.waypoints && booking.waypoints.length > 0 && (
                booking.waypoints.map((waypoint, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--corp-info-bg)] flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[var(--corp-info)]"></div>
                    </div>
                    <div>
                      <p className="text-sm corp-page-subtitle">Stop {index + 1}</p>
                      <p className="font-medium">{waypoint.address}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Dropoff */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--corp-error-bg)] flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[var(--corp-error)]"></div>
                </div>
                <div>
                  <p className="text-sm corp-page-subtitle">Drop-off</p>
                  <p className="font-medium">{booking.dropoffLocation?.address || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Return Journey */}
          {booking.returnJourney && booking.returnPickupTime && (
            <div className="p-6 border-b corp-border bg-[var(--corp-bg-hover)]">
              <h3 className="text-md font-semibold mb-3">Return Journey</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="corp-page-subtitle">From:</span>{' '}
                  <span className="font-medium">{booking.dropoffLocation?.address}</span>
                </p>
                <p className="text-sm">
                  <span className="corp-page-subtitle">To:</span>{' '}
                  <span className="font-medium">{booking.pickupLocation?.address}</span>
                </p>
                <p className="text-sm text-[var(--corp-accent)]">
                  {formatDate(booking.returnPickupTime)} at {formatTime(booking.returnPickupTime)}
                </p>
                {booking.returnFlightNumber && (
                  <p className="text-sm corp-page-subtitle">
                    Flight: {booking.returnFlightNumber}
                  </p>
                )}
                {booking.returnTrainNumber && (
                  <p className="text-sm corp-page-subtitle">
                    Train: {booking.returnTrainNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Booking Info */}
          <div className="p-6 border-b corp-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm corp-page-subtitle">Vehicle</p>
                <p className="font-medium capitalize">{booking.vehicleType || 'Standard'}</p>
              </div>
              <div>
                <p className="text-sm corp-page-subtitle">Passengers</p>
                <p className="font-medium">{booking.passengers}</p>
              </div>
              {booking.luggage !== undefined && booking.luggage > 0 && (
                <div>
                  <p className="text-sm corp-page-subtitle">Luggage</p>
                  <p className="font-medium">{booking.luggage} items</p>
                </div>
              )}
              {booking.journeyType === 'by-the-hour' && booking.durationHours && (
                <div>
                  <p className="text-sm corp-page-subtitle">Duration</p>
                  <p className="font-medium">{booking.durationHours} hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="p-6 border-b corp-border bg-[var(--corp-warning-bg)]">
              <p className="text-sm font-medium text-[var(--corp-warning)] mb-1">Special Requests</p>
              <p className="text-sm">{booking.specialRequests}</p>
            </div>
          )}

          {/* Pricing */}
          <div className="p-6">
            <div className="flex justify-between items-center">
              <p className="text-lg font-semibold">Total Price</p>
              <p className="text-2xl font-bold text-[var(--corp-accent)]">{formatPrice(totalPrice)}</p>
            </div>
            {booking.pricing?.fees?.vat && booking.pricing.fees.vat > 0 && (
              <p className="text-sm corp-page-subtitle mt-1 text-right">
                Includes VAT at {booking.pricing.fees.vatRate || 20}%
              </p>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div className="corp-card rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Contact Details</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="corp-page-subtitle">Name:</span>{' '}
                <span className="font-medium">{booking.customer.name}</span>
              </p>
              <p className="text-sm">
                <span className="corp-page-subtitle">Email:</span>{' '}
                <span className="font-medium">{booking.customer.email}</span>
              </p>
              <p className="text-sm">
                <span className="corp-page-subtitle">Phone:</span>{' '}
                <span className="font-medium">{booking.customer.phone}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Self-Service Actions */}
        {canModify && (
          <div className="corp-card rounded-lg mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Manage Your Booking</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleOpenEditModal}
                  className="corp-btn corp-btn-secondary flex-1"
                >
                  Edit Booking
                </button>
                <button
                  onClick={handleOpenCancelModal}
                  className="corp-btn corp-btn-danger flex-1"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Quote Button */}
        <div className="mt-8 text-center">
          <button onClick={handleNewQuote} className="corp-btn corp-btn-primary">
            Need another transfer? Get a quote
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="corp-card rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Cancel Booking?</h3>

            {cancelError && (
              <div className="bg-[var(--corp-error-bg)] border border-[var(--corp-error)] rounded-lg p-3 mb-4 text-sm text-[var(--corp-error)]">
                {cancelError}
              </div>
            )}

            {!cancelPreview && !cancelError && (
              <div className="flex items-center justify-center py-6">
                <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin" />
              </div>
            )}

            {cancelPreview && (
              <>
                <div className={`rounded-lg p-4 mb-4 ${cancelPreview.isFreeCancel ? 'bg-[var(--corp-success-bg)] border border-[var(--corp-success)]' : 'bg-[var(--corp-warning-bg)] border border-[var(--corp-warning)]'}`}>
                  {cancelPreview.isFreeCancel ? (
                    <p className="text-sm">
                      <span className="font-semibold">Free cancellation</span> - full refund of {formatPrice(cancelPreview.refundAmount)}
                    </p>
                  ) : (
                    <div className="text-sm">
                      <p className="font-semibold mb-2">Cancellation fee applies</p>
                      <p>Original amount: {formatPrice(cancelPreview.originalAmount)}</p>
                      <p>Cancellation fee ({cancelPreview.cancellationFeePercent}%): {formatPrice(cancelPreview.cancellationFee)}</p>
                      <p className="font-semibold mt-1">Refund amount: {formatPrice(cancelPreview.refundAmount)}</p>
                      <p className="text-xs mt-2 corp-page-subtitle">Free cancellation available up to {cancelPreview.freeCancellationHours} hours before pickup.</p>
                    </div>
                  )}
                </div>

                <p className="text-sm corp-page-subtitle mb-6">
                  Are you sure you want to cancel booking <span className="font-semibold">{booking.bookingId}</span>?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelling}
                    className="corp-btn corp-btn-secondary flex-1"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="corp-btn corp-btn-danger flex-1"
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal - Step 1: Form */}
      {showEditModal && editStep === 'form' && journeyForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="corp-card rounded-xl max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-6">Edit Booking</h3>

            {editError && (
              <div className="bg-[var(--corp-error-bg)] border border-[var(--corp-error)] rounded-lg p-3 mb-4 text-sm text-[var(--corp-error)]">
                {editError}
              </div>
            )}

            {/* Journey Details Section */}
            <div className="space-y-6 mb-6">
              <h4 className="font-medium text-[var(--corp-accent)] border-b corp-border pb-2">Journey Details</h4>

              {/* Pickup Location */}
              <LocationInput
                label="Pickup Location"
                value={journeyForm.pickupAddress}
                onSelect={(address: string, placeId: string, locationType?: LocationType, lat?: number, lng?: number) => {
                  setJourneyForm({
                    ...journeyForm,
                    pickupAddress: address,
                    pickupPlaceId: placeId,
                    pickupLat: lat,
                    pickupLng: lng,
                  });
                }}
                placeholder="Enter pickup address"
              />

              {/* Dropoff Location */}
              <LocationInput
                label="Drop-off Location"
                value={journeyForm.dropoffAddress}
                onSelect={(address: string, placeId: string, locationType?: LocationType, lat?: number, lng?: number) => {
                  setJourneyForm({
                    ...journeyForm,
                    dropoffAddress: address,
                    dropoffPlaceId: placeId,
                    dropoffLat: lat,
                    dropoffLng: lng,
                  });
                }}
                placeholder="Enter drop-off address"
                isDropoff
              />

              {/* Pickup Date/Time */}
              <DateTimePicker
                selectedDate={journeyForm.pickupDateTime}
                onChange={(date: Date) => setJourneyForm({ ...journeyForm, pickupDateTime: date })}
              />

              {/* Return Journey Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="returnJourney"
                  checked={journeyForm.returnJourney}
                  onChange={(e) => setJourneyForm({ ...journeyForm, returnJourney: e.target.checked })}
                  className="w-5 h-5 rounded border-[var(--corp-border-default)] text-[var(--corp-accent)] focus:ring-[var(--corp-accent)]"
                />
                <label htmlFor="returnJourney" className="text-sm font-medium">
                  Include return journey
                </label>
              </div>

              {/* Return Date/Time (if return journey) */}
              {journeyForm.returnJourney && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Return Pickup Date & Time *
                  </label>
                  <DateTimePicker
                    selectedDate={journeyForm.returnDateTime}
                    onChange={(date: Date) => setJourneyForm({ ...journeyForm, returnDateTime: date })}
                  />
                </div>
              )}

              {/* Passengers & Luggage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PassengerCounter
                  count={journeyForm.passengers}
                  onChange={(count: number) => setJourneyForm({ ...journeyForm, passengers: count })}
                />
                <LuggageCounter
                  count={journeyForm.luggage}
                  onChange={(count: number) => setJourneyForm({ ...journeyForm, luggage: count })}
                />
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Vehicle Type</label>
                <select
                  value={journeyForm.vehicleType}
                  onChange={(e) => setJourneyForm({ ...journeyForm, vehicleType: e.target.value })}
                  className="corp-input w-full h-12 px-4 rounded-xl"
                >
                  <option value="standard">Standard Saloon</option>
                  <option value="executive">Executive</option>
                  <option value="minibus">Minibus (up to 8)</option>
                </select>
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4 border-t corp-border pt-6">
              <h4 className="font-medium text-[var(--corp-accent)]">Additional Details</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Flight Number (Outbound)
                  </label>
                  <input
                    type="text"
                    value={journeyForm.flightNumber}
                    onChange={(e) => setJourneyForm({ ...journeyForm, flightNumber: e.target.value })}
                    placeholder="e.g. BA123"
                    className="corp-input w-full h-10 px-3 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Train Number (Outbound)
                  </label>
                  <input
                    type="text"
                    value={journeyForm.trainNumber}
                    onChange={(e) => setJourneyForm({ ...journeyForm, trainNumber: e.target.value })}
                    placeholder="e.g. GWR1234"
                    className="corp-input w-full h-10 px-3 rounded-lg"
                  />
                </div>
              </div>

              {journeyForm.returnJourney && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Flight Number (Return)
                    </label>
                    <input
                      type="text"
                      value={journeyForm.returnFlightNumber}
                      onChange={(e) => setJourneyForm({ ...journeyForm, returnFlightNumber: e.target.value })}
                      placeholder="e.g. BA456"
                      className="corp-input w-full h-10 px-3 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Train Number (Return)
                    </label>
                    <input
                      type="text"
                      value={journeyForm.returnTrainNumber}
                      onChange={(e) => setJourneyForm({ ...journeyForm, returnTrainNumber: e.target.value })}
                      placeholder="e.g. GWR5678"
                      className="corp-input w-full h-10 px-3 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Special Requests
                </label>
                <textarea
                  value={journeyForm.specialRequests}
                  onChange={(e) => setJourneyForm({ ...journeyForm, specialRequests: e.target.value })}
                  placeholder="Any special requirements..."
                  rows={3}
                  className="corp-input w-full px-3 py-2 rounded-lg resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t corp-border">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="corp-btn corp-btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={saving}
                className="corp-btn corp-btn-primary flex-1"
              >
                {saving ? 'Checking...' : 'Update Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Step 2: Price Review */}
      {showEditModal && editStep === 'review' && amendmentQuote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="corp-card rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Review Price Change</h3>

            {editError && (
              <div className="bg-[var(--corp-error-bg)] border border-[var(--corp-error)] rounded-lg p-3 mb-4 text-sm text-[var(--corp-error)]">
                {editError}
              </div>
            )}

            {/* Price Comparison */}
            <div className="bg-[var(--corp-bg-hover)] rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="corp-page-subtitle">Original price:</span>
                <span>{amendmentQuote.original.displayPrice}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="corp-page-subtitle">New price:</span>
                <span className="font-semibold">{amendmentQuote.amended.displayPrice}</span>
              </div>
              <div className="flex justify-between pt-2 border-t corp-border">
                <span className="font-medium">Difference:</span>
                <span className={`font-bold ${
                  amendmentQuote.priceDifference.isIncrease ? 'text-[var(--corp-error)]' : 'text-[var(--corp-success)]'
                }`}>
                  {amendmentQuote.priceDifference.displayAmount}
                </span>
              </div>
            </div>

            {/* Payment/Refund Note */}
            {amendmentQuote.priceDifference.isIncrease && (
              <div className="bg-[var(--corp-warning-bg)] border border-[var(--corp-warning)] rounded-lg p-3 mb-4 text-sm">
                Additional payment of {amendmentQuote.priceDifference.displayAmount} will be required.
              </div>
            )}
            {amendmentQuote.priceDifference.amount < 0 && (
              <div className="bg-[var(--corp-success-bg)] border border-[var(--corp-success)] rounded-lg p-3 mb-4 text-sm">
                You will receive a refund of {amendmentQuote.priceDifference.displayAmount.replace('+', '').replace('-', '')}.
              </div>
            )}
            {amendmentQuote.priceDifference.amount === 0 && (
              <div className="bg-[var(--corp-info-bg)] border border-[var(--corp-info)] rounded-lg p-3 mb-4 text-sm">
                No price change for these updates.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEditStep('form')}
                disabled={saving}
                className="corp-btn corp-btn-secondary flex-1"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmAmendment}
                disabled={saving}
                className="corp-btn corp-btn-primary flex-1"
              >
                {saving ? 'Confirming...' : 'Confirm Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Step 3: Success */}
      {showEditModal && editStep === 'success' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="corp-card rounded-xl max-w-md w-full p-6 text-center">
            <div className="w-16 h-16 bg-[var(--corp-success-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--corp-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Booking Updated!</h3>
            <p className="corp-page-subtitle text-sm">
              Your booking has been successfully updated. You will receive a confirmation email shortly.
            </p>
          </div>
        </div>
      )}
    </CorporateLayout>
  );
}

export default function CorporateBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="corp-loading-spinner w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" />
          <p className="corp-page-subtitle">Loading...</p>
        </div>
      </div>
    }>
      <CorporateBookingContent />
    </Suspense>
  );
}
