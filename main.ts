import { fetchAirplanes } from "./airplanes.ts";
import { fetchWeather } from "./weather.ts";
import { resolveFlights } from "./flightaware.ts";
import type { Aircraft } from "./airplanes.ts";
import type { WeatherData } from "./weather.ts";
import { publish as publishMqtt } from "./mqtt.ts";
import { equals } from "ramda";
import "./logging.ts";
import { getLogger } from "@logtape/logtape";

const logger = getLogger(["flight-tracker", "main"]);

/**
 * Aircraft with flight details (origin and destination)
 */
export interface AircraftWithFlight extends Aircraft {
  flightDetails: {
    origin?: string;
    destination?: string;
  };
}

// Constants from environment variables
const LATITUDE = parseFloat(Deno.env.get("LATITUDE") || "0");
const LONGITUDE = parseFloat(Deno.env.get("LONGITUDE") || "0");
const AREA_NAUTICAL_MILES = parseInt(
  Deno.env.get("AREA_NAUTICAL_MILES") || "3",
);
const LOOP_INTERVAL_MS = 30000; // 30 seconds
const WEATHER_UPDATE_INTERVAL_MS = 1800000; // 30 minutes

if (LATITUDE === 0 || LONGITUDE === 0) {
  logger.warn(
    "LATITUDE and LONGITUDE environment variables should be set",
  );
}

/**
 * Sleep for a specified duration
 */
function awaitTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main loop - updates airplanes, resolves flights, and fetches weather
 */
async function main(): Promise<void> {
  logger.info("Flight Tracker starting at {latitude}, {longitude}", {
    latitude: LATITUDE,
    longitude: LONGITUDE,
  });
  logger.info("Monitoring area: {area} nautical miles", {
    area: AREA_NAUTICAL_MILES,
  });
  logger.info("Update interval: {interval} seconds", {
    interval: LOOP_INTERVAL_MS / 1000,
  });

  let lastWeatherUpdate = 0;
  let previousAircraft: AircraftWithFlight[] | undefined;
  let previousWeather: WeatherData | undefined;

  while (true) {
    try {
      // Fetch all airplanes in the area
      const aircraft = await fetchAirplanes(
        LATITUDE,
        LONGITUDE,
        AREA_NAUTICAL_MILES,
      );

      // Extract flight numbers and resolve flight details
      const flightNumbers = aircraft
        .map((plane) => plane.flight)
        .filter((flight) => flight && flight.trim() !== "");
      const flights = await resolveFlights(flightNumbers);

      // Merge aircraft with their flight details
      const aircraftWithFlights: AircraftWithFlight[] = aircraft.map((
        plane,
      ) => ({
        ...plane,
        flightDetails: {
          origin: flights[plane.flight]?.origin,
          destination: flights[plane.flight]?.destination,
        },
      }));

      // Only publish aircraft data when it has changed
      if (!equals(aircraftWithFlights, previousAircraft)) {
        await publishMqtt(
          "flight_tracker/aircraft",
          JSON.stringify(aircraftWithFlights),
        );
        previousAircraft = aircraftWithFlights;
      }

      // Fetch weather data every 30 minutes, only publish if changed
      const now = Date.now();
      if (now - lastWeatherUpdate >= WEATHER_UPDATE_INTERVAL_MS) {
        const weather = await fetchWeather(LATITUDE, LONGITUDE);
        lastWeatherUpdate = now;
        if (!equals(weather, previousWeather)) {
          await publishMqtt(
            "flight_tracker/weather",
            JSON.stringify(weather),
          );
          previousWeather = weather;
        }
      }
    } catch (error) {
      logger.error("Error in main loop: {error}", { error });
    }

    // Wait before next iteration
    await awaitTimeout(LOOP_INTERVAL_MS);
  }
}

// Start the main loop
main();
