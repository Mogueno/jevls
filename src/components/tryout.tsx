import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeCode } from "@/lib/jev/analyze";
import { CHAR_LIMIT, LANGUAGES, MIN_CHARS } from "@/lib/jev/constants";
import { CATEGORY_LABEL } from "@/lib/jev/messages";
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

function Results({
  analysis,
  scanning,
  error,
  dirty,
  activeFinding,
  onHoverFinding,
  onSelectFinding,
  findingRefs,
}: {
  analysis: Analysis | null;
  scanning: boolean;
  error: string | null;
  dirty: boolean;
  activeFinding: string | null;
  onHoverFinding: (id: string | null) => void;
  onSelectFinding: (id: string) => void;
  findingRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
}) {
  if (scanning && !analysis) {
    return (
      <div className="flex h-full min-h-64 flex-1 flex-col justify-center gap-3 px-5 py-6">
        <p className="shimmer-text font-mono text-sm">Scoring…</p>
        <p className="text-sm text-muted">One structured result. No generated explanation.</p>
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
        <p className="font-mono text-sm text-muted">Pick a sample or start typing.</p>
        <p className="max-w-sm text-sm text-subtle">
          jevls scores the snippet and paints its findings straight onto the editor gutter - like
          the always-on version would in your IDE.
        </p>
      </div>
    );
  }

  const conf = analysis.category.confidence != null ? analysis.category.confidence.toFixed(2) : "—";

  return (
    <div
      className={cn(
        "flex min-h-64 flex-1 flex-col gap-5 px-5 py-5 transition-opacity duration-150",
        scanning && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wider text-subtle">
          {scanning ? "Rescoring…" : dirty ? "Edited - rescoring on pause" : "Live signal"}
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
          <p className="text-xs text-subtle">Most likely</p>
          <p className="mt-1 text-base font-medium text-fg">
            {CATEGORY_LABEL[analysis.category.choice]}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">conf {conf}</p>
        </div>
        <div className="rounded-md bg-bg px-3 py-3">
          <p className="text-xs text-subtle">Code health</p>
          <p className="mt-1 text-base font-medium text-fg">{analysis.health.label}</p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            {analysis.health.score.toFixed(2)} / 4
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs text-subtle">What Jev is watching</p>
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
        <p className="text-xs text-subtle">Where to look</p>
        {analysis.findings.length === 0 ? (
          <p className="text-sm text-muted">
            No block-level issues. This is what the safe-to-ship case looks like.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {analysis.findings.map((f) => (
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
                    "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors duration-150 hover:bg-bg",
                    activeFinding === f.id && "bg-bg ring-1 ring-fg/20",
                  )}
                >
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", severityDot[f.severity])}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-fg">{f.title}</span>
                      <span className="font-mono text-xs tabular-nums text-subtle">
                        L{f.startLine}
                        {f.endLine !== f.startLine ? `–${f.endLine}` : ""}
                      </span>
                      {f.confidence != null ? (
                        <span
                          className={cn("font-mono text-xs tabular-nums", severityText[f.severity])}
                        >
                          {f.confidence.toFixed(2)}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{f.detail}</span>
                  </span>
                </button>
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
    scanningRef.current = true;
    setScanning(true);
    setError(null);
    if (!opts?.auto) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const result = await analyzeCode({ data: { language: lang, code: text } });
    if (gen !== genRef.current) return;
    scanningRef.current = false;
    setScanning(false);
    if (!result.ok) {
      setError(result.error);
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
            Change the code. Watch the confidence move.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Findings land on the gutter like they would in your editor - hover a marker for the why,
            click it to jump to the detail.
          </p>
        </div>
        <p className="font-mono text-xs tabular-nums text-muted">
          {code.length} / {CHAR_LIMIT}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-2">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch">
          <div className="flex min-h-80 min-w-0 flex-col rounded-lg bg-bg lg:h-full">
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
            className="flex min-h-80 min-w-0 flex-col overflow-auto rounded-lg bg-raised lg:h-full"
          >
            <Results
              analysis={analysis}
              scanning={scanning}
              error={error}
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
