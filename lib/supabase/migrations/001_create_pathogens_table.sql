-- Migration: Create pathogens table
-- Description: Creates the pathogens table with all required columns, constraints, and indexes
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

-- Create pathogens table
CREATE TABLE IF NOT EXISTS pathogens (
  -- Primary key with auto-generated UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pathogen name - must be unique and non-null
  name TEXT NOT NULL,
  
  -- Incubation period in days - must be non-negative
  incubation_period NUMERIC NOT NULL,
  
  -- Transmission vector - restricted to 'air' or 'fluid'
  transmission_vector TEXT NOT NULL,
  
  -- Minimum humidity percentage for survival - must be between 0 and 100
  min_humidity_survival NUMERIC NOT NULL,
  
  -- Basic reproduction number - must be non-negative
  r0_score NUMERIC NOT NULL,
  
  -- Timestamp for record creation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pathogen_name UNIQUE (name),
  CONSTRAINT valid_transmission_vector CHECK (transmission_vector IN ('air', 'fluid')),
  CONSTRAINT valid_humidity_range CHECK (min_humidity_survival >= 0 AND min_humidity_survival <= 100),
  CONSTRAINT valid_r0_score CHECK (r0_score >= 0),
  CONSTRAINT valid_incubation_period CHECK (incubation_period >= 0)
);

-- Create index on transmission_vector for efficient filtering
CREATE INDEX IF NOT EXISTS idx_pathogens_transmission_vector ON pathogens(transmission_vector);

-- Add comment to table
COMMENT ON TABLE pathogens IS 'Stores epidemiological data for deadly pathogens used in the VICTOR triage system';

-- Add comments to columns
COMMENT ON COLUMN pathogens.id IS 'Unique identifier for the pathogen';
COMMENT ON COLUMN pathogens.name IS 'Name of the pathogen (e.g., "Ebola Virus")';
COMMENT ON COLUMN pathogens.incubation_period IS 'Days between infection and symptom onset';
COMMENT ON COLUMN pathogens.transmission_vector IS 'Method of transmission: air or fluid';
COMMENT ON
 COLUMN pathogens.min_humidity_survival IS 'Minimum relative humidity percentage for pathogen survival';
COMMENT ON COLUMN pathogens.r0_score IS 'Basic reproduction number - average number of people infected by one infected person';
COMMENT ON COLUMN pathogens.created_at IS 'Timestamp when the record was created';
