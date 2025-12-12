'use client';

import { ArrowLeft } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';

import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import { getCompany } from '@/lib/services/corporateApi';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

// Reuse components from public quote flow
import AllInputsStep from '../../quote/components/AllInputsStep';
import BookingConfirmation from '../../quote/components/BookingConfirmation';
import ContactDetailsForm, { ContactDetails } from '../../quote/components/ContactDetailsForm';
import LoadingState from '../../quote/components/LoadingState';
import PaymentForm, { PaymentDetails } from '../../quote/components/PaymentForm';
import QuoteResult from '../../quote/components/QuoteResult';
import VehicleComparisonGrid from '../../quote/components/VehicleComparisonGrid';
import { calculateMultiVehicleQuote } from '../../quote/lib/api';
import { Extras, JourneyType, QuoteResponse, Location, Waypoint, MultiVehicleQuoteResponse } from '../../quote/lib/types';

type Step = 1 | 2;
type BookingStage = 'quote' | 'contact' | 'payment' | 'confirmation';

interface CompanyData {
  companyName: string;
  discountPercentage: number;
  paymentTerms: 'immediate' | 'net7' | 'net14' | 'net30';
  status: string;
}

function CorporateQuotePageContent() {
  // Auth
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();

  // Company data (for discount and payment terms)
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Form state (same as public quote)
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(0);

  // Journey type & extras state
  const [journeyType, setJourneyType] = useState<JourneyType>('one-way');
  const [duration, setDuration] = useState(5);
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
  const [specialRequests, setSpecialRequests] = useState('');

  // Corporate-specific: Passenger name (booking for someone else)
  const [passengerName, setPassengerName] = useState('');

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
        endTime !== null &&
        duration >= 5;
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

      // TODO: Pass corporate context to API for discount application
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

  const handleVehicleSelect = (vehicleId: string, isReturn: boolean) => {
    if (!multiQuote) return;

    const vehiclePricing = multiQuote.vehicles[vehicleId as keyof typeof multiQuote.vehicles];
    if (!vehiclePricing) return;

    const priceInPence = isReturn ? vehiclePricing.return.price : vehiclePricing.oneWay.price;
    const displayPrice = isReturn ? vehiclePricing.return.displayPrice : vehiclePricing.oneWay.displayPrice;

    const finalQuote: QuoteResponse = {
      quoteId: multiQuote.quoteId || `quote-${Date.now()}`,
      status: multiQuote.status || 'valid',
      expiresAt: multiQuote.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      journey: {
        ...multiQuote.journey,
        route: { polyline: null },
      },
      pricing: {
        currency: 'GBP',
        breakdown: {
          baseFare: priceInPence,
          distanceCharge: 0,
          waitTimeCharge: 0,
          subtotal: priceInPence,
          tax: 0,
          total: priceInPence,
        },
        displayTotal: displayPrice,
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
      createdAt: multiQuote.createdAt,
    };

    setQuote(finalQuote);
  };

  const handleNewQuote = () => {
    setQuote(null);
    setCurrentStep(1);
    setPickupLocation(null);
    setDropoffLocation(null);
    setWaypoints([]);
    setPickupDate(null);
    setReturnDate(null);
    setEndTime(null);
    setPassengers(2);
    setLuggage(0);
    setJourneyType('one-way');
    setDuration(5);
    setExtras({ babySeats: 0, childSeats: 0 });
    setReturnToPickup(true);
    setFlightNumber('');
    setTrainNumber('');
    setSpecialRequests('');
    setPassengerName('');
    setMultiQuote(null);
    setError(null);
    setBookingStage('quote');
    setPaymentDetails(null);
    setBookingId('');
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
      handleCreateBooking(details, null);
    } else {
      setBookingStage('payment');
    }
  };

  const handleContactBack = () => {
    setBookingStage('quote');
  };

  const handlePaymentSubmit = async (details: PaymentDetails) => {
    setPaymentDetails(details);
    await handleCreateBooking(contactDetails!, details);
  };

  const handleCreateBooking = async (contact: ContactDetails, payment: PaymentDetails | null) => {
    setBookingLoading(true);
    setBookingError(null);

    try {
      if (!quote) {
        throw new Error('Missing quote');
      }

      const isPayOnAccount = company?.paymentTerms && company.paymentTerms !== 'immediate';

      const bookingData = {
        ...(quote.quoteId && { quoteId: quote.quoteId }),
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        // Corporate-specific fields
        corporateAccountId: user?.corpAccountId,
        passengerName: passengerName || contact.name,
        bookedBy: user?.email,
        // Journey details
        pickupLocation: quote.pickupLocation,
        dropoffLocation: quote.dropoffLocation,
        waypoints: quote.waypoints,
        pickupTime: quote.pickupTime,
        passengers: quote.passengers,
        luggage: quote.luggage,
        vehicleType: quote.vehicleType,
        pricing: quote.pricing,
        journey: quote.journey,
        returnJourney: quote.returnJourney,
        // Payment
        paymentMethod: isPayOnAccount ? 'invoice' : 'card',
        paymentStatus: isPayOnAccount ? 'on_account' : 'pending',
        paymentTerms: company?.paymentTerms,
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
            />
            {isPayOnAccount && (
              <div className="mt-4 p-4 bg-sage/10 border border-sage/30 rounded-lg">
                <p className="text-sm text-navy">
                  <span className="font-medium">Payment on Account:</span> This booking will be invoiced according to your corporate payment terms ({company?.paymentTerms}).
                </p>
              </div>
            )}
          </div>
        </main>
        <Footer />
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
            {/* Corporate Discount Badge */}
            {company && company.discountPercentage > 0 && (
              <div className="mb-4 p-3 bg-sage/10 border border-sage/30 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-navy">
                  Corporate Rate Applied: {company.discountPercentage}% discount
                </span>
              </div>
            )}

            {/* Passenger Name Field (booking for someone else) */}
            <div className="mb-6 p-4 bg-white border border-sage/20 rounded-lg">
              <label className="block text-sm font-medium text-navy mb-2">
                Passenger Name (if booking for someone else)
              </label>
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Leave blank if booking for yourself"
                className="w-full px-4 py-2 border border-sage/30 rounded-lg focus:ring-2 focus:ring-sage focus:border-transparent"
              />
              <p className="mt-1 text-xs text-navy-light/70">
                The passenger will be contacted with journey details
              </p>
            </div>

            <ContactDetailsForm
              onSubmit={handleContactSubmit}
              onBack={handleContactBack}
              initialValues={contactDetails || undefined}
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
          {/* Corporate Discount Banner */}
          {company && company.discountPercentage > 0 && (
            <div className="mb-6 p-4 bg-sage/10 border border-sage/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sage/20 rounded-full">
                  <svg className="w-5 h-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">Corporate Rate Active</p>
                  <p className="text-xs text-navy-light/70">{company.discountPercentage}% discount applied to all bookings</p>
                </div>
              </div>
              <span className="text-lg font-bold text-sage">-{company.discountPercentage}%</span>
            </div>
          )}

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

          {loadingQuotes ? (
            <LoadingState />
          ) : quote ? (
            <div className="max-w-2xl mx-auto">
              <QuoteResult
                quote={quote}
                onNewQuote={handleNewQuote}
                onConfirmBooking={handleConfirmBooking}
              />
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
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <AllInputsStep
                pickup={pickupLocation}
                dropoff={dropoffLocation}
                waypoints={waypoints}
                pickupDate={pickupDate}
                returnDate={returnDate}
                endTime={endTime}
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
                onEndTimeChange={setEndTime}
                onPassengersChange={setPassengers}
                onLuggageChange={setLuggage}
                onJourneyTypeChange={handleJourneyTypeChange}
                onDurationChange={setDuration}
                onExtrasChange={setExtras}
                onFlightNumberChange={setFlightNumber}
                onTrainNumberChange={setTrainNumber}
                onReturnToPickupChange={setReturnToPickup}
                specialRequests={specialRequests}
                onSpecialRequestsChange={setSpecialRequests}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
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
