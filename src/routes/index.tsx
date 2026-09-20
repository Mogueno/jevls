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
            System One language server
          </p>
          <h1 className="stagger-in text-4xl font-medium leading-tight tracking-tight text-fg sm:text-5xl">
            See the cut of your code.
          </h1>
          <p className="stagger-in max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            jevls is a language server powered by Jev, TypeSafe's System One
            model. It does not write diagnostics. It decides them — category,
            severity, probability — and returns values an editor can act on.
          </p>
          <div className="stagger-in flex flex-wrap gap-3">
            <Button asChild>
              <a href="#try">Paste a snippet</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="#access">Request early access</a>
            </Button>
          </div>
        </section>

        <Tryout />

        <section className="grid gap-6 sm:grid-cols-3">
          {(
            [
              {
                k: "Choice",
                d: "One option from a closed set, plus the full probability distribution.",
              },
              {
                k: "Score",
                d: "A rubric rating — clean to critical — with confidence attached.",
              },
              {
                k: "Noul",
                d: "The probability that a statement is true. Security, bug, secret, ship-ready.",
              },
            ] as const
          ).map((item) => (
            <article
              key={item.k}
              className="rounded-lg border border-border bg-surface px-5 py-5"
            >
              <h2 className="font-mono text-sm text-fg">{item.k}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </article>
          ))}
        </section>

        <section id="access" className="scroll-mt-24 max-w-xl">
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">
            Early access
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-fg sm:text-3xl">
            The live LSP is next.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Gutter marks, as-you-type scans, editor plugins. Leave an email and
            we will send a key when it opens.
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
