/**
 * Driver Portal API Service
 * Handles all API calls for the driver portal
 */

import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';

const STORAGE_KEY = 'dtc_driver_token';

export interface DriverProfile {
  driverId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'onboarding' | 'active' | 'suspended' | 'inactive';
  workingDays: string[];
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  licenseCategories: string[];
  licenseExpiryDate: string | null;
  licenseVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverVehicle {
  vrn: string;
  make: string | null;
  colour: string | null;
  vehicleType: 'standard' | 'executive' | 'minibus';
  passengerCapacity: number | null;
  taxStatus: string;
  taxDueDate: string | null;
  motStatus: string;
  motExpiryDate: string | null;
  complianceStatus: 'pending_verification' | 'compliant' | 'expiring_soon' | 'expired' | 'blocked';
  lastApiCheck: string | null;
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  driver?: {
    driverId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  sessionToken?: string;
}

interface ProfileResponse {
  success: boolean;
  profile: DriverProfile;
}

interface VehiclesResponse {
  success: boolean;
  vehicles: DriverVehicle[];
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
 * Register new driver account
 */
export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverRegister}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (result.success && result.sessionToken) {
    storeToken(result.sessionToken);
  }

  return result;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverLogin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (result.success && result.sessionToken) {
    storeToken(result.sessionToken);
  }

  return result;
}

/**
 * Request magic link email
 */
export async function requestMagicLink(email: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverMagicLink}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return response.json();
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(token: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverVerify}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const result = await response.json();

  if (result.success && result.sessionToken) {
    storeToken(result.sessionToken);
  }

  return result;
}

/**
 * Verify current session
 */
export async function verifySession(): Promise<{ valid: boolean; driver?: DriverProfile }> {
  try {
    const token = getStoredToken();
    if (!token) return { valid: false };

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverSession}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearToken();
      return { valid: false };
    }

    const data = await response.json();
    return { valid: data.success, driver: data.driver };
  } catch {
    clearToken();
    return { valid: false };
  }
}

/**
 * Logout - clear token and call logout endpoint
 */
export async function logout(): Promise<void> {
  try {
    const token = getStoredToken();
    if (token) {
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.driverLogout}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } finally {
    clearToken();
  }
}

/**
 * Get driver profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  return authenticatedFetch(API_ENDPOINTS.driverProfile);
}

/**
 * Update driver profile
 */
export async function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  workingDays?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
}): Promise<{ success: boolean; message: string; profile?: DriverProfile }> {
  return authenticatedFetch(API_ENDPOINTS.driverProfile, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get driver vehicles
 */
export async function getVehicles(): Promise<VehiclesResponse> {
  return authenticatedFetch(API_ENDPOINTS.driverVehicles);
}

/**
 * Add a vehicle
 */
export async function addVehicle(data: {
  vrn: string;
  vehicleType?: 'standard' | 'executive' | 'minibus';
}): Promise<{ success: boolean; message: string; vehicle?: DriverVehicle }> {
  return authenticatedFetch(API_ENDPOINTS.driverVehicles, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove a vehicle
 */
export async function removeVehicle(vrn: string): Promise<{ success: boolean; message: string }> {
  return authenticatedFetch(`${API_ENDPOINTS.driverVehicles}/${vrn}`, {
    method: 'DELETE',
  });
}
