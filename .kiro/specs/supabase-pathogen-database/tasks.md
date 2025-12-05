# Implementation Plan

- [x] 1. Set up Supabase configuration and environment







  - Create `.env.local` file with Supabase URL and anon key placeholders
  - Install `@supabase/supabase-js` package
  - Create environment variable validation
  - _Requirements: 1.1, 1.2_

- [x] 2. Define TypeScript types for database schema





  - Create `lib/supabase/types.ts` with TransmissionVector type
  - Define Pathogen, PathogenInsert, and Database interfaces
  - Ensure all numeric fields are explicitly typed as `number`
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.5 Implement Live Weather Data Fetcher


  - Create `lib/triage/weather-service.ts`
  - Implement `fetchCurrentConditions(lat: number, lon: number)` using the Open-Meteo API (free, no key required)
  - URL pattern: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`
  - Normalize the raw API response to match the `WeatherConditions` interface defined in Task 1
  - Add error handling to return default/fallback conditions if the API fails
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 3. Create Supabase client initialization





  - Create `lib/supabase/client.ts` with createClient function
  - Implement environment variable validation with descriptive errors
  - Export typed Supabase client instance
  - Make sure this works server-side and client-side (Next.js App Router nuances)
  - _Requirements: 1.1, 1.2_

- [x] 4. Create database schema migration




  - Create SQL migration file for pathogens table
  - Define all columns with appropriate types and constraints
  - Add CHECK constraints for transmission_vector enum
  - Add CHECK constraints for humidity range (0-100)
  - Add CHECK constraints for R0 score (>= 0)
  - Add CHECK constraints for incubation_period (>= 0)
  - Add UNIQUE constraint on name column
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [-] 5. Implement query functions


- [x] 5.1 Create `lib/supabase/queries.ts` with getAllPathogens function







  - Implement error handling that returns error object instead of throwing
  - Return strongly-typed results
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 5.2 Implement getPathogenById function




  - Accept UUID string parameter
  - Return single pathogen or null
  - Handle errors gracefully
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 5.3 Implement insertPathogen and insertPathogens functions












  - Accept PathogenInsert type
  - Return inserted pathogen(s) with generated ID
  - Handle validation errors from database constraints
  - _Requirements: 2.2, 2.4, 2.5, 2.6_

- [x] 5.4 Implement isDatabaseSeeded function







  - Query count of records in pathogens table
  - Return boolean indicating if count > 0
  - _Requirements: 3.2_

- [ ]* 5.5 Write property test for database constraint enforcement
  - **Property 1: Database constraint enforcement**
  - **Validates: Requirements 2.2, 2.4, 2.5, 2.6**
  - Generate random invalid pathogen data (duplicate names, invalid transmission vectors, out-of-range values)
  - Verify all invalid data is rejected by the database
  - Run 100 iterations minimum

- [ ]* 5.6 Write property test for pathogen retrieval round-trip
  - **Property 3: Pathogen retrieval round-trip**
  - **Validates: Requirements 4.2**
  - Generate random valid pathogen records
  - Insert each record and retrieve by ID
  - Verify all fields match original values
  - Run 100 iterations minimum

- [ ]* 5.7 Write unit tests for query functions
  - Test getAllPathogens with mocked Supabase client
  - Test getPathogenById with valid and invalid IDs
  - Test error handling paths
  - _Requirements: 4.1, 4.2, 4.4_


- [x] 6. Create pathogen dataset





  - Create `lib/supabase/pathogen-data.ts` with PATHOGEN_DATASET constant
  - Include exactly 30 pathogen records with realistic epidemiological data
  - Ensure diversity: both air and fluid transmission vectors
  - Ensure incubation periods range from 1 to 21 days
  - Ensure R0 scores include highly contagious (> 10) and moderately contagious (< 5)
  - Include pathogens like Measles, Ebola, Tuberculosis, HIV, Influenza, SARS-CoV-2, Cholera, Hepatitis B
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

- [x] 6.1 Write unit tests for pathogen dataset validation









  - Verify exactly 30 records exist
  - Verify all required fields are present
  - Verify transmission_vector values are only 'air' or 'fluid'
  - Verify humidity values are between 0 and 100
  - Verify R0 scores are >= 0
  - Verify incubation periods are >= 0
  - Verify dataset contains both transmission vectors
  - Verify incubation period range includes 1-21 days
  - Verify R0 score diversity (some > 10, some < 5)
  - _Requirements: 3.1, 3.3, 3.4, 3.5_


- [x] 7. Implement database seeding function






  - Create `lib/supabase/seed.ts` with seedDatabase function
  - Check if database is already seeded using isDatabaseSeeded
  - If seeded, return early with success message
  - If not seeded, insert all 30 pathogens using insertPathogens
  - Return success/failure status with descriptive messages
  - Handle errors gracefully without crashing
  - _Requirements: 3.1, 3.2_

- [ ]* 7.1 Write property test for seeding idempotency
  - **Property 2: Seeding idempotency**
  - **Validates: Requirements 3.2**
  - Run seed function multiple times (2-10 iterations)
  - Verify database always contains exactly 30 records
  - Run 100 iterations minimum with varying call counts

- [ ]* 7.2 Write integration tests for seeding flow
  - Test seeding empty database produces 30 records
  - Test re-seeding doesn't create duplicates
  - Test dataset diversity requirements after seeding

  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Create seeding script or API route






  - Create script or API route to trigger database seeding
  - Add instructions to README for running seed operation
  - Ensure seed can be run during deployment or manually
  - _Requirements: 3.1_

- [x] 9. Checkpoint - Ensure all tests pass







  - Ensure all tests pass, ask the user if questions arise.
