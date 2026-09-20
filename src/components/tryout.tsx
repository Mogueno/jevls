import { useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeCode } from "@/lib/jev/analyze";
import { CHAR_LIMIT, LANGUAGES, MIN_CHARS } from "@/lib/jev/constants";
import { CATEGORY_LABEL } from "@/lib/jev/messages";
import { DEFAULT_SAMPLE, SAMPLES } from "@/lib/jev/samples";
import type { Analysis, FindingSeverity, LanguageId } from "@/lib/jev/types";
import { cn } from "@/lib/utils";

const severityClass: Record<FindingSeverity, string> = {
  error: "bg-danger",
  warning: "bg-warn",
  info: "bg-muted",
};

function Meter({ value }: { value: number }) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10">
        <div
          className="h-full origin-left rounded-full bg-fg transition-transform duration-200 ease-out"
          style={{ transform: `scaleX(${clamped})` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs tabular-nums text-muted">
        {clamped.toFixed(2)}
      </span>
    </div>
  );
}

function Results({
  analysis,
  scanning,
  error,
}: {
  analysis: Analysis | null;
  scanning: boolean;
  error: string | null;
}) {
  if (scanning) {
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-3 px-5 py-6">
        <p className="shimmer-text font-mono text-sm">Scanning with Jev</p>
        <p className="text-sm text-muted">
          Compiler-speed diagnostics in one round trip. Zero prose.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-2 px-5 py-6">
        <p className="text-sm text-fg">{error}</p>
        <p className="text-sm text-muted">Check the snippet and run again.</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-2 px-5 py-6">
        <p className="font-mono text-sm text-muted">Awaiting a scan</p>
        <p className="max-w-sm text-sm text-subtle">
          Paste a snippet or choose a sample above, then run Jev. You get exact
          line diagnostics, severity ratings, and safety gauges — not a chatbot paragraph.
        </p>
      </div>
    );
  }

  const conf =
    analysis.category.confidence != null
      ? analysis.category.confidence.toFixed(2)
      : "—";

  return (
    <div className="flex min-h-64 flex-1 flex-col gap-5 px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-subtle">
          Jev output
        </p>
        <p className="font-mono text-xs tabular-nums text-muted">
          {analysis.latencyMs}ms
          <span className="text-subtle"> · </span>
          {analysis.model}
          {analysis.inputTokens > 0 ? (
            <>
              <span className="text-subtle"> · </span>
              {analysis.inputTokens} tok
            </>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-bg px-3 py-3">
          <p className="text-xs text-subtle">Category</p>
          <p className="mt-1 text-base font-medium text-fg">
            {CATEGORY_LABEL[analysis.category.choice]}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            conf {conf}
          </p>
        </div>
        <div className="rounded-md bg-bg px-3 py-3">
          <p className="text-xs text-subtle">Health</p>
          <p className="mt-1 text-base font-medium text-fg">
            {analysis.health.label}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            {analysis.health.score.toFixed(2)} / 4
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {analysis.gauges.map((g) => (
          <div key={g.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-fg">{g.label}</span>
            </div>
            <Meter value={g.value} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-subtle">Findings</p>
        {analysis.findings.length === 0 ? (
          <p className="text-sm text-muted">No block-level issues.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {analysis.findings.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-3 rounded-md px-1 py-2"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    severityClass[f.severity],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium text-fg">
                      {f.title}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-subtle">
                      L{f.startLine}
                      {f.endLine !== f.startLine ? `–${f.endLine}` : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Tryout() {
  const [language, setLanguage] = useState<LanguageId>(DEFAULT_SAMPLE.language);
  const [code, setCode] = useState(DEFAULT_SAMPLE.code);
  const [sampleId, setSampleId] = useState<string | null>(DEFAULT_SAMPLE.id);
  const [scanning, setScanning] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const remaining = CHAR_LIMIT - code.length;
  const tooShort = code.trim().length < MIN_CHARS;
  const canRun = !scanning && !tooShort;

  const sampleLookup = useMemo(
    () => new Map(SAMPLES.map((s) => [s.id, s])),
    [],
  );

  async function run() {
    if (!canRun) return;
    const gen = ++genRef.current;
    setScanning(true);
    setError(null);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const result = await analyzeCode({
      data: { language, code: code.slice(0, CHAR_LIMIT) },
    });
    if (gen !== genRef.current) return;
    setScanning(false);
    if (!result.ok) {
      setAnalysis(null);
      setError(result.error);
      return;
    }
    setAnalysis(result.analysis);
  }

  function loadSample(id: string) {
    const sample = sampleLookup.get(id);
    if (!sample) return;
    setSampleId(id);
    setLanguage(sample.language);
    setCode(sample.code.slice(0, CHAR_LIMIT));
    setAnalysis(null);
    setError(null);
  }

  return (
    <section id="try" className="scroll-mt-24">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">
            Tryout
          </p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-fg">
            Paste a snippet. Watch Jev decide.
          </h2>
        </div>
        <p className="font-mono text-xs tabular-nums text-muted">
          {code.length} / {CHAR_LIMIT}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-2">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch">
          <div className="flex min-h-80 flex-col rounded-lg bg-bg lg:h-full">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <label className="sr-only" htmlFor="lang">
                Language
              </label>
              <select
                id="lang"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as LanguageId);
                  setSampleId(null);
                }}
                className="h-9 rounded-sm border border-border bg-bg px-2 font-mono text-xs text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/35"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadSample(s.id)}
                    className={cn(
                      "h-9 rounded-sm px-2.5 font-mono text-xs transition-colors duration-150",
                      sampleId === s.id
                        ? "bg-raised text-fg"
                        : "text-muted hover:bg-raised hover:text-fg",
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value.slice(0, CHAR_LIMIT));
                setSampleId(null);
              }}
              spellCheck={false}
              aria-label="Code snippet"
              className="min-h-56 flex-1 resize-y bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-subtle"
              placeholder="Paste a function, a handler, a query…"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
              <p className="text-xs text-subtle">
                {remaining < 80 ? (
                  <span className="text-warn">{remaining} left</span>
                ) : (
                  "User-initiated scan · 2k cap"
                )}
              </p>
              <Button onClick={() => void run()} disabled={!canRun} size="sm">
                {scanning ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Scanning
                  </>
                ) : (
                  "Run Jev"
                )}
              </Button>
            </div>
          </div>

          <div
            ref={resultsRef}
            className="flex min-h-80 flex-col overflow-auto rounded-lg bg-raised lg:h-full"
          >
            <Results analysis={analysis} scanning={scanning} error={error} />
          </div>
        </div>
      </div>
    </section>
  );
}
