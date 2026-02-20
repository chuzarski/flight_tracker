import { TtlCache } from "@std/cache";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["flight-tracker", "flightaware"]);

/* =========================
   Config
   ========================= */

const AEROAPI_BASE = "https://aeroapi.flightaware.com";
const API_KEY = Deno.env.get("FLIGHTAWARE_API_KEY");

if (!API_KEY) {
  throw new Error("FLIGHTAWARE_API_KEY is not set");
}

const AIRLINE_IDENT_REGEX = /^[A-Z]{2,3}\d{1,4}$/;

/* =========================
   Types
   ========================= */

export type FlightDetails = {
  ident: string;
  origin?: string;
  destination?: string;
  scheduledOut?: string;
  actualOut?: string;
  status?: string;
  operator: string | null;
};

type AeroApiFlight = {
  ident: string;
  operator_icao: string | null;
  origin?: {
    code_iata?: string;
    code_icao?: string;
  };
  destination?: {
    code_iata?: string;
    code_icao?: string;
  };
  scheduled_out?: string;
  actual_out?: string;
  status?: string;
  progress_percent?: number;
};

type AeroApiResponse = {
  flights: AeroApiFlight[];
};

/* =========================
   Cache
   ========================= */

// Cache flight details for 24 hours
const cache = new TtlCache<string, FlightDetails | null>(24 * 60 * 60 * 1000);

// TODO : Handle rate limiting, aero only allows 10 requests per minute
async function fetchFlightDetails(
  ident: string,
): Promise<FlightDetails | null> {
  const now = Temporal.Now.instant();
  const start = now.subtract({ hours: 48 }).round({ smallestUnit: "seconds" });
  const end = now.add({ hours: 48 }).round({ smallestUnit: "seconds" });

  const url = new URL(`/aeroapi/flights/${ident}`, AEROAPI_BASE);
  url.searchParams.set("max_pages", "1");
  url.searchParams.set("start", start.toString());
  url.searchParams.set("end", end.toString());

  const fullURL = url.toString();

  logger.debug("FlightAware fetching details for {ident} at {datetime}", {
    ident,
    url: fullURL,
    startDate: start.toString(),
    endDate: end.toString(),
    datetime: now.toString(),
  });
  const res = await fetch(fullURL, {
    headers: {
      "x-apikey": API_KEY!,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    logger.warn("FlightAware HTTP {status} for {ident}", {
      status: res.status,
      ident,
    });
    return null;
  }

  const data = (await res.json()) as AeroApiResponse;

  if (!data.flights) return null;

  // keep only flights that have >0 or <100 progress percent; this implies the flight is currently active
  const activeFlights = data.flights.filter((flight) =>
    flight.progress_percent !== undefined &&
    flight.progress_percent > 0 &&
    flight.progress_percent < 100
  );

  if (activeFlights.length === 0) {
    return null;
  }

  // If multiple active flights, prefer the one that departed today
  const flight = activeFlights[0];

  return {
    ident: flight.ident,
    operator: flight.operator_icao,
    origin: flight.origin?.code_iata ?? flight.origin?.code_icao,
    destination: flight.destination?.code_iata ?? flight.destination?.code_icao,
    scheduledOut: flight.scheduled_out,
    actualOut: flight.actual_out,
    status: flight.status,
  };
}

/* =========================
   Public API
   ========================= */

export async function resolveFlights(
  flightNumbers: string[],
): Promise<Record<string, FlightDetails | null>> {
  const result: Record<string, FlightDetails | null> = {};
  const unique = [...new Set(flightNumbers)];

  for (const ident of unique) {
    result[ident] = null;

    // Skip non-airline flights
    if (!AIRLINE_IDENT_REGEX.test(ident)) {
      continue;
    }

    // Cache hit
    if (cache.has(ident)) {
      result[ident] = cache.get(ident)!;
      continue;
    }

    // Cache miss → API call
    try {
      const data = await fetchFlightDetails(ident);
      cache.set(ident, data);
      result[ident] = data;
    } catch (err) {
      logger.warn("FlightAware lookup failed for {ident}: {error}", {
        ident,
        error: err,
      });
      cache.set(ident, null);
    }
  }

  return result;
}
