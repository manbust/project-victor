'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Symptom } from '@/lib/triage/types';
import { 
  validateSymptomSelection, 
  prepareSymptomData,
  getAvailableSymptomNames,
  getSymptomConfigByDisplayName,
  type PreparedSymptomData 
} from '@/lib/triage/symptom-validation';

/**
 * Props for the SymptomSelector component
 */
export interface SymptomSelectorProps {
  /** Available symptoms for selection */
  availableSymptoms: string[];
  /** Currently selected symptoms */
  selectedSymptoms: Symptom[];
  /** Callback when a symptom is toggled */
  onSymptomToggle: (symptom: Symptom) => void;
  /** Callback when symptoms are submitted with prepared data */
  onSubmit: (preparedData: PreparedSymptomData) => void;
  /** Whether the component is disabled during analysis */
  disabled?: boolean;
  /** Debounce delay for symptom selection in milliseconds (default: 300) */
  debounceDelay?: number;
  /** Disable debouncing for testing purposes */
  disableDebounce?: boolean;
}



/**
 * Severity color mapping for V.I.C.T.O.R. clinical aesthetic
 */
const SEVERITY_COLORS = {
  mild: 'border-yellow-500/60 text-yellow-400',
  moderate: 'border-yellow-500 text-yellow-300',
  severe: 'border-red-500 text-red-400'
} as const;

/**
 * Category color mapping for visual organization
 */
const CATEGORY_COLORS = {
  respiratory: 'bg-blue-900/20',
  gastrointestinal: 'bg-green-900/20',
  neurological: 'bg-purple-900/20',
  hemorrhagic: 'bg-red-900/20',
  systemic: 'bg-yellow-900/20'
} as const;

/**
 * SymptomSelector Component
 * 
 * Provides a clinical interface for selecting epidemiological symptoms during
 * emergency triage operations. Features predefined symptom options with
 * severity indicators and category grouping for rapid selection.
 * 
 * Requirements: 1.1, 1.2
 * - Provides predefined symptom options including "Fever", "Hemorrhage", "Cough"
 * - Validates symptom selections and prepares data for threat analysis
 * - Displays symptoms in accessible interface suitable for emergency use
 */
export function SymptomSelector({
  availableSymptoms,
  selectedSymptoms,
  onSymptomToggle,
  onSubmit,
  disabled = false,
  debounceDelay = 300,
  disableDebounce = false
}: SymptomSelectorProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Debounced symptom toggle handler for performance optimization
   * Requirements: 1.2, 2.1 - Validate selection and prepare data with debouncing
   */
  const handleSymptomToggle = useCallback((symptom: Symptom) => {
    if (disabled || isProcessing) return;
    
    // Clear any previous validation errors
    setValidationError(null);
    
    // If debouncing is disabled (e.g., for tests), call immediately
    if (disableDebounce) {
      onSymptomToggle(symptom);
      return;
    }
    
    setIsProcessing(true);
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new debounced timeout
    debounceTimeoutRef.current = setTimeout(() => {
      onSymptomToggle(symptom);
      setIsProcessing(false);
    }, debounceDelay);
  }, [disabled, isProcessing, onSymptomToggle, debounceDelay, disableDebounce]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Validates symptom selection and submits if valid
   * Requirements: 1.2 - Validate selection and prepare data for threat analysis
   */
  const handleSubmit = useCallback(() => {
    if (disabled) return;

    // Validate symptom selection using centralized validation
    const validationResult = validateSymptomSelection(selectedSymptoms, availableSymptoms);
    
    if (!validationResult.isValid) {
      setValidationError(validationResult.errorMessage || 'Invalid symptom selection');
      return;
    }

    // Prepare symptom data for triage algorithm consumption
    const preparedData = prepareSymptomData(validationResult.validatedSymptoms);
    
    // Show warnings if any (but still proceed)
    if (validationResult.warnings.length > 0) {
      console.warn('Symptom selection warnings:', validationResult.warnings);
    }

    // Clear validation error and submit prepared data
    setValidationError(null);
    onSubmit(preparedData);
  }, [disabled, selectedSymptoms, availableSymptoms, onSubmit]);

  /**
   * Get symptom configuration by display name
   */
  const getSymptomConfig = useCallback((displayName: string) => {
    return getSymptomConfigByDisplayName(displayName);
  }, []);

  /**
   * Check if a symptom is currently selected
   */
  const isSymptomSelected = useCallback((symptom: string): boolean => {
    return selectedSymptoms.includes(symptom);
  }, [selectedSymptoms]);

  /**
   * Memoized symptom grouping by category for performance optimization
   */
  const symptomsByCategory = useMemo(() => {
    return availableSymptoms.reduce((groups, symptom) => {
      const config = getSymptomConfig(symptom);
      if (!config) return groups;
      
      const category = config.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(symptom);
      return groups;
    }, {} as Record<string, string[]>);
  }, [availableSymptoms, getSymptomConfig]);

  return (
    <div 
      className="victor-panel victor-border-primary rounded p-4"
      role="group"
      aria-labelledby="symptom-selector-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 
          id="symptom-selector-heading"
          className="text-red-500 victor-data-display text-sm font-bold"
        >
          SYMPTOM SELECTION
        </h2>
        <div 
          className="text-yellow-500 victor-data-display text-xs"
          aria-live="polite"
          aria-label={`${selectedSymptoms.length} symptoms selected`}
        >
          {selectedSymptoms.length} SELECTED
        </div>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div 
          className="victor-alert-high rounded p-2 mb-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-red-400 victor-data-display text-xs">
            ⚠ {validationError}
          </div>
        </div>
      )}

      {/* Symptom Selection Grid */}
      <div className="space-y-4 mb-6">
        {Object.entries(symptomsByCategory).map(([category, symptoms]) => (
          <fieldset 
            key={category} 
            className={`rounded p-3 ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}`}
          >
            {/* Category Header */}
            <legend className="text-gray-300 victor-data-display text-xs uppercase mb-2 font-bold">
              {category} symptoms
            </legend>
            
            {/* Symptoms in Category */}
            <div 
              className="grid grid-cols-1 gap-2"
              role="group"
              aria-label={`${category} symptoms`}
            >
              {symptoms.map((symptom) => {
                const config = getSymptomConfig(symptom);
                const isSelected = isSymptomSelected(symptom);
                const severityColor = config ? SEVERITY_COLORS[config.severity] : SEVERITY_COLORS.mild;
                
                return (
                  <button
                    key={symptom}
                    onClick={() => handleSymptomToggle(symptom)}
                    disabled={disabled}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-describedby={config ? `${symptom}-severity` : undefined}
                    aria-label={`${symptom} symptom${config ? `, ${config.severity} severity` : ''}`}
                    className={`
                      flex items-center justify-between p-2 rounded border transition-all
                      victor-data-display text-xs text-left victor-focus-ring
                      ${isSelected 
                        ? `bg-red-900/40 ${severityColor} border-current` 
                        : `bg-black/40 text-gray-400 border-gray-600 hover:border-gray-500`
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-900/20'}
                    `}
                  >
                    <span className="flex-1">{symptom}</span>
                    <div className="flex items-center space-x-2">
                      {config && (
                        <span 
                          id={`${symptom}-severity`}
                          className="text-xs opacity-60 uppercase"
                          aria-label={`Severity: ${config.severity}`}
                        >
                          {config.severity}
                        </span>
                      )}
                      <span 
                        className={`w-3 h-3 rounded border ${isSelected ? 'bg-current' : 'border-current'}`}
                        role="img"
                        aria-label={isSelected ? 'Selected' : 'Not selected'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Submit Button with Processing State */}
      <button
        onClick={handleSubmit}
        disabled={disabled || selectedSymptoms.length === 0 || isProcessing}
        aria-describedby="submit-button-help"
        className={`
          w-full p-3 rounded victor-data-display text-sm font-bold transition-all victor-focus-ring
          ${disabled || selectedSymptoms.length === 0 || isProcessing
            ? 'bg-gray-800 text-gray-500 border border-gray-600 cursor-not-allowed'
            : 'victor-alert-high hover:bg-red-800 hover:text-red-200'
          }
        `}
      >
        {disabled ? 'ANALYZING...' : isProcessing ? 'PROCESSING...' : 'INITIATE THREAT ANALYSIS'}
      </button>
      
      {/* Submit Button Help Text */}
      <div 
        id="submit-button-help"
        className="sr-only"
      >
        {selectedSymptoms.length === 0 
          ? 'Select at least one symptom to begin analysis'
          : `Ready to analyze ${selectedSymptoms.length} selected symptoms`
        }
      </div>

      {/* Selection Summary */}
      {selectedSymptoms.length > 0 && (
        <div 
          className="mt-4 p-3 bg-gray-900/30 rounded border border-gray-600"
          role="status"
          aria-live="polite"
        >
          <div className="text-gray-400 victor-data-display text-xs mb-2">SELECTED SYMPTOMS:</div>
          <div 
            className="text-yellow-400 victor-data-display text-xs"
            aria-label={`Selected symptoms: ${selectedSymptoms.join(', ')}`}
          >
            {selectedSymptoms.join(' • ')}
          </div>
        </div>
      )}
    </div>
  );
}