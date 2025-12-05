'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PlumeParameters, ConcentrationPoint, generateConcentrationGrid, clearDispersionCoefficientsCache } from '@/lib/gaussian-plume';
import { measurePerformance, getPerformanceStatus } from '@/lib/performance-monitor';
import { PlumeParameterControls } from './plume-parameter-controls';
import { PlumePolygonOverlay } from './plume-polygon-overlay';
import { SourceMarker } from './source-marker';

interface GaussianPlumeMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  externalParameters?: PlumeParameters;
}

/**
 * Default plume parameters for initial state
 * Using NYC coordinates with typical atmospheric conditions
 */
const DEFAULT_PLUME_PARAMETERS: PlumeParameters = {
  sourceX: -74.0060,        // NYC longitude
  sourceY: 40.7128,         // NYC latitude
  emissionRate: 10.0,       // 10 g/s
  windSpeed: 5.0,           // 5 m/s (will be updated from weather API)
  windDirection: 270.0,     // West wind (will be updated from weather API)
  stackHeight: 50.0,        // 50 meters
  stabilityClass: 'D'       // Neutral conditions
};

/**
 * Configuration for concentration grid generation
 */
const GRID_CONFIG = {
  resolution: 50,           // 50x50 grid points
  maxDistance: 10000,       // 10 km maximum distance
  debounceDelay: 300        // 300ms debounce delay
} as const;

/**
 * Custom hook for debouncing parameter changes
 * Prevents excessive recalculation when user rapidly changes parameters
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Main Gaussian plume visualization component with integrated calculation and rendering
 * 
 * This component manages the complete workflow:
 * 1. Parameter input via PlumeParameterControls
 * 2. Debounced recalculation of concentration grid
 * 3. Visualization of results via polygon overlays and source marker
 * 4. Interactive Leaflet map with V.I.C.T.O.R. dark styling
 */
export function GaussianPlumeMap({
  initialCenter = [40.7128, -74.0060], // Default to New York City
  initialZoom = 10,
  externalParameters
}: GaussianPlumeMapProps) {
  // State management for plume parameters
  const [plumeParameters, setPlumeParameters] = useState<PlumeParameters>({
    ...DEFAULT_PLUME_PARAMETERS,
    sourceY: initialCenter[0],
    sourceX: initialCenter[1]
  });
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Update parameters when external parameters are provided (from triage dashboard)
  useEffect(() => {
    if (externalParameters) {
      console.log('Updating plume parameters from external source:', externalParameters);
      setPlumeParameters(externalParameters);
    }
  }, [externalParameters]);

  // Debounce parameter changes to prevent excessive recalculation
  const debouncedParameters = useDebounce(plumeParameters, GRID_CONFIG.debounceDelay);

  /**
   * Handles parameter changes from the control panel
   * Updates state and triggers debounced recalculation
   * Clears cache when stability class changes for optimal performance
   */
  const handleParametersChange = useCallback((newParams: PlumeParameters) => {
    // Clear dispersion coefficients cache if stability class changed
    if (plumeParameters.stabilityClass !== newParams.stabilityClass) {
      clearDispersionCoefficientsCache();
    }
    
    setPlumeParameters(newParams);
    setCalculationError(null); // Clear any previous errors
  }, [plumeParameters.stabilityClass]);

  /**
   * Generates concentration grid based on current parameters
   * Memoized to prevent unnecessary recalculation on re-renders
   * Includes performance monitoring and optimization
   */
  const concentrationGrid: ConcentrationPoint[] = useMemo(() => {
    if (!debouncedParameters) {
      return [];
    }

    let grid: ConcentrationPoint[] = [];

    const performCalculation = async () => {
      try {
        setIsCalculating(true);
        setCalculationError(null);

        // Use performance monitoring for the calculation
        const { result, metrics } = await measurePerformance(
          'CONCENTRATION_GRID',
          GRID_CONFIG.resolution * GRID_CONFIG.resolution,
          () => generateConcentrationGrid(
            debouncedParameters,
            GRID_CONFIG.resolution,
            GRID_CONFIG.maxDistance
          )
        );

        grid = result;

        // Check performance status and log warnings if needed
        const status = getPerformanceStatus('CONCENTRATION_GRID', metrics.executionTime);
        if (status === 'poor' && process.env.NODE_ENV === 'development') {
          console.warn(
            `Poor performance detected: ${metrics.executionTime.toFixed(2)}ms for ${grid.length} points. ` +
            `Consider reducing grid resolution or maximum distance.`
          );
        }

        return grid;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
        setCalculationError(errorMessage);
        console.error('Gaussian plume calculation error:', error);
        return [];
      } finally {
        setIsCalculating(false);
      }
    };

    // Execute the calculation
    performCalculation();
    
    return grid;
  }, [debouncedParameters]);

  /**
   * Update map center when source location changes
   */
  const mapCenter: [number, number] = useMemo(() => {
    return [plumeParameters.sourceY, plumeParameters.sourceX];
  }, [plumeParameters.sourceY, plumeParameters.sourceX]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[600px] bg-black">
      {/* Parameter Controls Panel */}
      <div className="lg:w-80 lg:h-full overflow-y-auto border-r border-red-500/60">
        <PlumeParameterControls
          parameters={plumeParameters}
          onParametersChange={handleParametersChange}
          mapCenter={mapCenter}
        />
        
        {/* Calculation Status */}
        <div className="p-4 border-t border-gray-600">
          <div className="space-y-2">
            <div className="text-xs text-gray-400">
              <span className="text-yellow-500">CALCULATION STATUS:</span>
              {isCalculating && (
                <span className="text-yellow-500 ml-2 animate-pulse">COMPUTING...</span>
              )}
              {!isCalculating && !calculationError && (
                <span className="text-green-500 ml-2">READY</span>
              )}
              {calculationError && (
                <span className="text-red-500 ml-2">ERROR</span>
              )}
            </div>
            
            {calculationError && (
              <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/30">
                {calculationError}
              </div>
            )}
            
            {!isCalculating && !calculationError && (
              <div className="text-xs text-gray-500">
                Grid Points: {concentrationGrid.length.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="flex-1 relative bg-black border border-red-500/60">
        {/* Loading Overlay */}
        {isCalculating && (
          <div className="absolute inset-0 bg-black/50 z-[1000] flex items-center justify-center">
            <div className="bg-black border border-yellow-500 p-4 rounded font-mono">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-yellow-500">Calculating plume dispersion...</span>
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={initialZoom}
          className="w-full h-full"
          zoomControl={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          dragging={true}
          attributionControl={true}
          key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
        >
          {/* Dark tile layer following V.I.C.T.O.R. aesthetic */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />

          {/* Concentration polygon overlay */}
          {concentrationGrid.length > 0 && (
            <PlumePolygonOverlay
              concentrationGrid={concentrationGrid}
              gridResolution={GRID_CONFIG.resolution}
              maxDistance={GRID_CONFIG.maxDistance}
            />
          )}

          {/* Source marker */}
          <SourceMarker plumeParams={plumeParameters} />
        </MapContainer>
      </div>
    </div>
  );
}