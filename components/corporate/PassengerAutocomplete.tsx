'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, Plus, X, MapPin, Clock } from 'lucide-react';
import {
  getPassengers,
  getPassenger,
  getSuggestedPassengers,
  type PassengerListItem,
  type SuggestedPassenger,
} from '@/lib/services/corporateApi';

export interface RefreshmentPreferences {
  stillWater?: boolean;
  sparklingWater?: boolean;
  tea?: boolean;
  coffee?: boolean;
  other?: string;
}

export interface SelectedPassenger {
  passengerId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  title?: string | null;
  alias?: string | null;
  contactName?: string | null;
  isRepresentative?: boolean | null;
  email?: string | null;
  phone?: string | null;
  driverInstructions?: string | null;
  refreshments?: RefreshmentPreferences | null;
}

interface PassengerAutocompleteProps {
  onSelect: (passenger: SelectedPassenger | null) => void;
  selectedPassenger: SelectedPassenger | null;
  pickupPostcode?: string;
  dropoffPostcode?: string;
  manualName?: string;
  onManualNameChange?: (name: string) => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
}

/**
 * PassengerAutocomplete - Route-aware passenger selection
 *
 * When pickup and dropoff postcodes are provided, shows suggested passengers
 * who have previously traveled similar routes (Feature 3).
 * Falls back to regular passenger search when postcodes aren't available.
 */
export default function PassengerAutocomplete({
  onSelect,
  selectedPassenger,
  pickupPostcode,
  dropoffPostcode,
  manualName = '',
  onManualNameChange,
  placeholder = 'Search passengers or enter name...',
  label = 'Passenger',
  helpText,
}: PassengerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [passengers, setPassengers] = useState<PassengerListItem[]>([]);
  const [suggestedPassengers, setSuggestedPassengers] = useState<SuggestedPassenger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract outward code from UK postcode (e.g., "BH8 8DX" -> "BH8")
  const extractOutwardCode = (postcode: string | undefined): string | null => {
    if (!postcode) return null;
    const trimmed = postcode.trim().toUpperCase();
    // UK postcodes: outward code is everything before the space (or first 2-4 chars if no space)
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex > 0) {
      return trimmed.substring(0, spaceIndex);
    }
    // If no space, extract outward code (2-4 chars)
    const match = trimmed.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)/);
    return match ? match[1] : null;
  };

  // Fetch suggestions based on route
  const fetchSuggestions = useCallback(async () => {
    const pickupCode = extractOutwardCode(pickupPostcode);
    const dropoffCode = extractOutwardCode(dropoffPostcode);

    if (pickupCode && dropoffCode) {
      try {
        const data = await getSuggestedPassengers(pickupCode, dropoffCode, 5);
        setSuggestedPassengers(data.passengers);
        setHasSuggestions(data.passengers.length > 0);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setSuggestedPassengers([]);
        setHasSuggestions(false);
      }
    } else {
      setSuggestedPassengers([]);
      setHasSuggestions(false);
    }
  }, [pickupPostcode, dropoffPostcode]);

  // Fetch suggestions when postcodes change
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Fetch all passengers on mount
  const fetchPassengers = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const data = await getPassengers(query || undefined);
      setPassengers(data.passengers);
    } catch (err) {
      console.error('Failed to fetch passengers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  // Debounced search
  useEffect(() => {
    if (!isOpen || searchQuery === '') return;

    const timer = setTimeout(() => {
      fetchPassengers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchPassengers, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePassengerSelect = async (passenger: PassengerListItem | SuggestedPassenger) => {
    try {
      const { passenger: fullPassenger } = await getPassenger(passenger.passengerId);
      onSelect({
        passengerId: fullPassenger.passengerId,
        displayName: passenger.displayName,
        firstName: fullPassenger.firstName,
        lastName: fullPassenger.lastName,
        title: fullPassenger.title,
        alias: fullPassenger.alias,
        contactName: fullPassenger.contactName,
        isRepresentative: fullPassenger.isRepresentative,
        email: fullPassenger.email,
        phone: fullPassenger.phone,
        driverInstructions: fullPassenger.driverInstructions,
        refreshments: fullPassenger.refreshments,
      });
    } catch (err) {
      console.error('Failed to fetch full passenger details:', err);
      onSelect({
        passengerId: passenger.passengerId,
        displayName: passenger.displayName,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        title: passenger.title,
        alias: passenger.alias,
        contactName: passenger.contactName,
        isRepresentative: passenger.isRepresentative,
        email: passenger.email,
        phone: passenger.phone,
      });
    }
    setUseManualEntry(false);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setUseManualEntry(false);
    onManualNameChange?.('');
    setSearchQuery('');
  };

  const handleManualEntry = () => {
    setUseManualEntry(true);
    onSelect(null);
    if (searchQuery.trim()) {
      onManualNameChange?.(searchQuery);
    }
    setIsOpen(false);
    setSearchQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputFocus = () => {
    if (!selectedPassenger && !useManualEntry) {
      setIsOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (useManualEntry) {
      onManualNameChange?.(value);
    } else {
      setSearchQuery(value);
      setIsOpen(true);
    }
  };

  const displayValue = (): string => {
    if (selectedPassenger) {
      return selectedPassenger.displayName;
    }
    if (useManualEntry) {
      return manualName;
    }
    return searchQuery;
  };

  const getMatchIcon = (reason: 'route' | 'frequency') => {
    if (reason === 'route') {
      return <MapPin className="h-3 w-3 text-green-600" />;
    }
    return <Clock className="h-3 w-3 text-blue-600" />;
  };

  const getMatchLabel = (reason: 'route' | 'frequency') => {
    if (reason === 'route') {
      return 'Route match';
    }
    return 'Frequent traveler';
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>

      {/* Selected Passenger Display */}
      {selectedPassenger ? (
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--corp-accent-muted)] border border-[var(--corp-accent)] rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[var(--corp-accent-muted)] rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-[var(--corp-accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium">{selectedPassenger.displayName}</p>
              {selectedPassenger.alias && (
                <p className="text-xs corp-page-subtitle">&ldquo;{selectedPassenger.alias}&rdquo;</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selected passenger"
            className="p-1.5 corp-page-subtitle hover:text-[var(--corp-text-primary)] hover:bg-[var(--corp-bg-hover)] rounded-full transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* Input Field */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--corp-text-muted)] pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={displayValue()}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="passenger-autocomplete-listbox"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            className="corp-input w-full pl-10 pr-4 py-3 rounded-lg"
          />
          {(searchQuery || (useManualEntry && manualName)) && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 corp-page-subtitle hover:text-[var(--corp-text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !selectedPassenger && (
        <div
          id="passenger-autocomplete-listbox"
          role="listbox"
          aria-label="Passenger suggestions"
          className="absolute z-50 mt-1 w-full bg-[var(--corp-bg-secondary)] border-2 border-[var(--corp-accent)] rounded-lg max-h-80 overflow-auto shadow-[0_4px_20px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]"
        >
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="corp-loading-spinner h-5 w-5 border-2 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* Suggested Passengers Section */}
              {hasSuggestions && !searchQuery && (
                <div className="border-b border-[var(--corp-border-default)]">
                  <div className="px-4 py-2 bg-[var(--corp-bg-hover)]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--corp-text-muted)]">
                      Suggested for this route
                    </p>
                  </div>
                  {suggestedPassengers.map((passenger) => (
                    <button
                      key={`suggested-${passenger.passengerId}`}
                      type="button"
                      role="option"
                      onClick={() => handlePassengerSelect(passenger)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--corp-bg-hover)] transition-colors"
                    >
                      <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {passenger.displayName}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {getMatchIcon(passenger.matchReason)}
                          <span className="text-xs text-[var(--corp-text-muted)]">
                            {getMatchLabel(passenger.matchReason)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All Passengers Section */}
              <div>
                {(hasSuggestions && !searchQuery) && (
                  <div className="px-4 py-2 bg-[var(--corp-bg-hover)]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--corp-text-muted)]">
                      All passengers
                    </p>
                  </div>
                )}
                {passengers.length > 0 ? (
                  <div className="py-1">
                    {passengers.map((passenger) => (
                      <button
                        key={passenger.passengerId}
                        type="button"
                        role="option"
                        onClick={() => handlePassengerSelect(passenger)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--corp-bg-hover)] transition-colors"
                      >
                        <div className="h-8 w-8 bg-[var(--corp-accent-muted)] rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-[var(--corp-accent)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {passenger.displayName}
                          </p>
                          {passenger.alias && (
                            <p className="text-xs corp-page-subtitle truncate">
                              &ldquo;{passenger.alias}&rdquo;
                            </p>
                          )}
                        </div>
                        {passenger.email && (
                          <span className="text-xs corp-page-subtitle truncate max-w-[120px]">
                            {passenger.email}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="p-4 text-center text-sm corp-page-subtitle">
                    No passengers found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm corp-page-subtitle">
                    No passengers in your directory yet
                  </div>
                )}
              </div>

              {/* Manual Entry Option */}
              <div className="border-t border-[var(--corp-border-default)]">
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--corp-bg-hover)] transition-colors"
                >
                  <div className="h-8 w-8 bg-[var(--corp-bg-hover)] rounded-full flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 corp-page-subtitle" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {searchQuery ? `Use "${searchQuery}"` : 'Enter name manually'}
                    </p>
                    <p className="text-xs corp-page-subtitle">
                      For one-time passengers not in your directory
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Entry Indicator */}
      {useManualEntry && !selectedPassenger && manualName && (
        <div className="mt-2 flex items-center gap-2 text-xs corp-page-subtitle">
          <Plus className="h-3.5 w-3.5 text-[var(--corp-accent)]" />
          Manual entry - this passenger won&apos;t be saved to your directory
        </div>
      )}

      {helpText && !selectedPassenger && !useManualEntry && (
        <p className="mt-1 text-xs corp-page-subtitle">{helpText}</p>
      )}
    </div>
  );
}
