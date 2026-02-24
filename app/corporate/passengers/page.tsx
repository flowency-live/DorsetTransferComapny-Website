'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Mail, Edit2, Trash2, AlertTriangle, CheckCircle, Eye, Calendar } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPassengers,
  deletePassenger,
  type PassengerListItem,
} from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';

export default function PassengersPage() {
  const { user } = useRequireCorporateAuth();
  const [passengers, setPassengers] = useState<PassengerListItem[]>([]);
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
      getPassengers()
        .then((passengersData) => {
          setPassengers(passengersData.passengers);
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
    } catch {
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

  return (
    <CorporateLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="corp-page-title text-2xl font-bold">Passenger Directory</h1>
            <p className="corp-page-subtitle mt-1">
              Manage your frequent passengers for faster bookings
            </p>
          </div>
          <Link
            href="/corporate/passengers/new"
            className="corp-btn corp-btn-primary inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Passenger
          </Link>
        </div>

        {/* Search Bar */}
        <div className="corp-card p-4 mb-6 rounded-lg">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 opacity-50" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="corp-input w-full pl-10 pr-4 py-2 rounded-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              className="corp-btn corp-btn-secondary px-4 py-2 rounded-lg text-sm font-medium"
            >
              Search
            </button>
          </div>
        </div>

        {/* Passengers List */}
        <div className="corp-card rounded-lg">
          <div className="p-6 border-b corp-border flex items-center gap-2">
            <Users className="h-5 w-5 corp-icon" />
            <h2 className="corp-section-title text-lg font-semibold">
              Passengers {!isLoading && `(${passengers.length})`}
            </h2>
          </div>

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" />
            </div>
          ) : passengers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-4 text-sm corp-page-subtitle">
                {searchQuery ? 'No passengers found matching your search' : 'No passengers saved yet'}
              </p>
              <p className="mt-1 text-xs opacity-50">
                Add passengers to quickly select them when booking transfers
              </p>
              <Link
                href="/corporate/passengers/new"
                className="mt-4 inline-flex items-center text-sm font-medium corp-link"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add your first passenger
              </Link>
            </div>
          ) : (
            <div className="divide-y corp-border">
              {passengers.map((passenger) => (
                <div
                  key={passenger.passengerId}
                  className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 corp-list-item"
                >
                  {/* Passenger Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">
                        {formatPassengerName(passenger)}
                      </h3>
                      {passenger.alias && (
                        <span className="corp-badge corp-badge-neutral text-xs">
                          {passenger.alias}
                        </span>
                      )}
                    </div>
                    {passenger.email && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-70">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          {passenger.email}
                        </span>
                      </div>
                    )}
                    {passenger.usageCount > 0 && (
                      <p className="mt-1 text-xs opacity-50">
                        {passenger.usageCount} journey{passenger.usageCount === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Link
                      href={`/corporate/quote?passengerId=${passenger.passengerId}`}
                      className="corp-btn corp-btn-primary inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Quick Book
                    </Link>
                    <Link
                      href={`/corporate/passengers/${passenger.passengerId}`}
                      className="corp-btn corp-btn-secondary inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                    <Link
                      href={`/corporate/passengers/${passenger.passengerId}?edit=true`}
                      className="corp-btn corp-btn-ghost inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(passenger.passengerId, passenger.firstName, passenger.lastName)}
                      className="corp-btn corp-btn-danger-ghost inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full"
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

      {/* Delete Confirmation Modal */}
      {confirmDialog?.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setConfirmDialog(null)}
            />
            <div className="corp-modal relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Delete Passenger?</h3>
                <p className="text-sm opacity-70 mt-2">
                  Are you sure you want to remove <strong>{confirmDialog.name}</strong> from your passenger directory? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="corp-btn corp-btn-secondary flex-1 px-4 py-2 text-sm font-medium rounded-full"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="corp-btn corp-btn-danger flex-1 px-4 py-2 text-sm font-medium rounded-full disabled:opacity-50"
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
    </CorporateLayout>
  );
}
