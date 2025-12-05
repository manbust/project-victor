# V.I.C.T.O.R.
**Viral Incident & Casualty Triage Operations Rig**

> *"In a biological crisis, the wind is the enemy."*

![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-CLASSIFIED-red) ![Category](https://img.shields.io/badge/category-FRANKENSTEIN-purple)

## ☣️ Mission Profile
V.I.C.T.O.R. is a **Frankenstein** application designed for "Ground Zero" field epidemiologists. It stitches together three incompatible domains into a single triage engine:
1.  **Epidemiology:** A database of pathogen survival constraints (incubation, humidity tolerance).
2.  **Meteorology:** Real-time atmospheric data injection via Open-Meteo.
3.  **Fluid Dynamics:** Gaussian Plume mathematical modeling for gas dispersion.

## 🏗️ The "Frankenstein" Architecture
We utilized **Kiro** to stitch these disparate technologies:
*   **The Brain:** Supabase (PostgreSQL) storing `Pathogen_Vectors`.
*   **The Senses:** Open-Meteo API for live wind speed, direction, and humidity.
*   **The Logic:** A TypeScript implementation of the Gaussian Plume Equation ($C(x,y,z)$).
*   **The Skin:** A "Dark Clinical" UI built with Next.js and Tailwind.

## Getting Started

### Prerequisites

- Node.js 20+ 
- pnpm (recommended) or npm
- Supabase account and project

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Add your Supabase credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

#### 1. Run Migrations

Execute the SQL migration file in your Supabase SQL editor:

```sql
-- Run: lib/supabase/migrations/001_create_pathogens_table.sql
```

This creates the `pathogens` table with all necessary constraints.

#### 2. Seed the Database

You have three options to seed the database with 30 pathogen records:

**Option A: CLI Script (Recommended for local development)**

```bash
pnpm install
pnpm seed
```

**Option B: API Route (Recommended for deployment)**

Start the development server and make a POST request:

```bash
pnpm dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed
```

Or visit `http://localhost:3000/api/seed` in your browser and use a tool like Postman.

**Option C: Programmatic (For custom workflows)**

```typescript
import { seedDatabase } from '@/lib/supabase/seed';

const result = await seedDatabase();
console.log(result.message);
```

**Note**: All seeding methods are idempotent - running them multiple times will not create duplicate records.

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Testing

Run the test suite:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

## Project Structure

```
project-victor/
├── app/                    # Next.js App Router
│   ├── api/seed/          # Database seeding API route
│   └── ...
├── lib/
│   └── supabase/          # Supabase integration
│       ├── client.ts      # Supabase client initialization
│       ├── queries.ts     # Database query functions
│       ├── seed.ts        # Seeding logic
│       ├── pathogen-data.ts # 30 pathogen dataset
│       └── migrations/    # SQL migrations
├── scripts/
│   └── seed.ts           # CLI seeding script
└── .kiro/specs/          # Feature specifications
```

## Database Schema

### Pathogens Table

| Column                | Type    | Constraints                    |
|-----------------------|---------|--------------------------------|
| id                    | UUID    | PRIMARY KEY                    |
| name                  | TEXT    | NOT NULL, UNIQUE               |
| incubation_period     | NUMERIC | NOT NULL, >= 0                 |
| transmission_vector   | TEXT    | NOT NULL, IN ('air', 'fluid')  |
| min_humidity_survival | NUMERIC | NOT NULL, 0-100                |
| r0_score              | NUMERIC | NOT NULL, >= 0                 |
| created_at            | TIMESTAMP | DEFAULT NOW()                |

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Post-Deployment Seeding

After deployment, seed the database by calling the API route:

```bash
curl -X POST https://your-app.vercel.app/api/seed
```

## Learn More

This project uses:
- [Next.js](https://nextjs.org/docs) - React framework with App Router
- [Supabase](https://supabase.com/docs) - PostgreSQL database backend
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Vitest](https://vitest.dev) - Unit testing framework

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more deployment details.

## 📄 License
MIT License - See [LICENSE](LICENSE) file for details.