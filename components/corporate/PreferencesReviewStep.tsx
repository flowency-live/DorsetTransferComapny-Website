'use client';

import { Info, Droplet, Coffee, MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import type { RefreshmentPreferences } from '@/lib/services/corporateApi';

export interface BookingPreferences {
  refreshments: RefreshmentPreferences;
  driverInstructions: string;
}

interface PreferencesReviewStepProps {
  passengerName: string;
  passengerPreferences?: {
    refreshments?: RefreshmentPreferences | null;
    driverInstructions?: string | null;
  };
  accountDefaults?: {
    refreshments?: RefreshmentPreferences | null;
    driverInstructions?: string | null;
  };
  specialRequests: string;
  onSpecialRequestsChange: (value: string) => void;
  onPreferencesChange: (prefs: BookingPreferences) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function PreferencesReviewStep({
  passengerName,
  passengerPreferences,
  accountDefaults,
  specialRequests,
  onSpecialRequestsChange,
  onPreferencesChange,
  onBack,
  onContinue,
}: PreferencesReviewStepProps) {
  // Initialize from passenger preferences, fall back to account defaults, then empty
  const initialRefreshments: RefreshmentPreferences = {
    stillWater: passengerPreferences?.refreshments?.stillWater ?? accountDefaults?.refreshments?.stillWater ?? false,
    sparklingWater: passengerPreferences?.refreshments?.sparklingWater ?? accountDefaults?.refreshments?.sparklingWater ?? false,
    tea: passengerPreferences?.refreshments?.tea ?? accountDefaults?.refreshments?.tea ?? false,
    coffee: passengerPreferences?.refreshments?.coffee ?? accountDefaults?.refreshments?.coffee ?? false,
    other: passengerPreferences?.refreshments?.other ?? accountDefaults?.refreshments?.other ?? '',
  };

  const initialDriverInstructions =
    passengerPreferences?.driverInstructions ?? accountDefaults?.driverInstructions ?? '';

  const [refreshments, setRefreshments] = useState<RefreshmentPreferences>(initialRefreshments);
  const [driverInstructions, setDriverInstructions] = useState(initialDriverInstructions);

  // Notify parent of preferences changes
  useEffect(() => {
    onPreferencesChange({
      refreshments,
      driverInstructions,
    });
  }, [refreshments, driverInstructions, onPreferencesChange]);

  const handleRefreshmentChange = (key: keyof RefreshmentPreferences, value: boolean | string) => {
    setRefreshments(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <section className="pb-28 md:pb-12">
      <div className="container px-4 mx-auto max-w-2xl">
        <div className="bg-card rounded-3xl shadow-deep p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground mb-2">
              Review Preferences
            </h2>
            <p className="text-sm text-muted-foreground">
              Confirm booking preferences for <span className="font-medium">{passengerName}</span>
            </p>
          </div>

          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-sage-light/30 border border-sage-light rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-sage-dark flex-shrink-0 mt-0.5" />
                <div className="text-sm text-navy-light">
                  <p>
                    Changes made here apply <span className="font-medium">for this booking only</span>.
                    The passenger&apos;s saved preferences will remain unchanged.
                  </p>
                </div>
              </div>
            </div>

            {/* Passenger Preferences Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Coffee className="w-5 h-5 text-sage-dark" />
                Passenger Preferences
              </h3>

              {/* Refreshments */}
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Refreshments</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refreshments.stillWater ?? false}
                      onChange={(e) => handleRefreshmentChange('stillWater', e.target.checked)}
                      className="h-4 w-4 text-sage border-sage/30 rounded focus:ring-sage/50"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      <Droplet className="w-4 h-4 text-blue-500" />
                      Still Water
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refreshments.sparklingWater ?? false}
                      onChange={(e) => handleRefreshmentChange('sparklingWater', e.target.checked)}
                      className="h-4 w-4 text-sage border-sage/30 rounded focus:ring-sage/50"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      <Droplet className="w-4 h-4 text-cyan-500" />
                      Sparkling Water
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refreshments.tea ?? false}
                      onChange={(e) => handleRefreshmentChange('tea', e.target.checked)}
                      className="h-4 w-4 text-sage border-sage/30 rounded focus:ring-sage/50"
                    />
                    <span className="text-sm text-foreground">Tea</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refreshments.coffee ?? false}
                      onChange={(e) => handleRefreshmentChange('coffee', e.target.checked)}
                      className="h-4 w-4 text-sage border-sage/30 rounded focus:ring-sage/50"
                    />
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      <Coffee className="w-4 h-4 text-amber-700" />
                      Coffee
                    </span>
                  </label>
                </div>

                <div className="mt-3">
                  <label htmlFor="otherRefreshments" className="block text-sm text-muted-foreground mb-1">
                    Other preferences
                  </label>
                  <input
                    type="text"
                    id="otherRefreshments"
                    value={refreshments.other ?? ''}
                    onChange={(e) => handleRefreshmentChange('other', e.target.value)}
                    placeholder="e.g., Orange juice, snacks..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sage/50 bg-background"
                  />
                </div>
              </div>

              {/* Driver Instructions */}
              <div className="bg-background rounded-xl border border-border p-4">
                <label htmlFor="driverInstructions" className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Driver Instructions
                </label>
                <textarea
                  id="driverInstructions"
                  value={driverInstructions}
                  onChange={(e) => setDriverInstructions(e.target.value)}
                  placeholder="e.g., Please call on arrival, meet at arrivals hall..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-sage/50 bg-background resize-none"
                />
              </div>
            </div>

            {/* Account Defaults Section (for reference) */}
            {accountDefaults && (accountDefaults.refreshments || accountDefaults.driverInstructions) && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Account Defaults <span className="text-xs">(for reference)</span>
                </h3>
                <div className="bg-background/50 rounded-xl border border-border/50 p-4 text-sm text-muted-foreground">
                  {accountDefaults.refreshments && (
                    <div className="mb-2">
                      <span className="font-medium">Default Refreshments: </span>
                      {[
                        accountDefaults.refreshments.stillWater && 'Still Water',
                        accountDefaults.refreshments.sparklingWater && 'Sparkling Water',
                        accountDefaults.refreshments.tea && 'Tea',
                        accountDefaults.refreshments.coffee && 'Coffee',
                        accountDefaults.refreshments.other,
                      ].filter(Boolean).join(', ') || 'None set'}
                    </div>
                  )}
                  {accountDefaults.driverInstructions && (
                    <div>
                      <span className="font-medium">Default Instructions: </span>
                      {accountDefaults.driverInstructions}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Special Requests */}
            <div className="space-y-2">
              <label htmlFor="specialRequests" className="block text-sm font-medium text-foreground">
                Special Requests
              </label>
              <textarea
                id="specialRequests"
                value={specialRequests}
                onChange={(e) => onSpecialRequestsChange(e.target.value)}
                placeholder="Any additional requests for this booking..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This will be included in the booking notes for the driver
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Navigation Buttons */}
      <div className="fixed md:static bottom-0 left-0 right-0 z-40 bg-background border-t md:border-0 border-border p-4 md:p-0 shadow-lg md:shadow-none">
        <div className="container mx-auto max-w-2xl">
          <div className="flex gap-3 md:mt-6">
            <Button
              type="button"
              variant="default"
              size="xl"
              onClick={onBack}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="button"
              variant="hero-golden"
              size="xl"
              onClick={onContinue}
              className="flex-1"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}