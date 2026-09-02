# API Summary

Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- GET /api/auth/me

User:
- GET /api/wallet
- GET /api/wallet/transactions
- GET /api/coin-packages
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
- POST /api/admin/users/:id/coins
- POST /api/admin/users/:id/status
- GET /api/admin/payments
- POST /api/admin/payments/:id/approve
- POST /api/admin/payments/:id/reject
- GET /api/admin/reports
- GET /api/admin/audit-logs
- PATCH /api/admin/settings/:key

Authorization:
`Authorization: Bearer <JWT>`

Coin safety:
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
