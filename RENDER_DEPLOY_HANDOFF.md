# ARK-FEST / SkillsForge — Render Deployment Handoff

## Verification completed

- `npm run typecheck` — passed
- `npm test` — **150/150 tests passed**
- `npm run build` with Render-style environment variables — passed
- Next.js production route `/api/coverage` is present
- Start command now honors Render's injected `PORT`

## 1. Commit and push the fixes

Run locally or in your GitHub Codespace:

```bash
git add .gitignore apps/skillsforge/package.json apps/skillsforge/app/api/coverage/route.ts
git commit -m "fix: prepare SkillsForge for Render deployment"
git push origin main
```

The GitHub connector in this session is not authenticated, so the push must be performed from your authenticated GitHub environment.

## 2. Create the Render services

Recommended method:

1. Open Render Dashboard.
2. Select **New → Blueprint**.
3. Choose the repository `awakenedarpit/ARK-FEST` and branch `main`.
4. Render will read the root `render.yaml` and create:
   - Node web service: `skillsforge`
   - PostgreSQL database: `skillsforge-db`
5. Use the **Free** plan only for testing/hobby use. Render states that free Postgres expires after 30 days and has no backups; use a paid database for real production data.

If creating the web service manually, use:

| Setting | Value |
|---|---|
| Runtime | Node |
| Root directory | repository root |
| Build command | `npm ci && npm run db:generate --workspace=skillsforge && npx prisma migrate deploy --schema apps/skillsforge/prisma/schema.prisma && npm run build --workspace=skillsforge` |
| Start command | `npm run start --workspace=skillsforge` |
| Health check path | `/api/health` |

## 3. Required environment variables

The Blueprint generates `NEXTAUTH_SECRET` and `INTERNAL_SECRET` and connects `DATABASE_URL` to the Render Postgres database.

Set these in the Render service after creation:

```text
NEXTAUTH_URL=https://<your-service>.onrender.com
APP_URL=https://<your-service>.onrender.com
SKILLSFORGE_DEV_AUTH=false
APP_TIMEZONE=Asia/Kolkata
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
AUTHORIZED_EMAILS=<comma-separated allowed email addresses>
```

Do not commit these values. `NEXTAUTH_URL` must exactly match the public HTTPS URL.

## 4. Google OAuth callback

In Google Cloud Console, add this authorized redirect URI:

```text
https://<your-service>.onrender.com/api/auth/callback/google
```

Use the same Google OAuth client ID and secret in Render. Keep `AUTHORIZED_EMAILS` restricted to the intended users.

## 5. Database

The Render Blueprint build command runs:

```bash
npx prisma migrate deploy --schema apps/skillsforge/prisma/schema.prisma
```

Do **not** use `prisma db push` for production updates.

For a new demo database only, run the seed from an environment with the Render `DATABASE_URL`:

```bash
DATABASE_URL="<Render database connection string>" npm run seed
```

Do not seed demo data into a real organization database.

## 6. Optional expiry-alert cron

Create a Render Cron Job after the web service URL is known. Schedule it daily at `0 6 * * *` using Asia/Kolkata interpretation if available.

Send:

```http
POST https://<your-service>.onrender.com/api/jobs/expiry-check
x-internal-secret: <the exact INTERNAL_SECRET value>
content-type: application/json
```

Keep `INTERNAL_SECRET` private.

## Important Render limitation

Render web services must listen on Render's `PORT`. This repository now uses:

```text
next start -p ${PORT:-3011}
```

so local development remains on port `3011`, while Render uses its assigned port.
