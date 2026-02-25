'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { History, Calendar, MapPin, Car, Search, Filter, ChevronDown, RotateCw, Eye, Edit2, XCircle } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getDashboard } from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';
import BookingDetailsModal from '@/components/corporate/BookingDetailsModal';
import CancelBookingModal from '@/components/corporate/CancelBookingModal';

interface Booking {
  id: string;
  date: string;
  passengerName: string;
  bookedBy: string;
  pickup: string;
  dropoff: string;
  status: string;
  vehicleType?: string;
  pricePence?: number;
  magicToken?: string | null;
}

type ModalMode = 'view' | 'edit' | 'cancel' | null;

// Redirect component for editing - navigates to corporate booking edit page
function EditRedirectModal({ bookingId, magicToken }: { bookingId: string; magicToken: string }) {
  useEffect(() => {
    // Redirect to the corporate booking page which has edit functionality within the corporate layout
    window.location.href = `/corporate/booking/${bookingId}?token=${encodeURIComponent(magicToken)}`;
  }, [bookingId, magicToken]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="corp-card rounded-xl p-8 text-center">
        <div className="corp-loading-spinner w-10 h-10 border-4 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm">Redirecting to edit booking...</p>
      </div>
    </div>
  );
}

function BookingHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useRequireCorporateAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  // Read URL params for deep linking to booking actions
  useEffect(() => {
    const bookingId = searchParams.get('booking');
    const isEdit = searchParams.get('edit') === 'true';
    const isCancel = searchParams.get('cancel') === 'true';

    if (bookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
        if (isCancel) {
          setModalMode('cancel');
        } else if (isEdit) {
          setModalMode('edit');
        } else {
          setModalMode('view');
        }
      }
    }
  }, [searchParams, bookings]);

  useEffect(() => {
    if (user) {
      getDashboard()
        .then((data) => {
          setBookings(data.recentBookings || []);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  const formatDate = useCallback((dateString: string): string => {
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
  }, []);

  const formatPrice = (pence?: number): string => {
    if (!pence) return '-';
    return `£${(pence / 100).toFixed(2)}`;
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = !searchQuery ||
      booking.passengerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.pickup?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.dropoff?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.bookedBy?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = ['all', ...Array.from(new Set(bookings.map(b => b.status)))];

  const openModal = (booking: Booking, mode: ModalMode) => {
    setSelectedBooking(booking);
    setModalMode(mode);
    // Update URL without navigation for deep linking support
    const params = new URLSearchParams();
    params.set('booking', booking.id);
    if (mode === 'edit') params.set('edit', 'true');
    if (mode === 'cancel') params.set('cancel', 'true');
    router.replace(`/corporate/history?${params.toString()}`, { scroll: false });
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setModalMode(null);
    // Clear URL params
    router.replace('/corporate/history', { scroll: false });
  };

  const handleCancelled = () => {
    // Refresh bookings after cancellation
    if (user) {
      getDashboard()
        .then((data) => {
          setBookings(data.recentBookings || []);
        })
        .catch(console.error);
    }
  };

  const handleEditClick = () => {
    // Navigate to corporate booking page which stays within the corporate layout
    if (selectedBooking?.magicToken) {
      router.push(`/corporate/booking/${selectedBooking.id}?token=${encodeURIComponent(selectedBooking.magicToken)}`);
    }
  };

  return (
    <CorporateLayout pageTitle="Booking History">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-[var(--corp-accent-muted)]">
            <History className="h-6 w-6 text-[var(--corp-accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Booking History</h1>
            <p className="text-sm corp-page-subtitle">View and manage all your company bookings</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="corp-card p-4 mb-6 rounded-lg border-l-3 border-l-[var(--corp-accent)]" style={{ borderLeftWidth: '3px' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--corp-text-muted)]" />
              <input
                type="text"
                placeholder="Search by passenger, route, or booker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="corp-input w-full pl-10 pr-4 py-2 rounded-lg"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`corp-btn ${showFilters ? 'corp-btn-primary' : 'corp-btn-secondary'} inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium`}
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t corp-border">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium self-center mr-2">Status:</span>
                {uniqueStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`corp-badge px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                      statusFilter === status
                        ? 'bg-[var(--corp-accent)] text-white'
                        : 'corp-badge-neutral hover:bg-[var(--corp-bg-hover)]'
                    }`}
                  >
                    {status === 'all' ? 'All' : status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="corp-page-subtitle text-sm">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Bookings List */}
        <div className="corp-card rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center">
              <History className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-4 text-sm corp-page-subtitle">
                {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your search'}
              </p>
              {bookings.length === 0 && (
                <Link
                  href="/corporate/quote"
                  className="mt-4 inline-block corp-link text-sm font-medium"
                >
                  Book your first transfer →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y corp-border">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="p-4 sm:p-6 corp-list-item hover:bg-[var(--corp-bg-hover)] transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Date & Status */}
                    <div className="flex items-center gap-3 lg:w-64">
                      <div className="p-2.5 rounded-lg bg-[var(--corp-accent-muted)]">
                        <Calendar className="h-4 w-4 text-[var(--corp-accent)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDate(booking.date)}</p>
                        <span className={`corp-badge text-xs mt-1 ${
                          booking.status === 'completed' ? 'corp-badge-success' :
                          booking.status === 'confirmed' ? 'corp-badge-info' :
                          booking.status === 'cancelled' ? 'corp-badge-danger' :
                          'corp-badge-neutral'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1 pl-4 border-l-2 border-[var(--corp-border-default)]">
                        <div className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-[var(--corp-accent)] mt-1.5 flex-shrink-0" />
                          <span className="truncate corp-page-subtitle">{booking.pickup}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-[var(--corp-error)] mt-1.5 flex-shrink-0" />
                          <span className="truncate corp-page-subtitle">{booking.dropoff}</span>
                        </div>
                      </div>
                    </div>

                    {/* Passenger & Booker */}
                    <div className="lg:w-48 text-sm p-2 rounded-lg bg-[var(--corp-bg-elevated)]">
                      <p className="font-medium truncate">{booking.passengerName || '-'}</p>
                      <p className="corp-page-subtitle truncate text-xs">Booked by {booking.bookedBy || '-'}</p>
                    </div>

                    {/* Vehicle & Price */}
                    <div className="flex items-center gap-4 lg:w-40">
                      {booking.vehicleType && (
                        <div className="flex items-center gap-1 text-sm corp-page-subtitle">
                          <Car className="h-4 w-4" />
                          <span className="capitalize">{booking.vehicleType}</span>
                        </div>
                      )}
                      {booking.pricePence && (
                        <span className="text-sm font-bold text-[var(--corp-accent)]">{formatPrice(booking.pricePence)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(booking, 'view')}
                        className="p-2 rounded-lg hover:bg-[var(--corp-bg-hover)] border border-transparent hover:border-[var(--corp-border-default)] transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 corp-icon" />
                      </button>
                      {(booking.status === 'confirmed' || booking.status === 'pending') && booking.magicToken && (
                        <>
                          <button
                            type="button"
                            onClick={() => openModal(booking, 'edit')}
                            className="p-2 rounded-lg hover:bg-[var(--corp-bg-hover)] border border-transparent hover:border-[var(--corp-border-default)] transition-colors"
                            title="Edit Booking"
                          >
                            <Edit2 className="w-4 h-4 corp-icon" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal(booking, 'cancel')}
                            className="p-2 rounded-lg hover:bg-[var(--corp-error-bg)] border border-transparent hover:border-[var(--corp-error)] transition-colors text-[var(--corp-error)]"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {(booking.status === 'completed' || booking.status === 'confirmed') && (
                        <Link
                          href={`/corporate/quote`}
                          className="corp-btn corp-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full"
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

      {/* View Details Modal */}
      {modalMode === 'view' && selectedBooking && (
        <BookingDetailsModal
          bookingId={selectedBooking.id}
          onClose={closeModal}
          onEdit={(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? handleEditClick : undefined}
          onCancel={(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') ? () => setModalMode('cancel') : undefined}
        />
      )}

      {/* Edit Modal - Shows loading and redirects */}
      {modalMode === 'edit' && selectedBooking && selectedBooking.magicToken && (
        <EditRedirectModal
          bookingId={selectedBooking.id}
          magicToken={selectedBooking.magicToken}
        />
      )}

      {/* Cancel Modal */}
      {modalMode === 'cancel' && selectedBooking && (
        <CancelBookingModal
          bookingId={selectedBooking.id}
          magicToken={selectedBooking.magicToken || undefined}
          onClose={closeModal}
          onCancelled={handleCancelled}
        />
      )}
    </CorporateLayout>
  );
}

export default function BookingHistoryPage() {
  return (
    <Suspense fallback={
      <CorporateLayout pageTitle="Booking History">
        <div className="max-w-6xl mx-auto">
          <div className="corp-card rounded-lg p-8 text-center">
            <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </CorporateLayout>
    }>
      <BookingHistoryContent />
    </Suspense>
  );
}
