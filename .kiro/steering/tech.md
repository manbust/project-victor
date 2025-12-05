# Technology Stack

## Core Framework
- **Next.js 16.0.7** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript 5** - Type-safe JavaScript

## Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Geist Font Family** - Custom fonts from Vercel (Geist Sans & Geist Mono)

## Development Tools
- **ESLint 9** - Code linting with Next.js config
- **pnpm** - Package manager (lockfile present)

## TypeScript Configuration
- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` maps to project root
- JSX: react-jsx

## Common Commands

### Development
```bash
pnpm dev
```
Starts the development server at http://localhost:3000

### Build
```bash
pnpm build
```
Creates an optimized production build

### Production
```bash
pnpm start
```
Runs the production server (requires build first)

### Linting
```bash
pnpm lint
```
Runs ESLint to check code quality

## Notes
- The project uses the App Router (not Pages Router)
- Dark mode support is implemented via Tailwind
- Images should use Next.js `Image` component for optimization
