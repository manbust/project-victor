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
  thresholds: number[];
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
  NEGLIGIBLE: '#1f2937',    // Dark gray for very low concentrations
  LOW: '#374151',           // Medium gray
  MEDIUM: '#fbbf24',        // Yellow (border-yellow-500)
  HIGH: '#ef4444',          // Red (border-red-500)
  CRITICAL: '#dc2626'       // Bright red (border-red-600)
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
function getVisualizationProperties(
  concentrationLevel: number,
  maxConcentration: number
): { color: string; opacity: number } {
  const ratio = concentrationLevel / maxConcentration;
  
  if (ratio < 0.1) {
    return { color: CONCENTRATION_COLORS.NEGLIGIBLE, opacity: 0.3 };
  } else if (ratio < 0.3) {
    return { color: CONCENTRATION_COLORS.LOW, opacity: 0.4 };
  } else if (ratio < 0.6) {
    return { color: CONCENTRATION_COLORS.MEDIUM, opacity: 0.6 };
  } else if (ratio < 0.8) {
    return { color: CONCENTRATION_COLORS.HIGH, opacity: 0.7 };
  } else {
    return { color: CONCENTRATION_COLORS.CRITICAL, opacity: 0.8 };
  }
}

/**
 * Creates a regular grid from scattered concentration points using interpolation
 * 
 * @param points - Scattered concentration points
 * @param gridResolution - Number of grid points in each direction
 * @param maxDistance - Maximum distance to consider
 * @returns Regular grid suitable for marching squares
 */
function createRegularGrid(
  points: ConcentrationPoint[],
  gridResolution: number,
  _maxDistance: number
): GridPoint[][] {
  if (points.length === 0) {
    throw new Error('Cannot create grid from empty point array');
  }
  
  // Find bounds of the concentration field
  const minLat = Math.min(...points.map(p => p.lat));
  const maxLat = Math.max(...points.map(p => p.lat));
  const minLon = Math.min(...points.map(p => p.lon));
  const maxLon = Math.max(...points.map(p => p.lon));
  
  const deltaLat = (maxLat - minLat) / (gridResolution - 1);
  const deltaLon = (maxLon - minLon) / (gridResolution - 1);
  
  const grid: GridPoint[][] = [];
  
  for (let i = 0; i < gridResolution; i++) {
    const row: GridPoint[] = [];
    const lat = minLat + i * deltaLat;
    
    for (let j = 0; j < gridResolution; j++) {
      const lon = minLon + j * deltaLon;
      
      // Interpolate concentration at this grid point using inverse distance weighting
      const concentration = interpolateConcentration(lat, lon, points);
      
      row.push({
        x: j * deltaLon * 111000, // Approximate conversion to meters
        y: i * deltaLat * 111000, // Approximate conversion to meters
        lat,
        lon,
        concentration
      });
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
function interpolateConcentration(
  lat: number,
  lon: number,
  points: ConcentrationPoint[]
): number {
  let weightedSum = 0;
  let weightSum = 0;
  const maxDistance = 1000; // Maximum influence distance in meters
  
  for (const point of points) {
    // Calculate distance using simple Euclidean approximation
    const deltaLat = (lat - point.lat) * 111000; // Convert to meters
    const deltaLon = (lon - point.lon) * 111000 * Math.cos(lat * Math.PI / 180);
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
    
    if (distance < 1) {
      // Very close to a known point, return its concentration
      return point.concentration;
    }
    
    if (distance < maxDistance) {
      const weight = 1 / (distance * distance); // Inverse distance squared
      weightedSum += point.concentration * weight;
      weightSum += weight;
    }
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
function extractContourSegments(
  grid: GridPoint[][],
  threshold: number
): ContourSegment[] {
  const segments: ContourSegment[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  
  // Process each cell in the grid
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const cell: MarchingSquareCell = {
        topLeft: grid[i][j],
        topRight: grid[i][j + 1],
        bottomLeft: grid[i + 1][j],
        bottomRight: grid[i + 1][j + 1]
      };
      
      const cellSegments = processMarchingSquareCell(cell, threshold);
      segments.push(...cellSegments);
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
  if (segments.length === 0) {
    return [];
  }
  
  const polygons: [number, number][][] = [];
  const usedSegments = new Set<number>();
  const tolerance = 1e-8; // Tolerance for coordinate matching
  
  for (let i = 0; i < segments.length; i++) {
    if (usedSegments.has(i)) {
      continue;
    }
    
    const polygon: [number, number][] = [];
    const currentSegment = segments[i];
    usedSegments.add(i);
    
    polygon.push(currentSegment.start);
    polygon.push(currentSegment.end);
    
    // Try to connect more segments to form a closed polygon
    let foundConnection = true;
    while (foundConnection && polygon.length < 1000) { // Prevent infinite loops
      foundConnection = false;
      const lastPoint = polygon[polygon.length - 1];
      
      for (let j = 0; j < segments.length; j++) {
        if (usedSegments.has(j)) {
          continue;
        }
        
        const segment = segments[j];
        
        // Check if this segment connects to the end of our current polygon
        if (pointsEqual(lastPoint, segment.start, tolerance)) {
          polygon.push(segment.end);
          usedSegments.add(j);
          foundConnection = true;
          break;
        } else if (pointsEqual(lastPoint, segment.end, tolerance)) {
          polygon.push(segment.start);
          usedSegments.add(j);
          foundConnection = true;
          break;
        }
      }
    }
    
    // Close the polygon if it's not already closed
    if (polygon.length >= 3) {
      const firstPoint = polygon[0];
      const lastPoint = polygon[polygon.length - 1];
      
      if (!pointsEqual(firstPoint, lastPoint, tolerance)) {
        polygon.push(firstPoint); // Close the polygon
      }
      
      polygons.push(polygon);
    }
  }
  
  return polygons;
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
  config: ContourConfig = {
    thresholds: DEFAULT_THRESHOLDS,
    gridResolution: 50,
    maxDistance: 10000,
    maxPolygonPoints: DEFAULT_MAX_POLYGON_POINTS,
    simplificationTolerance: DEFAULT_SIMPLIFICATION_TOLERANCE
  }
): PlumePolygon[] {
  if (points.length === 0) {
    return [];
  }
  
  const { 
    thresholds, 
    gridResolution, 
    maxDistance,
    maxPolygonPoints = DEFAULT_MAX_POLYGON_POINTS,
    simplificationTolerance = DEFAULT_SIMPLIFICATION_TOLERANCE
  } = config;
  
  const polygons: PlumePolygon[] = [];
  
  // Find maximum concentration for color scaling
  const maxConcentration = Math.max(...points.map(p => p.concentration));
  
  if (maxConcentration <= 0) {
    return []; // No meaningful concentrations
  }
  
  // Create regular grid for marching squares
  const grid = createRegularGrid(points, gridResolution, maxDistance);
  
  // Generate contours for each threshold
  for (const threshold of thresholds) {
    if (threshold > maxConcentration) {
      continue; // Skip thresholds above maximum concentration
    }
    
    // Extract contour segments using marching squares
    const segments = extractContourSegments(grid, threshold);
    
    if (segments.length === 0) {
      continue;
    }
    
    // Connect segments into closed polygons
    const polygonCoords = connectSegmentsToPolygons(segments);
    
    // Get visualization properties for this threshold
    const { color, opacity } = getVisualizationProperties(threshold, maxConcentration);
    
    // Create polygon objects with automatic simplification
    for (let coords of polygonCoords) {
      if (coords.length >= 4) { // Minimum for a valid polygon (including closure)
        
        // Apply simplification if polygon is too complex
        if (coords.length > maxPolygonPoints) {
          coords = simplifyPolygon(coords, simplificationTolerance);
          
          // If simplification resulted in too few points, skip this polygon
          if (coords.length < 4) {
            continue;
          }
        }
        
        polygons.push({
          coordinates: coords,
          concentrationLevel: threshold,
          color,
          opacity
        });
      }
    }
  }
  
  // Sort polygons by concentration level (highest first for proper rendering order)
  polygons.sort((a, b) => b.concentrationLevel - a.concentrationLevel);
  
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