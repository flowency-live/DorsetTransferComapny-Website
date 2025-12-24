'use client';

import { Heart, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import FavouriteTripCard from '@/components/corporate/FavouriteTripCard';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getDashboard, getFavouriteTrips, FavouriteTrip } from '@/lib/services/corporateApi';

interface DashboardData {
  company: {
    companyName: string;
    discountPercentage: number;
    status: string;
  } | null;
  stats: {
    teamMembers: number;
    totalBookings: number;
    totalSpend: number;
    pendingApprovals: number;
  };
  recentBookings: Array<{
    id: string;
    date: string;
    passengerName: string;
    bookedBy: string;
    pickup: string;
    dropoff: string;
    status: string;
  }>;
}

function formatBookingDate(dateString: string): string {
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
}

export default function CorporateDashboardPage() {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [favouriteTrips, setFavouriteTrips] = useState<FavouriteTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Fetch dashboard data
      getDashboard()
        .then(setDashboard)
        .catch(console.error)
        .finally(() => setIsLoading(false));

      // Fetch favourite trips
      getFavouriteTrips()
        .then((data) => setFavouriteTrips(data.trips || []))
        .catch(console.error)
        .finally(() => setTripsLoading(false));
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      {/* Header */}
      <CorporateHeader
        userName={user.name}
        companyName={dashboard?.company?.companyName}
        onLogout={logout}
        isAdmin={isAdmin}
      />

      {/* Main Content with padding for fixed header */}
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy">
              Welcome back, {user.name}
            </h1>
            <p className="text-navy-light/70 mt-1">
              Manage your corporate transfers and team
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
              <p className="text-sm font-medium text-navy-light/70">Team Members</p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {isLoading ? '-' : dashboard?.stats.teamMembers || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
              <p className="text-sm font-medium text-navy-light/70">Total Bookings</p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {isLoading ? '-' : dashboard?.stats.totalBookings || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
              <p className="text-sm font-medium text-navy-light/70">Your Discount</p>
              <p className="mt-2 text-3xl font-bold text-sage">
                {isLoading ? '-' : `${dashboard?.company?.discountPercentage || 0}%`}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
              <p className="text-sm font-medium text-navy-light/70">Account Status</p>
              <p className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dashboard?.company?.status === 'active'
                    ? 'bg-sage/20 text-sage-dark'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isLoading ? '-' : (dashboard?.company?.status || 'active')}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20 mb-8">
            <div className="p-6 border-b border-sage/20">
              <h2 className="text-lg font-semibold text-navy">Quick Actions</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/corporate/quote"
                className="flex items-center p-4 border border-sage/20 rounded-lg hover:bg-sage/5 transition-colors"
              >
                <div className="flex-shrink-0 h-10 w-10 bg-sage/10 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-navy">Book a Transfer</p>
                  <p className="text-sm text-navy-light/70">Get your corporate rate</p>
                </div>
              </Link>

              {isAdmin && (
                <Link
                  href="/corporate/team"
                  className="flex items-center p-4 border border-sage/20 rounded-lg hover:bg-sage/5 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 bg-sage/10 rounded-lg flex items-center justify-center">
                    <svg className="h-6 w-6 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-navy">Manage Team</p>
                    <p className="text-sm text-navy-light/70">Add or remove users</p>
                  </div>
                </Link>
              )}

              <div className="flex items-center p-4 border border-sage/20 rounded-lg bg-sage/5 opacity-50 cursor-not-allowed">
                <div className="flex-shrink-0 h-10 w-10 bg-sage/10 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-navy">View Reports</p>
                  <p className="text-sm text-navy-light/70">Coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Favourite Trips */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20 mb-8">
            <div className="p-6 border-b border-sage/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-sage" />
                <h2 className="text-lg font-semibold text-navy">Favourite Trips</h2>
              </div>
              <Link
                href="/corporate/quote"
                className="inline-flex items-center gap-1 text-sm font-medium text-sage hover:text-sage-dark transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Trip
              </Link>
            </div>
            <div className="p-6">
              {tripsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
                </div>
              ) : favouriteTrips.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favouriteTrips.slice(0, 6).map((trip) => (
                      <FavouriteTripCard key={trip.tripId} trip={trip} compact />
                    ))}
                  </div>
                  {favouriteTrips.length > 6 && (
                    <div className="mt-4 text-center">
                      <Link
                        href="/corporate/trips"
                        className="text-sm font-medium text-sage hover:text-sage-dark"
                      >
                        View all {favouriteTrips.length} trips &rarr;
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Heart className="mx-auto h-12 w-12 text-sage/30" />
                  <p className="mt-2 text-sm text-navy-light/70">No favourite trips saved yet</p>
                  <p className="mt-1 text-xs text-navy-light/50">
                    Save trips after getting a quote for quick rebooking
                  </p>
                  <Link
                    href="/corporate/quote"
                    className="mt-4 inline-block text-sm font-medium text-sage hover:text-sage-dark"
                  >
                    Book a transfer &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20">
            <div className="p-6 border-b border-sage/20">
              <h2 className="text-lg font-semibold text-navy">Recent Bookings</h2>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
                </div>
              ) : dashboard?.recentBookings && dashboard.recentBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-sage/20">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                          Passenger
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                          Booked By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                          Pickup
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                          Drop-off
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage/20">
                      {dashboard.recentBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-navy">
                            {formatBookingDate(booking.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-navy font-medium">
                            {booking.passengerName || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-navy-light/70">
                            {booking.bookedBy || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-navy-light/70 max-w-xs truncate">
                            {booking.pickup}
                          </td>
                          <td className="px-6 py-4 text-sm text-navy-light/70 max-w-xs truncate">
                            {booking.dropoff}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sage/20 text-sage-dark">
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-sage/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-navy-light/70">No bookings yet</p>
                  <Link
                    href="/corporate/quote"
                    className="mt-4 inline-block text-sm font-medium text-sage hover:text-sage-dark"
                  >
                    Book your first transfer &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
