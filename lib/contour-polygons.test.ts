/**
 * Tests for contour polygon generation
 */

import { describe, it, expect } from 'vitest';
import { generateContourPolygons, simplifyPolygon } from './contour-polygons';
import { type ConcentrationPoint } from './gaussian-plume';

describe('contour polygon generation', () => {
  // Create test data with a simple concentration field
  const createTestPoints = (): ConcentrationPoint[] => {
    const points: ConcentrationPoint[] = [];
    
    // Create a simple 5x5 grid with decreasing concentration from center
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const x = i * 100; // 100m spacing
        const y = (j - 2) * 100; // Center at j=2
        const lat = 40.0 + i * 0.001; // Approximate lat/lon
        const lon = -74.0 + j * 0.001;
        
        // Simple radial concentration pattern
        const distance = Math.sqrt(x * x + y * y);
        const concentration = Math.max(0, 1e-6 * Math.exp(-distance / 200));
        
        points.push({
          x,
          y,
          concentration,
          lat,
          lon
        });
      }
    }
    
    return points;
  };

  it('should generate polygons from concentration points', () => {
    const points = createTestPoints();
    const polygons = generateContourPolygons(points, {
      thresholds: [1e-7, 5e-7, 1e-6],
      gridResolution: 10,
      maxDistance: 1000
    });
    
    expect(polygons).toBeDefined();
    expect(Array.isArray(polygons)).toBe(true);
  });

  it('should return empty array for empty input', () => {
    const polygons = generateContourPolygons([]);
    expect(polygons).toEqual([]);
  });

  it('should return empty array for zero concentrations', () => {
    const points: ConcentrationPoint[] = [
      { x: 0, y: 0, concentration: 0, lat: 40.0, lon: -74.0 },
      { x: 100, y: 0, concentration: 0, lat: 40.001, lon: -74.0 },
      { x: 0, y: 100, concentration: 0, lat: 40.0, lon: -73.999 }
    ];
    
    const polygons = generateContourPolygons(points);
    expect(polygons).toEqual([]);
  });

  it('should create polygons with proper structure', () => {
    const points = createTestPoints();
    const polygons = generateContourPolygons(points, {
      thresholds: [1e-7],
      gridResolution: 10,
      maxDistance: 1000
    });
    
    for (const polygon of polygons) {
      expect(polygon).toHaveProperty('coordinates');
      expect(polygon).toHaveProperty('concentrationLevel');
      expect(polygon).toHaveProperty('color');
      expect(polygon).toHaveProperty('opacity');
      
      expect(Array.isArray(polygon.coordinates)).toBe(true);
      expect(typeof polygon.concentrationLevel).toBe('number');
      expect(typeof polygon.color).toBe('string');
      expect(typeof polygon.opacity).toBe('number');
      
      // Check that polygons are closed (first and last points should be equal)
      if (polygon.coordinates.length > 0) {
        const first = polygon.coordinates[0];
        const last = polygon.coordinates[polygon.coordinates.length - 1];
        expect(first[0]).toBeCloseTo(last[0], 6);
        expect(first[1]).toBeCloseTo(last[1], 6);
      }
    }
  });

  it('should sort polygons by concentration level (highest first)', () => {
    const points = createTestPoints();
    const polygons = generateContourPolygons(points, {
      thresholds: [1e-8, 5e-7, 1e-7],
      gridResolution: 10,
      maxDistance: 1000
    });
    
    for (let i = 1; i < polygons.length; i++) {
      expect(polygons[i - 1].concentrationLevel).toBeGreaterThanOrEqual(
        polygons[i].concentrationLevel
      );
    }
  });

  it('should handle thresholds above maximum concentration', () => {
    const points: ConcentrationPoint[] = [
      { x: 0, y: 0, concentration: 1e-8, lat: 40.0, lon: -74.0 },
      { x: 100, y: 0, concentration: 5e-9, lat: 40.001, lon: -74.0 }
    ];
    
    const polygons = generateContourPolygons(points, {
      thresholds: [1e-6, 1e-7], // Both above max concentration
      gridResolution: 5,
      maxDistance: 500
    });
    
    expect(polygons).toEqual([]);
  });
});

describe('polygon simplification', () => {
  it('should simplify polygon coordinates', () => {
    const coordinates: [number, number][] = [
      [40.0, -74.0],
      [40.0001, -74.0],
      [40.0002, -74.0],
      [40.0003, -74.0001],
      [40.0002, -74.0002],
      [40.0001, -74.0001],
      [40.0, -74.0] // Closed polygon
    ];
    
    const simplified = simplifyPolygon(coordinates, 0.0001);
    
    expect(simplified.length).toBeLessThanOrEqual(coordinates.length);
    expect(simplified.length).toBeGreaterThanOrEqual(2); // Minimum for line segment
  });

  it('should preserve small polygons', () => {
    const coordinates: [number, number][] = [
      [40.0, -74.0],
      [40.001, -74.0],
      [40.0, -74.001],
      [40.0, -74.0]
    ];
    
    const simplified = simplifyPolygon(coordinates, 0.00001); // Very small tolerance
    expect(simplified.length).toBeGreaterThanOrEqual(2);
    expect(simplified.length).toBeLessThanOrEqual(coordinates.length);
  });

  it('should handle empty coordinates', () => {
    const simplified = simplifyPolygon([]);
    expect(simplified).toEqual([]);
  });
});