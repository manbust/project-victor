/**
 * Unit tests for Supabase client initialization
 * Validates client creation and environment variable handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Supabase Client', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and env before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should create client with valid environment variables', async () => {
    // Set valid environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';

    // Import after setting env vars
    const { createClient } = await import('./client');
    
    // Should not throw
    expect(() => createClient()).not.toThrow();
    
    const client = createClient();
    expect(client).toBeDefined();
  });

  it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    // Remove URL env var
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';

    // Import after setting env vars
    const { createClient } = await import('./client');
    
    expect(() => createClient()).toThrow(/Missing or invalid NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    // Remove anon key env var
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Import after setting env vars
    const { createClient } = await import('./client');
    
    expect(() => createClient()).toThrow(/Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('should throw error when NEXT_PUBLIC_SUPABASE_URL is invalid', async () => {
    // Set invalid URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-valid-url';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';

    // Import after setting env vars
    const { createClient } = await import('./client');
    
    expect(() => createClient()).toThrow(/Invalid NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('should throw error when using placeholder values', async () => {
    // Set placeholder values
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'your-project-url.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-key-here';

    // Import after setting env vars
    const { createClient } = await import('./client');
    
    expect(() => createClient()).toThrow(/Missing or invalid/);
  });

  it('should return singleton instance from getClient', async () => {
    // Set valid environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';

    // Import after setting env vars
    const { getClient } = await import('./client');
    
    const client1 = getClient();
    const client2 = getClient();
    
    // Should return the same instance
    expect(client1).toBe(client2);
  });
});
