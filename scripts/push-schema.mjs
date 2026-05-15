import { readFile } from "node:fs/promises";
import { createDbClient } from "./db-client.mjs";

const db = createDbClient();
const schema = await readFile(new URL("../migrations/0001_turso_schema.sql", import.meta.url), "utf8");

for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((sql) => sql.trim()).filter(Boolean)) {
  await db.execute(statement);
}

console.log("Turso/SQLite schema is ready.");
