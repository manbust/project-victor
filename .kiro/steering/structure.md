# Project Structure

## Directory Organization

```
project-victor/
├── app/                    # Next.js App Router directory
│   ├── layout.tsx         # Root layout with fonts and metadata
│   ├── page.tsx           # Home page component
│   ├── globals.css        # Global styles and Tailwind directives
│   └── favicon.ico        # Site favicon
├── public/                # Static assets served from root
│   └── *.svg              # SVG images and icons
├── .kiro/                 # Kiro AI assistant configuration
│   └── steering/          # AI steering rules
├── .next/                 # Next.js build output (generated)
├── node_modules/          # Dependencies (generated)
└── [config files]         # Root-level configuration files
```

## Key Conventions

### File Naming
- React components: PascalCase with `.tsx` extension
- Use TypeScript for all new files (`.ts`, `.tsx`)
- Config files: kebab-case or specific framework conventions

### Component Structure
- Server Components by default (App Router)
- Use `"use client"` directive only when client-side features needed
- Export default for page and layout components

### Styling
- Tailwind utility classes for styling
- Dark mode variants using `dark:` prefix
- Responsive design with mobile-first approach (sm:, md:, lg: breakpoints)

### Imports
- Use `@/` path alias for imports from project root
- Use `next/image` for images
- Use `next/font/google` for web fonts

### App Router Patterns
- `page.tsx` - Route pages
- `layout.tsx` - Shared layouts
- `globals.css` - Global styles
- Static assets in `public/` directory
