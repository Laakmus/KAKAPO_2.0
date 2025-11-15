# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KAKAPO 2.0 is an Astro-based web application using React and Tailwind CSS. The project uses TypeScript with strict type checking and follows a component-based architecture.

## Technology Stack

- **Framework**: Astro 5.x with React integration
- **Styling**: Tailwind CSS
- **Language**: TypeScript (strict mode via `astro/tsconfigs/strict`)
- **Integrations**: @astrojs/react, @astrojs/tailwind
- **Linting**: ESLint 9 with TypeScript and Astro plugins

## Common Commands

```bash
# Development
npm run dev              # Start dev server at localhost:4321

# Build & Preview
npm run build           # Build production site to ./dist/
npm run preview         # Preview production build locally

# Code Quality
npm run lint            # Run ESLint on .js, .ts, .astro files
npm run lint:fix        # Auto-fix ESLint issues

# Astro CLI
npm run astro ...       # Run Astro CLI commands
```

## Code Style & Linting

The project enforces strict code style rules via eslint.config.js:

- **Indentation**: 2 spaces (SwitchCase: 1)
- **Quotes**: Single quotes (with escape avoidance)
- **Semicolons**: Required
- **Max line length**: 120 characters
- **Trailing commas**: Required for multiline
- **Object/array spacing**: `{ foo }` and `[bar]`
- **No multiple empty lines**: Max 1 blank line
- **File endings**: Must end with newline

### TypeScript Rules

- Unused vars/args starting with `_` are allowed
- `any` type triggers warnings
- Non-null assertions (`!`) trigger warnings
- Console.log is disallowed (warn/error allowed)

### Astro-Specific Rules

- `set:html` directive is forbidden (use proper escaping)
- Unused CSS selectors trigger warnings
- Prefer `class:list` directive over manual class concatenation

## Architecture

### Directory Structure

```
src/
├── assets/          # Static assets (SVGs, images)
├── components/      # Astro components (.astro)
├── layouts/         # Page layouts (e.g., Layout.astro)
└── pages/           # File-based routing (index.astro)
```

### Component Organization

- **Layouts**: Base HTML structure and global styles (src/layouts/Layout.astro)
- **Components**: Reusable Astro components with scoped styles
- **Pages**: Route definitions using Astro's file-based routing

### Astro Configuration

The project uses React and Tailwind integrations configured in astro.config.mjs. Both integrations are enabled globally.

## Development Notes

- TypeScript uses Astro's strict config preset
- Config files (\*.config.js/mjs/ts) are ignored by linting
- Build output goes to ./dist/ and is git-ignored
- No React components exist yet - only Astro components
