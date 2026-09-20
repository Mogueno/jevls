import { env } from "cloudflare:workers";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import { getDb } from "../db";

/** Live scores allowed per visitor IP per hour (samples are free - cached). */
export const SCORES_PER_HOUR = 10;

export type ScoreBudget =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * Two-layer protection for the live scoring endpoint:
 *
 * 1. Burst guard - Cloudflare's native Workers rate-limiting binding
 *    (`TRYOUT_LIMITER` in wrangler.jsonc) throttles rapid-fire requests per IP
 *    at the edge. The binding only supports 10s/60s windows, so it cannot
 *    express an hourly cap.
 * 2. Hourly cap - an atomic counter in D1 (`score_quota` table) enforces
 *    SCORES_PER_HOUR live analyses per IP. Every live call counts, including
 *    failed ones: the point is to cap how often the paid Jev API is invoked.
 */
export async function spendScoreBudget(): Promise<ScoreBudget> {
  // On Cloudflare the real client IP is in cf-connecting-ip (unspoofable at
  // the edge); getRequestIP covers X-Forwarded-For / socket fallbacks locally.
  const ip =
    getRequest().headers.get("cf-connecting-ip") ??
    getRequestIP() ??
    "unknown";

  const limiter = env.TRYOUT_LIMITER;
  if (limiter) {
    // Local dev has no real rate-limiting backend; a thrown error must not
    // break scoring, so only a definitive `success: false` blocks.
    try {
      const { success } = await limiter.limit({ key: ip });
      if (!success) return { ok: false, retryAfterSeconds: 60 };
    } catch {
      // Binding unavailable (e.g. local dev) - fall through to the D1 cap.
    }
  }

  const db = await getDb();
  const row = await db
    .prepare(
      `insert into score_quota (ip, window_start, count)
       values (?, strftime('%Y-%m-%dT%H:00Z', 'now'), 1)
       on conflict (ip, window_start) do update set count = count + 1
       returning count`,
    )
    .bind(ip)
    .first<{ count: number }>();
  const used = row?.count ?? SCORES_PER_HOUR + 1;
  if (used > SCORES_PER_HOUR) {
    const now = new Date();
    const nextHour =
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1) / 1000;
    return {
      ok: false,
      retryAfterSeconds: Math.max(60, Math.round(nextHour - now.getTime() / 1000)),
    };
  }
  return { ok: true };
}
