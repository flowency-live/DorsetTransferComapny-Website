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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-sage/20">
            <h2 className="text-xl font-semibold text-navy">Save as Favourite</h2>
            <button
              onClick={onClose}
              className="text-navy-light/50 hover:text-navy transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-5">
            {/* Trip Summary */}
            <div className="bg-sage/5 rounded-lg p-4 mb-5">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-sage" />
                  </div>
                  <p className="text-sm text-navy-light/80" title={tripData.pickupLocation.address}>
                    {truncateAddress(tripData.pickupLocation.address)}
                  </p>
                </div>

                {tripData.waypoints && tripData.waypoints.length > 0 && (
                  <div className="flex items-center gap-2 ml-0.5">
                    <div className="h-3 border-l-2 border-dashed border-sage/40" />
                    <p className="text-xs text-navy-light/60">
                      +{tripData.waypoints.length} stop{tripData.waypoints.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-1">
                    <MapPin className="h-3 w-3 text-navy" />
                  </div>
                  <p className="text-sm text-navy-light/80" title={tripData.dropoffLocation.address}>
                    {truncateAddress(tripData.dropoffLocation.address)}
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Name */}
            <div className="mb-5">
              <label htmlFor="tripLabel" className="block text-sm font-medium text-navy mb-2">
                Trip Name
              </label>
              <input
                type="text"
                id="tripLabel"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Office to Heathrow"
                className="w-full px-4 py-2.5 border border-sage/30 rounded-lg text-navy placeholder:text-navy-light/40 focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage"
                required
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Save Vehicle Preference */}
            {tripData.vehicleType && (
              <div className="mb-5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveVehicle}
                    onChange={(e) => setSaveVehicle(e.target.checked)}
                    className="mt-1 h-4 w-4 text-sage border-sage/30 rounded focus:ring-sage/50"
                  />
                  <div>
                    <span className="block text-sm font-medium text-navy">
                      Save vehicle preference
                    </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-sage/10 text-sage-dark rounded-md">
                        <Car className="h-3 w-3" />
                        {vehicleLabels[tripData.vehicleType]}
                      </span>
                      {tripData.passengers && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-sage/10 text-sage-dark rounded-md">
                          <Users className="h-3 w-3" />
                          {tripData.passengers} pax
                        </span>
                      )}
                      {tripData.luggage && tripData.luggage > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-sage/10 text-sage-dark rounded-md">
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-sage/30 text-navy font-medium rounded-lg hover:bg-sage/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !label.trim()}
                className="flex-1 px-4 py-2.5 bg-sage text-white font-medium rounded-lg hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
