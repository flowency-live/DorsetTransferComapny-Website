'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Clock, CheckCircle, AlertTriangle, Zap, Heart, Edit2, History } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getFavouriteTrips,
  getDashboard,
  markTripUsed,
  getPassengerJourneys,
  type FavouriteTrip,
  type Journey,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import PassengerSelector, { SelectedPassenger } from '@/components/corporate/PassengerSelector';
import Footer from '@/components/shared/Footer';

type QuickBookStep = 'passenger' | 'trip' | 'datetime' | 'confirm';

// Selected trip can be either a favourite trip or a recent journey
type SelectedTripData =
  | { type: 'favourite'; trip: FavouriteTrip }
  | { type: 'journey'; journey: Journey };

export default function QuickBookPage() {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const router = useRouter();
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [currentStep, setCurrentStep] = useState<QuickBookStep>('passenger');

  // Data
  const [trips, setTrips] = useState<FavouriteTrip[]>([]);
  const [recentJourneys, setRecentJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [journeysLoading, setJourneysLoading] = useState(false);

  // Tab selection for Step 2
  type TripTab = 'favourites' | 'recent';
  const [activeTab, setActiveTab] = useState<TripTab>('favourites');

  // Selections
  const [selectedPassenger, setSelectedPassenger] = useState<SelectedPassenger | null>(null);
  const [manualPassengerName, setManualPassengerName] = useState('');
  const [selectedTripData, setSelectedTripData] = useState<SelectedTripData | null>(null);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');

  // UI
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data
  useEffect(() => {
    if (user) {
      Promise.all([
        getFavouriteTrips(),
        getDashboard()
      ])
        .then(([tripsData, dashboardData]) => {
          setTrips(tripsData.trips);
          setCompanyName(dashboardData.company?.companyName);
        })
        .catch((err) => {
          console.error('Failed to load data:', err);
          showToast('Failed to load data', 'error');
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, showToast]);

  // Handle passenger selection and fetch their journey history
  const handlePassengerSelect = useCallback(async (passenger: SelectedPassenger | null) => {
    setSelectedPassenger(passenger);
    setRecentJourneys([]);

    if (passenger?.passengerId) {
      setJourneysLoading(true);
      try {
        const response = await getPassengerJourneys(passenger.passengerId, 5);
        setRecentJourneys(response.journeys);
      } catch (err) {
        console.error('Failed to load passenger journeys:', err);
      } finally {
        setJourneysLoading(false);
      }
    }
  }, []);

  const getPassengerDisplayName = (): string => {
    if (selectedPassenger) {
      return selectedPassenger.displayName;
    }
    if (manualPassengerName) {
      return manualPassengerName;
    }
    return user?.name || '';
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'passenger':
        // At least need to have user (booking for self) or selected/manual passenger
        return true;
      case 'trip':
        return selectedTripData !== null;
      case 'datetime':
        return pickupDate !== '' && pickupTime !== '';
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    switch (currentStep) {
      case 'passenger':
        setCurrentStep('trip');
        break;
      case 'trip':
        setCurrentStep('datetime');
        break;
      case 'datetime':
        setCurrentStep('confirm');
        break;
      case 'confirm':
        handleProceedToQuote();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'trip':
        setCurrentStep('passenger');
        break;
      case 'datetime':
        setCurrentStep('trip');
        break;
      case 'confirm':
        setCurrentStep('datetime');
        break;
    }
  };

  const handleProceedToQuote = async () => {
    if (!selectedTripData) return;

    const params = new URLSearchParams();

    // Pass date/time for instant booking
    if (pickupDate && pickupTime) {
      params.set('pickupDateTime', `${pickupDate}T${pickupTime}`);
    }

    // Pass passenger if selected
    if (selectedPassenger?.passengerId) {
      params.set('passengerId', selectedPassenger.passengerId);
    }

    if (selectedTripData.type === 'favourite') {
      // Mark favourite trip as used
      try {
        await markTripUsed(selectedTripData.trip.tripId);
      } catch (err) {
        console.error('Failed to mark trip as used:', err);
      }
      params.set('tripId', selectedTripData.trip.tripId);

      // Enable instant booking if trip has vehicle type defined
      if (selectedTripData.trip.vehicleType) {
        params.set('instantBook', 'true');
      }
    } else {
      // For recent journeys, pass location data as rebook params
      const journey = selectedTripData.journey;
      if (selectedPassenger?.passengerId) {
        params.set('passengerId', selectedPassenger.passengerId);
      }
      if (journey.pickupLocation) {
        params.set('pickupAddress', journey.pickupLocation.address);
        if (journey.pickupLocation.lat) params.set('pickupLat', String(journey.pickupLocation.lat));
        if (journey.pickupLocation.lng) params.set('pickupLng', String(journey.pickupLocation.lng));
        if (journey.pickupLocation.placeId) params.set('pickupPlaceId', journey.pickupLocation.placeId);
      }
      if (journey.dropoffLocation) {
        params.set('dropoffAddress', journey.dropoffLocation.address);
        if (journey.dropoffLocation.lat) params.set('dropoffLat', String(journey.dropoffLocation.lat));
        if (journey.dropoffLocation.lng) params.set('dropoffLng', String(journey.dropoffLocation.lng));
        if (journey.dropoffLocation.placeId) params.set('dropoffPlaceId', journey.dropoffLocation.placeId);
      }
      if (journey.vehicleType) params.set('vehicleType', journey.vehicleType);
      if (journey.passengers) params.set('passengers', String(journey.passengers));
      if (journey.luggage) params.set('luggage', String(journey.luggage));
    }

    // Navigate to quote page with pre-filled data
    router.push(`/corporate/quote?${params.toString()}`);
  };

  const handleEditDetails = () => {
    if (!selectedTripData) return;

    // Navigate directly to quote page for full customization
    // Re-use the same logic as handleProceedToQuote
    handleProceedToQuote();
  };

  // Get display data from selected trip (works for both types)
  const getSelectedTripDisplay = () => {
    if (!selectedTripData) return null;
    if (selectedTripData.type === 'favourite') {
      const trip = selectedTripData.trip;
      return {
        label: trip.label,
        pickupAddress: trip.pickupLocation.address,
        dropoffAddress: trip.dropoffLocation.address,
        passengers: trip.passengers,
      };
    } else {
      const journey = selectedTripData.journey;
      return {
        label: `${journey.pickup} → ${journey.dropoff}`,
        pickupAddress: journey.pickup,
        dropoffAddress: journey.dropoff,
        passengers: journey.passengers,
      };
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatJourneyDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatPrice = (pricePence: number | null): string => {
    if (!pricePence) return '';
    return `£${(pricePence / 100).toFixed(2)}`;
  };

  const getMinDate = (): string => {
    const now = new Date();
    now.setHours(now.getHours() + 2); // Minimum 2 hours from now
    return now.toISOString().split('T')[0];
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
        companyName={companyName}
        onLogout={logout}
        isAdmin={isAdmin}
      />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          {/* Page Header */}
          <div className="mb-8">
            <Link
              href="/corporate/dashboard"
              className="inline-flex items-center text-sm text-navy-light/70 hover:text-sage transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-sage/10 rounded-full flex items-center justify-center">
                <Zap className="h-5 w-5 text-sage" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-navy">Quick Book</h1>
                <p className="text-navy-light/70 mt-0.5">
                  Book a transfer in just a few clicks
                </p>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {['passenger', 'trip', 'datetime', 'confirm'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep === step
                        ? 'bg-sage text-white'
                        : ['passenger', 'trip', 'datetime', 'confirm'].indexOf(currentStep) > index
                        ? 'bg-sage/20 text-sage'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div
                      className={`w-12 h-1 transition-colors ${
                        ['passenger', 'trip', 'datetime', 'confirm'].indexOf(currentStep) > index
                          ? 'bg-sage'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-4 text-xs text-navy-light/70">
              <span>Passenger</span>
              <span>Trip</span>
              <span>Date/Time</span>
              <span>Confirm</span>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
              <p className="mt-4 text-sm text-navy-light/70">Loading your data...</p>
            </div>
          ) : (
            <>
              {/* Step 1: Passenger Selection */}
              {currentStep === 'passenger' && (
                <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
                  <h2 className="text-lg font-semibold text-navy mb-4">Who is travelling?</h2>
                  <PassengerSelector
                    selectedPassenger={selectedPassenger}
                    onSelect={handlePassengerSelect}
                    manualName={manualPassengerName}
                    onManualNameChange={setManualPassengerName}
                    placeholder="Search or select a passenger..."
                    helpText="Select from your passenger directory or enter a name. Leave blank to book for yourself."
                  />

                  {!selectedPassenger && !manualPassengerName && (
                    <div className="mt-4 p-3 bg-sage/5 border border-sage/20 rounded-lg">
                      <p className="text-sm text-navy-light/70">
                        <span className="font-medium text-navy">Booking for yourself?</span> Just click Continue - your details will be used.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Trip Selection */}
              {currentStep === 'trip' && (
                <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-navy">Select a trip</h2>
                    <Link
                      href="/corporate/quote"
                      className="text-sm text-sage hover:text-sage-dark font-medium"
                    >
                      New trip instead
                    </Link>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex border-b border-sage/20 mb-4">
                    <button
                      onClick={() => setActiveTab('favourites')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'favourites'
                          ? 'border-sage text-sage'
                          : 'border-transparent text-navy-light/70 hover:text-navy'
                      }`}
                    >
                      <Heart className="h-4 w-4" />
                      Favourite Trips
                      {trips.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-sage/10 text-sage rounded-full">
                          {trips.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('recent')}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'recent'
                          ? 'border-sage text-sage'
                          : 'border-transparent text-navy-light/70 hover:text-navy'
                      }`}
                    >
                      <History className="h-4 w-4" />
                      Recent Journeys
                      {recentJourneys.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-sage/10 text-sage rounded-full">
                          {recentJourneys.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Favourite Trips Tab */}
                  {activeTab === 'favourites' && (
                    <>
                      {trips.length === 0 ? (
                        <div className="text-center py-8">
                          <Heart className="mx-auto h-12 w-12 text-sage/30" />
                          <p className="mt-4 text-sm text-navy-light/70">No favourite trips saved yet</p>
                          <p className="mt-1 text-xs text-navy-light/50">
                            Save trips after getting a quote for quick rebooking
                          </p>
                          <Link
                            href="/corporate/quote"
                            className="mt-4 inline-flex items-center text-sm font-medium text-sage hover:text-sage-dark"
                          >
                            Create a new booking
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {trips.map((trip) => {
                            const isSelected = selectedTripData?.type === 'favourite' && selectedTripData.trip.tripId === trip.tripId;
                            return (
                              <button
                                key={trip.tripId}
                                onClick={() => setSelectedTripData({ type: 'favourite', trip })}
                                className={`w-full text-left p-4 border rounded-lg transition-colors ${
                                  isSelected
                                    ? 'border-sage bg-sage/5'
                                    : 'border-sage/20 hover:border-sage/40'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-navy">{trip.label}</p>
                                    <div className="mt-2 space-y-1">
                                      <div className="flex items-start gap-2 text-sm text-navy-light/70">
                                        <MapPin className="h-4 w-4 text-sage flex-shrink-0 mt-0.5" />
                                        <span className="break-words">{trip.pickupLocation.address}</span>
                                      </div>
                                      <div className="flex items-start gap-2 text-sm text-navy-light/70">
                                        <MapPin className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <span className="break-words">{trip.dropoffLocation.address}</span>
                                      </div>
                                    </div>
                                    {(trip.passengers || trip.luggage) && (
                                      <div className="mt-2 flex items-center gap-3 text-xs text-navy-light/50">
                                        {trip.passengers && (
                                          <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {trip.passengers}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="h-5 w-5 text-sage flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Recent Journeys Tab */}
                  {activeTab === 'recent' && (
                    <>
                      {!selectedPassenger ? (
                        <div className="text-center py-8">
                          <History className="mx-auto h-12 w-12 text-navy-light/20" />
                          <p className="mt-4 text-sm text-navy-light/70">Select a passenger first</p>
                          <p className="mt-1 text-xs text-navy-light/50">
                            Recent journeys are specific to each passenger
                          </p>
                          <button
                            onClick={() => setCurrentStep('passenger')}
                            className="mt-4 inline-flex items-center text-sm font-medium text-sage hover:text-sage-dark"
                          >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Go back to select a passenger
                          </button>
                        </div>
                      ) : journeysLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
                          <p className="mt-4 text-sm text-navy-light/70">Loading recent journeys...</p>
                        </div>
                      ) : recentJourneys.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="mx-auto h-12 w-12 text-sage/30" />
                          <p className="mt-4 text-sm text-navy-light/70">
                            No recent journeys for {selectedPassenger.displayName}
                          </p>
                          <p className="mt-1 text-xs text-navy-light/50">
                            Journey history will appear here after bookings are completed
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentJourneys.map((journey) => {
                            const isSelected = selectedTripData?.type === 'journey' && selectedTripData.journey.bookingId === journey.bookingId;
                            return (
                              <button
                                key={journey.bookingId}
                                onClick={() => setSelectedTripData({ type: 'journey', journey })}
                                className={`w-full text-left p-4 border rounded-lg transition-colors ${
                                  isSelected
                                    ? 'border-sage bg-sage/5'
                                    : 'border-sage/20 hover:border-sage/40'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-navy-light/50">
                                        {formatJourneyDate(journey.date)}
                                      </span>
                                      {journey.pricePence && (
                                        <span className="text-xs font-medium text-sage">
                                          {formatPrice(journey.pricePence)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      <div className="flex items-start gap-2 text-sm text-navy-light/70">
                                        <MapPin className="h-4 w-4 text-sage flex-shrink-0 mt-0.5" />
                                        <span className="break-words">{journey.pickup}</span>
                                      </div>
                                      <div className="flex items-start gap-2 text-sm text-navy-light/70">
                                        <MapPin className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <span className="break-words">{journey.dropoff}</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-navy-light/50">
                                      {journey.vehicleName && (
                                        <span>{journey.vehicleName}</span>
                                      )}
                                      {journey.passengers && (
                                        <span className="flex items-center gap-1">
                                          <Users className="h-3.5 w-3.5" />
                                          {journey.passengers}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="h-5 w-5 text-sage flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Date/Time Selection */}
              {currentStep === 'datetime' && (
                <div className="bg-white rounded-xl shadow-sm border border-sage/20 p-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sage/10 mb-4">
                      <Calendar className="h-7 w-7 text-sage" />
                    </div>
                    <h2 className="text-xl font-semibold text-navy">When do you need this transfer?</h2>
                    <p className="text-sm text-navy-light/70 mt-1">Select your preferred pickup date and time</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Pickup Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-sage pointer-events-none" />
                        <input
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          min={getMinDate()}
                          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-sage/30 rounded-xl shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">
                        Pickup Time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-sage pointer-events-none" />
                        <input
                          type="time"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 text-lg border-2 border-sage/30 rounded-xl shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick time presets */}
                  <div className="mt-6 pt-6 border-t border-sage/10">
                    <p className="text-xs font-medium text-navy-light/70 uppercase tracking-wider mb-3">Quick Select Time</p>
                    <div className="flex flex-wrap gap-2">
                      {['06:00', '07:00', '08:00', '09:00', '12:00', '14:00', '17:00', '19:00'].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setPickupTime(time)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            pickupTime === time
                              ? 'bg-sage text-white border-sage'
                              : 'border-sage/30 text-navy hover:bg-sage/10 hover:border-sage'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 'confirm' && selectedTripData && (() => {
                const tripDisplay = getSelectedTripDisplay();
                if (!tripDisplay) return null;
                return (
                  <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
                    <h2 className="text-lg font-semibold text-navy mb-4">Confirm your booking</h2>

                    <div className="space-y-4">
                      {/* Passenger */}
                      <div className="p-4 bg-sage/5 rounded-lg">
                        <p className="text-xs font-medium text-navy-light/70 uppercase tracking-wider mb-1">Passenger</p>
                        <p className="text-sm font-medium text-navy">{getPassengerDisplayName()}</p>
                      </div>

                      {/* Trip Details */}
                      <div className="p-4 bg-sage/5 rounded-lg">
                        <p className="text-xs font-medium text-navy-light/70 uppercase tracking-wider mb-2">Trip</p>
                        <p className="text-sm font-medium text-navy mb-2">{tripDisplay.label}</p>
                        <div className="space-y-1">
                          <div className="flex items-start gap-2 text-sm text-navy-light/70">
                            <MapPin className="h-4 w-4 text-sage flex-shrink-0 mt-0.5" />
                            <span>{tripDisplay.pickupAddress}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-navy-light/70">
                            <MapPin className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <span>{tripDisplay.dropoffAddress}</span>
                          </div>
                        </div>
                      </div>

                      {/* Date/Time */}
                      <div className="p-4 bg-sage/5 rounded-lg">
                        <p className="text-xs font-medium text-navy-light/70 uppercase tracking-wider mb-1">Date &amp; Time</p>
                        <p className="text-sm font-medium text-navy">
                          {formatDate(pickupDate)} at {pickupTime}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        You&apos;ll review the final price and complete the booking on the next screen.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Navigation Buttons */}
              <div className="mt-6 flex justify-between">
                {currentStep !== 'passenger' ? (
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-navy border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-3">
                  {currentStep === 'confirm' && (
                    <button
                      onClick={handleEditDetails}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-navy border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Details
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={!canProceed() || (currentStep === 'trip' && trips.length === 0)}
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-sage border border-transparent rounded-full hover:bg-sage-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {currentStep === 'confirm' ? (
                      <>
                        Get Quote
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Toast Notification */}
      {toast?.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-sage text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
