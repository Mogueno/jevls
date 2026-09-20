import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeCode } from "@/lib/jev/analyze";
import { CHAR_LIMIT, LANGUAGES, MIN_CHARS } from "@/lib/jev/constants";
import { CATEGORY_LABEL } from "@/lib/jev/messages";
import { cachedAnalysis } from "@/lib/jev/sample-cache";
import { DEFAULT_SAMPLE, SAMPLES } from "@/lib/jev/samples";
import type { Analysis, Finding, FindingSeverity, LanguageId } from "@/lib/jev/types";
import { cn } from "@/lib/utils";

const AUTOSCORE_DELAY_MS = 1200;

const severityDot: Record<FindingSeverity, string> = {
  error: "bg-danger",
  warning: "bg-warn",
  info: "bg-muted",
};

const severityText: Record<FindingSeverity, string> = {
  error: "text-danger",
  warning: "text-warn",
  info: "text-muted",
};

const severityLine: Record<FindingSeverity, string> = {
  error: "bg-danger/10",
  warning: "bg-warn/10",
  info: "bg-muted/10",
};

const severityLineActive: Record<FindingSeverity, string> = {
  error: "bg-danger/20",
  warning: "bg-warn/20",
  info: "bg-muted/20",
};

const severityRank: Record<FindingSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/** Worst finding per 1-indexed line. */
function buildLineMap(findings: Finding[]): Map<number, Finding> {
  const map = new Map<number, Finding>();
  for (const f of findings) {
    for (let line = f.startLine; line <= f.endLine; line++) {
      const prev = map.get(line);
      if (!prev || severityRank[f.severity] < severityRank[prev.severity]) {
        map.set(line, f);
      }
    }
  }
  return map;
}

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

function lineLabel(finding: Finding) {
  return finding.startLine === finding.endLine
    ? `Line ${finding.startLine}`
    : `Lines ${finding.startLine}–${finding.endLine}`;
}

function confidenceLabel(value: number | null) {
  if (value == null) return "Confidence unavailable";
  const percent = Math.round(value * 100);
  const strength = value >= 0.75 ? "High" : value >= 0.5 ? "Medium" : "Low";
  return `${strength} confidence · ${percent}%`;
}

function Results({
  analysis,
  scanning,
  error,
  rateLimited,
  dirty,
  activeFinding,
  onHoverFinding,
  onSelectFinding,
  findingRefs,
}: {
  analysis: Analysis | null;
  scanning: boolean;
  error: string | null;
  rateLimited: boolean;
  dirty: boolean;
  activeFinding: string | null;
  onHoverFinding: (id: string | null) => void;
  onSelectFinding: (id: string) => void;
  findingRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
}) {
  if (scanning && !analysis) {
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-3 px-6 py-8">
        <p className="shimmer-text font-mono text-sm">Reading the code…</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Checking each block and mapping anything suspicious back to its lines.
        </p>
      </div>
    );
  }

  if (error) {
    if (rateLimited) {
      return (
        <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-3 px-6 py-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
            Playground limit
          </p>
          <p className="max-w-sm text-lg font-medium tracking-tight text-fg">
            You have used the free live scores for now.
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Every live run spends real Jev credits, so the demo caps them per
            visitor. The five samples are pre-scored and always free to run.
          </p>
          <div className="pt-1">
            <Button variant="outline" size="sm" asChild>
              <a href="#access">Want unlimited runs? Join the $10 beta</a>
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-2 px-6 py-8">
        <p className="font-medium text-fg">Could not inspect this snippet</p>
        <p className="text-sm leading-relaxed text-muted">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-3 px-6 py-8">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-subtle">Diagnostics</p>
        <p className="max-w-sm text-lg font-medium tracking-tight text-fg">
          Pick a sample to see what needs attention.
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Findings will show what is wrong, which lines are involved, and how strong the signal is.
        </p>
      </div>
    );
  }

  const conf = analysis.category.confidence;
  const hasFindings = analysis.findings.length > 0;
  const verdict = hasFindings
    ? `${analysis.findings.length} ${analysis.findings.length === 1 ? "issue" : "issues"} need attention`
    : "No issues found in this snippet";
  const verdictTone = hasFindings ? "text-danger" : "text-ok";

  return (
    <div
      className={cn(
        "flex min-h-64 flex-1 flex-col transition-opacity duration-150",
        scanning && "opacity-65",
      )}
    >
      <header className="border-b border-border px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
            {scanning ? "Updating diagnostics…" : dirty ? "Changed · update pending" : "Analysis complete"}
          </p>
          <p className="font-mono text-[11px] tabular-nums text-subtle">
            {analysis.latencyMs}ms · {analysis.model}
          </p>
        </div>
        <div className="mt-4 flex items-start gap-3">
          <span className={cn("mt-2 size-2.5 shrink-0 rounded-[3px]", hasFindings ? "bg-danger" : "bg-ok")} />
          <div>
            <h3 className={cn("text-xl font-semibold leading-tight tracking-tight sm:text-2xl", verdictTone)}>
              {verdict}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {hasFindings
                ? "Start with the first diagnostic below. Selecting one highlights the matching code."
                : "The model did not detect a meaningful defect in the blocks it checked."}
            </p>
          </div>
        </div>
      </header>

      <section className="flex-1 px-3 py-3 sm:px-4" aria-label="Code diagnostics">
        {hasFindings ? (
          <ol className="flex flex-col gap-2">
            {analysis.findings.map((f, index) => (
              <li
                key={f.id}
                ref={(el) => {
                  if (el) findingRefs.current.set(f.id, el);
                  else findingRefs.current.delete(f.id);
                }}
              >
                <button
                  type="button"
                  onMouseEnter={() => onHoverFinding(f.id)}
                  onMouseLeave={() => onHoverFinding(null)}
                  onFocus={() => onHoverFinding(f.id)}
                  onBlur={() => onHoverFinding(null)}
                  onClick={() => onSelectFinding(f.id)}
                  className={cn(
                    "group w-full border-l-2 border-border bg-bg/35 px-4 py-3.5 text-left transition-colors duration-150 hover:border-muted hover:bg-bg/70",
                    activeFinding === f.id && "border-danger bg-bg ring-1 ring-inset ring-fg/10",
                  )}
                >
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-xs tabular-nums text-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.12em]", severityText[f.severity])}>
                          {CATEGORY_LABEL[f.category]}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-muted">
                          {lineLabel(f)}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-base font-semibold leading-snug text-fg">
                        {f.title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">{f.detail}</span>
                      <span className="mt-2 flex items-center gap-2 font-mono text-[11px] text-subtle">
                        <span className={cn("size-1.5 rounded-full", severityDot[f.severity])} />
                        {confidenceLabel(f.confidence)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="border-l-2 border-ok bg-bg/35 px-4 py-4">
            <p className="text-sm font-medium text-fg">Nothing to inspect here</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Try another sample or change the code. A clean result should stay quiet.
            </p>
          </div>
        )}
      </section>

      <details className="group border-t border-border px-5 py-4 sm:px-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm text-muted hover:text-fg">
          <span>Signal details</span>
          <span className="font-mono text-xs text-subtle group-open:hidden">show</span>
          <span className="hidden font-mono text-xs text-subtle group-open:inline">hide</span>
        </summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">Classification</p>
            <p className="mt-1 text-sm font-medium text-fg">{CATEGORY_LABEL[analysis.category.choice]}</p>
            <p className="mt-0.5 font-mono text-xs text-muted">{confidenceLabel(conf)}</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">Severity</p>
            <p className="mt-1 text-sm font-medium text-fg">{analysis.health.label}</p>
            <p className="mt-0.5 font-mono text-xs text-muted">{analysis.health.score.toFixed(2)} / 4</p>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">Model signals</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.gauges.map((g) => (
                <div key={g.id} className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">{g.label}</span>
                  <Meter value={g.value} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
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
  const [rateLimited, setRateLimited] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [hoveredFinding, setHoveredFinding] = useState<string | null>(null);

  const genRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const findingRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const codeRef = useRef(code);
  codeRef.current = code;
  const languageRef = useRef(language);
  languageRef.current = language;
  const scanningRef = useRef(scanning);
  scanningRef.current = scanning;
  const lastRunKeyRef = useRef<string | null>(null);

  const remaining = CHAR_LIMIT - code.length;
  const tooShort = code.trim().length < MIN_CHARS;
  const canRun = !scanning && !tooShort;

  const sampleLookup = useMemo(() => new Map(SAMPLES.map((s) => [s.id, s])), []);
  const lines = useMemo(() => code.split("\n"), [code]);
  const lineMap = useMemo(
    () => (analysis ? buildLineMap(analysis.findings) : new Map<number, Finding>()),
    [analysis],
  );
  const highlightFinding = hoveredFinding ?? activeFinding;

  async function run(opts?: { lang?: LanguageId; text?: string; auto?: boolean }) {
    const lang = opts?.lang ?? languageRef.current;
    const text = (opts?.text ?? codeRef.current).slice(0, CHAR_LIMIT);
    if (text.trim().length < MIN_CHARS) return;
    if (scanningRef.current) return;
    const key = `${lang}::${text}`;
    if (opts?.auto && lastRunKeyRef.current === key) return;
    lastRunKeyRef.current = key;

    const gen = ++genRef.current;
    const cached = cachedAnalysis(lang, text);
    if (cached) {
      // Pre-scored sample: instant result, no server call, no budget spent.
      scanningRef.current = false;
      setScanning(false);
      setError(null);
      setRateLimited(false);
      setAnalysis(cached);
      setDirty(false);
      setActiveFinding(null);
      return;
    }
    scanningRef.current = true;
    setScanning(true);
    setError(null);
    setRateLimited(false);
    if (!opts?.auto) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const result = await analyzeCode({ data: { language: lang, code: text } });
    if (gen !== genRef.current) return;
    scanningRef.current = false;
    setScanning(false);
    if (!result.ok) {
      setError(result.error);
      setRateLimited(result.rateLimited === true);
      return;
    }
    setAnalysis(result.analysis);
    setDirty(false);
    setActiveFinding(null);
  }

  // Auto-rescore after a typing pause. Each run is a real Jev API call, so the
  // debounce is the token budget: one call per pause, never per keystroke.
  // Skips the initial mount - a pageview alone should not cost a call.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (code.trim().length < MIN_CHARS) return;
    const timer = setTimeout(() => void run({ auto: true }), AUTOSCORE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code, language]);

  function loadSample(id: string) {
    const sample = sampleLookup.get(id);
    if (!sample) return;
    const text = sample.code.slice(0, CHAR_LIMIT);
    setSampleId(id);
    setLanguage(sample.language);
    setCode(text);
    setAnalysis(null);
    setError(null);
    setRateLimited(false);
    setDirty(false);
    setActiveFinding(null);
    void run({ lang: sample.language, text });
  }

  function selectFinding(id: string) {
    setActiveFinding(id);
    const finding = analysis?.findings.find((f) => f.id === id);
    if (finding) {
      lineRefs.current
        .get(finding.startLine)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function handleMarkerEnter(f: Finding) {
    setHoveredFinding(f.id);
    findingRefs.current.get(f.id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const gutter = (
    <div
      aria-hidden
      className="sticky left-0 z-10 flex select-none flex-col border-r border-border bg-bg py-3 pl-2 pr-1.5"
    >
      {lines.map((_, i) => {
        const line = i + 1;
        const mark = lineMap.get(line);
        return (
          <div
            key={line}
            className="relative flex items-center justify-end gap-1.5 font-mono text-sm leading-relaxed"
          >
            {mark ? (
              <span className="group relative flex items-center">
                <button
                  type="button"
                  aria-label={`${mark.title} on line ${line}`}
                  onMouseEnter={() => handleMarkerEnter(mark)}
                  onMouseLeave={() => setHoveredFinding(null)}
                  onClick={() => {
                    setActiveFinding(mark.id);
                    handleMarkerEnter(mark);
                  }}
                  className={cn(
                    "size-2 rounded-[3px]",
                    severityDot[mark.severity],
                    dirty && "opacity-40",
                    highlightFinding === mark.id && "ring-2 ring-fg/40",
                  )}
                />
                <span className="pointer-events-none absolute left-full top-0 z-30 ml-2 hidden w-56 rounded-md border border-border bg-raised px-3 py-2 text-left shadow-lg group-hover:block">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-fg">{mark.title}</span>
                    <span
                      className={cn("font-mono text-xs tabular-nums", severityText[mark.severity])}
                    >
                      {mark.confidence != null ? mark.confidence.toFixed(2) : ""}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted">{mark.detail}</span>
                  <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-subtle">
                    {mark.severity} · L{mark.startLine}
                    {mark.endLine !== mark.startLine ? `–${mark.endLine}` : ""}
                  </span>
                </span>
              </span>
            ) : (
              <span className="size-2" />
            )}
            <span className="w-7 text-right text-xs leading-relaxed text-subtle">{line}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <section id="try" className="scroll-mt-24">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">Live demo</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-fg">
            See what is wrong. Go straight to the line.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Run a sample or edit the code. The answer leads with the diagnostics; model scores stay
            out of the way until you ask for them.
          </p>
        </div>
        <p className="font-mono text-xs tabular-nums text-muted">
          {code.length} / {CHAR_LIMIT}
        </p>
      </div>

      <div className="overflow-hidden border border-border bg-surface">
        <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(23rem,0.92fr)] lg:items-stretch">
          <div className="flex min-h-80 min-w-0 flex-col bg-bg lg:h-full lg:border-r lg:border-border">
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
                  setDirty(true);
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

            <div className="max-h-96 flex-1 overflow-auto">
              <div className="flex w-max min-w-full">
                {gutter}
                <div className="relative min-w-0 flex-1">
                  <pre aria-hidden className="min-h-56 px-4 py-3 font-mono text-sm leading-relaxed">
                    {lines.map((text, i) => {
                      const line = i + 1;
                      const mark = lineMap.get(line);
                      return (
                        <div
                          key={line}
                          ref={(el) => {
                            if (el) lineRefs.current.set(line, el);
                            else lineRefs.current.delete(line);
                          }}
                          className={cn(
                            mark && severityLine[mark.severity],
                            mark &&
                              highlightFinding === mark.id &&
                              severityLineActive[mark.severity],
                            mark && dirty && "opacity-50",
                          )}
                        >
                          {text === "" ? " " : text}
                        </div>
                      );
                    })}
                  </pre>
                  <textarea
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.slice(0, CHAR_LIMIT));
                      setSampleId(null);
                      setDirty(true);
                    }}
                    wrap="off"
                    spellCheck={false}
                    aria-label="Code snippet"
                    className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-transparent caret-fg outline-none selection:bg-fg/25 selection:text-transparent"
                    style={{ caretColor: "var(--color-fg)" }}
                    placeholder="Paste a function, a handler, a query…"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
              <p className="text-xs text-subtle">
                {remaining < 80 ? (
                  <span className="text-warn">{remaining} left</span>
                ) : scanning ? (
                  "Scoring…"
                ) : (
                  "Auto-score on pause · 2k cap"
                )}
              </p>
              <Button onClick={() => void run()} disabled={!canRun} size="sm">
                {scanning ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Scoring
                  </>
                ) : (
                  "Score now"
                )}
              </Button>
            </div>
          </div>

          <div
            ref={resultsRef}
            className="flex min-h-80 min-w-0 flex-col overflow-auto border-t border-border bg-raised lg:h-full lg:border-t-0"
          >
            <Results
              analysis={analysis}
              scanning={scanning}
              error={error}
              rateLimited={rateLimited}
              dirty={dirty}
              activeFinding={activeFinding}
              onHoverFinding={setHoveredFinding}
              onSelectFinding={selectFinding}
              findingRefs={findingRefs}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
