/**
 * Generates src/lib/jev/sample-cache.json: one pre-computed Jev analysis per
 * built-in playground sample, keyed by cacheKey(language, exact code).
 *
 * Samples are scored through the live production endpoint (which holds the
 * TYPESAFE_API_KEY secret), so no API key is needed locally and cached results
 * match what a live call would have returned. Re-run whenever a sample or the
 * scoring pipeline changes:
 *
 *   node --experimental-strip-types scripts/build-sample-cache.ts
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { SAMPLES } from "../src/lib/jev/samples.ts";
import { cacheKey } from "../src/lib/jev/cache-key.ts";

const require = createRequire(import.meta.url);
const { toJSONAsync } = require("seroval");
const { decodeSeroval } = require("./seroval-lite.mjs");

const BASE = process.env.JEVLS_BASE_URL ?? "https://jevls.buguinha29.workers.dev";
const ANALYZE_ID =
  "33d2909e7ffa3412813c69f54bbeeb5a40d572bbea34509f5aee8903375c02fe";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function scoreLive(language: string, code: string) {
  const payload = { data: { language, code } };
  const body = JSON.stringify(await toJSONAsync(payload));
  const res = await fetch(`${BASE}/_serverFn/${ANALYZE_ID}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tsr-serverFn": "true",
      accept: "application/json",
      "user-agent": UA,
      origin: BASE,
      referer: `${BASE}/`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Live endpoint returned ${res.status}: ${await res.text()}`);
  }
  const outer = decodeSeroval(JSON.parse(await res.text()));
  return outer.result;
}

const cache: Record<string, unknown> = {};
for (const sample of SAMPLES) {
  const result = await scoreLive(sample.language, sample.code);
  if (!result?.ok) {
    throw new Error(
      `Live scoring failed for sample "${sample.id}": ${JSON.stringify(result)}`,
    );
  }
  const key = cacheKey(sample.language, sample.code);
  cache[key] = result.analysis;
  console.log(
    `cached ${sample.id} -> ${key} (health ${result.analysis.health.score}, ${result.analysis.findings.length} findings)`,
  );
}

writeFileSync(
  new URL("../src/lib/jev/sample-cache.json", import.meta.url),
  JSON.stringify(cache, null, 2) + "\n",
);
console.log(`wrote src/lib/jev/sample-cache.json (${Object.keys(cache).length} samples)`);
