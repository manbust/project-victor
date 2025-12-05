/**
 * Tests for fast-check generators
 * Verifies that all arbitraries generate valid data
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  humidityArbitrary,
  temperatureArbitrary,
  survivalRangeArbitrary,
  symptomArbitrary,
  symptomsArrayArbitrary,
  weatherConditionsArbitrary,
  pathogenProfileArbitrary,
  pathogenDatabaseArbitrary,
  patientDataArbitrary,
  pathogenScoreArbitrary,
  humidityOutsideRangeArbitrary,
  humidityInsideRangeArbitrary,
  pathogenWithMatchingSymptomsArbitrary,
  pathogenWithNoMatchingSymptomsArbitrary,
  propertyTestConfig,
} from './generators';

describe('fast-check generators', () => {
  it('humidityArbitrary generates values in 0-100 range', () => {
    fc.assert(
      fc.property(humidityArbitrary, (humidity) => {
        expect(humidity).toBeGreaterThanOrEqual(0);
        expect(humidity).toBeLessThanOrEqual(100);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('temperatureArbitrary generates valid temperature values', () => {
    fc.assert(
      fc.property(temperatureArbitrary, (temp) => {
        expect(temp).toBeGreaterThanOrEqual(-50);
        expect(temp).toBeLessThanOrEqual(50);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('survivalRangeArbitrary generates valid ranges where min <= max', () => {
    fc.assert(
      fc.property(survivalRangeArbitrary, (range) => {
        expect(range.minHumidity).toBeGreaterThanOrEqual(0);
        expect(range.minHumidity).toBeLessThanOrEqual(100);
        expect(range.maxHumidity).toBeGreaterThanOrEqual(0);
        expect(range.maxHumidity).toBeLessThanOrEqual(100);
        expect(range.minHumidity).toBeLessThanOrEqual(range.maxHumidity);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('symptomArbitrary generates valid symptom strings', () => {
    fc.assert(
      fc.property(symptomArbitrary, (symptom) => {
        expect(symptom).toMatch(/^[a-z][a-z0-9_]{2,19}$/);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('symptomsArrayArbitrary generates non-empty arrays', () => {
    fc.assert(
      fc.property(symptomsArrayArbitrary, (symptoms) => {
        expect(symptoms.length).toBeGreaterThan(0);
        expect(symptoms.length).toBeLessThanOrEqual(10);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('weatherConditionsArbitrary generates valid weather data', () => {
    fc.assert(
      fc.property(weatherConditionsArbitrary, (weather) => {
        expect(weather.humidity).toBeGreaterThanOrEqual(0);
        expect(weather.humidity).toBeLessThanOrEqual(100);
        expect(weather.temperature).toBeGreaterThanOrEqual(-50);
        expect(weather.temperature).toBeLessThanOrEqual(50);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('pathogenProfileArbitrary generates valid pathogen profiles', () => {
    fc.assert(
      fc.property(pathogenProfileArbitrary, (pathogen) => {
        expect(pathogen.id).toBeTruthy();
        expect(pathogen.name.length).toBeGreaterThanOrEqual(3);
        expect(pathogen.symptoms.length).toBeGreaterThan(0);
        expect(pathogen.survivalRange.minHumidity).toBeLessThanOrEqual(
          pathogen.survivalRange.maxHumidity
        );
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('pathogenDatabaseArbitrary generates non-empty arrays', () => {
    fc.assert(
      fc.property(pathogenDatabaseArbitrary, (database) => {
        expect(database.length).toBeGreaterThan(0);
        expect(database.length).toBeLessThanOrEqual(20);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('patientDataArbitrary generates valid patient data', () => {
    fc.assert(
      fc.property(patientDataArbitrary, (patient) => {
        expect(patient.symptoms.length).toBeGreaterThan(0);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('pathogenScoreArbitrary generates valid scores', () => {
    fc.assert(
      fc.property(pathogenScoreArbitrary, (score) => {
        expect(score.pathogenId).toBeTruthy();
        expect(score.pathogenName.length).toBeGreaterThanOrEqual(3);
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
        expect(typeof score.isViable).toBe('boolean');
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('humidityOutsideRangeArbitrary generates values outside range', () => {
    const range = { minHumidity: 30, maxHumidity: 70 };
    fc.assert(
      fc.property(humidityOutsideRangeArbitrary(range), (humidity) => {
        expect(humidity < range.minHumidity || humidity > range.maxHumidity).toBe(true);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('humidityInsideRangeArbitrary generates values inside range', () => {
    const range = { minHumidity: 30, maxHumidity: 70 };
    fc.assert(
      fc.property(humidityInsideRangeArbitrary(range), (humidity) => {
        expect(humidity).toBeGreaterThanOrEqual(range.minHumidity);
        expect(humidity).toBeLessThanOrEqual(range.maxHumidity);
      }),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('pathogenWithMatchingSymptomsArbitrary generates pathogens with at least one match', () => {
    const patientSymptoms = ['fever', 'cough', 'headache'];
    fc.assert(
      fc.property(
        pathogenWithMatchingSymptomsArbitrary(patientSymptoms),
        (pathogen) => {
          const hasMatch = pathogen.symptoms.some(s => patientSymptoms.includes(s));
          expect(hasMatch).toBe(true);
        }
      ),
      { numRuns: propertyTestConfig.numRuns }
    );
  });

  it('pathogenWithNoMatchingSymptomsArbitrary generates pathogens with no matches', () => {
    const patientSymptoms = ['fever', 'cough', 'headache'];
    fc.assert(
      fc.property(
        pathogenWithNoMatchingSymptomsArbitrary(patientSymptoms),
        (pathogen) => {
          const hasMatch = pathogen.symptoms.some(s => patientSymptoms.includes(s));
          expect(hasMatch).toBe(false);
        }
      ),
      { numRuns: propertyTestConfig.numRuns }
    );
  });
});
