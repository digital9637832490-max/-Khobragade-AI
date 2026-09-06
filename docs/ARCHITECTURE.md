# Architecture

Clients:
- Next.js public/user website
- Next.js admin panel
- Flutter Android app

Core API:
- Auth
- Users
- Payments
- Projects
- AI jobs
- Notifications
- Support
- Reports
- Audit logs

Data:
- PostgreSQL is source of truth.

Async:
- API creates `ai_jobs`.
- Worker claims one pending job with `FOR UPDATE SKIP LOCKED`.
- Provider adapters run the external AI/video work.
- Job becomes completed or failed.
- Replace polling worker with Redis/BullMQ/SQS later without changing client-facing APIs.

Storage:
- Keep original and generated media private.
- API should return short-lived signed URLs after ownership checks.


## Current media fallback
- Gemini 3.1 Flash Image is the primary image provider.
- Optional Pollinations API fallback can be enabled with `POLLINATIONS_API_KEY`.
- Veo is the primary video provider; optional Pollinations video fallback uses `POLLINATIONS_VIDEO_MODEL` when `POLLINATIONS_API_KEY` is configured.
