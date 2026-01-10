/**
 * IATA airline code to name lookup
 * Covers major airlines operating in UK/Europe
 * Source: IATA official airline codes
 */

export const AIRLINE_CODES: Record<string, string> = {
  // UK Airlines
  'BA': 'British Airways',
  'EZY': 'easyJet',
  'U2': 'easyJet',
  'FR': 'Ryanair',
  'RK': 'Ryanair UK',
  'VS': 'Virgin Atlantic',
  'LS': 'Jet2',
  'MT': 'Thomas Cook',
  'BY': 'TUI Airways',
  'ZT': 'Titan Airways',
  'EI': 'Aer Lingus',
  'BE': 'Flybe',
  'LM': 'Loganair',
  'T3': 'Eastern Airways',

  // European Major Carriers
  'AF': 'Air France',
  'KL': 'KLM',
  'LH': 'Lufthansa',
  'LX': 'Swiss',
  'OS': 'Austrian Airlines',
  'SN': 'Brussels Airlines',
  'AZ': 'ITA Airways',
  'IB': 'Iberia',
  'VY': 'Vueling',
  'UX': 'Air Europa',
  'TP': 'TAP Portugal',
  'SK': 'SAS',
  'AY': 'Finnair',
  'DY': 'Norwegian',
  'D8': 'Norwegian Air Sweden',
  'W6': 'Wizz Air',
  'PC': 'Pegasus Airlines',
  'TK': 'Turkish Airlines',
  'A3': 'Aegean Airlines',
  'RO': 'TAROM',
  'JU': 'Air Serbia',
  'OU': 'Croatia Airlines',
  'LO': 'LOT Polish',
  'OK': 'Czech Airlines',
  'BT': 'airBaltic',

  // North American
  'AA': 'American Airlines',
  'DL': 'Delta',
  'UA': 'United Airlines',
  'WN': 'Southwest',
  'B6': 'JetBlue',
  'AS': 'Alaska Airlines',
  'AC': 'Air Canada',
  'WS': 'WestJet',
  'TS': 'Air Transat',

  // Middle East
  'EK': 'Emirates',
  'QR': 'Qatar Airways',
  'EY': 'Etihad Airways',
  'GF': 'Gulf Air',
  'WY': 'Oman Air',
  'SV': 'Saudia',
  'MS': 'EgyptAir',
  'RJ': 'Royal Jordanian',
  'ME': 'Middle East Airlines',
  'FZ': 'flydubai',

  // Asia Pacific
  'SQ': 'Singapore Airlines',
  'CX': 'Cathay Pacific',
  'QF': 'Qantas',
  'NZ': 'Air New Zealand',
  'JL': 'Japan Airlines',
  'NH': 'ANA',
  'OZ': 'Asiana Airlines',
  'KE': 'Korean Air',
  'CI': 'China Airlines',
  'BR': 'EVA Air',
  'TG': 'Thai Airways',
  'MH': 'Malaysia Airlines',
  'GA': 'Garuda Indonesia',
  'PR': 'Philippine Airlines',
  'VN': 'Vietnam Airlines',
  'AI': 'Air India',
  '6E': 'IndiGo',
  'UK': 'Vistara',
  'CZ': 'China Southern',
  'MU': 'China Eastern',
  'CA': 'Air China',
  'HU': 'Hainan Airlines',

  // Africa
  'ET': 'Ethiopian Airlines',
  'SA': 'South African Airways',
  'KQ': 'Kenya Airways',
  'AT': 'Royal Air Maroc',

  // Latin America
  'LA': 'LATAM',
  'AV': 'Avianca',
  'CM': 'Copa Airlines',
  'AM': 'Aeromexico',
  'G3': 'GOL',
  'AR': 'Aerolineas Argentinas',
};

/**
 * Look up airline name from IATA code
 * @param iataCode 2-letter IATA airline code (e.g., "BA")
 * @returns Airline name or null if not found
 */
export function getAirlineName(iataCode: string): string | null {
  if (!iataCode || iataCode.length < 2) return null;
  const code = iataCode.toUpperCase().substring(0, 2);
  return AIRLINE_CODES[code] || null;
}

/**
 * Extract airline code from flight number
 * @param flightNumber Full flight number (e.g., "BA123")
 * @returns 2-letter airline code or null
 */
export function extractAirlineCode(flightNumber: string): string | null {
  if (!flightNumber || flightNumber.length < 3) return null;
  const match = flightNumber.match(/^([A-Z]{2})/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Look up airline name from flight number
 * @param flightNumber Full flight number (e.g., "BA123")
 * @returns Airline name or null if not found
 */
export function getAirlineFromFlightNumber(flightNumber: string): string | null {
  const code = extractAirlineCode(flightNumber);
  return code ? getAirlineName(code) : null;
}
