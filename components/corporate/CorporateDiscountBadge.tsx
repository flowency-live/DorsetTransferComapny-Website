'use client';

import { BadgePercent } from 'lucide-react';

interface CorporateDiscountBadgeProps {
  percentage: number;
  accountName: string | null;
  variant?: 'compact' | 'full';
}

/**
 * Corporate Discount Badge
 * Displays the corporate discount prominently to logged-in corporate users.
 *
 * variant: 'compact' - Just shows percentage (for vehicle cards)
 * variant: 'full' - Shows percentage and account name (for header area)
 */
export default function CorporateDiscountBadge({
  percentage,
  accountName,
  variant = 'full',
}: CorporateDiscountBadgeProps) {
  if (percentage <= 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
        <BadgePercent className="w-3 h-3" />
        {percentage}% Corporate Rate
      </span>
    );
  }

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 shadow-mobile">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <BadgePercent className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-purple-800">Corporate Rate Applied</span>
            <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-sm font-bold rounded">
              {percentage}% OFF
            </span>
          </div>
          {accountName && (
            <p className="text-sm text-purple-600 mt-0.5">{accountName}</p>
          )}
        </div>
      </div>
    </div>
  );
}
