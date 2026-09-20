import type { FindingSeverity, IssueCategory } from "./types";

export const CATEGORIES: IssueCategory[] = [
  "clean",
  "security",
  "bug",
  "performance",
  "smell",
  "types",
  "secret",
];

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
  clean: "Clean",
  security: "Security",
  bug: "Bug",
  performance: "Performance",
  smell: "Smell",
  types: "Types",
  secret: "Secret",
};

export const CATEGORY_HINT: Record<IssueCategory, string> = {
  clean: "No meaningful issue in this range.",
  security:
    "Possible XSS, injection, eval of untrusted input, or auth bypass.",
  bug: "Likely logic error, crash, race, or wrong result.",
  performance: "Needless work, leak, or hot-path waste.",
  smell: "Confusing structure, missing handling, or dead code.",
  types: "Type unsafety or an invalid assumption.",
  secret: "Credential, token, or secret may be in source.",
};

export const HEALTH_LABELS = [
  "Clean",
  "Nits",
  "Warning",
  "Error",
  "Critical",
] as const;

export const ISSUE_CRITERIA: Record<IssueCategory, string> = {
  clean: "No meaningful defect in the judged range",
  security:
    "XSS, injection, eval of untrusted input, auth bypass, path traversal",
  bug: "Logic error, crash, wrong result, race, off-by-one, stale state",
  performance: "Needless work, N+1, leak, unbounded loop, sync in hot path",
  smell: "Dead code, missing error handling, confusing structure",
  types: "Type unsafety, invalid assumption, unchecked null",
  secret: "Hardcoded token, password, API key, or credential in source",
};

export function asCategory(value: string | null | undefined): IssueCategory {
  if (value && (CATEGORIES as string[]).includes(value)) {
    return value as IssueCategory;
  }
  return "smell";
}

export function healthLabel(score: number): string {
  const i = Math.max(0, Math.min(4, Math.round(score)));
  return HEALTH_LABELS[i] ?? "Warning";
}

export function severityFromScore(score: number): FindingSeverity {
  if (score >= 3) return "error";
  if (score >= 2) return "warning";
  return "info";
}
