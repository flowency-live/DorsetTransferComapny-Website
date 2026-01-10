'use client';

import { useMemo } from 'react';
import { Plane, Train, AlertCircle, CheckCircle } from 'lucide-react';

import { getAirlineFromFlightNumber } from '@/lib/data/airlines';
import { LocationType } from '../lib/types';

export type TransportType = 'airport' | 'train_station' | null;

// IATA flight number validation: 2-letter airline code + 1-4 digit flight number
const IATA_FLIGHT_REGEX = /^[A-Z]{2}\d{1,4}$/i;

export function validateFlightNumber(value: string): boolean {
  if (!value) return true; // Optional field - empty is valid
  return IATA_FLIGHT_REGEX.test(value);
}

interface TransportDetailsProps {
  transportType: TransportType;
  flightNumber: string;
  trainNumber: string;
  onFlightNumberChange: (value: string) => void;
  onTrainNumberChange: (value: string) => void;
  label?: 'Outbound' | 'Return';
}

// Convert LocationType from API to TransportType for this component
export function locationTypeToTransportType(locationType?: LocationType): TransportType {
  if (locationType === 'airport') return 'airport';
  if (locationType === 'train_station') return 'train_station';
  return null;
}

export default function TransportDetails({
  transportType,
  flightNumber,
  trainNumber,
  onFlightNumberChange,
  onTrainNumberChange,
  label,
}: TransportDetailsProps) {
  // Instant local lookup - no API call needed
  const airlineName = useMemo(() => {
    if (!flightNumber || !validateFlightNumber(flightNumber)) return null;
    return getAirlineFromFlightNumber(flightNumber);
  }, [flightNumber]);

  if (!transportType) return null;

  const isAirport = transportType === 'airport';
  const labelPrefix = label ? `${label} ` : '';

  return (
    <div className="bg-card rounded-2xl p-4 shadow-mobile border-2 border-sage-light animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        {isAirport ? (
          <Plane className="w-5 h-5 text-sage-dark flex-shrink-0" />
        ) : (
          <Train className="w-5 h-5 text-sage-dark flex-shrink-0" />
        )}
        <h3 className="text-sm font-semibold text-foreground">
          {labelPrefix}{isAirport ? 'Flight Details' : 'Train Details'}
        </h3>
      </div>

      <div className="space-y-3">
        {isAirport ? (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Flight Number (optional)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => onFlightNumberChange(e.target.value.toUpperCase())}
                placeholder="BA123"
                maxLength={7}
                className={`w-24 px-3 py-3 rounded-xl border focus:outline-none focus:ring-2 bg-background text-foreground text-center font-mono uppercase tracking-wide ${
                  flightNumber && !validateFlightNumber(flightNumber)
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-border focus:ring-sage-dark'
                }`}
              />
              {airlineName && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700 font-medium">{airlineName}</span>
                </div>
              )}
            </div>
            {flightNumber && !validateFlightNumber(flightNumber) && (
              <p className="text-xs text-red-500 mt-1">
                Invalid format (e.g. BA123)
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Train Number / Service (optional)
            </label>
            <input
              type="text"
              value={trainNumber}
              onChange={(e) => onTrainNumberChange(e.target.value)}
              placeholder="e.g. 1A23 or 14:30 from London"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-sm"
            />
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-sage-dark/5 rounded-lg">
          <AlertCircle className="w-4 h-4 text-sage-dark flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {isAirport
              ? 'Your driver will monitor flight arrivals and adjust pickup time if your flight is delayed.'
              : 'Your driver will monitor train arrivals and adjust pickup time if your train is delayed.'}
          </p>
        </div>
      </div>
    </div>
  );
}
