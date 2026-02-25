# ✈️ Flight Tracker ✈️

A Deno-based service that tracks nearby aircraft and local weather, publishing
updates over MQTT. Designed to drive a
[64x32 RGB LED Matrix](https://www.adafruit.com/product/2278) display from
Adafruit.

## Overview

Flight Tracker monitors the airspace around a set of geographic coordinates
within a configurable nautical mile radius. It runs two independent async loops:

1. **Aircraft scanning loop** (default: every 30 seconds) — Scans for nearby
   aircraft using the free Airplanes.live API to detect planes in the area,
   capturing flight number, aircraft type, altitude, and speed. Resolves flight
   details by looking up detected flight numbers against the FlightAware AeroAPI
   to determine each flight's origin and destination airports. Publishes changes
   via MQTT only when aircraft data has changed.

2. **Weather update loop** (default: every 30 minutes) — Fetches current weather
   for the configured location via the Open-Meteo API (temperature, wind
   speed/direction, relative humidity, precipitation, weather code). Publishes
   changes via MQTT only when weather data has changed.

Both loops run independently and handle errors gracefully without stopping the
service.

### Why two aircraft APIs?

The FlightAware AeroAPI is a paid, rate-limited service. To minimize cost,
aircraft detection is handled by the free Airplanes.live API. FlightAware is
only called to resolve origin/destination for flights that aren't already
cached. Flight details are cached for 24 hours to further reduce API usage.

### APIs Used

| API                                                         | Purpose                                                                                 | Cost                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------- |
| [Airplanes.live](https://api.airplanes.live)                | Detects aircraft near the configured coordinates (flight number, type, altitude, speed) | Free                |
| [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/) | Resolves flight origin and destination airports from flight numbers                     | Paid (rate-limited) |
| [Open-Meteo](https://open-meteo.com/)                       | Fetches current weather conditions (temperature, wind, weather code)                    | Free                |
| MQTT Broker                                                 | Publishes aircraft and weather data for consumption by the display                      | Self-hosted         |

## How to Use

### Prerequisites

- [Deno](https://deno.land/) v2.x+
- An MQTT broker (e.g. [Mosquitto](https://mosquitto.org/))
- A [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/) key

### Environment Variables

| Variable                     | Required | Default              | Description                                                       |
| ---------------------------- | -------- | -------------------- | ----------------------------------------------------------------- |
| `LATITUDE`                   | Yes      | `0`                  | Latitude of the center point to monitor                           |
| `LONGITUDE`                  | Yes      | `0`                  | Longitude of the center point to monitor                          |
| `AREA_NAUTICAL_MILES`        | No       | `3`                  | Radius in nautical miles to scan for aircraft                     |
| `AIRCRAFT_SCAN_MS`           | No       | `30000`              | Aircraft scan interval in milliseconds (30 seconds)               |
| `WEATHER_UPDATE_INTERVAL_MS` | No       | `1800000`            | Weather update interval in milliseconds (30 minutes)              |
| `MQTT_BROKER_URL`            | Yes      | —                    | MQTT broker connection URL (e.g. `mqtt://localhost:1883`)         |
| `FLIGHTAWARE_API_KEY`        | Yes      | —                    | FlightAware AeroAPI key                                           |
| `LOG_LEVEL`                  | No       | `info`               | Log level (`trace`, `debug`, `info`, `warning`, `error`, `fatal`) |
| `LOG_FILE`                   | No       | `flight_tracker.log` | Path to the log file                                              |

### Run Locally

```sh
export LATITUDE=40.7128
export LONGITUDE=-74.0060
export MQTT_BROKER_URL=mqtt://localhost:1883
export FLIGHTAWARE_API_KEY=your_key_here

deno task dev
```

### Run with Docker

Build the image:

```sh
deno task docker:build
```

Run the container:

```sh
docker run -d \
  -e LATITUDE=40.7128 \
  -e LONGITUDE=-74.0060 \
  -e AREA_NAUTICAL_MILES=3 \
  -e MQTT_BROKER_URL=mqtt://your-broker:1883 \
  -e FLIGHTAWARE_API_KEY=your_key_here \
  -e LOG_LEVEL=info \
  flight_tracker:latest
```

### MQTT Topics

| Topic                     | Payload                                                                                               | Update Frequency                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `flight_tracker/aircraft` | JSON array of aircraft with flight details (origin/destination)                                       | Configurable (default: every 30s, only on change)   |
| `flight_tracker/weather`  | JSON object with current weather (temperature, wind, humidity, precipitation, weather condition/code) | Configurable (default: every 30min, only on change) |
