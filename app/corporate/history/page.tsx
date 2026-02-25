'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { History, Calendar, MapPin, Car, Search, Filter, ChevronDown, RotateCw } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getDashboard } from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';

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
}

export default function BookingHistoryPage() {
  const { user } = useRequireCorporateAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  return (
    <CorporateLayout pageTitle="Booking History">
      <div className="max-w-6xl mx-auto">

        {/* Search & Filters */}
        <div className="corp-card p-4 mb-6 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 opacity-50" />
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
                    className={`corp-badge px-3 py-1 text-sm cursor-pointer transition-colors ${
                      statusFilter === status
                        ? 'corp-badge-primary'
                        : 'corp-badge-neutral'
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
                <div key={booking.id} className="p-4 sm:p-6 corp-list-item">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Date & Status */}
                    <div className="flex items-center gap-3 lg:w-64">
                      <div className="corp-icon-wrapper p-2 rounded-lg">
                        <Calendar className="h-4 w-4" />
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
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-sage mt-0.5 flex-shrink-0" />
                          <span className="truncate opacity-80">{booking.pickup}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="truncate opacity-80">{booking.dropoff}</span>
                        </div>
                      </div>
                    </div>

                    {/* Passenger & Booker */}
                    <div className="lg:w-48 text-sm">
                      <p className="font-medium truncate">{booking.passengerName || '-'}</p>
                      <p className="opacity-60 truncate">Booked by {booking.bookedBy || '-'}</p>
                    </div>

                    {/* Vehicle & Price */}
                    <div className="flex items-center gap-4 lg:w-40">
                      {booking.vehicleType && (
                        <div className="flex items-center gap-1 text-sm opacity-70">
                          <Car className="h-4 w-4" />
                          <span className="capitalize">{booking.vehicleType}</span>
                        </div>
                      )}
                      {booking.pricePence && (
                        <span className="text-sm font-medium">{formatPrice(booking.pricePence)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
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
    </CorporateLayout>
  );
}
