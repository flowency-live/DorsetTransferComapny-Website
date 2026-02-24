'use client';

import { ArrowLeft, Heart } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';

import CorporateHeader from '@/components/corporate/CorporateHeader';
import PassengerSelector, { SelectedPassenger } from '@/components/corporate/PassengerSelector';
import SavePassengerModal from '@/components/corporate/SavePassengerModal';
import SaveTripModal from '@/components/corporate/SaveTripModal';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getCompany, getFavouriteTrips, markTripUsed, FavouriteTrip, getPassenger, type Passenger } from '@/lib/services/corporateApi';

// Reuse components from public quote flow
import AllInputsStep from '../../quote/components/AllInputsStep';
import BookingConfirmation from '../../quote/components/BookingConfirmation';
import ContactDetailsForm, { ContactDetails } from '../../quote/components/ContactDetailsForm';
import LoadingState from '../../quote/components/LoadingState';
import PaymentForm, { PaymentDetails } from '../../quote/components/PaymentForm';
import QuoteResult from '../../quote/components/QuoteResult';
import VehicleComparisonGrid from '../../quote/components/VehicleComparisonGrid';
import { calculateMultiVehicleQuote, saveQuote } from '../../quote/lib/api';
import { Extras, JourneyType, QuoteResponse, Location, Waypoint, MultiVehicleQuoteResponse } from '../../quote/lib/types';

type Step = 1 | 2;
type BookingStage = 'quote' | 'contact' | 'payment' | 'confirmation';

interface CompanyData {
  companyName: string;
  paymentTerms: 'immediate' | 'net7' | 'net14' | 'net30';
  status: string;
}

function CorporateQuotePageContent() {
  // Auth
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const searchParams = useSearchParams();
  const tripIdParam = searchParams.get('tripId');

  // Rebook params (from passenger journey history)
  const rebookPassengerId = searchParams.get('passengerId');
  const rebookPickupAddress = searchParams.get('pickupAddress');
  const rebookPickupLat = searchParams.get('pickupLat');
  const rebookPickupLng = searchParams.get('pickupLng');
  const rebookPickupPlaceId = searchParams.get('pickupPlaceId');
  const rebookDropoffAddress = searchParams.get('dropoffAddress');
  const rebookDropoffLat = searchParams.get('dropoffLat');
  const rebookDropoffLng = searchParams.get('dropoffLng');
  const rebookDropoffPlaceId = searchParams.get('dropoffPlaceId');
  const rebookVehicleType = searchParams.get('vehicleType');
  const rebookPassengers = searchParams.get('passengers');
  const rebookLuggage = searchParams.get('luggage');

  // Company data (for payment terms)
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Favourite trip state
  const [loadedTrip, setLoadedTrip] = useState<FavouriteTrip | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [showSaveTripModal, setShowSaveTripModal] = useState(false);
  const [showSavePassengerModal, setShowSavePassengerModal] = useState(false);

  // Form state (same as public quote)
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(0);

  // Journey type & extras state
  const [journeyType, setJourneyType] = useState<JourneyType>('one-way');
  const [duration, setDuration] = useState(4);
  const [extras, setExtras] = useState<Extras>({ babySeats: 0, childSeats: 0 });
  const [returnToPickup, setReturnToPickup] = useState(true);

  const handleJourneyTypeChange = (newType: JourneyType) => {
    if (newType === 'hourly') {
      setReturnToPickup(true);
    }
    setJourneyType(newType);
  };

  // Transport details
  const [flightNumber, setFlightNumber] = useState('');
  const [trainNumber, setTrainNumber] = useState('');
  const [returnFlightNumber, setReturnFlightNumber] = useState('');
  const [returnTrainNumber, setReturnTrainNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Corporate-specific: Passenger selection (booking for someone else)
  const [selectedPassenger, setSelectedPassenger] = useState<SelectedPassenger | null>(null);
  const [manualPassengerName, setManualPassengerName] = useState('');

  // Step 2 state
  const [multiQuote, setMultiQuote] = useState<MultiVehicleQuoteResponse | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // UI state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking flow state
  const [bookingStage, setBookingStage] = useState<BookingStage>('quote');
  const [contactDetails, setContactDetails] = useState<ContactDetails | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [magicToken, setMagicToken] = useState<string | null>(null);

  // Fetch company data on mount
  useEffect(() => {
    if (user) {
      getCompany()
        .then((data) => {
          setCompany(data as unknown as CompanyData);
        })
        .catch(console.error)
        .finally(() => setCompanyLoading(false));
    }
  }, [user]);

  // Load favourite trip if tripId param is present
  const loadTrip = useCallback(async () => {
    if (!tripIdParam || !user) return;

    setTripLoading(true);
    try {
      const { trips } = await getFavouriteTrips();
      const trip = trips.find(t => t.tripId === tripIdParam);

      if (trip) {
        setLoadedTrip(trip);

        // Pre-fill form with trip data
        setPickupLocation({
          address: trip.pickupLocation.address,
          placeId: trip.pickupLocation.placeId,
          lat: trip.pickupLocation.lat,
          lng: trip.pickupLocation.lng,
        });
        setDropoffLocation({
          address: trip.dropoffLocation.address,
          placeId: trip.dropoffLocation.placeId,
          lat: trip.dropoffLocation.lat,
          lng: trip.dropoffLocation.lng,
        });

        if (trip.waypoints && trip.waypoints.length > 0) {
          setWaypoints(trip.waypoints.map(w => ({
            address: w.address,
            placeId: w.placeId,
            lat: w.lat,
            lng: w.lng,
            waitTime: w.waitTime,
          })));
        }

        if (trip.passengers) setPassengers(trip.passengers);
        if (trip.luggage) setLuggage(trip.luggage);
      }
    } catch (err) {
      console.error('Failed to load favourite trip:', err);
    } finally {
      setTripLoading(false);
    }
  }, [tripIdParam, user]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  // Handle rebook params (from passenger journey history)
  const loadRebook = useCallback(async () => {
    // Only process if we have rebook params and not loading a favourite trip
    if (!rebookPickupAddress || tripIdParam || !user) return;

    // Pre-fill pickup location
    setPickupLocation({
      address: rebookPickupAddress,
      placeId: rebookPickupPlaceId || undefined,
      lat: rebookPickupLat ? parseFloat(rebookPickupLat) : undefined,
      lng: rebookPickupLng ? parseFloat(rebookPickupLng) : undefined,
    });

    // Pre-fill dropoff location
    if (rebookDropoffAddress) {
      setDropoffLocation({
        address: rebookDropoffAddress,
        placeId: rebookDropoffPlaceId || undefined,
        lat: rebookDropoffLat ? parseFloat(rebookDropoffLat) : undefined,
        lng: rebookDropoffLng ? parseFloat(rebookDropoffLng) : undefined,
      });
    }

    // Pre-fill passenger and luggage counts
    if (rebookPassengers) setPassengers(parseInt(rebookPassengers, 10) || 2);
    if (rebookLuggage) setLuggage(parseInt(rebookLuggage, 10) || 0);

    // Load passenger details to auto-select and pre-fill preferences
    if (rebookPassengerId) {
      try {
        const { passenger } = await getPassenger(rebookPassengerId);
        const nameParts = [passenger.title, passenger.firstName, passenger.lastName].filter(Boolean);
        const displayName = nameParts.join(' ');

        setSelectedPassenger({
          passengerId: passenger.passengerId,
          displayName,
          email: passenger.email || undefined,
          phone: passenger.phone || undefined,
        });

        // Auto-fill special requests with driver instructions
        if (passenger.driverInstructions) {
          setSpecialRequests(passenger.driverInstructions);
        }
      } catch (err) {
        console.error('Failed to load passenger for rebook:', err);
      }
    }
  }, [
    rebookPickupAddress, rebookPickupLat, rebookPickupLng, rebookPickupPlaceId,
    rebookDropoffAddress, rebookDropoffLat, rebookDropoffLng, rebookDropoffPlaceId,
    rebookPassengers, rebookLuggage, rebookPassengerId, tripIdParam, user
  ]);

  useEffect(() => {
    loadRebook();
  }, [loadRebook]);

  // Pre-fill contact details from user profile
  useEffect(() => {
    if (user && !contactDetails) {
      setContactDetails({
        name: user.name,
        email: user.email,
        phone: '', // User may need to add phone
      });
    }
  }, [user, contactDetails]);

  // Validation for Step 1
  const canProceedFromStep1 = () => {
    if (journeyType === 'hourly') {
      const baseValid = pickupLocation?.address.trim() !== '' &&
        pickupDate !== null &&
        duration >= 4 &&
        duration <= 12;
      if (returnToPickup) {
        return baseValid;
      }
      return baseValid && dropoffLocation?.address.trim() !== '';
    }
    if (journeyType === 'round-trip') {
      return (
        pickupLocation?.address.trim() !== '' &&
        dropoffLocation?.address.trim() !== '' &&
        pickupDate !== null &&
        returnDate !== null
      );
    }
    return (
      pickupLocation?.address.trim() !== '' &&
      dropoffLocation?.address.trim() !== '' &&
      pickupDate !== null
    );
  };

  const handleNextStep = async () => {
    setError(null);

    if (currentStep === 1 && !canProceedFromStep1()) {
      setError('Please complete all required fields');
      return;
    }

    if (currentStep === 1) {
      await fetchAllQuotes();
    }
  };

  const fetchAllQuotes = async () => {
    const isHourly = journeyType === 'hourly';

    if (!pickupLocation || !pickupDate) return;
    if (!isHourly && !dropoffLocation) return;
    if (isHourly && !returnToPickup && !dropoffLocation) return;

    setLoadingQuotes(true);
    setError(null);

    try {
      const filteredWaypoints: Waypoint[] = waypoints.filter(w => {
        const hasValidAddress = w.address && w.address.trim().length > 0;
        const hasValidPlaceId = w.placeId && w.placeId.trim().length > 0;
        return hasValidAddress && hasValidPlaceId;
      });

      const apiJourneyType = isHourly ? 'by-the-hour' : 'one-way';

      let apiDropoff: Location | undefined;
      if (isHourly) {
        apiDropoff = returnToPickup ? undefined : dropoffLocation!;
      } else {
        apiDropoff = dropoffLocation!;
      }

      // Pass corporate account ID for discount application
      const response = await calculateMultiVehicleQuote({
        pickupLocation,
        dropoffLocation: apiDropoff,
        waypoints: filteredWaypoints.length > 0 ? filteredWaypoints : undefined,
        pickupTime: pickupDate.toISOString(),
        passengers,
        luggage,
        journeyType: apiJourneyType,
        durationHours: isHourly ? duration : undefined,
        extras: (extras.babySeats > 0 || extras.childSeats > 0) ? extras : undefined,
        compareMode: true,
        corpAccountId: user?.corpAccountId,
      });

      setMultiQuote(response);
      setCurrentStep(2);
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep(1);
  };

  const handleVehicleSelect = async (vehicleId: string, isReturn: boolean) => {
    if (!multiQuote) return;

    const vehiclePricing = multiQuote.vehicles[vehicleId as keyof typeof multiQuote.vehicles];
    if (!vehiclePricing) return;

    // Use simplified pricing structure
    const pricing = isReturn ? vehiclePricing.return : vehiclePricing.oneWay;

    const quoteData: QuoteResponse = {
      quoteId: multiQuote.quoteId || `quote-${Date.now()}`,
      status: multiQuote.status || 'valid',
      expiresAt: multiQuote.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      journey: {
        ...multiQuote.journey,
        route: { polyline: null },
      },
      pricing: {
        currency: 'GBP',
        transferPrice: pricing.transferPrice,
        displayTransferPrice: pricing.displayTransferPrice,
        totalPrice: pricing.totalPrice,
        displayTotal: pricing.displayTotalPrice,
        fees: pricing.fees,
        ...(isReturn && { discount: vehiclePricing.return.discount }),
      },
      vehicleType: vehicleId,
      vehicleDetails: {
        name: vehiclePricing.name,
        description: vehiclePricing.description,
        imageUrl: vehiclePricing.imageUrl,
        capacity: vehiclePricing.capacity,
        features: vehiclePricing.features,
      },
      pickupLocation: multiQuote.pickupLocation,
      dropoffLocation: multiQuote.dropoffLocation || multiQuote.pickupLocation,
      waypoints: multiQuote.waypoints,
      pickupTime: multiQuote.pickupTime,
      passengers: multiQuote.passengers,
      luggage: multiQuote.luggage,
      returnJourney: isReturn,
      journeyType: multiQuote.journeyType,
      durationHours: multiQuote.durationHours,
      extras: multiQuote.extras,
      createdAt: multiQuote.createdAt,
    };

    // Save the quote to get a magicToken for booking
    try {
      const savedQuote = await saveQuote(quoteData);
      const finalQuote: QuoteResponse = {
        ...quoteData,
        quoteId: savedQuote.quoteId,
      };
      setQuote(finalQuote);
      setMagicToken(savedQuote.token);
    } catch (err) {
      // If save fails, still allow user to see quote but booking won't work
      console.error('Failed to save quote:', err);
      setQuote(quoteData);
      setMagicToken(null);
      setError('Quote could not be saved. Please try again.');
    }
  };

  const handleNewQuote = () => {
    setQuote(null);
    setCurrentStep(1);
    setPickupLocation(null);
    setDropoffLocation(null);
    setWaypoints([]);
    setPickupDate(null);
    setReturnDate(null);
    setPassengers(2);
    setLuggage(0);
    setJourneyType('one-way');
    setDuration(4);
    setExtras({ babySeats: 0, childSeats: 0 });
    setReturnToPickup(true);
    setFlightNumber('');
    setTrainNumber('');
    setSpecialRequests('');
    setSelectedPassenger(null);
    setManualPassengerName('');
    setMultiQuote(null);
    setError(null);
    setBookingStage('quote');
    setPaymentDetails(null);
    setBookingId('');
    setMagicToken(null);
  };

  // Booking flow handlers
  const handleConfirmBooking = () => {
    setBookingStage('contact');
  };

  const handleContactSubmit = (details: ContactDetails) => {
    setContactDetails(details);

    // Check payment terms - skip payment if on account
    const isPayOnAccount = company?.paymentTerms && company.paymentTerms !== 'immediate';

    if (isPayOnAccount) {
      // Skip payment, go straight to creating the booking
      handleCreateBooking(details);
    } else {
      setBookingStage('payment');
    }
  };

  const handleContactBack = () => {
    setBookingStage('quote');
  };

  const handlePaymentSubmit = async (details: PaymentDetails) => {
    setPaymentDetails(details);
    await handleCreateBooking(contactDetails!);
  };

  const handleCreateBooking = async (contact: ContactDetails) => {
    setBookingLoading(true);
    setBookingError(null);

    try {
      if (!quote) {
        throw new Error('Missing quote');
      }

      // CRITICAL: Ensure magicToken is available for booking
      if (!magicToken || !quote.quoteId) {
        throw new Error('Quote session expired. Please start a new quote.');
      }

      // CRITICAL: Ensure corporate account ID is available
      if (!user?.corpAccountId) {
        console.error('Corporate booking failed: corpAccountId is missing from user object', { user });
        throw new Error('Session error: Please log out and log back in to complete your booking');
      }

      const isPayOnAccount = company?.paymentTerms && company.paymentTerms !== 'immediate';

      const bookingData = {
        quoteId: quote.quoteId,
        magicToken: magicToken,
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        // Corporate-specific fields
        corporateAccountId: user.corpAccountId,
        passengerName: selectedPassenger?.displayName || manualPassengerName || contact.name,
        passengerId: selectedPassenger?.passengerId || undefined,
        bookedBy: user?.email,
        // Passenger preferences (from directory)
        passengerAlias: selectedPassenger?.alias || undefined,
        passengerDriverInstructions: selectedPassenger?.driverInstructions || undefined,
        passengerRefreshments: selectedPassenger?.refreshments || undefined,
        // Payment
        paymentMethod: isPayOnAccount ? 'invoice' : 'card',
        specialRequests: specialRequests || '',
      };

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.bookings}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const data = await response.json();
      setBookingId(data.booking.bookingId);
      setBookingStage('confirmation');
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentBack = () => {
    setBookingStage('contact');
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
      </div>
    );
  }

  // Render booking confirmation
  if (bookingStage === 'confirmation' && quote && contactDetails && bookingId) {
    const isPayOnAccount = company?.paymentTerms && company.paymentTerms !== 'immediate';
    return (
      <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
        <CorporateHeader
          userName={user.name}
          companyName={company?.companyName}
          onLogout={logout}
          isAdmin={isAdmin}
        />
        <main className="flex-1 pt-28 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-2xl">
            <BookingConfirmation
              quote={quote}
              contactDetails={contactDetails}
              bookingId={bookingId}
              specialRequests={specialRequests}
              returnUrl="/corporate/dashboard"
            />
            {isPayOnAccount && (
              <div className="mt-4 p-4 bg-sage/10 border border-sage/30 rounded-lg">
                <p className="text-sm text-navy">
                  <span className="font-medium">Payment on Account:</span> This booking will be invoiced according to your corporate payment terms ({company?.paymentTerms}).
                </p>
              </div>
            )}

            {/* Save Passenger Option - only show if passenger was entered manually (not from directory) */}
            {!selectedPassenger && (manualPassengerName || contactDetails.name !== user?.name) && (
              <div className="mt-4 p-4 bg-white border border-sage/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">Save passenger for future bookings?</p>
                    <p className="text-xs text-navy-light/70 mt-0.5">
                      Add {manualPassengerName || contactDetails.name} to your passenger directory
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSavePassengerModal(true)}
                    className="px-4 py-2 text-sm font-medium text-sage border border-sage rounded-full hover:bg-sage/5 transition-colors"
                  >
                    Save Passenger
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />

        {/* Save Passenger Modal */}
        <SavePassengerModal
          isOpen={showSavePassengerModal}
          onClose={() => setShowSavePassengerModal(false)}
          onSaved={() => {
            console.log('Passenger saved to directory');
          }}
          initialData={{
            name: manualPassengerName || contactDetails.name,
            email: contactDetails.email,
            phone: contactDetails.phone,
          }}
        />
      </div>
    );
  }

  // Render payment form (only for immediate payment accounts)
  if (bookingStage === 'payment' && quote && contactDetails) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
        <CorporateHeader
          userName={user.name}
          companyName={company?.companyName}
          onLogout={logout}
          isAdmin={isAdmin}
        />
        <main className="flex-1 pt-28 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-2xl">
            {/* Show loading state */}
            {bookingLoading && (
              <div className="mb-4 p-4 bg-navy/5 rounded-lg text-center">
                <div className="animate-spin h-5 w-5 border-2 border-navy border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-navy">Processing payment...</p>
              </div>
            )}

            {/* Show error state */}
            {bookingError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {bookingError}
              </div>
            )}

            <PaymentForm
              onSubmit={(details) => {
                handlePaymentSubmit(details);
              }}
              onBack={handlePaymentBack}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render contact details form
  if (bookingStage === 'contact' && quote) {
    const isPayOnAccount = company?.paymentTerms && company.paymentTerms !== 'immediate';
    return (
      <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
        <CorporateHeader
          userName={user.name}
          companyName={company?.companyName}
          onLogout={logout}
          isAdmin={isAdmin}
        />
        <main className="flex-1 pt-28 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-2xl">
            {/* Show selected passenger summary (selected in Step 1) */}
            {(selectedPassenger || manualPassengerName) && (
              <div className="mb-6 p-4 bg-sage/5 border border-sage/20 rounded-lg">
                <p className="text-sm font-medium text-navy-light/70 mb-1">Booking for:</p>
                <p className="text-navy font-medium">
                  {selectedPassenger?.displayName || manualPassengerName}
                </p>
                {selectedPassenger?.email && (
                  <p className="text-sm text-navy-light/70">{selectedPassenger.email}</p>
                )}
              </div>
            )}

            <ContactDetailsForm
              onSubmit={handleContactSubmit}
              onBack={handleContactBack}
              initialValues={contactDetails || undefined}
              submitLabel={isPayOnAccount ? 'Confirm Booking' : 'Continue to Payment'}
            />

            {isPayOnAccount && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Payment on Account:</span> No payment required at checkout. This booking will be invoiced to your company.
                </p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <CorporateHeader
        userName={user.name}
        companyName={company?.companyName}
        onLogout={logout}
        isAdmin={isAdmin}
      />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-sage text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-sage' : 'bg-gray-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-sage text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loadingQuotes || tripLoading ? (
            <LoadingState />
          ) : quote ? (
            <div className="max-w-2xl mx-auto">
              <QuoteResult
                quote={quote}
                onNewQuote={handleNewQuote}
                onConfirmBooking={handleConfirmBooking}
                specialRequests={specialRequests}
              />

              {/* Save as Favourite button - only show if not already loaded from a favourite */}
              {!loadedTrip && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowSaveTripModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-sage hover:text-sage-dark transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                    Save as Favourite Trip
                  </button>
                </div>
              )}
            </div>
          ) : currentStep === 2 && multiQuote ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-4">
                <Button
                  variant="outline-dark"
                  onClick={handlePreviousStep}
                  className="text-navy"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to journey details
                </Button>
              </div>
              <VehicleComparisonGrid
                multiQuote={multiQuote}
                passengers={passengers}
                onSelect={handleVehicleSelect}
                journeyType={journeyType}
                preferredVehicle={loadedTrip?.vehicleType}
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {/* Passenger Selection - first field before journey details */}
              <div className="mb-6 p-4 bg-white border border-sage/20 rounded-lg">
                <PassengerSelector
                  selectedPassenger={selectedPassenger}
                  onSelect={(passenger) => {
                    setSelectedPassenger(passenger);
                    // Auto-fill special requests with driver instructions when passenger selected
                    if (passenger?.driverInstructions) {
                      setSpecialRequests(passenger.driverInstructions);
                    }
                  }}
                  manualName={manualPassengerName}
                  onManualNameChange={setManualPassengerName}
                  label="Who is travelling?"
                  placeholder="Search passengers or enter name..."
                  helpText="Select from your passenger directory or enter a name for a one-time booking"
                />
              </div>

              <AllInputsStep
                pickup={pickupLocation}
                dropoff={dropoffLocation}
                waypoints={waypoints}
                pickupDate={pickupDate}
                returnDate={returnDate}
                passengers={passengers}
                luggage={luggage}
                journeyType={journeyType}
                duration={duration}
                extras={extras}
                flightNumber={flightNumber}
                trainNumber={trainNumber}
                returnToPickup={returnToPickup}
                onPickupChange={setPickupLocation}
                onDropoffChange={setDropoffLocation}
                onWaypointsChange={setWaypoints}
                onDateChange={setPickupDate}
                onReturnDateChange={setReturnDate}
                onPassengersChange={setPassengers}
                onLuggageChange={setLuggage}
                onJourneyTypeChange={handleJourneyTypeChange}
                onDurationChange={setDuration}
                onExtrasChange={setExtras}
                onFlightNumberChange={setFlightNumber}
                onTrainNumberChange={setTrainNumber}
                returnFlightNumber={returnFlightNumber}
                returnTrainNumber={returnTrainNumber}
                onReturnFlightNumberChange={setReturnFlightNumber}
                onReturnTrainNumberChange={setReturnTrainNumber}
                onReturnToPickupChange={setReturnToPickup}
                specialRequests={specialRequests}
                onSpecialRequestsChange={setSpecialRequests}
              />

              {/* Get Prices Button */}
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canProceedFromStep1() || loadingQuotes}
                  className="w-full bg-sage hover:bg-sage-dark text-white py-3 text-lg font-medium"
                >
                  {loadingQuotes ? 'Getting Quotes...' : 'Get Prices'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Save Trip Modal */}
      {quote && pickupLocation && dropoffLocation && (
        <SaveTripModal
          isOpen={showSaveTripModal}
          onClose={() => setShowSaveTripModal(false)}
          onSaved={() => {
            // Could show a toast notification here
            console.log('Trip saved successfully');
          }}
          tripData={{
            pickupLocation: {
              address: pickupLocation.address,
              placeId: pickupLocation.placeId,
              lat: pickupLocation.lat || 0,
              lng: pickupLocation.lng || 0,
            },
            dropoffLocation: {
              address: dropoffLocation.address,
              placeId: dropoffLocation.placeId,
              lat: dropoffLocation.lat || 0,
              lng: dropoffLocation.lng || 0,
            },
            waypoints: waypoints.length > 0 ? waypoints.map(w => ({
              address: w.address,
              placeId: w.placeId,
              lat: w.lat || 0,
              lng: w.lng || 0,
              waitTime: w.waitTime,
            })) : undefined,
            vehicleType: quote.vehicleType as 'standard' | 'executive' | 'minibus',
            passengers,
            luggage,
          }}
        />
      )}
    </div>
  );
}

export default function CorporateQuotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
      </div>
    }>
      <CorporateQuotePageContent />
    </Suspense>
  );
}
