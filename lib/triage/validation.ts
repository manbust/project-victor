import { PathogenSurvivalRange } from './types';

/**
 * Validates that humidity is within the valid range (0-100)
 * @param humidity - The humidity value to validate
 * @throws Error if humidity is outside the valid range
 */
export function validateHumidity(humidity: number): void {
  if (humidity < 0 || humidity > 100) {
    throw new Error(`Invalid humidity: ${humidity}. Must be between 0 and 100.`);
  }
}

/**
 * Validates that a pathogen survival range is valid
 * @param range - The survival range to validate
 * @throws Error if the range is invalid
 */
export function validateSurvivalRange(range: PathogenSurvivalRange): void {
  if (range.minHumidity < 0 || range.minHumidity > 100) {
    throw new Error(`Invalid minHumidity: ${range.minHumidity}. Must be between 0 and 100.`);
  }
  if (range.maxHumidity < 0 || range.maxHumidity > 100) {
    throw new Error(`Invalid maxHumidity: ${range.maxHumidity}. Must be between 0 and 100.`);
  }
  if (range.minHumidity > range.maxHumidity) {
    throw new Error(`minHumidity (${range.minHumidity}) cannot exceed maxHumidity (${range.maxHumidity})`);
  }
}
