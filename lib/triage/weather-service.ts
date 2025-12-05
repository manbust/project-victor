/**
 * Weather data fetching service for the VICTOR System
 * Integrates with Open-Meteo API for real-time weather conditions
 */

/**
 * Weather conditions interface for epidemiological calculations
 */
export interface WeatherConditions {
  /** Relative humidity percentage (0-100) */
  humidity: number;
  
  /** Temperature in Celsius */
  temperature: number;
  
  /** Wind speed in km/h */
  windSpeed?: number;
  
  /** Wind direction in degrees */
  windDirection?: number;
}

/**
 * Raw response structure from Open-Meteo API
 */
interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
}

/**
 * Default fallback weather conditions when API fails
 * Conservative values for safety-critical operations
 */
const DEFAULT_CONDITIONS: WeatherConditions = {
  humidity: 50,
  temperature: 20,
  windSpeed: 10,
  windDirection: 0,
};

/**
 * Fetches current weather conditions from Open-Meteo API
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns Weather conditions or default values on failure
 */
export async function fetchCurrentConditions(
  lat: number,
  lon: number
): Promise<WeatherConditions> {
  try {
    // Construct Open-Meteo API URL
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m');
    
    // Fetch weather data
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
      return DEFAULT_CONDITIONS;
    }
    
    const data: OpenMeteoResponse = await response.json();
    
    // Normalize API response to WeatherConditions interface
    const conditions: WeatherConditions = {
      humidity: data.current.relative_humidity_2m,
      temperature: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
    };
    
    return conditions;
  } catch (error) {
    // Log error and return fallback conditions for safety-critical operations
    console.error('Failed to fetch weather conditions:', error);
    return DEFAULT_CONDITIONS;
  }
}
