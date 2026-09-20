import { numberLines, splitBlocks } from "./blocks";
import { CHAR_LIMIT, MIN_CHARS } from "./constants";
import {
  asCategory,
  CATEGORY_HINT,
  CATEGORY_LABEL,
  healthLabel,
  ISSUE_CRITERIA,
  severityFromScore,
} from "./messages";
import type {
  Analysis,
  AnalyzeInput,
  AnalyzeResult,
  CodeBlock,
  Finding,
  Gauge,
  IssueCategory,
} from "./types";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";

type NoulAnswer = { type: "noul"; noul?: number | null };
type ChoiceAnswer = {
  type: "choice";
  choice?: string | null;
  confidence?: number | null;
  probabilities?: Record<string, number> | null;
};
type ScoreAnswer = {
  type: "score";
  score?: number | null;
  confidence?: number | null;
  probabilities?: Record<string, number> | null;
};
type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;
type JevResponse = {
  model?: string;
  answers?: Record<string, Answer>;
  usage?: { input_tokens?: number };
};

function jevKey(): string | undefined {
  return process.env.TYPESAFE_API_KEY?.trim() || undefined;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function noulOf(answer: Answer | undefined): number {
  if (!answer || answer.type !== "noul") return 0;
  return clamp01(answer.noul ?? 0);
}

function choiceOf(answer: Answer | undefined): ChoiceAnswer | undefined {
  if (!answer || answer.type !== "choice") return undefined;
  return answer;
}

function scoreOf(answer: Answer | undefined): ScoreAnswer | undefined {
  if (!answer || answer.type !== "score") return undefined;
  return answer;
}

function questions(blocks: CodeBlock[]) {
  const q: Record<string, unknown> = {
    health: {
      type: "score",
      instructions: "Overall ship-readiness of this snippet as a whole",
      criteria: [
        "Clean — ship it",
        "Nits only — style or naming",
        "Warning — should fix soon",
        "Error — likely bug or unsafe",
        "Critical — exploit, data loss, or secret leak",
      ],
    },
    category: {
      type: "choice",
      instructions: "The single most important issue in this snippet",
      criteria: ISSUE_CRITERIA,
    },
    g_security: {
      type: "noul",
      instructions: "This snippet has a security vulnerability",
      criteria: {
        true: "XSS, injection, eval of untrusted input, auth bypass",
        false: "No security issue",
      },
    },
    g_bug: {
      type: "noul",
      instructions: "This snippet has a logic bug that can fail or return wrong results",
    },
    g_secret: {
      type: "noul",
      instructions:
        "This snippet contains a hardcoded secret, token, password, or API key",
    },
    g_ready: {
      type: "noul",
      instructions: "This snippet is safe to ship as-is",
    },
  };

  for (const block of blocks) {
    q[`${block.id}_issue`] = {
      type: "choice",
      instructions: `Primary issue in block ${block.id} only (lines ${block.startLine}–${block.endLine}). Ignore other blocks.`,
      criteria: ISSUE_CRITERIA,
    };
    q[`${block.id}_sev`] = {
      type: "score",
      instructions: `Severity of issues in block ${block.id} only (lines ${block.startLine}–${block.endLine}).`,
      criteria: ["None", "Nit", "Warning", "Error", "Critical"],
    };
  }
  return q;
}

async function postJev(body: unknown, attempt: 0 | 1): Promise<JevResponse> {
  const key = jevKey();
  if (!key) throw new Error("Jev is not available");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if ((res.status === 429 || res.status === 529) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 600));
      return postJev(body, 1);
    }
    if (!res.ok) {
      throw new Error(`Jev request failed (${res.status})`);
    }
    return (await res.json()) as JevResponse;
  } finally {
    clearTimeout(timer);
  }
}

function toFindings(
  blocks: CodeBlock[],
  answers: Record<string, Answer>,
): Finding[] {
  const findings: Finding[] = [];
  for (const block of blocks) {
    const issue = choiceOf(answers[`${block.id}_issue`]);
    const sev = scoreOf(answers[`${block.id}_sev`]);
    const category = asCategory(issue?.choice ?? undefined);
    const score = sev?.score ?? 0;
    if (category === "clean" && score < 1.5) continue;
    findings.push({
      id: block.id,
      blockId: block.id,
      startLine: block.startLine,
      endLine: block.endLine,
      severity: severityFromScore(score),
      category,
      title: CATEGORY_LABEL[category],
      detail: CATEGORY_HINT[category],
      score,
      confidence: issue?.confidence ?? sev?.confidence ?? null,
      probabilities: issue?.probabilities ?? null,
    });
  }
  const rank: Record<Finding["severity"], number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return findings;
}

export async function runAnalysis(input: AnalyzeInput): Promise<AnalyzeResult> {
  const code = input.code.slice(0, CHAR_LIMIT);
  if (code.trim().length < MIN_CHARS) {
    return { ok: false, error: "Paste a bit more code — at least a few lines." };
  }

  const key = jevKey();
  if (!key) {
    return {
      ok: false,
      error:
        "Jev API key is not configured. Please set TYPESAFE_API_KEY in your environment variables.",
    };
  }

  const blocks = splitBlocks(code);
  const state = {
    language: input.language,
    code_numbered: numberLines(code),
    blocks: blocks.map((b) => ({
      id: b.id,
      lines: `${b.startLine}-${b.endLine}`,
      text: b.text,
    })),
  };

  const started = Date.now();
  try {
    const payload = await postJev(
      {
        model: "jev-latest",
        state,
        questions: questions(blocks),
      },
      0,
    );
    const answers = payload.answers ?? {};
    const healthAns = scoreOf(answers.health);
    const catAns = choiceOf(answers.category);
    const category = asCategory(catAns?.choice ?? undefined);
    const healthScore = healthAns?.score ?? 0;

    const gauges: Gauge[] = [
      {
        id: "security",
        label: "Security issue",
        hint: "XSS, injection, eval, auth bypass",
        value: noulOf(answers.g_security),
      },
      {
        id: "bug",
        label: "Logic bug",
        hint: "Wrong result, crash, race, stale state",
        value: noulOf(answers.g_bug),
      },
      {
        id: "secret",
        label: "Secret in source",
        hint: "Token, password, or API key in the snippet",
        value: noulOf(answers.g_secret),
      },
      {
        id: "ready",
        label: "Safe to ship",
        hint: "Probability this snippet is fine as-is",
        value: noulOf(answers.g_ready),
      },
    ];

    const analysis: Analysis = {
      model: payload.model ?? "jev-latest",
      latencyMs: Date.now() - started,
      inputTokens: payload.usage?.input_tokens ?? 0,
      health: {
        score: healthScore,
        label: healthLabel(healthScore),
        confidence: healthAns?.confidence ?? null,
        probabilities: healthAns?.probabilities ?? {},
      },
      category: {
        choice: category,
        confidence: catAns?.confidence ?? null,
        probabilities: catAns?.probabilities ?? {},
      },
      gauges,
      findings: toFindings(blocks, answers),
      blockCount: blocks.length,
    };
    return { ok: true, analysis };
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === "AbortError" || /abort/i.test(err.message));
    const msg = err instanceof Error ? err.message : "";
    if (aborted) {
      return { ok: false, error: "Jev timed out. Try a shorter snippet." };
    }
    if (msg.includes("401") || msg.includes("403")) {
      return {
        ok: false,
        error: "Invalid TypeSafe Jev API key. Please verify your TYPESAFE_API_KEY.",
      };
    }
    return {
      ok: false,
      error: "Jev could not scan this snippet. Try again.",
    };
  }
}
