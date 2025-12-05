/**
 * Unit tests for symptom scoring functions
 * 
 * Tests core functionality of symptom matching and pathogen scoring
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateSymptomScore, 
  calculatePathogenScore,
  sortPathogenScores 
} from './scoring';
import { 
  PatientData, 
  PathogenProfile, 
  WeatherConditions,
  PathogenScore 
} from './types';

describe('calculateSymptomScore', () => {
  it('returns 0 when no symptoms match', () => {
    const patientSymptoms: string[] = ['fever', 'cough'];
    const pathogenSymptoms: string[] = ['rash', 'nausea'];
    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(0);
  });

  it('returns 100 when all symptoms match', () => {
    const patientSymptoms: string[] = ['fever', 'cough', 'headache'];
    const pathogenSymptoms: string[] = ['fever', 'cough', 'headache'];
    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(100);
  });

  it('returns proportional score for partial matches', () => {
    const patientSymptoms: string[] = ['fever', 'cough', 'headache', 'nausea'];
    const pathogenSymptoms: string[] = ['fever', 'cough'];
    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(100);
  });

  it('calculates percentage correctly when some symptoms match', () => {
    const patientSymptoms: string[] = ['fever', 'cough'];
    const pathogenSymptoms: string[] = ['fever', 'cough', 'rash', 'nausea'];
    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(50);
  });

  it('handles empty patient symptoms', () => {
    const patientSymptoms: string[] = [];
    const pathogenSymptoms: string[] = ['fever', 'cough'];
    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(0);
  });

  it('handles empty pathogen symptoms', () => {
    const patientSymptoms: string[] = ['fever', 'cough'];
    const pathogenSymptoms: string[] = [];
    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(0);
  });

  it('performs case-insensitive matching', () => {
    const patientSymptoms: string[] = ['FEVER', 'Cough'];
    const pathogenSymptoms: string[] = ['fever', 'cough'];

    
    const score: number = calculateSymptomScore(patientSymptoms, pathogenSymptoms);
    
    expect(score).toBe(100);
  });
});

describe('calculatePathogenScore', () => {
  const viableConditions: WeatherConditions = {
    humidity: 50,
    temperature: 20
  };

  const nonViableConditions: WeatherConditions = {
    humidity: 10,
    temperature: 20
  };

  const testPathogen: PathogenProfile = {
    id: 'pathogen-1',
    name: 'Test Pathogen',
    symptoms: ['fever', 'cough'],
    survivalRange: {
      minHumidity: 40,
      maxHumidity: 60
    }
  };

  it('returns zero score when environment is non-viable', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const result: PathogenScore = calculatePathogenScore(
      patientData,
      nonViableConditions,
      testPathogen
    );

    expect(result.score).toBe(0);
    expect(result.isViable).toBe(false);
    
expect(result.pathogenId).toBe('pathogen-1');
    expect(result.pathogenName).toBe('Test Pathogen');
  });

  it('calculates symptom score when environment is viable', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const result: PathogenScore = calculatePathogenScore(
      patientData,
      viableConditions,
      testPathogen
    );

    expect(result.score).toBe(100);
    expect(result.isViable).toBe(true);
    expect(result.pathogenId).toBe('pathogen-1');
    expect(result.pathogenName).toBe('Test Pathogen');
  });

  it('returns zero score for viable environment with no symptom matches', () => {
    const patientData: PatientData = {
      symptoms: ['rash', 'nausea']
    };

    const result: PathogenScore = calculatePathogenScore(
      patientData,
      viableConditions,
      testPathogen
    );

    expect(result.score).toBe(0);
    expect(result.isViable).toBe(true);
  });
});

describe('sortPathogenScores', () => {
  it('sorts scores in descending order', () => {
    const scores: PathogenScore[] = [
      { pathogenId: 'p1', pathogenName: 'P1', score: 30, isViable: true },
      { pathogenId: 'p2', pathogenName: 'P2', score: 80, isViable: true },
      { pathogenId: 'p3', pathogenName: 'P3', score: 50, isViable: true }
    ];

    const sorted: PathogenScore[] = sortPathogenScores(scores);

    expect(sorted[0].score).toBe(80);
    expect(sorted[1].score).toBe(50);
    expect(sorted[2].score).toBe(30);
  });

  it('handles equal scores with deterministic ordering by ID', () => {
    const scores: PathogenScore[] = [
      { pathogenId: 'p-charlie', pathogenName: 'C', score: 50, isViable: true },
      { pathogenId: 'p-alpha', pathogenName: 'A', score: 50, isViable: true },
      { pathogenId: 'p-bravo', pathogenName: 'B', score: 50, isViable: true }
    ];

    const sorted: PathogenScore[] = sortPathogenScores(scores);

    expect(sorted[0].pathogenId).toBe('p-alpha');
    expect(sorted[1].pathogenId).toBe('p-bravo');
    expect
(sorted[2].pathogenId).toBe('p-charlie');
  });

  it('handles empty array', () => {
    const scores: PathogenScore[] = [];
    const sorted: PathogenScore[] = sortPathogenScores(scores);
    
    expect(sorted).toEqual([]);
  });

  it('does not mutate input array', () => {
    const scores: PathogenScore[] = [
      { pathogenId: 'p1', pathogenName: 'P1', score: 30, isViable: true },
      { pathogenId: 'p2', pathogenName: 'P2', score: 80, isViable: true }
    ];

    const originalOrder: PathogenScore[] = [...scores];
    sortPathogenScores(scores);

    expect(scores).toEqual(originalOrder);
  });

  it('maintains stable sort for complex mixed scores', () => {
    const scores: PathogenScore[] = [
      { pathogenId: 'p-delta', pathogenName: 'D', score: 50, isViable: true },
      { pathogenId: 'p-alpha', pathogenName: 'A', score: 80, isViable: true },
      { pathogenId: 'p-charlie', pathogenName: 'C', score: 50, isViable: true },
      { pathogenId: 'p-bravo', pathogenName: 'B', score: 80, isViable: true }
    ];

    const sorted: PathogenScore[] = sortPathogenScores(scores);

    expect(sorted[0].score).toBe(80);
    expect(sorted[0].pathogenId).toBe('p-alpha');
    expect(sorted[1].score).toBe(80);
    expect(sorted[1].pathogenId).toBe('p-bravo');
    
    expect(sorted[2].score).toBe(50);
    expect(sorted[2].pathogenId).toBe('p-charlie');
    expect(sorted[3].score).toBe(50);
    expect(sorted[3].pathogenId).toBe('p-delta');
  });
});
