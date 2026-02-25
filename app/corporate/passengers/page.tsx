'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Users, Mail, Trash2, AlertTriangle, CheckCircle, MoreVertical, Pencil, Eye } from 'lucide-react';
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <CorporateLayout pageTitle="Passengers">
      <div className="max-w-6xl mx-auto">
        {/* Actions Row */}
        <div className="flex justify-end mb-6">
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

        {/* Passengers Header */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 corp-icon" />
          <h2 className="corp-section-title text-lg font-semibold">
            Passengers {!isLoading && `(${passengers.length})`}
          </h2>
        </div>

        {/* Passengers Grid */}
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" />
          </div>
        ) : passengers.length === 0 ? (
          <div className="corp-card p-12 text-center rounded-lg">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passengers.map((passenger) => (
              <div
                key={passenger.passengerId}
                className="corp-card p-5 rounded-lg hover:shadow-md transition-shadow flex flex-col h-full"
              >
                {/* Header with name and 3-dot menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-lg truncate">
                      {formatPassengerName(passenger)}
                    </h3>
                    {passenger.alias && (
                      <span className="corp-badge corp-badge-neutral text-xs mt-1 inline-block">
                        {passenger.alias}
                      </span>
                    )}
                  </div>
                  <div className="relative" ref={openMenuId === passenger.passengerId ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === passenger.passengerId ? null : passenger.passengerId)}
                      className="p-1 opacity-50 hover:opacity-100 rounded-md hover:bg-[var(--corp-bg-hover)] transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {openMenuId === passenger.passengerId && (
                      <div className="absolute right-0 mt-1 w-36 corp-card rounded-md shadow-lg py-1 z-10">
                        <Link
                          href={`/corporate/passengers/${passenger.passengerId}`}
                          onClick={() => setOpenMenuId(null)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--corp-bg-hover)]"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <Link
                          href={`/corporate/passengers/${passenger.passengerId}?edit=true`}
                          onClick={() => setOpenMenuId(null)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--corp-bg-hover)]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            handleDeleteClick(passenger.passengerId, passenger.firstName, passenger.lastName);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Info - flex-grow to push stats and button to bottom */}
                <div className="space-y-2 mb-4 flex-grow">
                  {passenger.email ? (
                    <div className="flex items-center gap-2 text-sm opacity-70">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{passenger.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm opacity-40">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="italic">No email</span>
                    </div>
                  )}
                </div>

                {/* Usage Stats - fixed height area */}
                <div className="flex flex-wrap gap-2 mb-4 min-h-[28px]">
                  <span className="corp-badge corp-badge-neutral text-xs">
                    {passenger.usageCount || 0} booking{passenger.usageCount === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Book Now button - always at bottom */}
                <Link
                  href={`/corporate/quote?passengerId=${passenger.passengerId}`}
                  className="block w-full text-center px-4 py-2.5 bg-[var(--corp-sage)] text-white font-medium rounded-lg hover:bg-[var(--corp-sage-dark)] transition-colors mt-auto"
                >
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        )}
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
