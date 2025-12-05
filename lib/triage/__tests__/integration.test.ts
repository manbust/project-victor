/**
 * Integration tests for the V.I.C.T.O.R. Triage Algorithm
 * 
 * Tests realistic scenarios with multiple pathogens and validates
 * compatibility with external data sources (Weather API, Supabase).
 * 
 * Requirements: All
 */

import { describe, it, expect } from 'vitest';
import { triagePathogens } from '../algorithm';
import type {
  PatientData,
  WeatherConditions,
  PathogenProfile,
  TriageResult
} from '../types';
import type { Pathogen } from '../../supabase/types';

/**
 * Helper function to convert Supabase pathogen format to triage algorithm format
 * This simulates the data transformation that would occur in production
 */
function convertSupabasePathogenToProfile(pathogen: Pathogen): PathogenProfile {
  return {
    id: pathogen.id,
    name: pathogen.name,
    symptoms: [], // In production, this would come from a symptoms table
    survivalRange: {
      minHumidity: pathogen.min_humidity_survival,
      maxHumidity: 100 // Supabase schema only stores min, max is assumed 100
    }
  };
}

/**
 * Helper function to simulate Open-Meteo API response transformation
 * This matches the actual weather service implementation
 */
function convertOpenMeteoResponse(apiResponse: {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
  };
}): WeatherConditions {
  return {
    humidity: apiResponse.current.relative_humidity_2m,
    temperature: apiResponse.current.temperature_2m
  };
}

describe('Integration: Triage Algorithm with Multiple Pathogens', () => {
  it('should handle realistic multi-pathogen scenario with varying viability', () => {
    // Realistic patient presentation
    const patientData: PatientData = {
      symptoms: ['fever', 'cough', 'fatigue', 'body aches']
    };

    // Realistic weather conditions (moderate humidity)
    const weatherConditions: WeatherConditions = {
      humidity: 55,
      temperature: 22
    };

    // Realistic pathogen database with diverse characteristics
    const pathogens: PathogenProfile[] = [
      {
        id: 'influenza-a',
        name: 'Influenza A',
        symptoms: ['fever', 'cough', 'fatigue', 'body aches', 'sore throat'],
        survivalRange: { minHumidity: 20, maxHumidity: 80 }
      },
      {
        id: 'covid-19',
        name: 'SARS-CoV-2',
        symptoms: ['fever', 'cough', 'fatigue', 'loss of taste'],
        survivalRange: { minHumidity: 40, maxHumidity: 70 }
      },
      {
        id: 'common-cold',
        name: 'Rhinovirus',
        symptoms: ['cough', 'runny nose', 'sneezing'],
        survivalRange: { minHumidity: 30, maxHumidity: 60 }
      },
      {
        id: 'ebola',
        name: 'Ebola Virus',
        symptoms: ['fever', 'fatigue', 'vomiting', 'bleeding'],
        survivalRange: { minHumidity: 60, maxHumidity: 90 }
      },
      {
        id: 'measles',
        name: 'Measles',
        symptoms: ['fever', 'cough', 'rash', 'conjunctivitis'],
        survivalRange: { minHumidity: 10, maxHumidity: 40 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    // Verify result structure
    expect(result.scores).toHaveLength(5);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.conditions).toEqual(weatherConditions);

    // Verify viability filtering
    // Humidity 55: Influenza (20-80), COVID (40-70), Rhinovirus (30-60) are viable
    // Ebola (60-90) and Measles (10-40) are non-viable
    const viableScores = result.scores.filter(s => s.isViable);
    const nonViableScores = result.scores.filter(s => !s.isViable);
    
    expect(viableScores.length).toBe(3);
    expect(nonViableScores.length).toBe(2);

    // Verify non-viable pathogens have zero scores
    nonViableScores.forEach(score => {
      expect(score.score).toBe(0);
    });

    // Verify sorting (descending by score)
    for (let i = 0; i < result.scores.length - 1; i++) {
      expect(result.scores[i].score).toBeGreaterThanOrEqual(result.scores[i + 1].score);
    }

    // Verify Influenza scores highest (4/5 symptoms match = 80%)
    expect(result.scores[0].pathogenName).toBe('Influenza A');
    expect(result.scores[0].score).toBe(80);
    expect(result.scores[0].isViable).toBe(true);
  });

  it('should handle outbreak scenario with high symptom overlap', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough', 'shortness of breath']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: 20
    };

    // Multiple respiratory pathogens with overlapping symptoms
    const pathogens: PathogenProfile[] = [
      {
        id: 'covid-19',
        name: 'SARS-CoV-2',
        symptoms: ['fever', 'cough', 'shortness of breath', 'fatigue'],
        survivalRange: { minHumidity: 40, maxHumidity: 70 }
      },
      {
        id: 'influenza',
        name: 'Influenza',
        symptoms: ['fever', 'cough', 'body aches'],
        survivalRange: { minHumidity: 20, maxHumidity: 80 }
      },
      {
        id: 'rsv',
        name: 'RSV',
        symptoms: ['cough', 'shortness of breath', 'wheezing'],
        survivalRange: { minHumidity: 30, maxHumidity: 60 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    // All pathogens are viable
    expect(result.scores.every(s => s.isViable)).toBe(true);

    // COVID-19 should score highest (3/4 = 75%)
    expect(result.scores[0].pathogenName).toBe('SARS-CoV-2');
    expect(result.scores[0].score).toBe(75);

    // For equal scores (66.67%), ordering is deterministic by pathogen ID
    // 'influenza' comes before 'rsv' alphabetically
    expect(result.scores[1].pathogenName).toBe('Influenza');
    expect(result.scores[1].score).toBeCloseTo(66.67, 1);

    expect(result.scores[2].pathogenName).toBe('RSV');
    expect(result.scores[2].score).toBeCloseTo(66.67, 1);
  });

  it('should handle extreme weather conditions eliminating most pathogens', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough', 'headache']
    };

    // Very low humidity
    const weatherConditions: WeatherConditions = {
      humidity: 5,
      temperature: 25
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Humidity Sensitive A',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 40, maxHumidity: 80 }
      },
      {
        id: 'pathogen-2',
        name: 'Humidity Sensitive B',
        symptoms: ['fever', 'headache'],
        survivalRange: { minHumidity: 50, maxHumidity: 70 }
      },
      {
        id: 'pathogen-3',
        name: 'Drought Resistant',
        symptoms: ['fever', 'cough', 'headache'],
        survivalRange: { minHumidity: 0, maxHumidity: 30 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    // Only one pathogen should be viable
    const viableScores = result.scores.filter(s => s.isViable);
    expect(viableScores).toHaveLength(1);
    expect(viableScores[0].pathogenName).toBe('Drought Resistant');
    expect(viableScores[0].score).toBe(100);

    // Other pathogens should have zero scores
    const nonViableScores = result.scores.filter(s => !s.isViable);
    expect(nonViableScores).toHaveLength(2);
    nonViableScores.forEach(score => {
      expect(score.score).toBe(0);
    });
  });

  it('should handle scenario with no symptom matches but viable environment', () => {
    const patientData: PatientData = {
      symptoms: ['unusual symptom A', 'unusual symptom B']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: 20
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Common Pathogen',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 30, maxHumidity: 70 }
      },
      {
        id: 'pathogen-2',
        name: 'Another Pathogen',
        symptoms: ['headache', 'nausea'],
        survivalRange: { minHumidity: 40, maxHumidity: 60 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    // All pathogens are viable but have zero symptom scores
    expect(result.scores.every(s => s.isViable)).toBe(true);
    expect(result.scores.every(s => s.score === 0)).toBe(true);
  });

  it('should handle empty pathogen database gracefully', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: 20
    };

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      []
    );

    expect(result.scores).toHaveLength(0);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.conditions).toEqual(weatherConditions);
  });

  it('should handle empty patient symptoms gracefully', () => {
    const patientData: PatientData = {
      symptoms: []
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: 20
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'pathogen-1',
        name: 'Test Pathogen',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 30, maxHumidity: 70 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    expect(result.scores).toHaveLength(1);
    expect(result.scores[0].isViable).toBe(true);
    expect(result.scores[0].score).toBe(0); // No symptoms to match
  });
});

describe('Integration: Weather API Data Format Compatibility', () => {
  it('should correctly process Open-Meteo API response format', () => {
    // Simulated Open-Meteo API response
    const openMeteoResponse = {
      current: {
        temperature_2m: 18.5,
        relative_humidity_2m: 65
      }
    };

    // Convert to WeatherConditions format
    const weatherConditions: WeatherConditions = convertOpenMeteoResponse(openMeteoResponse);

    expect(weatherConditions.humidity).toBe(65);
    expect(weatherConditions.temperature).toBe(18.5);

    // Use in triage algorithm
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'test-pathogen',
        name: 'Test Pathogen',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 50, maxHumidity: 80 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    // Verify weather conditions are preserved in result
    expect(result.conditions.humidity).toBe(65);
    expect(result.conditions.temperature).toBe(18.5);

    // Verify pathogen is viable with these conditions
    expect(result.scores[0].isViable).toBe(true);
    expect(result.scores[0].score).toBe(100);
  });

  it('should handle edge case humidity values from weather API', () => {
    // Test boundary conditions
    const edgeCases = [
      { humidity: 0, temperature: 20 },
      { humidity: 100, temperature: 20 },
      { humidity: 50.5, temperature: 15.3 }
    ];

    const patientData: PatientData = {
      symptoms: ['fever']
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'wide-range',
        name: 'Wide Range Pathogen',
        symptoms: ['fever'],
        survivalRange: { minHumidity: 0, maxHumidity: 100 }
      }
    ];

    edgeCases.forEach(conditions => {
      const result: TriageResult = triagePathogens(
        patientData,
        conditions,
        pathogens
      );

      expect(result.conditions).toEqual(conditions);
      expect(result.scores[0].isViable).toBe(true);
    });
  });

  it('should handle realistic weather variations throughout the day', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const pathogen: PathogenProfile = {
      id: 'humidity-dependent',
      name: 'Humidity Dependent Pathogen',
      symptoms: ['fever', 'cough'],
      survivalRange: { minHumidity: 40, maxHumidity: 70 }
    };

    // Morning: high humidity
    const morningConditions: WeatherConditions = {
      humidity: 75,
      temperature: 15
    };

    const morningResult = triagePathogens(
      patientData,
      morningConditions,
      [pathogen]
    );

    expect(morningResult.scores[0].isViable).toBe(false);
    expect(morningResult.scores[0].score).toBe(0);

    // Afternoon: moderate humidity
    const afternoonConditions: WeatherConditions = {
      humidity: 55,
      temperature: 25
    };

    const afternoonResult = triagePathogens(
      patientData,
      afternoonConditions,
      [pathogen]
    );

    expect(afternoonResult.scores[0].isViable).toBe(true);
    expect(afternoonResult.scores[0].score).toBe(100);

    // Evening: low humidity
    const eveningConditions: WeatherConditions = {
      humidity: 30,
      temperature: 20
    };

    const eveningResult = triagePathogens(
      patientData,
      eveningConditions,
      [pathogen]
    );

    expect(eveningResult.scores[0].isViable).toBe(false);
    expect(eveningResult.scores[0].score).toBe(0);
  });

  it('should handle negative temperatures from weather API', () => {
    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: -10 // Cold winter conditions
    };

    const pathogens: PathogenProfile[] = [
      {
        id: 'cold-resistant',
        name: 'Cold Resistant Pathogen',
        symptoms: ['fever', 'cough'],
        survivalRange: { minHumidity: 40, maxHumidity: 60 }
      }
    ];

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogens
    );

    // Temperature doesn't affect viability (only humidity does)
    expect(result.scores[0].isViable).toBe(true);
    expect(result.conditions.temperature).toBe(-10);
  });
});

describe('Integration: Supabase Pathogen Data Format Compatibility', () => {
  it('should correctly convert Supabase pathogen format to triage format', () => {
    // Simulated Supabase pathogen record
    const supabasePathogen: Pathogen = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Ebola Virus',
      incubation_period: 10,
      transmission_vector: 'fluid',
      min_humidity_survival: 50,
      r0_score: 2.0,
      created_at: '2024-01-01T00:00:00Z'
    };

    // Convert to PathogenProfile format
    const pathogenProfile: PathogenProfile = convertSupabasePathogenToProfile(supabasePathogen);

    expect(pathogenProfile.id).toBe(supabasePathogen.id);
    expect(pathogenProfile.name).toBe(supabasePathogen.name);
    expect(pathogenProfile.survivalRange.minHumidity).toBe(supabasePathogen.min_humidity_survival);
    expect(pathogenProfile.survivalRange.maxHumidity).toBe(100);
    expect(pathogenProfile.symptoms).toEqual([]); // Empty in this test
  });

  it('should handle multiple Supabase pathogens in realistic triage scenario', () => {
    // Simulated Supabase query result
    const supabasePathogens: Pathogen[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Ebola Virus',
        incubation_period: 10,
        transmission_vector: 'fluid',
        min_humidity_survival: 60,
        r0_score: 2.0,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Measles',
        incubation_period: 12,
        transmission_vector: 'air',
        min_humidity_survival: 20,
        r0_score: 15.0,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '323e4567-e89b-12d3-a456-426614174002',
        name: 'Influenza A',
        incubation_period: 2,
        transmission_vector: 'air',
        min_humidity_survival: 30,
        r0_score: 1.3,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    // Convert to PathogenProfile format and add symptoms
    const pathogenProfiles: PathogenProfile[] = supabasePathogens.map(sp => ({
      ...convertSupabasePathogenToProfile(sp),
      symptoms: sp.name === 'Ebola Virus' 
        ? ['fever', 'fatigue', 'vomiting', 'bleeding']
        : sp.name === 'Measles'
        ? ['fever', 'cough', 'rash', 'conjunctivitis']
        : ['fever', 'cough', 'body aches', 'fatigue']
    }));

    const patientData: PatientData = {
      symptoms: ['fever', 'cough', 'fatigue']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 45,
      temperature: 22
    };

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogenProfiles
    );

    // Verify all pathogens are processed
    expect(result.scores).toHaveLength(3);

    // Verify viability based on Supabase min_humidity_survival
    // Humidity 45: Measles (20-100) and Influenza (30-100) are viable
    // Ebola (60-100) is non-viable
    const viableScores = result.scores.filter(s => s.isViable);
    const nonViableScores = result.scores.filter(s => !s.isViable);
    
    expect(viableScores.length).toBe(2);
    expect(nonViableScores.length).toBe(1);
    expect(nonViableScores[0].pathogenName).toBe('Ebola Virus');

    // Verify Influenza scores highest (3/4 = 75%)
    expect(result.scores[0].pathogenName).toBe('Influenza A');
    expect(result.scores[0].score).toBe(75);
  });

  it('should handle Supabase pathogens with extreme humidity requirements', () => {
    const supabasePathogens: Pathogen[] = [
      {
        id: '1',
        name: 'Desert Pathogen',
        incubation_period: 5,
        transmission_vector: 'air',
        min_humidity_survival: 0, // Survives in very dry conditions
        r0_score: 1.5,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Tropical Pathogen',
        incubation_period: 7,
        transmission_vector: 'fluid',
        min_humidity_survival: 90, // Requires very high humidity
        r0_score: 2.5,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    const pathogenProfiles: PathogenProfile[] = supabasePathogens.map(sp => ({
      ...convertSupabasePathogenToProfile(sp),
      symptoms: ['fever', 'headache']
    }));

    const patientData: PatientData = {
      symptoms: ['fever', 'headache']
    };

    // Test with moderate humidity
    const moderateHumidity: WeatherConditions = {
      humidity: 50,
      temperature: 25
    };

    const result = triagePathogens(
      patientData,
      moderateHumidity,
      pathogenProfiles
    );

    // Only Desert Pathogen should be viable
    const viableScores = result.scores.filter(s => s.isViable);
    expect(viableScores.length).toBe(1);
    expect(viableScores[0].pathogenName).toBe('Desert Pathogen');
  });

  it('should preserve Supabase UUID format in triage results', () => {
    const supabasePathogen: Pathogen = {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Valid UUID
      name: 'Test Pathogen',
      incubation_period: 5,
      transmission_vector: 'air',
      min_humidity_survival: 40,
      r0_score: 1.8,
      created_at: '2024-01-01T00:00:00Z'
    };

    const pathogenProfile: PathogenProfile = {
      ...convertSupabasePathogenToProfile(supabasePathogen),
      symptoms: ['fever']
    };

    const patientData: PatientData = {
      symptoms: ['fever']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: 20
    };

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      [pathogenProfile]
    );

    // Verify UUID is preserved exactly
    expect(result.scores[0].pathogenId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
    
    // Verify UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(result.scores[0].pathogenId).toMatch(uuidRegex);
  });

  it('should handle all Supabase transmission vectors correctly', () => {
    const supabasePathogens: Pathogen[] = [
      {
        id: '1',
        name: 'Airborne Pathogen',
        incubation_period: 3,
        transmission_vector: 'air',
        min_humidity_survival: 30,
        r0_score: 2.1,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: 'Fluid Transmitted Pathogen',
        incubation_period: 8,
        transmission_vector: 'fluid',
        min_humidity_survival: 40,
        r0_score: 1.7,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    const pathogenProfiles: PathogenProfile[] = supabasePathogens.map(sp => ({
      ...convertSupabasePathogenToProfile(sp),
      symptoms: ['fever', 'cough']
    }));

    const patientData: PatientData = {
      symptoms: ['fever', 'cough']
    };

    const weatherConditions: WeatherConditions = {
      humidity: 50,
      temperature: 20
    };

    const result: TriageResult = triagePathogens(
      patientData,
      weatherConditions,
      pathogenProfiles
    );

    // Both should be viable and have equal scores
    expect(result.scores).toHaveLength(2);
    expect(result.scores.every(s => s.isViable)).toBe(true);
    expect(result.scores.every(s => s.score === 100)).toBe(true);

    // Verify transmission vector doesn't affect triage (it's not used in current algorithm)
    const airbornePathogen = result.scores.find(s => s.pathogenName === 'Airborne Pathogen');
    const fluidPathogen = result.scores.find(s => s.pathogenName === 'Fluid Transmitted Pathogen');
    
    expect(airbornePathogen).toBeDefined();
    expect(fluidPathogen).toBeDefined();
    expect(airbornePathogen!.score).toBe(fluidPathogen!.score);
  });
});