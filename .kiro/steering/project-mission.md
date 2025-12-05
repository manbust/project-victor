---
inclusion: always
---

# Project Mission: V.I.C.T.O.R.

Viral Incident & Casualty Triage Operations Rig - A safety-critical application for epidemiological monitoring and triage operations.

## Design Philosophy

### Dark Clinical Aesthetic
- Pure black backgrounds (`bg-black`)
- Mono-spaced fonts (Geist Mono for data displays)
- High-contrast borders using red (`border-red-500/600`) and yellow (`border-yellow-500/600`)
- Minimal color palette focused on readability and urgency indicators
- Use `dark:` variants as the primary design target

### Safety-Critical Code Standards
- **Zero tolerance for `any` types** - All functions must be strictly typed
- Mathematical calculations require explicit type annotations
- Prefer `number` over implicit types for all numeric operations
- Use TypeScript's strict mode features (already enabled)
- Validate all external data inputs with type guards

### Architecture Principles
- Server Components by default for data fetching
- Client Components only when interactivity required
- Integrate Open-Meteo weather API with epidemiological models
- Modular data processing functions with clear input/output contracts

## Tech Stack

- **Next.js 16.0.7** with App Router (note: steering mentions 14, but project uses 16)
- **Supabase** for database operations
- **Leaflet** for map visualizations
- **Recharts** for data visualization
- **Tailwind CSS 4** for styling

## Code Conventions

- Use descriptive variable names for medical/epidemiological terms
- Prefix utility functions with domain context (e.g., `calculateViralSpread`, `triagePatient`)
- Keep calculation logic separate from UI components
- Document all formulas and algorithms with inline comments
- Use constants for thresholds and critical values