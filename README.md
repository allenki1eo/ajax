# Jungle

This repository has been migrated from plain PHP/MySQL to a Next.js App Router application using Turso/libSQL SQLite.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS responsive UI
- Turso SQLite through `@libsql/client`
- Server Actions for products, sales, purchases, stock adjustments, categories, and suppliers

## Local setup

```bash
npm install
copy .env.example .env.local
npm run db:push
npm run db:seed
npm run dev
```


## Turso setup

Create a Turso database, then set:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
APP_SESSION_SECRET=use-a-long-random-string
```

Run:

```bash
npm run db:push
npm run db:seed
```

`migrations/0001_turso_schema.sql` contains the Turso-compatible SQLite schema. `scripts/import-store-sql.mjs` imports the data from the original `store.sql` dump into that schema.
