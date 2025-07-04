# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Euro Dolar v.1.0" - a Next.js application that tracks USD (Blue & Official) and EUR exchange rates against the Argentinian Peso (ARS). The app displays historical rates and allows users to select specific dates to view exchange rates.

## Core Architecture

### Frontend Framework
- **Next.js 15.2.3** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling with shadcn/ui components
- **Static export** configuration for GitHub Pages deployment

### Key Features
- **Currency Tracking**: USD Blue, USD Official, and EUR rates vs ARS
- **Date Selection**: Interactive calendar for historical data
- **Internationalization**: English/Spanish language support
- **Historical Data**: Last 10 business days display
- **Responsive Design**: Mobile-first approach

### Data Flow
- API calls to `https://api.argentinadatos.com/v1/cotizaciones/` for exchange rates
- Real-time data fetching based on selected dates
- Historical data aggregation for the last 10 business days

## Development Commands

```bash
# Development server (runs on port 9002)
npm run dev

# Build for production
npm run build

# Build for GitHub Pages deployment
npm run build:github

# Build for Render deployment
npm run build:render

# Type checking
npm run typecheck

# Linting
npm run lint

# Clear cache and reinstall dependencies
npm run clear-cache

# Genkit AI development server
npm run genkit:dev
npm run genkit:watch
```

## Project Structure

### Key Directories
- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable React components
- `src/components/ui/` - shadcn/ui components
- `src/contexts/` - React Context providers (Language)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions
- `src/locales/` - Translation files (en.json, es.json)
- `src/ai/` - Genkit AI integration

### Important Files
- `src/app/page.tsx` - Main application component with currency tracking logic
- `src/contexts/LanguageContext.tsx` - Internationalization context
- `src/components/LanguageSwitcher.tsx` - Language toggle component
- `next.config.ts` - Next.js configuration with static export settings
- `components.json` - shadcn/ui configuration

## Technology Stack

### UI Components
- **shadcn/ui** components with Radix UI primitives
- **Lucide React** icons
- **date-fns** for date manipulation with locale support
- **React Hook Form** with Zod validation

### AI Integration
- **Genkit** for AI features
- **Google AI** provider integration

### Styling
- **Tailwind CSS** with custom color scheme
- **CSS Variables** for theming
- **Responsive design** with mobile-first approach

## API Integration

### Exchange Rate API
- Base URL: `https://api.argentinadatos.com/v1/cotizaciones/`
- Endpoints:
  - `/dolares/blue/{yyyy/MM/dd}` - USD Blue rates
  - `/dolares/oficial/{yyyy/MM/dd}` - USD Official rates
  - `/eur/{yyyy}/{MM}/{dd}` - EUR rates

### Data Structure
```typescript
interface CurrencyData {
  USD_BLUE: { compra: number | null; venta: number | null } | null;
  USD_OFICIAL: { compra: number | null; venta: number | null } | null;
  EUR: { compra: number | null; venta: number | null } | null;
  quoteDate: string | null;
}
```

## Deployment Configuration

### GitHub Pages
- Static export enabled with `output: "export"`
- Build directory: `docs/`
- Base path: `/EuroDolar` for GitHub Pages
- Environment variable: `GITHUB_PAGES=true`

### Render
- Alternative deployment platform
- Environment variable: `RENDER=true`

## Internationalization

### Language Support
- **English** (en) and **Spanish** (es) 
- Default language: Spanish
- Translation files: `src/locales/en.json` and `src/locales/es.json`
- Date localization with date-fns locales

### Language Context
- `LanguageContext` provides translation function `t()`
- Automatic localStorage persistence
- Document language attribute updates

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules
- Functional components with hooks
- Custom hooks for reusable logic

### Component Organization
- UI components in `src/components/ui/`
- Business logic components in `src/components/`
- shadcn/ui component system with consistent styling

### State Management
- React Context for global state (Language)
- Local state with useState for component-specific data
- Custom hooks for complex state logic

## Common Tasks

### Adding New Currency
1. Update API endpoints in `src/app/page.tsx`
2. Add currency labels to translation files
3. Update TypeScript interfaces
4. Add currency order configuration

### Modifying Translations
1. Update `src/locales/en.json` and `src/locales/es.json`
2. Ensure all translation keys are present in both files
3. Test language switching functionality

### Styling Updates
1. Use Tailwind classes with the existing design system
2. Leverage CSS variables for theming
3. Maintain responsive design principles
4. Follow shadcn/ui component patterns