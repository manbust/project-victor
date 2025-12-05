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
  A: { a: 0.22, b: -0.5 },    // Extremely unstable
  B: { a: 0.16, b: -0.5 },    // Moderately unstable
  C: { a: 0.11, b: -0.5 },    // Slightly unstable
  D: { a: 0.08, b: -0.5 },    // Neutral
  E: { a: 0.06, b: -0.5 },    // Slightly stable
  F: { a: 0.04, b: -0.5 }     // Moderately stable
};

/**
 * Briggs rural dispersion coefficient parameters for σz (vertical dispersion)
 * Different formulations for different stability classes
 */
const SIGMA_Z_COEFFICIENTS: Record<string, { a: number; b?: number; c?: number }> = {
  A: { a: 0.20 },                           // σz = 0.20x
  B: { a: 0.12 },                           // σz = 0.12x
  C: { a: 0.08, b: 0.0002, c: -0.5 },      // σz = 0.08x(1 + 0.0002x)^(-0.5)
  D: { a: 0.06, b: 0.0015, c: -0.5 },      // σz = 0.06x(1 + 0.0015x)^(-0.5)
  E: { a: 0.03, b: 0.0003, c: -1 },        // σz = 0.03x(1 + 0.0003x)^(-1)
  F: { a: 0.016, b: 0.0003, c: -1 }        // σz = 0.016x(1 + 0.0003x)^(-1)
};

/**
 * Validates plume parameters for physical and mathematical constraints
 * @param params - The plume parameters to validate
 * @throws Error if parameters are invalid
 */
function validatePlumeParameters(params: PlumeParameters): void {
  if (params.windSpeed <= 0) {
    throw new Error('Wind speed must be positive (> 0 m/s)');
  }
  
  if (params.emissionRate < 0) {
    throw new Error('Emission rate cannot be negative');
  }
  
  if (params.sourceY < -90 || params.sourceY > 90) {
    throw new Error('Source latitude must be between -90 and 90 degrees');
  }
  
  if (params.sourceX < -180 || params.sourceX > 180) {
    throw new Error('Source longitude must be between -180 and 180 degrees');
  }
  
  if (params.stackHeight < 0) {
    throw new Error('Stack height cannot be negative');
  }
  
  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(params.stabilityClass)) {
    throw new Error('Stability class must be A, B, C, D, E, or F');
  }
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
  if (downwindDistance <= 0) {
    throw new Error('Downwind distance must be positive');
  }
  
  if (!SIGMA_Y_COEFFICIENTS[stabilityClass]) {
    throw new Error(`Invalid stability class: ${stabilityClass}`);
  }
  
  // Create cache key - round distance to reduce cache size while maintaining accuracy
  const roundedDistance = Math.round(downwindDistance * 100) / 100; // Round to cm precision
  const cacheKey = `${roundedDistance}-${stabilityClass}`;
  
  // Check cache first
  const cached = dispersionCoefficientsCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Calculate if not in cache
  const x: number = downwindDistance;
  
  // Calculate σy using: σy = a * x * (1 + 0.0001*x)^b
  const sigmaYCoeff = SIGMA_Y_COEFFICIENTS[stabilityClass];
  const sigmaY: number = sigmaYCoeff.a * x * Math.pow(1 + 0.0001 * x, sigmaYCoeff.b);
  
  // Calculate σz using stability-class specific formulas
  const sigmaZCoeff = SIGMA_Z_COEFFICIENTS[stabilityClass];
  let sigmaZ: number;
  
  if (stabilityClass === 'A' || stabilityClass === 'B') {
    // Simple linear relationship: σz = a * x
    sigmaZ = sigmaZCoeff.a * x;
  } else {
    // Power law relationship: σz = a * x * (1 + b*x)^c
    sigmaZ = sigmaZCoeff.a * x * Math.pow(1 + (sigmaZCoeff.b || 0) * x, sigmaZCoeff.c || 0);
  }
  
  const result: DispersionCoefficients = {
    sigmaY: Math.max(sigmaY, 1e-6), // Prevent division by zero
    sigmaZ: Math.max(sigmaZ, 1e-6)  // Prevent division by zero
  };
  
  // Cache the result (with size limit to prevent memory leaks)
  if (dispersionCoefficientsCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO eviction)
    const firstKey = dispersionCoefficientsCache.keys().next().value;
    if (firstKey) {
      dispersionCoefficientsCache.delete(firstKey);
    }
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
  // Validate input parameters
  validatePlumeParameters(params);
  
  // Handle special case: zero emission rate
  if (params.emissionRate === 0) {
    return 0;
  }
  
  // Handle special case: at source location (x = 0)
  if (x <= 0) {
    return 0; // Concentration is undefined at source in Gaussian model
  }
  
  const Q: number = params.emissionRate;
  const u: number = params.windSpeed;
  const H: number = params.stackHeight;
  const sigmaY: number = coeffs.sigmaY;
  const sigmaZ: number = coeffs.sigmaZ;
  
  // Calculate the normalization factor: Q / (2π * u * σy * σz)
  const normalizationFactor: number = Q / (2 * Math.PI * u * sigmaY * sigmaZ);
  
  // Calculate horizontal Gaussian term: exp(-y² / (2σy²))
  const yTerm: number = -(y * y) / (2 * sigmaY * sigmaY);
  const horizontalGaussian: number = Math.exp(Math.max(yTerm, -MAX_EXPONENT));
  
  // Calculate vertical Gaussian term: exp(-(z-H)² / (2σz²))
  const zTerm: number = -((z - H) * (z - H)) / (2 * sigmaZ * sigmaZ);
  const verticalGaussian: number = Math.exp(Math.max(zTerm, -MAX_EXPONENT));
  
  // Calculate final concentration
  const concentration: number = normalizationFactor * horizontalGaussian * verticalGaussian;
  
  // Return zero for negligible concentrations to improve performance
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
  maxDistance: number = 10000,
  concentrationThreshold?: number
): ConcentrationPoint[] {
  validatePlumeParameters(params);
  
  if (gridResolution <= 0) {
    throw new Error('Grid resolution must be positive');
  }
  
  if (maxDistance <= 0) {
    throw new Error('Maximum distance must be positive');
  }
  
  // Use provided threshold or calculate adaptive threshold based on emission rate
  const threshold = concentrationThreshold ?? Math.max(
    MIN_CONCENTRATION_THRESHOLD,
    params.emissionRate * 1e-9 // Adaptive threshold: 1 billionth of emission rate
  );
  
  const points: ConcentrationPoint[] = [];
  const deltaX: number = maxDistance / gridResolution;
  const deltaY: number = (2 * maxDistance) / gridResolution; // Symmetric about centerline
  
  // Ground-level calculation (z = 0)
  const z: number = 0;
  
  // Pre-calculate maximum crosswind distance for early termination
  // Beyond 3*σy, concentration drops to ~1% of centerline value
  const maxCrosswindFactor = 3.0;
  
  for (let i = 1; i <= gridResolution; i++) { // Start from i=1 to avoid x=0
    const x: number = i * deltaX;
    
    // Calculate dispersion coefficients for this downwind distance (memoized)
    const coeffs: DispersionCoefficients = calculateDispersionCoefficients(x, params.stabilityClass);
    
    // Calculate maximum meaningful crosswind distance for this downwind distance
    const maxMeaningfulY = maxCrosswindFactor * coeffs.sigmaY;
    
    // Calculate centerline concentration to check if this row is worth processing
    const centerlineConcentration = calculateConcentration(x, 0, z, params, coeffs);
    
    // Skip entire row if even centerline concentration is below threshold
    if (centerlineConcentration < threshold) {
      continue;
    }
    
    for (let j = 0; j < gridResolution; j++) {
      const y: number = (j - gridResolution / 2) * deltaY;
      
      // Skip points beyond meaningful crosswind distance
      if (Math.abs(y) > maxMeaningfulY) {
        continue;
      }
      
      // Calculate concentration at this point
      const concentration: number = calculateConcentration(x, y, z, params, coeffs);
      
      // Skip points with negligible concentration for performance optimization
      if (concentration > threshold) {
        // Convert Cartesian coordinates to geographic coordinates
        try {
          const [lat, lon] = cartesianToGeographic({
            x,
            y,
            sourceLatLon: [params.sourceY, params.sourceX],
            windDirection: params.windDirection
          });
          
          points.push({
            x,
            y,
            concentration,
            lat,
            lon
          });
        } catch {
          // Skip points that result in invalid geographic coordinates
          // This can happen at extreme distances or near poles
          continue;
        }
      }
    }
  }
  
  return points;
}