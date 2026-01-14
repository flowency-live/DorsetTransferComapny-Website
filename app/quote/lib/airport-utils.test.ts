import { describe, it, expect } from 'vitest';
import { consolidateAirportResults, Prediction } from './airport-utils';

describe('consolidateAirportResults', () => {
  it('returns original predictions when not dropoff', () => {
    const preds: Prediction[] = [
      { description: 'Heathrow Terminal 5', place_id: 'p1', locationType: 'airport', airportCode: 'LHR' },
      { description: 'Heathrow Long Stay', place_id: 'p2', locationType: 'airport', airportCode: 'LHR' },
      { description: 'Somewhere Road', place_id: 'p3', locationType: 'standard' },
    ];

    const result = consolidateAirportResults(preds, false);
    expect(result).toEqual(preds);
  });

  it('consolidates multiple airport locations into a single main airport for dropoff', () => {
    const preds: Prediction[] = [
      { description: 'Heathrow Terminal 5', place_id: 'p1', locationType: 'airport', airportCode: 'LHR' },
      { description: 'Heathrow Long Stay Car Park', place_id: 'p2', locationType: 'airport', airportCode: 'LHR' },
      { description: 'London Heathrow Airport (LHR)', place_id: 'p3', locationType: 'airport', airportCode: 'LHR' },
      { description: 'Some Train Station', place_id: 't1', locationType: 'train_station' },
      { description: 'Bournemouth Town Centre', place_id: 'b1', locationType: 'standard' },
    ];

    const result = consolidateAirportResults(preds, true);

    // Should contain only one Heathrow entry (the one with 'airport' in description), plus other non-airport entries
    expect(result.some(r => r.place_id === 'p3')).toBe(true);
    expect(result.filter(r => r.airportCode === 'LHR').length).toBe(1);
    // Ensure non-airport entries remain
    expect(result.some(r => r.place_id === 'b1')).toBe(true);
    expect(result.some(r => r.place_id === 't1')).toBe(true);
  });

  it('handles airport entries without airportCode by grouping by description', () => {
    const preds: Prediction[] = [
      { description: 'Small Airport Terminal', place_id: 's1', locationType: 'airport', airportCode: null },
      { description: 'Small Airport Long Stay', place_id: 's2', locationType: 'airport', airportCode: null },
    ];

    const result = consolidateAirportResults(preds, true);
    expect(result.length).toBe(1);
    expect(result[0].place_id).toBe('s1');
  });
});
