/**
 * Tests for Pathogen-to-Plume Parameter Mapping Service
 * 
 * Validates the mapping functions that convert pathogen characteristics
 * and environmental data into plume visualization parameters.
 */

import { describe, it, expect } from 'vitest';
import {
  mapR0ScoreToEmissionRate,
  mapTransmissionVectorToStackHeight,
  incorporateWindData,
  createPathogenToPlumeMapping,
  convertToEnhancedPathogenScore,
  validatePlumeParameters,
  type EnhancedPathogenScore
} from './plume-mapping';
import type { WeatherConditions } from './types';
import type { EnhancedPathogenData } from './pathogen-integration';

describe('mapR0ScoreToEmissionRate', () => {
  it('should map valid R0 scores to emission rates', () => {
    expect(mapR0ScoreToEmissionRate(1.0)).toBeCloseTo(1.73, 1);
    expect(mapR0ScoreToEmissionRate(2.5)).toBeCloseTo(7.83, 1);
    expect(mapR0ScoreToEmissionRate(5.0)).toBeCloseTo(22.40, 1);
    expect(mapR0ScoreToEmissionRate(10.0)).toBeCloseTo(59.95, 1);
  });

  it('should handle edge cases for R0 scores', () => {
    expect(mapR0ScoreToEmissionRate(0)).toBe(0.1); // Minimum emission rate
    expect(mapR0ScoreToEmissionRate(50)).toBe(100.0); // Maximum emission rate (clamped)
  });

  it('should handle invalid R0 scores', () => {
    expect(mapR0ScoreToEmissionRate(-1)).toBe(0.1);
    expect(mapR0ScoreToEmissionRate(NaN)).toBe(0.1);
    expect(mapR0ScoreToEmissionRate(Infinity)).toBe(100.0);
  });
});

describe('mapTransmissionVectorToStackHeight', () => {
  it('should map airborne transmission to high stack height', () => {
    expect(mapTransmissionVectorToStackHeight('air')).toBe(100.0);
  });

  it('should map fluid transmission to ground level', () => {
    expect(mapTransmissionVectorToStackHeight('fluid')).toBe(2.0);
  });

  it('should handle unknown transmission vectors', () => {
    // @ts-expect-error Testing invalid input
    expect(mapTransmissionVectorToStackHeight('unknown')).toBe(2.0);
  });
});

describe('incorporateWindData', () => {
  it('should convert wind speed from km/h to m/s', () => {
    const weather: WeatherConditions = {
      humidity: 60,
      temperature: 20,
      windSpeed: 18, // 18 km/h = 5 m/s
      windDirection: 270
    };

    const result = incorporateWindData(weather);
    expect(result.windSpeed).toBeCloseTo(5.0, 1);
    expect(result.windDirection).toBe(270);
  });

  it('should use defaults when wind data is missing', () => {
    const weather: WeatherConditions = {
      humidity: 60,
      temperature: 20
    };

    const result = incorporateWindData(weather);
    expect(result.windSpeed).toBe(5.0);
    expect(result.windDirection).toBe(270.0);
  });

  it('should handle invalid wind data', () => {
    const weather: WeatherConditions = {
      humidity: 60,
      temperature: 20,
      windSpeed: NaN,
      windDirection: NaN
    };

    const result = incorporateWindData(weather);
    expect(result.windSpeed).toBe(5.0);
    expect(result.windDirection).toBe(270.0);
  });
});

describe('createPathogenToPlumeMapping', () => {
  const mockPathogenScore: EnhancedPathogenScore = {
    pathogenId: 'test-id',
    pathogenName: 'Test Pathogen',
    score: 85,
    isViable: true,
    r0Score: 3.5,
    transmissionVector: 'air',
    incubationPeriod: 7,
    minHumiditySurvival: 30
  };

  const mockWeather: WeatherConditions = {
    humidity: 60,
    temperature: 20,
    windSpeed: 18,
    windDirection: 270
  };

  const sourceLocation: [number, number] = [40.7128, -74.0060];

  it('should create complete plume parameters', () => {
    const result = createPathogenToPlumeMapping(mockPathogenScore, mockWeather, sourceLocation);

    expect(result.sourceY).toBe(40.7128);
    expect(result.sourceX).toBe(-74.0060);
    expect(result.emissionRate).toBeCloseTo(13.16, 1);
    expect(result.stackHeight).toBe(100.0);
    expect(result.windSpeed).toBeCloseTo(5.0, 1);
    expect(result.windDirection).toBe(270);
    expect(result.stabilityClass).toBe('D');
  });

  it('should handle fluid transmission pathogens', () => {
    const fluidPathogen = { ...mockPathogenScore, transmissionVector: 'fluid' as const };
    const result = createPathogenToPlumeMapping(fluidPathogen, mockWeather, sourceLocation);

    expect(result.stackHeight).toBe(2.0);
  });
});

describe('convertToEnhancedPathogenScore', () => {
  it('should convert pathogen data to enhanced score', () => {
    const pathogenData: EnhancedPathogenData = {
      id: 'test-id',
      name: 'Test Pathogen',
      incubation_period: 7,
      transmission_vector: 'air',
      min_humidity_survival: 30,
      r0_score: 3.5,
      threatLevel: 'medium',
      isAirborne: true,
      requiresHighHumidity: false
    };

    const result = convertToEnhancedPathogenScore(pathogenData, 85, true);

    expect(result.pathogenId).toBe('test-id');
    expect(result.pathogenName).toBe('Test Pathogen');
    expect(result.score).toBe(85);
    expect(result.isViable).toBe(true);
    expect(result.r0Score).toBe(3.5);
    expect(result.transmissionVector).toBe('air');
    expect(result.incubationPeriod).toBe(7);
    expect(result.minHumiditySurvival).toBe(30);
  });
});

describe('validatePlumeParameters', () => {
  it('should validate correct plume parameters', () => {
    const validParams = {
      sourceX: -74.0060,
      sourceY: 40.7128,
      emissionRate: 10.0,
      windSpeed: 5.0,
      windDirection: 270,
      stackHeight: 50.0,
      stabilityClass: 'D' as const
    };

    const result = validatePlumeParameters(validParams);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect invalid emission rate', () => {
    const invalidParams = {
      sourceX: -74.0060,
      sourceY: 40.7128,
      emissionRate: -1.0, // Invalid
      windSpeed: 5.0,
      windDirection: 270,
      stackHeight: 50.0,
      stabilityClass: 'D' as const
    };

    const result = validatePlumeParameters(invalidParams);
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Emission rate -1 is below minimum 0.1');
  });

  it('should detect invalid coordinates', () => {
    const invalidParams = {
      sourceX: -200.0, // Invalid longitude
      sourceY: 100.0,  // Invalid latitude
      emissionRate: 10.0,
      windSpeed: 5.0,
      windDirection: 270,
      stackHeight: 50.0,
      stabilityClass: 'D' as const
    };

    const result = validatePlumeParameters(invalidParams);
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Source latitude 100 must be between -90 and 90');
    expect(result.issues).toContain('Source longitude -200 must be between -180 and 180');
  });

  it('should detect invalid wind parameters', () => {
    const invalidParams = {
      sourceX: -74.0060,
      sourceY: 40.7128,
      emissionRate: 10.0,
      windSpeed: -1.0,  // Invalid
      windDirection: 400, // Invalid
      stackHeight: 50.0,
      stabilityClass: 'D' as const
    };

    const result = validatePlumeParameters(invalidParams);
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Wind speed -1 must be positive');
    expect(result.issues).toContain('Wind direction 400 must be between 0 and 359 degrees');
  });
});