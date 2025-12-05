'use client';

import { useState, useEffect } from 'react';
import { PlumeParameters } from '@/lib/gaussian-plume';

interface PlumeParameterControlsProps {
  /** Current plume parameters */
  parameters: PlumeParameters;
  /** Callback when parameters change */
  onParametersChange: (params: PlumeParameters) => void;
  /** Map center coordinates for weather API default */
  mapCenter?: [number, number];
}

interface WeatherData {
  windSpeed: number;
  windDirection: number;
}

/**
 * Fetches current weather data from Open-Meteo API
 * @param lat - Latitude in decimal degrees
 * @param lon - Longitude in decimal degrees
 * @returns Promise with wind speed (m/s) and direction (degrees)
 */
async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`
    );
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    
    return {
      windSpeed: data.current?.wind_speed_10m || 5.0, // Default fallback
      windDirection: data.current?.wind_direction_10m || 270.0 // Default fallback (west wind)
    };
  } catch (error) {
    console.warn('Failed to fetch weather data, using defaults:', error);
    return {
      windSpeed: 5.0,
      windDirection: 270.0
    };
  }
}

/**
 * Parameter control panel for Gaussian plume model configuration
 * Provides inputs for all plume parameters with dark clinical styling
 */
export function PlumeParameterControls({
  parameters,
  onParametersChange,
  mapCenter = [40.7128, -74.0060] // Default to NYC
}: PlumeParameterControlsProps) {
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [weatherFetched, setWeatherFetched] = useState<boolean>(false);

  // Fetch initial weather data when component mounts or map center changes
  useEffect(() => {
    if (!weatherFetched) {
      const fetchWeather = async () => {
        setIsLoadingWeather(true);
        try {
          const weather = await fetchWeatherData(mapCenter[0], mapCenter[1]);
          onParametersChange({
            ...parameters,
            windSpeed: weather.windSpeed,
            windDirection: weather.windDirection
          });
          setWeatherFetched(true);
        } finally {
          setIsLoadingWeather(false);
        }
      };
      
      fetchWeather();
    }
  }, [mapCenter, weatherFetched, parameters, onParametersChange]);

  /**
   * Updates a specific parameter and triggers the change callback
   */
  const updateParameter = <K extends keyof PlumeParameters>(
    key: K,
    value: PlumeParameters[K]
  ): void => {
    onParametersChange({
      ...parameters,
      [key]: value
    });
  };

  /**
   * Handles numeric input changes with validation
   */
  const handleNumericChange = (
    key: keyof PlumeParameters,
    value: string,
    min?: number,
    max?: number
  ): void => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      let clampedValue = numValue;
      if (min !== undefined) clampedValue = Math.max(min, clampedValue);
      if (max !== undefined) clampedValue = Math.min(max, clampedValue);
      updateParameter(key, clampedValue as PlumeParameters[typeof key]);
    }
  };

  return (
    <div className="bg-black border border-red-500/60 p-6 space-y-6 font-mono">
      <div className="border-b border-yellow-500/60 pb-4">
        <h2 className="text-yellow-500 text-lg font-bold tracking-wide">
          PLUME PARAMETERS
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Configure emission source and atmospheric conditions
        </p>
      </div>

      {/* Source Location */}
      <div className="space-y-4">
        <h3 className="text-red-500 text-sm font-bold tracking-wider">
          SOURCE LOCATION
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2">
              LATITUDE (°)
            </label>
            <input
              type="number"
              value={parameters.sourceY}
              onChange={(e) => handleNumericChange('sourceY', e.target.value, -90, 90)}
              step="0.000001"
              min="-90"
              max="90"
              className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
              placeholder="40.712800"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2">
              LONGITUDE (°)
            </label>
            <input
              type="number"
              value={parameters.sourceX}
              onChange={(e) => handleNumericChange('sourceX', e.target.value, -180, 180)}
              step="0.000001"
              min="-180"
              max="180"
              className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
              placeholder="-74.006000"
            />
          </div>
        </div>
      </div>

      {/* Emission Parameters */}
      <div className="space-y-4">
        <h3 className="text-red-500 text-sm font-bold tracking-wider">
          EMISSION PARAMETERS
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2">
              EMISSION RATE (g/s)
            </label>
            <input
              type="number"
              value={parameters.emissionRate}
              onChange={(e) => handleNumericChange('emissionRate', e.target.value, 0)}
              step="0.1"
              min="0"
              className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
              placeholder="10.0"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2">
              STACK HEIGHT (m)
            </label>
            <input
              type="number"
              value={parameters.stackHeight}
              onChange={(e) => handleNumericChange('stackHeight', e.target.value, 0)}
              step="1"
              min="0"
              className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
              placeholder="50"
            />
          </div>
        </div>
      </div>

      {/* Atmospheric Conditions */}
      <div className="space-y-4">
        <h3 className="text-red-500 text-sm font-bold tracking-wider">
          ATMOSPHERIC CONDITIONS
          {isLoadingWeather && (
            <span className="text-yellow-500 text-xs ml-2">[LOADING WEATHER...]</span>
          )}
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2">
              WIND SPEED (m/s)
            </label>
            <input
              type="number"
              value={parameters.windSpeed}
              onChange={(e) => handleNumericChange('windSpeed', e.target.value, 0.1)}
              step="0.1"
              min="0.1"
              className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
              placeholder="5.0"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs font-bold mb-2">
              WIND DIRECTION (° from N)
            </label>
            <input
              type="number"
              value={parameters.windDirection}
              onChange={(e) => handleNumericChange('windDirection', e.target.value, 0, 360)}
              step="1"
              min="0"
              max="360"
              className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
              placeholder="270"
            />
          </div>
        </div>
      </div>

      {/* Stability Class */}
      <div className="space-y-4">
        <h3 className="text-red-500 text-sm font-bold tracking-wider">
          ATMOSPHERIC STABILITY
        </h3>
        
        <div>
          <label className="block text-gray-300 text-xs font-bold mb-2">
            PASQUILL-GIFFORD CLASS
          </label>
          <select
            value={parameters.stabilityClass}
            onChange={(e) => updateParameter('stabilityClass', e.target.value as PlumeParameters['stabilityClass'])}
            className="w-full bg-black border border-gray-600 text-white font-mono text-sm px-3 py-2 focus:border-yellow-500 focus:outline-none"
          >
            <option value="A">A - Extremely Unstable (Strong heating)</option>
            <option value="B">B - Moderately Unstable</option>
            <option value="C">C - Slightly Unstable</option>
            <option value="D">D - Neutral (Overcast/Moderate wind)</option>
            <option value="E">E - Slightly Stable (Light wind, clear night)</option>
            <option value="F">F - Moderately Stable (Clear night, calm)</option>
          </select>
        </div>
      </div>

      {/* Status Information */}
      <div className="border-t border-gray-600 pt-4">
        <div className="text-xs text-gray-400 space-y-1">
          <div>
            STATUS: <span className="text-green-500">PARAMETERS CONFIGURED</span>
          </div>
          <div>
            WEATHER: <span className="text-yellow-500">
              {weatherFetched ? 'LIVE DATA' : 'DEFAULT VALUES'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}