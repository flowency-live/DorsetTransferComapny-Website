/**
 * Corporate Portal API Service
 * Handles all API calls for the corporate portal
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

const STORAGE_KEY = 'dtc_corporate_token';

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

/**
 * Get stored auth token
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Store auth token
 */
export function storeToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, token);
}

/**
 * Clear auth token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Make authenticated API request
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return response.json();
}

/**
 * Verify magic link token
 * Returns needsPassword=true if user needs to set password
 */
export async function verifyToken(token: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateVerify}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();

  // Only store JWT token if user has password set (needsPassword=false)
  if (data.success && data.token && !data.needsPassword) {
    storeToken(data.token);
  }

  return data;
}

/**
 * Login with email and password
 */
export async function passwordLogin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateLogin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.success && data.token) {
    storeToken(data.token);
  }

  return data;
}

/**
 * Set password using magic link token
 */
export async function setPassword(
  token: string,
  password: string,
  confirmPassword: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateSetPassword}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password, confirmPassword }),
  });

  const data = await response.json();

  if (data.success && data.token) {
    storeToken(data.token);
  }

  return data;
}

/**
 * Request password reset link
 */
export async function forgotPassword(email: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.corporateForgotPassword}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return response.json();
}

/**
 * Verify current session
 */
export async function verifySession(): Promise<{ valid: boolean; user?: CorporateUser }> {
  try {
    return await authenticatedFetch(API_ENDPOINTS.corporateSession);
  } catch {
    clearToken();
    return { valid: false };
  }
}

/**
 * Logout - clear token
 */
export function logout(): void {
  clearToken();
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
