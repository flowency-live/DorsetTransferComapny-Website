/**
 * API Configuration
 * Centralized API endpoint configuration for all environments
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://relay.api.opstack.uk';

/**
 * API Endpoints (V2 HTTP API)
 */
export const API_ENDPOINTS = {
  // Public Quote Endpoints
  quotes: '/v2/quotes',
  quotesSave: '/v2/quotes/save',
  quotesRetrieve: '/v2/quotes', // /v2/quotes/{quoteId}?token=xxx
  bookings: '/v2/bookings',
  vehicleTypes: '/v2/vehicle-types',
  zonePricing: '/v2/zone-pricing',
  locations: '/v2/locations',
  locationsGeocode: '/v2/locations/geocode',
  locationsPlaceDetails: '/v2/locations/place-details',
  contact: '/v2/contact',
  tenantContact: '/v2/tenant/contact',
  customerUploads: '/v2/uploads/presigned',

  // Corporate Portal Authentication
  corporateMagicLink: '/v2/corporate/auth/magic-link',
  corporateVerify: '/v2/corporate/auth/verify',
  corporateSession: '/v2/corporate/auth/session',
  corporateLogin: '/v2/corporate/auth/login',
  corporateSetPassword: '/v2/corporate/auth/set-password',
  corporateForgotPassword: '/v2/corporate/auth/forgot-password',
  corporateLogout: '/v2/corporate/auth/logout',

  // Corporate Portal API
  corporateMe: '/v2/corporate/me',
  corporateNotifications: '/v2/corporate/me/notifications',
  corporateTrips: '/v2/corporate/me/trips',
  corporateDashboard: '/v2/corporate/dashboard',
  corporateCompany: '/v2/corporate/company',
  corporateUsers: '/v2/corporate/users',

  // Driver Portal Authentication
  driverRegister: '/v2/driver/auth/register',
  driverLogin: '/v2/driver/auth/login',
  driverMagicLink: '/v2/driver/auth/magic-link',
  driverVerify: '/v2/driver/auth/verify',
  driverSession: '/v2/driver/auth/session',
  driverLogout: '/v2/driver/auth/logout',

  // Driver Portal API
  driverProfile: '/v2/driver/profile',
  driverVehicles: '/v2/driver/vehicles',
  driverDocuments: '/v2/driver/documents',
  driverAvailability: '/v2/driver/availability',
  driverLicenseCheck: '/v2/driver/license-check',

  // Chat Widget (AI Booking Assistant)
  chatSession: '/v2/chat/session',
  chatMessage: '/v2/chat/message',

  // Feedback

  // Flight lookup
  flightsLookup: '/v2/flights/lookup',
} as const;

/**
 * Build full API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
