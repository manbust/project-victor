# Design Document: Supabase Pathogen Database

## Overview

This design document outlines the integration of Supabase as the database backend for the V.I.C.T.O.R. system, including schema design, data seeding strategy, and query interfaces. The implementation will provide a type-safe, reliable foundation for storing and retrieving epidemiological data about 30 deadly pathogens.

The design follows the project's safety-critical code standards with zero tolerance for `any` types, strict TypeScript typing, and clear separation between database operations and application logic.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│   Next.js Application (App Router)  │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   Server Components/Actions    │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│  ┌──────────▼─────────────────────┐ │
│  │   Database Client Layer        │ │
│  │   (lib/supabase/client.ts)     │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│  ┌──────────▼─────────────────────┐ │
│  │   Query Functions              │ │
│  │   (lib/supabase/queries.ts)    │ │
│  └──────────┬─────────────────────┘ │
└─────────────┼───────────────────────┘
              │
              │ HTTPS/PostgreSQL
              │
┌─────────────▼───────────────────────┐
│         Supabase Backend            │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   PostgreSQL Database          │ │
│  │   - pathogens table            │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Layer Responsibilities

1. **Database Client Layer**: Manages Supabase connection, configuration, and authentication
2. **Query Functions Layer**: Provides type-safe CRUD operations for pathogen data
3. **Seeding Layer**: Handles initial database population with pathogen dataset
4. **Type Definitions Layer**: TypeScript interfaces matching database schema

## Components and Interfaces

### 1. Database Client (`lib/supabase/client.ts`)

**Purpose**: Initialize and export Supabase client instance

**Interface**:
```typescript
export function createClient(): SupabaseClient<Database>
```

**Configuration**:
- Reads `NEXT_PUBLIC_SUPABASE_URL` from environment
- Reads `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment
- Validates configuration on initialization
- Throws error if configuration is missing

### 2. Type Definitions (`lib/supabase/types.ts`)

**Purpose**: Provide strict TypeScript types for database schema

**Interfaces**:
```typescript
export type TransmissionVector = 'air' | 'fluid';

export interface Pathogen {
  id: string;
  name: string;
  incubation_period: number;
  transmission_vector: TransmissionVector;
  min_humidity_survival: number;
  r0_score: number;
  created_at?: string;
}

export interface PathogenInsert {
  name: string;
  incubation_period: number;
  transmission_vector: TransmissionVector;
  min_humidity_survival: number;
  r0_score: number;
}

export type Database = {
  public: {
    Tables: {
      pathogens: {
        Row: Pathogen;
        Insert: PathogenInsert;
        Update: Partial<PathogenInsert>;
      };
    };
  };
};
```

### 3. Query Functions (`lib/supabase/queries.ts`)

**Purpose**: Provide type-safe database operations

**Interface**:
```typescript
// Retrieve all pathogens
export async function getAllPathogens(): Promise<{
  data: Pathogen[] | null;
  error: Error | null;
}>

// Retrieve single pathogen by ID
export async function getPathogenById(id: string): Promise<{
  data: Pathogen | null;
  error: Error | null;
}>

// Insert a single pathogen
export async function insertPathogen(pathogen: PathogenInsert): Promise<{
  data: Pathogen | null;
  error: Error | null;
}>

// Insert multiple pathogens (for seeding)
export async function insertPathogens(pathogens: PathogenInsert[]): Promise<{
  data: Pathogen[] | null;
  error: Error | null;
}>

// Check if database is already seeded
export async function isDatabaseSeeded(): Promise<{
  data: boolean;
  error: Error | null;
}>
```

### 4. Seeding Module (`lib/supabase/seed.ts`)

**Purpose**: Populate database with initial pathogen dataset

**Interface**:
```typescript
export async function seedDatabase(): Promise<{
  success: boolean;
  message: string;
  error?: Error;
}>
```

**Behavior**:
- Checks if database is already seeded (count > 0)
- If seeded, returns early without inserting
- If not seeded, inserts all 30 pathogens in a single transaction
- Returns success/failure status with descriptive message

### 5. Pathogen Dataset (`lib/supabase/pathogen-data.ts`)

**Purpose**: Store the 30 pathogen records as typed constants

**Structure**:
```typescript
export const PATHOGEN_DATASET: PathogenInsert[] = [
  // 30 pathogen records with realistic epidemiological data
];
```

## Data Models

### Pathogens Table Schema

**Table Name**: `pathogens`

**Columns**:

| Column Name           | Type      | Constraints                    | Description                                    |
|-----------------------|-----------|--------------------------------|------------------------------------------------|
| id                    | UUID      | PRIMARY KEY, DEFAULT uuid_v4() | Unique identifier                              |
| name                  | TEXT      | NOT NULL, UNIQUE               | Pathogen name (e.g., "Ebola Virus")           |
| incubation_period     | NUMERIC   | NOT NULL, CHECK (>= 0)         | Days between infection and symptoms            |
| transmission_vector   | TEXT      | NOT NULL, CHECK IN ('air', 'fluid') | How pathogen spreads                    |
| min_humidity_survival | NUMERIC   | NOT NULL, CHECK (0-100)        | Minimum humidity % for survival                |
| r0_score              | NUMERIC   | NOT NULL, CHECK (>= 0)         | Basic reproduction number                      |
| created_at            | TIMESTAMP | DEFAULT NOW()                  | Record creation timestamp                      |

**Indexes**:
- Primary key index on `id`
- Unique index on `name`
- Optional: Index on `transmission_vector` for filtering queries

### Sample Pathogen Records

The dataset will include diverse pathogens such as:

**Airborne Transmission**:
- Measles (R0: 12-18, incubation: 10-14 days)
- Tuberculosis (R0: 2-4, incubation: 2-12 weeks)
- Influenza H1N1 (R0: 1.5-2, incubation: 1-4 days)
- SARS-CoV-2 (R0: 2-3, incubation: 2-14 days)

**Fluid Transmission**:
- Ebola (R0: 1.5-2.5, incubation: 2-21 days)
- HIV (R0: 2-5, incubation: 10-15 days initial)
- Hepatitis B (R0: 2-4, incubation: 30-180 days)
- Cholera (R0: 2-6, incubation: 1-5 days)

## Error Handling

### Connection Errors

**Scenario**: Supabase configuration missing or invalid

**Handling**:
- Throw descriptive error during client initialization
- Prevent application from starting with invalid configuration
- Log error details to console for debugging

**Example**:
```typescript
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}
```

### Query Errors

**Scenario**: Database query fails (network, permissions, etc.)

**Handling**:
- Return error object in result tuple: `{ data: null, error: Error }`
- Never throw exceptions from query functions
- Caller decides how to handle errors (retry, display message, fallback)

**Example**:
```typescript
const { data, error } = await getAllPathogens();
if (error) {
  console.error('Failed to fetch pathogens:', error);
  return <ErrorDisplay message="Unable to load pathogen data" />;
}
```

### Seeding Errors

**Scenario**: Database seeding fails during initialization

**Handling**:
- Return detailed error information in result object
- Log full error stack for debugging
- Allow application to continue (seeding can be retried manually)
- Provide clear error messages distinguishing between:
  - Already seeded (not an error)
  - Permission denied
  - Network failure
  - Data validation failure

### Type Safety Errors

**Scenario**: Runtime data doesn't match TypeScript types

**Handling**:
- Use Supabase's generated types to ensure compile-time safety
- Validate transmission_vector enum values
- Validate numeric ranges for humidity and R0 scores
- Return type errors as part of error object

## Testing Strategy

### Unit Testing

**Framework**: Vitest (already configured in Next.js project)

**Test Coverage**:

1. **Type Definitions Tests** (`types.test.ts`):
   - Verify TransmissionVector type accepts only 'air' or 'fluid'
   - Verify Pathogen interface structure

2. **Query Functions Tests** (`queries.test.ts`):
   - Mock Supabase client responses
   - Test successful data retrieval
   - Test error handling paths
   - Test type safety of returned data

3. **Seeding Logic Tests** (`seed.test.ts`):
   - Test idempotency (doesn't re-seed if already seeded)
   - Test dataset validation
   - Test error handling during seed operations

4. **Pathogen Dataset Tests** (`pathogen-data.test.ts`):
   - Verify exactly 30 records exist
   - Verify all required fields are present
   - Verify transmission_vector values are valid
   - Verify numeric ranges (humidity 0-100, R0 >= 0, incubation >= 0)
   - Verify diversity requirements (both air and fluid transmission)
   - Verify incubation period range (1-21 days)
   - Verify R0 score diversity (some > 10, some < 5)

### Property-Based Testing

**Framework**: fast-check (TypeScript property-based testing library)

**Property Tests**:



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Database constraint enforcement

*For any* pathogen insertion attempt, the database should enforce all validation rules: rejecting duplicate names, invalid transmission vectors (not 'air' or 'fluid'), humidity values outside 0-100 range, and negative R0 scores.

**Validates: Requirements 2.2, 2.4, 2.5, 2.6**

### Property 2: Seeding idempotency

*For any* number of times the seed function is called, the database should contain exactly 30 pathogen records (no duplicates created on subsequent calls).

**Validates: Requirements 3.2**

### Property 3: Pathogen retrieval round-trip

*For any* valid pathogen record inserted into the database, retrieving it by its ID should return an equivalent pathogen with all fields matching the original values.

**Validates: Requirements 4.2**

### Example Tests

The following acceptance criteria are best validated through specific example tests rather than universal properties:

**Example 1: Supabase connection with valid configuration** - Validates Requirements 1.1

**Example 2: Error handling on connection failure** - Validates Requirements 1.2

**Example 3: Schema structure verification** - Validates Requirements 2.1

**Example 4: Incubation period numeric type** - Validates Requirements 2.3

**Example 5: Seed produces exactly 30 records** - Validates Requirements 3.1

**Example 6: Dataset contains both transmission vectors** - Validates Requirements 3.3

**Example 7: Dataset incubation period range** - Validates Requirements 3.4

**Example 8: Dataset R0 score diversity** - Validates Requirements 3.5

**Example 9: getAllPathogens function exists and returns data** - Validates Requirements 4.1

**Example 10: Query error returns error object without crashing** - Validates Requirements 4.4

### Integration Testing

**Test Scenarios**:

1. **End-to-End Seeding Flow**:
   - Start with empty database
   - Run seed function
   - Verify 30 records exist
   - Verify data diversity requirements
   - Run seed function again
   - Verify still 30 records (idempotency)

2. **Query Integration**:
   - Seed database
   - Retrieve all pathogens
   - Verify count and data structure
   - Retrieve specific pathogen by ID
   - Verify data matches

3. **Error Scenarios**:
   - Test with invalid Supabase credentials
   - Test with network disconnection
   - Verify graceful error handling

### Testing Implementation Notes

- Use Supabase local development environment or test database for integration tests
- Mock Supabase client for unit tests to avoid external dependencies
- Property-based tests should run minimum 100 iterations
- Each property-based test must include a comment tag: `// Feature: supabase-pathogen-database, Property X: [property text]`
- Use fast-check library for property-based testing in TypeScript
