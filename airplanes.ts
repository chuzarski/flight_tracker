interface APIResponse {
  // API message
  msg: string;
  // current time milliseconds since epoch
  now: number;
  // total number of airplanes found
  total: number;
  // array of aircraft
  ac: {
    // flight number
    flight: string;
    // aircraft registration number
    r: string;
    // aircraft type/model
    t: string;
    // Altitude in feet (barometric)
    alt_baro: number;
    // ground speed in knots
    gs: number;
  }[];
}

export interface Aircraft {
  /** Flight number */
  flight: string;
  /** Aircraft type/model */
  type: string;
  /** Altitude in feet (barometric) */
  altitude: number;
  /** Ground speed in knots */
  speedKnots: number;
  /** Ground speed in miles per hour */
  speedMph: number;
}

export async function fetchAirplanes(
  latitude: number,
  longitude: number,
  nauticalMiles: number,
): Promise<Aircraft[]> {
  const url = new URL(
    `/v2/point/${latitude}/${longitude}/${nauticalMiles}`,
    "https://api.airplanes.live",
  );
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch airplanes: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json() as APIResponse;

  if (data.total === 0) {
    return [];
  }

  return data.ac.map((ac) => ({
    // For some reason this api will return flight number with leading and trailing whitespace, so we trim it
    flight: ac.flight.trim(),
    type: ac.t,
    altitude: ac.alt_baro,
    speedKnots: ac.gs,
    speedMph: Math.round(ac.gs * 1.15078),
  }));
}
