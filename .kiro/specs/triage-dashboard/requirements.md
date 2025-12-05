# Requirements Document

## Introduction

The Triage Dashboard is a critical component of the V.I.C.T.O.R. system that enables epidemiological threat assessment and visualization. It integrates symptom analysis, pathogen identification, and dispersion modeling to provide real-time threat visualization for emergency response teams.

## Glossary

- **Triage_Dashboard**: The main interface component for threat assessment and visualization
- **TriagePanel**: User interface component for symptom selection and threat analysis
- **Pathogen_Library**: Supabase database containing pathogen characteristics and transmission data
- **PlumeParameters**: Configuration parameters for visualizing pathogen dispersion patterns
- **R0_Score**: Basic reproduction number indicating pathogen transmission potential
- **Transmission_Vector**: Method of pathogen spread (Air, Fluid, Contact)
- **Bio_Hazard_Alert**: Visual warning overlay for high-risk pathogen threats

## Requirements

### Requirement 1

**User Story:** As an emergency response analyst, I want to input observed symptoms into the system, so that I can identify potential biological threats based on clinical presentations.

#### Acceptance Criteria

1. THE Triage_Dashboard SHALL provide a TriagePanel component with predefined symptom options including "Fever", "Hemorrhage", "Cough", and other epidemiologically relevant indicators
2. WHEN a user selects symptoms from the available list, THE Triage_Dashboard SHALL validate the selection and prepare the data for threat analysis
3. THE TriagePanel SHALL display symptoms in a clear, accessible interface suitable for rapid selection during emergency situations

### Requirement 2

**User Story:** As an epidemiologist, I want the system to automatically gather environmental data and pathogen information, so that threat analysis incorporates current conditions and known pathogen characteristics.

#### Acceptance Criteria

1. WHEN symptoms are submitted, THE Triage_Dashboard SHALL fetch live weather data for the current map center coordinates
2. WHEN environmental data is retrieved, THE Triage_Dashboard SHALL query the Pathogen_Library in Supabase for relevant pathogen information
3. THE Triage_Dashboard SHALL handle network failures gracefully and provide appropriate error messaging when data retrieval fails

### Requirement 3

**User Story:** As a threat assessment specialist, I want to see a prioritized list of potential biological threats, so that I can focus response efforts on the most likely and dangerous pathogens.

#### Acceptance Criteria

1. WHEN symptom and environmental data are available, THE Triage_Dashboard SHALL execute the triagePathogens algorithm to analyze potential threats
2. THE Triage_Dashboard SHALL display a ranked list of "Detected Threats" ordered by likelihood and severity
3. WHEN threat analysis completes, THE Triage_Dashboard SHALL present results with clear threat indicators and confidence levels

### Requirement 4

**User Story:** As a field commander, I want to visualize how a selected pathogen might spread, so that I can plan containment and evacuation strategies.

#### Acceptance Criteria

1. WHEN a user selects a specific threat from the detected threats list, THE Triage_Dashboard SHALL automatically update the Map's PlumeParameters for dispersion visualization
2. WHEN updating plume parameters, THE Triage_Dashboard SHALL map Pathogen R0_Score to Emission Rate for dispersion calculations
3. WHEN configuring dispersion modeling, THE Triage_Dashboard SHALL map Transmission_Vector to Stack Height where Airborne transmission uses high stack height and Fluid transmission uses ground level stack height
4. WHEN generating dispersion visualization, THE Triage_Dashboard SHALL incorporate current wind data to determine Plume Direction

### Requirement 5

**User Story:** As a safety officer, I want clear visual alerts for high-risk situations, so that personnel can take appropriate protective measures immediately.

#### Acceptance Criteria

1. WHEN a pathogen with high R0_Score is selected, THE Triage_Dashboard SHALL display a prominent "Bio-Hazard" alert overlay
2. THE Bio_Hazard_Alert SHALL use high-contrast visual indicators consistent with the system's dark clinical aesthetic
3. THE Triage_Dashboard SHALL maintain alert visibility until the threat is cleared or a different pathogen is selected