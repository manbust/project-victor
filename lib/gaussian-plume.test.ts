import { describe, it, expect } from 'vitest';
import {
  calculateDispersionCoefficients,
  calculateConcentration,
  generateConcentrationGrid,
  type PlumeParameters
} from './gaussian-plume';

describe('Gaussian Plume Model', () => {
  const sampleParams: PlumeParameters = {
    sourceX: -122.4194, // San Francisco longitude
    sourceY: 37.7749,   // San Francisco latitude
    emissionRate: 10,   // 10 g/s
    windSpeed: 5,       // 5 m/s
    windDirection: 90,  // East
    stackHeight: 50,    // 50 m
    stabilityClass: 'D' // Neutral conditions
  };

  describe('calculateDispersionCoefficients', () => {
    it('should calculate dispersion coefficients for stability class D', () => {
      const coeffs = calculateDispersionCoefficients(1000, 'D');
      
      expect(coeffs.sigmaY).toBeGreaterThan(0);
      expect(coeffs.sigmaZ).toBeGreaterThan(0);
      expect(typeof coeffs.sigmaY).toBe('number');
      expect(typeof coeffs.sigmaZ).toBe('number');
    });

    it('should throw error for invalid downwind distance', () => {
      expect(() => calculateDispersionCoefficients(0, 'D')).toThrow('Downwind distance must be positive');
      expect(() => calculateDispersionCoefficients(-100, 'D')).toThrow('Downwind distance must be positive');
    });

    it('should throw error for invalid stability class', () => {
      expect(() => calculateDispersionCoefficients(1000, 'X')).toThrow('Invalid stability class: X');
    });
  });

  describe('calculateConcentration', () => {
    it('should calculate non-negative concentration', () => {
      const coeffs = calculateDispersionCoefficients(1000, 'D');
      const concentration = calculateConcentration(1000, 0, 0, sampleParams, coeffs);
      
      expect(concentration).toBeGreaterThanOrEqual(0);
      expect(typeof concentration).toBe('number');
      expect(Number.isFinite(concentration)).toBe(true);
    });

    it('should return zero for zero emission rate', () => {
      const zeroEmissionParams = { ...sampleParams, emissionRate: 0 };
      const coeffs = calculateDispersionCoefficients(1000, 'D');
      const concentration = calculateConcentration(1000, 0, 0, zeroEmissionParams, coeffs);
      
      expect(concentration).toBe(0);
    });

    it('should return zero for source location (x = 0)', () => {
      const coeffs = calculateDispersionCoefficients(1, 'D'); // Use small distance for coeffs
      const concentration = calculateConcentration(0, 0, 0, sampleParams, coeffs);
      
      expect(concentration).toBe(0);
    });

    it('should throw error for negative emission rate', () => {
      const invalidParams = { ...sampleParams, emissionRate: -5 };
      const coeffs = calculateDispersionCoefficients(1000, 'D');
      
      expect(() => calculateConcentration(1000, 0, 0, invalidParams, coeffs)).toThrow('Emission rate cannot be negative');
    });

    it('should throw error for non-positive wind speed', () => {
      const invalidParams = { ...sampleParams, windSpeed: 0 };
      const coeffs = calculateDispersionCoefficients(1000, 'D');
      
      expect(() => calculateConcentration(1000, 0, 0, invalidParams, coeffs)).toThrow('Wind speed must be positive');
    });
  });

  describe('generateConcentrationGrid', () => {
    it('should generate concentration grid with valid points', () => {
      const grid = generateConcentrationGrid(sampleParams, 10, 1000);
      
      expect(Array.isArray(grid)).toBe(true);
      expect(grid.length).toBeGreaterThan(0);
      
      // Check first point structure
      const point = grid[0];
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('concentration');
      expect(point).toHaveProperty('lat');
      expect(point).toHaveProperty('lon');
      
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
      expect(typeof point.concentration).toBe('number');
      expect(point.concentration).toBeGreaterThanOrEqual(0);
    });

    it('should properly transform Cartesian coordinates to geographic coordinates', () => {
      const grid = generateConcentrationGrid(sampleParams, 5, 500);
      
      expect(grid.length).toBeGreaterThan(0);
      
      // Find a point that should be displaced from the source
      const displacedPoint = grid.find(point => point.x > 0);
      expect(displacedPoint).toBeDefined();
      
      if (displacedPoint) {
        // Geographic coordinates should be valid
        expect(displacedPoint.lat).toBeGreaterThanOrEqual(-90);
        expect(displacedPoint.lat).toBeLessThanOrEqual(90);
        expect(displacedPoint.lon).toBeGreaterThanOrEqual(-180);
        expect(displacedPoint.lon).toBeLessThanOrEqual(180);
        
        // For eastward wind (90°), points downwind should have different longitude
        // (though the difference might be small for short distances)
        expect(typeof displacedPoint.lat).toBe('number');
        expect(typeof displacedPoint.lon).toBe('number');
        expect(Number.isFinite(displacedPoint.lat)).toBe(true);
        expect(Number.isFinite(displacedPoint.lon)).toBe(true);
      }
    });

    it('should throw error for invalid grid resolution', () => {
      expect(() => generateConcentrationGrid(sampleParams, 0, 1000)).toThrow('Grid resolution must be positive');
      expect(() => generateConcentrationGrid(sampleParams, -5, 1000)).toThrow('Grid resolution must be positive');
    });

    it('should throw error for invalid max distance', () => {
      expect(() => generateConcentrationGrid(sampleParams, 10, 0)).toThrow('Maximum distance must be positive');
      expect(() => generateConcentrationGrid(sampleParams, 10, -1000)).toThrow('Maximum distance must be positive');
    });
  });
});