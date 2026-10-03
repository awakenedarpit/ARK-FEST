import { db as prismaDb } from "@quikit/database";

// Do not probe 127.0.0.1 here. Production databases such as Render
// PostgreSQL are remote, and a localhost TCP probe falsely reports them as
// offline. Prisma owns connection pooling and reports connection errors at
// the actual query site.
export const db: any = prismaDb;

export default db;
