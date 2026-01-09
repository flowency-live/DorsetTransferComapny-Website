/**
 * Tenant Configuration
 * All tenant-specific values for this white-label deployment.
 * When setting up a new tenant, clone this repo and update these values.
 */

export const TENANT_CONFIG = {
  // Tenant identification (must match backend tenant ID)
  tenantId: 'TENANT#001',

  // Site branding
  siteName: 'The Dorset Transfer Company',
  siteDescription:
    'Reliable, modern transfers across Dorset and beyond. From airport runs to business travel - we get you there on time, every time.',
  shortName: 'DTC',

  // URLs
  siteUrl: 'https://dorsettransfercompany.co.uk',
  adminPortalUrl: 'https://relay.opstack.uk/admin',

  // Default map center (Dorset)
  defaultMapCenter: { lat: 50.7155, lng: -2.4397 },
} as const;

/**
 * Get tenant ID header for API requests
 */
export function getTenantHeaders(): { 'X-Tenant-Id': string } {
  return { 'X-Tenant-Id': TENANT_CONFIG.tenantId };
}
