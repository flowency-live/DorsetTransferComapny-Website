// Quote Wizard TypeScript Types
// Based on QUOTE_WIZARD_IMPLEMENTATION_SPEC.md

// Journey Type
// - 'one-way': Single journey from A to B
// - 'round-trip': Journey A to B with return trip on specified date/time
// - 'hourly': Hire by the hour from pickup location
// - 'by-the-hour': Backend API uses this for hourly journeys
export type JourneyType = 'one-way' | 'round-trip' | 'hourly' | 'by-the-hour';

// Optional Extras
export interface Extras {
  babySeats: number;
  childSeats: number;
}

// Vehicle Type
export interface Vehicle {
  vehicleId: string;
  name: string;
  description: string;
  capacity: number;
  features: string[];
  imageUrl: string;
  baseFare: number;
  perMile: number;
  perMinute: number;
  active: boolean;
}

// Vehicle Type from /v2/vehicle-types endpoint
export interface VehicleType {
  vehicleTypeId: string;
  name: string;
  description: string;
  capacity: number;
  features: string[];
  imageUrl: string;
  sortOrder?: number;
  iconType?: string;  // Lucide icon type: car, crown, users, bus, bike, truck, plane, ship
}

export interface VehicleTypesResponse {
  vehicleTypes: VehicleType[];
  count: number;
}

// Location Type
export type LocationType = 'airport' | 'train_station' | 'standard';

export interface Location {
  address: string;
  placeId?: string;
  locationType?: LocationType;
  lat?: number;
  lng?: number;
  postcode?: string; // Postcode extracted from Google Places API
}

// Waypoint Type (extends Location with wait time)
export interface Waypoint extends Location {
  waitTime?: number; // Wait time in minutes at this waypoint
}

// Quote Request (POST /v1/quotes)
export interface QuoteRequest {
  pickupLocation: Location;
  dropoffLocation?: Location;
  waypoints?: Waypoint[];
  pickupTime: string;
  passengers: number;
  luggage?: number;
  vehicleType: string;
  returnJourney?: boolean;
  returnPickupTime?: string;
  journeyType?: JourneyType;
  durationHours?: number;
  extras?: Extras;
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
  };
  corpAccountId?: string;
}

// ============================================
// SIMPLIFIED PRICING TYPES
// Frontend just displays pre-calculated values, no calculations needed
// ============================================

// Itemized fees for breakdown display
export interface VehicleFees {
  airportDrop: number;  // Pence (0 if not applicable)
  vat: number;          // Pence (0 if VAT disabled)
  vatRate: number;      // Percentage (0 if VAT disabled)
}

// Return journey discount info
export interface ReturnDiscount {
  percentage: number;
  savings: number;
  displaySavings: string;
}

// Quote Response (for single-vehicle quote after selection)
// Used by QuoteResult and BookingConfirmation components
export interface QuoteResponse {
  quoteId: string;
  status: 'valid' | 'expired';
  expiresAt: string;
  journey: {
    distance: {
      meters: number;
      miles: string;
      text: string;
    };
    duration: {
      seconds: number;
      minutes: number;
      text: string;
    };
    route: {
      polyline: string | null;
    };
  };
  // Simplified pricing structure
  pricing: {
    currency: 'GBP';
    transferPrice: number;        // Transfer charges only (pence)
    displayTransferPrice: string; // Formatted
    totalPrice: number;           // Everything included (pence)
    displayTotal: string;         // Formatted
    fees: VehicleFees;
    discount?: ReturnDiscount;
  };
  vehicleType: string;
  vehicleDetails?: {
    name: string;
    description: string;
    imageUrl: string;
    capacity: number;
    features: string[];
  };
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints?: Waypoint[];
  pickupTime: string;
  passengers: number;
  luggage?: number;
  returnJourney: boolean;
  returnPickupTime?: string;
  journeyType?: JourneyType;
  durationHours?: number;
  extras?: Extras;
  createdAt: string;
}

// Form Data (internal state)
export interface QuoteFormData {
  pickupLocation: Location;
  dropoffLocation: Location;
  waypoints: Waypoint[]; // Changed to Waypoint[] for wait time support
  pickupDate: Date | null;
  pickupTime: string;
  passengers: number;
  vehicleType: string;
  returnJourney: boolean;
  contactDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

// API Error Response
export interface ApiError {
  error: {
    message: string;
    code?: string;
  };
}

// Fixed Route Types (matches Lambda formatRoute response)
export interface FixedRoute {
  routeId: string;
  originPlaceId: string;
  originName: string;
  originType: string;
  destinationPlaceId: string;
  destinationName: string;
  destinationType: string;
  vehicleId: string;
  vehicleName: string;
  price: number; // in pence
  distance: number;
  estimatedDuration: number;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface FixedRoutesResponse {
  routes: FixedRoute[];
  count: number;
}

// Zone Pricing Types (from /v1/zone-pricing endpoint)
export interface ZonePricingVehiclePrices {
  outbound: number;  // Price in pence
  return: number;    // Price in pence
}

export interface ZonePricingRoute {
  zoneId: string;
  zoneName: string;           // e.g., "Bournemouth Central"
  destinationId: string;
  destinationName: string;    // e.g., "London Heathrow Airport (LHR)"
  routeName: string;          // Full route name
  prices: Record<string, ZonePricingVehiclePrices>;
}

export interface ZonePricingResponse {
  routes: ZonePricingRoute[];
  count: number;
}

// Simplified pricing for one-way journeys
export interface SimplifiedOneWayPricing {
  transferPrice: number;        // Pence - transfer charges only
  displayTransferPrice: string; // Formatted, e.g., "£99.20"
  totalPrice: number;           // Pence - everything included
  displayTotalPrice: string;    // Formatted, e.g., "£126.04"
  fees: VehicleFees;
  // Corporate discount fields (only present when discount applied)
  transferPriceBeforeDiscount?: number;      // Pence - price before corporate discount
  displayTransferPriceBeforeDiscount?: string; // Formatted, e.g., "£110.00"
  corporateDiscountAmount?: number;          // Pence - discount amount
  displayCorporateDiscount?: string;         // Formatted, e.g., "£10.80"
}

// Simplified pricing for return journeys (extends one-way)
export interface SimplifiedReturnPricing extends SimplifiedOneWayPricing {
  discount: ReturnDiscount;
  originalTransferPrice: number;  // Pence - for strikethrough display
  displayOriginalPrice: string;   // Formatted, e.g., "£198.40"
}

// ============================================
// JOURNEY-LEVEL MODIFIERS
// ============================================

export interface SurgeModifier {
  active: boolean;
  multiplier: number;
  rules: { name: string; multiplier: number }[];
}

export interface CorporateDiscountModifier {
  active: boolean;
  percentage: number;
  accountName: string | null;
}

export interface VatModifier {
  active: boolean;
  rate: number;
  vatNumber: string | null;
}

export interface AirportFeeModifier {
  active: boolean;
  amount: number;
  airport: string | null;
  code: string | null;
}

export interface PricingModifiers {
  surge: SurgeModifier;
  corporateDiscount: CorporateDiscountModifier;
  vat: VatModifier;
  airportFee: AirportFeeModifier;
}

// ============================================
// VEHICLE PRICING (simplified structure)
// ============================================

// Vehicle pricing from compareMode response (matches backend response)
export interface VehiclePricing {
  // Vehicle metadata
  name: string;
  description: string;
  capacity: number;
  luggageCapacity?: number;
  features: string[];
  imageUrl: string;

  // One-way pricing
  oneWay: SimplifiedOneWayPricing;

  // Return pricing
  return: SimplifiedReturnPricing;
}

// Debug info for pricing engine
export interface PricingEngineDebugInfo {
  pickup: {
    address: string;
    placeId: string;
    extractedPostcode: string | null;
  };
  dropoff: {
    address: string;
    placeId: string;
    extractedPostcode: string | null;
  } | null;
  zoneMatch: {
    zoneId: string;
    zoneName: string;
    isReversed: boolean;
  } | null;
  destinationMatch: {
    destinationId: string;
    destinationName: string;
  } | null;
  pricingMethod: 'zone_pricing' | 'variable_pricing';
  serviceArea: {
    pickupInArea: boolean;
    dropoffInArea: boolean;
  };
  // Surge pricing info
  surge?: {
    applied: boolean;
    multiplier: number;
    rules: { name: string; multiplier: number }[];
  };
  // Return journey info
  returnJourney?: {
    applied: boolean;
    pickupTime?: string; // ISO 8601 format
  };
  // Corporate discount info
  corporateDiscount?: {
    applied: boolean;
    percentage: number;
    accountName?: string;
  };
}

// Backwards compatibility alias
export type ZonePricingDebugInfo = PricingEngineDebugInfo;

// Multi-vehicle quote response (compareMode: true)
export interface MultiVehicleQuoteResponse {
  compareMode: true;
  journeyType: JourneyType;
  journey: {
    distance: { meters: number; miles: string; text: string };
    duration: { seconds: number; minutes: number; text: string };
  };
  vehicles: Record<string, VehiclePricing>;
  pickupLocation: Location;
  dropoffLocation?: Location;
  durationHours?: number;
  pickupTime: string;
  returnJourney?: boolean;
  returnPickupTime?: string;
  passengers: number;
  luggage?: number;
  extras?: Extras;
  createdAt: string;
  expiresAt?: string;

  // Journey-level modifiers (surge, VAT, airport fee, etc.)
  modifiers: PricingModifiers;

  // Optional fields
  quoteId?: string;
  status?: 'valid' | 'expired';
  waypoints?: Waypoint[];
  totalWaitTime?: number;

  // Zone pricing info
  isZonePricing?: boolean;
  zoneName?: string;
  destinationName?: string;

  // Service area flags
  outOfServiceArea?: boolean;
  outOfServiceAreaMessage?: string;

  // Debug info (development only)
  _debug?: PricingEngineDebugInfo;
}
