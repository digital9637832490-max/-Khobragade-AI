# Architecture

Clients:
- Next.js public/user website
- Next.js admin panel
- Flutter Android app

Core API:
- Auth
- Users
- Wallet
- Payments
- Projects
- AI jobs
- Notifications
- Support
- Reports
- Audit logs

Data:
- PostgreSQL is source of truth.
- Coin balance is cached on `users` for fast reads but every mutation creates immutable ledger history.
- Payment approval and coin credit are one database transaction.
- AI job creation and coin debit are one database transaction.

Async:
- API creates `ai_jobs`.
- Worker claims one pending job with `FOR UPDATE SKIP LOCKED`.
- Provider adapters run the external AI/video work.
- Job becomes completed or failed.
- Replace polling worker with Redis/BullMQ/SQS later without changing client-facing APIs.

Storage:
- Keep original and generated media private.
- API should return short-lived signed URLs after ownership checks.
