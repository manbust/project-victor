// scripts/seed.ts

// Import the seeding logic
import { seedDatabase } from '../lib/supabase/seed';

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🦠 VICTOR System - Database Seeding Script\n');
  console.log('Starting database seeding operation...\n');
  
  try {
    const result = await seedDatabase();
    
    if (!result.success) {
      console.error('❌ Seeding failed:', result.message);
      if (result.error) {
        console.error('Error details:', result.error.message);
        console.error(result.error.stack);
      }
      process.exit(1);
    }
    
    console.log('✅', result.message);
    console.log('\n🦠 Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error during seeding:');
    console.error(error);
    process.exit(1);
  }
}

// Execute main function
main();