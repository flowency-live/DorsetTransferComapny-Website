# DTC Integration Guide: Pricing Engine Detail Component

This guide explains how to integrate the RelayPlatform pricing engine detail component into DorsetTransferCompany-Website (DTC).

## Overview

The `PricingCalculationDetail` component from RelayPlatform provides transparent pricing information to DTC customers. It displays how prices are calculated, what factors influence pricing, and explains the difference between zone-based and variable pricing.

## Integration Steps

### Step 1: Component Installation

Since DTC and RelayPlatform are in the same monorepo, import directly:

```typescript
import { PricingCalculationDetail, type VehiclePricing } from '@RelayPlatform/components/pricing';
```

No `npm install` needed - the component is already available.

### Step 2: Create a Pricing Detail Display Hook

Create a custom hook to transform API responses into the component's data structure:

**File: `hooks/usePricingDetail.ts`**

```typescript
import { useMemo } from 'react';
import type { VehiclePricing, PricingBreakdown, Modifier } from '@RelayPlatform/components/pricing';
import type { VehicleComparisonGridVehicle } from '@/app/quote/lib/types';

interface UsePricingDetailProps {
  vehicle: VehicleComparisonGridVehicle;
  vehicleType: string;
  pickupLocation: string;
  dropoffLocation: string;
  distance: number;
  waitTime: number;
  journeyType: 'ZONE' | 'VARIABLE';
  zoneName?: string;
  zoneId?: string;
}

export function usePricingDetail({
  vehicle,
  vehicleType,
  pickupLocation,
  dropoffLocation,
  distance,
  waitTime,
  journeyType,
  zoneName,
  zoneId,
}: UsePricingDetailProps): VehiclePricing {
  return useMemo(() => {
    const breakdown = vehicle.oneWay.breakdown;
    
    // Extract modifiers from vehicle pricing
    const modifiers: Modifier[] = [];
    
    if (vehicle.oneWay.surgeMultiplier && vehicle.oneWay.surgeMultiplier > 1) {
      modifiers.push({
        name: 'Surge Pricing',
        type: 'surcharge',
        amount: Math.round(
          breakdown.baseFare * (vehicle.oneWay.surgeMultiplier - 1)
        ),
        percentage: Math.round((vehicle.oneWay.surgeMultiplier - 1) * 100),
        reason: 'Peak hour or high demand',
      });
    }
    
    // Generate decision logic explanation
    const decisionLogic = journeyType === 'ZONE'
      ? `Route Matching Process:
1. ✓ Zone Match Found: ${zoneName}
2. ✓ Destination Matched
3. ✓ No waypoints detected
4. Result: ZONE PRICING applied
   Fixed Price: £${(breakdown.total / 100).toFixed(2)}
   Direct lookup from zone-destination table`
      : `Route Calculation Process:
1. Distance: ${distance.toFixed(1)} miles
2. Distance Charge @ £1.50/mi: £${(breakdown.distanceCharge / 100).toFixed(2)}
3. Base Fare: £${(breakdown.baseFare / 100).toFixed(2)}
${breakdown.waitTimeCharge > 0 ? `4. Wait Time (${waitTime}min @ £0.50/min): £${(breakdown.waitTimeCharge / 100).toFixed(2)}\n` : ''}
Result: VARIABLE PRICING applied
   Total: £${(breakdown.total / 100).toFixed(2)}`;

    return {
      vehicleId: vehicleType,
      vehicleName: vehicle.name,
      vehicleType,
      pricingMethod: journeyType,
      zoneId,
      zoneName,
      pickupLocation,
      dropoffLocation,
      distance,
      waitTime,
      breakdown: {
        basePrice: breakdown.baseFare,
        distanceCharge: breakdown.distanceCharge,
        waitTimeCharge: breakdown.waitTimeCharge,
        components: [
          {
            label: 'Base Fare',
            amount: breakdown.baseFare,
            description: `Starting charge for ${vehicle.name}`,
          },
          {
            label: 'Distance',
            amount: breakdown.distanceCharge,
            description: `${distance.toFixed(1)} miles`,
          },
          {
            label: 'Wait Time',
            amount: breakdown.waitTimeCharge,
            description: `${waitTime} minutes`,
          },
        ],
        waypoints: null, // Populated if waypoints exist
        modifiers,
        subtotal: breakdown.subtotal,
        total: breakdown.total,
      },
      decisionLogic,
      timestamp: new Date(),
    };
  }, [vehicle, vehicleType, pickupLocation, dropoffLocation, distance, waitTime, journeyType, zoneName, zoneId]);
}
```

### Step 3: Create a Debug Panel Component

**File: `app/quote/components/PricingDebugPanel.tsx`**

```typescript
'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PricingCalculationDetail } from '@RelayPlatform/components/pricing';
import { usePricingDetail } from '@/hooks/usePricingDetail';
import type { MultiVehicleQuoteResponse } from '@/app/quote/lib/types';
import styles from './PricingDebugPanel.module.css';

interface PricingDebugPanelProps {
  multiQuote: MultiVehicleQuoteResponse;
  selectedVehicleType?: string;
}

export default function PricingDebugPanel({
  multiQuote,
  selectedVehicleType,
}: PricingDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});

  const toggleVehicle = (vehicleType: string) => {
    setExpandedVehicles((prev) => ({
      ...prev,
      [vehicleType]: !prev[vehicleType],
    }));
  };

  // Determine pricing method from debug info
  const pricingMethod = multiQuote._debug?.pricingMethod === 'zone_pricing' ? 'ZONE' : 'VARIABLE';

  return (
    <div className={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.header}
      >
        <div className={styles.headerContent}>
          <span className={styles.title}>🔍 Pricing Engine Details</span>
          <span className={`${styles.badge} ${styles[pricingMethod.toLowerCase()]}`}>
            {pricingMethod}
          </span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className={styles.content}>
          {Object.entries(multiQuote.vehicles).map(([vehicleType, pricing]) => {
            const pricingDetail = usePricingDetail({
              vehicle: pricing,
              vehicleType,
              pickupLocation: multiQuote.pickupLocation.address,
              dropoffLocation: multiQuote.dropoffLocation?.address || 'TBD',
              distance: multiQuote.journey.distance.value / 1609.34, // Convert meters to miles
              waitTime: 0,
              journeyType: pricingMethod as 'ZONE' | 'VARIABLE',
              zoneName: multiQuote._debug?.zoneMatch?.zoneName,
              zoneId: multiQuote._debug?.zoneMatch?.zoneId,
            });

            return (
              <div
                key={vehicleType}
                className={`${styles.vehicleSection} ${
                  expandedVehicles[vehicleType] ? styles.expanded : ''
                }`}
              >
                <button
                  onClick={() => toggleVehicle(vehicleType)}
                  className={styles.vehicleHeader}
                >
                  <span>{pricing.name}</span>
                  {expandedVehicles[vehicleType] ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>

                {expandedVehicles[vehicleType] && (
                  <div className={styles.vehicleContent}>
                    <PricingCalculationDetail
                      pricing={pricingDetail}
                      expandedByDefault={true}
                      showWaypointDetails={multiQuote.waypoints.length > 0}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### Step 4: Styling for Debug Panel

**File: `app/quote/components/PricingDebugPanel.module.css`**

```css
.container {
  margin: 20px 0;
  border: 2px dashed #8a8d95;
  border-radius: 8px;
  overflow: hidden;
  background: #0f1117;
}

.header {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #22252d 0%, #1e212a 100%);
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #d4d6db;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s ease;
}

.header:hover {
  background: linear-gradient(135deg, #2a2d35 0%, #26292f 100%);
}

.headerContent {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  margin: 0;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge.zone {
  background: #2a4a7c;
  color: #a8d4ff;
}

.badge.variable {
  background: #3b2f5c;
  color: #d8b4fe;
}

.content {
  padding: 16px;
  border-top: 1px solid #2d3139;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vehicleSection {
  border: 1px solid #2d3139;
  border-radius: 6px;
  overflow: hidden;
}

.vehicleHeader {
  width: 100%;
  padding: 12px;
  background: #1a1d23;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #d4d6db;
  font-weight: 500;
  font-size: 13px;
  transition: background 0.2s ease;
}

.vehicleHeader:hover {
  background: #22252d;
}

.vehicleContent {
  padding: 16px;
  background: #0f1117;
  border-top: 1px solid #2d3139;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    margin: 16px 0;
  }

  .header {
    padding: 12px;
    font-size: 13px;
  }

  .content {
    padding: 12px;
    gap: 12px;
  }

  .vehicleContent {
    padding: 12px;
  }
}
```

### Step 5: Integrate into VehicleComparisonGrid

**File: `app/quote/components/VehicleComparisonGrid.tsx`**

Add the debug panel to the component:

```tsx
import PricingDebugPanel from './PricingDebugPanel';

export default function VehicleComparisonGrid({
  multiQuote,
  passengers,
  journeyType,
  onSelect,
}: VehicleComparisonGridProps) {
  // ... existing code ...

  return (
    <div className="space-y-4">
      {/* Add debug panel after the banner sections */}
      <PricingDebugPanel multiQuote={multiQuote} />

      {/* Rest of the component */}
    </div>
  );
}
```

## Step 6: Configuration

Ensure your DTC environment is set up correctly:

**`.env.local`**
```
# Relay API Configuration
NEXT_PUBLIC_RELAY_API_BASE_URL=https://relay-platform.example.com
```

## Testing

### Test Zone Pricing

1. Create a quote from Poole to London Heathrow
2. No waypoints
3. Click expand on pricing debug panel
4. Should show "ZONE PRICING" badge
5. Verify fixed price from zone lookup

### Test Variable Pricing

1. Create a quote from Poole to London Heathrow
2. **Add a waypoint** (e.g., Bournemouth University)
3. Click expand on pricing debug panel
4. Should show "VARIABLE PRICING" badge
5. Verify distance + time calculation
6. Compare price difference from zone pricing

## Styling Customization

The component uses dark theme by default. To customize for your DTC brand:

**`app/quote/components/PricingDebugPanel.module.css`** - Modify colors as needed:

```css
.badge {
  /* Change background color for your brand */
  background: #your-brand-color;
  color: #your-text-color;
}
```

Or override in a wrapper:

```css
:global(.dtc-pricing-detail) {
  --primary-accent: #your-brand-color;
}
```

## Troubleshooting

### Component not rendering

- Verify import path is correct
- Check that RelayPlatform component files exist
- Ensure TypeScript types are properly imported

### Pricing data incorrect

- Verify vehicle breakdown data is populated
- Check that distance/waypoint calculations are correct
- Compare with API response data

### Styling issues

- CSS modules scoped to component - won't conflict with other styles
- Check that CSS module import is correct
- Verify Tailwind config includes dark mode

## Performance Considerations

- Component memoized to prevent unnecessary re-renders
- Only render for expanded vehicles to reduce DOM
- Data transformation happens in custom hook

## Accessibility

The component is WCAG 2.1 AA compliant:
- Semantic HTML
- ARIA labels on buttons
- Keyboard navigation (expandable sections)
- High contrast dark theme
- Focus indicators

## Support

For issues with the pricing engine component:
1. Check RelayPlatform `/admin/pricing-engine/` for documentation
2. Review component README at `/components/pricing/README.md`
3. Contact RelayPlatform team for pricing engine questions

## Next Steps

After integration, you may want to:
1. Add pricing engine test scenarios page
2. Create historical pricing analytics
3. Implement price comparison tools
4. Add corporate/loyalty discount visualization
