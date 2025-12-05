/**
 * Database query functions for the VICTOR System
 * Provides type-safe CRUD operations for pathogen data
 * 
 * All functions return error objects instead of throwing exceptions,
 * allowing callers to handle errors gracefully without crashing the application.
 * 
 * Requirements: 4.1, 4.3, 4.4
 */

import { getClient } from './client';
import type { Pathogen, PathogenInsert } from './types';

/**
 * Result type for database operations
 * Uses discriminated union pattern for type-safe error handling
 */
type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

/**
 * Retrieves all pathogen records from the database
 * 
 * Returns strongly-typed results with all pathogen fields.
 * Errors are returned in the result object rather than thrown,
 * allowing the caller to decide how to handle failures.
 * 
 * @returns {Promise<QueryResult<Pathogen[]>>} Result object containing either:
 *   - data: Array of all pathogen records (or empty array if none exist)
 *   - error: Error object if the query failed
 * 
 * @example
 * ```typescript
 * const { data, error } = await getAllPathogens();
 * if (error) {
 *   console.error('Failed to fetch pathogens:', error);
 *   return <ErrorDisplay message="Unable to load pathogen data" />;
 * }
 * // data is Pathogen[] and guaranteed to be non-null here
 * return <PathogenList pathogens={data} />;
 * ```
 * 
 * Requirements:
 * - 4.1: Provides function to retrieve all pathogens from database
 * - 4.3: Returns strongly-typed results matching database schema
 * - 4.4: Returns error object without crashing on query failure
 */
export async function getAllPathogens(): Promise<QueryResult<Pathogen[]>> {
  try {
    const supabase = getClient();
    
    // Query all pathogens, ordered by name for consistent results
    const { data, error: supabaseError } = await supabase
      .from('pathogens')
      .select('*')
      .order('name', { ascending: true });

    // Handle Supabase-specific errors
    if (supabaseError) {
      return {
        data: null,
        error: new Error(
          `Failed to retrieve pathogens: ${supabaseError.message}`,
          { cause: supabaseError }
        ),

      };
    }

    // Return successful result with data (empty array if no records)
    return {
      data: data ?? [],
      error: null,
    };
  } catch (error) {
    // Handle unexpected errors (network failures, client initialization, etc.)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while fetching pathogens';
    
    return {
      data: null,
      error: new Error(
        `Unexpected error retrieving pathogens: ${errorMessage}`,
        { cause: error }
      ),
    };
  }
}

/**
 * Retrieves a single pathogen record by its unique identifier
 * 
 * Returns strongly-typed result with the pathogen data or null if not found.
 * Errors are returned in the result object rather than thrown,
 * allowing the caller to decide how to handle failures.
 * 
 * @param {string} id - UUID string of the pathogen to retrieve
 * @returns {Promise<QueryResult<Pathogen>>} Result object containing either:
 *   - data: Single pathogen record, or null if not found
 *   - error: Error object if the query failed
 * 
 * @example
 * ```typescript
 * const { data, error } = await getPathogenById('123e4567-e89b-12
d3-a456-426614174000');
 * if (error) {
 *   console.error('Failed to fetch pathogen:', error);
 *   return <ErrorDisplay message="Unable to load pathogen data" />;
 * }
 * if (!data) {
 *   return <NotFound message="Pathogen not found" />;
 * }
 * return <PathogenDetail pathogen={data} />;
 * ```
 * 
 * Requirements:
 * - 4.2: Provides function to retrieve a single pathogen by unique identifier
 * - 4.3: Returns strongly-typed results matching database schema
 * - 4.4: Returns error object without crashing on query failure
 */
export async function getPathogenById(id: string): Promise<QueryResult<Pathogen>> {
  try {
    const supabase = getClient();
    
    // Query single pathogen by ID
    const { data, error: supabaseError } = await supabase
      .from('pathogens')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Handle Supabase-specific errors
    if (supabaseError) {
      return {
        data: null,
        error: new Error(
          `Failed to retrieve pathogen with ID ${id}: ${supabaseError.message}`,
          { cause: supabaseError }
        ),
      };
    }

    // Return successful result with data (null if not found)
    return {
      data: data,
      error: null,
    };
  } catch (error) {
    // Handle unexpected errors (network failures, client initialization, etc.)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while fetching pathogen';
    
    return {
      data: null,
      error: new Error(
        `Unexpected error retrieving pathogen with ID ${id}: ${errorMessage}`,
        { cause: error }
      ),
    };
  }
}

/**
 * Inserts a single pathogen record into the database
 * 
 * Returns the inserted pathogen with its generated ID.
 * Database constraints are enforced automatically:
 * - Name must be unique
 * - Transmission vector must be 'air' or 'fluid'
 * - Humidity must be between 0 and 100
 * - R0 score must be >= 0
 * - Incubation period must be >= 0
 * 
 * Validation errors from constraint violations are returned in the error object,
 * allowing the caller to handle them appropriately.
 * 
 * @param {PathogenInsert} pathogen - Pathogen data to insert (without ID)
 * @returns {Promise<QueryResult<Pathogen>>} Result object containing either:
 *   - data: Inserted pathogen record with generated ID
 *   - error: Error object if insertion failed (including constraint violations)
 * 
 * @example
 * ```typescript
 * const newPathogen: PathogenInsert = {
 *   name: 'Ebola Virus',
 *   incubation_period: 10,
 *   transmission_vector: 'fluid',
 *   min_humidity_survival: 50,
 *   r0_score: 2.0
 * };
 * 
 * const { data, error } = await insertPathogen(newPathogen);
 * if (error) {
 *   console.error('Failed to insert pathogen:', error);
 *   return <ErrorDisplay message="Unable to add pathogen" />;
 * }
 * return <SuccessMessage pathogen={data} />;
 * ```
 * 
 * Requirements:
 * - 2.2: Enforces unique non-null name constraint
 * - 2.4: Enforces transmission_vector enum constraint ('air' or 'fluid')
 * - 2.5: Enforces min_humidity_survival range constraint (0-100)
 * - 2.6: Enforces R0_score non-negative constraint (>
= 0)
 */
export async function insertPathogen(pathogen: PathogenInsert): Promise<QueryResult<Pathogen>> {
  try {
    const supabase = getClient();
    
    // Insert single pathogen record
    // Type assertion required: Supabase v2 has known type inference limitations with custom Database types
    // The PathogenInsert type matches the database schema exactly, so this is safe
    const result = await supabase
      .from('pathogens')
      .insert(pathogen as never)
      .select()
      .single();
    
    const { data, error: supabaseError } = result as { data: Pathogen | null; error: unknown | null };

    // Handle Supabase-specific errors (including constraint violations)
    if (supabaseError) {
      const errorMessage = supabaseError && typeof supabaseError === 'object' && 'message' in supabaseError
        ? String(supabaseError.message)
        : 'Unknown database error';
      
      return {
        data: null,
        error: new Error(
          `Failed to insert pathogen "${pathogen.name}": ${errorMessage}`,
          { cause: supabaseError }
        ),
      };
    }

    // Return successful result with inserted data including generated ID
    return {
      data: data,
      error: null,
    };
  } catch (error) {
    // Handle unexpected errors (network failures, client initialization, etc.)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while inserting pathogen';
    
    return {
      data: null,
      error: new Error(
        `Unexpected error inserting pathogen "${pathogen.name}": ${errorMessage}`,
        { cause: error }
      ),
    };
  }
}

/**
 * Inserts multiple pathogen records into the database in a single transaction
 * 
 * Returns all inserted pathogens with their generated IDs.
 * This function is optimized for bulk operations like database seeding.
 * Database constraints are enforced for all records:
 * - Names must be unique
 * - Transmission vectors must be 'air' or 'fluid'
 * - Humidity must be between 0 and 100
 * - R0 scores must be >= 0
 * - Incubation periods must be >= 0
 * 
 * If any record violates constraints, the entire transaction fails and no records are inserted.
 * 
 * @param {PathogenInsert[]} pathogens - Array of pathogen data to insert (without IDs)
 * @returns {Promise<QueryResult<Pathogen[]>>} Result object containing either:
 *   - data: Array of inserted pathogen records with generate
d IDs
 *   - error: Error object if insertion failed (including constraint violations)
 * 
 * @example
 * ```typescript
 * const pathogens: PathogenInsert[] = [
 *   {
 *     name: 'Ebola Virus',
 *     incubation_period: 10,
 *     transmission_vector: 'fluid',
 *     min_humidity_survival: 50,
 *     r0_score: 2.0
 *   },
 *   {
 *     name: 'Measles',
 *     incubation_period: 12,
 *     transmission_vector: 'air',
 *     min_humidity_survival: 30,
 *     r0_score: 15.0
 *   }
 * ];
 * 
 * const { data, error } = await insertPathogens(pathogens);
 * if (error) {
 *   console.error('Failed to insert pathogens:', error);
 *   return <ErrorDisplay message="Unable to seed database" />;
 * }
 * return <SuccessMessage count={data.length} />;
 * ```
 * 
 * Requirements:
 * - 2.2: Enforces unique non-null name constraint for all records
 * - 2.4: Enforces transmission_vector enum constraint ('air' or 'fluid') for all records
 * - 2.5: Enforces min_humidity_survival range constraint (0-100) for all records
 * - 2.6: Enforces R0_score non-negative constraint (>= 0) for all records
 */
export async function insertPathogens(pathogens: PathogenInsert[]): Promise<QueryResult<Pathogen[]>> {
  try {
    const supabase = getClient();
    
    // Insert multiple pathogen records in a single transaction
    // Type assertion required: Supabase v2 has known type inference limitations with custom Database types
    // The PathogenInsert type matches the database schema exactly, so this is safe
    const result = await supabase
      .from('pathogens')
      .insert(pathogens as never)
      .select();
    
    const { data, error: supabaseError } = result as { data: Pathogen[] | null; error: unknown | null };

    // Handle Supabase-specific errors (including constraint violations)
    if (supabaseError) {
      const errorMessage = supabaseError && typeof supabaseError === 'object' && 'message' in supabaseError
        ? String(supabaseError.message)
        : 'Unknown database error';
      
      return {
        data: null,
        error: new Error(
          `Failed to insert ${pathogens.length} pathogens: ${errorMessage}`,
          { cause: supabaseError }
        ),
      };
    }

    // Return successful result with all inserted data including generated IDs
    return {
      data: data ?? [],
      error: null,
    };
  } catch (error) {
    // Handle unexpected errors (network failures, client initialization, etc.)
    const errorMessage = error
 instanceof Error 
      ? error.message 
      : 'Unknown error occurred while inserting pathogens';
    
    return {
      data: null,
      error: new Error(
        `Unexpected error inserting ${pathogens.length} pathogens: ${errorMessage}`,
        { cause: error }
      ),
    };
  }
}

/**
 * Checks if the database has been seeded with pathogen data
 * 
 * Returns a boolean indicating whether any pathogen records exist in the database.
 * This function is used to implement idempotent seeding - preventing duplicate
 * data insertion when the seed function is called multiple times.
 * 
 * @returns {Promise<QueryResult<boolean>>} Result object containing either:
 *   - data: true if database contains at least one pathogen record, false otherwise
 *   - error: Error object if the query failed
 * 
 * @example
 * ```typescript
 * const { data: isSeeded, error } = await isDatabaseSeeded();
 * if (error) {
 *   console.error('Failed to check seed status:', error);
 *   return <ErrorDisplay message="Unable to verify database status" />;
 * }
 * if (isSeeded) {
 *   console.log('Database already seeded, skipping...');
 *   return;
 * }
 * // Proceed with seeding
 * await seedDatabase();
 * ```
 * 
 * Requirements:
 * - 3.2: Enables checking if database is already seeded to prevent duplicate data
 */
export async function isDatabaseSeeded(): Promise<QueryResult<boolean>> {
  try {
    const supabase = getClient();
    
    // Query count of pathogen records
    // Using count with head: true for optimal performance (doesn't fetch actual rows)
    const { count, error: supabaseError } = await supabase
      .from('pathogens')
      .select('*', { count: 'exact', head: true });

    // Handle Supabase-specific errors
    if (supabaseError) {
      return {
        data: null,
        error: new Error(
          `Failed to check database seed status: ${supabaseError.message}`,
          { cause: supabaseError }
        ),
      };
    }

    // Return true if count > 0, false otherwise
    // Count is null when table is empty or on error, so we treat null as 0
    const recordCount: number = count ?? 0;
    
    return {
      data: recordCount > 0,
      error: null,
    };
  } catch (error) {
    // Handle unexpected errors (network failures, client initialization, etc.)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred while checking seed status';
    
    return {
      data: null,
      error: new Error(
        `Unexpected error checking database seed status: ${errorMessage}`,
        { cause: error }
      ),
    };
  }
}
