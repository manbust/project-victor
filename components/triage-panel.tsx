'use client';

import { useState, useCallback, useMemo } from 'react';
import { SymptomSelector } from './symptom-selector';
import { ThreatAnalysisDisplay } from './threat-analysis-display';
import { 
  Symptom, 
  TriageResult, 
  PathogenScore 
} from '@/lib/triage/types';
import { 
  getAvailableSymptomNames,
  type PreparedSymptomData 
} from '@/lib/triage/symptom-validation';

/**
 * Props for the TriagePanel component
 */
export interface TriagePanelProps {
  /** Callback when symptoms are submitted for analysis */
  onSymptomsSubmit: (preparedData: PreparedSymptomData) => void;
  /** Current triage analysis results */
  triageResults: TriageResult | null;
  /** Callback when a threat is selected for visualization */
  onThreatSelect: (threat: PathogenScore) => void;
  /** Currently selected threat */
  selectedThreat: PathogenScore | null;
  /** Whether analysis is currently running */
  isAnalyzing: boolean;
  /** Error message if analysis fails */
  analysisError: string | null;
  /** Whether threat selection is being processed */
  isProcessingSelection?: boolean;
  /** Whether weather data is using fallback values */
  isUsingFallbackWeather?: boolean;
  /** Whether pathogen data had retrieval issues */
  hasPathogenDataIssues?: boolean;
  /** Callback to retry failed analysis */
  onRetryAnalysis?: () => void;
}

/**
 * TriagePanel Component
 * 
 * Container component that integrates SymptomSelector and ThreatAnalysisDisplay
 * components. Manages component state and data flow for the triage workflow.
 * 
 * Features:
 * - Symptom selection and validation interface
 * - Threat analysis results display
 * - Loading states and user interaction handling
 * - Error state management
 * - V.I.C.T.O.R. dark clinical aesthetic
 * 
 * Requirements: 1.1, 3.2, 3.3
 * - Provides TriagePanel component with predefined symptom options
 * - Displays ranked list of "Detected Threats" ordered by likelihood and severity
 * - Presents results with clear threat indicators and confidence levels
 */
export function TriagePanel({
  onSymptomsSubmit,
  triageResults,
  onThreatSelect,
  selectedThreat,
  isAnalyzing,
  analysisError,
  isProcessingSelection = false,
  isUsingFallbackWeather = false,
  hasPathogenDataIssues = false,
  onRetryAnalysis
}: TriagePanelProps) {
  // Local state for symptom selection
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);

  /**
   * Available symptoms for selection
   * Requirements: 1.1 - Predefined symptom options including "Fever", "Hemorrhage", "Cough"
   */
  const availableSymptoms = useMemo(() => {
    return getAvailableSymptomNames();
  }, []);

  /**
   * Handles symptom toggle in the selector
   */
  const handleSymptomToggle = useCallback((symptom: Symptom) => {
    setSelectedSymptoms(prev => {
      const isCurrentlySelected = prev.includes(symptom);
      if (isCurrentlySelected) {
        // Remove symptom if already selected
        return prev.filter(s => s !== symptom);
      } else {
        // Add symptom if not selected
        return [...prev, symptom];
      }
    });
  }, []);

  /**
   * Handles symptom submission and forwards to parent component
   * Requirements: 1.1, 1.2 - Validate selection and prepare data for threat analysis
   */
  const handleSymptomsSubmit = useCallback((preparedData: PreparedSymptomData) => {
    // Forward prepared data to parent component for analysis
    onSymptomsSubmit(preparedData);
  }, [onSymptomsSubmit]);

  /**
   * Handles threat selection and forwards to parent component
   * Requirements: 3.2, 3.3 - Threat selection for visualization
   */
  const handleThreatSelect = useCallback((threat: PathogenScore) => {
    onThreatSelect(threat);
  }, [onThreatSelect]);

  return (
    <div 
      className="flex flex-col h-full bg-black victor-panel"
      role="region"
      aria-label="Triage Control Panel"
    >
      {/* Panel Header */}
      <header className="p-4 victor-border-primary border-b">
        <h1 className="text-yellow-500 victor-data-display text-sm font-bold">
          V.I.C.T.O.R. TRIAGE PANEL
        </h1>
        <p className="text-gray-400 victor-data-display text-xs mt-1">
          Viral Incident & Casualty Triage Operations Rig
        </p>
      </header>

      {/* Scrollable Content Area */}
      <div 
        className="flex-1 overflow-y-auto"
        role="main"
        aria-label="Triage workflow controls"
      >
        <div className="p-4 space-y-6">
          {/* Symptom Selection Section */}
          <section aria-label="Symptom selection">
            <SymptomSelector
              availableSymptoms={availableSymptoms}
              selectedSymptoms={selectedSymptoms}
              onSymptomToggle={handleSymptomToggle}
              onSubmit={handleSymptomsSubmit}
              disabled={isAnalyzing}
              disableDebounce={process.env.NODE_ENV === 'test'}
            />
          </section>

          {/* Analysis Status Section */}
          {(isAnalyzing || analysisError || isUsingFallbackWeather || hasPathogenDataIssues) && (
            <section 
              className="victor-panel victor-border-primary rounded p-4"
              role="status"
              aria-live="polite"
              aria-label="Analysis status"
            >
              <h3 className="text-red-500 victor-data-display text-xs mb-2">SYSTEM STATUS:</h3>
              
              {isAnalyzing && (
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                    role="img"
                    aria-label="Processing indicator"
                  ></div>
                  <div className="text-yellow-500 victor-data-display text-xs">
                    ANALYZING THREAT PATTERNS...
                  </div>
                </div>
              )}
              
              {analysisError && (
                <div 
                  className="victor-alert-high rounded p-2 mb-2"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="text-red-400 victor-data-display text-xs mb-2">
                    ⚠ {analysisError}
                  </div>
                  {onRetryAnalysis && (
                    <button
                      onClick={onRetryAnalysis}
                      disabled={isAnalyzing}
                      className="text-xs victor-data-display text-yellow-400 hover:text-yellow-300 underline victor-focus-ring"
                      aria-label="Retry analysis"
                    >
                      RETRY ANALYSIS
                    </button>
                  )}
                </div>
              )}

              {/* Data Quality Indicators */}
              {(isUsingFallbackWeather || hasPathogenDataIssues) && (
                <div className="space-y-1">
                  {isUsingFallbackWeather && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="text-yellow-400 victor-data-display text-xs">
                        Using default weather conditions
                      </div>
                    </div>
                  )}
                  
                  {hasPathogenDataIssues && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="text-yellow-400 victor-data-display text-xs">
                        Pathogen database partially unavailable
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Threat Analysis Results Section */}
          <section aria-label="Threat analysis results">
            <ThreatAnalysisDisplay
              triageResults={triageResults}
              onThreatSelect={handleThreatSelect}
              selectedThreat={selectedThreat}
              isProcessingSelection={isProcessingSelection}
            />
          </section>
        </div>
      </div>

      {/* Panel Footer */}
      <footer 
        className="p-4 victor-border-primary border-t"
        role="contentinfo"
        aria-label="Status summary"
      >
        <div className="text-gray-600 victor-data-display text-xs">
          {selectedSymptoms.length > 0 && (
            <div className="mb-2" aria-label={`${selectedSymptoms.length} symptoms selected`}>
              Selected: {selectedSymptoms.length} symptom{selectedSymptoms.length !== 1 ? 's' : ''}
            </div>
          )}
          {triageResults && (
            <div className="mb-2" aria-label={`${triageResults.scores.length} threats detected`}>
              Threats detected: {triageResults.scores.length}
            </div>
          )}
          {selectedThreat && (
            <div className="text-yellow-500" aria-label={`Currently visualizing ${selectedThreat.pathogenName}`}>
              Visualizing: {selectedThreat.pathogenName}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}