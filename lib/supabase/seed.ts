/**
 * Database seeding module for the VICTOR System
 * 
 * Provides idempotent seeding functionality to populate the pathogens table
 * with the initial dataset of 30 deadly pathogens.
 * 
 * Requirements: 3.1, 3.2
 */

import { isDatabaseSeeded, insertPathogens } from './queries';
import { PATHOGEN_DATASET } from './pathogen-data';

/**
 * Result type for seeding operations
 */
export interface SeedResult {
  /** Whether the seeding operation was successful */
  success: boolean;
  
  /** Descriptive message about the operation result */
  message: string;
  
  /** Error object if the operation failed */
  error?: Error;
}

/**
 * Seeds the database with the initial pathogen dataset
 * 
 * This function is idempotent - it checks if the database is already seeded
 * and returns early if records exist, preventing duplicate data insertion.
 * 
 * If the database is not seeded, it inserts all 30 pathogens from PATHOGEN_DATASET
 * in a single transaction. All database constraints are enforced during insertion.
 * 
 * The function handles errors gracefully without crashing, returning detailed
 * status information that allows callers to decide how to handle failures.
 * 
 * @returns {Promise<SeedResult>} Result object containing:
 *   - success: true if seeding completed or database was already seeded
 *   - message: Descriptive message about what happened
 *   - error: Error object if the operation failed (only when success is false)
 * 
 * @example
 * ```typescript
 * const result = await seedDatabase();
 * if (!result.success) {
 *   console.error('Seeding failed:', result.message, result.error);
 *   return;
 * }
 * console.log('Seeding complete:', result.message);
 * ```
 * 
 * Requirements:
 * - 3.1: Populates pathogens table with exactly 30 pathogen records
 * - 3.2: Implements idempotent seeding to prevent duplicate data
 */
export async function seedDatabase(): Promise<SeedResult> {
  try {
    // Check if database is already seeded
    const { data: isSeeded, error: checkError } = await isDatabaseSeeded();
    
    // Handle error checking seed status
    if (checkError) {
      return {
        success: false,
        message: 'Failed to check if database is already seeded',
        error: checkError,
      };
    }
    
    // If already seeded, return early with success message
    if (isSeeded) {
      return {
        success: true,
        message: 'Database is already seeded with pathogen data. Skipping re-seeding to prevent duplicates.',
      };
    }
    
    // Database is not seeded, proceed with insertion
    const { data: insertedPathogens, error: insertError } = await insertPathogens(PATHOGEN_DATASET);
    
    // Handle insertion error
    if (insertError) {
      return {
        success: false,
        message: `Failed to seed database with ${PATHOGEN_DATASET.length} pathogens`,
        error: insertError,
      };
    }
    
    // Verify correct number of records were inserted
    const insertedCount: number = insertedPathogens?.length ?? 0;
    
    if (insertedCount !== PATHOGEN_DATASET.length) {
      return {
        success: false,
        message: `Seeding incomplete: expected ${PATHOGEN_DATASET.length} records but inserted ${insertedCount}`,
        error: new Error('Record count mismatch after insertion'),
      };
    }
    
    // Seeding successful
    return {
      success: true,
      message: `Successfully seeded database with ${insertedCount} pathogen records`,
    };
  } catch (error) {
    // Handle unexpected errors (should be rare since query functions catch most errors)
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred during seeding';
    
    return {
      success: false,
      message: 'Unexpected error during database seeding',
      error: new Error(errorMessage, { cause: error }),
    };
  }
}
