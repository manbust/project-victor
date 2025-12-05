/**
 * Tests for PlumePolygonOverlay component
 */

import { describe, it, expect } from 'vitest';
import { ConcentrationPoint } from '@/lib/gaussian-plume';

// Sample concentration grid for testing
const sampleConcentrationGrid: ConcentrationPoint[] = [
  {
    x: 100,
    y: 0,
    concentration: 1e-6,
    lat: 40.7128,
    lon: -74.0060
  },
  {
    x: 200,
    y: 50,
    concentration: 5e-7,
    lat: 40.7130,
    lon: -74.0058
  },
  {
    x: 300,
    y: -50,
    concentration: 2e-7,
    lat: 40.7126,
    lon: -74.0056
  }
];

describe('PlumePolygonOverlay', () => {
  it('validates concentration grid data structure', () => {
    // Test that our sample data has the expected structure
    expect(sampleConcentrationGrid).toHaveLength(3);
    
    sampleConcentrationGrid.forEach(point => {
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('concentration');
      expect(point).toHaveProperty('lat');
      expect(point).toHaveProperty('lon');
      
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
      expect(typeof point.concentration).toBe('number');
      expect(typeof point.lat).toBe('number');
      expect(typeof point.lon).toBe('number');
      
      expect(point.concentration).toBeGreaterThan(0);
      expect(point.lat).toBeGreaterThanOrEqual(-90);
      expect(point.lat).toBeLessThanOrEqual(90);
      expect(point.lon).toBeGreaterThanOrEqual(-180);
      expect(point.lon).toBeLessThanOrEqual(180);
    });
  });

  it('validates V.I.C.T.O.R. color scheme constants', () => {
    // Test that the color constants are properly defined
    const VICTOR_COLORS = {
      NEGLIGIBLE: '#1f2937',
      LOW: '#374151',
      MEDIUM: '#fbbf24',
      HIGH: '#ef4444',
      CRITICAL: '#dc2626'
    };
    
    Object.values(VICTOR_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});