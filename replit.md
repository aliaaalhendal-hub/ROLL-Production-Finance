# ROLL — Finance Behind the Frame

A cinematic production-finance operating system that shows producers the true financial impact of a decision before approval.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/roll-finance` — React web app and cinematic visual system
- `artifacts/api-server/src/routes/roll.ts` — ROLL API and central finance calculations
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/roll.ts` — production finance database schema

## Architecture decisions

- All financial summaries derive from one server-side calculation engine; screens must not invent totals.
- Clerk owns authentication and API records are scoped to the signed-in Clerk user.
- Payments are test-mode only until a real production payment provider is explicitly configured.
- Decision simulations remain non-mutating until the user explicitly approves them.

## Product

Public cinematic project showcase, authenticated production workspaces, budgets, expenses, contracts and installment schedules, payment requests, test payments, equipment assets, cash flow, financial health, activity history, and ROLL AI decision-impact simulations.

## User preferences

- The imported Stitch design is the final visual direction. Do not replace it with a generic dashboard or simplify its typography, spacing, imagery, hierarchy, or art direction.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
