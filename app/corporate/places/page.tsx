'use client';

import { MapPin, Plus, X, Building2, Home, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import CorporateLayout from '@/components/corporate/CorporateLayout';
import PlaceForm from '@/components/corporate/PlaceForm';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  type Place,
  type CreatePlaceData,
  type UpdatePlaceData,
  type PlaceType,
} from '@/lib/services/corporateApi';

export default function PlacesPage() {
  const { user } = useRequireCorporateAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<PlaceType | 'all'>('all');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [deletingPlace, setDeletingPlace] = useState<Place | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPlaces = useCallback(async () => {
    try {
      setError(null);
      const data = await getPlaces();
      setPlaces(data.places || []);
    } catch (err) {
      setError('Failed to load saved locations');
      console.error('Failed to load places:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchPlaces();
    }
  }, [user, fetchPlaces]);

  const filteredPlaces = filterType === 'all'
    ? places
    : places.filter(p => p.type === filterType);

  const officePlaces = places.filter(p => p.type === 'office');
  const personalPlaces = places.filter(p => p.type === 'personal');

  const handleCreate = async (data: CreatePlaceData) => {
    setIsSaving(true);
    try {
      const result = await createPlace(data);
      if (result.success && result.place) {
        setPlaces(prev => [...prev, result.place]);
        setIsCreateModalOpen(false);
        showToast('Location saved successfully');
      } else {
        showToast(result.message || 'Failed to save location', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save location', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: UpdatePlaceData) => {
    if (!editingPlace) return;

    setIsSaving(true);
    try {
      const result = await updatePlace(editingPlace.placeId, data);
      if (result.success && result.place) {
        setPlaces(prev => prev.map(p =>
          p.placeId === editingPlace.placeId ? result.place : p
        ));
        setEditingPlace(null);
        showToast('Location updated successfully');
      } else {
        showToast(result.message || 'Failed to update location', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update location', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlace) return;

    setIsDeleting(true);
    try {
      const result = await deletePlace(deletingPlace.placeId);
      if (result.success) {
        setPlaces(prev => prev.filter(p => p.placeId !== deletingPlace.placeId));
        setDeletingPlace(null);
        showToast('Location deleted successfully');
      } else {
        showToast(result.message || 'Failed to delete location', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete location', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeIcon = (type: PlaceType) => {
    return type === 'office' ? (
      <Building2 className="h-5 w-5 text-blue-600" />
    ) : (
      <Home className="h-5 w-5 text-green-600" />
    );
  };

  const getTypeBadge = (type: PlaceType) => {
    return type === 'office' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Building2 className="h-3 w-3" />
        Office
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <Home className="h-3 w-3" />
        Personal
      </span>
    );
  };

  return (
    <CorporateLayout pageTitle="Saved Locations">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="corp-icon-wrapper p-2 rounded-lg">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="corp-page-title text-2xl font-bold">Saved Locations</h1>
              <p className="corp-page-subtitle text-sm">
                {officePlaces.length} office, {personalPlaces.length} personal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="corp-btn corp-btn-primary inline-flex items-center gap-2 px-4 py-2 font-medium rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'office', 'personal'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === type
                  ? 'bg-[var(--corp-accent)] text-white'
                  : 'bg-[var(--corp-bg-secondary)] text-[var(--corp-text-secondary)] hover:bg-[var(--corp-bg-hover)]'
              }`}
            >
              {type === 'all' ? 'All' : type === 'office' ? 'Office' : 'Personal'}
              <span className="ml-1.5 opacity-70">
                ({type === 'all' ? places.length : type === 'office' ? officePlaces.length : personalPlaces.length})
              </span>
            </button>
          ))}
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
        {!isLoading && filteredPlaces.length === 0 && (
          <div className="corp-card p-12 text-center rounded-xl">
            <div className="corp-icon-wrapper mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8" />
            </div>
            <h3 className="corp-section-title text-lg font-semibold mb-2">
              {filterType === 'all' ? 'No saved locations yet' : `No ${filterType} locations`}
            </h3>
            <p className="corp-page-subtitle mb-6 max-w-md mx-auto">
              Save your frequently used addresses for quick selection during booking.
              {filterType === 'office' && ' Office locations are shared with your team.'}
              {filterType === 'personal' && ' Personal locations are only visible to you.'}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="corp-btn corp-btn-primary inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Add Your First Location
            </button>
          </div>
        )}

        {/* Places grid */}
        {!isLoading && filteredPlaces.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlaces.map(place => (
              <div
                key={place.placeId}
                className="corp-card rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      place.type === 'office' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {getTypeIcon(place.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--corp-text-primary)]">
                        {place.label}
                      </h3>
                      {getTypeBadge(place.type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingPlace(place)}
                      className="p-1.5 rounded-lg text-[var(--corp-text-muted)] hover:text-[var(--corp-text-primary)] hover:bg-[var(--corp-bg-hover)] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPlace(place)}
                      className="p-1.5 rounded-lg text-[var(--corp-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[var(--corp-text-secondary)] mb-3 line-clamp-2">
                  {place.address}
                </p>

                {place.postcode && (
                  <p className="text-xs text-[var(--corp-text-muted)]">
                    {place.postcode}
                  </p>
                )}

                {place.usageCount > 0 && (
                  <p className="text-xs text-[var(--corp-text-muted)] mt-2">
                    Used {place.usageCount} time{place.usageCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="corp-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b corp-border bg-[var(--corp-bg-elevated)]">
                <h2 className="text-xl font-semibold">Add New Location</h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--corp-bg-hover)] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <PlaceForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateModalOpen(false)}
                isLoading={isSaving}
              />
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingPlace && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
            onClick={() => setEditingPlace(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="corp-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b corp-border bg-[var(--corp-bg-elevated)]">
                <h2 className="text-xl font-semibold">Edit Location</h2>
                <button
                  onClick={() => setEditingPlace(null)}
                  className="p-1 rounded-lg hover:bg-[var(--corp-bg-hover)] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <PlaceForm
                initialData={editingPlace}
                onSubmit={handleUpdate}
                onCancel={() => setEditingPlace(null)}
                isLoading={isSaving}
              />
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPlace && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
            onClick={() => setDeletingPlace(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="corp-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-5 border-b corp-border bg-[var(--corp-bg-elevated)]">
                <h2 className="text-xl font-semibold">Delete Location?</h2>
              </div>
              <div className="p-5">
                <p className="corp-page-subtitle">
                  Are you sure you want to delete <span className="font-medium text-[var(--corp-text-primary)]">{deletingPlace.label}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 p-5 border-t corp-border bg-[var(--corp-bg-elevated)]">
                <button
                  type="button"
                  onClick={() => setDeletingPlace(null)}
                  className="corp-btn corp-btn-secondary flex-1 px-4 py-2.5 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[10000] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </CorporateLayout>
  );
}
