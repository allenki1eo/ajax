import { readFile } from "node:fs/promises";
import { createDbClient } from "./db-client.mjs";

const db = createDbClient();
const seed = await readFile(new URL("../migrations/0002_seed_data.sql", import.meta.url), "utf8");

const tableOrder = [
  "categories",
  "suppliers",
  "users",
  "products",
  "sales",
  "sale_items",
  "purchases",
  "purchase_items",
  "stock_movements",
];

// Clear existing data in reverse order to respect foreign keys
await db.batch(
  ["PRAGMA foreign_keys = OFF", ...tableOrder.toReversed().map((t) => `DELETE FROM ${t}`)],
  "write",
);

// Extract and execute each INSERT block from the seed file
const inserts = seed.match(/INSERT INTO \w+[\s\S]*?;/g) || [];
for (const stmt of inserts) {
  await db.execute(stmt.trim());
}

await db.execute("PRAGMA foreign_keys = ON");

console.log(`Seeded ${inserts.length} INSERT statements from migrations/0002_seed_data.sql.`);
