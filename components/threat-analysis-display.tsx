'use client';

import { TriageResult, PathogenScore } from '@/lib/triage/types';

/**
 * Props for the ThreatAnalysisDisplay component
 */
export interface ThreatAnalysisDisplayProps {
  /** Current triage analysis results */
  triageResults: TriageResult | null;
  /** Callback when a threat is selected */
  onThreatSelect: (threat: PathogenScore) => void;
  /** Currently selected threat */
  selectedThreat: PathogenScore | null;
  /** Whether threat selection is being processed */
  isProcessingSelection?: boolean;
}

/**
 * ThreatAnalysisDisplay Component
 * 
 * Displays ranked threat results from triage analysis with threat selection functionality.
 * Shows threat indicators and confidence levels for each detected pathogen.
 * 
 * Features:
 * - Ranked list of threats ordered by likelihood and severity
 * - Threat selection for visualization integration
 * - Confidence levels and viability indicators
 * - V.I.C.T.O.R. dark clinical aesthetic
 * 
 * Requirements: 3.2, 3.3
 */
export function ThreatAnalysisDisplay({
  triageResults,
  onThreatSelect,
  selectedThreat,
  isProcessingSelection = false
}: ThreatAnalysisDisplayProps) {
  // Show loading state when no results available
  if (!triageResults) {
    return (
      <div 
        className="p-4 victor-panel victor-border-primary"
        role="status"
        aria-live="polite"
        aria-label="Threat analysis status"
      >
        <div className="text-red-500 victor-data-display text-xs mb-2">THREAT ANALYSIS:</div>
        <div className="text-gray-500 victor-data-display text-xs">No analysis results available</div>
      </div>
    );
  }

  // Show empty state when no threats detected
  if (triageResults.scores.length === 0) {
    return (
      <div 
        className="p-4 victor-panel victor-border-primary"
        role="status"
        aria-live="polite"
        aria-label="Threat analysis results"
      >
        <div className="text-red-500 victor-data-display text-xs mb-2">THREAT ANALYSIS:</div>
        <div className="text-gray-500 victor-data-display text-xs">No threats detected</div>
        <div className="text-gray-600 victor-data-display text-xs mt-1">
          Analysis completed at {triageResults.timestamp.toLocaleTimeString()}
        </div>
      </div>
    );
  }

  /**
   * Gets the confidence level description based on score
   */
  const getConfidenceLevel = (score: number): string => {
    if (score >= 80) return 'HIGH';
    if (score >= 60) return 'MODERATE';
    if (score >= 40) return 'LOW';
    return 'MINIMAL';
  };

  /**
   * Gets the confidence level color class based on score
   */
  const getConfidenceColor = (score: number): string => {
    if (score >= 80) return 'text-red-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-blue-400';
    return 'text-gray-500';
  };

  /**
   * Gets the threat priority indicator based on score and viability
   */
  const getThreatIndicator = (pathogen: PathogenScore): string => {
    if (!pathogen.isViable) return '○'; // Not viable
    if (pathogen.score >= 80) return '●'; // High threat
    if (pathogen.score >= 60) return '◐'; // Moderate threat
    if (pathogen.score >= 40) return '◑'; // Low threat
    return '◯'; // Minimal threat
  };

  return (
    <div 
      className="p-4 victor-panel victor-border-primary"
      role="region"
      aria-labelledby="threat-analysis-heading"
    >
      {/* Header */}
      <h3 
        id="threat-analysis-heading"
        className="text-red-500 victor-data-display text-xs mb-3"
      >
        DETECTED THREATS ({triageResults.scores.length})
      </h3>
      
      {/* Analysis metadata */}
      <div 
        className="text-gray-600 victor-data-display text-xs mb-4 space-y-1"
        role="status"
        aria-label="Analysis metadata"
      >
        <div>Analysis: {triageResults.timestamp.toLocaleTimeString()}</div>
        <div>
          Conditions: {triageResults.conditions.temperature}°C, {triageResults.conditions.humidity}% RH
        </div>
      </div>

      {/* Threat list */}
      <div 
        className="space-y-2 max-h-96 overflow-y-auto"
        role="listbox"
        aria-label="Detected threats list"
        aria-describedby="threat-list-help"
      >
        {triageResults.scores.map((pathogen, index) => {
          const isSelected = selectedThreat?.pathogenId === pathogen.pathogenId;
          const confidenceLevel = getConfidenceLevel(pathogen.score);
          const confidenceColor = getConfidenceColor(pathogen.score);
          const threatIndicator = getThreatIndicator(pathogen);
          
          return (
            <button
              key={pathogen.pathogenId}
              onClick={() => onThreatSelect(pathogen)}
              disabled={isProcessingSelection}
              role="option"
              aria-selected={isSelected}
              aria-describedby={`threat-${pathogen.pathogenId}-details`}
              aria-label={`Threat ${index + 1}: ${pathogen.pathogenName}, ${pathogen.score.toFixed(1)}% confidence, ${confidenceLevel} risk, ${pathogen.isViable ? 'viable' : 'non-viable'}`}
              className={`
                w-full text-left p-3 border transition-colors victor-data-display text-xs victor-focus-ring
                ${isProcessingSelection ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected 
                  ? 'victor-border-secondary bg-yellow-500/10' 
                  : 'victor-border-primary hover:border-red-500/60 hover:bg-red-500/5'
                }
              `}
            >
              {/* Threat rank and indicator */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500" aria-label={`Rank ${index + 1}`}>#{index + 1}</span>
                  <span 
                    className={confidenceColor}
                    role="img"
                    aria-label={`Threat level: ${confidenceLevel}`}
                  >
                    {threatIndicator}
                  </span>
                  <span className="text-white font-semibold">
                    {pathogen.pathogenName}
                  </span>
                </div>
                <div 
                  className={`${confidenceColor} font-bold`}
                  aria-label={`Confidence score: ${pathogen.score.toFixed(1)} percent`}
                >
                  {pathogen.score.toFixed(1)}%
                </div>
              </div>
              
              {/* Confidence and viability indicators */}
              <div 
                id={`threat-${pathogen.pathogenId}-details`}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className={confidenceColor}>
                    {confidenceLevel} CONFIDENCE
                  </span>
                  <span className={pathogen.isViable ? 'text-green-500' : 'text-red-500'}>
                    {pathogen.isViable ? 'VIABLE' : 'NON-VIABLE'}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-yellow-500" aria-label="Currently selected for visualization">
                    {isProcessingSelection ? 'PROCESSING...' : 'SELECTED'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer with selection instructions */}
      <div className="mt-4 pt-3 victor-border-primary border-t">
        <div 
          id="threat-list-help"
          className="text-gray-600 victor-data-display text-xs"
        >
          Click threat to visualize dispersion pattern
        </div>
      </div>
    </div>
  );
}