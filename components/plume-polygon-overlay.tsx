'use client';

import { useEffect, useMemo } from 'react';
import { Polygon } from 'react-leaflet';
import { ConcentrationPoint } from '@/lib/gaussian-plume';
import { generateContourPolygons, PlumePolygon, ContourConfig } from '@/lib/contour-polygons';

/**
 * Props for the PlumePolygonOverlay component
 */
interface PlumePolygonOverlayProps {
  /** Array of concentration points from Gaussian plume calculation */
  concentrationGrid: ConcentrationPoint[];
  /** Concentration thresholds to generate contours for (optional) */
  thresholds?: number[];
  /** Grid resolution for contour generation (optional) */
  gridResolution?: number;
  /** Maximum distance from source to consider (optional) */
  maxDistance?: number;
}

/**
 * Default concentration thresholds following V.I.C.T.O.R. safety levels
 * These represent typical safety thresholds for airborne contaminants
 */
const DEFAULT_THRESHOLDS: number[] = [
  1e-9,   // 1 ng/m³ - Detection limit
  1e-8,   // 10 ng/m³ - Low concern
  1e-7,   // 100 ng/m³ - Medium concern
  1e-6,   // 1 μg/m³ - High concern
  1e-5    // 10 μg/m³ - Critical level
];

/**
 * V.I.C.T.O.R. color scheme for concentration visualization
 * Following the dark clinical aesthetic with red/yellow for high concentrations
 */
const VICTOR_COLORS = {
  NEGLIGIBLE: '#1f2937',    // Dark gray for very low concentrations
  LOW: '#374151',           // Medium gray
  MEDIUM: '#fbbf24',        // Yellow (border-yellow-500)
  HIGH: '#ef4444',          // Red (border-red-500)
  CRITICAL: '#dc2626'       // Bright red (border-red-600)
} as const;

/**
 * Maps concentration level to V.I.C.T.O.R. color scheme
 * 
 * @param concentrationLevel - The concentration threshold
 * @param maxConcentration - Maximum concentration in the field
 * @returns Color and opacity for visualization following V.I.C.T.O.R. aesthetic
 */
function getVictorVisualizationProperties(
  concentrationLevel: number,
  maxConcentration: number
): { color: string; opacity: number; weight: number } {
  const ratio: number = concentrationLevel / maxConcentration;
  
  if (ratio < 0.1) {
    return { 
      color: VICTOR_COLORS.NEGLIGIBLE, 
      opacity: 0.3,
      weight: 1
    };
  } else if (ratio < 0.3) {
    return { 
      color: VICTOR_COLORS.LOW, 
      opacity: 0.4,
      weight: 1
    };
  } else if (ratio < 0.6) {
    return { 
      color: VICTOR_COLORS.MEDIUM, 
      opacity: 0.6,
      weight: 2
    };
  } else if (ratio < 0.8) {
    return { 
      color: VICTOR_COLORS.HIGH, 
      opacity: 0.7,
      weight: 2
    };
  } else {
    return { 
      color: VICTOR_COLORS.CRITICAL, 
      opacity: 0.8,
      weight: 3
    };
  }
}

/**
 * Component that renders concentration contours as Leaflet polygons on the map
 * 
 * This component takes a concentration grid from Gaussian plume calculations
 * and renders it as color-coded polygon overlays using the V.I.C.T.O.R. color scheme.
 * High concentrations are displayed in red/yellow following the clinical aesthetic.
 */
export function PlumePolygonOverlay({
  concentrationGrid,
  thresholds = DEFAULT_THRESHOLDS,
  gridResolution = 50,
  maxDistance = 10000
}: PlumePolygonOverlayProps) {
  
  /**
   * Generate contour polygons from concentration grid
   * Memoized to prevent unnecessary recalculation on re-renders
   * Includes performance optimizations for polygon simplification
   */
  const contourPolygons: PlumePolygon[] = useMemo(() => {
    if (!concentrationGrid || concentrationGrid.length === 0) {
      return [];
    }
    
    try {
      // Performance-optimized configuration
      const config: ContourConfig = {
        thresholds,
        gridResolution,
        maxDistance,
        maxPolygonPoints: 100,        // Simplify polygons with more than 100 points
        simplificationTolerance: 0.0001  // ~11 meters tolerance at equator
      };
      
      const polygons = generateContourPolygons(concentrationGrid, config);
      
      // Apply V.I.C.T.O.R. color scheme to generated polygons
      const maxConcentration = Math.max(...concentrationGrid.map(p => p.concentration));
      
      return polygons.map(polygon => {
        const victorProps = getVictorVisualizationProperties(
          polygon.concentrationLevel,
          maxConcentration
        );
        
        return {
          ...polygon,
          color: victorProps.color,
          opacity: victorProps.opacity
        };
      });
      
    } catch (error) {
      console.error('Error generating contour polygons:', error);
      return [];
    }
  }, [concentrationGrid, thresholds, gridResolution, maxDistance]);
  
  /**
   * Log polygon generation for debugging in development
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Generated ${contourPolygons.length} contour polygons from ${concentrationGrid.length} concentration points`);
    }
  }, [contourPolygons.length, concentrationGrid.length]);
  
  // Don't render anything if no polygons were generated
  if (contourPolygons.length === 0) {
    return null;
  }
  
  return (
    <>
      {contourPolygons.map((polygon, index) => {
        // Validate polygon coordinates
        if (!polygon.coordinates || polygon.coordinates.length < 4) {
          return null; // Skip invalid polygons
        }
        
        // Get V.I.C.T.O.R. styling properties
        const maxConcentration = Math.max(...concentrationGrid.map(p => p.concentration));
        const victorProps = getVictorVisualizationProperties(
          polygon.concentrationLevel,
          maxConcentration
        );
        
        return (
          <Polygon
            key={`contour-${index}-${polygon.concentrationLevel}`}
            positions={polygon.coordinates}
            pathOptions={{
              color: victorProps.color,
              fillColor: victorProps.color,
              fillOpacity: victorProps.opacity,
              opacity: Math.min(victorProps.opacity + 0.2, 1.0), // Slightly more opaque border
              weight: victorProps.weight,
              stroke: true,
              fill: true,
              interactive: true
            }}
          >
            {/* Optional: Add popup with concentration information */}
            {/* 
            <Popup>
              <div className="font-mono text-sm bg-black text-white p-2">
                <div>Concentration Level: {polygon.concentrationLevel.toExponential(2)} g/m³</div>
                <div>Contour #{index + 1}</div>
              </div>
            </Popup>
            */}
          </Polygon>
        );
      })}
    </>
  );
}