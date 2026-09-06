# Deployment

Recommended small-production topology (~100 initial users):

- Website: Vercel/Node hosting
- Admin: separate Vercel/Node deployment
- Backend API: Render/Railway/Fly/VM/container
- Worker: separate backend worker process
- PostgreSQL: managed Postgres
- Storage: Cloudflare R2 / AWS S3 / compatible private bucket
- CDN: only for public/static assets
- Domain: `creator.example.com`, `admin.example.com`, `api.example.com`

Scale path:
1. Start one API instance + one worker.
2. Add connection pooling and managed database metrics.
3. Move jobs to Redis/BullMQ or managed queue when concurrency grows.
4. Add multiple workers for video/AI workloads.

Android:
- set production API URL with `--dart-define`
- configure release signing
- build `flutter build appbundle`
- upload AAB to Play Console


## Current media fallback
- Gemini 3.1 Flash Image is the primary image provider.
- Optional Pollinations API fallback can be enabled with `POLLINATIONS_API_KEY`.
- Veo is the primary video provider; optional Pollinations video fallback uses `POLLINATIONS_VIDEO_MODEL` when `POLLINATIONS_API_KEY` is configured.
