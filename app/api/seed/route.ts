/**
 * API Route for database seeding
 * 
 * POST /api/seed - Triggers database seeding with pathogen dataset
 * 
 * This endpoint can be called during deployment or manually to populate
 * the database with the initial 30 pathogen records. The seeding operation
 * is idempotent and will not create duplicates if called multiple times.
 * 
 * Requirements: 3.1
 */

import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/supabase/seed';

/**
 * POST handler for database seeding
 * 
 * @returns JSON response with seeding result
 */
export async function POST(): Promise<NextResponse> {
  try {
    const result = await seedDatabase();
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.error?.message,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to seed database',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns information about the seed endpoint
 * 
 * @returns JSON response with endpoint information
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      endpoint: '/api/seed',
      method: 'POST',
      description: 'Seeds the database with 30 pathogen records',
      note: 'Idempotent - safe to call multiple times',
    },
    { status: 200 }
  );
}
