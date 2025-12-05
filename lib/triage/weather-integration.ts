/**
 * Weather Integration Service for Triage Dashboard
 * 
 * Provides weather data fetching functionality specifically for the triage dashboard,
 * integrating with the existing weather service and handling dashboard-specific requirements.
 * 
 * Requirements: 2.1, 2.3
 */

import { fetchCurrentConditions, type WeatherConditions } from './weather-service';

/**
 * Result type for weather data operations
 * Uses discriminated union pattern for type-safe error handling
 */
export type WeatherResult = {
  data: WeatherConditions | null;
  error: Error | null;
};

/**
 * Fetches weather data for triage dashboard based on map center coordinates
 * 
 * This function integrates with the existing weather service and provides
 * dashboard-specific error handling and logging for triage operations.
 * 
 * @param mapCenter - Array containing [latitude, longitude] coordinates
 * @returns Promise resolving to WeatherResult with data or error
 * 
 * Requirements:
 * - 2.1: Fetch weather data based on current map center coordinates
 * - 2.3: Handle weather API responses and error states gracefully
 * 
 * @example
 * ```typescript
 * const { data, error } = await fetchWeatherForTriage([40.7128, -74.0060]);
 * if (error) {
 *   console.error('Weather fetch failed:', error);
 *   // Handle error appropriately
 * } else {
 *   console.log('Weather data:', data);
 * }
 * ```
 */
export async function fetchWeatherForTriage(
  mapCenter: [number, number]
): Promise<WeatherResult> {
  const [latitude, longitude] = mapCenter;
  
  // Validate coordinates
  if (!isValidCoordinate(latitude, longitude)) {
    return {
      data: null,
      error: new Error(
        `Invalid coordinates provided: latitude=${latitude}, longitude=${longitude}. ` +
        'Latitude must be between -90 and 90, longitude must be between -180 and 180.'
      )
    };
  }

  try {
    console.log(`Fetching weather data for coordinates: ${latitude}, ${longitude}`);
    
    // Use existing weather service to fetch conditions
    const weatherData = await fetchCurrentConditions(latitude, longitude);
    
    console.log('Weather data retrieved successfully:', {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      windDirection: weatherData.windDirection
    });
    
    return {
      data: weatherData,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while fetching weather data';
    
    console.error('Weather data fetch failed:', {
      coordinates: [latitude, longitude],
      error: errorMessage
    });
    
    return {
      data: null,
      error: new Error(
        `Failed to fetch weather data for coordinates [${latitude}, ${longitude}]: ${errorMessage}`,
        { cause: error }
      )
    };
  }
}

/**
 * Validates coordinate values for weather API requests
 * 
 * @param latitude - Latitude value to validate
 * @param longitude - Longitude value to validate
 * @returns true if coordinates are valid, false otherwise
 */
function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Gets weather data with retry mechanism for improved reliability
 * 
 * Attempts to fetch weather data with automatic retry on failure.
 * Useful for handling temporary network issues or API rate limiting.
 * 
 * @param mapCenter - Array containing [latitude, longitude] coordinates
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param retryDelay - Delay between retries in milliseconds (default: 1000)
 * @returns Promise resolving to WeatherResult with data or error
 * 
 * Requirements:
 * - 2.3: Enhanced error handling with retry mechanism
 */
export async function fetchWeatherWithRetry(
  mapCenter: [number, number],
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<WeatherResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fetchWeatherForTriage(mapCenter);
    
    if (result.data) {
      // Success - return immediately
      if (attempt > 0) {
        console.log(`Weather fetch succeeded on attempt ${attempt + 1}`);
      }
      return result;
    }
    
    lastError = result.error;
    
    // Don't retry on validation errors (invalid coordinates)
    if (result.error?.message.includes('Invalid coordinates')) {
      break;
    }
    
    // Don't delay after the last attempt
    if (attempt < maxRetries) {
      console.log(`Weather fetch attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return {
    data: null,
    error: new Error(
      `Weather fetch failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`,
      { cause: lastError }
    )
  };
}

/**
 * Gets weather data with graceful degradation for missing data
 * 
 * Attempts to fetch weather data and provides fallback values if the request fails.
 * This ensures the triage system can continue operating even with network issues.
 * 
 * @param mapCenter - Array containing [latitude, longitude] coordinates
 * @param fallbackWeather - Default weather conditions to use if fetch fails
 * @returns Promise resolving to WeatherResult with data (real or fallback) or error
 * 
 * Requirements:
 * - 2.3: Graceful degradation for missing data
 */
export async function fetchWeatherWithFallback(
  mapCenter: [number, number],
  fallbackWeather?: Partial<WeatherConditions>
): Promise<WeatherResult> {
  const defaultFallback: WeatherConditions = {
    temperature: 20, // 20°C - moderate temperature
    humidity: 60,    // 60% - moderate humidity
    windSpeed: 5,    // 5 m/s - light breeze
    windDirection: 270 // West wind
  };
  
  const fallback: WeatherConditions = {
    ...defaultFallback,
    ...fallbackWeather
  };
  
  try {
    // First try with retry mechanism
    const result = await fetchWeatherWithRetry(mapCenter, 1, 500);
    
    if (result.data) {
      return result;
    }
    
    // If fetch failed, use fallback data
    console.warn('Weather fetch failed, using fallback conditions:', fallback);
    
    return {
      data: fallback,
      error: new Error(
        `Weather data unavailable, using fallback conditions. Original error: ${result.error?.message}`,
        { cause: result.error }
      )
    };
  } catch (error) {
    console.warn('Weather fetch with retry failed, using fallback conditions:', fallback);
    
    return {
      data: fallback,
      error: new Error(
        `Weather service unavailable, using fallback conditions. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      )
    };
  }
}

/**
 * Error classification for weather service failures
 */
export enum WeatherErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_COORDINATES = 'invalid_coordinates',
  API_RATE_LIMIT = 'api_rate_limit',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Classifies weather service errors for better user messaging
 * 
 * @param error - Error from weather service
 * @returns Classified error type
 */
export function classifyWeatherError(error: Error): WeatherErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('invalid coordinates')) {
    return WeatherErrorType.INVALID_COORDINATES;
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return WeatherErrorType.NETWORK_ERROR;
  }
  
  if (message.includes('rate limit') || message.includes('429')) {
    return WeatherErrorType.API_RATE_LIMIT;
  }
  
  if (message.includes('service unavailable') || message.includes('503')) {
    return WeatherErrorType.SERVICE_UNAVAILABLE;
  }
  
  if (message.includes('timeout')) {
    return WeatherErrorType.TIMEOUT;
  }
  
  return WeatherErrorType.UNKNOWN;
}

/**
 * Gets user-friendly error message for weather service failures
 * 
 * @param error - Error from weather service
 * @returns User-friendly error message
 */
export function getWeatherErrorMessage(error: Error): string {
  const errorType = classifyWeatherError(error);
  
  switch (errorType) {
    case WeatherErrorType.INVALID_COORDINATES:
      return 'Invalid location coordinates. Please check the map position.';
    
    case WeatherErrorType.NETWORK_ERROR:
      return 'Network connection issue. Check your internet connection and try again.';
    
    case WeatherErrorType.API_RATE_LIMIT:
      return 'Weather service temporarily unavailable due to high demand. Please wait a moment and try again.';
    
    case WeatherErrorType.SERVICE_UNAVAILABLE:
      return 'Weather service is temporarily unavailable. Using default conditions for analysis.';
    
    case WeatherErrorType.TIMEOUT:
      return 'Weather service request timed out. Using default conditions for analysis.';
    
    case WeatherErrorType.UNKNOWN:
    default:
      return 'Unable to retrieve current weather data. Using default conditions for analysis.';
  }
}