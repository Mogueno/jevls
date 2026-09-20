#!/usr/bin/env node
/**
 * Manual D1 migrator: applies ../migrations/*.sql to the D1 database named in
 * wrangler.jsonc, in order, via `wrangler d1 execute`.
 *
 * The app already applies these files itself on first request (see
 * src/lib/db.ts), so this script is only for setting the schema up ahead of
 * traffic. It is NOT part of `npm run build` — Workers Builds has no account
 * credentials, and the runtime migrator covers deploys.
 *
 *   node scripts/migrate.mjs            # local D1 (.wrangler/state)
 *   node scripts/migrate.mjs --remote   # the real remote database
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { pendingMigrations } from "./migration-plan.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.argv.includes("--remote");

const wranglerConfig = JSON.parse(
  (await readFile(join(root, "wrangler.jsonc"), "utf8")).replace(
    /^\s*\/\/.*$/gm,
    "",
  ),
);
const databaseName = wranglerConfig.d1_databases?.[0]?.database_name;
if (!databaseName) {
  console.error("[migrate] no d1_databases entry in wrangler.jsonc");
  process.exit(1);
}

const migrationsDir = join(root, "migrations");
let entries;
try {
  entries = await readdir(migrationsDir);
} catch {
  console.log("[migrate] no migrations/ directory — nothing to do.");
  process.exit(0);
}

// Migrations in this repo are idempotent DDL (`create table if not
// exists`), so applying the full set is always safe; --remote runs are
// deliberate operator actions.
const pending = pendingMigrations(entries, []);
if (pending.length === 0) {
  console.log("[migrate] no migrations — nothing to do.");
  process.exit(0);
}

for (const { name, path } of pending) {
  console.log(`[migrate] applying ${name} (${remote ? "remote" : "local"})`);
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      databaseName,
      "--file",
      join(migrationsDir, path),
      ...(remote ? ["--remote"] : ["--local"]),
    ],
    { stdio: "inherit", cwd: root },
  );
}
console.log("[migrate] done.");
