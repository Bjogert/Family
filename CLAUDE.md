# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Family Hub is a Raspberry Pi-hosted web app for household management. It's a pnpm monorepo with grocery list management and Google Calendar integration features (planned).

## Commands

```bash
# Development
pnpm dev              # Run API and web servers in parallel
pnpm dev:api          # Run API only (port 3001)
pnpm dev:web          # Run web only (port 3000)

# Build
pnpm build            # Build all packages (shared must build first)
pnpm --filter @family-hub/shared build  # Build shared package only

# Code quality
pnpm format           # Format all files with Prettier
pnpm lint             # Lint all packages
pnpm --filter @family-hub/web check     # Svelte type checking
```

## Architecture

### Monorepo Structure
- **apps/api** - Fastify backend (TypeScript, port 3001)
- **apps/web** - SvelteKit frontend (Svelte 4, Tailwind, port 3000)
- **packages/shared** - Shared Zod schemas and TypeScript types

### Key Patterns

**Shared Package**: All API request/response validation uses Zod schemas from `@family-hub/shared`. The shared package exports via:
- `@family-hub/shared/schemas` - Zod schemas for validation
- `@family-hub/shared/types` - TypeScript type definitions

**API Modules**: Backend follows a modular pattern at `apps/api/src/modules/{module}/` with:
- `routes.ts` - Fastify route handlers
- `service.ts` - Business logic
- `repository.ts` - Database access

**Frontend Routes**: SvelteKit file-based routing at `apps/web/src/routes/`

### Database
PostgreSQL configured via environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).

### Real-time
WebSocket server integrated with Fastify for real-time sync between devices.

## Environment Setup

Copy `.env.example` to `.env`. Required variables:
- `SESSION_SECRET` - 32-char random string for sessions
- `FAMILY_PASSWORD` - Login password for the family
- Database connection vars (DB_*)

Generate secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
