# API Summary

Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- GET /api/auth/me

User:
- POST /api/payments/request
- POST /api/projects
- GET /api/projects
- POST /api/ai/thumbnail
- POST /api/ai/content
- POST /api/ai/video
- GET /api/jobs/:id
- GET /api/notifications
- POST /api/support

Admin:
- POST /api/admin/login
- GET /api/admin/users
- POST /api/admin/users/:id/status
- GET /api/admin/payments
- POST /api/admin/payments/:id/approve
- POST /api/admin/payments/:id/reject
- GET /api/admin/reports
- GET /api/admin/audit-logs
- PATCH /api/admin/settings/:key

Authorization:
`Authorization: Bearer <JWT>`

AI job creation performs a database transaction. User row is locked, insufficient balance is rejected,
ledger is written, and the updated server-side balance is committed atomically.

## CMS
Client reads:
- GET /api/cms/website
- GET /api/cms/website/:key
- GET /api/cms/app
- GET /api/cms/app/:key

Admin-only:
- GET /api/admin/cms/:scope?includeDeleted=true|false
- POST /api/admin/cms/items
- PATCH /api/admin/cms/items/:id
- POST /api/admin/cms/items/:id/toggle
- DELETE /api/admin/cms/items/:id
- POST /api/admin/cms/items/:id/restore
- POST /api/admin/cms/:scope/reorder
- POST /api/admin/cms/:scope/clone/:id

## AI routing
- `/api/ai/chat` supports device/location/time/file context.
- Chat results may include `sources: [{title, uri}]` when grounded search is used.
- AI provider fallback is configured through backend environment variables; see `backend/.env.example` and `docs/AI-FALLBACK-AND-FEATURES.md`.


## Current media fallback
- Gemini 3.1 Flash Image is the primary image provider.
- Optional Pollinations API fallback can be enabled with `POLLINATIONS_API_KEY`.
- Veo is the primary video provider; optional Pollinations video fallback uses `POLLINATIONS_VIDEO_MODEL` when `POLLINATIONS_API_KEY` is configured.
