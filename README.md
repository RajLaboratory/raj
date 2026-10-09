# Raj Laboratory Management System

Phase 1 (Foundation) of the LIMS. Modular monolith: Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL.

## Run locally

```bash
cp .env.example .env            # already created; edit if needed
docker compose up -d            # Postgres 16 + MinIO
npm install
npx prisma migrate dev --name init   # creates tables from prisma/schema.prisma
npm run db:seed                 # roles, 70 tests, doctors, patients, orders, invoices
npm run dev                     # http://localhost:3000
npm test                        # unit tests (no database needed)
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env` (default `admin@rajlab.local` / `ChangeMe@123`).
Demo users exist for each role as `<role>@rajlab.local` (for example `reception@rajlab.local`) with the same password.
**Change all passwords before any real use.**

## What Phase 1 contains

| Area | Status |
|---|---|
| Full Prisma schema (53 models, all your listed tables plus branches, sessions, sequences, critical alerts, settlements, credit notes, attachments, amendments, OTP) | Written, schema validated |
| Auth: argon2 hashing, DB-backed revocable sessions, idle and absolute timeout, lockout after 5 failures, login activity log | Written |
| RBAC: 11 roles, 47 permissions, `handle()` API wrapper, `assertCan()` | Written, unit tested |
| Audit: auto before/after logging on create/update/delete for core models, `auditTx()` for interactive transactions, login events | Written |
| Numbering: atomic per-branch, per-year sequences, configurable prefix, digits and yearly reset | Written, format unit tested |
| Money (integer paise, INR formatting), IST dates | Written, unit tested |
| Commission resolver (test > package > department > default, snapshot per item) | Written, unit tested |
| Settings API and page (lab profile, GST toggle, numbering) | Written |
| App shell, login, dashboard counters, users and roles (read-only), audit log viewer | Written |
| Seed: 14 departments, 70 tests with parameters and sex-specific ranges, 4 packages, 6 doctors with rules, 12 patients, 34 orders, 26 invoices with payments | Written |

## Verification status (be aware)

* Unit tests: 13 of 13 pass.
* Prisma schema: validated with Prisma's WASM validator.
* **Not yet run:** `prisma generate`, `tsc`, `next build`, migrations and the seed. The sandbox I built this in blocks Prisma's engine download and has no Postgres, so these need a first run on your machine. Expect to fix small issues on that first run; send me the output and I will correct them.

## Known limitations in Phase 1

* The seed creates **no lab results** on purpose (rule: never invent results). Reference ranges in the seed are typical adult values for demo purposes only; your pathologist must review them before clinical use.
* Keyboard shortcuts (Ctrl+N, Ctrl+B, Ctrl+F) point to pages that arrive in Phase 2.
* Users page is read-only; create/edit users and role-permission editing come in Phase 2.
* No 2FA, backups or storage wiring yet (fields and env vars are in place).
* Auto-audit applies to calls through the extended `prisma` client. Inside `$transaction` blocks call `auditTx()` explicitly.
* GST is a setting only; calculation arrives with billing in Phase 2.

## Next: Phase 2 (front desk)

Patient registration with duplicate detection, test master screens, booking, billing and payments, receipts, barcode labels, global search, user management.
