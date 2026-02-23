'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Clock, CheckCircle, AlertTriangle, Zap, Heart, Edit2 } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPassengers,
  getFavouriteTrips,
  getDashboard,
  markTripUsed,
  type PassengerListItem,
  type FavouriteTrip,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import PassengerSelector, { SelectedPassenger } from '@/components/corporate/PassengerSelector';
import Footer from '@/components/shared/Footer';

type QuickBookStep = 'passenger' | 'trip' | 'datetime' | 'confirm';

export default function QuickBookPage() {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const router = useRouter();
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [currentStep, setCurrentStep] = useState<QuickBookStep>('passenger');

  // Data
  const [passengers, setPassengers] = useState<PassengerListItem[]>([]);
  const [trips, setTrips] = useState<FavouriteTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selections
  const [selectedPassenger, setSelectedPassenger] = useState<SelectedPassenger | null>(null);
  const [manualPassengerName, setManualPassengerName] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<FavouriteTrip | null>(null);
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
        getPassengers(),
        getFavouriteTrips(),
        getDashboard()
      ])
        .then(([passengersData, tripsData, dashboardData]) => {
          setPassengers(passengersData.passengers);
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
        return selectedTrip !== null;
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
    if (!selectedTrip) return;

    // Mark trip as used
    try {
      await markTripUsed(selectedTrip.tripId);
    } catch (err) {
      console.error('Failed to mark trip as used:', err);
    }

    // Build query params for quote page
    const params = new URLSearchParams({
      tripId: selectedTrip.tripId,
    });

    // Navigate to quote page with pre-filled trip
    router.push(`/corporate/quote?${params.toString()}`);
  };

  const handleEditDetails = () => {
    if (!selectedTrip) return;

    // Navigate directly to quote page for full customization
    router.push(`/corporate/quote?tripId=${selectedTrip.tripId}`);
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
                    onSelect={setSelectedPassenger}
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
                    <h2 className="text-lg font-semibold text-navy">Select a favourite trip</h2>
                    <Link
                      href="/corporate/quote"
                      className="text-sm text-sage hover:text-sage-dark font-medium"
                    >
                      New trip instead
                    </Link>
                  </div>

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
                      {trips.map((trip) => (
                        <button
                          key={trip.tripId}
                          onClick={() => setSelectedTrip(trip)}
                          className={`w-full text-left p-4 border rounded-lg transition-colors ${
                            selectedTrip?.tripId === trip.tripId
                              ? 'border-sage bg-sage/5'
                              : 'border-sage/20 hover:border-sage/40'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-navy truncate">{trip.label}</p>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-start gap-2 text-sm text-navy-light/70">
                                  <MapPin className="h-4 w-4 text-sage flex-shrink-0 mt-0.5" />
                                  <span className="truncate">{trip.pickupLocation.address}</span>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-navy-light/70">
                                  <MapPin className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                  <span className="truncate">{trip.dropoffLocation.address}</span>
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
                            {selectedTrip?.tripId === trip.tripId && (
                              <CheckCircle className="h-5 w-5 text-sage flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Date/Time Selection */}
              {currentStep === 'datetime' && (
                <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
                  <h2 className="text-lg font-semibold text-navy mb-4">When do you need the transfer?</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-1">
                        Pickup Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-navy-light/50 pointer-events-none" />
                        <input
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          min={getMinDate()}
                          className="w-full pl-10 pr-4 py-3 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-navy mb-1">
                        Pickup Time
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-navy-light/50 pointer-events-none" />
                        <input
                          type="time"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmation */}
              {currentStep === 'confirm' && selectedTrip && (
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
                      <p className="text-sm font-medium text-navy mb-2">{selectedTrip.label}</p>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm text-navy-light/70">
                          <MapPin className="h-4 w-4 text-sage flex-shrink-0 mt-0.5" />
                          <span>{selectedTrip.pickupLocation.address}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-navy-light/70">
                          <MapPin className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{selectedTrip.dropoffLocation.address}</span>
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
              )}

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
