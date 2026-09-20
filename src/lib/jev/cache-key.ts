import type { LanguageId } from "./types";

/**
 * FNV-1a 32-bit hash. Tiny and dependency-free so the exact same function can
 * run in the browser bundle, the Worker, and the cache-generator script.
 */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply (16777619), kept in unsigned 32-bit range.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Cache key for a scored snippet: language + exact code content. */
export function cacheKey(language: LanguageId, code: string): string {
  return `${language}:${fnv1a(code)}`;
}
