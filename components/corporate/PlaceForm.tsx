'use client';

import { useState } from 'react';
import { Building2, Home, MapPin } from 'lucide-react';
import LocationInput from '@/components/quote/LocationInput';
import { type Place, type CreatePlaceData, type UpdatePlaceData, type PlaceType } from '@/lib/services/corporateApi';

interface PlaceFormProps {
  initialData?: Place;
  onSubmit: (data: CreatePlaceData | UpdatePlaceData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PlaceForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PlaceFormProps) {
  const [type, setType] = useState<PlaceType>(initialData?.type || 'personal');
  const [label, setLabel] = useState(initialData?.label || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [lat, setLat] = useState(initialData?.lat || 0);
  const [lng, setLng] = useState(initialData?.lng || 0);
  const [placeIdGoogle, setPlaceIdGoogle] = useState(initialData?.placeIdGoogle || '');
  const [postcode, setPostcode] = useState(initialData?.postcode || '');
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = (location: {
    address: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  } | null) => {
    if (location) {
      setAddress(location.address);
      setPlaceIdGoogle(location.placeId || '');
      setLat(location.lat || 0);
      setLng(location.lng || 0);

      // Extract postcode from address (UK format - last part typically)
      const addressParts = location.address.split(',').map(p => p.trim());
      const lastPart = addressParts[addressParts.length - 1];
      const postcodeMatch = lastPart?.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
      if (postcodeMatch) {
        setPostcode(postcodeMatch[1].toUpperCase());
      }
    } else {
      setAddress('');
      setPlaceIdGoogle('');
      setLat(0);
      setLng(0);
      setPostcode('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Please enter a label for this location');
      return;
    }

    if (!address.trim()) {
      setError('Please select an address');
      return;
    }

    const data: CreatePlaceData | UpdatePlaceData = {
      type,
      label: label.trim(),
      address,
      lat,
      lng,
      placeIdGoogle: placeIdGoogle || undefined,
      postcode: postcode || undefined,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-5 space-y-5">
        {/* Place Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Location Type</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType('personal')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                type === 'personal'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-[var(--corp-border-default)] hover:border-[var(--corp-border-hover)]'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">Personal</span>
            </button>
            <button
              type="button"
              onClick={() => setType('office')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                type === 'office'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-[var(--corp-border-default)] hover:border-[var(--corp-border-hover)]'
              }`}
            >
              <Building2 className="h-5 w-5" />
              <span className="font-medium">Office</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--corp-text-muted)]">
            {type === 'office'
              ? 'Office locations are visible to everyone in your team'
              : 'Personal locations are only visible to you'}
          </p>
        </div>

        {/* Label */}
        <div>
          <label htmlFor="label" className="block text-sm font-medium mb-2">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Home, Head Office, Airport"
            className="corp-input w-full px-4 py-2.5 rounded-lg"
            maxLength={100}
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <MapPin className="h-4 w-4 inline mr-1" />
            Address <span className="text-red-500">*</span>
          </label>
          <LocationInput
            value={address ? { address, placeId: placeIdGoogle, lat, lng } : null}
            onChange={handleLocationSelect}
            placeholder="Start typing to search..."
          />
        </div>

        {/* Postcode (read-only, auto-filled) */}
        {postcode && (
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium mb-2">
              Postcode
            </label>
            <input
              type="text"
              id="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              className="corp-input w-full px-4 py-2.5 rounded-lg bg-[var(--corp-bg-secondary)]"
              placeholder="Auto-detected from address"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 p-5 border-t corp-border bg-[var(--corp-bg-elevated)]">
        <button
          type="button"
          onClick={onCancel}
          className="corp-btn corp-btn-secondary flex-1 px-4 py-2.5 font-medium rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !label.trim() || !address.trim()}
          className="corp-btn corp-btn-primary flex-1 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Location'}
        </button>
      </div>
    </form>
  );
}
