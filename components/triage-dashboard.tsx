'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { GaussianPlumeMap } from './gaussian-plume-map';
import { PlumeParameters } from '@/lib/gaussian-plume';
import { 
  Symptom, 
  WeatherConditions, 
  TriageResult, 
  PathogenScore 
} from '@/lib/triage/types';
import { 
  type PreparedSymptomData 
} from '@/lib/triage/symptom-validation';
import { 
  fetchWeatherForTriage, 
  fetchWeatherWithFallback,
  getWeatherErrorMessage 
} from '@/lib/triage/weather-integration';
import { 
  fetchPathogensForTriage, 
  fetchPathogensWithRetry,
  getPathogenErrorMessage 
} from '@/lib/triage/pathogen-integration';
import { triagePathogens } from '@/lib/triage/algorithm';
import { PatientData, PathogenProfile, PathogenSurvivalRange } from '@/lib/triage/types';

import { BiohazardAlert } from './biohazard-alert';
import { TriagePanel } from './triage-panel';
import type { EnhancedPathogenData } from '@/lib/triage/pathogen-integration';
import { 
  createPathogenToPlumeMapping,
  convertToEnhancedPathogenScore,
  validatePlumeParameters,
  type EnhancedPathogenScore
} from '@/lib/triage/plume-mapping';

/**
 * Props for the main TriageDashboard component
 */
export interface TriageDashboardProps {
  /** Initial map center coordinates [latitude, longitude] */
  initialMapCenter?: [number, number];
  /** Initial map zoom level */
  initialMapZoom?: number;
}

/**
 * Main state interface for the TriageDashboard component
 * Manages all dashboard state including symptoms, analysis results, and UI state
 */
export interface TriageDashboardState {
  /** Currently selected symptoms for analysis */
  selectedSymptoms: Symptom[];
  /** Results from triage algorithm execution */
  triageResults: TriageResult | null;
  /** Currently selected threat for visualization */
  selectedThreat: PathogenScore | null;
  /** Whether triage analysis is currently running */
  isAnalyzing: boolean;
  /** Current weather data for analysis */
  weatherData: WeatherConditions | null;
  /** Whether to show biohazard alert overlay */
  showBiohazardAlert: boolean;
  /** Error message if analysis fails */
  analysisError: string | null;
  /** Whether threat selection is being processed */
  isProcessingSelection: boolean;
  /** Whether weather data is using fallback values */
  isUsingFallbackWeather: boolean;
  /** Whether pathogen data had retrieval issues */
  hasPathogenDataIssues: boolean;
}

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
}

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
}

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
}

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
 * Mapping configuration from pathogen characteristics to plume parameters
 */
export interface PathogenToPlumeMapping {
  /** Pathogen identifier */
  pathogenId: string;
  /** Emission rate derived from R0 score */
  emissionRate: number;
  /** Stack height derived from transmission vector */
  stackHeight: number;
  /** Wind direction from weather data */
  windDirection: number;
  /** Wind speed from weather data */
  windSpeed: number;
}

/**
 * Configuration for individual symptoms
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
}



/**
 * R0 score threshold for triggering biohazard alerts
 * Based on epidemiological standards for high-risk pathogens
 */
const BIOHAZARD_R0_THRESHOLD = 2.5;

/**
 * Converts EnhancedPathogenData from Supabase to PathogenProfile for triage algorithm
 * 
 * @param pathogenData - Enhanced pathogen data from database
 * @returns PathogenProfile compatible with triage algorithm
 */
function convertToPathogenProfile(pathogenData: EnhancedPathogenData): PathogenProfile {
  // Create survival range from minimum humidity (assume max is 100%)
  const survivalRange: PathogenSurvivalRange = {
    minHumidity: pathogenData.min_humidity_survival,
    maxHumidity: 100 // Assume pathogens can survive up to 100% humidity
  };

  // For now, create basic symptoms based on pathogen characteristics
  // TODO: This should be enhanced with actual symptom data from database
  const symptoms: string[] = [];
  
  // Add symptoms based on pathogen characteristics
  if (pathogenData.transmission_vector === 'air') {
    symptoms.push('cough', 'fever', 'shortness_of_breath');
  } else {
    symptoms.push('fever', 'nausea', 'diarrhea');
  }
  
  // Add severity-based symptoms
  if (pathogenData.r0_score >= 5) {
    symptoms.push('hemorrhage', 'organ_failure');
  }

  return {
    id: pathogenData.id,
    name: pathogenData.name,
    symptoms: symptoms,
    survivalRange: survivalRange
  };
}

/**
 * Default weather conditions when real data is unavailable
 */
const DEFAULT_WEATHER_CONDITIONS: WeatherConditions = {
  humidity: 60,
  temperature: 20
};

/**
 * Main Triage Dashboard Component
 * 
 * Integrates symptom analysis, pathogen identification, and dispersion visualization
 * within the V.I.C.T.O.R. system. Serves as the primary interface for emergency
 * response teams to assess biological threats and visualize their potential spread.
 * 
 * Features:
 * - Symptom selection and validation
 * - Automated weather data fetching
 * - Pathogen database integration
 * - Triage algorithm execution
 * - Threat visualization via plume modeling
 * - Biohazard alert system
 * 
 * Requirements: 1.1, 4.1
 */
export function TriageDashboard({
  initialMapCenter = [40.7128, -74.0060], // Default to NYC
  initialMapZoom = 10
}: TriageDashboardProps) {
  // Main dashboard state management
  const [dashboardState, setDashboardState] = useState<TriageDashboardState>({
    selectedSymptoms: [],
    triageResults: null,
    selectedThreat: null,
    isAnalyzing: false,
    weatherData: null,
    showBiohazardAlert: false,
    analysisError: null,
    isProcessingSelection: false,
    isUsingFallbackWeather: false,
    hasPathogenDataIssues: false
  });

  // Current plume parameters for map visualization
  const [plumeParameters, setPlumeParameters] = useState<PlumeParameters>({
    sourceX: initialMapCenter[1], // longitude
    sourceY: initialMapCenter[0], // latitude
    emissionRate: 10.0,
    windSpeed: 5.0,
    windDirection: 270.0,
    stackHeight: 50.0,
    stabilityClass: 'D'
  });

  // Cache for plume parameter calculations to avoid recomputation
  const plumeCalculationCache = useRef<Map<string, PlumeParameters>>(new Map());

  /**
   * Handles symptom submission and initiates triage analysis
   * Requirements: 1.1, 1.2, 2.1, 2.2, 2.3
   */
  const handleSymptomsSubmit = useCallback(async (preparedData: PreparedSymptomData) => {
    setDashboardState(prev => ({
      ...prev,
      selectedSymptoms: preparedData.symptoms,
      isAnalyzing: true,
      analysisError: null,
      triageResults: null,
      selectedThreat: null,
      showBiohazardAlert: false
    }));

    try {
      // Log prepared symptom data for debugging
      console.log('Prepared symptom data:', preparedData);
      console.log('Severity score:', preparedData.severityScore);
      console.log('Dominant category:', preparedData.metadata.dominantCategory);
      
      // Step 1: Fetch weather data with fallback support (Task 3.1)
      console.log('Fetching weather data for map center:', initialMapCenter);
      const { data: weatherData, error: weatherError } = await fetchWeatherWithFallback(initialMapCenter);
      
      const isUsingFallback = weatherError !== null;
      if (isUsingFallback) {
        console.warn('Using fallback weather data:', getWeatherErrorMessage(weatherError));
      }
      
      // Step 2: Fetch pathogen database information with retry (Task 3.3)
      console.log('Fetching pathogen database information...');
      const { data: pathogenData, error: pathogenError } = await fetchPathogensWithRetry(2, 1000);
      
      const hasPathogenIssues = pathogenError !== null;
      if (hasPathogenIssues) {
        console.warn('Pathogen data issues:', getPathogenErrorMessage(pathogenError));
        // Continue with empty pathogen list for graceful degradation
      }
      
      console.log(`Retrieved ${pathogenData?.length || 0} pathogens from database`);
      
      // Step 3: Execute triage algorithm with symptom and weather data (Task 4.1)
      console.log('Executing triage algorithm...');
      
      // Prepare patient data from symptoms
      const patientData: PatientData = {
        symptoms: preparedData.symptoms
      };
      
      // Convert enhanced pathogen data to PathogenProfile format
      const pathogenProfiles: PathogenProfile[] = (pathogenData || []).map(convertToPathogenProfile);
      
      // Execute triage algorithm
      const triageResults = triagePathogens(
        patientData,
        weatherData || DEFAULT_WEATHER_CONDITIONS,
        pathogenProfiles
      );
      
      console.log(`Triage analysis complete. Found ${triageResults.scores.length} scored pathogens`);
      console.log('Top 3 threats:', triageResults.scores.slice(0, 3));
      
      // Update state with complete results and data quality indicators
      setDashboardState(prev => ({
        ...prev,
        isAnalyzing: false,
        weatherData: weatherData || DEFAULT_WEATHER_CONDITIONS,
        triageResults: triageResults,
        isUsingFallbackWeather: isUsingFallback,
        hasPathogenDataIssues: hasPathogenIssues
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      console.error('Triage analysis failed:', errorMessage);
      
      // Provide user-friendly error message
      let userFriendlyMessage = 'Triage analysis failed. Please try again.';
      if (errorMessage.includes('weather')) {
        userFriendlyMessage = 'Weather data unavailable. Analysis may be less accurate.';
      } else if (errorMessage.includes('pathogen')) {
        userFriendlyMessage = 'Pathogen database unavailable. Analysis may be incomplete.';
      } else if (errorMessage.includes('network')) {
        userFriendlyMessage = 'Network connection issue. Please check connectivity and try again.';
      }
      
      setDashboardState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisError: userFriendlyMessage
      }));
    }
  }, [initialMapCenter]);

  /**
   * Memoized plume parameter calculation with caching for performance optimization
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  const calculatePlumeParameters = useCallback((
    enhancedThreat: EnhancedPathogenScore,
    weatherData: WeatherConditions,
    mapCenter: [number, number]
  ): PlumeParameters => {
    // Create cache key from threat and weather data
    const cacheKey = `${enhancedThreat.pathogenId}-${enhancedThreat.r0Score}-${weatherData.temperature}-${weatherData.humidity}-${weatherData.windSpeed}-${weatherData.windDirection}-${mapCenter[0]}-${mapCenter[1]}`;
    
    // Check cache first
    const cached = plumeCalculationCache.current.get(cacheKey);
    if (cached) {
      console.log('Using cached plume parameters for threat:', enhancedThreat.pathogenName);
      return cached;
    }
    
    // Calculate new parameters
    console.log('Calculating new plume parameters for threat:', enhancedThreat.pathogenName);
    const newParameters = createPathogenToPlumeMapping(enhancedThreat, weatherData, mapCenter);
    
    // Cache the result (limit cache size to prevent memory leaks)
    if (plumeCalculationCache.current.size > 50) {
      // Clear oldest entries
      const entries = Array.from(plumeCalculationCache.current.entries());
      entries.slice(0, 25).forEach(([key]) => {
        plumeCalculationCache.current.delete(key);
      });
    }
    plumeCalculationCache.current.set(cacheKey, newParameters);
    
    return newParameters;
  }, []);

  /**
   * Handles threat selection and updates plume visualization with optimistic updates
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  const handleThreatSelect = useCallback(async (threat: PathogenScore) => {
    console.log('Threat selected:', threat);
    
    // Optimistic update - immediately update selected threat and set processing state
    setDashboardState(prev => ({
      ...prev,
      selectedThreat: threat,
      showBiohazardAlert: false, // Will be set based on R0 score check
      isProcessingSelection: true
    }));

    // Get enhanced pathogen data for the selected threat
    try {
      const { data: pathogenData, error: pathogenError } = await fetchPathogensForTriage();
      
      if (pathogenError || !pathogenData) {
        console.error('Failed to fetch pathogen data for plume mapping:', pathogenError);
        return;
      }

      // Find the specific pathogen data for the selected threat
      const selectedPathogenData = pathogenData.find(p => p.id === threat.pathogenId);
      
      if (!selectedPathogenData) {
        console.error('Selected pathogen not found in database:', threat.pathogenId);
        return;
      }

      // Convert to enhanced pathogen score for mapping
      const enhancedThreat: EnhancedPathogenScore = convertToEnhancedPathogenScore(
        selectedPathogenData,
        threat.score,
        threat.isViable
      );

      // Use current weather data for plume mapping
      if (dashboardState.weatherData) {
        // Use memoized calculation function
        const newPlumeParameters = calculatePlumeParameters(
          enhancedThreat,
          dashboardState.weatherData,
          initialMapCenter
        );

        // Validate the generated parameters
        const validation = validatePlumeParameters(newPlumeParameters);
        if (!validation.isValid) {
          console.warn('Generated plume parameters are invalid:', validation.issues);
          // Continue anyway but log the issues
        }

        // Update plume parameters for map visualization
        setPlumeParameters(newPlumeParameters);
        
        console.log('Plume parameters updated for threat:', threat.pathogenName);
        console.log('New parameters:', {
          emissionRate: newPlumeParameters.emissionRate,
          stackHeight: newPlumeParameters.stackHeight,
          windSpeed: newPlumeParameters.windSpeed,
          windDirection: newPlumeParameters.windDirection
        });

        // Check if biohazard alert should be triggered based on R0 score threshold
        const shouldShowAlert = enhancedThreat.r0Score >= BIOHAZARD_R0_THRESHOLD;
        if (shouldShowAlert) {
          console.log(`High R0 score detected (${enhancedThreat.r0Score}), triggering biohazard alert`);
        }
        
        // Update dashboard state with alert status and clear processing state
        setDashboardState(prev => ({
          ...prev,
          showBiohazardAlert: shouldShowAlert,
          isProcessingSelection: false
        }));
      } else {
        console.warn('No weather data available for plume mapping');
      }
    } catch (error) {
      console.error('Error during threat selection and plume mapping:', error);
      // Clear processing state on error
      setDashboardState(prev => ({
        ...prev,
        isProcessingSelection: false
      }));
    }
  }, [dashboardState.weatherData, initialMapCenter, calculatePlumeParameters]);

  /**
   * Handles biohazard alert dismissal
   * Requirements: 5.3
   */
  const handleAlertDismiss = useCallback(() => {
    setDashboardState(prev => ({
      ...prev,
      showBiohazardAlert: false
    }));
  }, []);

  /**
   * Handles retry of failed analysis
   * Requirements: 2.3 - Retry mechanisms for failed API calls
   */
  const handleRetryAnalysis = useCallback(() => {
    if (dashboardState.selectedSymptoms.length > 0) {
      // Re-prepare symptom data and retry analysis
      const { prepareSymptomData } = require('@/lib/triage/symptom-validation');
      const preparedData = prepareSymptomData(dashboardState.selectedSymptoms);
      handleSymptomsSubmit(preparedData);
    }
  }, [dashboardState.selectedSymptoms, handleSymptomsSubmit]);



  return (
    <>
      
      <main 
        className="flex flex-col lg:flex-row w-full h-full min-h-screen bg-black victor-data-display"
        role="application"
        aria-label="V.I.C.T.O.R. Triage Dashboard - Viral Incident and Casualty Triage Operations Rig"
      >
        {/* Triage Panel - Left Side */}
        <aside 
          id="triage-panel"
          className="lg:w-96 lg:h-full overflow-hidden victor-panel victor-border-primary border-r"
          role="complementary"
          aria-label="Triage Control Panel"
        >
          <TriagePanel
            onSymptomsSubmit={handleSymptomsSubmit}
            triageResults={dashboardState.triageResults}
            onThreatSelect={handleThreatSelect}
            selectedThreat={dashboardState.selectedThreat}
            isAnalyzing={dashboardState.isAnalyzing}
            analysisError={dashboardState.analysisError}
            isProcessingSelection={dashboardState.isProcessingSelection}
            isUsingFallbackWeather={dashboardState.isUsingFallbackWeather}
            hasPathogenDataIssues={dashboardState.hasPathogenDataIssues}
            onRetryAnalysis={handleRetryAnalysis}
          />
        </aside>

        {/* Map Visualization - Right Side */}
        <section 
          id="map-visualization"
          className="flex-1 relative bg-black"
          role="main"
          aria-label="Pathogen Dispersion Visualization"
        >
          <GaussianPlumeMap
            initialCenter={initialMapCenter}
            initialZoom={initialMapZoom}
            externalParameters={plumeParameters}
          />
          
          {/* Biohazard Alert Overlay */}
          <BiohazardAlert
            isVisible={dashboardState.showBiohazardAlert}
            selectedThreat={dashboardState.selectedThreat}
            onDismiss={handleAlertDismiss}
          />
        </section>
      </main>
    </>
  );
}