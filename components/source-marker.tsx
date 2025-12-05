'use client';

import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { PlumeParameters } from '@/lib/gaussian-plume';

/**
 * Props for the SourceMarker component
 */
interface SourceMarkerProps {
  /** Plume parameters containing source location and emission details */
  plumeParams: PlumeParameters;
}

/**
 * Creates a custom pulsing red circle icon for the emission source marker
 * Following V.I.C.T.O.R.'s dark clinical aesthetic with red highlighting
 */
function createPulsingSourceIcon(): DivIcon {
  return new DivIcon({
    className: 'source-marker-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <!-- Pulsing outer ring -->
        <div class="absolute w-8 h-8 bg-red-500/30 rounded-full animate-ping"></div>
        <!-- Secondary pulse ring -->
        <div class="absolute w-6 h-6 bg-red-500/50 rounded-full animate-pulse"></div>
        <!-- Core marker -->
        <div class="relative w-4 h-4 bg-red-600 rounded-full border-2 border-red-400 shadow-lg shadow-red-500/50"></div>
        <!-- Center dot -->
        <div class="absolute w-1.5 h-1.5 bg-white rounded-full"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

/**
 * Formats emission rate for display with appropriate units
 * @param emissionRate - Emission rate in g/s
 * @returns Formatted string with appropriate units
 */
function formatEmissionRate(emissionRate: number): string {
  if (emissionRate === 0) {
    return '0 g/s';
  } else if (emissionRate < 0.001) {
    return `${(emissionRate * 1000000).toFixed(2)} μg/s`;
  } else if (emissionRate < 1) {
    return `${(emissionRate * 1000).toFixed(2)} mg/s`;
  } else {
    return `${emissionRate.toFixed(2)} g/s`;
  }
}

/**
 * Formats wind direction for display
 * @param windDirection - Wind direction in degrees from north
 * @returns Formatted string with cardinal direction
 */
function formatWindDirection(windDirection: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(windDirection / 22.5) % 16;
  return `${windDirection.toFixed(1)}° (${directions[index]})`;
}

/**
 * Formats atmospheric stability class for display
 * @param stabilityClass - Pasquill-Gifford stability class
 * @returns Formatted string with description
 */
function formatStabilityClass(stabilityClass: string): string {
  const descriptions: Record<string, string> = {
    'A': 'A - Extremely Unstable',
    'B': 'B - Moderately Unstable', 
    'C': 'C - Slightly Unstable',
    'D': 'D - Neutral',
    'E': 'E - Slightly Stable',
    'F': 'F - Moderately Stable'
  };
  return descriptions[stabilityClass] || stabilityClass;
}

/**
 * Source marker component that displays the emission source location on the map
 * 
 * This component renders a pulsing red circle marker at the emission source coordinates
 * with a tooltip showing detailed source parameters. The styling follows V.I.C.T.O.R.'s
 * dark clinical aesthetic with red highlighting for critical information.
 */
export function SourceMarker({ plumeParams }: SourceMarkerProps) {
  const sourcePosition: [number, number] = [plumeParams.sourceY, plumeParams.sourceX];
  
  return (
    <Marker
      position={sourcePosition}
      icon={createPulsingSourceIcon()}
    >
      <Popup
        className="source-popup"
        maxWidth={300}
        closeButton={true}
        autoClose={false}
        closeOnEscapeKey={true}
      >
        <div className="bg-black text-white p-3 font-mono text-sm border border-red-500/60 rounded">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-500/30">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <h3 className="text-red-400 font-semibold text-base">Emission Source</h3>
          </div>
          
          {/* Source Location */}
          <div className="space-y-2 mb-3">
            <div className="text-yellow-400 font-semibold">Location</div>
            <div className="pl-2 space-y-1">
              <div>
                <span className="text-gray-400">Latitude:</span>{' '}
                <span className="text-white">{plumeParams.sourceY.toFixed(6)}°</span>
              </div>
              <div>
                <span className="text-gray-400">Longitude:</span>{' '}
                <span className="text-white">{plumeParams.sourceX.toFixed(6)}°</span>
              </div>
            </div>
          </div>
          
          {/* Emission Parameters */}
          <div className="space-y-2 mb-3">
            <div className="text-yellow-400 font-semibold">Emission Parameters</div>
            <div className="pl-2 space-y-1">
              <div>
                <span className="text-gray-400">Rate:</span>{' '}
                <span className="text-white">{formatEmissionRate(plumeParams.emissionRate)}</span>
              </div>
              <div>
                <span className="text-gray-400">Stack Height:</span>{' '}
                <span className="text-white">{plumeParams.stackHeight.toFixed(1)} m</span>
              </div>
            </div>
          </div>
          
          {/* Atmospheric Conditions */}
          <div className="space-y-2">
            <div className="text-yellow-400 font-semibold">Atmospheric Conditions</div>
            <div className="pl-2 space-y-1">
              <div>
                <span className="text-gray-400">Wind Speed:</span>{' '}
                <span className="text-white">{plumeParams.windSpeed.toFixed(1)} m/s</span>
              </div>
              <div>
                <span className="text-gray-400">Wind Direction:</span>{' '}
                <span className="text-white">{formatWindDirection(plumeParams.windDirection)}</span>
              </div>
              <div>
                <span className="text-gray-400">Stability Class:</span>{' '}
                <span className="text-white">{formatStabilityClass(plumeParams.stabilityClass)}</span>
              </div>
            </div>
          </div>
          
          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-red-500/30">
            <div className="text-xs text-gray-500">
              V.I.C.T.O.R. Gaussian Plume Model
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}