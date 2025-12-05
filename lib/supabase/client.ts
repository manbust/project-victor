/**
 * Supabase client initialization for the VICTOR System
 * Provides typed database client for both server and client components
 * 
 * Requirements: 1.1, 1.2
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { validateSupabaseEnv } from './env';
import type { Database } from './types';

/**
 * Creates and returns a typed Supabase client instance
 * 
 * This client works in both server-side and client-side contexts in Next.js App Router:
 * - Server Components: Uses environment variables at request time
 * - Client Components: Uses NEXT_PUBLIC_* variables available in browser
 * 
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {SupabaseClient<Database>} Typed Supabase client for database operations
 * 
 * @example
 * ```typescript
 * // In a Server Component
 * const supabase = createClient();
 * const { data, error } = await supabase.from('pathogens').select('*');
 * 
 * // In a Client Component
 * 'use client';
 * const supabase = createClient();
 * const { data, error } = await supabase.from('pathogens').select('*');
 * ```
 */
export function createClient() {
  // Validate environment variables and get configuration
  const config = validateSupabaseEnv();

  // Create typed Supabase client
  const supabase = createSupabaseClient<Database>(
    config.url,
    config.anonKey,
    {
      auth: {
        persistSession: false, // Disable session persistence for safety-critical app
        autoRefreshToken: false, // Manual token management for better control
      },
    }
  );

  return supabase;
}

/**
 * Singleton Supabase client instance
 * Reuses the same client across the application to avoid creating multiple connections
 * 
 * Note: In Next.js App Router, this will be instantiated per-request on the server
 * and once in the browser, which is the desired behavior.
 */
let clientInstance: ReturnType<typeof createClient> | null = null;

/**
 * Gets or creates a singleton Supabase client instance
 * Recommended for most use cases to avoid creating multiple clients
 * 
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {SupabaseClient<Database>} Typed Supabase client for database operations
 */
export function getClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
