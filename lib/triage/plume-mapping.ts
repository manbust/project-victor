/**
 * Pathogen-to-Plume Parameter Mapping Service
 * 
 * Converts pathogen characteristics and environmental data into plume visualization parameters.
 * Implements the mapping logic required for integrating triage results with Gaussian plume modeling.
 * 
 * Requirements: 4.2, 4.3, 4.4
 */

import { PlumeParameters } from '@/lib/gaussian-plume';
import { PathogenScore, WeatherConditions } from '@/lib/triage/types';
import { TransmissionVector } from '@/lib/supabase/types';
import type { EnhancedPathogenData } from '@/lib/triage/pathogen-integration';

/**
 * Enhanced pathogen score with additional fields needed for plume mapping
 */
export interface EnhancedPathogenScore extends PathogenScore {
  /** R0 score for emission rate calculation */
  r0Score: number;
  /** Transmission vector for stack height mapping */
  transmissionVector: TransmissionVector;
  /** Incubation period in days */
  incubationPeriod: number;
  /** Minimum humidity for survival */
  minHumiditySurvival: number;
}

/**
 * Configuration for pathogen-to-plume parameter mapping
 */
export interface PathogenToPlumeMapping {
  /** Pathogen identifier */
  pathogenId: string;
  /** Emission rate derived from R0 score (g/s) */
  emissionRate: number;
  /** Stack height derived from transmission vector (m) */
  stackHeight: number;
  /** Wind direction from weather data (degrees from N) */
  windDirection: number;
  /** Wind speed from weather data (m/s) */
  windSpeed: number;
}

/**
 * Configuration constants for mapping calculations
 */
const MAPPING_CONFIG = {
  /** Base emission rate multiplier for R0 score conversion */
  R0_TO_EMISSION_MULTIPLIER: 2.5,
  /** Minimum emission rate (g/s) */
  MIN_EMISSION_RATE: 0.1,
  /** Maximum emission rate (g/s) */
  MAX_EMISSION_RATE: 100.0,
  /** Stack height for airborne transmission (m) */
  AIRBORNE_STACK_HEIGHT: 5.0,
  /** Stack height for fluid transmission (m) */
  FLUID_STACK_HEIGHT: 2.0,
  /** Default wind speed when not available (m/s) */
  DEFAULT_WIND_SPEED: 5.0,
  /** Default wind direction when not available (degrees from N) */
  DEFAULT_WIND_DIRECTION: 270.0,
  /** Wind speed conversion factor from km/h to m/s */
  KMH_TO_MS_CONVERSION: 1 / 3.6
};

/**
 * Converts R0 score to emission rate for plume modeling
 * 
 * Uses a logarithmic scaling approach to map R0 scores to emission rates,
 * ensuring that higher R0 scores result in proportionally higher emission rates
 * while maintaining realistic bounds for atmospheric dispersion modeling.
 * 
 * @param r0Score - Basic reproduction number (>= 0)
 * @returns Emission rate in grams per second
 * 
 * Requirements: 4.2 - Map Pathogen R0_Score to Emission Rate
 * 
 * @example
 * ```typescript
 * const emissionRate = mapR0ScoreToEmissionRate(3.5);
 * console.log(emissionRate); // ~8.75 g/s
 * ```
 */
export function mapR0ScoreToEmissionRate(r0Score: number): number {
  // Validate input
  if (typeof r0Score !== 'number' || isNaN(r0Score) || r0Score < 0) {
    console.warn(`Invalid R0 score: ${r0Score}, using minimum emission rate`);
    return MAPPING_CONFIG.MIN_EMISSION_RATE;
  }

  // Calculate emission rate using logarithmic scaling
  // Formula: emissionRate = multiplier * R0 * log(R0 + 1)
  // This provides non-linear scaling that emphasizes higher R0 values
  const rawEmissionRate = MAPPING_CONFIG.R0_TO_EMISSION_MULTIPLIER * r0Score * Math.log(r0Score + 1);
  
  // Clamp to realistic bounds
  const clampedEmissionRate = Math.max(
    MAPPING_CONFIG.MIN_EMISSION_RATE,
    Math.min(MAPPING_CONFIG.MAX_EMISSION_RATE, rawEmissionRate)
  );

  console.log(`Mapped R0 score ${r0Score} to emission rate ${clampedEmissionRate.toFixed(2)} g/s`);
  
  return clampedEmissionRate;
}

/**
 * Maps transmission vector to stack height for plume modeling
 * 
 * Determines the appropriate stack height based on pathogen transmission method:
 * - Airborne pathogens use high stack height to simulate aerial dispersion
 * - Fluid transmission pathogens use ground-level height for surface spread
 * 
 * @param transmissionVector - Method of pathogen transmission
 * @returns Stack height in meters
 * 
 * Requirements: 4.3 - Map Transmission_Vector to Stack Height
 * 
 * @example
 * ```typescript
 * const airborneHeight = mapTransmissionVectorToStackHeight('air');
 * console.log(airborneHeight); // 100.0 m
 * 
 * const fluidHeight = mapTransmissionVectorToStackHeight('fluid');
 * console.log(fluidHeight); // 2.0 m
 * ```
 */
export function mapTransmissionVectorToStackHeight(transmissionVector: TransmissionVector): number {
  switch (transmissionVector) {
    case 'air':
      console.log(`Mapped airborne transmission to stack height ${MAPPING_CONFIG.AIRBORNE_STACK_HEIGHT} m`);
      return MAPPING_CONFIG.AIRBORNE_STACK_HEIGHT;
    
    case 'fluid':
      console.log(`Mapped fluid transmission to stack height ${MAPPING_CONFIG.FLUID_STACK_HEIGHT} m`);
      return MAPPING_CONFIG.FLUID_STACK_HEIGHT;
    
    default:
      console.warn(`Unknown transmission vector: ${transmissionVector}, using fluid transmission height`);
      return MAPPING_CONFIG.FLUID_STACK_HEIGHT;
  }
}

/**
 * Incorporates current wind data into plume parameters
 * 
 * Extracts wind speed and direction from weather conditions and converts them
 * to the appropriate units and format for Gaussian plume modeling.
 * 
 * @param weatherConditions - Current weather data including wind information
 * @returns Object containing wind speed (m/s) and direction (degrees from N)
 * 
 * Requirements: 4.4 - Incorporate current wind data for plume direction
 * 
 * @example
 * ```typescript
 * const weather = { humidity: 60, temperature: 20, windSpeed: 18, windDirection: 270 };
 * const windData = incorporateWindData(weather);
 * console.log(windData); // { windSpeed: 5.0, windDirection: 270 }
 * ```
 */
export function incorporateWindData(weatherConditions: WeatherConditions): {
  windSpeed: number;
  windDirection: number;
} {
  // Extract wind speed and convert from km/h to m/s if available
  let windSpeed = MAPPING_CONFIG.DEFAULT_WIND_SPEED;
  if (weatherConditions.windSpeed !== undefined && !isNaN(weatherConditions.windSpeed)) {
    windSpeed = weatherConditions.windSpeed * MAPPING_CONFIG.KMH_TO_MS_CONVERSION;
  }

  // Extract wind direction or use default
  let windDirection = MAPPING_CONFIG.DEFAULT_WIND_DIRECTION;
  if (weatherConditions.windDirection !== undefined && !isNaN(weatherConditions.windDirection)) {
    windDirection = weatherConditions.windDirection;
  }

  console.log(`Incorporated wind data: speed=${windSpeed.toFixed(1)} m/s, direction=${windDirection}°`);

  return {
    windSpeed,
    windDirection
  };
}

/**
 * Creates complete pathogen-to-plume parameter mapping
 * 
 * Combines all mapping functions to convert pathogen characteristics and
 * environmental conditions into a complete set of plume visualization parameters.
 * 
 * @param pathogenScore - Enhanced pathogen score with R0 and transmission data
 * @param weatherConditions - Current weather conditions
 * @param sourceLocation - Source coordinates [latitude, longitude]
 * @returns Complete plume parameters for visualization
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * @example
 * ```typescript
 * const pathogen = {
 *   pathogenId: 'uuid',
 *   pathogenName: 'Test Pathogen',
 *   score: 85,
 *   isViable: true,
 *   r0Score: 4.2,
 *   transmissionVector: 'air',
 *   incubationPeriod: 7,
 *   minHumiditySurvival: 30
 * };
 * const weather = { humidity: 60, temperature: 20, windSpeed: 18, windDirection: 270 };
 * const location = [40.7128, -74.0060];
 * 
 * const plumeParams = createPathogenToPlumeMapping(pathogen, weather, location);
 * ```
 */
export function createPathogenToPlumeMapping(
  pathogenScore: EnhancedPathogenScore,
  weatherConditions: WeatherConditions,
  sourceLocation: [number, number]
): PlumeParameters {
  console.log(`Creating plume mapping for pathogen: ${pathogenScore.pathogenName}`);

  // Map R0 score to emission rate
  const emissionRate = mapR0ScoreToEmissionRate(pathogenScore.r0Score);

  // Map transmission vector to stack height
  const stackHeight = mapTransmissionVectorToStackHeight(pathogenScore.transmissionVector);

  // Incorporate wind data
  const { windSpeed, windDirection } = incorporateWindData(weatherConditions);

  // Create complete plume parameters
  const plumeParameters: PlumeParameters = {
    sourceX: sourceLocation[1], // longitude
    sourceY: sourceLocation[0], // latitude
    emissionRate: emissionRate,
    windSpeed: windSpeed,
    windDirection: windDirection,
    stackHeight: stackHeight,
    stabilityClass: 'D' // Default to neutral atmospheric conditions
  };

  console.log('Generated plume parameters:', {
    pathogen: pathogenScore.pathogenName,
    emissionRate: plumeParameters.emissionRate,
    stackHeight: plumeParameters.stackHeight,
    windSpeed: plumeParameters.windSpeed,
    windDirection: plumeParameters.windDirection
  });

  return plumeParameters;
}

/**
 * Converts enhanced pathogen data to enhanced pathogen score
 * 
 * Helper function to convert database pathogen records into the format
 * required for plume parameter mapping.
 * 
 * @param pathogenData - Enhanced pathogen data from database
 * @param score - Calculated triage score
 * @param isViable - Whether pathogen is viable in current conditions
 * @returns Enhanced pathogen score for plume mapping
 */
export function convertToEnhancedPathogenScore(
  pathogenData: EnhancedPathogenData,
  score: number,
  isViable: boolean
): EnhancedPathogenScore {
  return {
    pathogenId: pathogenData.id,
    pathogenName: pathogenData.name,
    score: score,
    isViable: isViable,
    r0Score: pathogenData.r0_score,
    transmissionVector: pathogenData.transmission_vector,
    incubationPeriod: pathogenData.incubation_period,
    minHumiditySurvival: pathogenData.min_humidity_survival
  };
}

/**
 * Validates plume parameters for safety and realism
 * 
 * Ensures that generated plume parameters are within acceptable ranges
 * for atmospheric dispersion modeling and visualization.
 * 
 * @param parameters - Plume parameters to validate
 * @returns Validation result with any issues found
 */
export function validatePlumeParameters(parameters: PlumeParameters): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Validate emission rate
  if (parameters.emissionRate < MAPPING_CONFIG.MIN_EMISSION_RATE) {
    issues.push(`Emission rate ${parameters.emissionRate} is below minimum ${MAPPING_CONFIG.MIN_EMISSION_RATE}`);
  }
  if (parameters.emissionRate > MAPPING_CONFIG.MAX_EMISSION_RATE) {
    issues.push(`Emission rate ${parameters.emissionRate} exceeds maximum ${MAPPING_CONFIG.MAX_EMISSION_RATE}`);
  }

  // Validate stack height
  if (parameters.stackHeight < 0) {
    issues.push(`Stack height ${parameters.stackHeight} cannot be negative`);
  }
  if (parameters.stackHeight > 1000) {
    issues.push(`Stack height ${parameters.stackHeight} is unrealistically high (>1000m)`);
  }

  // Validate wind parameters
  if (parameters.windSpeed <= 0) {
    issues.push(`Wind speed ${parameters.windSpeed} must be positive`);
  }
  if (parameters.windDirection < 0 || parameters.windDirection >= 360) {
    issues.push(`Wind direction ${parameters.windDirection} must be between 0 and 359 degrees`);
  }

  // Validate coordinates
  if (parameters.sourceY < -90 || parameters.sourceY > 90) {
    issues.push(`Source latitude ${parameters.sourceY} must be between -90 and 90`);
  }
  if (parameters.sourceX < -180 || parameters.sourceX > 180) {
    issues.push(`Source longitude ${parameters.sourceX} must be between -180 and 180`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}