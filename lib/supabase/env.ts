/**
 * Environment variable validation for Supabase configuration
 * Ensures required environment variables are present and valid
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Validates and retrieves Supabase environment variables
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {SupabaseConfig} Validated Supabase configuration
 */
export function validateSupabaseEnv(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.trim() === '' || url === 'your-project-url.supabase.co') {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please set it in .env.local with your Supabase project URL.'
    );
  }

  if (!anonKey || anonKey.trim() === '' || anonKey === 'your-anon-key-here') {
    throw new Error(
      'Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please set it in .env.local with your Supabase anonymous key.'
    );
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: "${url}". ` +
      'Must be a valid URL (e.g., https://your-project.supabase.co)'
    );
  }

  return {
    url,
    anonKey,
  };
}
