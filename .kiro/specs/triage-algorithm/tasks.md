# Implementation Plan: Triage Algorithm

- [x] 1. Set up core type definitions and interfaces





  - Create `lib/triage/types.ts` with all TypeScript interfaces (WeatherConditions, PathogenProfile, PatientData, PathogenScore, TriageResult, etc.)
  - Ensure strict typing with no `any` types
  - Add JSDoc comments for all interfaces
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 2. Implement environmental viability checker





  - Create `lib/triage/viability.ts` with `isPathogenViable()` function
  - Implement humidity range validation logic
  - Add input validation for humidity values (0-100 range)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 2.1 Write property test for environmental viability
  - **Property 1: Environmental viability determines score eligibility**
  - **Validates: Requirements 1.1, 1.2, 3.1**
  - Generate random pathogens and humidity values outside survival ranges
  - Assert scores are zero when environment is non-viable

- [x] 3. Implement symptom scoring function






















  - Create `lib/triage/scoring.ts` with `calculateSymptomScore()` function
  - Implement symptom matching logic with percentage-based scoring
  - Handle empty symptom arrays gracefully
  - Add `calculatePathogenScore()` function to `lib/triage/scoring.ts` that combines viability and symptom scoring
  - Ensure environmental checks happen before symptom scoring (short-circuit to zero if non-viable)
  - Return PathogenScore object with all required fields
  - Create `sortPathogenScores()` function in `lib/triage/sorting.ts`
  - Sort by score descending with stable secondary sort by pathogen ID
  - Handle empty arrays and equal scores deterministically
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1_

- [ ]* 3.1 Write property test for symptom match monotonicity
  - **Property 3: Symptom match score monotonicity**
  - **Validates: Requirements 2.1, 2.3**
  - Generate random pathogens in viable conditions
  - Test that increasing symptom matches increases scores monotonically

- [ ]* 3.2 Write property test for zero symptom matches
  - **Property 4: Zero symptom matches produces zero or base score**
  - **Validates: Requirements 2.2**
  - Generate random pathogens with non-matching symptoms
  - Assert score is zero or base value
  - Write property test for viable environment with symptom matches
  - **Property 2: Viable environment with symptom matches produces non-zero score**
  - **Validates: Requirements 1.3**
  - Generate random pathogens with matching symptoms in viable humidity
  - Assert score > 0

  - Write property test for sorted output
  - **Property 5: Output is sorted in descending order**
  - **Validates: Requirements 3.2**
  - Generate random pathogen scores
  - Assert output is sorted in descending order

  - Write property test for deterministic ordering
  - **Property 6: Deterministic ordering for equal scores**
  - **Validates: Requirements 3.3**
  - Generate pathogens with identical scores
  - Run algorithm multiple times and assert same ordering

- [x] 6. Implement main triage algorithm


















  - Create `lib/triage/algorithm.ts` with `triagePathogens()` main entry point
  - Integrate viability checking, symptom scoring, and sorting
  - Add timestamp and conditions to TriageResult
  - Handle empty pathogen database gracefully
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [ ]* 6.1 Write unit tests for main triage algorithm
  - Test full triage flow with mock pathogen data
  - Test edge case: all pathogens non-viable
  - Test edge case: empty pathogen database
  - Test edge case: empty patient symptoms

- [x] 7. Add input validation utilities












  - Create `lib/triage/validation.ts` with validation functions
  - Implement `validateHumidity()` function
  - Implement `validateSurvivalRange()` function
  - Add error messages for invalid inputs
  - _Requirements: 1.1, 1.2_

- [ ]* 7.1 Write unit tests for validation functions
  - Test humidity validation with values outside 0-100
  - Test survival range validation with min > max
  - Test boundary conditions (exactly 0, exactly 100)

- [x] 8. Set up fast-check test infrastructure














  - Create `lib/triage/__tests__/generators.ts` with arbitraries
  - Implement generators for humidity, survival ranges, symptoms, and pathogens
  - Configure each property test to run minimum 100 iterations
  - _Requirements: All_

- [x] 9. Integration test suite































  - Create/complete `lib/triage/__tests__/integration.test.ts`
  - Test realistic scenarios with multiple pathogens
  - Test weather API data format compatibility
  - Test Supabase pathogen data format compatibility
  - _Requirements: All_

- [x] 10. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
