/**
 * Unit tests for Supabase query functions
 * Validates type safety and error handling for database operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Pathogen } from './types';
import type { createClient } from './client';

// Mock the client module
vi.mock('./client', () => ({
  getClient: vi.fn(),
}));

describe('getAllPathogens', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should return strongly-typed pathogen array on success', async () => {
    // Mock successful Supabase response
    const mockPathogens: Pathogen[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Ebola Virus',
        incubation_period: 10,
        transmission_vector: 'fluid',
        min_humidity_survival: 50,
        r0_score: 2.0,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Measles',
        incubation_period: 12,
        transmission_vector: 'air',
        min_humidity_survival: 30,
        r0_score: 15.0,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPathogens,
            error: null,
          }),
        }),
      }),
    };

    const { getClient } = await import('./client');
    vi.mocked(getClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>);

    const { getAllPathogens } = await import('./queries');

    const result = await getAllPathogens();

    expect(result.error).toBeNull();
    expect(result.data).toEqual(mockPathogens);
    expect(result.data).toHaveLength(2);
    
    // Verify type safety - data should be Pathogen[]
    if (result.data) {
      expect(result.data[0].name).toBe('Ebola Virus');
      expect(result.data[0].transmission_vector).toBe('fluid');
      expect(result.data[1].name).toBe('Measles');
    }
  });

  it('should return empty array when no pathogens exist', async () => {
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    };

    const { getClient } = await import('./client');
    vi.mocked(getClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>);

    const { getAllPathogens } = await import('./queries');

    const result = await getAllPathogens();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(result.data).toHaveLength(0);
  });

  it('should return error object when Supabase query fails', async () => {
    const mockError = {
      message: 'Connection timeout',
      code: 'PGRST301',
    };

    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      }),
    };

    const { getClient } = await import('./client');
    vi.mocked(getClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>);

    const { getAllPathogens } = await import('./queries');

    const result = await getAllPathogens();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Failed to retrieve pathogens');
    expect(result.error?.message).toContain('Connection timeout');
  });

  it('should handle unexpected errors without crashing', async () => {
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected network failure');
      }),
    };

    const { getClient } = await import('./client');
    vi.mocked(getClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>);

    const { getAllPathogens } = await import('./queries');

    const result = await getAllPathogens();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Unexpected error retrieving pathogens');
    expect(result.error?.message).toContain('Unexpected network failure');
  });

  it('should not throw exceptions on error', async () => {
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    };

    const { getClient } = await import('./client');
    vi.mocked(getClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>);

    const { getAllPathogens } = await import('./queries');

    // Should not throw - errors are returned in result object
    await expect(getAllPathogens()).resolves.toBeDefined();
  });
});
