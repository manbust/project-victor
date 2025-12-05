/**
 * Environmental Viability Checker for V.I.C.T.O.R. Triage Algorithm
 * 
 * This module determines whether a pathogen can survive in current
 * environmental conditions based on humidity levels.
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { PathogenSurvivalRange } from './types';

/**
 * Validates that a humidity value is within the valid range (0-100).
 * 
 * @param humidity - Humidity percentage to validate
 * @throws {Error} If humidity is outside the valid range (0-100)
 */
export function validateHumidity(humidity: number): void {
  if (humidity < 0 || humidity > 100) {
    throw new Error(`Invalid humidity: ${humidity}. Must be between 0 and 100.`);
  }
}

/**
 * Validates that a pathogen survival range has valid values.
 * 
 * @param range - Pathogen survival range to validate
 * @throws {Error} If range values are invalid or min exceeds max
 */
export function validateSurvivalRange(range: PathogenSurvivalRange): void {
  if (range.minHumidity < 0 || range.minHumidity > 100) {
    throw new Error(`Invalid minHumidity: ${range.minHumidity}. Must be between 0 and 100.`);
  }
  if (range.maxHumidity < 0 || range.maxHumidity > 100) {
    throw new Error(`Invalid maxHumidity: ${range.maxHumidity}. Must be between 0 and 100.`);
  }
  if (range.minHumidity > range.maxHumidity) {
    throw new Error(
      `minHumidity (${range.minHumidity}) cannot exceed maxHumidity (${range.maxHumidity})`
    );
  }
}

/**
 * Determines if a pathogen can survive in the current humidity conditions.
 * 
 * A pathogen is considered viable when the current humidity falls within
 * its survival range (inclusive of boundaries).
 * 
 * Requirements:
 * - 1.1: Returns false when humidity is below minimum survival threshold
 * - 1.2: Returns false when humidity is above maximum survival threshold
 * - 1.3: Returns true when humidity is within survival range
 * 
 * @param humidity - Current humidity percentage (0-100)
 * @param survivalRange - Pathogen's humidity survival range
 * @returns true if pathogen can survive in current humidity, false otherwise
 * @throws {Error} If humidity or survival range values are invalid
 */
export function isPathogenViable(
  humidity: number,
  survivalRange: PathogenSurvivalRange
): boolean {
  // Validate inputs
  validateHumidity(humidity);
  validateSurvivalRange(survivalRange);

  // Check if humidity is within survival range (inclusive)
  // Requirement 1.1: Below minimum threshold -> not viable
  if (humidity < survivalRange.minHumidity) {
    return false;
  }

  // Requirement 1.2: Above maximum threshold -> not viable
  if (humidity > survivalRange.maxHumidity) {
    return false;
  }

  // Requirement 1.3: Within range -> viable
  return true;
}
