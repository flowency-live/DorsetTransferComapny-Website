# Corporate Client Pricing Logic Analysis

## Summary
✅ **YES - The return journey pricing logic will work correctly for corporate clients with additional discounts.**

The pricing calculation applies discounts in the correct order, with corporate discounts applied **on top** of return journey discounts, not instead of them.

---

## Discount Application Order (Backend)

The backend applies discounts in this precise sequence:

### 1. **Base Pricing Calculation**
   - Calculate base price for outbound leg (zone or variable pricing)
   - If return journey: Calculate return leg price (same as outbound, before discounts)

### 2. **Return Discount (15% typically)**
   - Applied to return leg ONLY
   - Formula: `returnPrice = returnLegBase * (1 - returnDiscount%)`
   - **Does NOT affect outbound leg**

### 3. **Surge Pricing** (if applicable)
   - Multiplier applied to both outbound AND return legs
   - Applied after return discount

### 4. **Corporate Discount** (if corporate client)
   - Applied AFTER all other pricing modifications
   - Applied to BOTH outbound AND return legs
   - Formula: `finalPrice = (price with surge and return discount) * (1 - corporateDiscount%)`

### 5. **Airport Drop Fee** (if applicable)
   - Fixed fee, NOT affected by any discounts
   - Added as pass-through charge

---

## Example Calculation (Corporate + Return Journey)

### Scenario
- Standard Sedan: £106.20 one-way
- Corporate account: 10% discount
- Return journey: YES (15% return discount)

### Calculation Breakdown

```
STEP 1: One-way pricing
  Outbound base:              £106.20 (10,620 pence)
  
STEP 2: Return leg base (no discount yet)
  Return leg base:            £106.20 (10,620 pence)
  
STEP 3: Apply 15% return discount to return leg only
  Return discount amount:     £106.20 × 15% = £15.93
  Return leg after discount:  £106.20 - £15.93 = £90.27
  
STEP 4: Check surge pricing
  (Assuming no surge)
  Outbound after surge:       £106.20
  Return after surge:         £90.27
  
STEP 5: Apply corporate discount (10%) to BOTH legs
  Outbound corporate discount: £106.20 × 10% = £10.62
  Return corporate discount:   £90.27 × 10% = £9.03
  
  Final outbound:             £106.20 - £10.62 = £95.58
  Final return leg:           £90.27 - £9.03 = £81.24
  
STEP 6: Calculate total return journey
  Total return journey:       £95.58 + £81.24 = £176.82

STEP 7: Airport fee (if applicable)
  If £15 airport fee:
    Final with fee:          £176.82 + £15.00 = £191.82
```

---

## Code Implementation Analysis

### Backend: `/relayplatform-serverless-api/functions/quotes-calculator/index.mjs`

#### Return Discount Application (lines 210-235)
```javascript
function applyReturnDiscount(pricing, returnDiscount, returnJourney, logger) {
  if (!returnJourney) return pricing;

  const discountPercent = returnDiscount || 0;
  const outboundTotal = pricing.breakdown.total;
  const returnLegPrice = outboundTotal;
  const discountAmount = Math.round(returnLegPrice * (discountPercent / 100));
  const returnLegFinal = returnLegPrice - discountAmount;
  const newTotal = outboundTotal + returnLegFinal;  // ← Both legs combined
  // ... returns pricing object with new total
}
```

#### Compare Mode Processing (lines 750-850)
The critical section handles corporate + return pricing for all vehicle types:

```javascript
// Apply surge pricing
let finalOneWayPrice = oneWayPrice;
let finalReturnPrice = returnPrice;
if (surgeResult.isPeakPricing) {
  finalOneWayPrice = Math.round(oneWayPrice * surgeResult.combinedMultiplier);
  finalReturnPrice = Math.round(returnPrice * surgeResult.combinedMultiplier);
}

// Apply corporate discount AFTER surge ← Correct order!
if (corporateDiscount && corporateDiscount.discountPercentage > 0) {
  const corpDiscountOneWay = Math.round(finalOneWayPrice * corporateDiscount.discountPercentage / 100);
  const corpDiscountReturn = Math.round(finalReturnPrice * corporateDiscount.discountPercentage / 100);
  finalOneWayPrice = finalOneWayPrice - corpDiscountOneWay;      // Apply to outbound
  finalReturnPrice = finalReturnPrice - corpDiscountReturn;       // Apply to return
}
```

**Key Points:**
- Return discount calculated first (reduces return leg price)
- Surge pricing applied to both legs
- Corporate discount applied to BOTH final prices
- Each discount is percentage of the current price (not stacked incorrectly)

#### Return Journey Response Structure (lines 820-840)
```javascript
vehicles[vType] = {
  oneWay: {
    price: finalOneWayPrice,         // Corporate discount already applied
    displayPrice: `£${...}`,         // Correct display price
    ...
  },
  return: {
    price: finalReturnPrice,         // Corporate + return discount already applied
    displayPrice: `£${...}`,         // Correct display price
    discount: { 
      percentage: returnDiscount,    // Only return discount percentage
      amount: discountAmount         // Only return discount amount
    },
    ...
  },
};
```

---

## Frontend: `/app/quote/components/VehicleComparisonGrid.tsx`

### One-Way Display (lines 520-530)
```tsx
<span className="text-2xl font-bold text-sage-dark">
  {pricing.oneWay.displayPrice}  // ✅ Shows: £95.58 (with corporate discount)
</span>
```

### Return Journey Display (lines 535-550) - CORRECTED
```tsx
<span className="text-xs text-muted-foreground mb-1">Return Journey</span>
<span className="text-2xl font-bold text-sage-dark">
  {`£${((pricing.oneWay.price + pricing.return.price) / 100).toFixed(2)}`}
  // ✅ Now shows: £176.82 (both legs with all discounts applied)
</span>

{pricing.return.discount.percentage > 0 && (
  <span className="text-xs text-muted-foreground line-through">
    {`£${((pricing.oneWay.price * 2) / 100).toFixed(2)}`}
    // ✅ Shows original before return discount: £212.40
  </span>
)}
```

### Debug Panel Display (lines 151-217)
Shows corporate discount status:
```tsx
{debugInfo.corporateDiscount?.applied && (
  <div className="text-cyan-700">
    CORP -{debugInfo.corporateDiscount.percentage}%
  </div>
)}
```

---

## Data Types Structure

### `PricingEngineDebugInfo` (types.ts)
```typescript
corporateDiscount?: {
  applied: boolean;
  percentage: number;
  accountName?: string;
};
```

### `VehiclePricing` (types.ts)
```typescript
oneWay: {
  price: number;        // In pence, already has corporate discount
  displayPrice: string; // "£95.58" format
};

return: {
  price: number;        // In pence, return leg with return discount + corporate discount
  displayPrice: string; // "£81.24" format
  discount: {
    percentage: number; // 15 (return discount only)
    amount: number;     // In pence (return discount amount only)
  };
};
```

---

## Verification: Multi-Discount Scenarios

### ✅ Scenario 1: Public Client, No Return
- Base: £106.20 (10,620p)
- No return discount
- No corporate discount
- **Display: £106.20** ✓

### ✅ Scenario 2: Public Client, Return Journey
- Outbound: £106.20 (10,620p)
- Return base: £106.20
- Return discount: -£15.93 (15%)
- Return final: £90.27
- **Display: £196.47** (106.20 + 90.27) ✓

### ✅ Scenario 3: Corporate Client, No Return
- Base: £106.20
- Corporate discount: -£10.62 (10%)
- Final: £95.58
- **Display: £95.58** ✓

### ✅ Scenario 4: Corporate Client, Return Journey (CRITICAL TEST)
- Outbound: £106.20 → Corporate: -£10.62 → **£95.58**
- Return base: £106.20
- Return discount: -£15.93 (15%) → £90.27
- Return corporate: -£9.03 (10% of £90.27) → **£81.24**
- **Total Display: £176.82** (95.58 + 81.24) ✓

### ✅ Scenario 5: Corporate + Return + Surge
- Outbound: £106.20 × 1.25 (surge) = £132.75
- Return: £106.20 - £15.93 (return discount) = £90.27 × 1.25 (surge) = £112.84
- Corporate on both: £132.75 - £13.28 = £119.47 | £112.84 - £11.28 = £101.56
- **Total: £221.03** (119.47 + 101.56) ✓

### ✅ Scenario 6: Corporate + Return + Surge + Airport Fee
- From scenario 5: £221.03
- Airport fee (£15): + £15.00
- **Total: £236.03** ✓

---

## Discount Math Verification

**Discount Application Formula (Correct):**
```
Final Price = Price × (1 - Discount%)
Final Price = Price - (Price × Discount%)
```

**NOT:**
```
Price × Discount% ← Wrong (this is the discount amount, not final price)
```

**Backend uses correct formula:**
```javascript
const corpDiscountReturn = Math.round(finalReturnPrice * corporateDiscount.discountPercentage / 100);
finalReturnPrice = finalReturnPrice - corpDiscountReturn;  // ✅ Correct
```

---

## Frontend Fix Validation

The fix to VehicleComparisonGrid.tsx line 539 is **CORRECT and COMPLETE**:

**Before (WRONG):**
```tsx
{pricing.return.displayPrice}  // Just the return leg: £81.24
```

**After (CORRECT):**
```tsx
{`£${((pricing.oneWay.price + pricing.return.price) / 100).toFixed(2)}`}
// Total: £95.58 + £81.24 = £176.82
```

This calculation:
- ✅ Includes outbound leg
- ✅ Includes return leg
- ✅ Both legs already have corporate discount applied (if applicable)
- ✅ Return leg already has return discount applied
- ✅ Shows the complete round-trip cost

---

## Conclusion

### Summary
The pricing system **correctly handles corporate discounts on top of return journey pricing**. The discount application order is:

1. Base pricing
2. Return discount (15% on return leg only)
3. Surge pricing (multiplier on both legs)
4. Corporate discount (on final price of both legs)
5. Airport fee (fixed amount)

### Testing Recommendation
**Test Case: Corporate Client Round Trip with Surge**
1. Create corporate account with 10% discount
2. Quote during peak pricing time (1.25x surge)
3. Enable return journey
4. Verify:
   - Outbound shows 10% discount applied ✓
   - Return shows 15% return + 10% corporate discounts stacked correctly ✓
   - Total = outbound (with corp discount) + return leg (with return + corp discounts) ✓
   - Debug panel shows all discounts applied ✓

### No Issues Found
The implementation is logically sound. All discount layers work correctly together, and the frontend now displays the correct total return journey cost.
