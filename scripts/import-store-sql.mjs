import { readFile } from "node:fs/promises";
import { createDbClient } from "./db-client.mjs";

const db = createDbClient();
const dump = await readFile(new URL("../store.sql", import.meta.url), "utf8");
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
const allowed = new Set(tableOrder);

const inserts = dump.match(/INSERT INTO `[^`]+`[\s\S]*?;/g) || [];

await db.batch(["PRAGMA foreign_keys = OFF", ...tableOrder.toReversed().map((table) => `DELETE FROM ${table}`)], "write");

const byTable = new Map();
for (const insert of inserts) {
  const table = insert.match(/INSERT INTO `([^`]+)`/)?.[1];
  if (!table || !allowed.has(table)) continue;
  byTable.set(table, insert.replaceAll("`", ""));
}

for (const table of tableOrder) {
  const sqlite = byTable.get(table);
  if (sqlite) await db.execute(sqlite);
}

await db.execute("PRAGMA foreign_keys = ON");

console.log(`Imported ${byTable.size} tables from store.sql.`);
