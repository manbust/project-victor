/**
 * Symptom validation and data preparation utilities for the V.I.C.T.O.R. Triage System
 * 
 * This module provides functions for validating symptom selections and preparing
 * symptom data for consumption by the triage algorithm.
 * 
 * Requirements: 1.2 - Validate selection and prepare data for threat analysis
 */

import { Symptom } from './types';

/**
 * Configuration for individual symptoms with epidemiological categorization
 */
export interface SymptomConfig {
  /** Unique symptom identifier */
  id: string;
  /** Display name for the symptom */
  displayName: string;
  /** Symptom category for grouping */
  category: 'respiratory' | 'gastrointestinal' | 'neurological' | 'hemorrhagic' | 'systemic';
  /** Severity level for prioritization */
  severity: 'mild' | 'moderate' | 'severe';
  /** Weight for triage scoring (higher = more significant) */
  weight: number;
}

/**
 * Predefined symptoms available for selection in the V.I.C.T.O.R. system
 * Based on epidemiologically relevant indicators from requirements 1.1, 1.2
 */
export const AVAILABLE_SYMPTOM_CONFIGS: SymptomConfig[] = [
  { id: 'fever', displayName: 'Fever', category: 'systemic', severity: 'moderate', weight: 0.8 },
  { id: 'hemorrhage', displayName: 'Hemorrhage', category: 'hemorrhagic', severity: 'severe', weight: 1.0 },
  { id: 'cough', displayName: 'Cough', category: 'respiratory', severity: 'mild', weight: 0.4 },
  { id: 'headache', displayName: 'Headache', category: 'neurological', severity: 'mild', weight: 0.3 },
  { id: 'nausea', displayName: 'Nausea', category: 'gastrointestinal', severity: 'mild', weight: 0.3 },
  { id: 'vomiting', displayName: 'Vomiting', category: 'gastrointestinal', severity: 'moderate', weight: 0.6 },
  { id: 'diarrhea', displayName: 'Diarrhea', category: 'gastrointestinal', severity: 'moderate', weight: 0.6 },
  { id: 'muscle_aches', displayName: 'Muscle Aches', category: 'systemic', severity: 'mild', weight: 0.4 },
  { id: 'difficulty_breathing', displayName: 'Difficulty Breathing', category: 'respiratory', severity: 'severe', weight: 0.9 },
  { id: 'chest_pain', displayName: 'Chest Pain', category: 'respiratory', severity: 'moderate', weight: 0.7 },
  { id: 'fatigue', displayName: 'Fatigue', category: 'systemic', severity: 'mild', weight: 0.3 },
  { id: 'sore_throat', displayName: 'Sore Throat', category: 'respiratory', severity: 'mild', weight: 0.3 },
  { id: 'abdominal_pain', displayName: 'Abdominal Pain', category: 'gastrointestinal', severity: 'moderate', weight: 0.5 },
  { id: 'confusion', displayName: 'Confusion', category: 'neurological', severity: 'moderate', weight: 0.7 },
  { id: 'seizures', displayName: 'Seizures', category: 'neurological', severity: 'severe', weight: 0.9 }
];

/**
 * Validation result for symptom selection
 */
export interface SymptomValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  errorMessage?: string;
  /** Validated and normalized symptoms */
  validatedSymptoms: Symptom[];
  /** Additional validation warnings */
  warnings: string[];
}

/**
 * Prepared symptom data for triage algorithm consumption
 */
export interface PreparedSymptomData {
  /** Normalized symptom identifiers */
  symptoms: Symptom[];
  /** Total symptom severity score */
  severityScore: number;
  /** Symptoms grouped by category */
  categorizedSymptoms: Record<string, Symptom[]>;
  /** Metadata about the symptom selection */
  metadata: {
    totalSymptoms: number;
    severeCounts: number;
    moderateCounts: number;
    mildCounts: number;
    dominantCategory: string;
  };
}

/**
 * Validates symptom selection according to V.I.C.T.O.R. system requirements
 * 
 * Requirements: 1.2 - Validate selection and prepare data
 * 
 * @param selectedSymptoms - Array of selected symptom display names
 * @param availableSymptoms - Array of available symptom display names
 * @returns Validation result with normalized symptoms or error details
 */
export function validateSymptomSelection(
  selectedSymptoms: string[],
  availableSymptoms: string[]
): SymptomValidationResult {
  const warnings: string[] = [];
  
  // Check if any symptoms are selected
  if (selectedSymptoms.length === 0) {
    return {
      isValid: false,
      errorMessage: 'At least one symptom must be selected for threat analysis',
      validatedSymptoms: [],
      warnings
    };
  }

  // Check for maximum reasonable symptom count (prevent spam/errors)
  if (selectedSymptoms.length > 10) {
    warnings.push('Large number of symptoms selected - consider focusing on primary symptoms');
  }

  // Validate that all selected symptoms are from available list
  const invalidSymptoms = selectedSymptoms.filter(
    symptom => !availableSymptoms.includes(symptom)
  );
  
  if (invalidSymptoms.length > 0) {
    return {
      isValid: false,
      errorMessage: `Invalid symptoms detected: ${invalidSymptoms.join(', ')}`,
      validatedSymptoms: [],
      warnings
    };
  }

  // Remove duplicates and normalize
  const uniqueSymptoms = Array.from(new Set(selectedSymptoms));
  
  if (uniqueSymptoms.length !== selectedSymptoms.length) {
    warnings.push('Duplicate symptoms removed from selection');
  }

  // Convert display names to symptom identifiers
  const validatedSymptoms: Symptom[] = uniqueSymptoms
    .map(displayName => {
      const config = AVAILABLE_SYMPTOM_CONFIGS.find(c => c.displayName === displayName);
      return config ? config.id : displayName.toLowerCase().replace(/\s+/g, '_');
    });

  return {
    isValid: true,
    validatedSymptoms,
    warnings
  };
}

/**
 * Prepares validated symptom data for triage algorithm consumption
 * 
 * Requirements: 1.2 - Format symptom data for triage algorithm consumption
 * 
 * @param validatedSymptoms - Array of validated symptom identifiers
 * @returns Prepared symptom data with metadata and scoring
 */
export function prepareSymptomData(validatedSymptoms: Symptom[]): PreparedSymptomData {
  // Get configurations for validated symptoms
  const symptomConfigs = validatedSymptoms
    .map(symptomId => AVAILABLE_SYMPTOM_CONFIGS.find(c => c.id === symptomId))
    .filter((config): config is SymptomConfig => config !== undefined);

  // Calculate severity score based on symptom weights
  const severityScore = symptomConfigs.reduce((total, config) => total + config.weight, 0);

  // Group symptoms by category
  const categorizedSymptoms = symptomConfigs.reduce((groups, config) => {
    const category = config.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(config.id);
    return groups;
  }, {} as Record<string, Symptom[]>);

  // Calculate severity counts
  const severityCounts = symptomConfigs.reduce(
    (counts, config) => {
      counts[config.severity]++;
      return counts;
    },
    { severe: 0, moderate: 0, mild: 0 }
  );

  // Determine dominant category (most symptoms)
  const dominantCategory = Object.entries(categorizedSymptoms)
    .reduce((max, [category, symptoms]) => 
      symptoms.length > (categorizedSymptoms[max] || []).length ? category : max, 
      'systemic'
    );

  return {
    symptoms: validatedSymptoms,
    severityScore,
    categorizedSymptoms,
    metadata: {
      totalSymptoms: validatedSymptoms.length,
      severeCounts: severityCounts.severe,
      moderateCounts: severityCounts.moderate,
      mildCounts: severityCounts.mild,
      dominantCategory
    }
  };
}

/**
 * Gets available symptom display names for UI components
 * 
 * @returns Array of symptom display names
 */
export function getAvailableSymptomNames(): string[] {
  return AVAILABLE_SYMPTOM_CONFIGS.map(config => config.displayName);
}

/**
 * Gets symptom configuration by display name
 * 
 * @param displayName - Display name of the symptom
 * @returns Symptom configuration or undefined if not found
 */
export function getSymptomConfigByDisplayName(displayName: string): SymptomConfig | undefined {
  return AVAILABLE_SYMPTOM_CONFIGS.find(config => config.displayName === displayName);
}

/**
 * Gets symptom configuration by identifier
 * 
 * @param id - Symptom identifier
 * @returns Symptom configuration or undefined if not found
 */
export function getSymptomConfigById(id: string): SymptomConfig | undefined {
  return AVAILABLE_SYMPTOM_CONFIGS.find(config => config.id === id);
}