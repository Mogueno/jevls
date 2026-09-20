import type { LanguageId } from "./types";

export const CHAR_LIMIT = 2000;
export const MIN_CHARS = 12;
export const MAX_BLOCKS = 5;

export const LANGUAGES: { id: LanguageId; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
];
