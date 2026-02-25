'use client';

import { CalendarPlus, Star, Users, Settings, History, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import CorporateLayout from '@/components/corporate/CorporateLayout';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getDashboard } from '@/lib/services/corporateApi';

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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export default function CorporateDashboardPage() {
  const { user, isAdmin } = useRequireCorporateAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecentBookings, setShowRecentBookings] = useState(false);

  useEffect(() => {
    if (user) {
      getDashboard()
        .then(setDashboard)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  return (
    <CorporateLayout welcomeMessage={`Welcome back, ${user?.name || 'Guest'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Stats Grid - 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="corp-card corp-stat-card p-5">
            <p className="corp-stat-label text-sm font-medium">Team Members</p>
            <p className="corp-stat-value mt-2 text-3xl font-bold">
              {isLoading ? '-' : dashboard?.stats.teamMembers || 0}
            </p>
          </div>
          <div className="corp-card corp-stat-card p-5">
            <p className="corp-stat-label text-sm font-medium">Total Bookings</p>
            <p className="corp-stat-value mt-2 text-3xl font-bold">
              {isLoading ? '-' : dashboard?.stats.totalBookings || 0}
            </p>
          </div>
          <div className="corp-card corp-stat-card p-5">
            <p className="corp-stat-label text-sm font-medium">Account Status</p>
            <div className="mt-2">
              <span className={`corp-badge ${dashboard?.company?.status === 'active' ? 'corp-badge-success' : 'corp-badge-neutral'}`}>
                {isLoading ? '-' : (dashboard?.company?.status || 'active')}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="corp-section-title text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Book Now - Primary */}
            <Link
              href="/corporate/quote"
              className="corp-card corp-action-card-primary p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="corp-action-icon-sage w-12 h-12 rounded-full flex items-center justify-center">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Book Now</p>
                <p className="text-sm opacity-80 mt-0.5">Get your corporate rate</p>
              </div>
            </Link>

            {/* Favourite Trips */}
            <Link
              href="/corporate/trips"
              className="corp-card p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="corp-action-icon-sage w-12 h-12 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Favourite Trips</p>
                <p className="text-sm opacity-70 mt-0.5">Quick rebook saved routes</p>
              </div>
            </Link>

            {/* Passengers */}
            <Link
              href="/corporate/passengers"
              className="corp-card p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="corp-action-icon-sage w-12 h-12 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Passengers</p>
                <p className="text-sm opacity-70 mt-0.5">Manage traveller details</p>
              </div>
            </Link>

            {/* Preferences */}
            <Link
              href="/corporate/settings/preferences"
              className="corp-card p-5 rounded-xl flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className="corp-action-icon-sage w-12 h-12 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Preferences</p>
                <p className="text-sm opacity-70 mt-0.5">Name boards & branding</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Bookings - Collapsible */}
        <div className="corp-card">
          <button
            type="button"
            onClick={() => setShowRecentBookings(!showRecentBookings)}
            className="w-full p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 corp-icon" />
              <h2 className="corp-section-title text-lg font-semibold">Recent Bookings</h2>
              {dashboard?.recentBookings && dashboard.recentBookings.length > 0 && (
                <span className="corp-badge corp-badge-neutral text-xs">
                  {dashboard.recentBookings.length}
                </span>
              )}
            </div>
            {showRecentBookings ? (
              <ChevronUp className="w-5 h-5 corp-icon" />
            ) : (
              <ChevronDown className="w-5 h-5 corp-icon" />
            )}
          </button>

          {showRecentBookings && (
            <div className="px-5 pb-5 border-t corp-border">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" />
                </div>
              ) : dashboard?.recentBookings && dashboard.recentBookings.length > 0 ? (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="corp-table-header-sage">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Passenger</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">Booked By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Route</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y corp-border">
                      {dashboard.recentBookings.slice(0, 5).map((booking) => (
                        <tr key={booking.id} className="corp-table-row">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {formatBookingDate(booking.date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {booking.passengerName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm opacity-70 hidden md:table-cell">
                            {booking.bookedBy || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm opacity-70 max-w-xs truncate hidden lg:table-cell">
                            {booking.pickup} → {booking.dropoff}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="corp-badge corp-badge-success text-xs">
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboard.recentBookings.length > 5 && (
                    <div className="mt-4 text-center">
                      <Link
                        href="/corporate/history"
                        className="corp-link text-sm font-medium"
                      >
                        View all bookings →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="mx-auto h-12 w-12 opacity-30" />
                  <p className="mt-2 text-sm opacity-70">No bookings yet</p>
                  <Link
                    href="/corporate/quote"
                    className="mt-4 inline-block corp-link text-sm font-medium"
                  >
                    Book your first transfer →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin Quick Link */}
        {isAdmin && (
          <div className="mt-6">
            <Link
              href="/corporate/team"
              className="corp-card corp-card-admin p-4 flex items-center justify-between rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="corp-badge corp-badge-admin">Admin</div>
                <span className="font-medium">Manage Team Members</span>
              </div>
              <ChevronDown className="w-5 h-5 -rotate-90" />
            </Link>
          </div>
        )}
      </div>
    </CorporateLayout>
  );
}
