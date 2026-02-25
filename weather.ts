import { fetchWeatherApi } from "openmeteo";

export interface WeatherData {
  current: {
    /**
     * The time of the weather data, adjusted for the location's UTC offset.
     */
    time: Date;
    /**
     * The current temperature in Fahrenheit.
     */
    temperature: number;
    /**
     * The WMO weather code representing the current weather condition, which can be mapped to a human-readable string using the getWeatherCondition function.
     */
    weatherCode: number;
    /**
     * The current weather condition as a human-readable string.
     */
    weatherCondition: string;
    /**
     * The current wind speed in miles per hour.
     */
    windSpeed: number;
    /**
     * The current wind direction in degrees, which can be converted to a compass direction using the getCompassDirection function.
     */
    windDirection: number;
    /**
     * The current wind direction as a compass heading.
     */
    windDirectionHeading: string;
    /**
     * The current relative humidity as a percentage.
     */
    relativeHumidity: number;
    /**
     * The current precipitation in inches.
     */
    precipitation: number;
  };
  location: {
    latitude: number;
    longitude: number;
    timezone: string | null;
    timezoneAbbreviation: string | null;
    utcOffsetSeconds: number;
  };
}

const WMO_CONDITION_MAP = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Violent showers",
  85: "Light snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm hail",
  99: "Heavy thunderstorm",
} as const;

const COMPASS_DIRECTIONS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

/**
 * Converts degrees to the corresponding compass direction.
 * @param degrees - The wind direction in degrees.
 * @returns The compass direction as a string.
 */
export const getCompassDirection = (degrees: number): string => {
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS_DIRECTIONS[index];
};

/**
 * Converts WMO weather code to a human-readable condition string.
 * @param code - The WMO weather code.
 * @returns The corresponding weather condition as a string.
 */
export const getWeatherCondition = (code: number): string =>
  code in WMO_CONDITION_MAP
    ? WMO_CONDITION_MAP[code as keyof typeof WMO_CONDITION_MAP]
    : "Unknown";

export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const params = {
    latitude: [latitude],
    longitude: [longitude],
    current: [
      "temperature_2m",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "relative_humidity_2m",
      "precipitation",
    ],
    temperature_unit: "fahrenheit",
    windspeed_unit: "mph",
  };

  const url = "https://api.open-meteo.com/v1/forecast";
  const responses = await fetchWeatherApi(url, params);

  const response = responses[0];

  // Get location attributes
  const utcOffsetSeconds = response.utcOffsetSeconds();
  const timezone = response.timezone();
  const timezoneAbbreviation = response.timezoneAbbreviation();
  const lat = response.latitude();
  const lon = response.longitude();

  const current = response.current()!;

  return {
    current: {
      time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
      temperature: current.variables(0)!.value(),
      weatherCode: current.variables(1)!.value(),
      weatherCondition: getWeatherCondition(current.variables(1)!.value()),
      windSpeed: current.variables(2)!.value(),
      windDirection: current.variables(3)!.value(),
      windDirectionHeading: getCompassDirection(current.variables(3)!.value()),
      relativeHumidity: current.variables(4)!.value(),
      precipitation: current.variables(5)!.value(),
    },
    location: {
      latitude: lat,
      longitude: lon,
      timezone: timezone,
      timezoneAbbreviation: timezoneAbbreviation,
      utcOffsetSeconds: utcOffsetSeconds,
    },
  };
}
