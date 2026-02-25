'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Users, Car, CreditCard, Plane, FileText, Activity, CheckCircle, AlertCircle, XCircle, PlusCircle } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';
import { getTenantHeaders } from '@/lib/config/tenant';

// API response format from GET /corporate/bookings/{bookingId}
interface CorporateBookingResponse {
  bookingId: string;
  pickupTime: string | null;
  status: string;
  vehicleType: string | null;
  passengers: number | null;
  specialRequirements: string | null;
  flightNumber: string | null;
  createdAt: string | null;
  bookedBy: string;
  price: number; // in pence
  pickup: {
    address: string;
    postcode: string;
  };
  dropoff: {
    address: string;
    postcode: string;
  };
  passenger: {
    name: string;
    phone: string;
    email: string;
  };
}

// Internal format for display (mapped from API response)
interface BookingData {
  bookingId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  pickupTime: string;
  pickupLocation: { address: string };
  dropoffLocation: { address: string };
  vehicleType: string;
  journeyType: 'one-way' | 'round-trip' | 'by-the-hour';
  passengers: number;
  flightNumber?: string;
  specialRequests?: string;
  pricing: { totalPrice: number };
  createdAt: string;
}

/**
 * Map API response to internal BookingData format
 */
function mapApiResponseToBookingData(response: CorporateBookingResponse): BookingData {
  return {
    bookingId: response.bookingId,
    status: (response.status?.toLowerCase() || 'pending') as BookingData['status'],
    customer: {
      name: response.passenger.name,
      email: response.passenger.email,
      phone: response.passenger.phone,
    },
    pickupTime: response.pickupTime || '',
    pickupLocation: { address: response.pickup.address },
    dropoffLocation: { address: response.dropoff.address },
    vehicleType: response.vehicleType || 'Standard',
    journeyType: 'one-way', // API doesn't include this yet
    passengers: response.passengers || 1,
    flightNumber: response.flightNumber || undefined,
    specialRequests: response.specialRequirements || undefined,
    pricing: { totalPrice: response.price },
    createdAt: response.createdAt || new Date().toISOString(),
  };
}

interface Props {
  bookingId: string;
  onClose: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'corp-badge-warning';
    case 'confirmed':
      return 'corp-badge-success';
    case 'completed':
      return 'corp-badge-info';
    case 'cancelled':
      return 'corp-badge-danger';
    default:
      return 'corp-badge-neutral';
  }
}

type TabType = 'details' | 'activity';

interface ActivityEvent {
  type: 'created' | 'confirmed' | 'status_change' | 'modified' | 'cancelled' | 'completed';
  timestamp: string;
  description: string;
  details?: string;
}

function getActivityIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'created':
      return <PlusCircle className="w-4 h-4 text-[var(--corp-accent)]" />;
    case 'confirmed':
      return <CheckCircle className="w-4 h-4 text-[var(--corp-success)]" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-[var(--corp-info)]" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-[var(--corp-error)]" />;
    case 'modified':
      return <AlertCircle className="w-4 h-4 text-[var(--corp-warning)]" />;
    default:
      return <Activity className="w-4 h-4 text-[var(--corp-text-secondary)]" />;
  }
}

function generateActivityEvents(booking: BookingData): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Booking created event - always present
  events.push({
    type: 'created',
    timestamp: booking.createdAt,
    description: 'Booking created',
    details: `${booking.journeyType === 'round-trip' ? 'Return' : booking.journeyType === 'by-the-hour' ? 'Hourly' : 'One-way'} transfer for ${booking.passengers} passenger${booking.passengers > 1 ? 's' : ''}`,
  });

  // Status-based events (future: these will come from statusHistory array)
  if (booking.status === 'confirmed') {
    events.push({
      type: 'confirmed',
      timestamp: booking.createdAt, // TODO: Replace with actual confirmation timestamp from statusHistory
      description: 'Booking confirmed',
      details: 'Your booking has been confirmed',
    });
  } else if (booking.status === 'completed') {
    events.push({
      type: 'confirmed',
      timestamp: booking.createdAt,
      description: 'Booking confirmed',
    });
    events.push({
      type: 'completed',
      timestamp: booking.pickupTime, // TODO: Replace with actual completion timestamp
      description: 'Journey completed',
      details: 'Thank you for travelling with us',
    });
  } else if (booking.status === 'cancelled') {
    events.push({
      type: 'cancelled',
      timestamp: booking.createdAt, // TODO: Replace with actual cancellation timestamp
      description: 'Booking cancelled',
    });
  }

  // Sort by timestamp descending (most recent first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function BookingDetailsModal({ bookingId, onClose, onEdit, onCancel }: Props) {
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError('Unable to load booking details');
        setLoading(false);
        return;
      }

      try {
        // Use corporate endpoint with cookie-based auth (no magicToken needed)
        const url = `${API_BASE_URL}${API_ENDPOINTS.corporateBookings}/${bookingId}`;
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include', // Send auth cookie
          headers: {
            'Content-Type': 'application/json',
            ...getTenantHeaders(),
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load booking');
        }

        const data: CorporateBookingResponse = await response.json();
        // Map API response to internal display format
        setBooking(mapApiResponseToBookingData(data));
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const canModify = booking && booking.status !== 'cancelled' && booking.status !== 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Frosted glass overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="corp-card relative rounded-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden shadow-2xl border-2 border-[var(--corp-border-subtle)]">
        {/* Header with stronger visual separation */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b-2 border-[var(--corp-accent)] bg-[var(--corp-bg-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--corp-accent-muted)]">
              <MapPin className="w-5 h-5 text-[var(--corp-accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Booking Details</h2>
              {booking && (
                <p className="text-sm corp-page-subtitle mt-0.5">Ref: <span className="font-mono font-medium">{booking.bookingId}</span></p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--corp-bg-hover)] border border-transparent hover:border-[var(--corp-border-default)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        {booking && !loading && !error && (
          <div className="flex border-b corp-border bg-[var(--corp-bg-surface)]">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-[var(--corp-accent)] border-b-2 border-[var(--corp-accent)] bg-[var(--corp-bg-elevated)]'
                  : 'corp-page-subtitle hover:text-[var(--corp-text-primary)] hover:bg-[var(--corp-bg-hover)]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-[var(--corp-accent)] border-b-2 border-[var(--corp-accent)] bg-[var(--corp-bg-elevated)]'
                  : 'corp-page-subtitle hover:text-[var(--corp-text-primary)] hover:bg-[var(--corp-bg-hover)]'
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity
            </button>
          </div>
        )}

        {/* Content - scrollable with fixed min-height */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 280px)', minHeight: '400px' }}>
          {loading && (
            <div className="text-center py-12">
              <div className="corp-loading-spinner w-10 h-10 border-4 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-sm opacity-70">Loading booking details...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="corp-badge corp-badge-danger px-4 py-2 mb-4">
                {error}
              </div>
              <button onClick={onClose} className="corp-btn corp-btn-secondary">
                Close
              </button>
            </div>
          )}

          {booking && !loading && !error && activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--corp-bg-elevated)] border corp-border">
                <span className={`corp-badge ${getStatusColor(booking.status)} text-sm capitalize`}>
                  {booking.status}
                </span>
                <span className="text-sm corp-page-subtitle">
                  Booked: {formatDate(booking.createdAt)}
                </span>
              </div>

              {/* Journey Details */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2 text-[var(--corp-accent)]">
                  <MapPin className="w-4 h-4" />
                  Journey Details
                </h3>

                {/* Pickup */}
                <div className="pl-6 border-l-3 border-[var(--corp-accent)] space-y-3" style={{ borderLeftWidth: '3px' }}>
                  <div className="p-3 rounded-lg bg-[var(--corp-bg-elevated)]">
                    <p className="text-xs uppercase tracking-wider corp-page-subtitle mb-1">Pickup</p>
                    <p className="font-medium">{booking.pickupLocation?.address || 'Not specified'}</p>
                    <p className="text-sm text-[var(--corp-accent)] mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(booking.pickupTime)} at {formatTime(booking.pickupTime)}
                    </p>
                    {booking.flightNumber && (
                      <p className="text-sm corp-page-subtitle flex items-center gap-1 mt-1">
                        <Plane className="w-3.5 h-3.5" />
                        Flight: {booking.flightNumber}
                      </p>
                    )}
                  </div>

                  {/* Dropoff */}
                  <div className="p-3 rounded-lg bg-[var(--corp-bg-elevated)]">
                    <p className="text-xs uppercase tracking-wider corp-page-subtitle mb-1">Drop-off</p>
                    <p className="font-medium">{booking.dropoffLocation?.address || 'Not specified'}</p>
                  </div>
                </div>

              </div>

              {/* Booking Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--corp-bg-elevated)] border corp-border border-l-3 border-l-[var(--corp-accent)]" style={{ borderLeftWidth: '3px' }}>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider corp-page-subtitle mb-1">
                    <Car className="w-3.5 h-3.5" />
                    Vehicle
                  </div>
                  <p className="font-medium capitalize">{booking.vehicleType || 'Standard'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--corp-bg-elevated)] border corp-border border-l-3 border-l-[var(--corp-accent)]" style={{ borderLeftWidth: '3px' }}>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider corp-page-subtitle mb-1">
                    <Users className="w-3.5 h-3.5" />
                    Passengers
                  </div>
                  <p className="font-medium">{booking.passengers}</p>
                </div>
              </div>

              {/* Special Requests */}
              {booking.specialRequests && (
                <div className="p-4 rounded-lg bg-[var(--corp-warning-bg)] border border-[var(--corp-warning)]">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--corp-warning)] mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    Special Requests
                  </div>
                  <p className="text-sm">{booking.specialRequests}</p>
                </div>
              )}

              {/* Contact Details */}
              <div className="p-4 rounded-lg bg-[var(--corp-bg-elevated)] border corp-border">
                <h3 className="font-medium flex items-center gap-2 mb-3 text-[var(--corp-accent)]">
                  <Users className="w-4 h-4" />
                  Contact Details
                </h3>
                <div className="text-sm space-y-1">
                  <p><span className="corp-page-subtitle">Name:</span> {booking.customer.name}</p>
                  <p><span className="corp-page-subtitle">Email:</span> {booking.customer.email}</p>
                  <p><span className="corp-page-subtitle">Phone:</span> {booking.customer.phone}</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--corp-accent-muted)] border border-[var(--corp-accent)]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[var(--corp-accent)]" />
                  <span className="font-medium">Total Price</span>
                </div>
                <span className="text-xl font-bold text-[var(--corp-accent)]">
                  {formatPrice(booking.pricing?.totalPrice || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {booking && !loading && !error && activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-[var(--corp-accent)]" />
                <h3 className="font-medium">Booking Activity</h3>
              </div>

              {/* Activity Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-[var(--corp-border-default)]" />

                {/* Activity Events */}
                <div className="space-y-4">
                  {generateActivityEvents(booking).map((event, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Icon with background */}
                      <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-[var(--corp-bg-surface)] border-2 corp-border flex items-center justify-center">
                        {getActivityIcon(event.type)}
                      </div>

                      {/* Event content */}
                      <div className="flex-1 p-3 rounded-lg bg-[var(--corp-bg-elevated)] border corp-border">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{event.description}</p>
                          <span className="text-xs corp-page-subtitle whitespace-nowrap">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        {event.details && (
                          <p className="text-sm corp-page-subtitle mt-1">{event.details}</p>
                        )}
                        <p className="text-xs corp-page-subtitle mt-2">
                          {formatTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Future status updates note */}
              <div className="mt-6 p-4 rounded-lg bg-[var(--corp-bg-elevated)] border corp-border border-dashed">
                <p className="text-sm corp-page-subtitle text-center">
                  Status updates will appear here when your booking is being fulfilled
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {booking && !loading && !error && (
          <div className="p-6 border-t corp-border flex flex-col sm:flex-row gap-3 bg-[var(--corp-bg-elevated)]">
            <button
              onClick={onClose}
              className="corp-btn corp-btn-secondary flex-1"
            >
              Close
            </button>
            {canModify && onEdit && (
              <button
                onClick={onEdit}
                className="corp-btn corp-btn-secondary flex-1"
              >
                Edit Booking
              </button>
            )}
            {canModify && onCancel && (
              <button
                onClick={onCancel}
                className="corp-btn corp-btn-danger flex-1"
              >
                Cancel Booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}