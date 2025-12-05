/**
 * Core type definitions for the V.I.C.T.O.R. Triage Algorithm
 * 
 * This module defines all TypeScript interfaces and types used throughout
 * the triage system for evaluating pathogen matches based on symptoms
 * and environmental conditions.
 */

/**
 * Represents a single symptom as a string identifier.
 * Examples: "fever", "cough", "headache"
 */
export type Symptom = string;

/**
 * Current weather and environmental conditions used for pathogen viability assessment.
 * 
 * @property humidity - Relative humidity percentage (0-100)
 * @property temperature - Temperature in Celsius
 * @property windSpeed - Optional wind speed in km/h
 * @property windDirection - Optional wind direction in degrees (0-360)
 */
export interface WeatherConditions {
  /** Relative humidity as a percentage (0-100) */
  humidity: number;
  /** Temperature in degrees Celsius */
  temperature: number;
  /** Optional wind speed in km/h */
  windSpeed?: number;
  /** Optional wind direction in degrees (0-360) */
  windDirection?: number;
}

/**
 * Defines the humidity range within which a pathogen can remain viable.
 * 
 * @property minHumidity - Minimum humidity percentage for pathogen survival (0-100)
 * @property maxHumidity - Maximum humidity percentage for pathogen survival (0-100)
 */
export interface PathogenSurvivalRange {
  /** Minimum humidity percentage for pathogen survival (0-100) */
  minHumidity: number;
  /** Maximum humidity percentage for pathogen survival (0-100) */
  maxHumidity: number;
}

/**
 * Complete profile of a pathogen including identification, symptoms, and survival parameters.
 * 
 * @property id - Unique identifier for the pathogen (typically UUID)
 * @property name - Human-readable name of the pathogen
 * @property symptoms - Array of symptoms associated with this pathogen
 * @property survivalRange - Humidity range for pathogen viability
 */
export interface PathogenProfile {
  /** Unique identifier for the pathogen (typically UUID) */
  id: string;
  /** Human-readable name of the pathogen */
  name: string;
  /** Array of symptoms associated with this pathogen */
  symptoms: Symptom[];
  /** Humidity range for pathogen viability */
  survivalRange: PathogenSurvivalRange;
}

/**
 * Patient data containing reported symptoms for triage evaluation.
 * 
 * @property symptoms - Array of symptoms reported by the patient
 */
export interface PatientData {
  /** Array of symptoms reported by the patient */
  symptoms: Symptom[];
}

/**
 * Calculated score for a single pathogen based on environmental viability and symptom matching.
 * 
 * @property pathogenId - Unique identifier of the scored pathogen
 * @property pathogenName - Human-readable name of the pathogen
 * @property score - Numerical score representing match likelihood (0-100)
 * @property isViable - Whether the pathogen can survive in current environmental conditions
 */
export interface PathogenScore {
  /** Unique identifier of the scored pathogen */
  pathogenId: string;
  /** Human-readable name of the pathogen */
  pathogenName: string;
  /** Numerical score representing match likelihood (0-100) */
  score: number;
  /** Whether the pathogen can survive in current environmental conditions */
  isViable: boolean;
}

/**
 * Complete triage result containing all scored pathogens and contextual information.
 * 
 * @property scores - Array of pathogen scores, sorted in descending order by score
 * @property timestamp - Date and time when the triage was performed
 * @property conditions - Weather conditions used for the triage calculation
 */
export interface TriageResult {
  /** Array of pathogen scores, sorted in descending order by score */
  scores: PathogenScore[];
  /** Date and time when the triage was performed */
  timestamp: Date;
  /** Weather conditions used for the triage calculation */
  conditions: WeatherConditions;
}
