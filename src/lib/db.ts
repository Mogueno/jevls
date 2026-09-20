import { env } from "cloudflare:workers";
import { pendingMigrations } from "../../scripts/migration-plan.mjs";

/**
 * The waitlist database is Cloudflare **D1** (serverless SQLite), bound to the
 * Worker as `DB` (see `d1_databases` in wrangler.jsonc). No connection string,
 * no external database service: production uses the remote D1 database, and
 * local dev (`vite dev` / `wrangler dev`) gets a local D1 automatically via
 * the Cloudflare tooling, so the same code path runs everywhere.
 */

/**
 * Split a migration file into executable statements. A D1 prepared statement
 * holds exactly one SQL statement, so a file is applied statement by
 * statement — atomically, via `db.batch()` (batch is the transaction; never
 * put BEGIN/COMMIT in a migration file). Keep migrations to simple DDL/DML:
 * no semicolons inside string literals.
 */
function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 0);
}

async function ensureMigrated(db: D1Database): Promise<void> {
  await db
    .prepare(
      "create table if not exists _migrations (name text primary key, applied_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')))",
    )
    .run();
  const { results } = await db
    .prepare("select name from _migrations")
    .all<{ name: string }>();
  const done = results.map((r) => r.name);

  // Inlined by the bundler via import.meta.glob (no runtime fs). The glob does
  // not descend, so the opt-in auth schema under migrations/auth/ stays out —
  // the same scope the old migrators had.
  const files = import.meta.glob("/migrations/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  for (const { name, path } of pendingMigrations(Object.keys(files), done)) {
    // Apply + record atomically: batch is D1's transaction, so a failed
    // statement can't leave a file half-applied but untracked.
    const batch = [
      ...splitStatements(files[path]).map((s) => db.prepare(s)),
      db.prepare("insert into _migrations (name) values (?)").bind(name),
    ];
    await db.batch(batch);
  }
}

let migrated: Promise<void> | null = null;

/**
 * The D1 binding with `migrations/*.sql` applied. Memoized — safe to call per
 * request. Schema lives in `migrations/`, auto-applied before the first query;
 * define tables there, never inline in server functions.
 *
 * Server-only: call from a createServerFn handler or server route, never from
 * client code.
 */
export function getDb(): Promise<D1Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getDb() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  const db = env.DB;
  if (!db) {
    throw new Error(
      "D1 binding `DB` is not configured — see `d1_databases` in wrangler.jsonc.",
    );
  }
  migrated ??= ensureMigrated(db).catch((err) => {
    migrated = null; // don't memoize failures — let the next call retry
    throw err;
  });
  return migrated.then(() => db);
}
