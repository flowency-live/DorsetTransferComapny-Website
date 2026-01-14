export interface Prediction {
  description: string;
  place_id: string;
  locationType?: 'airport' | 'train_station' | 'standard';
  airportCode?: string | null;
}

export function consolidateAirportResults(predictions: Prediction[], isDropoff: boolean): Prediction[] {
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

  airportGroups.forEach((group, code) => {
    // Prefer the item that explicitly contains the word 'airport' in the description
    const main = group.find((p: Prediction) => (p.description || '').toLowerCase().includes('airport')) || group[0];
    consolidated.push(main);
  });

  // For drop-off: return just the main airport, hiding terminals (user can toggle to see all)
  // For pickup: return main airport first, then terminals in order (all visible)
  if (isDropoff) {
    // Preserve original relative ordering as much as possible: airports first (by discovery order), then non-airports
    return [...consolidated, ...nonAirport];
  } else {
    // For pickup: show main airport first, then any terminals from the same groups
    const result: Prediction[] = [];
    const addedPlaceIds = new Set<string>();

    // First add main airports
    for (const main of consolidated) {
      result.push(main);
      addedPlaceIds.add(main.place_id);
    }

    // Then add terminals from airport groups (ordered by group)
    airportGroups.forEach((group) => {
      for (const terminal of group) {
        if (!addedPlaceIds.has(terminal.place_id)) {
          result.push(terminal);
          addedPlaceIds.add(terminal.place_id);
        }
      }
    });

    // Finally add non-airport results
    result.push(...nonAirport);

    return result;
  }
}
