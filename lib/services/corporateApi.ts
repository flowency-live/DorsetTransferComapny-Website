/**
 * Corporate Portal API Service
 * Handles all API calls for the corporate portal
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

// Note: Corporate auth now uses httpOnly cookies instead of localStorage
// This provides better security against XSS attacks

export interface CorporateUser {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  companyName: string;
  corpAccountId: string;
  linkedPassengerId?: string | null;
}

// Feature 5B: Linked passenger data returned from GET /corporate/me
export interface LinkedPassenger {
  passengerId: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  alias?: string | null;
  referToAs?: string | null;
  refreshments?: Record<string, boolean | string> | null;
  driverInstructions?: string | null;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: CorporateUser;
  expiresIn?: number;
  message?: string;
  error?: string;
  needsPassword?: boolean;
  magicLink?: string;
  debugInfo?: {
    note: string;
    expiresIn: string;
  };
}

interface ProfileResponse {
  user: {
    userId: string;
    email: string;
    name: string;
    role: 'admin' | 'booker';
    status: string;
    notifications: Record<string, boolean>;
    channels?: {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
    };
    phone?: string | null;
    lastLogin?: string;
    createdAt: string;
    linkedPassengerId?: string | null;
  };
  company: {
    corpAccountId: string;
    companyName: string;
    discountPercentage: number;
    status: string;
  } | null;
  linkedPassenger?: LinkedPassenger | null;
}

interface DashboardResponse {
  company: {
    companyName: string;
    discountPercentage: number;
    status: string;
  } | null;
  stats: {
    teamMembers: number;
    totalBookings: number;
    totalSpend: number;
    pendingApprovals: number;
  };
  recentBookings: Array<{
    id: string;
    date: string;
    passengerName: string;
    bookedBy: string;
    pickup: string;
    dropoff: string;
    status: string;
    magicToken?: string | null;
  }>;
}

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  requiresApproval?: boolean;
  status: string;
  lastLogin?: string;
  createdAt: string;
}

interface TeamResponse {
  users: TeamMember[];
  total: number;
}

// Favourite Trip Types
export interface TripLocation {
  address: string;
  placeId?: string;
  lat: number;
  lng: number;
}

export interface TripWaypoint extends TripLocation {
  waitTime?: number;
}

export interface FavouriteTrip {
  tripId: string;
  label: string;
  pickupLocation: TripLocation;
  dropoffLocation: TripLocation;
  waypoints?: TripWaypoint[];
  vehicleType?: 'standard' | 'executive' | 'minibus';
  passengers?: number;
  luggage?: number;
  createdAt: string;
  lastUsedAt?: string;
  usageCount?: number;
}

interface TripsResponse {
  trips: FavouriteTrip[];
  total: number;
}

interface SaveTripData {
  label: string;
  pickupLocation: TripLocation;
  dropoffLocation: TripLocation;
  waypoints?: TripWaypoint[];
  vehicleType?: 'standard' | 'executive' | 'minibus';
  passengers?: number;
  luggage?: number;
}

interface UpdateTripData {
  label?: string;
  pickupLocation?: TripLocation;
  dropoffLocation?: TripLocation;
  waypoints?: TripWaypoint[];
  vehicleType?: 'standard' | 'executive' | 'minibus';
  passengers?: number;
  luggage?: number;
}

// Note: Token storage functions removed - now using httpOnly cookies
// The browser automatically sends cookies with requests when credentials: 'include' is used

/**
 * Make authenticated API request
 * Uses httpOnly cookies for authentication (credentials: 'include')
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Send cookies with requests
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

/**
 * Request magic link email
 */
export async function requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateMagicLink}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return response.json();
}

/**
 * Verify magic link token
 * Returns needsPassword=true if user needs to set password
 * Cookie is set automatically by the server if authentication succeeds
 */
export async function verifyToken(token: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateVerify}`, {
    method: 'POST',
    credentials: 'include', // Receive and store cookie from server
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  return response.json();
}

/**
 * Login with email and password
 * Cookie is set automatically by the server if authentication succeeds
 */
export async function passwordLogin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateLogin}`, {
    method: 'POST',
    credentials: 'include', // Receive and store cookie from server
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}

/**
 * Set password using magic link token
 * Cookie is set automatically by the server if authentication succeeds
 */
export async function setPassword(
  token: string,
  password: string,
  confirmPassword: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateSetPassword}`, {
    method: 'POST',
    credentials: 'include', // Receive and store cookie from server
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password, confirmPassword }),
  });

  return response.json();
}

/**
 * Request password reset link
 */
export async function forgotPassword(email: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateForgotPassword}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return response.json();
}

/**
 * Verify current session
 * Uses cookie-based authentication automatically
 */
export async function verifySession(): Promise<{ valid: boolean; user?: CorporateUser }> {
  try {
    return await authenticatedFetch(API_ENDPOINTS.corporateSession);
  } catch {
    // Session invalid - cookie will be handled by server
    return { valid: false };
  }
}

/**
 * Logout - clear session cookie via API
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateLogout}`, {
      method: 'POST',
      credentials: 'include', // Send cookie to clear it
    });
  } catch {
    // Ignore errors - we're logging out anyway
  }
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporateMe);
}

// ============================================================================
// COMMUNICATION PREFERENCES (Feature 4)
// ============================================================================

export interface CommunicationChannels {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface NotificationPreferences {
  emailBookingConfirmations?: boolean;
  emailWeeklyDigest?: boolean;
  emailMarketingUpdates?: boolean;
  channels?: CommunicationChannels;
  phone?: string | null;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  message: string;
  channels?: CommunicationChannels;
  phone?: string | null;
  emailBookingConfirmations?: boolean;
  emailWeeklyDigest?: boolean;
  emailMarketingUpdates?: boolean;
}

/**
 * Update notification preferences including communication channels
 */
export async function updateNotifications(
  preferences: NotificationPreferences
): Promise<NotificationPreferencesResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporateNotifications, {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
}

/**
 * Get dashboard data
 */
export async function getDashboard(): Promise<DashboardResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporateDashboard);
}

/**
 * Get company details
 */
export async function getCompany(): Promise<Record<string, unknown>> {
  return authenticatedFetch(API_ENDPOINTS.corporateCompany);
}

/**
 * Update company details (admin only)
 */
export async function updateCompany(
  data: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(API_ENDPOINTS.corporateCompany, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get team members
 */
export async function getTeamMembers(): Promise<TeamResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporateUsers);
}

/**
 * Add team member (admin only)
 */
export async function addTeamMember(data: {
  email: string;
  name: string;
  role: 'admin' | 'booker';
  requiresApproval?: boolean;
}): Promise<{ success: boolean; message: string; user?: TeamMember; magicLink?: string; instructions?: { note: string } }> {
  return authenticatedFetch(API_ENDPOINTS.corporateUsers, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update team member (admin only)
 */
export async function updateTeamMember(
  userId: string,
  data: { name?: string; phone?: string; role?: 'admin' | 'booker'; status?: 'active' | 'inactive'; requiresApproval?: boolean }
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporateUsers}/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Remove team member (admin only)
 */
export async function removeTeamMember(
  userId: string
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporateUsers}/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Resend invite to a pending team member (admin only)
 */
export async function resendInvite(
  userId: string
): Promise<{ success: boolean; message: string; magicLink?: string; instructions?: { note: string } }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporateUsers}/${userId}/resend-invite`, {
    method: 'POST',
  });
}

// ============================================================================
// FAVOURITE TRIPS
// ============================================================================

/**
 * Get user's favourite trips
 */
export async function getFavouriteTrips(): Promise<TripsResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporateTrips);
}

/**
 * Save a new favourite trip
 */
export async function saveFavouriteTrip(
  data: SaveTripData
): Promise<{ success: boolean; message: string; trip?: FavouriteTrip }> {
  return authenticatedFetch(API_ENDPOINTS.corporateTrips, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a favourite trip
 */
export async function updateFavouriteTrip(
  tripId: string,
  data: UpdateTripData
): Promise<{ success: boolean; message: string; trip?: FavouriteTrip }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporateTrips}/${tripId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a favourite trip
 */
export async function deleteFavouriteTrip(
  tripId: string
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporateTrips}/${tripId}`, {
    method: 'DELETE',
  });
}

/**
 * Mark a trip as used (updates lastUsedAt and usageCount)
 * Call this after successfully booking with a favourite trip
 */
export async function markTripUsed(
  tripId: string
): Promise<{ success: boolean; message: string; trip?: FavouriteTrip }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporateTrips}/${tripId}/used`, {
    method: 'PUT',
  });
}

// ============================================================================
// ACCOUNT PREFERENCES (WI-6.1, WI-6.2)
// ============================================================================

export type NameBoardFormat =
  | 'title-initial-surname'
  | 'firstname-lastname'
  | 'company-only'
  | 'passenger-alias'
  | 'title-initial-surname-company'
  | 'custom';

export interface AccountPreferences {
  nameBoardFormat: NameBoardFormat;
  nameBoardCustomText: string | null;
  logoUrl: string | null;
  logoS3Key: string | null;
  // Default booking preferences
  defaultRefreshments: RefreshmentPreferences | null;
  defaultDriverInstructions: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface PreferencesResponse {
  preferences: AccountPreferences;
  corpAccountId: string;
}

interface LogoUploadUrlResponse {
  uploadUrl: string;
  logoKey: string;
  contentType: string;
  expiresIn: number;
}

interface LogoConfirmResponse {
  success: boolean;
  logoKey: string;
  logoUrl: string;
}

/**
 * Get account preferences
 */
export async function getPreferences(): Promise<PreferencesResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporatePreferences);
}

/**
 * Update account preferences
 */
export async function updatePreferences(data: {
  nameBoardFormat?: NameBoardFormat;
  nameBoardCustomText?: string;
}): Promise<{ success: boolean; message: string; preferences: Partial<AccountPreferences> }> {
  return authenticatedFetch(API_ENDPOINTS.corporatePreferences, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get presigned URL for logo upload
 */
export async function getLogoUploadUrl(data: {
  contentType: string;
  fileName: string;
  fileSize: number;
}): Promise<LogoUploadUrlResponse> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePreferences}/logo/upload-url`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Upload logo to S3 using presigned URL
 * This is a direct upload to S3, not through our API
 */
export async function uploadLogoToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload logo to storage');
  }
}

/**
 * Confirm logo upload after successful S3 upload
 */
export async function confirmLogoUpload(logoKey: string): Promise<LogoConfirmResponse> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePreferences}/logo/confirm`, {
    method: 'POST',
    body: JSON.stringify({ logoKey }),
  });
}

/**
 * Delete logo
 */
export async function deleteLogo(): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePreferences}/logo`, {
    method: 'DELETE',
  });
}

// ============================================================================
// PASSENGER DIRECTORY (WI-6.3, WI-6.4)
// ============================================================================

export type PassengerTitle = 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr' | 'Prof' | 'Lord' | 'Lady' | 'Sir' | 'Dame';

export interface RefreshmentPreferences {
  stillWater?: boolean;
  sparklingWater?: boolean;
  tea?: boolean;
  coffee?: boolean;
  other?: string;
}

export interface Passenger {
  passengerId: string;
  title: PassengerTitle | null;
  firstName: string;
  lastName: string;
  displayName: string;
  alias: string | null;
  referToAs: string | null;
  contactName: string | null;
  isRepresentative: boolean | null;
  representativeRole: string | null;
  email: string | null;
  phone: string | null;
  channels: CommunicationChannels | null; // Feature 4: Communication channels
  refreshments: RefreshmentPreferences | null;
  driverInstructions: string | null;
  bookerNotes: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  linkedUserId?: string | null; // Feature 5: Linked to a corporate user account
}

export interface PassengerListItem {
  passengerId: string;
  title: PassengerTitle | null;
  firstName: string;
  lastName: string;
  displayName: string;
  alias: string | null;
  contactName: string | null;
  isRepresentative: boolean | null;
  representativeRole: string | null;
  email: string | null;
  phone: string | null;
  usageCount: number;
  lastUsedAt: string | null;
  linkedUserId?: string | null; // Feature 5: Linked to a corporate user account
}

interface PassengerListResponse {
  passengers: PassengerListItem[];
  total: number;
}

export interface CreatePassengerData {
  firstName: string;
  lastName: string;
  title?: PassengerTitle;
  alias?: string;
  referToAs?: string;
  contactName?: string;
  isRepresentative?: boolean;
  representativeRole?: string;
  email?: string;
  phone?: string;
  channels?: CommunicationChannels; // Feature 4: Communication channels
  refreshments?: RefreshmentPreferences;
  driverInstructions?: string;
  bookerNotes?: string;
}

export interface UpdatePassengerData {
  firstName?: string;
  lastName?: string;
  title?: PassengerTitle | null;
  alias?: string | null;
  referToAs?: string | null;
  contactName?: string | null;
  isRepresentative?: boolean | null;
  representativeRole?: string | null;
  email?: string | null;
  phone?: string | null;
  channels?: CommunicationChannels; // Feature 4: Communication channels
  refreshments?: RefreshmentPreferences | null;
  driverInstructions?: string | null;
  bookerNotes?: string | null;
}

export interface JourneyLocation {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface Journey {
  bookingId: string;
  date: string;
  // Full location objects for Rebook functionality
  pickupLocation: JourneyLocation | null;
  dropoffLocation: JourneyLocation | null;
  // Address strings for display (backwards compatibility)
  pickup: string;
  dropoff: string;
  vehicleType: string | null;
  vehicleName: string | null;
  pricePence: number | null;
  status: string;
  // Passenger and luggage counts for Rebook
  passengers: number | null;
  luggage: number | null;
}

export interface JourneyHistoryResponse {
  passengerId: string;
  passengerName: string;
  journeys: Journey[];
  totalJourneys: number;
  mostFrequentRoute: {
    pickup: string;
    dropoff: string;
    count: number;
  } | null;
}

/**
 * Get list of passengers
 */
export async function getPassengers(search?: string): Promise<PassengerListResponse> {
  const endpoint = search
    ? `${API_ENDPOINTS.corporatePassengers}?search=${encodeURIComponent(search)}`
    : API_ENDPOINTS.corporatePassengers;
  return authenticatedFetch(endpoint);
}

// ============================================================================
// PASSENGER AUTO-SUGGEST (Feature 3)
// ============================================================================

export interface SuggestedPassenger extends PassengerListItem {
  matchReason: 'route' | 'frequency';
  score: number;
}

interface SuggestedPassengersResponse {
  passengers: SuggestedPassenger[];
  total: number;
}

/**
 * Get suggested passengers based on route matching
 * Returns passengers who have previously traveled similar routes
 */
export async function getSuggestedPassengers(
  pickupPostcode: string,
  dropoffPostcode: string,
  limit?: number
): Promise<SuggestedPassengersResponse> {
  const params = new URLSearchParams({
    suggest: 'route',
    pickupPostcode,
    dropoffPostcode,
  });
  if (limit) {
    params.append('limit', limit.toString());
  }
  return authenticatedFetch(`${API_ENDPOINTS.corporatePassengers}?${params.toString()}`);
}

/**
 * Get passenger details
 */
export async function getPassenger(passengerId: string): Promise<{ passenger: Passenger }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePassengers}/${passengerId}`);
}

/**
 * Create a new passenger
 */
export async function createPassenger(
  data: CreatePassengerData
): Promise<{ success: boolean; message: string; passenger: Passenger }> {
  return authenticatedFetch(API_ENDPOINTS.corporatePassengers, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a passenger
 */
export async function updatePassenger(
  passengerId: string,
  data: UpdatePassengerData
): Promise<{ success: boolean; message: string; passenger: Passenger }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePassengers}/${passengerId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a passenger
 */
export async function deletePassenger(
  passengerId: string
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePassengers}/${passengerId}`, {
    method: 'DELETE',
  });
}

/**
 * Get passenger journey history
 */
export async function getPassengerJourneys(
  passengerId: string,
  limit?: number
): Promise<JourneyHistoryResponse> {
  const endpoint = limit
    ? `${API_ENDPOINTS.corporatePassengers}/${passengerId}/journeys?limit=${limit}`
    : `${API_ENDPOINTS.corporatePassengers}/${passengerId}/journeys`;
  return authenticatedFetch(endpoint);
}

// ============================================================================
// Feature 5B: Create Account from Passenger
// ============================================================================

export interface CreateAccountFromPassengerData {
  role?: 'admin' | 'booker';
  requiresApproval?: boolean;
}

export interface CreateAccountFromPassengerResponse {
  success: boolean;
  message: string;
  user: {
    userId: string;
    email: string;
    name: string;
    role: 'admin' | 'booker';
    status: string;
    linkedPassengerId: string;
  };
}

/**
 * Create a booking account from an existing passenger
 * Sends a magic link invite email and links the user to the passenger
 * Admin only
 */
export async function createAccountFromPassenger(
  passengerId: string,
  data?: CreateAccountFromPassengerData
): Promise<CreateAccountFromPassengerResponse> {
  return authenticatedFetch(
    `${API_ENDPOINTS.corporatePassengers}/${passengerId}/create-account`,
    {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }
  );
}

// ============================================================================
// PLACES (Feature 2)
// ============================================================================

export type PlaceType = 'personal' | 'office';

export interface Place {
  placeId: string;
  type: PlaceType;
  label: string;
  address: string;
  placeIdGoogle?: string;
  lat: number;
  lng: number;
  postcode?: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  lastUsedAt: string | null;
}

interface PlacesResponse {
  places: Place[];
  total: number;
}

export interface CreatePlaceData {
  type: PlaceType;
  label: string;
  address: string;
  placeIdGoogle?: string;
  lat: number;
  lng: number;
  postcode?: string;
}

export interface UpdatePlaceData {
  type?: PlaceType;
  label?: string;
  address?: string;
  placeIdGoogle?: string;
  lat?: number;
  lng?: number;
  postcode?: string;
}

/**
 * Get list of places (personal + office)
 */
export async function getPlaces(): Promise<PlacesResponse> {
  return authenticatedFetch(API_ENDPOINTS.corporatePlaces);
}

/**
 * Create a new place
 */
export async function createPlace(
  data: CreatePlaceData
): Promise<{ success: boolean; message: string; place: Place }> {
  return authenticatedFetch(API_ENDPOINTS.corporatePlaces, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a place
 */
export async function updatePlace(
  placeId: string,
  data: UpdatePlaceData
): Promise<{ success: boolean; message: string; place: Place }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePlaces}/${placeId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a place
 */
export async function deletePlace(
  placeId: string
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.corporatePlaces}/${placeId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// APPROVALS (Feature 1)
// ============================================================================

export interface ApprovalRequest {
  bookingId: string;
  requestedAt: string;
  requestedBy: {
    userId: string;
    name: string;
    email: string;
  };
  pickupTime: string;
  pickupLocation: {
    address: string;
  };
  dropoffLocation: {
    address: string;
  };
  vehicleType: string;
  estimatedPrice: number;
  status: 'pending_approval' | 'approved' | 'denied';
}

interface ApprovalsResponse {
  approvals: ApprovalRequest[];
  total: number;
}

export interface BookingEdits {
  vehicleType?: string;
  pickupTime?: string;
  pickupLocation?: { address: string; lat?: number; lng?: number };
  dropoffLocation?: { address: string; lat?: number; lng?: number };
}

export interface ApprovalAction {
  action: 'approve' | 'edit_approve' | 'deny';
  reason?: string;
  edits?: BookingEdits;
}

export interface ApprovalResult {
  bookingId: string;
  status: 'confirmed' | 'denied';
  approvedAt?: string;
  approvedBy?: string;
  deniedAt?: string;
  deniedBy?: string;
  reason?: string;
}

/**
 * Get list of pending approvals (for approvers only)
 */
export async function getApprovals(status?: string): Promise<ApprovalsResponse> {
  const endpoint = status
    ? `${API_ENDPOINTS.corporateApprovals}?status=${encodeURIComponent(status)}`
    : API_ENDPOINTS.corporateApprovals;
  return authenticatedFetch(endpoint);
}

/**
 * Approve a booking
 */
export async function approveBooking(
  bookingId: string,
  edits?: BookingEdits
): Promise<ApprovalResult> {
  const action: ApprovalAction = edits
    ? { action: 'edit_approve', edits }
    : { action: 'approve' };
  return authenticatedFetch(`${API_ENDPOINTS.corporateApprovals}/${bookingId}`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
}

/**
 * Deny a booking
 */
export async function denyBooking(
  bookingId: string,
  reason: string
): Promise<ApprovalResult> {
  const action: ApprovalAction = { action: 'deny', reason };
  return authenticatedFetch(`${API_ENDPOINTS.corporateApprovals}/${bookingId}`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
}
