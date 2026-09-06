# Creator Studio Requirements Coverage

## Public Website
Home, Features, How It Works, Pricing, Login, Register, Forgot Password, Contact, Terms, Privacy: `website/app/*`.

## User Dashboard

## Android App


## Admin

## AI / Video
Provider interfaces: `backend/src/ai/providers.ts`.
Async worker: `backend/src/worker.ts`.
Jobs support pending/processing/completed/failed and per-tool cost + daily limit + maintenance checks.

## Storage
Private ownership-aware file metadata and local-development upload endpoint are included. S3-compatible provider is intentionally configurable and must be connected with real storage credentials for production.

## Database
Required tables plus support message history are defined in `database/schema.sql`.

## Security
JWT auth, bcrypt hashes, admin role checks, Zod validation, Helmet, CORS allowlist, rate limiting, PostgreSQL transactions, project/job ownership, private file ownership, audit logs and no frontend secrets.

## External Services Requiring Credentials
Real AI text/image/video providers, S3-compatible object storage, payment gateway, push notifications and email require provider accounts/API keys. `.env.example` and provider configuration placeholders are included; secrets are not hard-coded.

## Deployment
Setup, API, security, architecture and deployment documentation are in `docs/`.


## Current media fallback
- Gemini 3.1 Flash Image is the primary image provider.
- Optional Pollinations API fallback can be enabled with `POLLINATIONS_API_KEY`.
- Veo is the primary video provider; optional Pollinations video fallback uses `POLLINATIONS_VIDEO_MODEL` when `POLLINATIONS_API_KEY` is configured.
