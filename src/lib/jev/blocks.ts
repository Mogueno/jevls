import type { CodeBlock } from "./types";
import { MAX_BLOCKS } from "./constants";

export function numberLines(code: string): string {
  const lines = code.split("\n");
  const pad = String(Math.max(lines.length, 1)).length;
  return lines
    .map((line, i) => `${String(i + 1).padStart(pad, " ")}| ${line}`)
    .join("\n");
}

export function rangeForLines(
  code: string,
  startLine: number,
  endLine: number,
): { from: number; to: number } {
  const offsets = [0];
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) offsets.push(i + 1);
  }
  const from = offsets[startLine - 1] ?? 0;
  const next = offsets[endLine];
  const to = next != null ? Math.max(from, next - 1) : code.length;
  return { from, to: Math.max(from, Math.min(code.length, to)) };
}

export function splitBlocks(code: string): CodeBlock[] {
  const lines = code.split("\n");
  if (lines.every((l) => l.trim() === "")) return [];

  const chunks: { start: number; end: number }[] = [];
  let start = 1;
  let span = 0;

  for (let i = 0; i < lines.length; i++) {
    span += 1;
    const last = i === lines.length - 1;
    const blank = (lines[i] ?? "").trim() === "";
    const nextFilled =
      !last && (lines[i + 1] ?? "").trim() !== "";
    const splitHere = (blank && nextFilled && span >= 3) || span >= 22;

    if (last || splitHere) {
      const end = last ? lines.length : i + 1;
      if (start <= end) chunks.push({ start, end });
      start = i + 2;
      span = 0;
    }
  }

  const filled = chunks.filter((c) =>
    lines.slice(c.start - 1, c.end).some((l) => l.trim() !== ""),
  );
  const merged = filled.length > 0 ? filled : [{ start: 1, end: lines.length }];

  while (merged.length > MAX_BLOCKS) {
    let best = 0;
    let bestLen = Infinity;
    for (let i = 0; i < merged.length - 1; i++) {
      const a = merged[i]!;
      const b = merged[i + 1]!;
      const len = b.end - a.start;
      if (len < bestLen) {
        bestLen = len;
        best = i;
      }
    }
    merged[best]!.end = merged[best + 1]!.end;
    merged.splice(best + 1, 1);
  }

  return merged.map((chunk, idx) => {
    const { from, to } = rangeForLines(code, chunk.start, chunk.end);
    return {
      id: `b${idx}`,
      startLine: chunk.start,
      endLine: chunk.end,
      from,
      to,
      text: lines.slice(chunk.start - 1, chunk.end).join("\n"),
    };
  });
}
