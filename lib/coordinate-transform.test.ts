import { describe, it, expect } from 'vitest';
import { 
  cartesianToGeographic, 
  calculateDistance, 
  validateCoordinates,
  type CartesianToGeoParams 
} from './coordinate-transform';

describe('coordinate-transform', () => {
  describe('cartesianToGeographic', () => {
    it('should handle zero displacement (source location)', () => {
      const params: CartesianToGeoParams = {
        x: 0,
        y: 0,
        sourceLatLon: [40.7128, -74.0060], // New York City
        windDirection: 0
      };
      
      const [lat, lon] = cartesianToGeographic(params);
      
      expect(lat).toBeCloseTo(40.7128, 6);
      expect(lon).toBeCloseTo(-74.0060, 6);
    });

    it('should handle northward displacement (wind from south)', () => {
      const params: CartesianToGeoParams = {
        x: 1000, // 1km north
        y: 0,
        sourceLatLon: [40.7128, -74.0060],
        windDirection: 0 // wind from north, so plume goes north
      };
      
      const [lat, lon] = cartesianToGeographic(params);
      
      // Should be approximately 1km north of source
      expect(lat).toBeGreaterThan(40.7128);
      expect(lon).toBeCloseTo(-74.0060, 4);
      
      // Verify distance is approximately 1km
      const distance = calculateDistance(40.7128, -74.0060, lat, lon);
      expect(distance).toBeCloseTo(1000, 0); // Within 1m
    });

    it('should handle eastward displacement (wind from west)', () => {
      const params: CartesianToGeoParams = {
        x: 1000, // 1km downwind
        y: 0,
        sourceLatLon: [40.7128, -74.0060],
        windDirection: 90 // wind from west, so plume goes east
      };
      
      const [lat, lon] = cartesianToGeographic(params);
      
      // Should be approximately 1km east of source
      expect(lat).toBeCloseTo(40.7128, 4);
      expect(lon).toBeGreaterThan(-74.0060);
      
      // Verify distance is approximately 1km
      const distance = calculateDistance(40.7128, -74.0060, lat, lon);
      expect(distance).toBeCloseTo(1000, 0); // Within 1m
    });

    it('should handle crosswind displacement', () => {
      const params: CartesianToGeoParams = {
        x: 0,
        y: 500, // 500m crosswind
        sourceLatLon: [40.7128, -74.0060],
        windDirection: 0 // wind from north
      };
      
      const [lat, lon] = cartesianToGeographic(params);
      
      // Should be approximately 500m east of source (crosswind right)
      expect(lat).toBeCloseTo(40.7128, 4);
      expect(lon).toBeGreaterThan(-74.0060);
      
      // Verify distance is approximately 500m
      const distance = calculateDistance(40.7128, -74.0060, lat, lon);
      expect(distance).toBeCloseTo(500, 0); // Within 1m
    });

    it('should handle cardinal wind directions correctly', () => {
      const baseParams: CartesianToGeoParams = {
        x: 1000,
        y: 0,
        sourceLatLon: [0, 0], // Equator, prime meridian for simplicity
        windDirection: 0
      };

      // North wind (0°) - plume goes north
      const [latN] = cartesianToGeographic({ ...baseParams, windDirection: 0 });
      expect(latN).toBeGreaterThan(0);

      // East wind (90°) - plume goes east  
      const [, lonE] = cartesianToGeographic({ ...baseParams, windDirection: 90 });
      expect(lonE).toBeGreaterThan(0);

      // South wind (180°) - plume goes south
      const [latS] = cartesianToGeographic({ ...baseParams, windDirection: 180 });
      expect(latS).toBeLessThan(0);

      // West wind (270°) - plume goes west
      const [, lonW] = cartesianToGeographic({ ...baseParams, windDirection: 270 });
      expect(lonW).toBeLessThan(0);
    });

    it('should validate source coordinates', () => {
      const invalidLatParams: CartesianToGeoParams = {
        x: 0,
        y: 0,
        sourceLatLon: [91, 0], // Invalid latitude
        windDirection: 0
      };
      
      expect(() => cartesianToGeographic(invalidLatParams))
        .toThrow('Invalid source latitude: 91');

      const invalidLonParams: CartesianToGeoParams = {
        x: 0,
        y: 0,
        sourceLatLon: [0, 181], // Invalid longitude
        windDirection: 0
      };
      
      expect(() => cartesianToGeographic(invalidLonParams))
        .toThrow('Invalid source longitude: 181');
    });

    it('should validate wind direction', () => {
      const invalidWindParams: CartesianToGeoParams = {
        x: 0,
        y: 0,
        sourceLatLon: [0, 0],
        windDirection: 360 // Invalid wind direction
      };
      
      expect(() => cartesianToGeographic(invalidWindParams))
        .toThrow('Invalid wind direction: 360');

      const negativeWindParams: CartesianToGeoParams = {
        x: 0,
        y: 0,
        sourceLatLon: [0, 0],
        windDirection: -10 // Invalid wind direction
      };
      
      expect(() => cartesianToGeographic(negativeWindParams))
        .toThrow('Invalid wind direction: -10');
    });

    it('should handle longitude wrapping correctly', () => {
      const params: CartesianToGeoParams = {
        x: 0,
        y: 0,
        sourceLatLon: [0, 179.5],
        windDirection: 90
      };
      
      // This should not throw even though we're near the date line
      const [lat, lon] = cartesianToGeographic(params);
      expect(validateCoordinates(lat, lon)).toBe(true);
    });
  });

  describe('calculateDistance', () => {
    it('should return zero for identical points', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(distance).toBeCloseTo(0, 1);
    });

    it('should calculate known distances correctly', () => {
      // Distance from NYC to Philadelphia (approximately 130km)
      const distance = calculateDistance(
        40.7128, -74.0060, // NYC
        39.9526, -75.1652  // Philadelphia
      );
      
      expect(distance).toBeCloseTo(130000, -3); // Within 5km tolerance
    });

    it('should handle antipodal points', () => {
      // Points on opposite sides of Earth
      const distance = calculateDistance(0, 0, 0, 180);
      
      // Should be approximately half Earth's circumference
      const expectedDistance = Math.PI * 6371000; // π * R
      expect(distance).toBeCloseTo(expectedDistance, -4); // Within 10km tolerance
    });
  });

  describe('validateCoordinates', () => {
    it('should accept valid coordinates', () => {
      expect(validateCoordinates(0, 0)).toBe(true);
      expect(validateCoordinates(90, 180)).toBe(true);
      expect(validateCoordinates(-90, -180)).toBe(true);
      expect(validateCoordinates(45.5, -122.3)).toBe(true);
    });

    it('should reject invalid latitudes', () => {
      expect(validateCoordinates(91, 0)).toBe(false);
      expect(validateCoordinates(-91, 0)).toBe(false);
    });

    it('should reject invalid longitudes', () => {
      expect(validateCoordinates(0, 181)).toBe(false);
      expect(validateCoordinates(0, -181)).toBe(false);
    });
  });
});