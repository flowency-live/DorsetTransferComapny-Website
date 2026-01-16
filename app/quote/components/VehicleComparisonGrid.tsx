'use client';

import { Car, Calendar, Check, Clock, MapPin, AlertTriangle, Share2, Phone, Settings, ChevronDown, ChevronUp, Tag, Zap, Percent } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';

import { JourneyType, MultiVehicleQuoteResponse } from '../lib/types';
import { formatTime12Hour } from '../lib/format-utils';
import ShareQuoteModal from './ShareQuoteModal';

interface VehicleComparisonGridProps {
  multiQuote: MultiVehicleQuoteResponse;
  passengers: number;
  journeyType: JourneyType;
  onSelect: (vehicleId: string, isReturn: boolean) => void;
}

export default function VehicleComparisonGrid({
  multiQuote,
  passengers,
  journeyType,
  onSelect,
}: VehicleComparisonGridProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  // For round-trip, default to return pricing; for one-way/hourly, default to one-way
  const [selectedIsReturn, setSelectedIsReturn] = useState<boolean>(journeyType === 'round-trip');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Scroll to top when vehicle comparison grid appears
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if journey is outside service area
  const isOutOfServiceArea = multiQuote.outOfServiceArea === true;

  // Check if using zone/fixed pricing
  const isFixedPrice = multiQuote.isZonePricing === true;
  const debugInfo = multiQuote._debug;

  // Get vehicle types dynamically from API response (no hardcoding!)
  const vehicleTypes = Object.keys(multiQuote.vehicles);

  // Filter vehicles by capacity
  const availableVehicles = vehicleTypes.filter(
    type => multiQuote.vehicles[type].capacity >= passengers
  );

  // Format pickup date/time
  const formatPickupDateTime = () => {
    const date = new Date(multiQuote.pickupTime);
    return {
      date: date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      time: formatTime12Hour(date),
    };
  };

  const pickupDateTime = formatPickupDateTime();

  // Handle vehicle selection (just highlights, doesn't confirm)
  const handleVehicleSelect = (vehicleId: string, isReturn: boolean) => {
    setSelectedVehicle(vehicleId);
    setSelectedIsReturn(isReturn);
  };

  // Handle confirmation
  const handleConfirm = () => {
    if (selectedVehicle) {
      onSelect(selectedVehicle, selectedIsReturn);
    }
  };

  // Get selected pricing info for confirmation display
  const getSelectedPricing = () => {
    if (!selectedVehicle) return null;
    const vehicle = multiQuote.vehicles[selectedVehicle as keyof typeof multiQuote.vehicles];
    const getJourneyLabel = () => {
      if (journeyType === 'round-trip') return 'Return';
      if (journeyType === 'hourly') return 'Hourly';
      return 'One-Way';
    };
    // Show price excluding VAT on comparison grid (always Exc. VAT)
    let price: string;
    if (selectedIsReturn) {
      // Show price excluding VAT when VAT is present, otherwise show display price
      if (vehicle.return.breakdown.vatAmount) {
        price = `£${((vehicle.return.price - vehicle.return.breakdown.vatAmount) / 100).toFixed(2)}`;
      } else {
        price = vehicle.return.displayPrice;
      }
    } else {
      // Show price excluding VAT when VAT is present, otherwise show display price
      if (vehicle.oneWay.breakdown.vatAmount) {
        price = `£${((vehicle.oneWay.price - vehicle.oneWay.breakdown.vatAmount) / 100).toFixed(2)}`;
      } else {
        price = vehicle.oneWay.displayPrice;
      }
    }
    // Check if there's an airport fee for the selected journey type
    const hasAirportFee = selectedIsReturn
      ? !!vehicle.return.breakdown.airportDropFee
      : !!vehicle.oneWay.breakdown.airportDropFee;
    return {
      name: vehicle.name,
      price,
      journeyType: getJourneyLabel(),
      hasAirportFee,
    };
  };

  return (
    <div className="space-y-4">
      {/* Fixed Price Indicator */}
      {isFixedPrice && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-3 shadow-mobile">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="font-semibold text-green-800">Fixed Price Trip</span>
            {multiQuote.zoneName && (
              <span className="text-sm text-green-700">
                ({multiQuote.zoneName} to {multiQuote.destinationName})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Out of Service Area Banner */}
      {isOutOfServiceArea && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-mobile">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Outside Our Standard Service Area</h3>
              <p className="text-sm text-amber-700">
                {multiQuote.outOfServiceAreaMessage || "This journey is outside our standard service area. Send us this quote and we'll be in touch to discuss."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Engine Detail Panel */}
      {debugInfo && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden text-white text-xs font-mono">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-full px-4 py-2 flex items-center justify-between bg-slate-700 hover:bg-slate-600"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Pricing Engine Detail</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                debugInfo.pricingMethod === 'zone_pricing' ? 'bg-green-500' : 'bg-blue-500'
              }`}>
                {debugInfo.pricingMethod === 'zone_pricing' ? 'ZONE PRICING' : 'VARIABLE PRICING'}
              </span>
              {debugInfo.surge?.applied && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500">
                  SURGE {debugInfo.surge.multiplier}x
                </span>
              )}
              {debugInfo.corporateDiscount?.applied && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500">
                  CORP -{debugInfo.corporateDiscount.percentage}%
                </span>
              )}
            </div>
            {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDebug && (
            <div className="p-4 space-y-3">
              {/* Pricing Method */}
              <div>
                <div className="text-slate-400 mb-1">1. Base Pricing Method</div>
                <div className={`p-2 rounded ${
                  debugInfo.pricingMethod === 'zone_pricing' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'
                }`}>
                  {debugInfo.pricingMethod === 'zone_pricing'
                    ? 'ZONE PRICING (fixed prices per zone-destination pair)'
                    : 'VARIABLE PRICING (base fare + distance calculation)'
                  }
                </div>
              </div>

              {/* Surge Pricing */}
              <div>
                <div className="text-slate-400 mb-1 flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  2. Surge Pricing
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  {debugInfo.surge?.applied ? (
                    <div className="text-orange-400">
                      <div>Multiplier: {debugInfo.surge.multiplier}x</div>
                      {debugInfo.surge.rules.length > 0 && (
                        <div className="mt-1">
                          Rules applied:
                          <ul className="ml-2">
                            {debugInfo.surge.rules.map((rule, idx) => (
                              <li key={idx}>- {rule.name} ({rule.multiplier}x)</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500">No surge pricing applied</div>
                  )}
                </div>
              </div>

              {/* Corporate Discount */}
              <div>
                <div className="text-slate-400 mb-1 flex items-center gap-2">
                  <Percent className="w-3 h-3" />
                  3. Corporate Discount
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  {debugInfo.corporateDiscount?.applied ? (
                    <div className="text-purple-400">
                      <div>Discount: {debugInfo.corporateDiscount.percentage}% off</div>
                      {debugInfo.corporateDiscount.accountName && (
                        <div>Account: {debugInfo.corporateDiscount.accountName}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500">No corporate discount (public quote)</div>
                  )}
                </div>
              </div>

              {/* Return Journey */}
              <div>
                <div className="text-slate-400 mb-1 flex items-center gap-2">
                  <Percent className="w-3 h-3" />
                  4. Return Journey
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  {debugInfo.returnJourney?.applied ? (
                    <div className="text-green-400">
                      <div>Applied: Yes</div>
                      {debugInfo.returnJourney.pickupTime && (
                        <div className="text-sm">
                          Return pickup: {new Date(debugInfo.returnJourney.pickupTime).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })} {new Date(debugInfo.returnJourney.pickupTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500">No return journey (one-way trip)</div>
                  )}
                </div>
              </div>

              {/* Zone/Destination Details (collapsible) */}
              <details className="pt-2 border-t border-slate-600">
                <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
                  Location Details
                </summary>
                <div className="mt-2 space-y-2">
                  {/* Pickup Info */}
                  <div>
                    <div className="text-slate-500 mb-1">Pickup</div>
                    <div className="bg-slate-900 p-2 rounded">
                      <div>Address: {debugInfo.pickup.address}</div>
                      <div>PlaceId: {debugInfo.pickup.placeId}</div>
                      <div className="flex items-center gap-2">
                        Postcode: <span className={debugInfo.pickup.extractedPostcode ? 'text-green-400' : 'text-red-400'}>
                          {debugInfo.pickup.extractedPostcode || 'NOT FOUND'}
                        </span>
                        {debugInfo.serviceArea.pickupInArea ? (
                          <span className="text-green-400">(in service area)</span>
                        ) : (
                          <span className="text-red-400">(OUT OF SERVICE AREA)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropoff Info */}
                  {debugInfo.dropoff && (
                    <div>
                      <div className="text-slate-500 mb-1">Dropoff</div>
                      <div className="bg-slate-900 p-2 rounded">
                        <div>Address: {debugInfo.dropoff.address}</div>
                        <div>PlaceId: {debugInfo.dropoff.placeId}</div>
                        <div className="flex items-center gap-2">
                          Postcode: <span className={debugInfo.dropoff.extractedPostcode ? 'text-green-400' : 'text-yellow-400'}>
                            {debugInfo.dropoff.extractedPostcode || 'N/A (airport/station)'}
                          </span>
                          {debugInfo.serviceArea.dropoffInArea ? (
                            <span className="text-green-400">(in service area)</span>
                          ) : (
                            <span className="text-yellow-400">(outside service area)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zone Match */}
                  <div>
                    <div className="text-slate-500 mb-1">Zone Match</div>
                    <div className="bg-slate-900 p-2 rounded">
                      {debugInfo.zoneMatch ? (
                        <div className="text-green-400">
                          <div>Zone: {debugInfo.zoneMatch.zoneName} ({debugInfo.zoneMatch.zoneId})</div>
                          {debugInfo.zoneMatch.isReversed && (
                            <div className="text-yellow-400">REVERSED (dropoff is zone, pickup is destination)</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-500">No zone match</div>
                      )}
                    </div>
                  </div>

                  {/* Destination Match */}
                  <div>
                    <div className="text-slate-500 mb-1">Destination Match</div>
                    <div className="bg-slate-900 p-2 rounded">
                      {debugInfo.destinationMatch ? (
                        <div className="text-green-400">
                          {debugInfo.destinationMatch.destinationName} ({debugInfo.destinationMatch.destinationId})
                        </div>
                      ) : (
                        <div className="text-slate-500">No destination match</div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Journey Summary */}
      <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light">
        <h3 className="text-sm font-semibold text-foreground mb-3">Your Journey</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-sage-dark mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs">From</p>
              <p className="text-foreground truncate">{multiQuote.pickupLocation.address}</p>
            </div>
          </div>
          {/* Waypoints */}
          {multiQuote.waypoints && multiQuote.waypoints.length > 0 && (
            <>
              {multiQuote.waypoints.map((waypoint, index) => (
                <div key={index} className="flex items-start gap-2 pl-2 border-l-2 border-sage-light ml-1.5">
                  <MapPin className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground text-xs">
                      Stop {index + 1}
                      {waypoint.waitTime && waypoint.waitTime > 0 && (
                        <span className="ml-1 text-amber-600">
                          (Wait: {waypoint.waitTime >= 60 ? `${Math.floor(waypoint.waitTime / 60)}h ${waypoint.waitTime % 60}m` : `${waypoint.waitTime}m`})
                        </span>
                      )}
                    </p>
                    <p className="text-foreground truncate">{waypoint.address}</p>
                  </div>
                </div>
              ))}
            </>
          )}
          {multiQuote.dropoffLocation && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-navy-dark mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">To</p>
                <p className="text-foreground truncate">{multiQuote.dropoffLocation.address}</p>
              </div>
            </div>
          )}
          {/* Outbound Pickup Date & Time */}
          <div className="flex items-center gap-3 pt-2 border-t border-border mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sage-dark" />
              <span className="text-foreground font-medium">{pickupDateTime.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sage-dark" />
              <span className="text-foreground font-medium">{pickupDateTime.time}</span>
            </div>
          </div>
          {/* Return Journey Details (if applicable) */}
          {multiQuote.returnJourney && multiQuote.returnPickupTime && (
            <div className="flex items-center gap-3 pt-2 border-t border-border mt-2 bg-sage-dark/5 -mx-4 px-4 py-2">
              <div className="text-xs font-semibold text-sage-dark">Return Journey</div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sage-dark" />
                <span className="text-foreground font-medium">
                  {new Date(multiQuote.returnPickupTime).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sage-dark" />
                <span className="text-foreground font-medium">
                  {formatTime12Hour(multiQuote.returnPickupTime)}
                </span>
              </div>
            </div>
          )}
          {/* Distance & Duration */}
          <div className="flex items-center gap-4 pt-2 border-t border-border mt-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{multiQuote.journey.distance.text}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Est. {multiQuote.journey.duration.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground px-1">
          {journeyType === 'round-trip'
            ? 'Select your vehicle for your return journey'
            : journeyType === 'hourly'
              ? 'Select your vehicle for hourly hire'
              : 'Select your vehicle'
          }
        </h3>

        {availableVehicles.map((type) => {
          const pricing = multiQuote.vehicles[type];
          // For round-trip, only show return price. For one-way/hourly, only show one-way price.
          const isReturnOnly = journeyType === 'round-trip';
          const isOneWayOnly = journeyType === 'one-way' || journeyType === 'hourly';

          return (
            <div
              key={type}
              className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light"
            >
              {/* Vehicle Header with Image */}
              <div className="flex items-start gap-3 mb-4">
                {/* Vehicle Image - larger size for better visibility */}
                {pricing.imageUrl ? (
                  <div className="relative w-40 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                    <Image
                      src={pricing.imageUrl}
                      alt={pricing.name}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-40 h-28 rounded-xl bg-sage-dark/10 flex items-center justify-center flex-shrink-0">
                    <Car className="w-12 h-12 text-sage-dark" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-foreground">{pricing.name}</h4>
                  <p className="text-sm text-muted-foreground">Up to {pricing.capacity} passengers</p>
                  {pricing.luggageCapacity !== undefined && pricing.luggageCapacity > 0 && (
                    <p className="text-sm text-muted-foreground">Up to {pricing.luggageCapacity} bags</p>
                  )}
                </div>
              </div>

              {/* Features */}
              {pricing.features && pricing.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {pricing.features.slice(0, 3).map((feature, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              {/* Price Buttons - Single button layout when journey type is pre-selected */}
              {isOneWayOnly && (
                <button
                  type="button"
                  onClick={() => handleVehicleSelect(type, false)}
                  className={`w-full flex flex-col items-center p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                    selectedVehicle === type
                      ? 'border-sage-dark bg-sage-dark/10 ring-2 ring-sage-dark ring-offset-2'
                      : 'border-border hover:border-sage-dark hover:bg-sage-dark/5'
                  }`}
                >
                  {selectedVehicle === type && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-sage-dark rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground mb-1">
                    {journeyType === 'hourly' ? 'Hourly Rate' : 'One-Way'} (Exc. VAT{pricing.oneWay.breakdown.airportDropFee ? ' & Fees' : ''})
                  </span>
                  <span className="text-2xl font-bold text-foreground">
                    {/* Show price excluding VAT when VAT is applied, otherwise show display price */}
                    {pricing.oneWay.breakdown.vatAmount
                      ? `£${((pricing.oneWay.price - pricing.oneWay.breakdown.vatAmount) / 100).toFixed(2)}`
                      : pricing.oneWay.displayPrice}
                  </span>
                </button>
              )}

              {isReturnOnly && (
                <button
                  type="button"
                  onClick={() => handleVehicleSelect(type, true)}
                  className={`w-full flex flex-col items-center p-4 rounded-xl border-2 transition-all active:scale-[0.98] relative ${
                    selectedVehicle === type
                      ? 'border-sage-dark bg-sage-dark/10 ring-2 ring-sage-dark ring-offset-2'
                      : 'border-sage-dark bg-sage-dark/5 hover:bg-sage-dark/10'
                  }`}
                >
                  {/* Discount Badge - only show if there's a discount */}
                  {pricing.return.discount.percentage > 0 && (
                    <span className={`absolute -top-2 px-2 py-0.5 bg-sage-dark text-white text-xs font-semibold rounded-full ${
                      selectedVehicle === type ? '-left-2' : '-right-2'
                    }`}>
                      Save {pricing.return.discount.percentage}%
                    </span>
                  )}
                  {selectedVehicle === type && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-sage-dark rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground mb-1">
                    Return Journey (Exc. VAT{pricing.return.breakdown.airportDropFee ? ' & Fees' : ''})
                  </span>
                  <span className="text-2xl font-bold text-sage-dark">
                    {/* Show price excluding VAT when VAT is applied, otherwise show display price */}
                    {pricing.return.breakdown.vatAmount
                      ? `£${((pricing.return.price - pricing.return.breakdown.vatAmount) / 100).toFixed(2)}`
                      : pricing.return.displayPrice}
                  </span>
                  {/* Show original price if discounted - use breakdown.outboundLeg doubled */}
                  {pricing.return.discount.percentage > 0 && pricing.return.breakdown.outboundLeg && (
                    <span className="text-xs text-muted-foreground line-through">
                      {`£${((pricing.return.breakdown.outboundLeg * 2) / 100).toFixed(2)}`}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {availableVehicles.length === 0 && (
          <div className="bg-card rounded-2xl p-8 shadow-mobile border-2 border-sage-light text-center">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No vehicles available for {passengers} passengers.
              <br />
              Please reduce the passenger count.
            </p>
          </div>
        )}
      </div>

      {/* Sticky Confirmation Button */}
      {selectedVehicle && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 -mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="font-semibold text-foreground">
                {getSelectedPricing()?.name} - {getSelectedPricing()?.journeyType}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-sage-dark">
                {getSelectedPricing()?.price}
              </p>
              <p className="text-xs text-muted-foreground">(Exc. VAT{getSelectedPricing()?.hasAirportFee ? ' & Fees' : ''})</p>
            </div>
          </div>

          {/* Show different actions based on service area */}
          {isOutOfServiceArea ? (
            <div className="space-y-2">
              <Button
                onClick={() => setShowShareModal(true)}
                className="w-full bg-sage-dark hover:bg-sage-dark/90 text-white h-12 text-lg font-semibold"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share This Quote
              </Button>
              <a
                href="tel:+441234567890"
                className="flex items-center justify-center gap-2 w-full h-12 text-lg font-semibold border-2 border-sage-dark text-sage-dark rounded-lg hover:bg-sage-dark/5 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Call Us to Discuss
              </a>
            </div>
          ) : (
            <Button
              onClick={handleConfirm}
              className="w-full bg-sage-dark hover:bg-sage-dark/90 text-white h-12 text-lg font-semibold"
            >
              Confirm Selection
            </Button>
          )}
        </div>
      )}

      {/* Share Quote Modal */}
      <ShareQuoteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        quoteData={multiQuote}
        selectedVehicle={selectedVehicle || 'standard'}
      />
    </div>
  );
}
