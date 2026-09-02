# Creator Studio

Production-oriented starter package for a YouTube creator platform with:

- Next.js public website + user dashboard
- Next.js admin panel
- Node.js + Express + TypeScript backend
- PostgreSQL schema and seed data
- Flutter Android app scaffold
- Coin wallet ledger with server-side credit/debit
- Manual payment verification flow with idempotent approval
- AI tool adapter interfaces for text/image/video providers
- Async AI/video job queue structure
- Private object-storage abstraction
- Notifications, support tickets, audit logs
- Docker Compose PostgreSQL for local development
- Setup and deployment documentation

## Important

This package is intentionally provider-configurable. Real AI generation, payment gateway settlement, S3 upload signing,
push notifications and email delivery require your own provider accounts/API keys.

The core wallet and payment approval flow is implemented on the backend and never trusts a client-submitted balance.

## Quick start

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL: `docker compose up -d db`
3. Run `database/schema.sql`, then `database/seed.sql`.
4. Start backend:
   - `cd backend`
   - `npm install`
   - `npm run dev`
5. Start website:
   - `cd website`
   - `npm install`
   - `npm run dev`
6. Start admin:
   - `cd admin-panel`
   - `npm install`
   - `npm run dev`
7. Flutter:
   - `cd android-app`
   - `flutter pub get`
   - `flutter run`

See `docs/SETUP.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, and `docs/API.md`.

## Three CMS panels

Secure Admin Panel includes:
- `/admin-cms` — Admin CMS
- `/website-cms` — Website CMS
- `/app-cms` — App CMS

All three support create/edit/update, enable/disable, reorder, clone, soft delete/restore, nested content, design, behavior/actions/events and validation/field configuration, with versions and audit logs. See `docs/CMS.md`.
