/**
 * Symptom Scoring Module for V.I.C.T.O.R. Triage Algorithm
 * 
 * This module calculates pathogen scores based on symptom matching
 * and environmental viability. Scores are percentage-based (0-100)
 * representing the likelihood of pathogen match.
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1
 */

import { 
  Symptom, 
  PathogenProfile, 
  PatientData, 
  WeatherConditions, 
  PathogenScore 
} from './types';
import { isPathogenViable } from './viability';

/**
 * Calculates symptom match score as a percentage (0-100).
 * 
 * The score represents the percentage of pathogen symptoms that match
 * patient-reported symptoms. Higher scores indicate better matches.
 * 
 * Formula: (matchingSymptoms / totalPathogenSymptoms) * 100
 * 
 * Requirements:
 * - 2.1: Increases score proportionally to match quality
 * - 2.2: Returns zero when no symptoms match
 * - 2.3: Calculates cumulative score for multiple matches
 * 
 * @param patientSymptoms - Array of symptoms reported by patient
 * @param pathogenSymptoms - Array of symptoms associated with pathogen
 * @returns Percentage score (0-100) representing match quality
 */
export function calculateSymptomScore(
  patientSymptoms: Symptom[],
  pathogenSymptoms: Symptom[]
): number {
  // Handle edge case: empty pathogen symptoms
  if (pathogenSymptoms.length === 0) {
    return 0;
  }

  // Handle edge case: empty patient symptoms
  // Requirement 2.2: No matches -> zero score
  if (patientSymptoms.length === 0) {
    return 0;
  }

  // Count matching symptoms
  // Use case-insensitive comparison for robustness
  const patientSymptomsLower: Set<string> = new Set(
    patientSymptoms.map((s: Symptom) => s.toLowerCase())
  );

  let matchCount: number = 0;
  for (const symptom of pathogenSymptoms) {
    if (patientSymptomsLower.has(symptom.toLowerCase())) {
      matchCount++;
    }
  }

  // Requirement 2.2: No matches -> zero score
  if (matchCount === 0) {
    return 0;
  }

  // Requirements 2.1, 2.3: Calculate percentage-based score
  const score: number = (matchCount / pathogenSymptoms.length) * 100;
  return score;
}

/**
 * Calculates final pathogen score combining environmental viability and symptom matching.
 * 
 * This function implements the two-phase scoring algorithm:
 * 1. Environmental Filtering: Check if pathogen can survive in current conditions
 * 2. Symptom Scoring: Calculate match score for viable pathogens
 * 
 * Requirements:
 * - 1.1, 1.2: Returns zero score when environment is non-viable
 * - 1.3: Allows non-zero score when environment is viable
 * - 3.1: Applies environmental checks before symptom scoring
 * 
 * @param patientData - Patient symptoms and information
 * @param weatherConditions - Current environmental conditions
 * @param pathogen - Pathogen profile to score
 * @returns PathogenScore object with all required fields
 */
export function calculatePathogenScore(
  patientData: PatientData,
  weatherConditions: WeatherConditions,
  pathogen: PathogenProfile
): PathogenScore {
  // Requirement 3.1: Check environmental viability FIRST (short-circuit)
  const viable: boolean = isPathogenViable(
    weatherConditions.humidity,
    pathogen.survivalRange
  );

  // Requirements 1.1, 1.2: Non-viable environment -> zero score
  if (!viable) {
    return {
      pathogenId: pathogen.id,
      pathogenName: pathogen.name,
      score: 0,
      isViable: false
    };
  }

  // Requirement 1.3: Viable environment -> calculate symptom score
  const symptomScore: number = calculateSymptomScore(
    patientData.symptoms,
    pathogen.symptoms
  );

  return {
    pathogenId: pathogen.id,
    pathogenName: pathogen.name,
    score: symptomScore,
    isViable: true
  };
}

/**
 * Sorts pathogen scores in descending order by score with stable secondary sort by ID.
 * 
 * Requirements:
 * - 3.2: Sorts in descending order (highest scores first)
 * - 3.3: Maintains deterministic ordering for equal scores using pathogen ID
 * 
 * @param scores - Array of pathogen scores to sort
 * @returns New sorted array (does not mutate input)
 */
export function sortPathogenScores(scores: PathogenScore[]): PathogenScore[] {
  // Handle empty array
  if (scores.length === 0) {
    return [];
  }

  // Create a copy to avoid mutating input
  const sortedScores: PathogenScore[] = [...scores];

  // Requirement 3.2: Sort by score descending
  // Requirement 3.3: Secondary sort by pathogen ID for deterministic ordering
  sortedScores.sort((a: PathogenScore, b: PathogenScore): number => {
    // Primary sort: score descending (higher scores first)
    if (a.score !== b.score) {
      return b.score - a.score; // Descending order
    }

    // Secondary sort: pathogen ID ascending (for deterministic ordering)
    return a.pathogenId.localeCompare(b.pathogenId);
  });

  return sortedScores;
}
