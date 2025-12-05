import { describe, it, expect } from 'vitest';
import {
  validateSymptomSelection,
  prepareSymptomData,
  getAvailableSymptomNames,
  getSymptomConfigByDisplayName,
  getSymptomConfigById,
  AVAILABLE_SYMPTOM_CONFIGS
} from './symptom-validation';

describe('symptom-validation', () => {
  const availableSymptoms = getAvailableSymptomNames();

  describe('validateSymptomSelection', () => {
    it('validates successful symptom selection', () => {
      const selectedSymptoms = ['Fever', 'Cough', 'Headache'];
      const result = validateSymptomSelection(selectedSymptoms, availableSymptoms);

      expect(result.isValid).toBe(true);
      expect(result.validatedSymptoms).toEqual(['fever', 'cough', 'headache']);
      expect(result.errorMessage).toBeUndefined();
    });

    it('rejects empty symptom selection', () => {
      const result = validateSymptomSelection([], availableSymptoms);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('At least one symptom must be selected for threat analysis');
      expect(result.validatedSymptoms).toEqual([]);
    });

    it('rejects invalid symptoms not in available list', () => {
      const selectedSymptoms = ['Fever', 'InvalidSymptom', 'Cough'];
      const result = validateSymptomSelection(selectedSymptoms, availableSymptoms);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid symptoms detected: InvalidSymptom');
      expect(result.validatedSymptoms).toEqual([]);
    });

    it('removes duplicate symptoms and warns', () => {
      const selectedSymptoms = ['Fever', 'Cough', 'Fever'];
      const result = validateSymptomSelection(selectedSymptoms, availableSymptoms);

      expect(result.isValid).toBe(true);
      expect(result.validatedSymptoms).toEqual(['fever', 'cough']);
      expect(result.warnings).toContain('Duplicate symptoms removed from selection');
    });

    it('warns about large number of symptoms', () => {
      const selectedSymptoms = availableSymptoms.slice(0, 12); // More than 10
      const result = validateSymptomSelection(selectedSymptoms, availableSymptoms);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Large number of symptoms selected - consider focusing on primary symptoms');
    });

    it('handles symptoms not in predefined configs by normalizing names', () => {
      const customAvailable = [...availableSymptoms, 'Custom Symptom'];
      const selectedSymptoms = ['Fever', 'Custom Symptom'];
      const result = validateSymptomSelection(selectedSymptoms, customAvailable);

      expect(result.isValid).toBe(true);
      expect(result.validatedSymptoms).toEqual(['fever', 'custom_symptom']);
    });
  });

  describe('prepareSymptomData', () => {
    it('prepares symptom data with correct metadata', () => {
      const validatedSymptoms = ['fever', 'hemorrhage', 'cough'];
      const result = prepareSymptomData(validatedSymptoms);

      expect(result.symptoms).toEqual(['fever', 'hemorrhage', 'cough']);
      expect(result.metadata.totalSymptoms).toBe(3);
      expect(result.metadata.severeCounts).toBe(1); // hemorrhage
      expect(result.metadata.moderateCounts).toBe(1); // fever
      expect(result.metadata.mildCounts).toBe(1); // cough
    });

    it('calculates severity score based on symptom weights', () => {
      const validatedSymptoms = ['fever', 'hemorrhage']; // weights: 0.8 + 1.0 = 1.8
      const result = prepareSymptomData(validatedSymptoms);

      expect(result.severityScore).toBe(1.8);
    });

    it('categorizes symptoms correctly', () => {
      const validatedSymptoms = ['fever', 'cough', 'difficulty_breathing', 'nausea'];
      const result = prepareSymptomData(validatedSymptoms);

      expect(result.categorizedSymptoms).toEqual({
        systemic: ['fever'],
        respiratory: ['cough', 'difficulty_breathing'],
        gastrointestinal: ['nausea']
      });
    });

    it('determines dominant category correctly', () => {
      const validatedSymptoms = ['cough', 'difficulty_breathing', 'chest_pain', 'fever'];
      const result = prepareSymptomData(validatedSymptoms);

      expect(result.metadata.dominantCategory).toBe('respiratory'); // 3 respiratory vs 1 systemic
    });

    it('handles empty symptom list gracefully', () => {
      const result = prepareSymptomData([]);

      expect(result.symptoms).toEqual([]);
      expect(result.severityScore).toBe(0);
      expect(result.categorizedSymptoms).toEqual({});
      expect(result.metadata.totalSymptoms).toBe(0);
      expect(result.metadata.dominantCategory).toBe('systemic'); // default
    });

    it('handles unknown symptoms by filtering them out', () => {
      const validatedSymptoms = ['fever', 'unknown_symptom', 'cough'];
      const result = prepareSymptomData(validatedSymptoms);

      // Should only process known symptoms
      expect(result.symptoms).toEqual(['fever', 'unknown_symptom', 'cough']);
      expect(result.metadata.totalSymptoms).toBe(3);
      // But severity score should only include known symptoms
      expect(result.severityScore).toBeCloseTo(1.2, 1); // fever (0.8) + cough (0.4)
    });
  });

  describe('utility functions', () => {
    it('getAvailableSymptomNames returns all display names', () => {
      const names = getAvailableSymptomNames();
      
      expect(names).toContain('Fever');
      expect(names).toContain('Hemorrhage');
      expect(names).toContain('Cough');
      expect(names.length).toBe(AVAILABLE_SYMPTOM_CONFIGS.length);
    });

    it('getSymptomConfigByDisplayName finds correct config', () => {
      const config = getSymptomConfigByDisplayName('Fever');
      
      expect(config).toBeDefined();
      expect(config?.id).toBe('fever');
      expect(config?.category).toBe('systemic');
      expect(config?.severity).toBe('moderate');
    });

    it('getSymptomConfigByDisplayName returns undefined for unknown symptom', () => {
      const config = getSymptomConfigByDisplayName('Unknown Symptom');
      
      expect(config).toBeUndefined();
    });

    it('getSymptomConfigById finds correct config', () => {
      const config = getSymptomConfigById('fever');
      
      expect(config).toBeDefined();
      expect(config?.displayName).toBe('Fever');
      expect(config?.category).toBe('systemic');
    });

    it('getSymptomConfigById returns undefined for unknown id', () => {
      const config = getSymptomConfigById('unknown_id');
      
      expect(config).toBeUndefined();
    });
  });

  describe('symptom configurations', () => {
    it('has consistent data structure', () => {
      AVAILABLE_SYMPTOM_CONFIGS.forEach(config => {
        expect(config.id).toBeDefined();
        expect(config.displayName).toBeDefined();
        expect(config.category).toMatch(/^(respiratory|gastrointestinal|neurological|hemorrhagic|systemic)$/);
        expect(config.severity).toMatch(/^(mild|moderate|severe)$/);
        expect(config.weight).toBeGreaterThan(0);
        expect(config.weight).toBeLessThanOrEqual(1);
      });
    });

    it('includes required symptoms from requirements', () => {
      const displayNames = AVAILABLE_SYMPTOM_CONFIGS.map(c => c.displayName);
      
      // Requirements 1.1 specifies these must be included
      expect(displayNames).toContain('Fever');
      expect(displayNames).toContain('Hemorrhage');
      expect(displayNames).toContain('Cough');
    });

    it('has unique ids and display names', () => {
      const ids = AVAILABLE_SYMPTOM_CONFIGS.map(c => c.id);
      const displayNames = AVAILABLE_SYMPTOM_CONFIGS.map(c => c.displayName);
      
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(displayNames).size).toBe(displayNames.length);
    });
  });
});