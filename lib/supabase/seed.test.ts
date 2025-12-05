/**
 * Unit tests for database seeding functionality
 * 
 * Tests the seedDatabase function to ensure it properly handles
 * seeding operations and implements idempotency correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedDatabase } from './seed';
import * as queries from './queries';
import { PATHOGEN_DATASET } from './pathogen-data';

// Mock the query functions
vi.mock('./queries', () => ({
  isDatabaseSeeded: vi.fn(),
  insertPathogens: vi.fn(),
}));

describe('seedDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success when database is already seeded', async () => {
    // Mock database as already seeded
    vi.mocked(queries.isDatabaseSeeded).mockResolvedValue({
      data: true,
      error: null,
    });

    const result = await seedDatabase();

    expect(result.success).toBe(true);
    expect(result.message).toContain('already seeded');
    expect(result.error).toBeUndefined();
    expect(queries.insertPathogens).not.toHaveBeenCalled();
  });

  it('should seed database when not already seeded', async () => {
    // Mock database as not seeded
    vi.mocked(queries.isDatabaseSeeded).mockResolvedValue({
      data: false,
      error: null,
    });

    // Mock successful insertion
    const mockInsertedPathogens = PATHOGEN_DATASET.map((p, i) => ({
      ...p,
      id: `test-id-${i}`,
      created_at: new Date().toISOString(),
    }));

    vi.mocked(queries.insertPathogens).mockResolvedValue({
      data: mockInsertedPathogens,
      error: null,
    });

    const result = await seedDatabase();

    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully seeded');
    expect(result.message).toContain('30');
    expect(result.error).toBeUndefined();
    expect(queries.insertPathogens).toHaveBeenCalledWith(PATHOGEN_DATASET);
  });

  it('should return error when checking seed status fails', async () => {
    // Mock error checking seed status
    const checkError = new Error('Database connection failed');
    vi.mocked(queries.isDatabaseSeeded).mockResolvedValue({
      data: null,
      error: checkError,
    });

    const result = await seedDatabase();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to check');
    expect(result.error).toBe(checkError);
    expect(queries.insertPathogens).not.toHaveBeenCalled();
  });

  it('should return error when insertion fails', async () => {
    // Mock database as not seeded
    vi.mocked(queries.isDatabaseSeeded).mockResolvedValue({
      data: false,
      error: null,
    });

    // Mock insertion error
    const insertError = new Error('Constraint violation');
    vi.mocked(queries.insertPathogens).mockResolvedValue({
      data: null,
      error: insertError,
    });

    const result = await seedDatabase();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to seed');
    expect(result.error).toBe(insertError);
  });

  it('should return error when inserted count does not match expected', async () => {
    // Mock database as not seeded
    vi.mocked(queries.isDatabaseSeeded).mockResolvedValue({
      data: false,
      error: null,
    });

    // Mock partial insertion (only 10 records instead of 30)
    const mockInsertedPathogens = PATHOGEN_DATASET.slice(0, 10).map((p, i) => ({
      ...p,
      id: `test-id-${i}`,
      created_at: new Date().toISOString(),
    }));

    vi.mocked(queries.insertPathogens).mockResolvedValue({
      data: mockInsertedPathogens,
      error: null,
    });

    const result = await seedDatabase();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Seeding incomplete');
    expect(result.message).toContain('expected 30');
    expect(result.message).toContain('inserted 10');
    expect(result.error).toBeDefined();
  });

  it('should handle unexpected errors gracefully', async () => {
    // Mock unexpected error
    vi.mocked(queries.isDatabaseSeeded).mockRejectedValue(new Error('Unexpected error'));

    const result = await seedDatabase();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unexpected error');
    expect(result.error).toBeDefined();
  });
});
