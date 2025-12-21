# Family Hub

A Raspberry Pi hosted web app for household management.

## Features (v1)

- **Groceries List** - Add, remove, mark items as bought, with categories
- **Family Calendar** - View Google Calendar events synced with family accounts

## Tech Stack

- **Backend**: Fastify + TypeScript + SQLite (better-sqlite3)
- **Frontend**: SvelteKit + Tailwind CSS
- **Validation**: Zod (shared schemas)
- **Real-time**: WebSockets
- **Deployment**: systemd + Caddy

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+

### Development

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start development servers
pnpm dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

### Build

```bash
pnpm build
```

## Project Structure

```
family-hub/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # SvelteKit frontend
├── packages/
│   └── shared/       # Shared types & Zod schemas
├── docs/
│   ├── ProjectPlan.md
│   └── progress.md
└── scripts/          # Deployment & backup scripts
```

## Documentation

- [Project Plan](docs/ProjectPlan.md) - Full technical plan
- [Progress](docs/progress.md) - Development progress tracking

## License

Private - Family use only.
