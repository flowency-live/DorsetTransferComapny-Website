'use client';

import { Heart, Plus, X, Car, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import FavouriteTripCard from '@/components/corporate/FavouriteTripCard';
import CreateTripModal from '@/components/corporate/CreateTripModal';
import CorporateLayout from '@/components/corporate/CorporateLayout';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getFavouriteTrips,
  updateFavouriteTrip,
  deleteFavouriteTrip,
  FavouriteTrip,
} from '@/lib/services/corporateApi';

const vehicleOptions = [
  { value: '', label: 'No preference' },
  { value: 'standard', label: 'Standard' },
  { value: 'executive', label: 'Executive' },
  { value: 'minibus', label: 'Minibus' },
];

export default function TripsManagementPage() {
  const { user } = useRequireCorporateAuth();
  const [trips, setTrips] = useState<FavouriteTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingTrip, setEditingTrip] = useState<FavouriteTrip | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [editPassengers, setEditPassengers] = useState(2);
  const [editLuggage, setEditLuggage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deletingTrip, setDeletingTrip] = useState<FavouriteTrip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create new trip modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchTrips = async () => {
    try {
      setError(null);
      const data = await getFavouriteTrips();
      setTrips(data.trips || []);
    } catch (err) {
      setError('Failed to load trips');
      console.error('Failed to load trips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const handleEdit = (trip: FavouriteTrip) => {
    setEditingTrip(trip);
    setEditLabel(trip.label);
    setEditVehicle(trip.vehicleType || '');
    setEditPassengers(trip.passengers || 2);
    setEditLuggage(trip.luggage || 0);
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;

    setIsSaving(true);
    try {
      const updateData: Parameters<typeof updateFavouriteTrip>[1] = {
        label: editLabel.trim(),
      };

      if (editVehicle) {
        updateData.vehicleType = editVehicle as 'standard' | 'executive' | 'minibus';
      }
      updateData.passengers = editPassengers;
      updateData.luggage = editLuggage;

      const result = await updateFavouriteTrip(editingTrip.tripId, updateData);

      if (result.success) {
        setTrips(prev =>
          prev.map(t =>
            t.tripId === editingTrip.tripId
              ? { ...t, ...updateData }
              : t
          )
        );
        setEditingTrip(null);
      } else {
        setError(result.message || 'Failed to update trip');
      }
    } catch (err) {
      setError('Failed to update trip');
      console.error('Update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (tripId: string) => {
    const trip = trips.find(t => t.tripId === tripId);
    if (trip) {
      setDeletingTrip(trip);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTrip) return;

    setIsDeleting(true);
    try {
      const result = await deleteFavouriteTrip(deletingTrip.tripId);

      if (result.success) {
        setTrips(prev => prev.filter(t => t.tripId !== deletingTrip.tripId));
        setDeletingTrip(null);
      } else {
        setError(result.message || 'Failed to delete trip');
      }
    } catch (err) {
      setError('Failed to delete trip');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <CorporateLayout pageTitle="Favourite Trips">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="corp-icon-wrapper p-2 rounded-lg">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="corp-page-title text-2xl font-bold">Favourite Trips</h1>
              <p className="corp-page-subtitle text-sm">
                {trips.length} saved trip{trips.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="corp-btn corp-btn-secondary inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg"
            >
              <Plus className="h-4 w-4" />
              New Trip
            </button>
            <Link
              href="/corporate/quote"
              className="corp-btn corp-btn-primary inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg"
            >
              <Plus className="h-4 w-4" />
              New Quote
            </Link>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="corp-alert corp-alert-error mb-6 p-4 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && trips.length === 0 && (
          <div className="corp-card p-12 text-center rounded-xl">
            <div className="corp-icon-wrapper mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="corp-section-title text-lg font-semibold mb-2">No saved trips yet</h3>
            <p className="corp-page-subtitle mb-6 max-w-md mx-auto">
              Save your frequently used routes for quick rebooking. After getting a quote, click Save as Favourite to add it here.
            </p>
            <Link
              href="/corporate/quote"
              className="corp-btn corp-btn-primary inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Get Your First Quote
            </Link>
          </div>
        )}

        {/* Trips grid */}
        {!isLoading && trips.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trips.map(trip => (
              <FavouriteTripCard
                key={trip.tripId}
                trip={trip}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTrip && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
            onClick={() => setEditingTrip(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="corp-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b corp-border bg-[var(--corp-bg-elevated)]">
                <h2 className="text-xl font-semibold">Edit Trip</h2>
                <button
                  onClick={() => setEditingTrip(null)}
                  className="p-1 rounded-lg hover:bg-[var(--corp-bg-hover)] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <div className="p-5 space-y-5">
                {/* Trip Name */}
                <div>
                  <label htmlFor="editLabel" className="block text-sm font-medium mb-2">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    id="editLabel"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="corp-input w-full px-4 py-2.5 rounded-lg"
                    maxLength={100}
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label htmlFor="editVehicle" className="block text-sm font-medium mb-2">
                    <Car className="h-4 w-4 inline mr-1 text-[var(--corp-accent)]" />
                    Default Vehicle
                  </label>
                  <select
                    id="editVehicle"
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                    className="corp-input w-full px-4 py-2.5 rounded-lg"
                  >
                    {vehicleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Passengers */}
                <div>
                  <label htmlFor="editPassengers" className="block text-sm font-medium mb-2">
                    <Users className="h-4 w-4 inline mr-1 text-[var(--corp-accent)]" />
                    Default Passengers
                  </label>
                  <input
                    type="number"
                    id="editPassengers"
                    value={editPassengers}
                    onChange={(e) => setEditPassengers(Math.min(16, Math.max(1, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={16}
                    className="corp-input w-full px-4 py-2.5 rounded-lg"
                  />
                </div>

                {/* Luggage */}
                <div>
                  <label htmlFor="editLuggage" className="block text-sm font-medium mb-2">
                    <Briefcase className="h-4 w-4 inline mr-1 text-[var(--corp-accent)]" />
                    Default Luggage
                  </label>
                  <input
                    type="number"
                    id="editLuggage"
                    value={editLuggage}
                    onChange={(e) => setEditLuggage(Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                    min={0}
                    max={20}
                    className="corp-input w-full px-4 py-2.5 rounded-lg"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-5 border-t corp-border bg-[var(--corp-bg-elevated)]">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="corp-btn corp-btn-secondary flex-1 px-4 py-2.5 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editLabel.trim()}
                  className="corp-btn corp-btn-primary flex-1 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTrip && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
            onClick={() => setDeletingTrip(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="corp-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b corp-border bg-[var(--corp-bg-elevated)]">
                <h2 className="text-xl font-semibold">Delete Trip?</h2>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="corp-page-subtitle">
                  Are you sure you want to delete <span className="font-medium text-[var(--corp-text-primary)]">{deletingTrip.label}</span>? This action cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-5 border-t corp-border bg-[var(--corp-bg-elevated)]">
                <button
                  type="button"
                  onClick={() => setDeletingTrip(null)}
                  className="corp-btn corp-btn-secondary flex-1 px-4 py-2.5 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="corp-btn corp-btn-danger flex-1 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create New Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={() => {
          fetchTrips();
        }}
      />
    </CorporateLayout>
  );
}
