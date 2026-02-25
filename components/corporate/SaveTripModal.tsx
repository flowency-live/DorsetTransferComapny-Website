'use client';

import { X, MapPin, Car, Users, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { saveFavouriteTrip, TripLocation, TripWaypoint } from '@/lib/services/corporateApi';

interface SaveTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  tripData: {
    pickupLocation: TripLocation;
    dropoffLocation: TripLocation;
    waypoints?: TripWaypoint[];
    vehicleType?: 'standard' | 'executive' | 'minibus';
    passengers?: number;
    luggage?: number;
  };
}

const vehicleLabels: Record<string, string> = {
  standard: 'Standard',
  executive: 'Executive',
  minibus: 'Minibus',
};

export default function SaveTripModal({
  isOpen,
  onClose,
  onSaved,
  tripData,
}: SaveTripModalProps) {
  const [label, setLabel] = useState('');
  const [saveVehicle, setSaveVehicle] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setLabel('');
      setSaveVehicle(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const truncateAddress = (address: string, maxLength = 40) => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const saveData = {
        label: label.trim(),
        pickupLocation: tripData.pickupLocation,
        dropoffLocation: tripData.dropoffLocation,
        waypoints: tripData.waypoints,
        ...(saveVehicle && tripData.vehicleType && { vehicleType: tripData.vehicleType }),
        ...(saveVehicle && tripData.passengers && { passengers: tripData.passengers }),
        ...(saveVehicle && tripData.luggage && { luggage: tripData.luggage }),
      };

      const result = await saveFavouriteTrip(saveData);

      if (result.success) {
        onSaved?.();
        onClose();
      } else {
        setError(result.message || 'Failed to save trip');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div className="corp-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b corp-border bg-[var(--corp-bg-elevated)]">
            <h2 className="text-xl font-semibold">Save as Favourite</h2>
            <button
              onClick={onClose}
              className="corp-page-subtitle hover:text-[var(--corp-text-primary)] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-5">
            {/* Trip Summary */}
            <div className="bg-[var(--corp-bg-elevated)] rounded-lg p-4 mb-5 border-l-3 border-l-[var(--corp-accent)]" style={{ borderLeftWidth: '3px' }}>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-[var(--corp-accent)]" />
                  </div>
                  <p className="text-sm corp-page-subtitle" title={tripData.pickupLocation.address}>
                    {truncateAddress(tripData.pickupLocation.address)}
                  </p>
                </div>

                {tripData.waypoints && tripData.waypoints.length > 0 && (
                  <div className="flex items-center gap-2 ml-0.5">
                    <div className="h-3 border-l-2 border-dashed border-[var(--corp-border-default)]" />
                    <p className="text-xs corp-page-subtitle">
                      +{tripData.waypoints.length} stop{tripData.waypoints.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    <MapPin className="h-3 w-3 text-[var(--corp-error)]" />
                  </div>
                  <p className="text-sm corp-page-subtitle" title={tripData.dropoffLocation.address}>
                    {truncateAddress(tripData.dropoffLocation.address)}
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Name */}
            <div className="mb-5">
              <label htmlFor="tripLabel" className="block text-sm font-medium mb-2">
                Trip Name
              </label>
              <input
                type="text"
                id="tripLabel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Office to Heathrow"
                className="corp-input w-full px-4 py-2.5 rounded-lg"
                required
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Save Vehicle Preference */}
            {tripData.vehicleType && (
              <div className="mb-5 p-4 rounded-lg bg-[var(--corp-bg-elevated)]">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveVehicle}
                    onChange={(e) => setSaveVehicle(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--corp-accent)]"
                  />
                  <div>
                    <span className="block text-sm font-medium">
                      Save vehicle preference
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--corp-accent-muted)] text-[var(--corp-accent)] rounded-md">
                        <Car className="h-3 w-3" />
                        {vehicleLabels[tripData.vehicleType]}
                      </span>
                      {tripData.passengers && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--corp-accent-muted)] text-[var(--corp-accent)] rounded-md">
                          <Users className="h-3 w-3" />
                          {tripData.passengers} pax
                        </span>
                      )}
                      {tripData.luggage && tripData.luggage > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--corp-accent-muted)] text-[var(--corp-accent)] rounded-md">
                          <Briefcase className="h-3 w-3" />
                          {tripData.luggage} bags
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-[var(--corp-error-bg)] border border-[var(--corp-error)] rounded-lg">
                <p className="text-sm text-[var(--corp-error)]">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="corp-btn corp-btn-secondary flex-1 py-2.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !label.trim()}
                className="corp-btn corp-btn-primary flex-1 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
