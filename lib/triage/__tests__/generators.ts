/**
 * fast-check generators (arbitraries) for property-based testing
 * of the V.I.C.T.O.R. Triage Algorithm
 * 
 * This module provides smart generators that constrain inputs to valid ranges
 * for testing triage algorithm properties across many random inputs.
 */

import * as fc from 'fast-check';
import type {
  Symptom,
  WeatherConditions,
  PathogenSurvivalRange,
  PathogenProfile,
  PatientData,
  PathogenScore,
} from '../types';

/**
 * Generates valid humidity values (0-100 inclusive)
 */
export const humidityArbitrary = fc.integer({ min: 0, max: 100 });

/**
 * Generates valid temperature values in Celsius (-50 to 50)
 */
export const temperatureArbitrary = fc.integer({ min: -50, max: 50 });

/**
 * Generates valid pathogen survival ranges where minHumidity <= maxHumidity
 * Both values are constrained to 0-100 range
 */
export const survivalRangeArbitrary: fc.Arbitrary<PathogenSurvivalRange> = fc
  .tuple(
    fc.integer({ min: 0, max: 100 }),
    fc.integer({ min: 0, max: 100 })
  )
  .map(([a, b]) => {
    const minHumidity = Math.min(a, b);
    const maxHumidity = Math.max(a, b);
    return { minHumidity, maxHumidity };
  });

/**
 * Generates realistic symptom strings
 * Symptoms are lowercase alphanumeric strings with underscores
 */
export const symptomArbitrary: fc.Arbitrary<Symptom> = fc
  .stringMatching(/^[a-z][a-z0-9_]{2,19}$/)
  .map(s => s.toLowerCase());

/**
 * Generates an array of unique symptoms (1-10 symptoms)
 */
export const symptomsArrayArbitrary: fc.Arbitrary<Symptom[]> = fc
  .uniqueArray(symptomArbitrary, { minLength: 1, maxLength: 10 });

/**
 * Generates valid weather conditions
 */
export const weatherConditionsArbitrary: fc.Arbitrary<WeatherConditions> = fc.record({
  humidity: humidityArbitrary,
  temperature: temperatureArbitrary,
});

/**
 * Generates complete pathogen profiles with valid data
 */
export const pathogenProfileArbitrary: fc.Arbitrary<PathogenProfile> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 50 }),
  symptoms: symptomsArrayArbitrary,
  survivalRange: survivalRangeArbitrary,
});

/**
 * Generates an array of pathogen profiles (1-20 pathogens)
 */
export const pathogenDatabaseArbitrary: fc.Arbitrary<PathogenProfile[]> = fc.array(
  pathogenProfileArbitrary,
  { minLength: 1, maxLength: 20 }
);

/**
 * Generates patient data with symptoms
 */
export const patientDataArbitrary: fc.Arbitrary<PatientData> = fc.record({
  symptoms: symptomsArrayArbitrary,
});

/**
 * Generates patient data with empty symptoms (edge case)
 */
export const patientDataEmptySymptomsArbitrary: fc.Arbitrary<PatientData> = fc.constant({
  symptoms: [],
});

/**
 * Generates pathogen scores
 */
export const pathogenScoreArbitrary: fc.Arbitrary<PathogenScore> = fc.record({
  pathogenId: fc.uuid(),
  pathogenName: fc.string({ minLength: 3, maxLength: 50 }),
  score: fc.integer({ min: 0, max: 100 }),
  isViable: fc.boolean(),
});

/**
 * Generates an array of pathogen scores (for testing sorting)
 */
export const pathogenScoresArrayArbitrary: fc.Arbitrary<PathogenScore[]> = fc.array(
  pathogenScoreArbitrary,
  { minLength: 0, maxLength: 20 }
);

/**
 * Generates humidity values OUTSIDE a given survival range
 * Useful for testing non-viable conditions
 */
export function humidityOutsideRangeArbitrary(
  range: PathogenSurvivalRange
): fc.Arbitrary<number> {
  const belowMin = fc.integer({ min: 0, max: Math.max(0, range.minHumidity - 1) });
  const aboveMax = fc.integer({ min: Math.min(100, range.maxHumidity + 1), max: 100 });
  
  // If range covers entire 0-100, return empty arbitrary
  if (range.minHumidity === 0 && range.maxHumidity === 100) {
    // Return an arbitrary that will never generate values (filtered out)
    return fc.integer({ min: 0, max: 100 }).filter(() => false);
  }
  
  // If range starts at 0, only generate above max
  if (range.minHumidity === 0) {
    return aboveMax;
  }
  
  // If range ends at 100, only generate below min
  if (range.maxHumidity === 100) {
    return belowMin;
  }
  
  // Otherwise, generate either below min or above max
  return fc.oneof(belowMin, aboveMax);
}

/**
 * Generates humidity values INSIDE a given survival range
 * Useful for testing viable conditions
 */
export function humidityInsideRangeArbitrary(
  range: PathogenSurvivalRange
): fc.Arbitrary<number> {
  return fc.integer({ min: range.minHumidity, max: range.maxHumidity });
}

/**
 * Generates a pathogen with at least one symptom matching the patient
 * Useful for testing symptom matching logic
 */
export function pathogenWithMatchingSymptomsArbitrary(
  patientSymptoms: Symptom[]
): fc.Arbitrary<PathogenProfile> {
  if (patientSymptoms.length === 0) {
    return pathogenProfileArbitrary;
  }
  
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    symptoms: fc.array(symptomArbitrary, { minLength: 1, maxLength: 10 }).map(symptoms => {
      // Ensure at least one matching symptom
      const randomPatientSymptom = patientSymptoms[Math.floor(Math.random() * patientSymptoms.length)];
      return [randomPatientSymptom, ...symptoms];
    }),
    survivalRange: survivalRangeArbitrary,
  });
}

/**
 * Generates a pathogen with NO symptoms matching the patient
 * Useful for testing zero-match scenarios
 */
export function pathogenWithNoMatchingSymptomsArbitrary(
  patientSymptoms: Symptom[]
): fc.Arbitrary<PathogenProfile> {
  if (patientSymptoms.length === 0) {
    return pathogenProfileArbitrary;
  }
  
  const patientSymptomsSet = new Set(patientSymptoms);
  
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    symptoms: fc.array(symptomArbitrary, { minLength: 1, maxLength: 10 })
      .filter(symptoms => symptoms.every(s => !patientSymptomsSet.has(s))),
    survivalRange: survivalRangeArbitrary,
  });
}

/**
 * Configuration for property-based tests
 * All tests should run at least 100 iterations as specified in the design
 */
export const propertyTestConfig = {
  numRuns: 100,
};
