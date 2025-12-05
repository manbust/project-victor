/**
 * Integration test for Gaussian plume calculation and contour polygon generation
 */

import { describe, it, expect } from 'vitest';
import { generateConcentrationGrid, type PlumeParameters } from './gaussian-plume';
import { generateContourPolygons } from './contour-polygons';

describe('Gaussian plume and contour integration', () => {
  it('should generate contour polygons from Gaussian plume calculation', () => {
    // Define realistic plume parameters
    const params: PlumeParameters = {
      sourceX: -74.0,           // Longitude (NYC area)
      sourceY: 40.7,            // Latitude (NYC area)
      emissionRate: 1.0,        // 1 g/s
      windSpeed: 5.0,           // 5 m/s
      windDirection: 90,        // East wind
      stackHeight: 50,          // 50m stack
      stabilityClass: 'D'       // Neutral conditions
    };
    
    // Generate concentration grid
    const concentrationPoints = generateConcentrationGrid(params, 20, 5000);
    
    expect(concentrationPoints.length).toBeGreaterThan(0);
    
    // Generate contour polygons
    const polygons = generateContourPolygons(concentrationPoints, {
      thresholds: [1e-8, 1e-7, 1e-6],
      gridResolution: 15,
      maxDistance: 5000
    });
    
    // Verify polygons were generated
    expect(polygons.length).toBeGreaterThan(0);
    
    // Verify polygon structure
    for (const polygon of polygons) {
      expect(polygon.coordinates.length).toBeGreaterThan(2);
      expect(polygon.concentrationLevel).toBeGreaterThan(0);
      expect(polygon.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(polygon.opacity).toBeGreaterThan(0);
      expect(polygon.opacity).toBeLessThanOrEqual(1);
      
      // Verify coordinates are valid lat/lon
      for (const [lat, lon] of polygon.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      }
    }
  });

  it('should handle different stability classes', () => {
    const baseParams: PlumeParameters = {
      sourceX: -74.0,
      sourceY: 40.7,
      emissionRate: 1.0,
      windSpeed: 3.0,
      windDirection: 180, // South wind
      stackHeight: 30,
      stabilityClass: 'A' // Very unstable
    };
    
    // Test with very unstable conditions (Class A)
    const unstablePoints = generateConcentrationGrid(baseParams, 15, 3000);
    const unstablePolygons = generateContourPolygons(unstablePoints);
    
    // Test with stable conditions (Class F)
    const stableParams = { ...baseParams, stabilityClass: 'F' as const };
    const stablePoints = generateConcentrationGrid(stableParams, 15, 3000);
    const stablePolygons = generateContourPolygons(stablePoints);
    
    // Both should generate polygons, but with different characteristics
    expect(unstablePoints.length).toBeGreaterThan(0);
    expect(stablePoints.length).toBeGreaterThan(0);
    expect(unstablePolygons.length).toBeGreaterThan(0);
    expect(stablePolygons.length).toBeGreaterThan(0);
  });

  it('should handle zero emission rate correctly', () => {
    const params: PlumeParameters = {
      sourceX: -74.0,
      sourceY: 40.7,
      emissionRate: 0.0, // Zero emission
      windSpeed: 5.0,
      windDirection: 90,
      stackHeight: 50,
      stabilityClass: 'D'
    };
    
    const concentrationPoints = generateConcentrationGrid(params, 10, 1000);
    const polygons = generateContourPolygons(concentrationPoints);
    
    // Should return empty arrays for zero emission
    expect(concentrationPoints.length).toBe(0);
    expect(polygons.length).toBe(0);
  });
});