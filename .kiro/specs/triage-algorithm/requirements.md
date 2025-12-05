
# Requirements Document

## Introduction

The Triage Algorithm is a safety-critical component of the V.I.C.T.O.R. (Viral Incident & Casualty Triage Operations Rig) system that evaluates and scores potential pathogen matches based on patient-reported symptoms and current environmental weather conditions. The algorithm combines symptom pattern matching with weather-influenced transmission risk factors to produce a prioritized list of probable pathogens, enabling rapid clinical decision-making during epidemiological incidents.

## Glossary

- **Triage Algorithm**: The computational system that evaluates and scores pathogen matches based on symptoms and environmental conditions
- **Pathogen**: A disease-causing microorganism (virus, bacteria, etc.) stored in the system database
- **Symptom Match**: A comparison between patient-reported symptoms and known pathogen symptom profiles
- **Environmental Conditions**: Current weather data including temperature, humidity, and other atmospheric measurements
- **Pathogen Score**: A numerical value representing the likelihood that a specific pathogen is responsible for patient symptoms
- **Humidity Survival Range**: The minimum and maximum humidity levels within which a pathogen can remain viable
- **Weather-Influenced Transmission Risk**: The probability of pathogen transmission based on current environmental conditions

## Requirements

### Requirement 1

**User Story:** As a clinical operator, I want the system to evaluate pathogen viability based on current humidity levels, so that non-viable pathogens are excluded from consideration.

#### Acceptance Criteria

1. WHEN the current humidity is below the pathogen's minimum humidity survival threshold, THEN the Triage Algorithm SHALL set the pathogen score to zero
2. WHEN the current humidity is above the pathogen's maximum humidity survival threshold, THEN the Triage Algorithm SHALL set the pathogen score to zero
3. WHEN the current humidity is within the pathogen's survival range, THEN the Triage Algorithm SHALL allow the pathogen to receive a non-zero score

### Requirement 2

**User Story:** As a clinical operator, I want the system to increase pathogen scores based on symptom matches, so that pathogens with matching symptom profiles are prioritized.

#### Acceptance Criteria

1. WHEN patient symptoms match a pathogen's known symptom profile, THEN the Triage Algorithm SHALL increase the pathogen score proportionally to the match quality
2. WHEN no patient symptoms match a pathogen's symptom profile, THEN the Triage Algorithm SHALL maintain a base score or zero score for that pathogen
3. WHEN multiple symptoms match, THEN the Triage Algorithm SHALL calculate a cumulative score increase based on all matching symptoms

### Requirement 3

**User Story:** As a clinical operator, I want the system to combine environmental and symptom factors, so that I receive an accurate prioritized list of probable pathogens.

#### Acceptance Criteria

1. WHEN calculating final pathogen scores, THEN the Triage Algorithm SHALL apply environmental viability checks before symptom scoring
2. WHEN generating output, THEN the Triage Algorithm SHALL return a sorted list of pathogens ordered by descending score
3. WHEN multiple pathogens have identical scores, THEN the Triage Algorithm SHALL maintain consistent ordering based on a secondary criterion such as pathogen identifier