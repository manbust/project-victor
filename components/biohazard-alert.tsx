'use client';

import { PathogenScore } from '@/lib/triage/types';

/**
 * Props for the BiohazardAlert component
 */
export interface BiohazardAlertProps {
  /** Whether the alert should be visible */
  isVisible: boolean;
  /** Currently selected threat that triggered the alert */
  selectedThreat: PathogenScore | null;
  /** Callback when alert is dismissed */
  onDismiss: () => void;
}

/**
 * R0 score threshold for triggering biohazard alerts
 * Based on epidemiological standards for high-risk pathogens
 */
const BIOHAZARD_R0_THRESHOLD = 2.5;

/**
 * BiohazardAlert Component
 * 
 * Displays a prominent alert overlay for high-risk pathogen threats.
 * Uses V.I.C.T.O.R. dark clinical aesthetic with high-contrast visual indicators.
 * 
 * Features:
 * - Prominent overlay with biohazard warning
 * - High-contrast red/yellow color scheme for urgency
 * - Alert dismissal functionality
 * - Persistence management until threat is cleared
 * 
 * Requirements: 5.1, 5.3
 */
export function BiohazardAlert({
  isVisible,
  selectedThreat,
  onDismiss
}: BiohazardAlertProps) {
  // Don't render if not visible
  if (!isVisible || !selectedThreat) {
    return null;
  }

  /**
   * Gets the alert level based on pathogen score
   */
  const getAlertLevel = (score: number): string => {
    if (score >= 90) return 'CRITICAL';
    if (score >= 80) return 'HIGH';
    if (score >= 70) return 'ELEVATED';
    return 'MODERATE';
  };

  /**
   * Gets the alert color class based on pathogen score
   */
  const getAlertColor = (score: number): string => {
    if (score >= 90) return 'border-red-600 bg-red-900/90';
    if (score >= 80) return 'border-red-500 bg-red-800/90';
    if (score >= 70) return 'border-yellow-500 bg-yellow-900/90';
    return 'border-yellow-400 bg-yellow-800/90';
  };

  /**
   * Gets the text color class based on pathogen score
   */
  const getTextColor = (score: number): string => {
    if (score >= 90) return 'text-red-300';
    if (score >= 80) return 'text-red-400';
    if (score >= 70) return 'text-yellow-300';
    return 'text-yellow-400';
  };

  /**
   * Gets the biohazard symbol based on alert level
   */
  const getBiohazardSymbol = (score: number): string => {
    if (score >= 90) return '☢'; // Nuclear symbol for critical
    if (score >= 80) return '⚠'; // Warning triangle for high
    return '⚠'; // Standard warning for elevated/moderate
  };

  const alertLevel = getAlertLevel(selectedThreat.score);
  const alertColor = getAlertColor(selectedThreat.score);
  const textColor = getTextColor(selectedThreat.score);
  const biohazardSymbol = getBiohazardSymbol(selectedThreat.score);

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="biohazard-alert-title"
      aria-describedby="biohazard-alert-description"
    >
      {/* Alert Container */}
      <div className={`
        ${alertColor} border-4 rounded-lg p-8 max-w-lg mx-4 victor-data-display
        shadow-2xl animate-pulse
      `}>
        {/* Alert Header */}
        <div className="text-center mb-6">
          <div 
            className="text-6xl mb-2"
            role="img"
            aria-label={`${alertLevel} risk biohazard warning symbol`}
          >
            {biohazardSymbol}
          </div>
          <h1 
            id="biohazard-alert-title"
            className="text-red-500 text-2xl font-bold mb-2"
          >
            BIO-HAZARD ALERT
          </h1>
          <div 
            id="biohazard-alert-description"
            className="text-red-400 text-lg font-semibold"
          >
            {alertLevel} RISK PATHOGEN DETECTED
          </div>
        </div>

        {/* Threat Information */}
        <div className="space-y-4 mb-6">
          <div className="border-t border-red-500/50 pt-4">
            <h2 className="text-red-500 text-sm font-bold mb-2">PATHOGEN IDENTIFICATION:</h2>
            <div 
              className="text-white text-lg font-semibold"
              aria-label={`Identified pathogen: ${selectedThreat.pathogenName}`}
            >
              {selectedThreat.pathogenName}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="text-red-500 font-bold mb-1">THREAT SCORE:</h3>
              <div 
                className={`${textColor} text-xl font-bold`}
                aria-label={`Threat score: ${selectedThreat.score.toFixed(1)} percent`}
              >
                {selectedThreat.score.toFixed(1)}%
              </div>
            </div>
            <div>
              <h3 className="text-red-500 font-bold mb-1">VIABILITY:</h3>
              <div 
                className={selectedThreat.isViable ? 'text-green-400' : 'text-red-400'}
                aria-label={`Pathogen viability: ${selectedThreat.isViable ? 'Confirmed viable' : 'Non-viable'}`}
              >
                {selectedThreat.isViable ? 'CONFIRMED' : 'NON-VIABLE'}
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="border-t border-red-500/50 pt-4">
            <h3 className="text-red-500 text-sm font-bold mb-2">RISK ASSESSMENT:</h3>
            <div className={`${textColor} text-sm`}>
              High-risk pathogen with elevated transmission potential. 
              Immediate containment protocols recommended.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={onDismiss}
            autoFocus
            aria-describedby="alert-persistence-info"
            className="
              victor-alert-high hover:bg-red-700 active:bg-red-800
              text-white font-bold py-3 px-6 rounded
              transition-colors duration-200 victor-focus-ring
            "
          >
            ACKNOWLEDGE ALERT
          </button>
          
          <div className="text-center">
            <div 
              id="alert-persistence-info"
              className="text-gray-400 text-xs"
            >
              Alert will persist until threat is cleared or different pathogen selected
            </div>
          </div>
        </div>

        {/* Emergency Contact Info */}
        <div className="mt-6 pt-4 border-t border-red-500/50">
          <h3 className="text-red-500 text-xs font-bold mb-1">EMERGENCY PROTOCOLS:</h3>
          <div className="text-gray-400 text-xs">
            Notify incident commander • Initiate containment procedures • Monitor exposure zones
          </div>
        </div>
      </div>
    </div>
  );
}