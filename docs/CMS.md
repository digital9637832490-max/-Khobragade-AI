# Creator Studio — Three CMS Control System

Creator Studio contains three independent CMS scopes, all managed from the secure Admin Panel.

## 1. Admin CMS
Route: `/admin-cms`
Scope: `admin`
Controls admin sidebar/navigation, dashboard card configuration, and any new admin UI metadata stored as CMS items.

## 2. Website CMS
Route: `/website-cms`
Scope: `website`
Controls public navigation, home hero, feature blocks, public page copy, user dashboard navigation, and future website sections/components.

## 3. App CMS
Route: `/app-cms`
Scope: `app`
Controls Flutter bottom navigation labels/icons, Create tools and Home cards. New app configuration blocks can be added without changing the CMS database model.

## A-to-Z controls available in all three CMS editors
- New item / existing item
- Edit / update
- Soft delete / restore
- Enable / disable
- Reorder / sort order
- Clone
- Parent/child relation
- Item type
- Nested content JSON
- Design JSON
- Behavior / actions / events JSON
- Validation / fields / options JSON
- Version counter
- Updated-by admin tracking
- Audit logs for create/update/delete/restore/toggle/reorder/clone

## Security
- Admin CMS write APIs require authenticated Admin role.
- Public CMS reads expose only enabled, non-deleted Website/App items.
- Admin-scope CMS is not exposed through public CMS endpoints.
- Secrets/API keys must never be stored in CMS JSON; use environment variables.

## Database
`cms_items` is the source of truth. It supports three scopes: `admin`, `website`, `app`.
