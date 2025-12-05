'use client';

import { useMemo } from 'react';
import { Polygon } from 'react-leaflet';
import { ConcentrationPoint } from '@/lib/gaussian-plume';
import { generateContourPolygons, PlumePolygon, ContourConfig } from '@/lib/contour-polygons';

interface PlumePolygonOverlayProps {
  concentrationGrid: ConcentrationPoint[];
  thresholds?: number[];
  gridResolution?: number;
  maxDistance?: number;
}

/**
 * V.I.C.T.O.R. "Red Cloud" Color Scheme
 * Strictly enforces the red biohazard aesthetic.
 * 
 * - EDGE: Very faint, deep red (The outer gas cloud)
 * - OUTER: Visible red
 * - CORE: Intense, opaque red (The danger zone)
 */
const VICTOR_RED_PALETTE = {
  EDGE:  '#7f1d1d', // Darkest Red (Tailwind red-900)
  OUTER: '#b91c1c', // Dark Red (Tailwind red-700)
  MID:   '#ef4444', // Base Red (Tailwind red-500)
  CORE:  '#f87171', // Light Red (Tailwind red-400) - Lighter looks "hotter" on dark maps
} as const;

function getVictorRedProperties(
  concentrationLevel: number,
  maxConcentration: number
): { color: string; opacity: number; weight: number } {
  const ratio = concentrationLevel / maxConcentration;
  
  // Logic: The lower the ratio (relative to max), the further out from the center
  if (ratio < 0.1) {
    // The visual edge of the cloud
    return { 
      color: VICTOR_RED_PALETTE.EDGE, 
      opacity: 0.2, // Very transparent
      weight: 0     // No border for smooth smoke look
    };
  } else if (ratio < 0.4) {
    return { 
      color: VICTOR_RED_PALETTE.OUTER, 
      opacity: 0.35,
      weight: 0
    };
  } else if (ratio < 0.7) {
    return { 
      color: VICTOR_RED_PALETTE.MID, 
      opacity: 0.5,
      weight: 1 // Slight border
    };
  } else {
    // The "Death Zone" center
    return { 
      color: VICTOR_RED_PALETTE.CORE, 
      opacity: 0.7, // Mostly opaque
      weight: 2
    };
  }
}

export function PlumePolygonOverlay({
  concentrationGrid,
  gridResolution = 50,
  maxDistance = 10000
}: PlumePolygonOverlayProps) {
  
  const contourPolygons: PlumePolygon[] = useMemo(() => {
    if (!concentrationGrid || concentrationGrid.length === 0) {
      return [];
    }
    
    try {
      const config: ContourConfig = {
        gridResolution,
        maxDistance,
        maxPolygonPoints: 100,
        simplificationTolerance: 0.0001
      };
      
      // Generate the raw geometric polygons
      const rawPolygons = generateContourPolygons(concentrationGrid, config);
      
      const maxConcentration = Math.max(...concentrationGrid.map(p => p.concentration));
      
      // Apply the V.I.C.T.O.R. Red Paint
      return rawPolygons.map(polygon => {
        const victorProps = getVictorRedProperties(
          polygon.concentrationLevel,
          maxConcentration
        );
        
        return {
          ...polygon,
          color: victorProps.color,
          opacity: victorProps.opacity,
          // We attach the calculated props to the object to use in rendering below
          _victorWeight: victorProps.weight
        } as PlumePolygon & { _victorWeight: number };
      });
      
    } catch (error) {
      console.error('Error generating contour polygons:', error);
      return [];
    }
  }, [concentrationGrid, gridResolution, maxDistance]);
  
  if (contourPolygons.length === 0) {
    return null;
  }
  
  return (
    <>
      {contourPolygons.map((polygon, index) => {
        // Type assertion for the custom prop we added
        const p = polygon as PlumePolygon & { _victorWeight: number };
        
        return (
          <Polygon
            key={`contour-${index}-${p.concentrationLevel}`}
            positions={p.coordinates}
            pathOptions={{
              color: p.color,       // Stroke Color
              fillColor: p.color,   // Fill Color
              fillOpacity: p.opacity,
              opacity: p.opacity + 0.1, // Stroke is slightly more visible
              weight: p._victorWeight,
              stroke: p._victorWeight > 0,
              fill: true,
              interactive: false // Disable interaction to make it feel like a "layer"
            }}
          />
        );
      })}
    </>
  );
}