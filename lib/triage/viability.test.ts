/**
 * Unit tests for environmental viability checker
 * 
 * Tests Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';
import { isPathogenViable, validateHumidity, validateSurvivalRange } from './viability';
import { PathogenSurvivalRange } from './types';

describe('validateHumidity', () => {
  it('should accept valid humidity values', () => {
    expect(() => validateHumidity(0)).not.toThrow();
    expect(() => validateHumidity(50)).not.toThrow();
    expect(() => validateHumidity(100)).not.toThrow();
  });

  it('should reject humidity below 0', () => {
    expect(() => validateHumidity(-1)).toThrow('Invalid humidity: -1. Must be between 0 and 100.');
  });

  it('should reject humidity above 100', () => {
    expect(() => validateHumidity(101)).toThrow('Invalid humidity: 101. Must be between 0 and 100.');
  });
});

describe('validateSurvivalRange', () => {
  it('should accept valid survival ranges', () => {
    const validRange: PathogenSurvivalRange = { minHumidity: 30, maxHumidity: 70 };
    expect(() => validateSurvivalRange(validRange)).not.toThrow();
  });

  it('should reject minHumidity below 0', () => {
    const invalidRange: PathogenSurvivalRange = { minHumidity: -5, maxHumidity: 70 };
    expect(() => validateSurvivalRange(invalidRange)).toThrow('Invalid minHumidity: -5');
  });

  it('should reject maxHumidity above 100', () => {
    const invalidRange: PathogenSurvivalRange = { minHumidity: 30, maxHumidity: 105 };
    expect(() => validateSurvivalRange(invalidRange)).toThrow('Invalid maxHumidity: 105');
  });

  it('should reject when minHumidity exceeds maxHumidity', () => {
    const invalidRange: PathogenSurvivalRange = { minHumidity: 80, maxHumidity: 40 };
    expect(() => validateSurvivalRange(invalidRange)).toThrow(
      'minHumidity (80) cannot exceed maxHumidity (40)'
    );
  });
});

describe('isPathogenViable', () => {
  const survivalRange: PathogenSurvivalRange = { minHumidity: 30, maxHumidity: 70 };

  describe('Requirement 1.1: Humidity below minimum threshold', () => {
    it('should return false when humidity is below minimum', () => {
      expect(isPathogenViable(29, survivalRange)).toBe(false);
      expect(isPathogenViable(0, survivalRange)).toBe(false);
      expect(isPathogenViable(20, survivalRange)).toBe(false);
    });
  });

  describe('Requirement 1.2: Humidity above maximum threshold', () => {
    it('should return false when humidity is above maximum', () => {
      expect(isPathogenViable(71, survivalRange)).toBe(false);
      expect(isPathogenViable(100, survivalRange)).toBe(false);
      expect(isPathogenViable(85, survivalRange)).toBe(false);
    });
  });

  describe('Requirement 1.3: Humidity within survival range', () => {
    it('should return true when humidity is within range', () => {
      expect(isPathogenViable(30, survivalRange)).toBe(true);
      expect(isPathogenViable(50, survivalRange)).toBe(true);
      expect(isPathogenViable(70, survivalRange)).toBe(true);
    });

    it('should return true at exact boundaries', () => {
      expect(isPathogenViable(30, survivalRange)).toBe(true);
      expect(isPathogenViable(70, survivalRange)).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should throw error for invalid humidity', () => {
      expect(() => isPathogenViable(-1, survivalRange)).toThrow('Invalid humidity');
      expect(() => isPathogenViable(101, survivalRange)).toThrow('Invalid humidity');
    });

    it('should throw error for invalid survival range', () => {
      const invalidRange: PathogenSurvivalRange = { minHumidity: 80, maxHumidity: 40 };
      expect(() => isPathogenViable(50, invalidRange)).toThrow('cannot exceed');
    });
  });
});
