'use client';

import { X, MapPin, Car, Users, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import LocationInput from '@/app/quote/components/LocationInput';
import { getVehicleTypes } from '@/app/quote/lib/api';
import { VehicleType } from '@/app/quote/lib/types';
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
  const [vehicleType, setVehicleType] = useState('');
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Vehicle types from tenant config
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch vehicle types when modal opens
  useEffect(() => {
    if (isOpen && vehicleTypes.length === 0) {
      setLoadingVehicles(true);
      getVehicleTypes()
        .then(types => setVehicleTypes(types))
        .catch(err => console.error('Failed to load vehicle types:', err))
        .finally(() => setLoadingVehicles(false));
    }
  }, [isOpen, vehicleTypes.length]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLabel('');
      setPickupLocation(null);
      setPickupAddress('');
      setDropoffLocation(null);
      setDropoffAddress('');
      setVehicleType('');
      setPassengers(2);
      setLuggage(0);
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
      const saveData: {
        label: string;
        pickupLocation: TripLocation;
        dropoffLocation: TripLocation;
        vehicleType?: string;
        passengers?: number;
        luggage?: number;
      } = {
        label: label.trim(),
        pickupLocation,
        dropoffLocation,
      };

      // Only include optional fields if they have values
      if (vehicleType) {
        saveData.vehicleType = vehicleType;
      }
      if (passengers !== 2) {
        saveData.passengers = passengers;
      }
      if (luggage > 0) {
        saveData.luggage = luggage;
      }

      const result = await saveFavouriteTrip(saveData as Parameters<typeof saveFavouriteTrip>[0]);

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

            {/* Vehicle & Passenger Details */}
            <div className="grid grid-cols-3 gap-4">
              {/* Vehicle Type */}
              <div>
                <label htmlFor="vehicleType" className="block text-sm font-medium text-navy mb-2">
                  <div className="flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    Vehicle Type
                  </div>
                </label>
                <select
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  disabled={loadingVehicles}
                  className="w-full px-3 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage bg-white disabled:opacity-50"
                >
                  <option value="">
                    {loadingVehicles ? 'Loading...' : 'No preference'}
                  </option>
                  {vehicleTypes.map(vt => (
                    <option key={vt.vehicleTypeId} value={vt.vehicleTypeId}>{vt.name}</option>
                  ))}
                </select>
              </div>

              {/* Passengers */}
              <div>
                <label htmlFor="passengers" className="block text-sm font-medium text-navy mb-2">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Passengers
                  </div>
                </label>
                <input
                  type="number"
                  id="passengers"
                  value={passengers}
                  onChange={(e) => setPassengers(Math.min(16, Math.max(1, parseInt(e.target.value) || 1)))}
                  min={1}
                  max={16}
                  className="w-full px-3 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage"
                />
              </div>

              {/* Luggage */}
              <div>
                <label htmlFor="luggage" className="block text-sm font-medium text-navy mb-2">
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    Luggage
                  </div>
                </label>
                <input
                  type="number"
                  id="luggage"
                  value={luggage}
                  onChange={(e) => setLuggage(Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={20}
                  className="w-full px-3 py-2.5 border border-sage/30 rounded-lg text-navy focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage"
                />
              </div>
            </div>

            {/* Info text */}
            <div className="text-sm text-navy-light/70 bg-sage/5 rounded-lg p-3">
              Save frequently used routes for quick booking. These settings will be pre-filled
              when you create a new booking from this trip.
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