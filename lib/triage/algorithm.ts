/**
 * Main Triage Algorithm for V.I.C.T.O.R. System
 * 
 * This module provides the primary entry point for the triage algorithm,
 * which evaluates and scores potential pathogen matches based on patient
 * symptoms and current environmental conditions.
 * 
 * The algorithm operates in three phases:
 * 1. Environmental Filtering - Eliminates non-viable pathogens
 * 2. Symptom Scoring - Calculates match scores for viable pathogens
 * 3. Result Sorting - Orders pathogens by score
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */

import {
  PatientData,
  WeatherConditions,
  PathogenProfile,
  TriageResult,
  PathogenScore
} from './types';
import { calculatePathogenScore, sortPathogenScores } from './scoring';

/**
 * Main triage algorithm entry point.
 * 
 * Evaluates all pathogens
 in the database against patient symptoms and
 * current environmental conditions, producing a prioritized list of
 * probable pathogen matches.
 * 
 * Algorithm Flow:
 * 1. For each pathogen in database:
 *    a. Check environmental viability (humidity range)
 *    b. Calculate symptom match score if viable
 *    c. Set score to zero if not viable
 * 2. Sort all pathogen scores in descending order
 * 3. Return result with timestamp and conditions
 * 
 * Edge Cases:
 * - Empty pathogen database: Returns empty scores array
 * - Empty patient symptoms: Valid input, all scores will be zero
 * - All pathogens non-viable: Returns all zero scores
 * 
 * Requirements:
 * - 1.1, 1.2, 1.3: Environmental viability filtering
 * - 2.1, 2.2, 2.3: Symptom-based scoring
 * - 3.1: Environmental checks before symptom scoring
 * - 3.2: Sorted output in descending order
 * - 3.3: Deterministic ordering for equal scores
 * 
 * @param patientData - Patient symptoms and information
 * @param weatherConditions - Current environmental conditions
 * @param pathogenDatabase - Array of all pathogen profiles to evaluate
 * @returns TriageResult with scored an
d sorted pathogens, timestamp, and conditions
 */
export function triagePathogens(
  patientData: PatientData,
  weatherConditions: WeatherConditions,
  pathogenDatabase: PathogenProfile[]
): TriageResult {
  // Handle edge case: empty pathogen database
  if (pathogenDatabase.length === 0) {
    return {
      scores: [],
      timestamp: new Date(),
      conditions: weatherConditions
    };
  }

  // Phase 1 & 2: Calculate scores for all pathogens
  // Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1

  const pathogenScores: PathogenScore[] = pathogenDatabase.map(
    (pathogen: PathogenProfile): PathogenScore => {
      return calculatePathogenScore(patientData, weatherConditions, pathogen);
    }
  );

  // Phase 3: Sort scores in descending order
  // Requirements 3.2, 3.3
  const sortedScores: PathogenScore[] = sortPathogenScores(pathogenScores);

  // Return complete triage result with metadata
  const result: TriageResult = {
    scores: sortedScores,
    timestamp: new Date(),
    conditions: weatherConditions
  };

  return result;
}
