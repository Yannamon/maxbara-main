import "server-only";
import { Pool, type PoolClient } from "pg";
import { validDatabaseUrl } from "../config/database";

let pool: Pool | undefined;

export function databaseConfigured() {
  return validDatabaseUrl(process.env.DATABASE_URL);
}

export function db() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing.");
  if (!validDatabaseUrl(connectionString)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string from Supabase Connect, not the HTTPS project API URL.");
  }
  if (!pool) {
    pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 });
    pool.on("error", (error) => console.error("An idle database connection failed.", error.message));
  }
  return pool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
