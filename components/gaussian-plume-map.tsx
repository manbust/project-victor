'use client';

import { useState, useCallback, useEffect } from 'react';
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

const DEFAULT_PLUME_PARAMETERS: PlumeParameters = {
  sourceX: -74.0060,
  sourceY: 40.7128,
  emissionRate: 10.0,
  windSpeed: 5.0,
  windDirection: 270.0,
  stackHeight: 10.0, // Reduced default for better visibility
  stabilityClass: 'D'
};

const GRID_CONFIG = {
  resolution: 50,
  maxDistance: 10000,
  debounceDelay: 300
} as const;

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

export function GaussianPlumeMap({
  initialCenter = [40.7128, -74.0060],
  initialZoom = 10,
  externalParameters
}: GaussianPlumeMapProps) {
  // 1. Manage Parameters State
  const [plumeParameters, setPlumeParameters] = useState<PlumeParameters>({
    ...DEFAULT_PLUME_PARAMETERS,
    sourceY: initialCenter[0],
    sourceX: initialCenter[1]
  });

  // 2. Manage Calculation Data State (Fixed: Moved out of useMemo)
  const [concentrationGrid, setConcentrationGrid] = useState<ConcentrationPoint[]>([]);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Sync external parameters
  useEffect(() => {
    if (externalParameters) {
      setPlumeParameters(externalParameters);
    }
  }, [externalParameters]);

  const debouncedParameters = useDebounce(plumeParameters, GRID_CONFIG.debounceDelay);

  const handleParametersChange = useCallback((newParams: PlumeParameters) => {
    if (plumeParameters.stabilityClass !== newParams.stabilityClass) {
      clearDispersionCoefficientsCache();
    }
    setPlumeParameters(newParams);
    setCalculationError(null);
  }, [plumeParameters.stabilityClass]);

  // 3. EFFECT: Perform Calculation when parameters change
  useEffect(() => {
    if (!debouncedParameters) return;

    let isMounted = true;

    const performCalculation = async () => {
      try {
        setIsCalculating(true);
        setCalculationError(null);

        // Run calculation
        const { result, metrics } = await measurePerformance(
          'CONCENTRATION_GRID',
          GRID_CONFIG.resolution * GRID_CONFIG.resolution,
          () => generateConcentrationGrid(
            debouncedParameters,
            GRID_CONFIG.resolution,
            GRID_CONFIG.maxDistance
          )
        );

        if (isMounted) {
          // Update State with Results
          setConcentrationGrid(result);
          
          const status = getPerformanceStatus('CONCENTRATION_GRID', metrics.executionTime);
          if (status === 'poor' && process.env.NODE_ENV === 'development') {
            console.warn(`Poor calc performance: ${metrics.executionTime.toFixed(2)}ms`);
          }
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown calculation error';
          setCalculationError(errorMessage);
          console.error('Gaussian plume calculation error:', error);
          setConcentrationGrid([]);
        }
      } finally {
        if (isMounted) {
          setIsCalculating(false);
        }
      }
    };

    performCalculation();

    return () => {
      isMounted = false;
    };
  }, [debouncedParameters]);

  // Derive map center from source (keep simplistic for now)
  const mapCenter: [number, number] = [plumeParameters.sourceY, plumeParameters.sourceX];

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-[600px] bg-black">
      {/* Parameter Controls Panel */}
      <div className="lg:w-80 lg:h-full overflow-y-auto border-r border-red-500/60">
        <PlumeParameterControls
          parameters={plumeParameters}
          onParametersChange={handleParametersChange}
          mapCenter={mapCenter}
        />
        
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
          // Force re-render if center changes drastically to ensure tiles load
          key={`${mapCenter[0]}-${mapCenter[1]}`} 
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Render the Overlay if we have grid points */}
          {concentrationGrid.length > 0 && (
            <PlumePolygonOverlay
              concentrationGrid={concentrationGrid}
              gridResolution={GRID_CONFIG.resolution}
              maxDistance={GRID_CONFIG.maxDistance}
            />
          )}

          <SourceMarker plumeParams={plumeParameters} />
        </MapContainer>
      </div>
    </div>
  );
}