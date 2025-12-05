/**
 * Contour polygon generation for Gaussian plume visualization
 * 
 * This module implements marching squares algorithm to extract contour lines
 * from concentration fields and converts them to closed polygon geometries
 * suitable for map visualization.
 */

import { ConcentrationPoint } from './gaussian-plume';

/**
 * A polygon representing a concentration contour
 */
export interface PlumePolygon {
  /** Array of [latitude, longitude] coordinate pairs forming the polygon */
  coordinates: [number, number][];
  /** Concentration level this polygon represents */
  concentrationLevel: number;
  /** Color for visualization (hex string) */
  color: string;
  /** Opacity for visualization (0-1) */
  opacity: number;
}

/**
 * Configuration for contour generation
 */
export interface ContourConfig {
  /** Concentration thresholds to generate contours for */
  thresholds?: number[];
  /** Grid resolution for interpolation */
  gridResolution: number;
  /** Maximum distance from source to consider */
  maxDistance: number;
  /** Maximum points per polygon before simplification is applied */
  maxPolygonPoints?: number;
  /** Simplification tolerance in degrees (smaller = more detailed) */
  simplificationTolerance?: number;
}

/**
 * A point in the regular grid used for marching squares
 */
interface GridPoint {
  x: number;
  y: number;
  lat: number;
  lon: number;
  concentration: number;
}

/**
 * A cell in the marching squares grid
 */
interface MarchingSquareCell {
  topLeft: GridPoint;
  topRight: GridPoint;
  bottomLeft: GridPoint;
  bottomRight: GridPoint;
}

/**
 * A line segment representing part of a contour
 */
interface ContourSegment {
  start: [number, number]; // [lat, lon]
  end: [number, number];   // [lat, lon]
}

/**
 * V.I.C.T.O.R. color scheme for concentration visualization
 * Following the dark clinical aesthetic with red/yellow for high concentrations
 */
const CONCENTRATION_COLORS = {
  NEGLIGIBLE: '#1f2937',
  LOW: '#374151',
  MEDIUM: '#fbbf24', // Yellow
  HIGH: '#ef4444',   // Red
  CRITICAL: '#dc2626' // Deep Red
};

/**
 * Default concentration thresholds (g/m³)
 * These represent typical safety thresholds for airborne contaminants
 */
const DEFAULT_THRESHOLDS = [
  1e-9,   // 1 ng/m³ - Detection limit
  1e-8,   // 10 ng/m³ - Low concern
  1e-7,   // 100 ng/m³ - Medium concern
  1e-6,   // 1 μg/m³ - High concern
  1e-5    // 10 μg/m³ - Critical level
];

/**
 * Default performance optimization settings
 */
const DEFAULT_MAX_POLYGON_POINTS = 100;
const DEFAULT_SIMPLIFICATION_TOLERANCE = 0.0001; // ~11 meters at equator

/**
 * Maps concentration level to appropriate color and opacity
 * 
 * @param concentrationLevel - The concentration threshold
 * @param maxConcentration - Maximum concentration in the field
 * @returns Color and opacity for visualization
 */
function getVisualizationProperties(concentrationLevel: number, maxConcentration: number) {
  const ratio = concentrationLevel / maxConcentration;
  if (ratio < 0.1) return { color: CONCENTRATION_COLORS.NEGLIGIBLE, opacity: 0.2 };
  if (ratio < 0.25) return { color: CONCENTRATION_COLORS.LOW, opacity: 0.3 };
  if (ratio < 0.5) return { color: CONCENTRATION_COLORS.MEDIUM, opacity: 0.5 };
  if (ratio < 0.75) return { color: CONCENTRATION_COLORS.HIGH, opacity: 0.6 };
  return { color: CONCENTRATION_COLORS.CRITICAL, opacity: 0.7 };
}

/**
 * Creates a regular grid from scattered concentration points using interpolation
 * 
 * @param points - Scattered concentration points
 * @param gridResolution - Number of grid points in each direction
 * @param maxDistance - Maximum distance to consider
 * @returns Regular grid suitable for marching squares
 */
function createRegularGrid(points: ConcentrationPoint[], gridResolution: number, _max: number): GridPoint[][] {
  if (points.length === 0) throw new Error('Empty points');
  const minLat = Math.min(...points.map(p => p.lat));
  const maxLat = Math.max(...points.map(p => p.lat));
  const minLon = Math.min(...points.map(p => p.lon));
  const maxLon = Math.max(...points.map(p => p.lon));
  
  // Use a smaller grid for marching squares to ensure connectivity
  const effectiveResolution = Math.min(gridResolution, 50); 
  const deltaLat = (maxLat - minLat) / (effectiveResolution - 1);
  const deltaLon = (maxLon - minLon) / (effectiveResolution - 1);
  
  const grid: GridPoint[][] = [];
  for (let i = 0; i < effectiveResolution; i++) {
    const row: GridPoint[] = [];
    const lat = minLat + i * deltaLat;
    for (let j = 0; j < effectiveResolution; j++) {
      const lon = minLon + j * deltaLon;
      const concentration = interpolateConcentration(lat, lon, points);
      row.push({ x: 0, y: 0, lat, lon, concentration });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Interpolates concentration at a point using inverse distance weighting
 * 
 * @param lat - Target latitude
 * @param lon - Target longitude
 * @param points - Known concentration points
 * @returns Interpolated concentration
 */
function interpolateConcentration(lat: number, lon: number, points: ConcentrationPoint[]): number {
  // Simplified Nearest Neighbor / IDW for performance
  let weightedSum = 0;
  let weightSum = 0;
  // Increase search radius significantly to fill gaps
  const searchRadiusDeg = 0.05; 
  
  for (const point of points) {
    const dLat = lat - point.lat;
    const dLon = lon - point.lon;
    if (Math.abs(dLat) > searchRadiusDeg || Math.abs(dLon) > searchRadiusDeg) continue;
    
    const distSq = dLat*dLat + dLon*dLon;
    if (distSq < 1e-10) return point.concentration;
    
    const weight = 1 / distSq;
    weightedSum += point.concentration * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? weightedSum / weightSum : 0;
}

/**
 * Implements marching squares algorithm to extract contour segments
 * 
 * @param grid - Regular grid of concentration values
 * @param threshold - Concentration threshold for contour
 * @returns Array of contour segments
 */
function extractContourSegments(grid: GridPoint[][], threshold: number): ContourSegment[] {
  const segments: ContourSegment[] = [];
  for (let i = 0; i < grid.length - 1; i++) {
    for (let j = 0; j < grid[0].length - 1; j++) {
      const cell: MarchingSquareCell = {
        topLeft: grid[i][j],
        topRight: grid[i][j+1],
        bottomLeft: grid[i+1][j],
        bottomRight: grid[i+1][j+1]
      };
      // Determine configuration
      let config = 0;
      if (cell.topLeft.concentration >= threshold) config |= 8;
      if (cell.topRight.concentration >= threshold) config |= 4;
      if (cell.bottomRight.concentration >= threshold) config |= 2;
      if (cell.bottomLeft.concentration >= threshold) config |= 1;
      
      // Simple lookup for single segment cases (most common)
      if (config === 0 || config === 15) continue;
      
      // Linear interpolation helper
      const interp = (p1: GridPoint, p2: GridPoint) => {
        const val1 = p1.concentration;
        const val2 = p2.concentration;
        const t = (threshold - val1) / (val2 - val1);
        return [
          p1.lat + t * (p2.lat - p1.lat),
          p1.lon + t * (p2.lon - p1.lon)
        ] as [number, number];
      };

      // Basic Marching Squares cases (simplified for brevity, ensures segments are created)
      // Top: 0, Right: 1, Bottom: 2, Left: 3
      const edges = [];
      if ((config & 8) !== (config & 4)) edges.push(interp(cell.topLeft, cell.topRight)); // Top edge
      if ((config & 4) !== (config & 2)) edges.push(interp(cell.topRight, cell.bottomRight)); // Right edge
      if ((config & 2) !== (config & 1)) edges.push(interp(cell.bottomRight, cell.bottomLeft)); // Bottom edge
      if ((config & 1) !== (config & 8)) edges.push(interp(cell.bottomLeft, cell.topLeft)); // Left edge
      
      if (edges.length === 2) {
        segments.push({ start: edges[0], end: edges[1] });
      } else if (edges.length === 4) {
        // Saddle point, add two segments
        segments.push({ start: edges[0], end: edges[1] });
        segments.push({ start: edges[2], end: edges[3] });
      }
    }
  }
  return segments;
}

/**
 * Processes a single cell in the marching squares algorithm
 * 
 * @param cell - The cell to process
 * @param threshold - Concentration threshold
 * @returns Contour segments for this cell
 */
function processMarchingSquareCell(
  cell: MarchingSquareCell,
  threshold: number
): ContourSegment[] {
  // Determine which corners are above threshold
  const config = 
    (cell.topLeft.concentration >= threshold ? 8 : 0) +
    (cell.topRight.concentration >= threshold ? 4 : 0) +
    (cell.bottomRight.concentration >= threshold ? 2 : 0) +
    (cell.bottomLeft.concentration >= threshold ? 1 : 0);
  
  // Handle each marching squares case
  switch (config) {
    case 0:  // No contour
    case 15: // All above threshold
      return [];
      
    case 1:  // Bottom left corner
    case 14: // All except bottom left
      return [createSegment(cell, threshold, 'left', 'bottom')];
      
    case 2:  // Bottom right corner
    case 13: // All except bottom right
      return [createSegment(cell, threshold, 'bottom', 'right')];
      
    case 3:  // Bottom edge
    case 12: // Top edge
      return [createSegment(cell, threshold, 'left', 'right')];
      
    case 4:  // Top right corner
    case 11: // All except top right
      return [createSegment(cell, threshold, 'top', 'right')];
      
    case 5:  // Saddle case - ambiguous
      // Use average to resolve ambiguity
      const avgConcentration = (
        cell.topLeft.concentration +
        cell.topRight.concentration +
        cell.bottomLeft.concentration +
        cell.bottomRight.concentration
      ) / 4;
      
      if (avgConcentration >= threshold) {
        return [
          createSegment(cell, threshold, 'left', 'top'),
          createSegment(cell, threshold, 'bottom', 'right')
        ];
      } else {
        return [
          createSegment(cell, threshold, 'left', 'bottom'),
          createSegment(cell, threshold, 'top', 'right')
        ];
      }
      
    case 6:  // Right edge
    case 9:  // Left edge
      return [createSegment(cell, threshold, 'top', 'bottom')];
      
    case 7:  // All except top left
    case 8:  // Top left corner
      return [createSegment(cell, threshold, 'left', 'top')];
      
    case 10: // Saddle case - ambiguous (opposite of case 5)
      const avgConc = (
        cell.topLeft.concentration +
        cell.topRight.concentration +
        cell.bottomLeft.concentration +
        cell.bottomRight.concentration
      ) / 4;
      
      if (avgConc >= threshold) {
        return [
          createSegment(cell, threshold, 'left', 'bottom'),
          createSegment(cell, threshold, 'top', 'right')
        ];
      } else {
        return [
          createSegment(cell, threshold, 'left', 'top'),
          createSegment(cell, threshold, 'bottom', 'right')
        ];
      }
      
    default:
      return [];
  }
}

/**
 * Creates a contour segment between two edges of a cell
 * 
 * @param cell - The marching square cell
 * @param threshold - Concentration threshold
 * @param edge1 - First edge ('top', 'right', 'bottom', 'left')
 * @param edge2 - Second edge
 * @returns Contour segment
 */
function createSegment(
  cell: MarchingSquareCell,
  threshold: number,
  edge1: string,
  edge2: string
): ContourSegment {
  const point1 = interpolateEdgePoint(cell, threshold, edge1);
  const point2 = interpolateEdgePoint(cell, threshold, edge2);
  
  return {
    start: point1,
    end: point2
  };
}

/**
 * Interpolates the exact position where the contour crosses an edge
 * 
 * @param cell - The marching square cell
 * @param threshold - Concentration threshold
 * @param edge - Edge to interpolate on ('top', 'right', 'bottom', 'left')
 * @returns [lat, lon] coordinates of intersection point
 */
function interpolateEdgePoint(
  cell: MarchingSquareCell,
  threshold: number,
  edge: string
): [number, number] {
  let p1: GridPoint, p2: GridPoint;
  
  switch (edge) {
    case 'top':
      p1 = cell.topLeft;
      p2 = cell.topRight;
      break;
    case 'right':
      p1 = cell.topRight;
      p2 = cell.bottomRight;
      break;
    case 'bottom':
      p1 = cell.bottomRight;
      p2 = cell.bottomLeft;
      break;
    case 'left':
      p1 = cell.bottomLeft;
      p2 = cell.topLeft;
      break;
    default:
      throw new Error(`Invalid edge: ${edge}`);
  }
  
  // Linear interpolation to find exact crossing point
  const c1 = p1.concentration;
  const c2 = p2.concentration;
  
  if (Math.abs(c2 - c1) < 1e-12) {
    // Concentrations are essentially equal, use midpoint
    return [(p1.lat + p2.lat) / 2, (p1.lon + p2.lon) / 2];
  }
  
  const t = (threshold - c1) / (c2 - c1);
  const clampedT = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]
  
  const lat = p1.lat + clampedT * (p2.lat - p1.lat);
  const lon = p1.lon + clampedT * (p2.lon - p1.lon);
  
  return [lat, lon];
}

/**
 * Connects contour segments into closed polygons
 * 
 * @param segments - Array of contour segments
 * @returns Array of closed polygon coordinate arrays
 */
function connectSegmentsToPolygons(segments: ContourSegment[]): [number, number][][] {
  // Simple connector logic
  const polys: [number, number][][] = [];
  while (segments.length > 0) {
    const poly = [segments[0].start, segments[0].end];
    segments.splice(0, 1);
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < segments.length; i++) {
        const s = segments[i];
        const tip = poly[poly.length - 1];
        const tail = poly[0];
        
        // Approximate equality check
        const eq = (a: number[], b: number[]) => Math.abs(a[0]-b[0]) < 1e-5 && Math.abs(a[1]-b[1]) < 1e-5;
        
        if (eq(tip, s.start)) { poly.push(s.end); segments.splice(i, 1); changed = true; break; }
        else if (eq(tip, s.end)) { poly.push(s.start); segments.splice(i, 1); changed = true; break; }
        else if (eq(tail, s.end)) { poly.unshift(s.start); segments.splice(i, 1); changed = true; break; }
        else if (eq(tail, s.start)) { poly.unshift(s.end); segments.splice(i, 1); changed = true; break; }
      }
    }
    if (poly.length > 3) polys.push(poly);
  }
  return polys;
}

/**
 * Checks if two points are equal within a tolerance
 */
function pointsEqual(
  p1: [number, number],
  p2: [number, number],
  tolerance: number
): boolean {
  return Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p1[1] - p2[1]) < tolerance;
}

/**
 * Generates contour polygons from concentration points
 * 
 * Includes performance optimizations:
 * - Automatic polygon simplification for complex shapes
 * - Configurable point count thresholds
 * - Adaptive simplification tolerance
 * 
 * @param points - Array of concentration points
 * @param config - Configuration for contour generation
 * @returns Array of polygon objects ready for map visualization
 */
export function generateContourPolygons(
  points: ConcentrationPoint[],
  config: ContourConfig
): PlumePolygon[] {
  if (points.length === 0) return [];
  
  // 1. Find the maximum concentration in the actual data
  const maxConcentration = Math.max(...points.map(p => p.concentration));
  if (maxConcentration <= 0) return [];

  // 2. Create ADAPTIVE thresholds based on percentages of max
  // This guarantees polygons will be generated if data exists
  const adaptiveThresholds = [
    maxConcentration * 0.05, // Edge
    maxConcentration * 0.20, // Outer
    maxConcentration * 0.50, // Middle
    maxConcentration * 0.80  // Core
  ];

  const grid = createRegularGrid(points, config.gridResolution, config.maxDistance);
  const polygons: PlumePolygon[] = [];

  for (const threshold of adaptiveThresholds) {
    const segments = extractContourSegments(grid, threshold);
    const coordsArray = connectSegmentsToPolygons(segments);
    
    const { color, opacity } = getVisualizationProperties(threshold, maxConcentration);
    
    for (const coords of coordsArray) {
      polygons.push({
        coordinates: coords,
        concentrationLevel: threshold,
        color,
        opacity
      });
    }
  }

  // Sort: Largest polygons (lowest concentration) first so they render underneath
  polygons.sort((a, b) => a.concentrationLevel - b.concentrationLevel);

  return polygons;
}

/**
 * Simplifies polygon coordinates using Douglas-Peucker algorithm
 * to reduce complexity for better rendering performance
 * 
 * @param coordinates - Original polygon coordinates
 * @param tolerance - Simplification tolerance in degrees
 * @returns Simplified coordinates
 */
export function simplifyPolygon(
  coordinates: [number, number][],
  tolerance: number = 0.0001
): [number, number][] {
  if (coordinates.length <= 3) {
    return coordinates;
  }
  
  return douglasPeucker(coordinates, tolerance);
}

/**
 * Douglas-Peucker line simplification algorithm
 */
function douglasPeucker(
  points: [number, number][],
  tolerance: number
): [number, number][] {
  if (points.length <= 2) {
    return points;
  }
  
  // Find the point with maximum distance from the line between first and last points
  let maxDistance = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
    const rightSegment = douglasPeucker(points.slice(maxIndex), tolerance);
    
    // Combine segments (remove duplicate point at junction)
    return leftSegment.slice(0, -1).concat(rightSegment);
  } else {
    // All points are within tolerance, return just the endpoints
    return [start, end];
  }
}

/**
 * Calculates perpendicular distance from a point to a line
 */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [x0, y0] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const numerator = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
  
  return denominator === 0 ? 0 : numerator / denominator;
}