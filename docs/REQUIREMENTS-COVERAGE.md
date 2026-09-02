# Creator Studio Requirements Coverage

## Public Website
Home, Features, How It Works, Pricing, Login, Register, Forgot Password, Contact, Terms, Privacy: `website/app/*`.

## User Dashboard
Dashboard home, AI Thumbnail, AI Title, AI Description, AI Tags/Hashtags, Photo→Video, Voice-over, Projects/Jobs, Coins/Recharge, Transactions, Notifications, Support, Profile, Logout are present in `website/app` and use the shared backend.

## Android App
Flutter app uses the same REST backend and JWT account. Bottom navigation: Home, Create, Projects, Coins, Profile. Create includes Thumbnail, Title, Description, Tags, Photo→Video and Voice-over.

## Wallet and Recharge
Server-side wallet mutation: `backend/src/wallet.ts`.
Payment request/approval/rejection: user/admin routes. Payment approval and coin credit are atomic. Ledger history is stored in PostgreSQL.

## Admin
Dashboard reports, users, coin adjustment/block, payment approval/rejection, coin package management, AI tool settings/cost/limit/maintenance, project/job management, notifications, support replies/status, audit logs.

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
