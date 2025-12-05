/**
 * Pathogen Database Integration Service for Triage Dashboard
 * 
 * Provides pathogen data querying functionality specifically for the triage dashboard,
 * integrating with the existing Supabase client and pathogen data types.
 * 
 * Requirements: 2.2, 2.3
 */

import { getAllPathogens, getPathogenById } from '@/lib/supabase/queries';
import type { Pathogen } from '@/lib/supabase/types';

/**
 * Result type for pathogen data operations
 * Uses discriminated union pattern for type-safe error handling
 */
export type PathogenResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Enhanced pathogen data with computed fields for triage analysis
 */
export interface EnhancedPathogenData extends Pathogen {
  /** Computed threat level based on R0 score and transmission vector */
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Whether this pathogen is considered airborne */
  isAirborne: boolean;
  /** Whether this pathogen requires high humidity for survival */
  requiresHighHumidity: boolean;
}

/**
 * Pathogen query filters for triage analysis
 */
export interface PathogenQueryFilters {
  /** Filter by transmission vector */
  transmissionVector?: 'air' | 'fluid';
  /** Minimum R0 score threshold */
  minR0Score?: number;
  /** Maximum R0 score threshold */
  maxR0Score?: number;
  /** Minimum humidity survival threshold */
  minHumidityThreshold?: number;
  /** Maximum incubation period in days */
  maxIncubationPeriod?: number;
}

/**
 * Fetches all pathogen data for triage dashboard analysis
 * 
 * This function retrieves all pathogens from the database and enhances them
 * with computed fields useful for triage analysis and threat assessment.
 * 
 * @returns Promise resolving to PathogenResult with enhanced pathogen data or error
 * 
 * Requirements:
 * - 2.2: Query pathogen database for relevant pathogen information
 * - 2.3: Handle database connection errors and timeouts gracefully
 * 
 * @example
 * ```typescript
 * const { data, error } = await fetchPathogensForTriage();
 * if (error) {
 *   console.error('Pathogen fetch failed:', error);
 *   // Handle error appropriately
 * } else {
 *   console.log(`Retrieved ${data.length} pathogens for analysis`);
 * }
 * ```
 */
export async function fetchPathogensForTriage(): Promise<PathogenResult<EnhancedPathogenData[]>> {
  try {
    console.log('Fetching pathogen data from Supabase database...');
    
    // Use existing query function to get all pathogens
    const { data: pathogens, error: queryError } = await getAllPathogens();
    
    if (queryError) {
      console.error('Pathogen database query failed:', queryError.message);
      return {
        data: null,
        error: new Error(
          `Failed to retrieve pathogen data: ${queryError.message}`,
          { cause: queryError }
        )
      };
    }
    
    if (!pathogens || pathogens.length === 0) {
      console.warn('No pathogen data found in database');
      return {
        data: [],
        error: null
      };
    }
    
    // Enhance pathogen data with computed fields
    const enhancedPathogens = pathogens.map(enhancePathogenData);
    
    console.log(`Successfully retrieved and enhanced ${enhancedPathogens.length} pathogens`);
    
    return {
      data: enhancedPathogens,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while fetching pathogen data';
    
    console.error('Pathogen data fetch failed:', {
      error: errorMessage
    });
    
    return {
      data: null,
      error: new Error(
        `Unexpected error retrieving pathogen data: ${errorMessage}`,
        { cause: error }
      )
    };
  }
}

/**
 * Fetches a specific pathogen by ID for detailed analysis
 * 
 * @param pathogenId - UUID of the pathogen to retrieve
 * @returns Promise resolving to PathogenResult with enhanced pathogen data or error
 * 
 * Requirements:
 * - 2.2: Query specific pathogen information by ID
 * - 2.3: Handle database connection errors and timeouts gracefully
 */
export async function fetchPathogenById(pathogenId: string): Promise<PathogenResult<EnhancedPathogenData>> {
  try {
    console.log(`Fetching pathogen data for ID: ${pathogenId}`);
    
    // Use existing query function to get pathogen by ID
    const { data: pathogen, error: queryError } = await getPathogenById(pathogenId);
    
    if (queryError) {
      console.error('Pathogen database query failed:', queryError.message);
      return {
        data: null,
        error: new Error(
          `Failed to retrieve pathogen with ID ${pathogenId}: ${queryError.message}`,
          { cause: queryError }
        )
      };
    }
    
    if (!pathogen) {
      return {
        data: null,
        error: new Error(`Pathogen with ID ${pathogenId} not found`)
      };
    }
    
    // Enhance pathogen data with computed fields
    const enhancedPathogen = enhancePathogenData(pathogen);
    
    console.log(`Successfully retrieved pathogen: ${enhancedPathogen.name}`);
    
    return {
      data: enhancedPathogen,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while fetching pathogen data';
    
    console.error('Pathogen data fetch failed:', {
      pathogenId,
      error: errorMessage
    });
    
    return {
      data: null,
      error: new Error(
        `Unexpected error retrieving pathogen with ID ${pathogenId}: ${errorMessage}`,
        { cause: error }
      )
    };
  }
}

/**
 * Filters pathogens based on specified criteria for targeted analysis
 * 
 * @param filters - Criteria to filter pathogens by
 * @returns Promise resolving to PathogenResult with filtered pathogen data or error
 * 
 * Requirements:
 * - 2.2: Query pathogen database with filtering capabilities
 * - 2.3: Handle database connection errors and timeouts gracefully
 */
export async function fetchFilteredPathogens(
  filters: PathogenQueryFilters
): Promise<PathogenResult<EnhancedPathogenData[]>> {
  try {
    console.log('Fetching filtered pathogen data:', filters);
    
    // First get all pathogens
    const { data: allPathogens, error } = await fetchPathogensForTriage();
    
    if (error) {
      return { data: null, error };
    }
    
    if (!allPathogens) {
      return { data: [], error: null };
    }
    
    // Apply filters
    const filteredPathogens = allPathogens.filter(pathogen => {
      // Filter by transmission vector
      if (filters.transmissionVector && pathogen.transmission_vector !== filters.transmissionVector) {
        return false;
      }
      
      // Filter by minimum R0 score
      if (filters.minR0Score !== undefined && pathogen.r0_score < filters.minR0Score) {
        return false;
      }
      
      // Filter by maximum R0 score
      if (filters.maxR0Score !== undefined && pathogen.r0_score > filters.maxR0Score) {
        return false;
      }
      
      // Filter by minimum humidity threshold
      if (filters.minHumidityThreshold !== undefined && 
          pathogen.min_humidity_survival < filters.minHumidityThreshold) {
        return false;
      }
      
      // Filter by maximum incubation period
      if (filters.maxIncubationPeriod !== undefined && 
          pathogen.incubation_period > filters.maxIncubationPeriod) {
        return false;
      }
      
      return true;
    });
    
    console.log(`Filtered ${allPathogens.length} pathogens to ${filteredPathogens.length} matches`);
    
    return {
      data: filteredPathogens,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while filtering pathogen data';
    
    console.error('Pathogen filtering failed:', {
      filters,
      error: errorMessage
    });
    
    return {
      data: null,
      error: new Error(
        `Unexpected error filtering pathogen data: ${errorMessage}`,
        { cause: error }
      )
    };
  }
}

/**
 * Enhances pathogen data with computed fields for triage analysis
 * 
 * @param pathogen - Raw pathogen data from database
 * @returns Enhanced pathogen data with computed fields
 */
function enhancePathogenData(pathogen: Pathogen): EnhancedPathogenData {
  // Compute threat level based on R0 score and transmission vector
  let threatLevel: EnhancedPathogenData['threatLevel'];
  if (pathogen.r0_score >= 10) {
    threatLevel = 'critical';
  } else if (pathogen.r0_score >= 5) {
    threatLevel = 'high';
  } else if (pathogen.r0_score >= 2) {
    threatLevel = 'medium';
  } else {
    threatLevel = 'low';
  }
  
  // Determine if pathogen is airborne
  const isAirborne = pathogen.transmission_vector === 'air';
  
  // Determine if pathogen requires high humidity (>= 60%)
  const requiresHighHumidity = pathogen.min_humidity_survival >= 60;
  
  return {
    ...pathogen,
    threatLevel,
    isAirborne,
    requiresHighHumidity
  };
}

/**
 * Gets pathogen statistics for dashboard overview
 * 
 * @returns Promise resolving to PathogenResult with statistics or error
 */
export async function getPathogenStatistics(): Promise<PathogenResult<{
  totalCount: number;
  airborneCount: number;
  fluidCount: number;
  highThreatCount: number;
  averageR0Score: number;
}>> {
  try {
    const { data: pathogens, error } = await fetchPathogensForTriage();
    
    if (error) {
      return { data: null, error };
    }
    
    if (!pathogens || pathogens.length === 0) {
      return {
        data: {
          totalCount: 0,
          airborneCount: 0,
          fluidCount: 0,
          highThreatCount: 0,
          averageR0Score: 0
        },
        error: null
      };
    }
    
    const stats = {
      totalCount: pathogens.length,
      airborneCount: pathogens.filter(p => p.isAirborne).length,
      fluidCount: pathogens.filter(p => !p.isAirborne).length,
      highThreatCount: pathogens.filter(p => p.threatLevel === 'high' || p.threatLevel === 'critical').length,
      averageR0Score: pathogens.reduce((sum, p) => sum + p.r0_score, 0) / pathogens.length
    };
    
    console.log('Pathogen statistics computed:', stats);
    
    return {
      data: stats,
      error: null
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while computing pathogen statistics';
    
    return {
      data: null,
      error: new Error(
        `Unexpected error computing pathogen statistics: ${errorMessage}`,
        { cause: error }
      )
    };
  }
}

/**
 * Fetches pathogen data with retry mechanism for improved reliability
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param retryDelay - Delay between retries in milliseconds (default: 1000)
 * @returns Promise resolving to PathogenResult with data or error
 * 
 * Requirements:
 * - 2.3: Enhanced error handling with retry mechanism for database operations
 */
export async function fetchPathogensWithRetry(
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<PathogenResult<EnhancedPathogenData[]>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fetchPathogensForTriage();
    
    if (result.data) {
      // Success - return immediately
      if (attempt > 0) {
        console.log(`Pathogen fetch succeeded on attempt ${attempt + 1}`);
      }
      return result;
    }
    
    lastError = result.error;
    
    // Don't retry on certain types of errors (e.g., authentication failures)
    if (result.error?.message.includes('authentication') || 
        result.error?.message.includes('unauthorized')) {
      break;
    }
    
    // Don't delay after the last attempt
    if (attempt < maxRetries) {
      console.log(`Pathogen fetch attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return {
    data: null,
    error: new Error(
      `Pathogen fetch failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`,
      { cause: lastError }
    )
  };
}

/**
 * Error classification for pathogen database failures
 */
export enum PathogenErrorType {
  DATABASE_CONNECTION = 'database_connection',
  AUTHENTICATION = 'authentication',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  DATA_CORRUPTION = 'data_corruption',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  UNKNOWN = 'unknown'
}

/**
 * Classifies pathogen database errors for better user messaging
 * 
 * @param error - Error from pathogen service
 * @returns Classified error type
 */
export function classifyPathogenError(error: Error): PathogenErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return PathogenErrorType.AUTHENTICATION;
  }
  
  if (message.includes('connection') || message.includes('database')) {
    return PathogenErrorType.DATABASE_CONNECTION;
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return PathogenErrorType.NETWORK_ERROR;
  }
  
  if (message.includes('timeout')) {
    return PathogenErrorType.TIMEOUT;
  }
  
  if (message.includes('corrupt') || message.includes('invalid data')) {
    return PathogenErrorType.DATA_CORRUPTION;
  }
  
  if (message.includes('service unavailable') || message.includes('503')) {
    return PathogenErrorType.SERVICE_UNAVAILABLE;
  }
  
  return PathogenErrorType.UNKNOWN;
}

/**
 * Gets user-friendly error message for pathogen database failures
 * 
 * @param error - Error from pathogen service
 * @returns User-friendly error message
 */
export function getPathogenErrorMessage(error: Error): string {
  const errorType = classifyPathogenError(error);
  
  switch (errorType) {
    case PathogenErrorType.AUTHENTICATION:
      return 'Database authentication failed. Please check system configuration.';
    
    case PathogenErrorType.DATABASE_CONNECTION:
      return 'Unable to connect to pathogen database. Please check network connectivity.';
    
    case PathogenErrorType.NETWORK_ERROR:
      return 'Network connection issue. Check your internet connection and try again.';
    
    case PathogenErrorType.TIMEOUT:
      return 'Database request timed out. The system may be experiencing high load.';
    
    case PathogenErrorType.DATA_CORRUPTION:
      return 'Pathogen data appears to be corrupted. Please contact system administrator.';
    
    case PathogenErrorType.SERVICE_UNAVAILABLE:
      return 'Pathogen database is temporarily unavailable. Please try again later.';
    
    case PathogenErrorType.UNKNOWN:
    default:
      return 'Unable to retrieve pathogen data. Please try again or contact support.';
  }
}