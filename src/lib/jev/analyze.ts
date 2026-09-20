import { createServerFn } from "@tanstack/react-start";
import { CHAR_LIMIT } from "./constants";
import type { AnalyzeResult, LanguageId } from "./types";

const LANGUAGES: LanguageId[] = [
  "javascript",
  "typescript",
  "python",
  "sql",
  "json",
];

export const analyzeCode = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    if (!data || typeof data !== "object") {
      return { ok: false, error: "Paste a snippet first." };
    }
    const rec = data as { language?: unknown; code?: unknown };
    const language = rec.language;
    const code = rec.code;
    if (typeof language !== "string" || typeof code !== "string") {
      return { ok: false, error: "Paste a snippet first." };
    }
    if (!(LANGUAGES as string[]).includes(language)) {
      return { ok: false, error: "Pick a supported language." };
    }
    const trimmed = code.slice(0, CHAR_LIMIT);
    const { runAnalysis } = await import("./api.server.ts");
    return runAnalysis({ language: language as LanguageId, code: trimmed });
  });
