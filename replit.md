# Rwanda Market Management System (RMMS)

## Overview

A complete full-stack web application for managing Rwanda's formal and informal markets. Supports multi-market oversight, slot management, vendor registration, payment tracking, expense monitoring, simulated SMS/email notifications, and a national dashboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/rmms), served at `/`
- **API framework**: Express 5 (artifacts/api-server), served at `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs), token stored in localStorage as `rmms_token`
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| superadmin | password | Super Admin (all markets) |
| msz_admin | password | Market Admin (Musanze) |
| nym_admin | password | Market Admin (Nyamirambo) |

## Markets Pre-seeded

8 markets: Musanze, Nyamirambo, Biryogo, Huye, Rubavu, Kimironko, Nyabugogo, Rwamagana

## Key Features

- **National Dashboard**: KPI cards, market breakdown, recent payments
- **Market Management**: Create/edit markets, per-market dashboards
- **Slot Management**: AVAILABLE/OCCUPIED/RESERVED/UNDER_MAINTENANCE statuses, assign vendors
- **Vendor Registry**: Register vendors, link to slots, track status
- **Payment Tracking**: Record payments, track DUE/PAID/OVERDUE/PARTIAL statuses
- **Expense Tracking**: Add/delete expenses by category per market
- **Notification Engine**: Simulated SMS via server logs, manual trigger available

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/rmms/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle ORM schema (PostgreSQL)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas

## DB Schema Tables

- `users` — System users (super admin, market admins)
- `markets` — Market definitions (8 pre-seeded)
- `slots` — Slots per market with status tracking
- `vendors` — Vendor registry
- `payments` — Payment records per vendor/slot
- `expenses` — Market expenses by category
- `notifications` — Simulated notification log
