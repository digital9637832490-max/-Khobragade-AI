# Security Checklist

Implemented in scaffold:
- bcrypt password hashing
- JWT role-based authentication
- admin route protection
- Helmet security headers
- CORS allowlist
- request rate limiting
- Zod input validation
- PostgreSQL transactions
- row ownership checks for jobs/projects
- server-only wallet mutations
- idempotent payment approval guard
- audit log hooks for admin actions
- private-storage key structure
- no API secrets in frontend source

Before production:
- HTTPS only
- rotate strong AUTH_SECRET
- use a managed PostgreSQL service with TLS
- use S3-compatible private bucket and signed URLs
- validate file magic bytes, not only extensions
- virus/malware scanning for uploads
- secure password reset tokens
- MFA for admins
- CSRF strategy if switching to cookie sessions
- WAF/reverse proxy rate limiting
- backup + point-in-time recovery
- centralized logs/alerts
- strict CSP
- push/email provider signing keys
- payment webhook signature verification
- legal/privacy review
