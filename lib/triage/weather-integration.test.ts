/**
 * Tests for Weather Integration Service
 * 
 * Tests the weather data fetching functionality for the triage dashboard,
 * including coordinate validation, error handling, and retry mechanisms.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWeatherForTriage, fetchWeatherWithRetry } from './weather-integration';
import * as weatherService from './weather-service';

// Mock the weather service
vi.mock('./weather-service');

describe('Weather Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('fetchWeatherForTriage', () => {
    it('should fetch weather data successfully with valid coordinates', async () => {
      const mockWeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180
      };

      vi.mocked(weatherService.fetchCurrentConditions).mockResolvedValue(mockWeatherData);

      const result = await fetchWeatherForTriage([40.7128, -74.0060]);

      expect(result.data).toEqual(mockWeatherData);
      expect(result.error).toBeNull();
      expect(weatherService.fetchCurrentConditions).toHaveBeenCalledWith(40.7128, -74.0060);
    });

    it('should reject invalid latitude coordinates', async () => {
      const result = await fetchWeatherForTriage([91, -74.0060]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Invalid coordinates');
      expect(result.error?.message).toContain('latitude=91');
    });

    it('should reject invalid longitude coordinates', async () => {
      const result = await fetchWeatherForTriage([40.7128, 181]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Invalid coordinates');
      expect(result.error?.message).toContain('longitude=181');
    });

    it('should reject NaN coordinates', async () => {
      const result = await fetchWeatherForTriage([NaN, -74.0060]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Invalid coordinates');
    });

    it('should handle weather service errors gracefully', async () => {
      const mockError = new Error('API rate limit exceeded');
      vi.mocked(weatherService.fetchCurrentConditions).mockRejectedValue(mockError);

      const result = await fetchWeatherForTriage([40.7128, -74.0060]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to fetch weather data');
      expect(result.error?.message).toContain('API rate limit exceeded');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(weatherService.fetchCurrentConditions).mockRejectedValue('String error');

      const result = await fetchWeatherForTriage([40.7128, -74.0060]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Unknown error occurred');
    });

    it('should log successful weather data retrieval', async () => {
      const mockWeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180
      };

      vi.mocked(weatherService.fetchCurrentConditions).mockResolvedValue(mockWeatherData);

      await fetchWeatherForTriage([40.7128, -74.0060]);

      expect(console.log).toHaveBeenCalledWith(
        'Fetching weather data for coordinates: 40.7128, -74.006'
      );
      expect(console.log).toHaveBeenCalledWith(
        'Weather data retrieved successfully:',
        expect.objectContaining({
          temperature: 25,
          humidity: 60,
          windSpeed: 10,
          windDirection: 180
        })
      );
    });

    it('should log errors when weather fetch fails', async () => {
      const mockError = new Error('Network timeout');
      vi.mocked(weatherService.fetchCurrentConditions).mockRejectedValue(mockError);

      await fetchWeatherForTriage([40.7128, -74.0060]);

      expect(console.error).toHaveBeenCalledWith(
        'Weather data fetch failed:',
        expect.objectContaining({
          coordinates: [40.7128, -74.0060],
          error: 'Network timeout'
        })
      );
    });
  });

  describe('fetchWeatherWithRetry', () => {
    it('should return data on first successful attempt', async () => {
      const mockWeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180
      };

      vi.mocked(weatherService.fetchCurrentConditions).mockResolvedValue(mockWeatherData);

      const result = await fetchWeatherWithRetry([40.7128, -74.0060]);

      expect(result.data).toEqual(mockWeatherData);
      expect(result.error).toBeNull();
      expect(weatherService.fetchCurrentConditions).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockWeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180
      };

      vi.mocked(weatherService.fetchCurrentConditions)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockWeatherData);

      const result = await fetchWeatherWithRetry([40.7128, -74.0060], 2, 10);

      expect(result.data).toEqual(mockWeatherData);
      expect(result.error).toBeNull();
      expect(weatherService.fetchCurrentConditions).toHaveBeenCalledTimes(2);
    });

    it('should not retry on coordinate validation errors', async () => {
      const result = await fetchWeatherWithRetry([91, -74.0060], 2, 10);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Invalid coordinates');
      expect(weatherService.fetchCurrentConditions).not.toHaveBeenCalled();
    });

    it('should fail after exhausting all retry attempts', async () => {
      vi.mocked(weatherService.fetchCurrentConditions)
        .mockRejectedValue(new Error('Persistent failure'));

      const result = await fetchWeatherWithRetry([40.7128, -74.0060], 1, 10);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('failed after 2 attempts');
      expect(result.error?.message).toContain('Persistent failure');
      expect(weatherService.fetchCurrentConditions).toHaveBeenCalledTimes(2);
    });

    it('should use default retry parameters', async () => {
      vi.mocked(weatherService.fetchCurrentConditions)
        .mockRejectedValue(new Error('Always fails'));

      const result = await fetchWeatherWithRetry([40.7128, -74.0060]);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('failed after 3 attempts');
      expect(weatherService.fetchCurrentConditions).toHaveBeenCalledTimes(3);
    });
  });

  describe('coordinate validation edge cases', () => {
    it('should accept boundary latitude values', async () => {
      const mockWeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180
      };

      vi.mocked(weatherService.fetchCurrentConditions).mockResolvedValue(mockWeatherData);

      // Test exact boundaries
      const result1 = await fetchWeatherForTriage([90, 0]);
      const result2 = await fetchWeatherForTriage([-90, 0]);

      expect(result1.data).toEqual(mockWeatherData);
      expect(result1.error).toBeNull();
      expect(result2.data).toEqual(mockWeatherData);
      expect(result2.error).toBeNull();
    });

    it('should accept boundary longitude values', async () => {
      const mockWeatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        windDirection: 180
      };

      vi.mocked(weatherService.fetchCurrentConditions).mockResolvedValue(mockWeatherData);

      // Test exact boundaries
      const result1 = await fetchWeatherForTriage([0, 180]);
      const result2 = await fetchWeatherForTriage([0, -180]);

      expect(result1.data).toEqual(mockWeatherData);
      expect(result1.error).toBeNull();
      expect(result2.data).toEqual(mockWeatherData);
      expect(result2.error).toBeNull();
    });
  });
});