# Setup

## Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Flutter 3.24+
- Android Studio for APK/AAB builds

## Database
1. Start Docker PostgreSQL: `docker compose up -d db`
2. Execute `database/schema.sql`
3. Execute `database/seed.sql`
4. Create first admin securely:
   - Generate bcrypt password hash in backend or a one-time secure script.
   - Insert email + hash into `admins`.
   - Do not store a plaintext production password in SQL.

## Environment
Copy `.env.example` to `.env`. Use unique strong secrets.

## Backend
`cd backend && npm install && npm run dev`
Worker in second process:
`npm run worker`

## Website
Create `website/.env.local`:
`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`
Then:
`cd website && npm install && npm run dev`

## Admin
Create `admin-panel/.env.local`:
`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`
Then:
`cd admin-panel && npm install && npm run dev`

## Flutter
`cd android-app && flutter pub get`
`flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api`
