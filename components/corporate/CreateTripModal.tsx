'use client';

import { X, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import LocationInput from '@/app/quote/components/LocationInput';
import { saveFavouriteTrip, TripLocation } from '@/lib/services/corporateApi';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function CreateTripModal({
  isOpen,
  onClose,
  onSaved,
}: CreateTripModalProps) {
  const [label, setLabel] = useState('');
  const [pickupLocation, setPickupLocation] = useState<TripLocation | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState<TripLocation | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLabel('');
      setPickupLocation(null);
      setPickupAddress('');
      setDropoffLocation(null);
      setDropoffAddress('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const isFormValid = label.trim() && pickupLocation && dropoffLocation;

  const handlePickupSelect = (
    address: string,
    placeId: string,
    _locationType?: string,
    lat?: number,
    lng?: number
  ) => {
    if (lat !== undefined && lng !== undefined) {
      setPickupLocation({
        address,
        placeId,
        lat,
        lng,
      });
      setPickupAddress(address);
    }
  };

  const handleDropoffSelect = (
    address: string,
    placeId: string,
    _locationType?: string,
    lat?: number,
    lng?: number
  ) => {
    if (lat !== undefined && lng !== undefined) {
      setDropoffLocation({
        address,
        placeId,
        lat,
        lng,
      });
      setDropoffAddress(address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !pickupLocation || !dropoffLocation) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const saveData = {
        label: label.trim(),
        pickupLocation,
        dropoffLocation,
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
        data-testid="modal-overlay"
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-sage/20">
            <h2 className="text-xl font-semibold text-navy">Create Favourite Trip</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-navy-light/50 hover:text-navy transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Trip Name */}
            <div>
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
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Pickup Location */}
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-sage" />
                  Pickup Location
                </div>
              </label>
              <LocationInput
                value={pickupAddress}
                onSelect={handlePickupSelect}
                placeholder="Enter pickup address"
                hideCurrentLocation={true}
              />
            </div>

            {/* Dropoff Location */}
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-navy" />
                  Drop-off Location
                </div>
              </label>
              <LocationInput
                value={dropoffAddress}
                onSelect={handleDropoffSelect}
                placeholder="Enter drop-off address"
                hideCurrentLocation={true}
                isDropoff={true}
              />
            </div>

            {/* Info text */}
            <div className="text-sm text-navy-light/70 bg-sage/5 rounded-lg p-3">
              Save frequently used routes for quick booking. You can set vehicle preferences
              when editing the trip later.
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-sage/30 text-navy font-medium rounded-lg hover:bg-sage/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
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