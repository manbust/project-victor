/**
 * Gaussian Plume Model Implementation
 * 
 * This module implements the classic Gaussian plume atmospheric dispersion model
 * for calculating contaminant concentrations from point sources.
 * 
 * The Gaussian plume equation:
 * C(x,y,z) = (Q / (2π * u * σy * σz)) * exp(-y² / (2σy²)) * exp(-(z-H)² / (2σz²))
 * 
 * Where:
 * - C: concentration at point (x,y,z) [g/m³]
 * - Q: emission rate [g/s]
 * - u: wind speed [m/s]
 * - σy: horizontal dispersion coefficient [m]
 * - σz: vertical dispersion coefficient [m]
 * - x: downwind distance [m]
 * - y: crosswind distance [m]
 * - z: height above ground [m]
 * - H: effective stack height [m]
 */

import { cartesianToGeographic } from './coordinate-transform';

/**
 * Parameters defining the emission source and atmospheric conditions
 */
export interface PlumeParameters {
  /** Source longitude in decimal degrees */
  sourceX: number;
  /** Source latitude in decimal degrees */
  sourceY: number;
  /** Emission rate in grams per second */
  emissionRate: number;
  /** Wind speed in meters per second (must be > 0) */
  windSpeed: number;
  /** Wind direction in degrees from north (0-360) */
  windDirection: number;
  /** Effective stack height in meters */
  stackHeight: number;
  /** Atmospheric stability class (Pasquill-Gifford classification) */
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

/**
 * A point in the concentration field with both Cartesian and geographic coordinates
 */
export interface ConcentrationPoint {
  /** Downwind distance from source in meters */
  x: number;
  /** Crosswind distance from plume centerline in meters */
  y: number;
  /** Calculated concentration at this point in g/m³ */
  concentration: number;
  /** Geographic latitude in decimal degrees */
  lat: number;
  /** Geographic longitude in decimal degrees */
  lon: number;
}

/**
 * Dispersion coefficients for horizontal and vertical spreading
 */
export interface DispersionCoefficients {
  /** Horizontal dispersion coefficient (σy) in meters */
  sigmaY: number;
  /** Vertical dispersion coefficient (σz) in meters */
  sigmaZ: number;
}

/**
 * Maximum exponent value to prevent overflow in exponential calculations
 * exp(100) ≈ 2.7e43, which is well within JavaScript's number range
 */
const MAX_EXPONENT: number = 100;

/**
 * Minimum concentration threshold below which values are treated as zero
 * This prevents numerical precision issues and improves performance
 */
const MIN_CONCENTRATION_THRESHOLD: number = 1e-12;

/**
 * Cache for memoized dispersion coefficient calculations
 * Key format: `${downwindDistance}-${stabilityClass}`
 */
const dispersionCoefficientsCache = new Map<string, DispersionCoefficients>();

/**
 * Maximum cache size to prevent memory leaks
 */
const MAX_CACHE_SIZE: number = 10000;

/**
 * Briggs rural dispersion coefficient parameters for σy (horizontal dispersion)
 * Based on Pasquill-Gifford stability classes
 */
const SIGMA_Y_COEFFICIENTS: Record<string, { a: number; b: number }> = {
  A: { a: 0.22, b: -0.5 },
  B: { a: 0.16, b: -0.5 },
  C: { a: 0.11, b: -0.5 },
  D: { a: 0.08, b: -0.5 },
  E: { a: 0.06, b: -0.5 },
  F: { a: 0.04, b: -0.5 }
};

/**
 * Briggs rural dispersion coefficient parameters for σz (vertical dispersion)
 * Different formulations for different stability classes
 */
const SIGMA_Z_COEFFICIENTS: Record<string, { a: number; b?: number; c?: number }> = {
  A: { a: 0.20 },
  B: { a: 0.12 },
  C: { a: 0.08, b: 0.0002, c: -0.5 },
  D: { a: 0.06, b: 0.0015, c: -0.5 },
  E: { a: 0.03, b: 0.0003, c: -1 },
  F: { a: 0.016, b: 0.0003, c: -1 }
};

/**
 * Validates plume parameters for physical and mathematical constraints
 * @param params - The plume parameters to validate
 * @throws Error if parameters are invalid
 */
function validatePlumeParameters(params: PlumeParameters): void {
  if (params.windSpeed <= 0) throw new Error('Wind speed must be positive');
  if (params.emissionRate < 0) throw new Error('Emission rate cannot be negative');
}

/**
 * Calculates dispersion coefficients (σy and σz) based on downwind distance
 * and atmospheric stability class using Briggs rural formulas
 * 
 * Uses memoization to cache results for improved performance when calculating
 * multiple points at the same distance and stability class.
 * 
 * @param downwindDistance - Distance downwind from source in meters (must be > 0)
 * @param stabilityClass - Atmospheric stability class (A-F)
 * @returns Dispersion coefficients for horizontal and vertical spreading
 */
export function calculateDispersionCoefficients(
  downwindDistance: number,
  stabilityClass: string
): DispersionCoefficients {
  const roundedDistance = Math.round(downwindDistance * 100) / 100;
  const cacheKey = `${roundedDistance}-${stabilityClass}`;
  
  const cached = dispersionCoefficientsCache.get(cacheKey);
  if (cached) return cached;
  
  const x: number = downwindDistance;
  const sigmaYCoeff = SIGMA_Y_COEFFICIENTS[stabilityClass] || SIGMA_Y_COEFFICIENTS.D;
  const sigmaY: number = sigmaYCoeff.a * x * Math.pow(1 + 0.0001 * x, sigmaYCoeff.b);
  
  const sigmaZCoeff = SIGMA_Z_COEFFICIENTS[stabilityClass] || SIGMA_Z_COEFFICIENTS.D;
  let sigmaZ: number;
  
  if (stabilityClass === 'A' || stabilityClass === 'B') {
    sigmaZ = sigmaZCoeff.a * x;
  } else {
    sigmaZ = sigmaZCoeff.a * x * Math.pow(1 + (sigmaZCoeff.b || 0) * x, sigmaZCoeff.c || 0);
  }
  
  const result = {
    sigmaY: Math.max(sigmaY, 1e-6),
    sigmaZ: Math.max(sigmaZ, 1e-6)
  };
  
  if (dispersionCoefficientsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = dispersionCoefficientsCache.keys().next().value;
    if (firstKey) dispersionCoefficientsCache.delete(firstKey);
  }
  dispersionCoefficientsCache.set(cacheKey, result);
  return result;
}

/**
 * Clears the dispersion coefficients cache
 * Should be called when stability class changes or when memory optimization is needed
 */
export function clearDispersionCoefficientsCache(): void {
  dispersionCoefficientsCache.clear();
}

/**
 * Calculates contaminant concentration at a specific point using the Gaussian plume equation
 * 
 * C(x,y,z) = (Q / (2π * u * σy * σz)) * exp(-y² / (2σy²)) * exp(-(z-H)² / (2σz²))
 * 
 * @param x - Downwind distance from source in meters
 * @param y - Crosswind distance from plume centerline in meters
 * @param z - Height above ground in meters
 * @param params - Plume parameters including emission rate, wind speed, etc.
 * @param coeffs - Dispersion coefficients for this downwind distance
 * @returns Concentration at the specified point in g/m³
 */
export function calculateConcentration(
  x: number,
  y: number,
  z: number,
  params: PlumeParameters,
  coeffs: DispersionCoefficients
): number {
  validatePlumeParameters(params);
  if (params.emissionRate === 0 || x <= 0) return 0;
  
  const Q = params.emissionRate;
  const u = params.windSpeed;
  const H = params.stackHeight;
  const { sigmaY, sigmaZ } = coeffs;
  
  const normalizationFactor = Q / (2 * Math.PI * u * sigmaY * sigmaZ);
  const yTerm = -(y * y) / (2 * sigmaY * sigmaY);
  const horizontalGaussian = Math.exp(Math.max(yTerm, -MAX_EXPONENT));
  const zTerm = -((z - H) * (z - H)) / (2 * sigmaZ * sigmaZ);
  const verticalGaussian = Math.exp(Math.max(zTerm, -MAX_EXPONENT));
  
  const concentration = normalizationFactor * horizontalGaussian * verticalGaussian;
  return concentration < MIN_CONCENTRATION_THRESHOLD ? 0 : concentration;
}

/**
 * Generates a grid of concentration points over a specified domain
 * 
 * Optimized for performance with:
 * - Adaptive concentration thresholding
 * - Early termination for negligible concentrations
 * - Memoized dispersion coefficient calculations
 * 
 * @param params - Plume parameters
 * @param gridResolution - Number of grid points in each direction
 * @param maxDistance - Maximum downwind distance to calculate in meters
 * @param concentrationThreshold - Minimum concentration to include (optional, uses default if not provided)
 * @returns Array of concentration points with both Cartesian and geographic coordinates
 */
export function generateConcentrationGrid(
  params: PlumeParameters,
  gridResolution: number = 50,
  maxDistance: number = 10000
): ConcentrationPoint[] {
  validatePlumeParameters(params);

  const points: ConcentrationPoint[] = [];
  
  // Calculate dispersion at max distance to determine the "cone" width
  const maxCoeffs = calculateDispersionCoefficients(maxDistance, params.stabilityClass);
  // We scan 4 standard deviations (sigmaY) to each side, which covers >99.9% of the plume
  const maxPlumeWidth = maxCoeffs.sigmaY * 4; 

  const deltaX = maxDistance / gridResolution;
  const z = 0; // Ground level

  // Loop Downwind (X)
  for (let i = 1; i <= gridResolution; i++) {
    const x = i * deltaX;
    
    // Calculate Coefficients for this distance
    const coeffs = calculateDispersionCoefficients(x, params.stabilityClass);
    
    // Adaptive Crosswind Scanning:
    // Only scan the width relevant to this specific distance (plus a buffer)
    // This creates a triangular grid shape matching the plume cone
    const currentPlumeWidth = Math.min(coeffs.sigmaY * 4, maxPlumeWidth);
    const deltaY = (currentPlumeWidth * 2) / gridResolution; 

    // Loop Crosswind (Y)
    for (let j = 0; j < gridResolution; j++) {
      // Center the Y scan around 0
      const y = (j - gridResolution / 2) * deltaY;
      
      const concentration = calculateConcentration(x, y, z, params, coeffs);
      
      // Significantly lowered threshold to ensure we capture the "tail" of the plume
      if (concentration > 1e-15) { 
        try {
          const [lat, lon] = cartesianToGeographic({
            x,
            y,
            sourceLatLon: [params.sourceY, params.sourceX],
            windDirection: params.windDirection
          });
          
          points.push({ x, y, concentration, lat, lon });
        } catch {
          continue;
        }
      }
    }
  }
  
  return points;
}