# Deploying SkillsForge on Render

## Architecture

- **Render Web Service:** Next.js application
- **Render PostgreSQL:** Prisma database
- **Render Cron Job:** optional daily call to `/api/jobs/expiry-check`

The repository includes `render.yaml` for the web service and database. The cron job is intentionally configured in the Render dashboard after the web service URL is known.

## Before the first deployment

1. Apply the PostgreSQL Prisma provider in `apps/skillsforge/prisma/schema.prisma`.
2. Create and commit an initial migration:

   ```bash
   npm install
   npm run db:generate
   cd apps/skillsforge
   npx prisma migrate dev --name init
   cd ../..
   ```

3. Add a real production authentication provider. `SKILLSFORGE_DEV_AUTH=false` disables the demo credentials provider; it does not create replacement authentication.
4. Run:

   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build
   ```

## Render settings

If using `render.yaml`, set these values in the Render dashboard after creation:

```text
NEXTAUTH_URL=https://<your-service>.onrender.com
APP_URL=https://<your-service>.onrender.com
SKILLSFORGE_DEV_AUTH=false
```

The Blueprint generates `NEXTAUTH_SECRET` and `INTERNAL_SECRET`. Do not commit production secrets.

## Database migration and seed

Run the migration once against the Render database:

```bash
DATABASE_URL="<Render internal database URL>" \
  npx prisma migrate deploy --schema apps/skillsforge/prisma/schema.prisma
```

Seed only if this is a new demo database:

```bash
DATABASE_URL="<Render internal database URL>" npm run seed
```

Do not run `prisma db push` for normal production updates.

## Expiry job

Create a Render Cron Job that sends:

```http
POST https://<your-service>.onrender.com/api/jobs/expiry-check
x-internal-secret: <the value of INTERNAL_SECRET>
content-type: application/json
```

Schedule it for `0 6 * * *` and set its timezone/interpretation to Asia/Kolkata if required by the Render plan. Keep the internal secret private.

## Production checklist

- [ ] PostgreSQL migration is committed under `apps/skillsforge/prisma/migrations/`.
- [ ] Real authentication is implemented and tested.
- [ ] `SKILLSFORGE_DEV_AUTH=false`.
- [ ] `NEXTAUTH_URL` exactly matches the public HTTPS URL.
- [ ] `NEXTAUTH_SECRET` is generated and private.
- [ ] `INTERNAL_SECRET` is different from `NEXTAUTH_SECRET` and private.
- [ ] Database migration completed.
- [ ] Demo seed data is not used for a real organization.
- [ ] Cron job configured, if certification expiry alerts are required.
- [ ] Backups and a custom domain are enabled as appropriate.
