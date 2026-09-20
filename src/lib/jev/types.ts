export type LanguageId =
  | "javascript"
  | "typescript"
  | "python"
  | "sql"
  | "json";

export type IssueCategory =
  | "clean"
  | "security"
  | "bug"
  | "performance"
  | "smell"
  | "types"
  | "secret";

export type FindingSeverity = "error" | "warning" | "info";

export type CodeBlock = {
  id: string;
  startLine: number;
  endLine: number;
  from: number;
  to: number;
  text: string;
};

export type Finding = {
  id: string;
  blockId: string;
  startLine: number;
  endLine: number;
  severity: FindingSeverity;
  category: IssueCategory;
  title: string;
  detail: string;
  score: number | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
};

export type Gauge = {
  id: string;
  label: string;
  hint: string;
  value: number;
};

export type HealthLevel = {
  score: number;
  label: string;
  confidence: number | null;
  probabilities: Record<string, number>;
};

export type CategoryResult = {
  choice: IssueCategory;
  confidence: number | null;
  probabilities: Record<string, number>;
};

export type Analysis = {
  model: string;
  latencyMs: number;
  inputTokens: number;
  health: HealthLevel;
  category: CategoryResult;
  gauges: Gauge[];
  findings: Finding[];
  blockCount: number;
};

export type AnalyzeInput = {
  language: LanguageId;
  code: string;
};

export type AnalyzeResult =
  | { ok: true; analysis: Analysis }
  | { ok: false; error: string };
