/**
 * Unit tests for pathogen dataset validation
 * Validates Requirements: 3.1, 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest';
import { PATHOGEN_DATASET } from './pathogen-data';
import type { TransmissionVector } from './types';

describe('Pathogen Dataset Validation', () => {
  it('should contain exactly 30 pathogen records', () => {
    expect(PATHOGEN_DATASET).toHaveLength(30);
  });

  it('should have all required fields present in every record', () => {
    PATHOGEN_DATASET.forEach((pathogen, index) => {
      expect(pathogen).toHaveProperty('name');
      expect(pathogen).toHaveProperty('incubation_period');
      expect(pathogen).toHaveProperty('transmission_vector');
      expect(pathogen).toHaveProperty('min_humidity_survival');
      expect(pathogen).toHaveProperty('r0_score');

      // Verify fields are not null or undefined
      expect(pathogen.name, `Record ${index} has null/undefined name`).toBeTruthy();
      expect(pathogen.incubation_period, `Record ${index} has null/undefined incubation_period`).toBeDefined();
      expect(pathogen.transmission_vector, `Record ${index} has null/undefined transmission_vector`).toBeTruthy();
      expect(pathogen.min_humidity_survival, `Record ${index} has null/undefined min_humidity_survival`).toBeDefined();
      expect(pathogen.r0_score, `Record ${index} has null/undefined r0_score`).toBeDefined();
    });
  });

  it('should only have transmission_vector values of "air" or "fluid"', () => {
    const validVectors: TransmissionVector[] = ['air', 'fluid'];
    
    PATHOGEN_DATASET.forEach((pathogen) => {
      expect(validVectors.includes(pathogen.transmission_vector)).toBe(true);
      expect(['air', 'fluid']).toContain(pathogen.transmission_vector);
    });
  });

  it('should have humidity values between 0 and 100', () => {
    PATHOGEN_DATASET.forEach((pathogen) => {
      expect(pathogen.min_humidity_survival).toBeGreaterThanOrEqual(0);

      expect(pathogen.min_humidity_survival).toBeLessThanOrEqual(100);
    });
  });

  it('should have R0 scores >= 0', () => {
    PATHOGEN_DATASET.forEach((pathogen) => {
      expect(pathogen.r0_score).toBeGreaterThanOrEqual(0);
    });
  });

  it('should have incubation periods >= 0', () => {
    PATHOGEN_DATASET.forEach((pathogen) => {
      expect(pathogen.incubation_period).toBeGreaterThanOrEqual(0);
    });
  });

  it('should contain both transmission vectors', () => {
    const airbornePathogens = PATHOGEN_DATASET.filter(p => p.transmission_vector === 'air');
    const fluidPathogens = PATHOGEN_DATASET.filter(p => p.transmission_vector === 'fluid');
    
    expect(airbornePathogens.length).toBeGreaterThan(0);
    expect(fluidPathogens.length).toBeGreaterThan(0);
  });

  it('should include incubation period range from 1 to 21 days', () => {
    const incubationPeriods = PATHOGEN_DATASET.map(p => p.incubation_period);
    const minIncubation = Math.min(...incubationPeriods);
    const maxIncubation = Math.max(...incubationPeriods);
    
    expect(minIncubation).toBeLessThanOrEqual(1);
    expect(maxIncubation).toBeGreaterThanOrEqual(21);
  });

  it('should have R0 score diversity (some > 10, some < 5)', () => {
    const highlyContagious = PATHOGEN_DATASET.filter(p => p.r0_score > 10);
    const moderatelyContagious = PATHOGEN_DATASET.filter(p => p.r0_score < 5);
    
    expect(highlyContagious.length).toBeGreaterThan
(0);
    expect(moderatelyContagious.length).toBeGreaterThan(0);
  });
});
