'use client';

import { CheckCircle, Calendar, MapPin, Users, Car, Mail, Phone, Download, Loader2, Printer, User, Coffee, Droplet, MessageSquare, Heart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { generatePdf } from '@/lib/pdf';

import { QuoteResponse } from '../lib/types';

import { ContactDetails } from './ContactDetailsForm';

// Corporate-specific: Passenger preferences
interface RefreshmentPreferences {
  stillWater?: boolean;
  sparklingWater?: boolean;
  tea?: boolean;
  coffee?: boolean;
  other?: string;
}

// Corporate-specific: Passenger info (distinct from booking contact)
interface PassengerInfo {
  name: string;
  alias?: string | null;
  driverInstructions?: string | null;
  refreshments?: RefreshmentPreferences | null;
}

interface BookingConfirmationProps {
  quote: QuoteResponse;
  contactDetails: ContactDetails;
  bookingId: string;
  specialRequests?: string;
  returnUrl?: string;
  // Corporate-specific: When passenger is different from booking contact
  passengerInfo?: PassengerInfo;
  isCorporate?: boolean;
  // Corporate-specific: Allow saving route as favourite trip
  onSaveToFavourites?: () => void;
  showSaveToFavourites?: boolean;
}

export default function BookingConfirmation({ quote, contactDetails, bookingId, specialRequests, returnUrl = '/', passengerInfo, isCorporate = false, onSaveToFavourites, showSaveToFavourites = false }: BookingConfirmationProps) {
  const [downloading, setDownloading] = useState(false);
  const [favouriteSaved, setFavouriteSaved] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleDownloadConfirmation = async () => {
    setDownloading(true);
    try {
      await generatePdf('booking-confirmation-content', `booking-${bookingId}`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border py-6">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your transfer has been successfully booked
            </p>
          </div>
        </div>
      </header>

      {/* Confirmation Content */}
      <section className="py-12">
        <div id="booking-confirmation-content" className="container px-4 mx-auto max-w-3xl space-y-6">

          {/* Booking Reference */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">Booking Reference</p>
              <p className="font-mono text-2xl md:text-3xl font-bold text-sage-dark tracking-wider">
                {bookingId}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please keep this reference number for your records
              </p>
            </div>

            {/* Confirmation Email Notice */}
            <div className="bg-sage-light/30 border border-sage-light rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                <div className="text-sm text-navy-light">
                  <p className="font-medium mb-1">Confirmation Email Sent</p>
                  <p className="text-xs">
                    A detailed confirmation has been sent to <strong>{contactDetails.email}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Journey Details */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
              Journey Details
            </h2>

            <div className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-sage-dark" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pickup Date & Time</p>
                  <p className="text-base font-semibold text-foreground">
                    {formatDate(quote.pickupTime)}
                  </p>
                  <p className="text-base text-foreground">{formatTime(quote.pickupTime)}</p>
                </div>
              </div>

              {/* Locations */}
              <div className="border-t border-border pt-4">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-sage-dark" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pickup Location</p>
                    <p className="text-base text-foreground">{quote.pickupLocation.address}</p>
                  </div>
                </div>

                {quote.waypoints && quote.waypoints.length > 0 && (
                  <div className="ml-14 mb-3 pl-4 border-l-2 border-sage-light space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Stops</p>
                    {quote.waypoints.map((waypoint, index) => (
                      <div key={index} className="text-sm text-foreground">
                        <span className="font-medium">Stop {index + 1}:</span> {waypoint.address}
                        {waypoint.waitTime && (
                          <span className="text-muted-foreground ml-2">
                            (Wait: {waypoint.waitTime} min)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-navy-dark/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-navy-dark" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Dropoff Location</p>
                    <p className="text-base text-foreground">{quote.dropoffLocation.address}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle & Passengers */}
              <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-sage-dark mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vehicle</p>
                    <p className="text-base font-semibold text-foreground capitalize">{quote.vehicleType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-sage-dark mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Passengers</p>
                    <p className="text-base font-semibold text-foreground">
                      {quote.passengers} {quote.passengers === 1 ? 'passenger' : 'passengers'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {specialRequests && (
            <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
              <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-4">
                Special Requests
              </h2>
              <p className="text-base text-foreground whitespace-pre-wrap">{specialRequests}</p>
            </div>
          )}

          {/* Corporate: Passenger Info (when different from booking contact) */}
          {isCorporate && passengerInfo && (
            <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
              <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
                Passenger
              </h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="text-base font-semibold text-foreground">{passengerInfo.name}</p>
                    {passengerInfo.alias && (
                      <p className="text-sm text-muted-foreground italic">&ldquo;{passengerInfo.alias}&rdquo;</p>
                    )}
                  </div>
                </div>

                {/* Passenger Preferences */}
                {passengerInfo.refreshments && (
                  <div className="flex items-start gap-3">
                    <Coffee className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Refreshment Preferences</p>
                      <div className="flex flex-wrap gap-2">
                        {passengerInfo.refreshments.stillWater && (
                          <span className="inline-flex items-center gap-1 text-sm bg-sage-light/30 text-sage-dark px-2 py-1 rounded">
                            <Droplet className="w-3 h-3" /> Still Water
                          </span>
                        )}
                        {passengerInfo.refreshments.sparklingWater && (
                          <span className="inline-flex items-center gap-1 text-sm bg-sage-light/30 text-sage-dark px-2 py-1 rounded">
                            <Droplet className="w-3 h-3" /> Sparkling Water
                          </span>
                        )}
                        {passengerInfo.refreshments.tea && (
                          <span className="inline-flex items-center gap-1 text-sm bg-sage-light/30 text-sage-dark px-2 py-1 rounded">
                            Tea
                          </span>
                        )}
                        {passengerInfo.refreshments.coffee && (
                          <span className="inline-flex items-center gap-1 text-sm bg-sage-light/30 text-sage-dark px-2 py-1 rounded">
                            <Coffee className="w-3 h-3" /> Coffee
                          </span>
                        )}
                        {passengerInfo.refreshments.other && (
                          <span className="text-sm text-foreground">{passengerInfo.refreshments.other}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {passengerInfo.driverInstructions && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Driver Instructions</p>
                      <p className="text-sm text-foreground">{passengerInfo.driverInstructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Contact (Corporate) / Lead Passenger (Public) */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
              {isCorporate ? 'Booking Contact' : 'Lead Passenger'}
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-base font-semibold text-foreground">{contactDetails.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-base text-foreground">{contactDetails.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-base text-foreground">{contactDetails.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
            <h2 className="font-playfair text-xl md:text-2xl font-semibold text-foreground mb-6">
              Pricing Summary
            </h2>

            <div className="space-y-3">
              {/* Transfer Charges */}
              <div className="flex justify-between items-center">
                <span className="text-base text-muted-foreground">Transfer Charges</span>
                <span className="text-base font-semibold text-foreground">
                  {quote.pricing.displayTransferPrice}
                </span>
              </div>

              {/* Airport Drop Fee - only show if present */}
              {quote.pricing.fees.airportDrop > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-base text-muted-foreground">Airport Drop Fee</span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(quote.pricing.fees.airportDrop / 100)}
                  </span>
                </div>
              )}

              {/* VAT - only show if VAT was applied */}
              {quote.pricing.fees.vat > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-base text-muted-foreground">VAT @ {quote.pricing.fees.vatRate}%</span>
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(quote.pricing.fees.vat / 100)}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-sage-dark">
                    {quote.pricing.displayTotal}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Final amount may vary based on actual distance and time
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-3xl p-6 md:p-8">
            <h2 className="font-playfair text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
              What happens next?
            </h2>
            <ol className="space-y-3 text-sm text-blue-900 dark:text-blue-100">
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">1.</span>
                <span>You will receive a confirmation email with all booking details</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">2.</span>
                <span>Your driver will be assigned and you&apos;ll receive their details 24 hours before pickup</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">3.</span>
                <span>You can track your driver on the day of your journey</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold flex-shrink-0">4.</span>
                <span>Payment will be processed after your transfer is completed</span>
              </li>
            </ol>
          </div>

          {/* Save to Favourites - Corporate only */}
          {isCorporate && showSaveToFavourites && onSaveToFavourites && !favouriteSaved && (
            <div className="bg-sage/5 border border-sage/20 rounded-3xl p-6 no-print">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sage/10 rounded-lg">
                    <Heart className="h-5 w-5 text-sage" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy">Save this route for future bookings?</p>
                    <p className="text-xs text-navy-light/70">Quickly rebook this trip anytime</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSaveToFavourites();
                    setFavouriteSaved(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-sage text-sage font-medium text-sm rounded-lg hover:bg-sage hover:text-white transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  Save as Favourite
                </button>
              </div>
            </div>
          )}

          {/* Favourite Saved Confirmation */}
          {isCorporate && favouriteSaved && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-3xl p-4 no-print">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Route saved to your favourites
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 no-print">
            <Button
              type="button"
              variant="hero-outline"
              size="xl"
              onClick={handleDownloadConfirmation}
              disabled={downloading}
              className="flex-1"
            >
              {downloading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Download className="w-5 h-5 mr-2" />
              )}
              {downloading ? 'Generating PDF...' : 'Download'}
            </Button>
            <Button
              type="button"
              variant="hero-outline"
              size="xl"
              onClick={handlePrint}
              className="flex-1"
            >
              <Printer className="w-5 h-5 mr-2" />
              Print
            </Button>
            <Link href={returnUrl} className="flex-1">
              <Button
                type="button"
                variant="hero-golden"
                size="xl"
                className="w-full"
              >
                {returnUrl === '/' ? 'Return to Home' : 'Return to Dashboard'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
