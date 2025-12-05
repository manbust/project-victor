# Database Migrations

This directory contains SQL migration files for the VICTOR system's Supabase database.

## Migration Files

- `001_create_pathogens_table.sql` - Creates the pathogens table with all required constraints

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for Development
)

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Direct PostgreSQL Connection

If you have
 direct database access:

```bash
psql -h your-db-host -U postgres -d postgres -f lib/supabase/migrations/001_create_pathogens_table.sql
```

## Migration Details

### Pathogens Table Schema

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| name | TEXT | NOT NULL, UNIQUE |
| incubation_period | NUMERIC | NOT NULL, CHECK (>= 0) |
| transmission_vector | TEXT | NOT NULL, CHECK IN ('air', 'fluid') |
| min_humidity_survival | NUMERIC | NOT NULL, CHECK (0-
100) |
| r0_score | NUMERIC | NOT NULL, CHECK (>= 0) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() |

### Constraints

- **unique_pathogen_name**: Ensures no duplicate pathogen names
- **valid_transmission_vector**: Restricts values to 'air' or 'fluid'
- **valid_humidity_range**: Ensures humidity is between 0 and 100
- **valid_r0_score**: Ensures R0 score is non-negative
- **valid_incubation_period**: Ensures incubation period is non-negative

### Indexes

- Primary key index on `id`
- Index on `transmission_vector` for efficient filtering queries
