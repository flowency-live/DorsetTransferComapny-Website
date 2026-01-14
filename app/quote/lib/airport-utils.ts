export interface Prediction {
  description: string;
  place_id: string;
  locationType?: 'airport' | 'train_station' | 'standard';
  airportCode?: string | null;
}

export function consolidateAirportResults(predictions: Prediction[], isDropoff: boolean): Prediction[] {
  if (!isDropoff) return predictions;

  const airportGroups = new Map<string, Prediction[]>();
  const nonAirport: Prediction[] = [];

  for (const p of predictions) {
    if (p.locationType === 'airport') {
      // Group by airportCode when available; otherwise try to extract a normalized airport name from description
      let code: string;
      if (p.airportCode) {
        code = p.airportCode;
      } else {
        const desc = (p.description || '').toLowerCase();
        const match = desc.match(/([a-z ]*airport)/);
        code = match ? `unknown:${match[1].trim()}` : `unknown:${desc}`;
      }

      if (!airportGroups.has(code)) airportGroups.set(code, []);
      airportGroups.get(code)!.push(p);
    } else {
      nonAirport.push(p);
    }
  }

  const consolidated: Prediction[] = [];

  for (const [code, group] of airportGroups) {
    // Prefer the item that explicitly contains the word 'airport' in the description
    const main = group.find((p) => (p.description || '').toLowerCase().includes('airport')) || group[0];
    consolidated.push(main);
  }

  // Preserve original relative ordering as much as possible: airports first (by discovery order), then non-airports
  return [...consolidated, ...nonAirport];
}
