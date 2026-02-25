'use client';

import { MapPin, Car, Users, Briefcase, Clock, MoreVertical, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

import { FavouriteTrip } from '@/lib/services/corporateApi';

interface FavouriteTripCardProps {
  trip: FavouriteTrip;
  onDelete?: (tripId: string) => void;
  onEdit?: (trip: FavouriteTrip) => void;
  compact?: boolean;
}

const vehicleLabels: Record<string, string> = {
  standard: 'Standard',
  executive: 'Executive',
  minibus: 'Minibus',
};

export default function FavouriteTripCard({
  trip,
  onDelete,
  onEdit,
  compact = false,
}: FavouriteTripCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const truncateAddress = (address: string, maxLength = 35) => {
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength) + '...';
  };

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return 'Never used';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Used today';
    if (diffDays === 1) return 'Used yesterday';
    if (diffDays < 7) return `Used ${diffDays} days ago`;
    if (diffDays < 30) return `Used ${Math.floor(diffDays / 7)} weeks ago`;
    return `Used ${Math.floor(diffDays / 30)} months ago`;
  };

  if (compact) {
    return (
      <div className="corp-card rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{trip.label}</h3>
            <div className="mt-1 flex items-center text-xs opacity-70 gap-2">
              {trip.vehicleType && (
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {vehicleLabels[trip.vehicleType]}
                </span>
              )}
              {trip.passengers && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {trip.passengers}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/corporate/quote?tripId=${trip.tripId}`}
            className="ml-2 px-3 py-1.5 text-xs font-medium bg-[var(--corp-sage)] text-white rounded-md hover:bg-[var(--corp-sage-dark)] transition-colors"
          >
            Book
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="corp-card rounded-lg p-5 hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Header with label and menu */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-lg truncate">{trip.label}</h3>
          <p className="text-xs opacity-60 mt-0.5">
            {formatLastUsed(trip.lastUsedAt)}
            {trip.usageCount !== undefined && trip.usageCount > 0 && ` (${trip.usageCount} bookings)`}
          </p>
        </div>

        {(onEdit || onDelete) && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 opacity-50 hover:opacity-100 rounded-md hover:bg-[var(--corp-bg-hover)] transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 corp-card rounded-md shadow-lg py-1 z-10">
                {onEdit && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(trip);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[var(--corp-bg-hover)]"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(trip.tripId);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Route - flex-grow to push badges and button to bottom */}
      <div className="space-y-2 mb-4 flex-grow">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-1">
            <div className="h-2 w-2 rounded-full bg-[var(--corp-sage)]" />
          </div>
          <p className="text-sm opacity-80" title={trip.pickupLocation.address}>
            {truncateAddress(trip.pickupLocation.address)}
          </p>
        </div>

        {trip.waypoints && trip.waypoints.length > 0 && (
          <div className="flex items-center gap-2 ml-0.5">
            <div className="h-4 border-l-2 border-dashed border-[var(--corp-sage)]/40" />
            <p className="text-xs opacity-60">
              +{trip.waypoints.length} stop{trip.waypoints.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-1">
            <MapPin className="h-3 w-3" />
          </div>
          <p className="text-sm opacity-80" title={trip.dropoffLocation.address}>
            {truncateAddress(trip.dropoffLocation.address)}
          </p>
        </div>
      </div>

      {/* Preferences - fixed height area */}
      <div className="flex flex-wrap gap-2 mb-4 min-h-[28px]">
        {trip.vehicleType && (
          <span className="corp-badge corp-badge-neutral inline-flex items-center gap-1 text-xs">
            <Car className="h-3 w-3" />
            {vehicleLabels[trip.vehicleType]}
          </span>
        )}
        {trip.passengers && (
          <span className="corp-badge corp-badge-neutral inline-flex items-center gap-1 text-xs">
            <Users className="h-3 w-3" />
            {trip.passengers} pax
          </span>
        )}
        {trip.luggage && trip.luggage > 0 && (
          <span className="corp-badge corp-badge-neutral inline-flex items-center gap-1 text-xs">
            <Briefcase className="h-3 w-3" />
            {trip.luggage} bags
          </span>
        )}
        {trip.waypoints && trip.waypoints.some(w => w.waitTime && w.waitTime > 0) && (
          <span className="corp-badge corp-badge-neutral inline-flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Wait time
          </span>
        )}
      </div>

      {/* Book button - always at bottom */}
      <Link
        href={`/corporate/quote?tripId=${trip.tripId}`}
        className="block w-full text-center px-4 py-2.5 bg-[var(--corp-sage)] text-white font-medium rounded-lg hover:bg-[var(--corp-sage-dark)] transition-colors mt-auto"
      >
        Book Now
      </Link>
    </div>
  );
}
