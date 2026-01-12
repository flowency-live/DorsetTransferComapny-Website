'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

import Footer from '@/components/shared/Footer';
import Header from '@/components/shared/Header';
import { Button } from '@/components/ui/button';

import BookingConfirmation from '../components/BookingConfirmation';
import ContactDetailsForm, { ContactDetails } from '../components/ContactDetailsForm';
import PaymentForm, { PaymentDetails } from '../components/PaymentForm';
import QuoteResult from '../components/QuoteResult';
import { getQuoteByToken } from '../lib/api';
import { QuoteResponse } from '../lib/types';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

type BookingStage = 'quote' | 'contact' | 'payment' | 'confirmation';

function SharedQuoteContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const quoteId = params.quoteId as string;
  const token = searchParams.get('token');

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking flow state
  const [bookingStage, setBookingStage] = useState<BookingStage>('quote');
  const [contactDetails, setContactDetails] = useState<ContactDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId || !token) {
        setError('Invalid quote link. Please request a new quote.');
        setLoading(false);
        return;
      }

      try {
        const quoteData = await getQuoteByToken(quoteId, token);
        setQuote(quoteData);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quote');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId, token]);

  const handleNewQuote = () => {
    router.push('/quote');
  };

  const handleConfirmBooking = () => {
    setBookingStage('contact');
  };

  const handleContactSubmit = (details: ContactDetails) => {
    setContactDetails(details);
    setBookingStage('payment');
  };

  const handleContactBack = () => {
    setBookingStage('quote');
  };

  const handlePaymentSubmit = async (details: PaymentDetails) => {
    setBookingLoading(true);
    setBookingError(null);

    try {
      if (!quote || !contactDetails) {
        throw new Error('Missing quote or contact details');
      }

      const bookingData = {
        quoteId: quote.quoteId,
        customerName: contactDetails.name,
        customerEmail: contactDetails.email,
        customerPhone: contactDetails.phone,
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
        journeyType: quote.journeyType,
        durationHours: quote.durationHours,
        extras: quote.extras,
        paymentMethod: 'card',
        paymentStatus: 'pending',
        specialRequests: '',
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
  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <Header />
        <div className="container px-4 mx-auto max-w-2xl py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sage-light border-t-sage-dark mb-4"></div>
          <p className="text-muted-foreground">Loading your quote...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <Header />
        <div className="container px-4 mx-auto max-w-2xl py-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Quote Not Found</h2>
            <p className="text-red-600 mb-4">
              {error || 'This quote link is invalid or has expired.'}
            </p>
          </div>
          <Button variant="hero-golden" onClick={handleNewQuote}>
            Get a New Quote
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Booking confirmation
  if (bookingStage === 'confirmation' && contactDetails && bookingId) {
    return (
      <BookingConfirmation
        quote={quote}
        contactDetails={contactDetails}
        bookingId={bookingId}
      />
    );
  }

  // Payment form
  if (bookingStage === 'payment' && contactDetails) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container px-4 mx-auto max-w-md">
          {bookingError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <p className="font-medium">Booking Error</p>
              <p className="text-sm mt-1">{bookingError}</p>
            </div>
          )}
          {bookingLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-dark mx-auto mb-4"></div>
              <p className="text-muted-foreground">Creating your booking...</p>
            </div>
          ) : (
            <PaymentForm
              onSubmit={handlePaymentSubmit}
              onBack={handlePaymentBack}
            />
          )}
        </div>
      </div>
    );
  }

  // Contact details form
  if (bookingStage === 'contact') {
    return (
      <ContactDetailsForm
        onSubmit={handleContactSubmit}
        onBack={handleContactBack}
        initialValues={contactDetails || undefined}
      />
    );
  }

  // Quote result (default)
  return (
    <div className="min-h-screen bg-background pt-20">
      <Header />
      <QuoteResult
        quote={quote}
        onNewQuote={handleNewQuote}
        onConfirmBooking={handleConfirmBooking}
      />
      <Footer />
    </div>
  );
}

export default function SharedQuotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sage-light border-t-sage-dark mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SharedQuoteContent />
    </Suspense>
  );
}
