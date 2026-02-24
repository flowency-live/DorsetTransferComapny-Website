'use client';

import { Heart, Plus, ArrowLeft, X, Car, Users, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import FavouriteTripCard from '@/components/corporate/FavouriteTripCard';
import CreateTripModal from '@/components/corporate/CreateTripModal';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';
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
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
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
        // Update local state
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
        onLogout={logout}
        isAdmin={isAdmin}
      />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Back link */}
          <Link
            href="/corporate/dashboard"
            className="inline-flex items-center gap-2 text-navy-light/70 hover:text-navy mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sage/10 rounded-lg">
                <Heart className="h-6 w-6 text-sage" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy">Favourite Trips</h1>
                <p className="text-sm text-navy-light/70">
                  {trips.length} saved trip{trips.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-sage text-sage font-medium rounded-lg hover:bg-sage/5 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Trip
              </button>
              <Link
                href="/corporate/quote"
                className="inline-flex items-center gap-2 px-4 py-2 bg-sage text-white font-medium rounded-lg hover:bg-sage-dark transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Quote
              </Link>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && trips.length === 0 && (
            <div className="bg-white rounded-xl border border-sage/20 p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-sage" />
              </div>
              <h3 className="text-lg font-semibold text-navy mb-2">No saved trips yet</h3>
              <p className="text-navy-light/70 mb-6 max-w-md mx-auto">
                Save your frequently used routes for quick rebooking. After getting a quote, click Save as Favourite to add it here.
              </p>
              <Link
                href="/corporate/quote"
                className="inline-flex items-center gap-2 px-6 py-3 bg-sage text-white font-medium rounded-lg hover:bg-sage-dark transition-colors"
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
      </main>

      <Footer />

      {/* Edit Modal */}
      {editingTrip && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
            onClick={() => setEditingTrip(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-sage/20">
                <h2 className="text-xl font-semibold text-navy">Edit Trip</h2>
                <button
                  onClick={() => setEditingTrip(null)}
                  className="text-navy-light/50 hover:text-navy transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <div className="p-5 space-y-5">
                {/* Trip Name */}
                <div>
                  <label htmlFor="editLabel" className="block text-sm font-medium text-navy mb-2">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    id="editLabel"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full px-4 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage"
                    maxLength={100}
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label htmlFor="editVehicle" className="block text-sm font-medium text-navy mb-2">
                    <Car className="h-4 w-4 inline mr-1" />
                    Default Vehicle
                  </label>
                  <select
                    id="editVehicle"
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage bg-white"
                  >
                    {vehicleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Passengers */}
                <div>
                  <label htmlFor="editPassengers" className="block text-sm font-medium text-navy mb-2">
                    <Users className="h-4 w-4 inline mr-1" />
                    Default Passengers
                  </label>
                  <input
                    type="number"
                    id="editPassengers"
                    value={editPassengers}
                    onChange={(e) => setEditPassengers(Math.min(16, Math.max(1, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={16}
                    className="w-full px-4 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage"
                  />
                </div>

                {/* Luggage */}
                <div>
                  <label htmlFor="editLuggage" className="block text-sm font-medium text-navy mb-2">
                    <Briefcase className="h-4 w-4 inline mr-1" />
                    Default Luggage
                  </label>
                  <input
                    type="number"
                    id="editLuggage"
                    value={editLuggage}
                    onChange={(e) => setEditLuggage(Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                    min={0}
                    max={20}
                    className="w-full px-4 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-5 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="flex-1 px-4 py-2.5 border border-sage/30 text-navy font-medium rounded-lg hover:bg-sage/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editLabel.trim()}
                  className="flex-1 px-4 py-2.5 bg-sage text-white font-medium rounded-lg hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-sage/20">
                <h2 className="text-xl font-semibold text-navy">Delete Trip?</h2>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="text-navy-light">
                  Are you sure you want to delete <span className="font-medium text-navy">{deletingTrip.label}</span>? This action cannot be undone.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-5 border-t border-sage/20">
                <button
                  type="button"
                  onClick={() => setDeletingTrip(null)}
                  className="flex-1 px-4 py-2.5 border border-sage/30 text-navy font-medium rounded-lg hover:bg-sage/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
