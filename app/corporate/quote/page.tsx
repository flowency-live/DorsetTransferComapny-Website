'use client';

import { ArrowLeft, Heart, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, useCallback } from 'react';

import BookingConfirmationModal from '@/components/corporate/BookingConfirmationModal';
import CorporateLayout from '@/components/corporate/CorporateLayout';
import PassengerSelector, { SelectedPassenger } from '@/components/corporate/PassengerSelector';
import SavePassengerModal from '@/components/corporate/SavePassengerModal';
import SaveTripModal from '@/components/corporate/SaveTripModal';
import { Button } from '@/components/ui/button';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getCompany, getFavouriteTrips, markTripUsed, FavouriteTrip, getPassenger } from '@/lib/services/corporateApi';

// Reuse components from public quote flow
import AllInputsStep from '../../quote/components/AllInputsStep';
import BookingConfirmation from '../../quote/components/BookingConfirmation';
import { ContactDetails } from '../../quote/components/ContactDetailsForm';
import LoadingState from '../../quote/components/LoadingState';
import QuoteResult from '../../quote/components/QuoteResult';
import VehicleComparisonGrid from '../../quote/components/VehicleComparisonGrid';
import { calculateMultiVehicleQuote, saveQuote } from '../../quote/lib/api';
import { Extras, JourneyType, QuoteResponse, Location, Waypoint, MultiVehicleQuoteResponse } from '../../quote/lib/types';

type Step = 1 | 2;
type BookingStage = 'quote' | 'confirmation';

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
  const [bookingId, setBookingId] = useState<string>('');
  const [magicToken, setMagicToken] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

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

  // Handle rebook/quick-book params (from passenger journey history or passenger directory)
  const loadRebook = useCallback(async () => {
    // Skip if loading a favourite trip or user not loaded
    if (tripIdParam || !user) return;

    // Only process location pre-fill if we have full rebook params (from journey history)
    if (rebookPickupAddress) {
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
    }

    // Load passenger details to auto-select (works with just passengerId from Quick Book)
    if (rebookPassengerId) {
      try {
        const { passenger } = await getPassenger(rebookPassengerId);
        const nameParts = [passenger.title, passenger.firstName, passenger.lastName].filter(Boolean);
        const displayName = nameParts.join(' ');

        setSelectedPassenger({
          passengerId: passenger.passengerId,
          displayName,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          title: passenger.title,
          alias: passenger.alias,
          contactName: passenger.contactName,
          isRepresentative: passenger.isRepresentative,
          email: passenger.email || undefined,
          phone: passenger.phone || undefined,
          driverInstructions: passenger.driverInstructions,
          refreshments: passenger.refreshments,
        });

        // Auto-fill special requests with driver instructions
        if (passenger.driverInstructions) {
          setSpecialRequests(passenger.driverInstructions);
        }

        // Pre-fill contact details from passenger record
        const contactName = passenger.contactName || displayName;
        setContactDetails({
          name: contactName,
          email: passenger.email || '',
          phone: passenger.phone || '',
        });
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

  // Instant booking params (from Quick Book)
  const instantBookParam = searchParams.get('instantBook') === 'true';
  const pickupDateTimeParam = searchParams.get('pickupDateTime');
  const [instantBookLoading, setInstantBookLoading] = useState(false);
  const [instantBookTriggered, setInstantBookTriggered] = useState(false);

  // Instant booking: auto-fetch quote and skip to contact when trip has vehicleType + date/time
  useEffect(() => {
    // Only run once and when all conditions are met
    if (
      !instantBookParam ||
      !pickupDateTimeParam ||
      !loadedTrip?.vehicleType ||
      !loadedTrip ||
      tripLoading ||
      instantBookTriggered ||
      !pickupLocation ||
      !dropoffLocation
    ) {
      return;
    }

    // Parse and set the pickup date/time
    const dateTime = new Date(pickupDateTimeParam);
    if (isNaN(dateTime.getTime())) return;

    setPickupDate(dateTime);
    setInstantBookTriggered(true);
    setInstantBookLoading(true);

    // Fetch quotes and auto-select vehicle
    const runInstantBook = async () => {
      try {
        // Use the passed date/time for quote calculation
        const response = await calculateMultiVehicleQuote({
          pickupLocation: pickupLocation!,
          dropoffLocation: dropoffLocation!,
          waypoints: waypoints.length > 0 ? waypoints : undefined,
          pickupTime: dateTime.toISOString(),
          passengers,
          luggage,
          journeyType: 'one-way',
          compareMode: true,
          corpAccountId: user?.corpAccountId,
        });

        setMultiQuote(response);

        // Check if the saved vehicle type is available
        const vehicleId = loadedTrip.vehicleType;
        if (vehicleId && response.vehicles[vehicleId as keyof typeof response.vehicles]) {
          const vehiclePricing = response.vehicles[vehicleId as keyof typeof response.vehicles];

          // Check capacity
          if (vehiclePricing.capacity >= passengers) {
            // Auto-select the vehicle and create quote
            const pricing = vehiclePricing.oneWay;

            const quoteData: QuoteResponse = {
              quoteId: response.quoteId || `quote-${Date.now()}`,
              status: response.status || 'valid',
              expiresAt: response.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              journey: {
                ...response.journey,
                route: { polyline: null },
              },
              pricing: {
                currency: 'GBP',
                transferPrice: pricing.transferPrice,
                displayTransferPrice: pricing.displayTransferPrice,
                totalPrice: pricing.totalPrice,
                displayTotal: pricing.displayTotalPrice,
                fees: pricing.fees,
              },
              vehicleType: vehicleId,
              vehicleDetails: {
                name: vehiclePricing.name,
                description: vehiclePricing.description,
                imageUrl: vehiclePricing.imageUrl,
                capacity: vehiclePricing.capacity,
                features: vehiclePricing.features,
              },
              pickupLocation: response.pickupLocation,
              dropoffLocation: response.dropoffLocation || response.pickupLocation,
              waypoints: response.waypoints,
              pickupTime: response.pickupTime,
              passengers: response.passengers,
              luggage: response.luggage,
              returnJourney: false,
              journeyType: response.journeyType,
              durationHours: response.durationHours,
              extras: response.extras,
              createdAt: response.createdAt,
            };

            // Save quote to get magic token
            const savedQuote = await saveQuote(quoteData);
            setQuote({ ...quoteData, quoteId: savedQuote.quoteId });
            setMagicToken(savedQuote.token);

            // Open confirmation modal for instant booking
            setCurrentStep(2);
            setShowConfirmationModal(true);
          }
        }
      } catch (err) {
        console.error('Instant book failed:', err);
        setError('Failed to get instant quote. Please select a vehicle.');
      } finally {
        setInstantBookLoading(false);
      }
    };

    runInstantBook();
  }, [
    instantBookParam,
    pickupDateTimeParam,
    loadedTrip,
    tripLoading,
    instantBookTriggered,
    pickupLocation,
    dropoffLocation,
    waypoints,
    passengers,
    luggage,
    user?.corpAccountId,
  ]);

  // Pre-fill contact details from user profile when no passenger is selected
  useEffect(() => {
    // Only pre-fill from user if:
    // 1. User is logged in
    // 2. No passenger is selected
    // 3. No manual passenger name entered
    // 4. Contact details are empty/null
    if (user && !selectedPassenger && !manualPassengerName && !contactDetails) {
      setContactDetails({
        name: user.name,
        email: user.email,
        phone: '', // Phone not available in user profile yet
      });
    }
  }, [user, selectedPassenger, manualPassengerName, contactDetails]);

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
    setBookingId('');
    setMagicToken(null);
    setShowConfirmationModal(false);
  };

  // Booking flow handlers
  const handleConfirmBooking = () => {
    // Open the confirmation modal instead of multi-step flow
    setShowConfirmationModal(true);
  };

  // Called when booking is confirmed via modal
  const handleBookingConfirmed = (newBookingId: string) => {
    setBookingId(newBookingId);
    setShowConfirmationModal(false);
    setBookingStage('confirmation');

    // Mark trip as used if loaded from favourite
    if (loadedTrip) {
      markTripUsed(loadedTrip.tripId).catch(console.error);
    }
  };


  // Render content based on booking stage
  const renderContent = () => {
    const isPayOnAccount = company?.paymentTerms && company.paymentTerms !== 'immediate';

    // Instant booking loading state
    if (instantBookLoading) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="corp-card rounded-2xl shadow-lg p-8 text-center">
            <div className="corp-loading-spinner w-12 h-12 border-4 rounded-full mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Getting your quote...</h2>
            <p className="corp-page-subtitle">
              We&apos;re preparing your booking with your saved preferences.
            </p>
            {loadedTrip && (
              <div className="mt-4 p-3 bg-[var(--corp-accent-muted)] rounded-lg">
                <p className="text-sm corp-page-subtitle">
                  {loadedTrip.label}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Booking confirmation (after modal completes booking)
    if (bookingStage === 'confirmation' && quote && bookingId) {
      // Create contactDetails for BookingConfirmation from available data
      const confirmationContactDetails = contactDetails || {
        name: selectedPassenger?.displayName || manualPassengerName || user?.name || '',
        email: selectedPassenger?.email || user?.email || '',
        phone: selectedPassenger?.phone || '',
      };

      return (
        <div className="max-w-2xl mx-auto">
          <BookingConfirmation
            quote={quote}
            contactDetails={confirmationContactDetails}
            bookingId={bookingId}
            specialRequests={specialRequests}
            returnUrl="/corporate/dashboard"
            isCorporate={true}
            passengerInfo={selectedPassenger ? {
              name: selectedPassenger.displayName,
              alias: selectedPassenger.alias,
              driverInstructions: selectedPassenger.driverInstructions,
              refreshments: selectedPassenger.refreshments,
            } : manualPassengerName ? {
              name: manualPassengerName,
            } : undefined}
            showSaveToFavourites={!loadedTrip}
            onSaveToFavourites={() => setShowSaveTripModal(true)}
          />
          {isPayOnAccount && (
            <div className="mt-4 p-4 bg-[var(--corp-accent-muted)] border border-[var(--corp-accent)] rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Payment on Account:</span> This booking will be invoiced according to your corporate payment terms ({company?.paymentTerms}).
              </p>
            </div>
          )}

          {/* Save Passenger Option - only show if passenger was entered manually (not from directory) */}
          {!selectedPassenger && manualPassengerName && (
            <div className="mt-4 p-4 corp-card rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Save passenger for future bookings?</p>
                  <p className="text-xs corp-page-subtitle mt-0.5">
                    Add {manualPassengerName} to your passenger directory
                  </p>
                </div>
                <button
                  onClick={() => setShowSavePassengerModal(true)}
                  className="px-4 py-2 text-sm font-medium text-[var(--corp-accent)] border border-[var(--corp-accent)] rounded-full hover:bg-[var(--corp-bg-hover)] transition-colors"
                >
                  Save Passenger
                </button>
              </div>
            </div>
          )}

          {/* Save Passenger Modal */}
          <SavePassengerModal
            isOpen={showSavePassengerModal}
            onClose={() => setShowSavePassengerModal(false)}
            onSaved={() => {
              console.log('Passenger saved to directory');
            }}
            initialData={{
              name: manualPassengerName || confirmationContactDetails.name,
              email: confirmationContactDetails.email,
              phone: confirmationContactDetails.phone,
            }}
          />

          {/* Save Trip Modal - for saving route as favourite after booking */}
          {pickupLocation && dropoffLocation && (
            <SaveTripModal
              isOpen={showSaveTripModal}
              onClose={() => setShowSaveTripModal(false)}
              onSaved={() => {
                console.log('Trip saved to favourites');
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

    // Main quote flow
    return (
      <>
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
              hideMap={showSaveTripModal}
            />

            {/* Save as Favourite button - only show if not already loaded from a favourite */}
            {!loadedTrip && (
              <div className="mt-6 p-4 bg-[var(--corp-accent-muted)] border border-[var(--corp-border-default)] rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--corp-bg-hover)] rounded-lg">
                      <Heart className="h-5 w-5 text-[var(--corp-accent)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Save this route?</p>
                      <p className="text-xs corp-page-subtitle">Quick book this trip again anytime</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSaveTripModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--corp-accent)] text-[var(--corp-accent)] font-medium text-sm rounded-lg hover:bg-[var(--corp-accent)] hover:text-white transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                    Save as Favourite
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : currentStep === 2 && multiQuote ? (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <Button
                variant="outline-dark"
                onClick={handlePreviousStep}
                className="corp-btn corp-btn-secondary"
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
              filterToPreferred={!!loadedTrip?.vehicleType}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Passenger Selection - first field before journey details */}
            <div className="mb-6 p-4 corp-card rounded-lg">
              <PassengerSelector
                selectedPassenger={selectedPassenger}
                onSelect={(passenger) => {
                  setSelectedPassenger(passenger);
                  // Auto-fill special requests with driver instructions when passenger selected
                  if (passenger?.driverInstructions) {
                    setSpecialRequests(passenger.driverInstructions);
                  }
                  // Pre-fill contact details from passenger record
                  if (passenger) {
                    const contactName = passenger.contactName || passenger.displayName;
                    setContactDetails({
                      name: contactName,
                      email: passenger.email || '',
                      phone: passenger.phone || '',
                    });
                  }
                }}
                manualName={manualPassengerName}
                onManualNameChange={setManualPassengerName}
                label="Who is travelling?"
                placeholder="Search passengers or enter name..."
                helpText="Select from your passenger directory or enter a name for a one-time booking"
              />

              {/* Save to Directory button when manual name entered */}
              {manualPassengerName && manualPassengerName.trim().length >= 2 && !selectedPassenger && (
                <div className="mt-3 pt-3 border-t corp-border">
                  <button
                    type="button"
                    onClick={() => setShowSavePassengerModal(true)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[var(--corp-accent)] hover:text-[var(--corp-accent-hover)] transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Save &ldquo;{manualPassengerName.trim()}&rdquo; to passenger directory
                  </button>
                </div>
              )}
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
              lockedLocations={!!loadedTrip}
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

        {/* Save Passenger Modal (during booking flow) */}
        <SavePassengerModal
          isOpen={showSavePassengerModal}
          onClose={() => setShowSavePassengerModal(false)}
          onSaved={(savedPassenger) => {
            // Auto-select the newly saved passenger
            if (savedPassenger) {
              setSelectedPassenger({
                passengerId: savedPassenger.passengerId,
                displayName: savedPassenger.displayName,
                firstName: savedPassenger.firstName,
                lastName: savedPassenger.lastName,
                email: savedPassenger.email || undefined,
                phone: savedPassenger.phone || undefined,
              });
              setManualPassengerName('');
            }
          }}
          initialData={{
            name: manualPassengerName || '',
          }}
        />
      </>
    );
  };

  return (
    <CorporateLayout pageTitle="Book a Transfer">
      <div className="max-w-6xl mx-auto">
        {renderContent()}
      </div>

      {/* Booking Confirmation Modal - streamlined 2-click booking flow */}
      {quote && magicToken && user && company && (
        <BookingConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={handleBookingConfirmed}
          quote={quote}
          magicToken={magicToken}
          selectedPassenger={selectedPassenger}
          manualPassengerName={manualPassengerName}
          user={user}
          company={company}
        />
      )}
    </CorporateLayout>
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
