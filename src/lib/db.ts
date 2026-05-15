import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }

  return client;
}

export async function rows<T>(sql: string, args: InValue[] = []) {
  const result = await getDb().execute({ sql, args });
  return result.rows as T[];
}

export async function row<T>(sql: string, args: InValue[] = []) {
  const result = await getDb().execute({ sql, args });
  return (result.rows[0] || null) as T | null;
}

export async function exec(sql: string, args: InValue[] = []) {
  return getDb().execute({ sql, args });
}
