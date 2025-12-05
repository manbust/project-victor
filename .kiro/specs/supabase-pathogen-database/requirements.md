
# Requirements Document

## Introduction

This document specifies the requirements for integrating Supabase as the database backend for the V.I.C.T.O.R. (Viral Incident & Casualty Triage Operations Rig) application and seeding it with a comprehensive dataset of 30 deadly pathogens.

## Glossary

- **VICTOR System**: Viral Incident & Casualty Triage Operations Rig - the epidemiological monitoring application
- **Supabase**: PostgreSQL-based backend-as-a-service platform used for data storage
- **Pathogen**: A biological agent (virus, bacteria, etc.) that causes disease
- **Incubation Period**: Time between infection and symptom onset, measured in days
- **Transmission Vector**: Method by which a pathogen spreads (air or fluid)
- **R0 Score**: Basic reproduction number - average number of people infected by one infected person
- **Humidity Survival Threshold**: Minimum relative humidity percentage


## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to configure Supabase as the database backend, so that the
 VICTOR System can persist and retrieve pathogen data reliably.

#### Acceptance Criteria

1. THE VICTOR System SHALL establish a connection to Supabase using environment-based configuration
2. WHEN the database connection fails, THE VICTOR System SHALL log the error and prevent application startup
3. THE VICTOR System SHALL use TypeScript types that match the database schema for type safety

### Requirement 2

**User Story:** As a developer, I want a pathogens table with specific columns, so that I can store comprehensive epidemiological data for analysis.

#### Acceptance Criteria

1. THE VICTOR System SHALL create a pathogens table with columns for id, name, incubation_period, transmission_vector, min_humidity_survival, and R0_score
2. THE VICTOR System SHALL enforce that the name column contains unique non-null text values
3. THE VICTOR System SHALL store incubation_period as a numeric value representing days
4. THE VICTOR System SHALL restrict transmission_vector values to either "air" or "fluid"
5. THE VICTOR System SHALL store min_humidity_survival as a numeric percentage value between 0 and 100
6. THE VICTOR System SHALL store R0_score as a numeric value greater than or equal to 0

### Requirement 3

**User Story:** As an epidemiologist, I want the database seeded with 30 deadly pathogens, so that I can immediately begin triage operations without manual data entry.

#### Acceptance Criteria

1. THE VICTOR System SHALL populate the pathogens table with exactly 30 pathogen records during initial setup
2. WHEN the database is already seeded, THE VICTOR System SHALL skip re-seeding to prevent duplicate data
3. THE VICTOR System SHALL include pathogens with diverse transmission vectors covering both air and fluid transmission
4. THE VICTOR System SHALL include pathogens with varying incubation periods ranging from 1 to 21 days
5. THE VICTOR System SHALL include pathogens with R0 scores ranging from highly contagious (R0 > 10) to moderately contagious (R0 < 5)

### Requirement 4

**User Story:** As a developer, I want to query pathogen data from the application, so that I can display epidemiological information to users.

#### Acceptance Criteria

1. THE VICTOR System SHALL provide functions to retrieve all pathogens from the database
2. THE VICTOR System SHALL provide functions to retrieve a single pathogen by its unique identifier
3. WHEN querying pathogen data, THE VICTOR System SHALL return strongly-typed results matching the database schema
4. WHEN a database query fails, THE VICTOR System SHALL return an error without crashing the application