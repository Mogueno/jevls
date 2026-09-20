import { createFileRoute } from "@tanstack/react-router";
import { Gem } from "@/components/gem";
import { Tryout } from "@/components/tryout";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <a href="#top" className="flex items-center gap-2 text-fg">
            <Gem className="size-4" />
            <span className="font-mono text-sm tracking-tight">jevls</span>
          </a>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="#try">Try</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#access">Early access</a>
            </Button>
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto flex max-w-5xl flex-col gap-20 px-4 py-12 sm:px-6 sm:py-16 lg:gap-28 lg:py-24">
        <section className="flex max-w-3xl flex-col gap-6">
          <p className="stagger-in font-mono text-xs uppercase tracking-wider text-subtle">
            AI-powered language server
          </p>
          <h1 className="stagger-in text-4xl font-medium leading-tight tracking-tight text-fg sm:text-5xl">
            Instant code diagnostics. No chatbot fluff.
          </h1>
          <p className="stagger-in max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            jevls brings compiler-grade AI diagnostics into your workflow. Instead
            of generating conversational prose or chat explanations, Jev evaluates
            code with structured verdicts, severity scores, and calibrated
            probabilities your editor can actually act on.
          </p>
          <div className="stagger-in flex flex-wrap gap-3">
            <Button asChild>
              <a href="#try">Try in browser</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="#access">Get early access</a>
            </Button>
          </div>
        </section>

        <Tryout />

        <section className="grid gap-6 sm:grid-cols-3">
          {(
            [
              {
                k: "Editor-Native Squiggles",
                d: "Exact line ranges, categories, and standard LSP severities (error, warning, info) that drop straight into your editor's diagnostics panel.",
              },
              {
                k: "Confidence You Can Trust",
                d: "No false-positive fatigue. Every diagnostic includes a confidence rating, so you know immediately whether to stop and fix or keep typing.",
              },
              {
                k: "Four Instant Safety Checks",
                d: "Continuous automated checks on every snippet for injection vulnerabilities, logic flaws, hardcoded credentials, and merge-readiness.",
              },
            ] as const
          ).map((item) => (
            <article
              key={item.k}
              className="rounded-lg border border-border bg-surface px-5 py-5"
            >
              <h2 className="font-mono text-sm font-medium text-fg">{item.k}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </article>
          ))}
        </section>

        <section id="access" className="scroll-mt-24 max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">
            Early access
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
            Live editor diagnostics are coming next.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            In-editor gutter marks, real-time diagnostics as you type, and LSP
            plugins for VS Code and Neovim. Leave your email to get an access key.
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-xs text-subtle">jevls</p>
          <p className="text-xs text-subtle">
            Decisions by Jev · TypeSafe System One
          </p>
        </div>
      </footer>
    </div>
  );
}
