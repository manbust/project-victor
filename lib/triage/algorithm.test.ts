/**
 * Unit tests for the main triage algorithm
 * 
 * Tests the integration of viability checking, symptom scoring, and sorting
 * to ensure the complete triage flow works correctly.
 */

import { describe, it, expect } from 'vitest';
import { triagePathogens } from './algorithm';
import {
  PatientData,
  WeatherConditions,
  PathogenProfile,
  TriageResult
} from './types';

describe('triagePathogens', () => {
  const mockWeatherConditions: WeatherConditions = {
    humidity: 60,
    temperature: 20
  };

  it('should return empty scores for empty pathogen database', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      []
    );

    expect(result.scores).toEqual([]);
    expect(result.conditions).toEqual(mockWeatherConditions);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should score viable pathogens with matching symptoms higher', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough', 'headache']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Influenza',
        symptoms: ['fever', 'cough', 'headache'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      },
      {
        id: 'pathogen-2',
        name: 'Common Cold',
        symptoms: ['cough', 'runny nose'],
        survivalRange: { minHumidity: 30, maxHumidity: 70 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      pathogens
    );

    expect(result.scores).toHaveLength(2);
    // Influenza should score higher (3/3 = 100%) than Common Cold (1/2 = 50%)
    expect(result.scores[0].pathogenName).toBe('Influenza');
    expect(result.scores[0].score).toBe(100);
    expect(result.scores[1].pathogenName).toBe('Common Cold');
    expect(result.scores[1].score).toBe(50);
  });

  it('should set score to zero for non-viable pathogens', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Heat-Sensitive Virus',
        symptoms: ['fever', 'cough'],
        // Humidity 60 is outside this range
        survivalRange: { minHumidity: 70, maxHumidity: 90 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      pathogens
    );

    expect(result.scores).toHaveLength(1);
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].isViable).toBe(false);
  });

  it('should handle empty patient symptoms', () => {
    const patientData: PatientData = {
      symptoms: []
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Test Pathogen',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      pathogens
    );

    expect(result.scores).toHaveLength(1);
    // No symptoms match, so score should be zero
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].isViable).toBe(true);
  });

  it('should sort pathogens by score in descending order', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough', 'headache']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Low Match',
        symptoms: ['fever', 'rash', 'nausea', 'vomiting'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      },
      {
        id: 'pathogen-2',
        name: 'High Match',
        symptoms: ['fever', 'cough', 'headache'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      },
      {
        id: 'pathogen-3',
        name: 'Medium Match',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      pathogens
    );

    expect(result.scores).toHaveLength(3);
    // Should be sorted: High (100%), Medium (100%), Low (25%)
    expect(result.scores[0].pathogenName).toBe('High Match');
    expect(result.scores[0].score).toBe(100);
    expect(result.scores[1].pathogenName).toBe('Medium Match');
    expect(result.scores[1].score).toBe(100);
    expect(result.scores[2].pathogenName).toBe('Low Match');
    expect(result.scores[2].score).toBe(25);
  });

  it('should include timestamp and conditions in result', () => {
    const patientData: PatientData = {
      symptoms: ['fever']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Test Pathogen',
        symptoms: ['fever'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      pathogens
    );

    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.conditions).toEqual(mockWeatherConditions);
  });

  it('should handle all pathogens being non-viable', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Pathogen A',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 10, maxHumidity: 30 }
      },
      {
        id: 'pathogen-2',
        name: 'Pathogen B',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 80, maxHumidity: 95 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      mockWeatherConditions,
      pathogens
    );

    expect(result.scores).toHaveLength(2);
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[1].score).toBe(0);
    expect(result.scores[0].isViable).toBe(false);
    expect(result.scores[1].isViable).toBe(false);
  });
});
