# Design Document: Triage Algorithm

## Overview

The Triage Algorithm is a pure computational function that takes patient symptoms and current environmental conditions as input and produces a scored, prioritized list of probable pathogens. The design emphasizes type safety, mathematical precision, and testability to meet safety-critical standards for the V.I.C.T.O.R. system.

The algorithm operates in two phases:
1. **Environmental Filtering** - Eliminates pathogens that cannot survive in current conditions
2. **Symptom Scoring** - Calculates match scores for viable pathogens based on symptom profiles

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Triage Algorithm                          │
│                                                              │
│  ┌────────────────────┐      ┌─────────────────────────┐   │
│  │ Environmental      │      │ Symptom Matching        │   │
│  │ Viability Filter   │─────▶│ Scorer                  │   │
│  └────────────────────┘      └─────────────────────────┘   │
│           │                              │                  │
│           ▼                              ▼                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Score Aggregator & Sorter                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. Input: Patient symptoms + Current weather conditions + Pathogen database
2. For each pathogen:
   - Check environmental viability (humidity range)
   - If viable, calculate symptom match score
   - If not viable, set score to 0
3. Sort pathogens by score (descending)
4. Output: Ordered list of scored pathogens

## Components and Interfaces

### Type Definitions

```typescript
// Core data types
type Symptom = string;

interface WeatherConditions {
  humidity: number; // Percentage (0-100)
  temperature: number; // Celsius
  // Future: pressure, wind, etc.
}

interface PathogenSurvivalRange {
  minHumidity: number; // Percentage (0-100)
  maxHumidity: number; // Percentage (0-100)
}

interface PathogenProfile {
  id: string;
  name: string;
  symptoms: Symptom[];
  survivalRange: PathogenSurvivalRange;
}

interface PatientData {
  symptoms: Symptom[];
}

interface PathogenScore {
  pathogenId: string;
  pathogenName: string;
  score: number;
  isViable: boolean;
}

interface TriageResult {
  scores: PathogenScore[];
  timestamp: Date;
  conditions: WeatherConditions;
}
```

### Core Functions

```typescript
/**
 * Main triage algorithm entry point
 */
function triagePathogens(
  patientData: PatientData,
  weatherConditions: WeatherConditions,
  pathogenDatabase: PathogenProfile[]
): TriageResult;

/**
 * Checks if pathogen can survive in current humidity
 */
function isPathogenViable(
  humidity: number,
  survivalRange: PathogenSurvivalRange
): boolean;

/**
 * Calculates symptom match score (0-100)
 */
function calculateSymptomScore(
  patientSymptoms: Symptom[],
  pathogenSymptoms: Symptom[]
): number;

/**
 * Calculates final pathogen score combining viability and symptoms
 */
function calculatePathogenScore(
  patientData: PatientData,
  weatherConditions: WeatherConditions,
  pathogen: PathogenProfile
): PathogenScore;

/**
 * Sorts pathogen scores in descending order with stable secondary sort
 */
function sortPathogenScores(scores: PathogenScore[]): PathogenScore[];
```

## Data Models

### Pathogen Database Schema

The algorithm expects pathogen data from Supabase with the following structure:

```typescript
// Database table: pathogens
interface PathogenRecord {
  id: string; // UUID
  name: string;
  symptoms: string[]; // Array of symptom strings
  min_humidity_survival: number; // 0-100
  max_humidity_survival: number; // 0-100
  // Additional fields for future use
}
```

### Weather Data Integration

Weather data will be fetched from Open-Meteo API:

```typescript
// Open-Meteo response (relevant fields)
interface OpenMeteoResponse {
  current: {
    relative_humidity_2m: number; // Percentage
    temperature_2m: number; // Celsius
  };
}
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Environmental viability determines score eligibility

*For any* pathogen and humidity value, when the humidity is outside the pathogen's survival range (below minimum OR above maximum), the pathogen score SHALL be zero regardless of symptom matches.

**Validates: Requirements 1.1, 1.2, 3.1**

### Property 2: Viable environment with symptom matches produces non-zero score

*For any* pathogen with at least one matching symptom, when the humidity is within the pathogen's survival range, the pathogen score SHALL be greater than zero.

**Validates: Requirements 1.3**

### Property 3: Symptom match score monotonicity

*For any* pathogen in viable environmental conditions, increasing the number of matching symptoms SHALL result in a score that is greater than or equal to the previous score (monotonically increasing).

**Validates: Requirements 2.1, 2.3**

### Property 4: Zero symptom matches produces zero or base score

*For any* pathogen in viable environmental conditions, when no patient symptoms match the pathogen's symptom profile, the pathogen score SHALL be zero or a defined base score.

**Validates: Requirements 2.2**

### Property 5: Output is sorted in descending order

*For any* triage result, the pathogen scores SHALL be ordered such that for all adjacent pairs (i, i+1), score[i] >= score[i+1].

**Validates: Requirements 3.2**

### Property 6: Deterministic ordering for equal scores

*For any* set of pathogens with identical scores, running the triage algorithm multiple times with the same inputs SHALL produce the same ordering of those pathogens.

**Validates: Requirements 3.3**

## Error Handling

### Input Validation

```typescript
// Validate humidity is in valid range
function validateHumidity(humidity: number): void {
  if (humidity < 0 || humidity > 100) {
    throw new Error(`Invalid humidity: ${humidity}. Must be between 0 and 100.`);
  }
}

// Validate pathogen survival range
function validateSurvivalRange(range: PathogenSurvivalRange): void {
  if (range.minHumidity < 0 || range.minHumidity > 100) {
    throw new Error(`Invalid minHumidity: ${range.minHumidity}`);
  }
  if (range.maxHumidity < 0 || range.maxHumidity > 100) {
    throw new Error(`Invalid maxHumidity: ${range.maxHumidity}`);
  }
  if (range.minHumidity > range.maxHumidity) {
    throw new Error(`minHumidity (${range.minHumidity}) cannot exceed maxHumidity (${range.maxHumidity})`);
  }
}
```

### Error Scenarios

1. **Invalid Humidity Values**: Throw error if humidity is outside 0-100 range
2. **Invalid Survival Range**: Throw error if min > max or values outside 0-100
3. **Empty Pathogen Database**: Return empty result with warning
4. **Empty Patient Symptoms**: Valid input, proceed with zero matches for all pathogens
5. **Malformed Pathogen Data**: Skip invalid records and log warning

### Safety-Critical Considerations

- All numeric calculations use explicit `number` types (no `any`)
- Division operations check for zero denominators
- Array operations validate non-empty inputs where required
- All external data (weather API, database) validated before use

## Testing Strategy

### Unit Testing

The algorithm will use **Vitest** as the testing framework (aligned with Next.js ecosystem).

Unit tests will cover:

1. **Environmental Viability Function**
   - Humidity below minimum returns false
   - Humidity above maximum returns false
   - Humidity within range returns true
   - Edge cases: exactly at min/max boundaries

2. **Symptom Scoring Function**
   - Zero matches returns zero
   - Partial matches return proportional score
   - Complete matches return maximum score
   - Case sensitivity handling

3. **Score Sorting Function**
   - Correctly orders descending scores
   - Handles equal scores deterministically
   - Empty array handling

4. **Integration Tests**
   - Full triage flow with mock data
   - Multiple pathogens with varying viability
   - Edge case: all pathogens non-viable

### Property-Based Testing

The algorithm will use **fast-check** for property-based testing in TypeScript.

Each property-based test will:
- Run a minimum of 100 iterations
- Use smart generators that constrain inputs to valid ranges
- Be tagged with the format: `**Feature: triage-algorithm, Property {number}: {property_text}**`

Property-based tests will validate:

1. **Property 1**: Environmental viability (Requirements 1.1, 1.2, 3.1)
   - Generate random pathogens with random survival ranges
   - Generate random humidity values outside ranges
   - Assert all scores are zero

2. **Property 2**: Viable environment scoring (Requirements 1.3)
   - Generate random pathogens with symptoms
   - Generate humidity within survival range
   - Provide matching symptoms
   - Assert score > 0

3. **Property 3**: Monotonicity (Requirements 2.1, 2.3)
   - Generate random pathogen
   - Generate increasing sets of matching symptoms
   - Assert scores are monotonically increasing

4. **Property 4**: Zero matches (Requirements 2.2)
   - Generate random pathogens
   - Provide non-matching symptoms
   - Assert score is zero or base value

5. **Property 5**: Sorted output (Requirements 3.2)
   - Generate random patient data and pathogens
   - Assert output is sorted descending

6. **Property 6**: Deterministic ordering (Requirements 3.3)
   - Generate random inputs
   - Run algorithm twice
   - Assert identical ordering

### Test Data Generators

```typescript
// fast-check generators
const humidityArbitrary = fc.integer({ min: 0, max: 100 });

const survivalRangeArbitrary = fc.record({
  minHumidity: fc.integer({ min: 0, max: 100 }),
  maxHumidity: fc.integer({ min: 0, max: 100 })
}).filter(range => range.minHumidity <= range.maxHumidity);

const symptomArbitrary = fc.stringOf(fc.char(), { minLength: 3, maxLength: 20 });

const pathogenArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string(),
  symptoms: fc.array(symptomArbitrary, { minLength: 1, maxLength: 10 }),
  survivalRange: survivalRangeArbitrary
});
```

## Implementation Notes

### Scoring Algorithm Details

The symptom match score will be calculated as:

```
symptomScore = (matchingSymptoms / totalPathogenSymptoms) * 100
```

This provides a percentage-based score (0-100) representing match quality.

### Performance Considerations

- Algorithm complexity: O(n * m) where n = number of pathogens, m = average symptoms per pathogen
- For typical use (100-1000 pathogens, 5-20 symptoms each), performance is acceptable
- Future optimization: index symptoms for faster lookup if database grows significantly

### Future Enhancements

1. **Multi-factor Environmental Scoring**: Incorporate temperature, pressure, UV index
2. **Weighted Symptoms**: Assign importance weights to different symptoms
3. **Temporal Factors**: Consider incubation periods and symptom progression
4. **Geographic Risk**: Integrate regional pathogen prevalence data
5. **Confidence Intervals**: Provide uncertainty ranges for scores
