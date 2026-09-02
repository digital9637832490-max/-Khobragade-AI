# Final Package Audit

This file documents the local structural audit performed before packaging.

Required master modules:
- website/
- android-app/
- admin-panel/
- backend/
- database/
- storage/
- config/
- docs/
- README.md
- .env.example

Three CMS:
- Admin CMS UI: admin-panel/app/admin-cms/page.tsx
- Website CMS UI: admin-panel/app/website-cms/page.tsx
- App CMS UI: admin-panel/app/app-cms/page.tsx
- Shared CMS editor: admin-panel/components/CmsManager.tsx
- CMS backend/API: backend/src/routes/cms.ts
- CMS database: database/schema.sql (`cms_items`)
- CMS default data: database/seed.sql
- Website runtime connection: website/lib/cms.ts + public pages/components
- Admin runtime connection: AdminShell + admin dashboard
- Flutter runtime connection: android-app/lib/cms.dart + main/home screens

External provider credentials are intentionally not hard-coded. Provider adapters/config remain environment-driven.
