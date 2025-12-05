/**
 * Tests for Pathogen Database Integration Service
 * 
 * Tests the pathogen data querying functionality for the triage dashboard,
 * including data enhancement, filtering, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchPathogensForTriage, 
  fetchPathogenById, 
  fetchFilteredPathogens,
  getPathogenStatistics,
  type PathogenQueryFilters 
} from './pathogen-integration';
import * as supabaseQueries from '@/lib/supabase/queries';
import type { Pathogen } from '@/lib/supabase/types';

// Mock the Supabase queries
vi.mock('@/lib/supabase/queries');

describe('Pathogen Database Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const mockPathogens: Pathogen[] = [
    {
      id: '1',
      name: 'Measles Virus',
      incubation_period: 10,
      transmission_vector: 'air',
      min_humidity_survival: 30,
      r0_score: 15,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Ebola Virus',
      incubation_period: 10,
      transmission_vector: 'fluid',
      min_humidity_survival: 50,
      r0_score: 2,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      name: 'Tuberculosis',
      incubation_period: 21,
      transmission_vector: 'air',
      min_humidity_survival: 45,
      r0_score: 3,
      created_at: '2024-01-01T00:00:00Z'
    }
  ];

  describe('fetchPathogensForTriage', () => {
    it('should fetch and enhance pathogen data successfully', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: mockPathogens,
        error: null
      });

      const result = await fetchPathogensForTriage();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(3);
      
      // Check enhanced fields
      const measles = result.data?.find(p => p.name === 'Measles Virus');
      expect(measles).toBeDefined();
      expect(measles?.threatLevel).toBe('critical'); // R0 = 15
      expect(measles?.isAirborne).toBe(true);
      expect(measles?.requiresHighHumidity).toBe(false); // 30% < 60%
      
      const ebola = result.data?.find(p => p.name === 'Ebola Virus');
      expect(ebola).toBeDefined();
      expect(ebola?.threatLevel).toBe('medium'); // R0 = 2
      expect(ebola?.isAirborne).toBe(false);
      expect(ebola?.requiresHighHumidity).toBe(false); // 50% < 60%
    });

    it('should handle database query errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await fetchPathogensForTriage();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to retrieve pathogen data');
      expect(result.error?.message).toContain('Database connection failed');
    });

    it('should handle empty database gracefully', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: [],
        error: null
      });

      const result = await fetchPathogensForTriage();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('No pathogen data found in database');
    });

    it('should handle null data from database', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await fetchPathogensForTriage();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockRejectedValue(new Error('Network timeout'));

      const result = await fetchPathogensForTriage();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Unexpected error retrieving pathogen data');
      expect(result.error?.message).toContain('Network timeout');
    });

    it('should log successful data retrieval', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: mockPathogens,
        error: null
      });

      await fetchPathogensForTriage();

      expect(console.log).toHaveBeenCalledWith('Fetching pathogen data from Supabase database...');
      expect(console.log).toHaveBeenCalledWith('Successfully retrieved and enhanced 3 pathogens');
    });
  });

  describe('fetchPathogenById', () => {
    it('should fetch and enhance specific pathogen by ID', async () => {
      const mockPathogen = mockPathogens[0];
      vi.mocked(supabaseQueries.getPathogenById).mockResolvedValue({
        data: mockPathogen,
        error: null
      });

      const result = await fetchPathogenById('1');

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Measles Virus');
      expect(result.data?.threatLevel).toBe('critical');
      expect(result.data?.isAirborne).toBe(true);
    });

    it('should handle pathogen not found', async () => {
      vi.mocked(supabaseQueries.getPathogenById).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await fetchPathogenById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Pathogen with ID nonexistent not found');
    });

    it('should handle database query errors', async () => {
      const mockError = new Error('Database error');
      vi.mocked(supabaseQueries.getPathogenById).mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await fetchPathogenById('1');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to retrieve pathogen with ID 1');
    });
  });

  describe('fetchFilteredPathogens', () => {
    beforeEach(() => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: mockPathogens,
        error: null
      });
    });

    it('should filter by transmission vector', async () => {
      const filters: PathogenQueryFilters = {
        transmissionVector: 'air'
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2); // Measles and TB
      expect(result.data?.every(p => p.transmission_vector === 'air')).toBe(true);
    });

    it('should filter by minimum R0 score', async () => {
      const filters: PathogenQueryFilters = {
        minR0Score: 5
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1); // Only Measles (R0=15)
      expect(result.data?.[0]?.name).toBe('Measles Virus');
    });

    it('should filter by maximum R0 score', async () => {
      const filters: PathogenQueryFilters = {
        maxR0Score: 5
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2); // Ebola (R0=2) and TB (R0=3)
      expect(result.data?.every(p => p.r0_score <= 5)).toBe(true);
    });

    it('should filter by minimum humidity threshold', async () => {
      const filters: PathogenQueryFilters = {
        minHumidityThreshold: 40
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2); // Ebola (50%) and TB (45%)
      expect(result.data?.every(p => p.min_humidity_survival >= 40)).toBe(true);
    });

    it('should filter by maximum incubation period', async () => {
      const filters: PathogenQueryFilters = {
        maxIncubationPeriod: 15
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2); // Measles (10) and Ebola (10)
      expect(result.data?.every(p => p.incubation_period <= 15)).toBe(true);
    });

    it('should apply multiple filters', async () => {
      const filters: PathogenQueryFilters = {
        transmissionVector: 'air',
        minR0Score: 5
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1); // Only Measles
      expect(result.data?.[0]?.name).toBe('Measles Virus');
    });

    it('should return empty array when no matches', async () => {
      const filters: PathogenQueryFilters = {
        minR0Score: 100 // No pathogen has R0 >= 100
      };

      const result = await fetchFilteredPathogens(filters);

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });
  });

  describe('getPathogenStatistics', () => {
    it('should compute statistics correctly', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: mockPathogens,
        error: null
      });

      const result = await getPathogenStatistics();

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        totalCount: 3,
        airborneCount: 2, // Measles and TB
        fluidCount: 1,   // Ebola
        highThreatCount: 1, // Only Measles (critical)
        averageR0Score: (15 + 2 + 3) / 3 // 6.67
      });
    });

    it('should handle empty database', async () => {
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: [],
        error: null
      });

      const result = await getPathogenStatistics();

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        totalCount: 0,
        airborneCount: 0,
        fluidCount: 0,
        highThreatCount: 0,
        averageR0Score: 0
      });
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await getPathogenStatistics();

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('threat level computation', () => {
    it('should classify threat levels correctly', async () => {
      const testPathogens: Pathogen[] = [
        { ...mockPathogens[0], r0_score: 15 }, // critical (>= 10)
        { ...mockPathogens[0], r0_score: 7 },  // high (>= 5)
        { ...mockPathogens[0], r0_score: 3 },  // medium (>= 2)
        { ...mockPathogens[0], r0_score: 1 }   // low (< 2)
      ];

      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: testPathogens,
        error: null
      });

      const result = await fetchPathogensForTriage();

      expect(result.error).toBeNull();
      expect(result.data?.[0]?.threatLevel).toBe('critical');
      expect(result.data?.[1]?.threatLevel).toBe('high');
      expect(result.data?.[2]?.threatLevel).toBe('medium');
      expect(result.data?.[3]?.threatLevel).toBe('low');
    });

    it('should identify high humidity requirements correctly', async () => {
      const testPathogens: Pathogen[] = [
        { ...mockPathogens[0], min_humidity_survival: 70 }, // requires high humidity
        { ...mockPathogens[0], min_humidity_survival: 30 }  // does not require high humidity
      ];

      vi.mocked(supabaseQueries.getAllPathogens).mockResolvedValue({
        data: testPathogens,
        error: null
      });

      const result = await fetchPathogensForTriage();

      expect(result.error).toBeNull();
      expect(result.data?.[0]?.requiresHighHumidity).toBe(true);
      expect(result.data?.[1]?.requiresHighHumidity).toBe(false);
    });
  });
});