# VibeDB

VibeDB is an AI-native database designer for Postgres and Supabase. Describe an application in plain English, shape the generated schema on a visual canvas, export production DDL and ORM definitions, and deploy safely.

## Features

- Visual schema canvas with tables, columns, constraints, indexes, and foreign keys
- AI-assisted schema generation, editing, audit, query generation, and mock data
- PostgreSQL DDL export plus Prisma, Drizzle, GraphQL, CSV, RLS SQL, and TypeScript type generation
- Supabase auth, cloud save, edge functions, and deployment helpers
- Local OpenAI-backed development proxy and Tauri desktop bridge
- Schema diffing, verification tests, and compiler/validation tooling

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:8080`.

For local AI generation, set `OPENAI_API_KEY` in `.env`. Supabase settings are optional unless you use auth, cloud saves, deployments, or edge functions.

## Scripts

```bash
npm run dev          # Vite dev server
npm run build        # Production web build
npm test             # Vitest suite
npm run lint         # ESLint
npm run desktop:dev  # Tauri desktop dev window
npm run desktop:dmg  # macOS DMG build
```

## Environment

Use `.env.example` as the template. Do not commit `.env` or provider credentials.

Production Supabase edge functions expect secrets to be configured with `supabase secrets set`, including AI and Stripe provider keys.

## License

MIT. See [LICENSE](LICENSE).
