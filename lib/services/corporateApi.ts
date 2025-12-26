/**
 * Corporate Portal API Service
 * Handles all API calls for the corporate portal
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

// Note: Corporate auth now uses httpOnly cookies instead of localStorage
// This provides better security against XSS attacks

interface CorporateUser {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  companyName: string;
  corpAccountId: string;
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
    lastLogin?: string;
    createdAt: string;
  };
  company: {
    corpAccountId: string;
    companyName: string;
    discountPercentage: number;
    status: string;
  } | null;
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

/**
 * Update notification preferences
 */
export async function updateNotifications(
  notifications: Record<string, boolean>
): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(API_ENDPOINTS.corporateNotifications, {
    method: 'PUT',
    body: JSON.stringify(notifications),
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
  data: { name?: string; role?: 'admin' | 'booker'; status?: 'active' | 'inactive'; requiresApproval?: boolean }
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
