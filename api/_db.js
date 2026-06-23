import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL or POSTGRES_URL for Neon/Postgres connection.");
}

export const sql = neon(connectionString);
