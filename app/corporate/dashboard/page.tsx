'use client';

import { CalendarPlus, Star, Users, Settings, History, ChevronDown, ChevronUp, Eye, Edit2, XCircle, RefreshCcw, ClipboardCheck, Building2, Percent, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import CorporateLayout from '@/components/corporate/CorporateLayout';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getDashboard } from '@/lib/services/corporateApi';

interface DashboardData {
  company: {
    companyName: string;
    discountPercentage: number;
    cancellationNoticeHours: number | null; // CTO-CONFIG-001
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

// CTO-CONFIG-001: Format cancellation notice hours for display
function formatCancellationNotice(hours: number | null): string {
  if (hours === null) {
    return 'Standard policy applies';
  }
  if (hours === 0) {
    return 'Free cancellation anytime';
  }
  if (hours === 1) {
    return '1 hour notice required';
  }
  if (hours < 24) {
    return `${hours} hours notice required`;
  }
  if (hours === 24) {
    return '24 hours (1 day) notice required';
  }
  if (hours === 48) {
    return '48 hours (2 days) notice required';
  }
  if (hours === 72) {
    return '72 hours (3 days) notice required';
  }
  if (hours === 168) {
    return '7 days notice required';
  }
  return `${hours} hours notice required`;
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
    <CorporateLayout>
      <div className="max-w-6xl mx-auto">
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

        {/* Corporate Account Benefits - CTO-CONFIG-001 */}
        {dashboard?.company && (
          <div className="mb-8">
            <h2 className="corp-section-title text-lg font-semibold mb-4">Your Corporate Benefits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Name */}
              <div className="corp-card p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-sage/10">
                    <Building2 className="w-5 h-5 text-sage" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--corp-text-muted)] uppercase tracking-wider">Account</p>
                    <p className="font-semibold">{dashboard.company.companyName}</p>
                  </div>
                </div>
              </div>

              {/* Corporate Discount */}
              {dashboard.company.discountPercentage > 0 && (
                <div className="corp-card p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--corp-text-muted)] uppercase tracking-wider">Your Discount</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {dashboard.company.discountPercentage}% off all bookings
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation Policy - CTO-CONFIG-001 */}
              <div className="corp-card p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--corp-text-muted)] uppercase tracking-wider">Cancellation Policy</p>
                    <p className="font-semibold">
                      {formatCancellationNotice(dashboard.company.cancellationNoticeHours)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
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
                            <span className={`corp-badge text-xs ${
                              booking.status === 'confirmed' ? 'corp-badge-success' :
                              booking.status === 'completed' ? 'corp-badge-info' :
                              booking.status === 'cancelled' ? 'corp-badge-danger' :
                              'corp-badge-neutral'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/corporate/history?booking=${booking.id}`}
                                className="p-1.5 rounded-md hover:bg-sage/10 transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 corp-icon" />
                              </Link>
                              <Link
                                href={`/corporate/quote?pickupAddress=${encodeURIComponent(booking.pickup)}&dropoffAddress=${encodeURIComponent(booking.dropoff)}`}
                                className="p-1.5 rounded-md hover:bg-sage/10 transition-colors"
                                title="Rebook This Trip"
                              >
                                <RefreshCcw className="w-4 h-4 corp-icon" />
                              </Link>
                              {booking.status === 'confirmed' && (
                                <>
                                  <Link
                                    href={`/corporate/history?booking=${booking.id}&edit=true`}
                                    className="p-1.5 rounded-md hover:bg-sage/10 transition-colors"
                                    title="Edit Booking"
                                  >
                                    <Edit2 className="w-4 h-4 corp-icon" />
                                  </Link>
                                  <Link
                                    href={`/corporate/history?booking=${booking.id}&cancel=true`}
                                    className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-red-500"
                                    title="Cancel Booking"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Link>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-center">
                    <Link
                      href="/corporate/history"
                      className="corp-link text-sm font-medium"
                    >
                      View all bookings →
                    </Link>
                  </div>
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

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6 space-y-4">
            {/* Pending Approvals Card */}
            {dashboard?.stats?.pendingApprovals !== undefined && dashboard.stats.pendingApprovals > 0 && (
              <Link
                href="/corporate/approvals"
                className="corp-card p-4 flex items-center justify-between rounded-lg border-l-4 border-l-amber-500 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <ClipboardCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium">Pending Approvals</p>
                    <p className="text-sm text-[var(--corp-text-muted)]">
                      {dashboard.stats.pendingApprovals} booking{dashboard.stats.pendingApprovals !== 1 ? 's' : ''} awaiting review
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="corp-badge bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    {dashboard.stats.pendingApprovals}
                  </span>
                  <ChevronDown className="w-5 h-5 -rotate-90 corp-icon" />
                </div>
              </Link>
            )}

            {/* Manage Team Link */}
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
