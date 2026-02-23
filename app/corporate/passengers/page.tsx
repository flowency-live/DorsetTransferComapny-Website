'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Users, Mail, Edit2, Trash2, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPassengers,
  deletePassenger,
  getDashboard,
  type PassengerListItem,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';

export default function PassengersPage() {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const [passengers, setPassengers] = useState<PassengerListItem[]>([]);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; passengerId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([
        getPassengers(),
        getDashboard()
      ])
        .then(([passengersData, dashboardData]) => {
          setPassengers(passengersData.passengers);
          setCompanyName(dashboardData.company?.companyName);
        })
        .catch((err) => {
          console.error('Failed to load passengers:', err);
          showToast('Failed to load passengers', 'error');
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, showToast]);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPassengers(searchQuery || undefined);
      setPassengers(data.passengers);
    } catch (err) {
      showToast('Failed to search passengers', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, showToast]);

  const handleDeleteClick = (passengerId: string, firstName: string, lastName: string) => {
    setConfirmDialog({ show: true, passengerId, name: `${firstName} ${lastName}` });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDialog) return;

    setIsDeleting(true);
    try {
      await deletePassenger(confirmDialog.passengerId);
      setPassengers(passengers.filter((p) => p.passengerId !== confirmDialog.passengerId));
      showToast('Passenger removed successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove passenger', 'error');
    } finally {
      setIsDeleting(false);
      setConfirmDialog(null);
    }
  };

  const formatPassengerName = (passenger: PassengerListItem): string => {
    const parts = [passenger.title, passenger.firstName, passenger.lastName].filter(Boolean);
    return parts.join(' ');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
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
        <div className="container mx-auto px-4 md:px-6">
          {/* Page Header */}
          <div className="mb-8">
            <Link
              href="/corporate/dashboard"
              className="inline-flex items-center text-sm text-navy-light/70 hover:text-sage transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-navy">Passenger Directory</h1>
                <p className="text-navy-light/70 mt-1">
                  Manage your frequent passengers for faster bookings
                </p>
              </div>
              <Link
                href="/corporate/passengers/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-sage hover:bg-sage-dark transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Passenger
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-4 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-navy-light/50" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy placeholder:text-navy-light/50"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 border border-sage rounded-lg text-sm font-medium text-sage hover:bg-sage/5 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Passengers List */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20">
            <div className="p-6 border-b border-sage/20 flex items-center gap-2">
              <Users className="h-5 w-5 text-sage" />
              <h2 className="text-lg font-semibold text-navy">
                Passengers {!isLoading && `(${passengers.length})`}
              </h2>
            </div>

            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
              </div>
            ) : passengers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-sage/30" />
                <p className="mt-4 text-sm text-navy-light/70">
                  {searchQuery ? 'No passengers found matching your search' : 'No passengers saved yet'}
                </p>
                <p className="mt-1 text-xs text-navy-light/50">
                  Add passengers to quickly select them when booking transfers
                </p>
                <Link
                  href="/corporate/passengers/new"
                  className="mt-4 inline-flex items-center text-sm font-medium text-sage hover:text-sage-dark"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add your first passenger
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-sage/20">
                {passengers.map((passenger) => (
                  <div
                    key={passenger.passengerId}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-sage/5 transition-colors"
                  >
                    {/* Passenger Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-navy truncate">
                          {formatPassengerName(passenger)}
                        </h3>
                        {passenger.alias && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sage/10 text-sage-dark">
                            {passenger.alias}
                          </span>
                        )}
                      </div>
                      {passenger.email && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-navy-light/70">
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                            {passenger.email}
                          </span>
                        </div>
                      )}
                      {passenger.usageCount > 0 && (
                        <p className="mt-1 text-xs text-navy-light/50">
                          {passenger.usageCount} journey{passenger.usageCount === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Link
                        href={`/corporate/passengers/${passenger.passengerId}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-sage border border-sage rounded-full hover:bg-sage/5 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                      <Link
                        href={`/corporate/passengers/${passenger.passengerId}?edit=true`}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-navy-light/70 border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(passenger.passengerId, passenger.firstName, passenger.lastName)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Modal */}
      {confirmDialog?.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-navy/50 transition-opacity"
              onClick={() => setConfirmDialog(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-navy">Delete Passenger?</h3>
                <p className="text-sm text-navy-light/70 mt-2">
                  Are you sure you want to remove <strong>{confirmDialog.name}</strong> from your passenger directory? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-navy bg-white border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-full hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
