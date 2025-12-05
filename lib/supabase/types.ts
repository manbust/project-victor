/**
 * TypeScript type definitions for the VICTOR System database schema
 * Ensures type safety for all pathogen-related database operations
 */

/**
 * Transmission vector enum - how a pathogen spreads
 * Restricted to 'air' (airborne) or 'fluid' (fluid transmission)
 */
export type TransmissionVector = 'air' | 'fluid';

/**
 * Complete pathogen record as stored in the database
 * Includes all fields returned from database queries
 */
export interface Pathogen {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Pathogen name (e.g., "Ebola Virus") - must be unique */
  name: string;
  
  /** Days between infection and symptom onset - must be >= 0 */
  incubation_period: number;
  
  /** Method of transmission - either 'air' or 'fluid' */
  transmission_vector: TransmissionVector;
  
  /** Minimum relative humidity percentage for pathogen survival (0-100) */
  min_humidity_survival: number;
  
  /** Basic reproduction number - average infections per infected person (>= 0) */
  r0_score: number;
  
  /** Timestamp when record was created */
  created_at?: string;
}

/**
 * Pathogen data for insertion into database
 * Excludes auto-generated fields (id, created_at)
 */
export interface PathogenInsert {
  /** Pathogen name (e.g., "Ebola Virus") - must be unique */
  name: string;
  
  /** Days between infection and symptom onset - must be >= 0 */
  incubation_period: number;
  
  /** Method of transmission - either 'air' or 'fluid' */
  transmission_vector: TransmissionVector;
  
  /** Minimum relative humidity percentage for pathogen survival (0-100) */
  min_humidity_survival: number;
  
  /** Basic reproduction number - average infections per infected person (>= 0) */
  r0_score: number;
}

/**
 * Database schema type definition for Supabase client
 * Provides type safety for all database operations
 */
export type Database = {
  public: {
    Tables: {
      pathogens: {
        Row: Pathogen;
        Insert: PathogenInsert;
        Update: Partial<PathogenInsert>;
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
