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

  // Corporate Portal Authentication (served from /corporate API, not /v2)
  corporateMagicLink: '/corporate/auth/magic-link',
  corporateVerify: '/corporate/auth/verify',
  corporateSession: '/corporate/auth/session',
  corporateLogin: '/corporate/auth/login',
  corporateSetPassword: '/corporate/auth/set-password',
  corporateForgotPassword: '/corporate/auth/forgot-password',
  corporateLogout: '/corporate/auth/logout',

  // Corporate Portal API (served from /corporate API, not /v2)
  corporateMe: '/corporate/me',
  corporateNotifications: '/corporate/me/notifications',
  corporateTrips: '/corporate/me/trips',
  corporateDashboard: '/corporate/dashboard',
  corporateCompany: '/corporate/company',
  corporateUsers: '/corporate/users',

  // Driver Portal Authentication (served from /driver API, not /v2)
  driverRegister: '/driver/auth/register',
  driverLogin: '/driver/auth/login',
  driverMagicLink: '/driver/auth/magic-link',
  driverVerify: '/driver/auth/verify',
  driverSession: '/driver/auth/session',
  driverLogout: '/driver/auth/logout',

  // Driver Portal API (served from /driver API, not /v2)
  driverProfile: '/driver/profile',
  driverVehicles: '/driver/vehicles',
  driverDocuments: '/driver/documents',
  driverAvailability: '/driver/availability',
  driverLicenseCheck: '/driver/license-check',

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
