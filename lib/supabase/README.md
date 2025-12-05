# Supabase Client Usage

## Overview

The Supabase client is configured to work seamlessly in both server-side and client-side contexts in Next.js App Router.

## Environment Variables

Required environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Usage Examples

### Server Component (Recommended)

```typescript
import { createClient } from '@/lib/supabase/client';

export default async function ServerComponent() {
  const supabase = createClient();
  
  const { data: pathogens, error } = await supabase
    .from('pathogens')
    .select('*');
  
  if (error) {
    console.error('Error fetching pathogens:', error);
    return <div>Error loading data</div>;
  }
  
  return (
    <div>
      {pathogens.map(pathogen => (
        <div key={pathogen.id}>{pathogen.name}</div>
      ))}
    </div>
  );
}
```

### Client Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Pathogen } from '@/lib/supabase/types';

export default function ClientComponent() {

  const [pathogens, setPathogens] = useState<Pathogen[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const supabase = createClient();
    
    async function fetchPathogens() {
      const { data, error } = await supabase
        .from('pathogens')
        .select('*');
      
      if (error) {
        console.error('Error:', error);
      } else {
        setPathogens(data || []);
      }
      setLoading(false);
    }
    
    fetchPathogens();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {pathogens.map(pathogen => (
        <div key={pathogen.id}>{pathogen.name}</div>
      ))}
    </div>
  );
}
```

### Using Singleton Instance

For better performance, use `getClient()` to reuse the same client instance:

```typescript
import { getClient } from '@/lib/supabase/client';

const supabase = getClient();
const { data, error } = await supabase.from('pathogens').select('*');
```

## Type Safety

All database operations are fully typed using the `Database` type from `types.ts`:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// TypeScript knows the exact shape of the data
const { data } = await supabase
  .from('pathogens')  // ✓ Type-checked table name
  .select('name, r0_score')  // ✓ Type-checked column names
  .eq('transmission_vector', 'air');  // ✓ Type-checked values

// data is typed as: { name: string; r0_score: number }[] | null
```

## Error Handling

The client validates environment variables on initialization and throws descriptive errors:

- Missing `NEXT_PUBLIC_SUPABASE_URL`
- Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Invalid URL format
- Placeholder values not replaced

Always wrap client creation in try-catch for production use:

```typescript
try {
  const supabase = createClient();
  // Use client...
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
  // Handle error appropriately
}
```

## Database Seeding

The database can be seeded with 30 pathogen records using the `seedDatabase` function:

```typescript
import { seedDatabase } from '@/lib/supabase/seed';

const result = await seedDatabase();

if (!result.success) {
  console.error('Seeding failed:', result.message, result.error);
} else {
  console.log('Seeding complete:', result.message);
}
```

### Seeding Features

- **Idempotent**: Safe to call multiple times - automatically skips if database is already seeded
- **Transactional**: All 30 records inserted in a single transaction
- **Error Handling**: Returns detailed error information without crashing
- **Validation**: Verifies correct number of records were inserted

### Seeding from a Script

Create a script file (e.g., `scripts/seed.ts`):

```typescript
import { seedDatabase } from '@/lib/supabase/seed';

async function main() {
  console.log('Starting database seeding...');
  
  const result = await seedDatabase();
  
  if (!result.success) {
    console.error('❌ Seeding failed:', result.message);
    if (result.error) {
      console.error('Error details:', result.error);
    }
    process.exit(1);
  }
  
  console.log('✅', result.message);
}

main();
```

Run with: `tsx scripts/seed.ts` (requires `tsx` package)

### Seeding from an API Route

Create an API route (e.g., `app/api/seed/route.ts`):

```typescript
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/supabase/seed';

export async function POST() {
  const result = await seedDatabase();
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.message },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ message: result.message });
}
```

Then trigger via HTTP: `curl -X POST http://localhost:3000/api/seed`

## Security Configuration

The client is configured with:
- `persistSession: false` - No session persistence for safety-critical operations
- `autoRefreshToken: false` - Manual token management for better control

This ensures predictable behavior in the safety-critical VICTOR System.
