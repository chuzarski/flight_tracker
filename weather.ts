import { fetchWeatherApi } from "openmeteo";

export interface WeatherData {
  current: {
    time: Date;
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
  };
  location: {
    latitude: number;
    longitude: number;
    timezone: string | null;
    timezoneAbbreviation: string | null;
    utcOffsetSeconds: number;
  };
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const params = {
    latitude: [latitude],
    longitude: [longitude],
    current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m",
    temperature_unit: "fahrenheit",
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
      windSpeed: current.variables(2)!.value(),
      windDirection: current.variables(3)!.value(),
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
