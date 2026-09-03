# Final consolidation — 2026-09-03

- Latest uploaded project used as the only base.
- Removed stale compiled backend `dist/` so old mock image/video code cannot shadow current TypeScript source. Deployment must run `npm run build` before `npm start`.
- Image generation uses the current stable `gemini-3.1-flash-image` model by default.
- Video generation uses the real Veo provider and long-running operation polling.
- Website image/video pages poll AI jobs and surface results/errors.
- Website and Android voice conversation flows include automatic listen restart/retry.
- Android checked-in package identity aligned to CI-generated package: `com.niteshkhobragade.creator_studio`.
- Google login source is retained alongside email/password login.
- Existing payment, wallet, CMS, admin/user routes and dashboard styling were not intentionally redesigned.

## Deployment requirements
Backend build command must compile TypeScript before start (for example `npm install && npm run build`).
Required environment variables remain deployment secrets and are not stored in this ZIP.
Google native Android sign-in additionally requires an Android OAuth client whose package/SHA-1 matches the APK signing certificate.
